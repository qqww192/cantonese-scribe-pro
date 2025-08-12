// src/components/VideoSelectionPage.tsx
import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Play, Pause, RotateCcw, Clock, Scissors } from 'lucide-react';

interface VideoSelectionProps {
  videoUrl: string;
  onProceed: (startTime: number, endTime: number, selectedDuration: number) => void;
  onBack: () => void;
}

export const VideoSelectionPage: React.FC<VideoSelectionProps> = ({
  videoUrl,
  onProceed,
  onBack
}) => {
  const [videoDuration, setVideoDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [maxAllowedDuration, setMaxAllowedDuration] = useState(300); // 5 minutes default
  const [videoInfo, setVideoInfo] = useState<{title: string, thumbnail: string} | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Extract YouTube video ID from URL
  const getYouTubeVideoId = (url: string) => {
    const regex = /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/;
    const match = url.match(regex);
    return match ? match[1] : null;
  };

  const videoId = getYouTubeVideoId(videoUrl);

  useEffect(() => {
    if (videoId) {
      // Simulate fetching video info (in real app, you'd call YouTube API)
      setVideoInfo({
        title: "Cantonese Learning Video", // Would be fetched from API
        thumbnail: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`
      });
      
      // Simulate video duration (in real app, you'd get this from YouTube API)
      setTimeout(() => {
        const mockDuration = 600; // 10 minutes
        setVideoDuration(mockDuration);
        setEndTime(Math.min(maxAllowedDuration, mockDuration));
        setIsLoading(false);
      }, 1000);
    }
  }, [videoId, maxAllowedDuration]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const selectedDuration = endTime - startTime;

  const handleTimelineClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!timelineRef.current) return;
    
    const rect = timelineRef.current.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const percentage = clickX / rect.width;
    const clickTime = percentage * videoDuration;
    
    // Determine whether to set start or end time based on proximity
    const startDistance = Math.abs(clickTime - startTime);
    const endDistance = Math.abs(clickTime - endTime);
    
    if (startDistance < endDistance) {
      setStartTime(Math.max(0, Math.min(clickTime, endTime - 5))); // At least 5 seconds
    } else {
      setEndTime(Math.min(videoDuration, Math.max(clickTime, startTime + 5))); // At least 5 seconds
    }
  };

  const handleStartTimeChange = (value: number) => {
    const newStartTime = Math.max(0, Math.min(value, endTime - 5));
    setStartTime(newStartTime);
  };

  const handleEndTimeChange = (value: number) => {
    const newEndTime = Math.min(videoDuration, Math.max(value, startTime + 5));
    setEndTime(newEndTime);
    
    // Check if selection exceeds allowed duration
    if (newEndTime - startTime > maxAllowedDuration) {
      setStartTime(newEndTime - maxAllowedDuration);
    }
  };

  const handleProceed = () => {
    if (selectedDuration < 5) {
      toast({
        title: "Selection too short",
        description: "Please select at least 5 seconds of video.",
        variant: "destructive"
      });
      return;
    }

    if (selectedDuration > maxAllowedDuration) {
      toast({
        title: "Selection too long",
        description: `Please select no more than ${formatTime(maxAllowedDuration)} of video.`,
        variant: "destructive"
      });
      return;
    }

    onProceed(startTime, endTime, selectedDuration);
  };

  const resetSelection = () => {
    setStartTime(0);
    setEndTime(Math.min(maxAllowedDuration, videoDuration));
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading video information...</p>
        </div>
      </div>
    );
  }

  const startPercentage = (startTime / videoDuration) * 100;
  const endPercentage = (endTime / videoDuration) * 100;
  const selectionWidth = endPercentage - startPercentage;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-6">
        {/* Header */}
        <div className="mb-8">
          <Button 
            variant="outline" 
            onClick={onBack}
            className="mb-4"
          >
            ← Back to URL Input
          </Button>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Select Video Segment
          </h1>
          <p className="text-gray-600">
            Choose which part of the video you want to transcribe and convert to romanisation
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Video Preview */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{videoInfo?.title}</CardTitle>
              </CardHeader>
              <CardContent>
                {/* Video Preview - YouTube Embed */}
                <div className="aspect-video bg-black rounded-lg mb-6 relative overflow-hidden">
                  <iframe
                    width="100%"
                    height="100%"
                    src={`https://www.youtube.com/embed/${videoId}?start=${Math.floor(startTime)}&end=${Math.floor(endTime)}&controls=1`}
                    title="YouTube video player"
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="rounded-lg"
                  ></iframe>
                </div>

                {/* Timeline Controls */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between text-sm text-gray-600">
                    <span>Timeline</span>
                    <span>Total: {formatTime(videoDuration)}</span>
                  </div>
                  
                  {/* Timeline */}
                  <div 
                    ref={timelineRef}
                    className="relative h-12 bg-gray-200 rounded-lg cursor-pointer"
                    onClick={handleTimelineClick}
                  >
                    {/* Full timeline */}
                    <div className="absolute inset-0 bg-gray-300 rounded-lg"></div>
                    
                    {/* Selected segment */}
                    <div 
                      className="absolute top-0 h-full bg-orange-500 rounded-lg opacity-70"
                      style={{
                        left: `${startPercentage}%`,
                        width: `${selectionWidth}%`
                      }}
                    ></div>
                    
                    {/* Start handle */}
                    <div 
                      className="absolute top-0 w-4 h-full bg-orange-600 rounded-l-lg cursor-ew-resize flex items-center justify-center"
                      style={{ left: `${startPercentage}%` }}
                    >
                      <div className="w-1 h-6 bg-white rounded"></div>
                    </div>
                    
                    {/* End handle */}
                    <div 
                      className="absolute top-0 w-4 h-full bg-orange-600 rounded-r-lg cursor-ew-resize flex items-center justify-center"
                      style={{ left: `${endPercentage - 2}%` }}
                    >
                      <div className="w-1 h-6 bg-white rounded"></div>
                    </div>
                    
                    {/* Time markers */}
                    <div className="absolute -bottom-6 left-0 text-xs text-gray-500">
                      0:00
                    </div>
                    <div className="absolute -bottom-6 right-0 text-xs text-gray-500">
                      {formatTime(videoDuration)}
                    </div>
                  </div>

                  {/* Time inputs */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Start Time
                      </label>
                      <input
                        type="range"
                        min={0}
                        max={videoDuration}
                        step={1}
                        value={startTime}
                        onChange={(e) => handleStartTimeChange(Number(e.target.value))}
                        className="w-full"
                      />
                      <div className="text-center text-sm text-gray-600 mt-1">
                        {formatTime(startTime)}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        End Time
                      </label>
                      <input
                        type="range"
                        min={0}
                        max={videoDuration}
                        step={1}
                        value={endTime}
                        onChange={(e) => handleEndTimeChange(Number(e.target.value))}
                        className="w-full"
                      />
                      <div className="text-center text-sm text-gray-600 mt-1">
                        {formatTime(endTime)}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Selection Summary */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Scissors className="w-5 h-5" />
                  Selection Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Start:</span>
                  <span className="font-medium">{formatTime(startTime)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">End:</span>
                  <span className="font-medium">{formatTime(endTime)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Duration:</span>
                  <span className="font-bold text-orange-600">{formatTime(selectedDuration)}</span>
                </div>
                
                <div className="pt-4 border-t">
                  <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                    <Clock className="w-4 h-4" />
                    Processing Limits
                  </div>
                  <div className="text-xs text-gray-500">
                    Free: Up to 10 minutes<br/>
                    Pro: Up to 1 hour<br/>
                    Master: Up to 2 hours
                  </div>
                </div>

                {selectedDuration > maxAllowedDuration && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-red-700 text-sm">
                      Selection exceeds your plan limit of {formatTime(maxAllowedDuration)}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="space-y-3">
              <Button
                onClick={handleProceed}
                disabled={selectedDuration < 5 || selectedDuration > maxAllowedDuration}
                className="w-full bg-orange-500 hover:bg-orange-600 text-white"
              >
                Process Selected Segment
              </Button>
              
              <Button
                onClick={resetSelection}
                variant="outline"
                className="w-full"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Reset Selection
              </Button>
            </div>

            {/* Preview Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Output Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Chinese Characters</span>
                  <span className="text-green-600">✓</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Yale Romanisation</span>
                  <span className="text-green-600">✓</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Jyutping Romanisation</span>
                  <span className="text-green-600">✓</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Synchronized Timestamps</span>
                  <span className="text-green-600">✓</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoSelectionPage;