/**
 * File service for CantoneseScribe
 * Handles file uploads, validation, and management
 */

import { apiClient, APIError } from './api';

// Types
export interface FileUploadResponse {
  file_id: string;
  filename: string;
  file_size: number;
  mime_type: string;
  duration?: number;
  uploaded_at: string;
}

export interface FileMetadata {
  file_id: string;
  filename: string;
  file_size: number;
  mime_type: string;
  duration?: number;
  uploaded_at: string;
  status: 'uploaded' | 'processing' | 'ready' | 'error';
  error_message?: string;
}

// File validation constants
export const SUPPORTED_AUDIO_FORMATS = [
  'audio/mpeg',
  'audio/mp4',
  'audio/wav',
  'audio/flac',
  'audio/ogg',
  'audio/webm',
  'audio/x-m4a'
];

export const SUPPORTED_VIDEO_FORMATS = [
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'video/x-msvideo',
  'video/x-ms-wmv'
];

export const ALL_SUPPORTED_FORMATS = [
  ...SUPPORTED_AUDIO_FORMATS,
  ...SUPPORTED_VIDEO_FORMATS
];

export const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB
export const MAX_DURATION = 7200; // 2 hours in seconds

// File validation error types
export class FileValidationError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'FileValidationError';
  }
}

// File service class
class FileService {
  private static instance: FileService;

  static getInstance(): FileService {
    if (!FileService.instance) {
      FileService.instance = new FileService();
    }
    return FileService.instance;
  }

  /**
   * Validate file before upload
   */
  validateFile(file: File): { isValid: boolean; error?: FileValidationError } {
    try {
      // Check file size
      if (file.size > MAX_FILE_SIZE) {
        return {
          isValid: false,
          error: new FileValidationError(
            `File size (${this.formatFileSize(file.size)}) exceeds maximum limit of ${this.formatFileSize(MAX_FILE_SIZE)}`,
            'FILE_TOO_LARGE'
          )
        };
      }

      // Check file type
      if (!ALL_SUPPORTED_FORMATS.includes(file.type)) {
        return {
          isValid: false,
          error: new FileValidationError(
            `File type "${file.type}" is not supported. Supported formats: ${this.getSupportedFormatsText()}`,
            'UNSUPPORTED_FORMAT'
          )
        };
      }

      // Additional validation for specific formats
      const extension = file.name.split('.').pop()?.toLowerCase();
      if (!extension) {
        return {
          isValid: false,
          error: new FileValidationError(
            'File must have a valid extension',
            'NO_EXTENSION'
          )
        };
      }

      return { isValid: true };
    } catch (error) {
      return {
        isValid: false,
        error: new FileValidationError(
          'Failed to validate file',
          'VALIDATION_ERROR'
        )
      };
    }
  }

  /**
   * Upload file with progress tracking
   */
  async uploadFile(
    file: File,
    onProgress?: (progress: number) => void
  ): Promise<FileUploadResponse> {
    // Validate file first
    const validation = this.validateFile(file);
    if (!validation.isValid) {
      throw validation.error;
    }

    try {
      return await apiClient.uploadFile<FileUploadResponse>(
        '/files/upload',
        file,
        onProgress
      );
    } catch (error) {
      console.error('File upload failed:', error);
      
      if (error instanceof APIError) {
        throw error;
      } else {
        throw new APIError('File upload failed. Please try again.', 500);
      }
    }
  }

  /**
   * Get file metadata
   */
  async getFileMetadata(fileId: string): Promise<FileMetadata> {
    try {
      return await apiClient.get<FileMetadata>(`/files/${fileId}`);
    } catch (error) {
      console.error('Failed to get file metadata:', error);
      throw error;
    }
  }

  /**
   * List user's uploaded files
   */
  async listFiles(limit: number = 20, offset: number = 0): Promise<FileMetadata[]> {
    try {
      return await apiClient.get<FileMetadata[]>('/files', { limit, offset });
    } catch (error) {
      console.error('Failed to list files:', error);
      throw error;
    }
  }

  /**
   * Delete uploaded file
   */
  async deleteFile(fileId: string): Promise<void> {
    try {
      await apiClient.delete(`/files/${fileId}`);
    } catch (error) {
      console.error('Failed to delete file:', error);
      throw error;
    }
  }

  /**
   * Extract audio duration from file (client-side estimate)
   */
  async getAudioDuration(file: File): Promise<number> {
    return new Promise((resolve, reject) => {
      const audio = document.createElement('audio');
      const url = URL.createObjectURL(file);
      
      audio.addEventListener('loadedmetadata', () => {
        URL.revokeObjectURL(url);
        resolve(audio.duration);
      });
      
      audio.addEventListener('error', (error) => {
        URL.revokeObjectURL(url);
        reject(new Error('Failed to load audio file'));
      });
      
      audio.src = url;
    });
  }

  /**
   * Extract video duration from file (client-side estimate)
   */
  async getVideoDuration(file: File): Promise<number> {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      const url = URL.createObjectURL(file);
      
      video.addEventListener('loadedmetadata', () => {
        URL.revokeObjectURL(url);
        resolve(video.duration);
      });
      
      video.addEventListener('error', (error) => {
        URL.revokeObjectURL(url);
        reject(new Error('Failed to load video file'));
      });
      
      video.src = url;
    });
  }

  /**
   * Get estimated duration for any supported file
   */
  async getEstimatedDuration(file: File): Promise<number | null> {
    try {
      if (SUPPORTED_VIDEO_FORMATS.includes(file.type)) {
        return await this.getVideoDuration(file);
      } else if (SUPPORTED_AUDIO_FORMATS.includes(file.type)) {
        return await this.getAudioDuration(file);
      }
      return null;
    } catch (error) {
      console.warn('Could not extract duration from file:', error);
      return null;
    }
  }

  /**
   * Validate YouTube URL
   */
  validateYouTubeURL(url: string): { isValid: boolean; error?: string; videoId?: string } {
    try {
      // YouTube URL patterns
      const patterns = [
        /(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/,
        /(?:https?:\/\/)?(?:www\.)?youtu\.be\/([a-zA-Z0-9_-]{11})/,
        /(?:https?:\/\/)?(?:www\.)?youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
        /(?:https?:\/\/)?(?:www\.)?youtube\.com\/v\/([a-zA-Z0-9_-]{11})/
      ];

      for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match) {
          return {
            isValid: true,
            videoId: match[1]
          };
        }
      }

      return {
        isValid: false,
        error: 'Invalid YouTube URL format. Please enter a valid YouTube video URL.'
      };
    } catch (error) {
      return {
        isValid: false,
        error: 'Failed to validate YouTube URL'
      };
    }
  }

  /**
   * Get YouTube video metadata
   */
  async getYouTubeMetadata(url: string): Promise<{ title: string; duration: number; thumbnail: string }> {
    try {
      return await apiClient.post<{ title: string; duration: number; thumbnail: string }>('/files/youtube-info', { url });
    } catch (error) {
      console.error('Failed to get YouTube metadata:', error);
      throw error;
    }
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
   * Format duration for display
   */
  formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    } else {
      return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
  }

  /**
   * Get supported formats text for display
   */
  getSupportedFormatsText(): string {
    return 'MP3, MP4, WAV, FLAC, OGG, M4A, WebM, MOV, AVI, WMV';
  }

  /**
   * Get file type category
   */
  getFileTypeCategory(mimeType: string): 'audio' | 'video' | 'unknown' {
    if (SUPPORTED_AUDIO_FORMATS.includes(mimeType)) {
      return 'audio';
    } else if (SUPPORTED_VIDEO_FORMATS.includes(mimeType)) {
      return 'video';
    } else {
      return 'unknown';
    }
  }

  /**
   * Generate file icon based on mime type
   */
  getFileIcon(mimeType: string): string {
    const category = this.getFileTypeCategory(mimeType);
    
    switch (category) {
      case 'audio':
        return '🎵';
      case 'video':
        return '🎥';
      default:
        return '📄';
    }
  }

  /**
   * Create drag and drop handlers
   */
  createDropHandlers(
    onFiles: (files: File[]) => void,
    onError?: (error: FileValidationError) => void
  ) {
    return {
      onDrop: (event: React.DragEvent) => {
        event.preventDefault();
        event.stopPropagation();
        
        const files = Array.from(event.dataTransfer.files);
        
        // Validate all files
        const validFiles: File[] = [];
        for (const file of files) {
          const validation = this.validateFile(file);
          if (validation.isValid) {
            validFiles.push(file);
          } else if (onError) {
            onError(validation.error!);
            return;
          }
        }
        
        if (validFiles.length > 0) {
          onFiles(validFiles);
        }
      },
      
      onDragOver: (event: React.DragEvent) => {
        event.preventDefault();
        event.stopPropagation();
      },
      
      onDragEnter: (event: React.DragEvent) => {
        event.preventDefault();
        event.stopPropagation();
      },
      
      onDragLeave: (event: React.DragEvent) => {
        event.preventDefault();
        event.stopPropagation();
      }
    };
  }
}

// Export singleton instance
export const fileService = FileService.getInstance();

// React hook for file operations
export const useFileService = () => {
  return {
    validateFile: fileService.validateFile.bind(fileService),
    uploadFile: fileService.uploadFile.bind(fileService),
    getFileMetadata: fileService.getFileMetadata.bind(fileService),
    listFiles: fileService.listFiles.bind(fileService),
    deleteFile: fileService.deleteFile.bind(fileService),
    getEstimatedDuration: fileService.getEstimatedDuration.bind(fileService),
    validateYouTubeURL: fileService.validateYouTubeURL.bind(fileService),
    getYouTubeMetadata: fileService.getYouTubeMetadata.bind(fileService),
    formatFileSize: fileService.formatFileSize.bind(fileService),
    formatDuration: fileService.formatDuration.bind(fileService),
    getSupportedFormatsText: fileService.getSupportedFormatsText.bind(fileService),
    getFileTypeCategory: fileService.getFileTypeCategory.bind(fileService),
    getFileIcon: fileService.getFileIcon.bind(fileService),
    createDropHandlers: fileService.createDropHandlers.bind(fileService)
  };
};

export default fileService;