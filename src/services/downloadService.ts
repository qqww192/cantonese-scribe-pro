/**
 * Download service for CantoneseScribe
 * Handles file downloads with progress tracking and error handling
 */

import { APIError } from './api';

// Types
export interface DownloadProgress {
  jobId: string;
  format: string;
  progress: number;
  status: 'preparing' | 'downloading' | 'complete' | 'error';
  error?: string;
}

export interface DownloadOptions {
  onProgress?: (progress: DownloadProgress) => void;
  onComplete?: (blob: Blob, filename: string) => void;
  onError?: (error: Error) => void;
  timeout?: number;
}

// Download service class
class DownloadService {
  private static instance: DownloadService;
  private activeDownloads = new Map<string, AbortController>();

  static getInstance(): DownloadService {
    if (!DownloadService.instance) {
      DownloadService.instance = new DownloadService();
    }
    return DownloadService.instance;
  }

  /**
   * Download file with progress tracking
   */
  async downloadFile(
    url: string,
    filename: string,
    options: DownloadOptions = {}
  ): Promise<Blob | null> {
    const { onProgress, onComplete, onError, timeout = 30000 } = options;
    const downloadId = `${Date.now()}-${Math.random()}`;
    const controller = new AbortController();
    
    this.activeDownloads.set(downloadId, controller);

    try {
      // Notify start
      if (onProgress) {
        onProgress({
          jobId: downloadId,
          format: filename.split('.').pop() || 'unknown',
          progress: 0,
          status: 'preparing'
        });
      }

      // Start download
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });

      if (!response.ok) {
        throw new APIError(`Download failed: ${response.statusText}`, response.status);
      }

      const total = parseInt(response.headers.get('content-length') || '0', 10);
      let loaded = 0;

      if (onProgress) {
        onProgress({
          jobId: downloadId,
          format: filename.split('.').pop() || 'unknown',
          progress: 0,
          status: 'downloading'
        });
      }

      // Create readable stream with progress tracking
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Failed to get response stream');
      }

      const stream = new ReadableStream({
        start(streamController) {
          const push = async () => {
            try {
              const { done, value } = await reader.read();
              
              if (done) {
                streamController.close();
                return;
              }

              loaded += value.length;
              
              if (onProgress && total > 0) {
                onProgress({
                  jobId: downloadId,
                  format: filename.split('.').pop() || 'unknown',
                  progress: Math.round((loaded / total) * 100),
                  status: 'downloading'
                });
              }

              streamController.enqueue(value);
              push();
            } catch (error) {
              streamController.error(error);
            }
          };
          
          push();
        }
      });

      // Convert stream to blob
      const response2 = new Response(stream);
      const blob = await response2.blob();

      // Notify completion
      if (onProgress) {
        onProgress({
          jobId: downloadId,
          format: filename.split('.').pop() || 'unknown',
          progress: 100,
          status: 'complete'
        });
      }

      if (onComplete) {
        onComplete(blob, filename);
      }

      // Trigger download
      this.triggerDownload(blob, filename);
      
      return blob;
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error(String(error));
      
      if (onProgress) {
        onProgress({
          jobId: downloadId,
          format: filename.split('.').pop() || 'unknown',
          progress: 0,
          status: 'error',
          error: errorObj.message
        });
      }

      if (onError) {
        onError(errorObj);
      }

      throw errorObj;
    } finally {
      this.activeDownloads.delete(downloadId);
    }
  }

  /**
   * Download transcription from API
   */
  async downloadTranscription(
    jobId: string,
    format: string,
    options: DownloadOptions = {}
  ): Promise<Blob | null> {
    const url = `/api/v1/transcription/download/${jobId}/${format}`;
    const filename = `transcription-${jobId}.${format.toLowerCase()}`;
    
    return this.downloadFile(url, filename, {
      ...options,
      onProgress: (progress) => {
        if (options.onProgress) {
          options.onProgress({
            ...progress,
            jobId,
            format
          });
        }
      }
    });
  }

  /**
   * Generate and download content directly (for client-side generation)
   */
  downloadGeneratedContent(
    content: string,
    filename: string,
    mimeType: string = 'text/plain',
    options: DownloadOptions = {}
  ): void {
    const { onProgress, onComplete } = options;
    const downloadId = `generated-${Date.now()}`;
    const format = filename.split('.').pop() || 'unknown';

    try {
      // Notify start
      if (onProgress) {
        onProgress({
          jobId: downloadId,
          format,
          progress: 0,
          status: 'preparing'
        });
      }

      // Create blob
      const blob = new Blob([content], { type: mimeType });

      // Notify progress
      if (onProgress) {
        onProgress({
          jobId: downloadId,
          format,
          progress: 50,
          status: 'downloading'
        });
      }

      // Trigger download
      this.triggerDownload(blob, filename);

      // Notify completion
      if (onProgress) {
        onProgress({
          jobId: downloadId,
          format,
          progress: 100,
          status: 'complete'
        });
      }

      if (onComplete) {
        onComplete(blob, filename);
      }
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error(String(error));
      
      if (onProgress) {
        onProgress({
          jobId: downloadId,
          format,
          progress: 0,
          status: 'error',
          error: errorObj.message
        });
      }

      if (options.onError) {
        options.onError(errorObj);
      }
    }
  }

  /**
   * Cancel active download
   */
  cancelDownload(downloadId: string): void {
    const controller = this.activeDownloads.get(downloadId);
    if (controller) {
      controller.abort();
      this.activeDownloads.delete(downloadId);
    }
  }

  /**
   * Cancel all active downloads
   */
  cancelAllDownloads(): void {
    this.activeDownloads.forEach(controller => controller.abort());
    this.activeDownloads.clear();
  }

  /**
   * Get active downloads count
   */
  getActiveDownloadsCount(): number {
    return this.activeDownloads.size;
  }

  /**
   * Trigger browser download
   */
  private triggerDownload(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.style.display = 'none';
    
    document.body.appendChild(a);
    a.click();
    
    // Cleanup
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * Check if filename is safe for download
   */
  private sanitizeFilename(filename: string): string {
    // Remove or replace unsafe characters
    return filename
      .replace(/[^a-z0-9.-]/gi, '_')
      .replace(/__+/g, '_')
      .replace(/^_|_$/g, '');
  }

  /**
   * Get MIME type for format
   */
  getMimeType(format: string): string {
    const mimeTypes: Record<string, string> = {
      'srt': 'text/plain',
      'vtt': 'text/vtt',
      'txt': 'text/plain',
      'csv': 'text/csv',
      'json': 'application/json',
      'zip': 'application/zip',
      'pdf': 'application/pdf'
    };
    
    return mimeTypes[format.toLowerCase()] || 'application/octet-stream';
  }

  /**
   * Format file size for display
   */
  formatFileSize(bytes: number): string {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }

  /**
   * Estimate download time
   */
  estimateDownloadTime(fileSize: number, connectionSpeed: number = 1000000): string {
    const timeInSeconds = fileSize / (connectionSpeed / 8); // Convert bps to Bps
    
    if (timeInSeconds < 60) {
      return `${Math.round(timeInSeconds)}s`;
    } else if (timeInSeconds < 3600) {
      return `${Math.round(timeInSeconds / 60)}m`;
    } else {
      return `${Math.round(timeInSeconds / 3600)}h`;
    }
  }
}

// Export singleton instance
export const downloadService = DownloadService.getInstance();

// React hook for downloads
export const useDownload = () => {
  const [activeDownloads, setActiveDownloads] = React.useState<Map<string, DownloadProgress>>(new Map());

  const addDownload = React.useCallback((progress: DownloadProgress) => {
    setActiveDownloads(prev => new Map(prev.set(progress.jobId, progress)));
  }, []);

  const removeDownload = React.useCallback((jobId: string) => {
    setActiveDownloads(prev => {
      const next = new Map(prev);
      next.delete(jobId);
      return next;
    });
  }, []);

  const downloadWithProgress = React.useCallback(async (
    jobId: string,
    format: string
  ) => {
    try {
      await downloadService.downloadTranscription(jobId, format, {
        onProgress: addDownload,
        onComplete: () => {
          setTimeout(() => removeDownload(jobId), 2000);
        },
        onError: (error) => {
          console.error('Download failed:', error);
          setTimeout(() => removeDownload(jobId), 5000);
        }
      });
    } catch (error) {
      console.error('Download error:', error);
    }
  }, [addDownload, removeDownload]);

  const downloadGenerated = React.useCallback((
    content: string,
    filename: string,
    mimeType?: string
  ) => {
    const jobId = `generated-${Date.now()}`;
    
    downloadService.downloadGeneratedContent(content, filename, mimeType, {
      onProgress: addDownload,
      onComplete: () => {
        setTimeout(() => removeDownload(jobId), 2000);
      },
      onError: (error) => {
        console.error('Download failed:', error);
        setTimeout(() => removeDownload(jobId), 5000);
      }
    });
    
    return jobId;
  }, [addDownload, removeDownload]);

  return {
    activeDownloads: Array.from(activeDownloads.values()),
    downloadWithProgress,
    downloadGenerated,
    cancelDownload: downloadService.cancelDownload.bind(downloadService),
    cancelAllDownloads: downloadService.cancelAllDownloads.bind(downloadService)
  };
};

// Add React import for the hook
import React from 'react';

export default downloadService;