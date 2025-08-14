import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { useDropzone } from 'react-dropzone';
import { 
  Play, 
  Download, 
  FileText, 
  Clock,
  CheckCircle,
  AlertCircle,
  Copy,
  ExternalLink,
  Upload,
  X,
  RefreshCw,
  Star
} from "lucide-react";
import { useTranscription, TranscriptionJob, JobStatus, ExportFormat, ProgressUpdate } from '@/services/transcriptionService';
import { useFileService, FileUploadResponse } from '@/services/fileService';
import { useAuth } from '@/contexts/AuthContext';
import { APIError, ValidationError } from '@/services/api';
import { useDownload } from '@/services/downloadService';
import { useFeedback } from '@/services/feedbackService';
import VirtualizedTranscriptionViewer from './VirtualizedTranscriptionViewer';
import DownloadProgressIndicator from './DownloadProgressIndicator';
import FeedbackRatingSystem from './FeedbackRatingSystem';

interface ProcessingState {
  isProcessing: boolean;
  progress: number;
  stage: string;
  message: string;
}

const VideoProcessPage = () => {
  // Core state
  const [url, setUrl] = useState('');
  const [uploadedFile, setUploadedFile] = useState<FileUploadResponse | null>(null);
  const [currentJob, setCurrentJob] = useState<TranscriptionJob | null>(null);
  const [processingState, setProcessingState] = useState<ProcessingState>({
    isProcessing: false,
    progress: 0,
    stage: '',
    message: ''
  });
  const [error, setError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  
  // Services
  const {
    startTranscription,
    getJobStatus,
    subscribeToProgress,
    unsubscribeFromProgress,
    downloadTranscription,
    formatTime,
    getConfidenceInfo,
    downloadAsFile,
    generateExportContent
  } = useTranscription();
  
  const {
    validateFile,
    uploadFile,
    validateYouTubeURL,
    getYouTubeMetadata,
    formatFileSize,
    createDropHandlers
  } = useFileService();
  
  const { user } = useAuth();
  const { activeDownloads, downloadGenerated, cancelDownload, cancelAllDownloads } = useDownload();
  const { submitFeedback } = useFeedback();
  
  // Refs for cleanup
  const wsUnsubscribe = useRef<(() => void) | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (wsUnsubscribe.current) {
        wsUnsubscribe.current();
      }
    };
  }, []);

  // Get URL from query params on page load
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const videoUrl = urlParams.get('video');
    const jobId = urlParams.get('job');
    
    if (videoUrl) {
      setUrl(decodeURIComponent(videoUrl));
    }
    
    if (jobId) {
      // Load existing job
      loadExistingJob(jobId);
    }
  }, []);
  
  // Load existing job by ID
  const loadExistingJob = async (jobId: string) => {
    try {
      const job = await getJobStatus(jobId);
      setCurrentJob(job);
      
      // Subscribe to updates if still processing
      if (job.status === JobStatus.PROCESSING || job.status === JobStatus.PENDING) {
        subscribeToJobUpdates(jobId);
      }
    } catch (error) {
      console.error('Failed to load job:', error);
      setError('Failed to load transcription job');
    }
  };

  // Handle URL submission
  const handleUrlSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;
    
    setError(null);
    
    // Validate YouTube URL
    const validation = validateYouTubeURL(url);
    if (!validation.isValid) {
      setError(validation.error || 'Invalid YouTube URL');
      return;
    }
    
    await startProcessing({ youtube_url: url });
  };

  // Handle file upload
  const handleFileUpload = async (files: File[]) => {
    if (files.length === 0) return;
    
    const file = files[0];
    setError(null);
    
    // Validate file
    const validation = validateFile(file);
    if (!validation.isValid) {
      setError(validation.error?.message || 'Invalid file');
      return;
    }
    
    try {
      // Upload file with progress
      const uploadedFile = await uploadFile(file, (progress) => {
        setUploadProgress(progress);
      });
      
      setUploadedFile(uploadedFile);
      setUploadProgress(0);
      
      // Start processing
      await startProcessing({ file_id: uploadedFile.file_id });
    } catch (error) {
      console.error('File upload failed:', error);
      setError(error instanceof APIError ? error.message : 'File upload failed');
      setUploadProgress(0);
    }
  };
  
  // Start transcription processing
  const startProcessing = async (request: { file_id?: string; youtube_url?: string }) => {
    try {
      setProcessingState({
        isProcessing: true,
        progress: 0,
        stage: 'Starting',
        message: 'Preparing transcription job...'
      });
      
      // Start transcription job
      const { job_id } = await startTranscription({
        ...request,
        options: {
          language: 'yue',
          include_yale: true,
          include_jyutping: true,
          include_english: true,
          confidence_threshold: 0.7
        }
      });
      
      // Get initial job status
      const job = await getJobStatus(job_id);
      setCurrentJob(job);
      
      // Subscribe to real-time updates
      await subscribeToJobUpdates(job_id);
      
    } catch (error) {
      console.error('Failed to start transcription:', error);
      setError(error instanceof APIError ? error.message : 'Failed to start transcription');
      setProcessingState({
        isProcessing: false,
        progress: 0,
        stage: '',
        message: ''
      });
    }
  };
  
  // Subscribe to WebSocket updates
  const subscribeToJobUpdates = async (jobId: string) => {
    try {
      wsUnsubscribe.current = await subscribeToProgress(
        jobId,
        (update: ProgressUpdate) => {
          setProcessingState({
            isProcessing: update.status === JobStatus.PROCESSING || update.status === JobStatus.PENDING,
            progress: update.progress,
            stage: update.stage || getStageFromStatus(update.status),
            message: update.message || getMessageFromStatus(update.status, update.progress)
          });
          
          // Update job status
          if (currentJob) {
            setCurrentJob(prev => prev ? {
              ...prev,
              status: update.status,
              progress: update.progress,
              error_message: update.error
            } : prev);
          }
          
          // Handle completion
          if (update.status === JobStatus.COMPLETED) {
            refreshJobStatus(jobId);
          } else if (update.status === JobStatus.FAILED) {
            setError(update.error || 'Transcription failed');
          }
        },
        (error) => {
          console.error('WebSocket error:', error);
          // Fall back to polling
          startPollingJobStatus(jobId);
        }
      );
    } catch (error) {
      console.error('Failed to subscribe to updates:', error);
      // Fall back to polling
      startPollingJobStatus(jobId);
    }
  };
  
  // Fallback polling for job status
  const startPollingJobStatus = (jobId: string) => {
    const pollInterval = setInterval(async () => {
      try {
        const job = await getJobStatus(jobId);
        setCurrentJob(job);
        
        setProcessingState({
          isProcessing: job.status === JobStatus.PROCESSING || job.status === JobStatus.PENDING,
          progress: job.progress,
          stage: getStageFromStatus(job.status),
          message: getMessageFromStatus(job.status, job.progress)
        });
        
        // Stop polling when complete
        if (job.status === JobStatus.COMPLETED || job.status === JobStatus.FAILED || job.status === JobStatus.CANCELLED) {
          clearInterval(pollInterval);
          
          if (job.status === JobStatus.FAILED) {
            setError(job.error_message || 'Transcription failed');
          }
        }
      } catch (error) {
        console.error('Polling error:', error);
      }
    }, 2000); // Poll every 2 seconds
    
    // Cleanup after 10 minutes
    setTimeout(() => clearInterval(pollInterval), 600000);
  };
  
  // Refresh job status
  const refreshJobStatus = async (jobId: string) => {
    try {
      const job = await getJobStatus(jobId);
      setCurrentJob(job);
    } catch (error) {
      console.error('Failed to refresh job status:', error);
    }
  };
  
  // Helper functions
  const getStageFromStatus = (status: JobStatus): string => {
    switch (status) {
      case JobStatus.PENDING: return 'Queued';
      case JobStatus.PROCESSING: return 'Processing';
      case JobStatus.COMPLETED: return 'Complete';
      case JobStatus.FAILED: return 'Failed';
      case JobStatus.CANCELLED: return 'Cancelled';
      default: return '';
    }
  };
  
  const getMessageFromStatus = (status: JobStatus, progress: number): string => {
    if (status === JobStatus.PROCESSING) {
      if (progress < 30) return 'Downloading and analyzing media...';
      if (progress < 70) return 'Processing speech recognition...';
      if (progress < 95) return 'Generating romanization and translations...';
      return 'Finalizing results...';
    }
    
    switch (status) {
      case JobStatus.PENDING: return 'Job is queued for processing';
      case JobStatus.COMPLETED: return 'Transcription completed successfully';
      case JobStatus.FAILED: return 'Transcription failed';
      case JobStatus.CANCELLED: return 'Transcription was cancelled';
      default: return '';
    }
  };

  // Drag and drop handlers
  const dropHandlers = createDropHandlers(handleFileUpload, (error) => {
    setError(error.message);
  });

  // Copy text to clipboard
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      // You could add a toast notification here
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  };

  // Export and download functions
  const handleExport = async (format: ExportFormat) => {
    if (!currentJob?.result?.items) return;
    
    try {
      const content = generateExportContent(currentJob.result.items, format);
      const filename = `transcription-${currentJob.job_id}.${format}`;
      const mimeType = {
        [ExportFormat.SRT]: 'text/plain',
        [ExportFormat.VTT]: 'text/vtt',
        [ExportFormat.TXT]: 'text/plain',
        [ExportFormat.CSV]: 'text/csv',
        [ExportFormat.JSON]: 'application/json'
      }[format] || 'text/plain';
      
      downloadGenerated(content, filename, mimeType);
    } catch (error) {
      console.error('Export failed:', error);
      setError('Failed to export transcription');
    }
  };

  // Reset state for new processing
  const resetProcessing = () => {
    setCurrentJob(null);
    setUrl('');
    setUploadedFile(null);
    setProcessingState({
      isProcessing: false,
      progress: 0,
      stage: '',
      message: ''
    });
    setError(null);
    setUploadProgress(0);
    
    if (wsUnsubscribe.current) {
      wsUnsubscribe.current();
      wsUnsubscribe.current = null;
    }
  };
  
  // Get dropzone props
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: handleFileUpload,
    accept: {
      'audio/*': ['.mp3', '.wav', '.m4a', '.flac', '.ogg'],
      'video/*': ['.mp4', '.webm', '.mov', '.avi']
    },
    maxFiles: 1,
    maxSize: 500 * 1024 * 1024, // 500MB
    disabled: processingState.isProcessing
  });

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Video Transcription</h1>
          <p className="text-gray-600 mt-2">
            Process your Cantonese videos and audio files for accurate transcriptions
          </p>
          {user && (
            <p className="text-sm text-gray-500 mt-1">
              Credits remaining: {user.usage_quota - user.usage_count}
            </p>
          )}
        </div>
        
        {/* Error display */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* URL Input Form */}
        {!result && (
          <Card>
            <CardHeader>
              <CardTitle>Enter Video URL</CardTitle>
              <CardDescription>
                Paste a YouTube URL or direct video link to start transcription
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUrlSubmit} className="space-y-4">
                <div>
                  <input
                    type="url"
                    placeholder="https://www.youtube.com/watch?v=..."
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    disabled={isProcessing}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    required
                  />
                </div>
                <Button
                  type="submit"
                  disabled={isProcessing || !url.trim()}
                  className="bg-orange-600 hover:bg-orange-700 text-white"
                >
                  {isProcessing ? 'Processing...' : 'Start Transcription'}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Processing Progress */}
        {isProcessing && (
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-orange-600"></div>
                  <span className="font-medium">Processing your video...</span>
                </div>
                <Progress value={progress} className="w-full" />
                <div className="text-sm text-gray-600">
                  {progress < 30 && "Downloading and analyzing video..."}
                  {progress >= 30 && progress < 70 && "Extracting audio and processing speech..."}
                  {progress >= 70 && progress < 95 && "Generating transcriptions..."}
                  {progress >= 95 && "Finalizing results..."}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Results */}
        {result && (
          <div className="space-y-6">
            {/* Result Summary */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      Transcription Complete
                    </CardTitle>
                    <CardDescription>
                      Your video has been successfully processed
                    </CardDescription>
                  </div>
                  <Badge variant="secondary" className="bg-green-100 text-green-800">
                    {result.creditsUsed} credit used
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="flex items-center gap-2">
                    <Play className="h-4 w-4 text-gray-500" />
                    <span className="text-sm">{result.duration}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-gray-500" />
                    <span className="text-sm">{result.totalLines} lines</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-gray-500" />
                    <span className="text-sm">Just now</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="text-sm">{Math.round(result.avgConfidence * 100)}% accuracy</span>
                  </div>
                </div>
                
                <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <ExternalLink className="h-3 w-3" />
                    <span className="font-mono break-all">{result.url}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Export Options */}
            <Card>
              <CardHeader>
                <CardTitle>Export Options</CardTitle>
                <CardDescription>
                  Download your transcription in various formats
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <Button 
                    variant="outline" 
                    onClick={() => exportFormat('SRT')}
                    className="justify-start"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    SRT
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => exportFormat('VTT')}
                    className="justify-start"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    VTT
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => exportFormat('TXT')}
                    className="justify-start"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    TXT
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => exportFormat('CSV')}
                    className="justify-start"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    CSV
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Transcription Results */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Transcription Results</CardTitle>
                    <CardDescription>
                      Chinese characters, romanization, and English translations with timestamps
                    </CardDescription>
                  </div>
                  <div className="text-sm text-gray-500">
                    {currentJob.result.items.length} segments
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <VirtualizedTranscriptionViewer
                  items={currentJob.result.items}
                  height={Math.min(600, Math.max(400, currentJob.result.items.length * 120))}
                  onCopy={copyToClipboard}
                  showTimestamps={true}
                  showConfidence={true}
                  showSpeaker={true}
                  enableSearch={true}
                  enableNavigation={true}
                  className="p-4"
                />
              </CardContent>
            </Card>

            {/* Feedback System */}
            <FeedbackRatingSystem
              jobId={currentJob.job_id}
              onSubmit={async (feedbackData) => {
                await submitFeedback({
                  transcriptionJobId: feedbackData.transcriptionJobId,
                  ratings: {
                    overall: feedbackData.overallRating,
                    accuracy: feedbackData.accuracyRating,
                    speed: feedbackData.speedRating,
                    usefulness: feedbackData.usefulnessRating
                  },
                  feedback: feedbackData.feedback,
                  reportedIssues: feedbackData.reportIssues
                });
              }}
            />
            
            {/* Actions */}
            <div className="flex gap-3">
              <Button onClick={resetProcessing}>
                Process Another File
              </Button>
              <Button 
                variant="outline"
                onClick={() => window.location.href = '/history'}
              >
                View History
              </Button>
            </div>
          </div>
        )}
        
        {/* Failed State */}
        {currentJob && currentJob.status === JobStatus.FAILED && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-600">
                <AlertCircle className="h-5 w-5" />
                Transcription Failed
              </CardTitle>
              <CardDescription>
                There was an error processing your media file
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {currentJob.error_message && (
                  <Alert variant="destructive">
                    <AlertDescription>{currentJob.error_message}</AlertDescription>
                  </Alert>
                )}
                
                <div className="flex gap-3">
                  <Button onClick={resetProcessing}>
                    Try Again
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => window.location.href = '/history'}
                  >
                    View History
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
        
        {/* Download Progress Indicator */}
        <DownloadProgressIndicator
          downloads={activeDownloads}
          onCancel={cancelDownload}
          onCancelAll={cancelAllDownloads}
          showMini={true}
        />
      </div>
    </div>
  );
};

export default VideoProcessPage;