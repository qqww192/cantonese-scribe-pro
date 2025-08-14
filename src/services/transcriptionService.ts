/**
 * Transcription service for CantoneseScribe
 * Handles video processing, transcription jobs, and export functionality
 */

import { apiClient, wsClient, APIError } from './api';

// Types from backend schemas
export enum JobStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

export enum ExportFormat {
  SRT = 'srt',
  VTT = 'vtt',
  TXT = 'txt',
  CSV = 'csv',
  JSON = 'json'
}

export interface TranscriptionOptions {
  language?: string;
  include_yale?: boolean;
  include_jyutping?: boolean;
  include_english?: boolean;
  confidence_threshold?: number;
  speaker_diarization?: boolean;
}

export interface TranscriptionRequest {
  file_id?: string;
  youtube_url?: string;
  options?: TranscriptionOptions;
}

export interface TranscriptionItem {
  id: number;
  start_time: number;
  end_time: number;
  chinese: string;
  yale?: string;
  jyutping?: string;
  english?: string;
  confidence: number;
  speaker?: string;
}

export interface TranscriptionResult {
  items: TranscriptionItem[];
  metadata: Record<string, any>;
  statistics: Record<string, any>;
}

export interface TranscriptionJob {
  job_id: string;
  user_id: string;
  status: JobStatus;
  file_id?: string;
  youtube_url?: string;
  options: TranscriptionOptions;
  created_at: string;
  started_at?: string;
  completed_at?: string;
  error_message?: string;
  progress: number;
  result?: TranscriptionResult;
  cost?: number;
  duration?: number;
}

export interface ExportOptions {
  include_timestamps?: boolean;
  include_speaker_labels?: boolean;
  max_line_length?: number;
  segment_duration?: number;
}

export interface ExportRequest {
  job_id: string;
  format: ExportFormat;
  options?: ExportOptions;
}

export interface ExportResponse {
  download_url: string;
  filename: string;
  format: ExportFormat;
  file_size: number;
}

export interface CostEstimate {
  estimated_cost: number;
  estimated_duration: number;
  cost_per_minute: number;
}

// Progress update types for WebSocket
export interface ProgressUpdate {
  job_id: string;
  status: JobStatus;
  progress: number;
  message?: string;
  stage?: string;
  error?: string;
}

// Transcription service class
class TranscriptionService {
  private static instance: TranscriptionService;
  private activeConnections: Map<string, () => void> = new Map();

  static getInstance(): TranscriptionService {
    if (!TranscriptionService.instance) {
      TranscriptionService.instance = new TranscriptionService();
    }
    return TranscriptionService.instance;
  }

  /**
   * Start a new transcription job
   */
  async startTranscription(request: TranscriptionRequest): Promise<{ job_id: string; status: JobStatus }> {
    try {
      // Validate request
      if (!request.file_id && !request.youtube_url) {
        throw new APIError('Either file_id or youtube_url must be provided', 400);
      }

      const response = await apiClient.post<{ job_id: string; status: JobStatus; message: string }>('/transcription/start', request);
      
      return {
        job_id: response.job_id,
        status: response.status
      };
    } catch (error) {
      console.error('Failed to start transcription:', error);
      throw error;
    }
  }

  /**
   * Get transcription job status
   */
  async getJobStatus(jobId: string): Promise<TranscriptionJob> {
    try {
      return await apiClient.get<TranscriptionJob>(`/transcription/status/${jobId}`);
    } catch (error) {
      console.error('Failed to get job status:', error);
      throw error;
    }
  }

  /**
   * List user's transcription jobs
   */
  async listJobs(limit: number = 10, offset: number = 0): Promise<TranscriptionJob[]> {
    try {
      return await apiClient.get<TranscriptionJob[]>('/transcription/jobs', { limit, offset });
    } catch (error) {
      console.error('Failed to list jobs:', error);
      throw error;
    }
  }

  /**
   * Cancel a transcription job
   */
  async cancelJob(jobId: string): Promise<void> {
    try {
      await apiClient.delete(`/transcription/jobs/${jobId}`);
    } catch (error) {
      console.error('Failed to cancel job:', error);
      throw error;
    }
  }

  /**
   * Export transcription in specified format
   */
  async exportTranscription(request: ExportRequest): Promise<ExportResponse> {
    try {
      return await apiClient.post<ExportResponse>('/transcription/export', request);
    } catch (error) {
      console.error('Failed to export transcription:', error);
      throw error;
    }
  }

  /**
   * Download transcription file
   */
  async downloadTranscription(jobId: string, format: ExportFormat): Promise<Blob> {
    try {
      const response = await fetch(`/api/v1/transcription/download/${jobId}/${format}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });

      if (!response.ok) {
        throw new APIError(`Download failed: ${response.statusText}`, response.status);
      }

      return await response.blob();
    } catch (error) {
      console.error('Failed to download transcription:', error);
      throw error;
    }
  }

  /**
   * Get cost estimate for transcription
   */
  async getCostEstimate(duration: number): Promise<CostEstimate> {
    try {
      return await apiClient.post<CostEstimate>('/transcription/estimate', { duration });
    } catch (error) {
      console.error('Failed to get cost estimate:', error);
      throw error;
    }
  }

  /**
   * Subscribe to real-time progress updates via WebSocket
   */
  async subscribeToProgress(
    jobId: string,
    onProgress: (update: ProgressUpdate) => void,
    onError?: (error: Event) => void
  ): Promise<() => void> {
    try {
      // Connect to WebSocket
      await wsClient.connect(
        jobId,
        (data: ProgressUpdate) => {
          onProgress(data);
          
          // Auto-disconnect when job is completed or failed
          if (data.status === JobStatus.COMPLETED || 
              data.status === JobStatus.FAILED || 
              data.status === JobStatus.CANCELLED) {
            this.unsubscribeFromProgress(jobId);
          }
        },
        onError
      );

      // Store disconnect function
      const disconnect = () => {
        wsClient.disconnect();
        this.activeConnections.delete(jobId);
      };

      this.activeConnections.set(jobId, disconnect);
      
      return disconnect;
    } catch (error) {
      console.error('Failed to subscribe to progress updates:', error);
      throw error;
    }
  }

  /**
   * Unsubscribe from progress updates
   */
  unsubscribeFromProgress(jobId: string): void {
    const disconnect = this.activeConnections.get(jobId);
    if (disconnect) {
      disconnect();
      this.activeConnections.delete(jobId);
    }
  }

  /**
   * Cleanup all WebSocket connections
   */
  cleanup(): void {
    this.activeConnections.forEach(disconnect => disconnect());
    this.activeConnections.clear();
  }

  /**
   * Utility function to format time from seconds to MM:SS
   */
  formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  /**
   * Get confidence level text and color
   */
  getConfidenceInfo(confidence: number): { text: string; color: string } {
    if (confidence >= 0.9) {
      return { text: 'Excellent', color: 'bg-green-100 text-green-800' };
    } else if (confidence >= 0.8) {
      return { text: 'Good', color: 'bg-yellow-100 text-yellow-800' };
    } else if (confidence >= 0.7) {
      return { text: 'Fair', color: 'bg-orange-100 text-orange-800' };
    } else {
      return { text: 'Poor', color: 'bg-red-100 text-red-800' };
    }
  }

  /**
   * Generate export content for different formats
   */
  generateExportContent(transcription: TranscriptionItem[], format: ExportFormat): string {
    switch (format) {
      case ExportFormat.SRT:
        return transcription.map((item, index) => 
          `${index + 1}\n${this.formatSRTTime(item.start_time)} --> ${this.formatSRTTime(item.end_time)}\n${item.chinese}\n${item.english || ''}\n`
        ).join('\n');
        
      case ExportFormat.VTT:
        return "WEBVTT\n\n" + transcription.map(item => 
          `${this.formatSRTTime(item.start_time)} --> ${this.formatSRTTime(item.end_time)}\n${item.chinese}\n${item.english || ''}\n`
        ).join('\n');
        
      case ExportFormat.TXT:
        return transcription.map(item => 
          `[${this.formatTime(item.start_time)}] ${item.chinese}${item.english ? ` (${item.english})` : ''}`
        ).join('\n');
        
      case ExportFormat.CSV:
        const headers = "Start Time,End Time,Chinese,Yale,Jyutping,English,Confidence\n";
        const rows = transcription.map(item => 
          `${item.start_time},${item.end_time},"${item.chinese}","${item.yale || ''}","${item.jyutping || ''}","${item.english || ''}",${item.confidence}`
        ).join('\n');
        return headers + rows;
        
      case ExportFormat.JSON:
        return JSON.stringify(transcription, null, 2);
        
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  /**
   * Format time for SRT/VTT format (HH:MM:SS,mmm)
   */
  private formatSRTTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 1000);
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')},${ms.toString().padStart(3, '0')}`;
  }

  /**
   * Download generated content as file
   */
  downloadAsFile(content: string, filename: string, mimeType: string = 'text/plain'): void {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    
    // Cleanup
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}

// Export singleton instance
export const transcriptionService = TranscriptionService.getInstance();

// React hook for transcription operations
export const useTranscription = () => {
  return {
    startTranscription: transcriptionService.startTranscription.bind(transcriptionService),
    getJobStatus: transcriptionService.getJobStatus.bind(transcriptionService),
    listJobs: transcriptionService.listJobs.bind(transcriptionService),
    cancelJob: transcriptionService.cancelJob.bind(transcriptionService),
    exportTranscription: transcriptionService.exportTranscription.bind(transcriptionService),
    downloadTranscription: transcriptionService.downloadTranscription.bind(transcriptionService),
    getCostEstimate: transcriptionService.getCostEstimate.bind(transcriptionService),
    subscribeToProgress: transcriptionService.subscribeToProgress.bind(transcriptionService),
    unsubscribeFromProgress: transcriptionService.unsubscribeFromProgress.bind(transcriptionService),
    formatTime: transcriptionService.formatTime.bind(transcriptionService),
    getConfidenceInfo: transcriptionService.getConfidenceInfo.bind(transcriptionService),
    generateExportContent: transcriptionService.generateExportContent.bind(transcriptionService),
    downloadAsFile: transcriptionService.downloadAsFile.bind(transcriptionService)
  };
};

export default transcriptionService;