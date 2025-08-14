/**
 * API service layer with comprehensive error handling and base HTTP client
 * Provides centralized API management for CantoneseScribe application
 */

// API Configuration
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1';
const WS_BASE_URL = import.meta.env.VITE_WS_BASE_URL || 'ws://localhost:8000/ws';

// Error types
export class APIError extends Error {
  constructor(
    message: string, 
    public status: number = 500, 
    public code?: string,
    public details?: any
  ) {
    super(message);
    this.name = 'APIError';
  }
}

export class NetworkError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NetworkError';
  }
}

export class ValidationError extends APIError {
  constructor(message: string, public errors: Record<string, string[]>) {
    super(message, 422, 'VALIDATION_ERROR', errors);
  }
}

// Response types
interface APIResponse<T = any> {
  data?: T;
  message?: string;
  error?: string;
  status: number;
}

// Authentication utilities
export const authUtils = {
  getToken: (): string | null => {
    return localStorage.getItem('authToken');
  },
  
  setToken: (token: string): void => {
    localStorage.setItem('authToken', token);
  },
  
  removeToken: (): void => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
  },
  
  isAuthenticated: (): boolean => {
    const token = authUtils.getToken();
    return !!token && !authUtils.isTokenExpired(token);
  },
  
  isTokenExpired: (token: string): boolean => {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.exp * 1000 < Date.now();
    } catch {
      return true;
    }
  },
  
  getUser: () => {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  },
  
  setUser: (user: any): void => {
    localStorage.setItem('user', JSON.stringify(user));
  }
};

// Base HTTP client class
class HTTPClient {
  private baseURL: string;
  
  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }
  
  private async request<T = any>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    
    // Default headers
    const defaultHeaders: HeadersInit = {
      'Content-Type': 'application/json',
    };
    
    // Add authorization header if token exists
    const token = authUtils.getToken();
    if (token) {
      defaultHeaders['Authorization'] = `Bearer ${token}`;
    }
    
    const config: RequestInit = {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
    };
    
    try {
      const response = await fetch(url, config);
      
      // Handle network errors
      if (!response.ok) {
        await this.handleErrorResponse(response);
      }
      
      // Parse response
      const contentType = response.headers.get('content-type');
      const isJSON = contentType?.includes('application/json');
      
      const result = isJSON ? await response.json() : await response.text();
      
      return result;
    } catch (error) {
      if (error instanceof APIError || error instanceof ValidationError) {
        throw error;
      }
      
      // Network or other errors
      throw new NetworkError(
        error instanceof Error ? error.message : 'Network error occurred'
      );
    }
  }
  
  private async handleErrorResponse(response: Response): Promise<never> {
    const contentType = response.headers.get('content-type');
    const isJSON = contentType?.includes('application/json');
    
    let errorData: any = {};
    try {
      errorData = isJSON ? await response.json() : { message: await response.text() };
    } catch {
      errorData = { message: 'Unknown error occurred' };
    }
    
    // Handle specific error types
    switch (response.status) {
      case 401:
        // Token expired or invalid - clear auth data
        authUtils.removeToken();
        window.location.href = '/auth';
        throw new APIError('Authentication required', 401, 'UNAUTHORIZED');
        
      case 403:
        throw new APIError('Access forbidden', 403, 'FORBIDDEN');
        
      case 422:
        throw new ValidationError(
          errorData.message || 'Validation failed',
          errorData.detail || {}
        );
        
      case 429:
        throw new APIError(
          'Too many requests. Please try again later.',
          429,
          'RATE_LIMITED'
        );
        
      case 500:
        throw new APIError(
          'Server error occurred. Please try again.',
          500,
          'SERVER_ERROR'
        );
        
      default:
        throw new APIError(
          errorData.message || 'Request failed',
          response.status,
          errorData.code
        );
    }
  }
  
  async get<T = any>(endpoint: string, params?: Record<string, any>): Promise<T> {
    const queryString = params 
      ? '?' + new URLSearchParams(params).toString()
      : '';
    
    return this.request<T>(`${endpoint}${queryString}`, {
      method: 'GET',
    });
  }
  
  async post<T = any>(endpoint: string, data?: any): Promise<T> {
    const body = data instanceof FormData ? data : JSON.stringify(data);
    const headers = data instanceof FormData 
      ? {} 
      : { 'Content-Type': 'application/json' };
      
    return this.request<T>(endpoint, {
      method: 'POST',
      body,
      headers,
    });
  }
  
  async put<T = any>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }
  
  async patch<T = any>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }
  
  async delete<T = any>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'DELETE',
    });
  }
  
  // File upload with progress
  async uploadFile<T = any>(
    endpoint: string, 
    file: File, 
    onProgress?: (progress: number) => void
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const formData = new FormData();
      formData.append('file', file);
      
      const xhr = new XMLHttpRequest();
      
      // Progress tracking
      if (onProgress) {
        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable) {
            const progress = Math.round((event.loaded / event.total) * 100);
            onProgress(progress);
          }
        });
      }
      
      // Success handler
      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const response = JSON.parse(xhr.responseText);
            resolve(response);
          } catch {
            resolve(xhr.responseText as any);
          }
        } else {
          reject(new APIError(`Upload failed: ${xhr.statusText}`, xhr.status));
        }
      });
      
      // Error handler
      xhr.addEventListener('error', () => {
        reject(new NetworkError('Upload failed due to network error'));
      });
      
      // Setup request
      const token = authUtils.getToken();
      if (token) {
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      }
      
      xhr.open('POST', `${this.baseURL}${endpoint}`);
      xhr.send(formData);
    });
  }
}

// Create API client instance
export const apiClient = new HTTPClient(API_BASE_URL);

// WebSocket client for real-time updates
export class WebSocketClient {
  private ws: WebSocket | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectInterval = 1000;
  
  connect(jobId: string, onMessage: (data: any) => void, onError?: (error: Event) => void): Promise<void> {
    return new Promise((resolve, reject) => {
      const token = authUtils.getToken();
      if (!token) {
        reject(new Error('Authentication token required for WebSocket connection'));
        return;
      }
      
      const wsUrl = `${WS_BASE_URL}/transcription/${jobId}?token=${token}`;
      this.ws = new WebSocket(wsUrl);
      
      this.ws.onopen = () => {
        console.log('WebSocket connected');
        this.reconnectAttempts = 0;
        resolve();
      };
      
      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          onMessage(data);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };
      
      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        if (onError) onError(error);
      };
      
      this.ws.onclose = (event) => {
        console.log('WebSocket closed', event.code, event.reason);
        this.handleReconnect(jobId, onMessage, onError);
      };
      
      // Connection timeout
      setTimeout(() => {
        if (this.ws?.readyState === WebSocket.CONNECTING) {
          this.ws.close();
          reject(new Error('WebSocket connection timeout'));
        }
      }, 10000);
    });
  }
  
  private handleReconnect(jobId: string, onMessage: (data: any) => void, onError?: (error: Event) => void): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      return;
    }
    
    this.reconnectAttempts++;
    const delay = Math.min(this.reconnectInterval * Math.pow(2, this.reconnectAttempts - 1), 30000);
    
    this.reconnectTimer = setTimeout(() => {
      console.log(`Attempting to reconnect... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
      this.connect(jobId, onMessage, onError).catch(console.error);
    }, delay);
  }
  
  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    
    this.reconnectAttempts = 0;
  }
  
  send(data: any): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    } else {
      console.warn('WebSocket is not connected');
    }
  }
}

export const wsClient = new WebSocketClient();

// Export common utilities
export { API_BASE_URL, WS_BASE_URL };