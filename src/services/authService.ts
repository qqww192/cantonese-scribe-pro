/**
 * Authentication service for CantoneseScribe
 * Handles user registration, login, token management, and session persistence
 */

import { apiClient, authUtils, APIError, ValidationError } from './api';

// Types
export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  user: User;
}

export interface User {
  user_id: string;
  name: string;
  email: string;
  subscription_plan: string;
  usage_quota: number;
  usage_count: number;
  created_at: string;
  is_active: boolean;
}

export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  loading: boolean;
  error: string | null;
}

// Authentication service class
class AuthService {
  private static instance: AuthService;
  private authState: AuthState = {
    isAuthenticated: false,
    user: null,
    loading: false,
    error: null
  };

  private listeners: ((state: AuthState) => void)[] = [];

  static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  constructor() {
    this.initializeAuth();
  }

  /**
   * Initialize authentication state from localStorage
   */
  private initializeAuth(): void {
    const token = authUtils.getToken();
    const user = authUtils.getUser();
    
    if (token && user && !authUtils.isTokenExpired(token)) {
      this.updateAuthState({
        isAuthenticated: true,
        user,
        loading: false,
        error: null
      });
    } else {
      // Clear invalid/expired auth data
      authUtils.removeToken();
      this.updateAuthState({
        isAuthenticated: false,
        user: null,
        loading: false,
        error: null
      });
    }
  }

  /**
   * Update auth state and notify listeners
   */
  private updateAuthState(newState: Partial<AuthState>): void {
    this.authState = { ...this.authState, ...newState };
    this.notifyListeners();
  }

  /**
   * Add state change listener
   */
  subscribe(listener: (state: AuthState) => void): () => void {
    this.listeners.push(listener);
    
    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /**
   * Notify all listeners of state changes
   */
  private notifyListeners(): void {
    this.listeners.forEach(listener => listener({ ...this.authState }));
  }

  /**
   * Get current auth state
   */
  getAuthState(): AuthState {
    return { ...this.authState };
  }

  /**
   * Login user with email and password
   */
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    this.updateAuthState({ loading: true, error: null });

    try {
      const response = await apiClient.post<LoginResponse>('/auth/login', credentials);
      
      // Store authentication data
      authUtils.setToken(response.access_token);
      authUtils.setUser(response.user);
      
      // Update auth state
      this.updateAuthState({
        isAuthenticated: true,
        user: response.user,
        loading: false,
        error: null
      });

      return response;
    } catch (error) {
      const errorMessage = error instanceof APIError || error instanceof ValidationError 
        ? error.message 
        : 'Login failed. Please try again.';
        
      this.updateAuthState({
        isAuthenticated: false,
        user: null,
        loading: false,
        error: errorMessage
      });

      throw error;
    }
  }

  /**
   * Register new user
   */
  async register(userData: RegisterRequest): Promise<LoginResponse> {
    this.updateAuthState({ loading: true, error: null });

    try {
      // Validate passwords match
      if (userData.password !== userData.confirmPassword) {
        throw new ValidationError('Passwords do not match', {
          confirmPassword: ['Passwords do not match']
        });
      }

      const response = await apiClient.post<LoginResponse>('/auth/register', {
        name: userData.name,
        email: userData.email,
        password: userData.password
      });

      // Store authentication data
      authUtils.setToken(response.access_token);
      authUtils.setUser(response.user);
      
      // Update auth state
      this.updateAuthState({
        isAuthenticated: true,
        user: response.user,
        loading: false,
        error: null
      });

      return response;
    } catch (error) {
      const errorMessage = error instanceof APIError || error instanceof ValidationError 
        ? error.message 
        : 'Registration failed. Please try again.';
        
      this.updateAuthState({
        isAuthenticated: false,
        user: null,
        loading: false,
        error: errorMessage
      });

      throw error;
    }
  }

  /**
   * Logout user
   */
  async logout(): Promise<void> {
    this.updateAuthState({ loading: true });

    try {
      // Call logout endpoint to invalidate token on server
      await apiClient.post('/auth/logout');
    } catch (error) {
      // Continue with logout even if server request fails
      console.warn('Logout request failed:', error);
    } finally {
      // Clear local auth data
      authUtils.removeToken();
      
      // Update auth state
      this.updateAuthState({
        isAuthenticated: false,
        user: null,
        loading: false,
        error: null
      });
    }
  }

  /**
   * Refresh authentication token
   */
  async refreshToken(): Promise<void> {
    try {
      const response = await apiClient.post<{ access_token: string; user: User }>('/auth/refresh');
      
      // Update stored token and user data
      authUtils.setToken(response.access_token);
      authUtils.setUser(response.user);
      
      // Update auth state
      this.updateAuthState({
        isAuthenticated: true,
        user: response.user,
        error: null
      });
    } catch (error) {
      // Token refresh failed, logout user
      this.logout();
      throw error;
    }
  }

  /**
   * Get current user profile
   */
  async getCurrentUser(): Promise<User> {
    try {
      const user = await apiClient.get<User>('/auth/me');
      
      // Update stored user data
      authUtils.setUser(user);
      
      // Update auth state
      this.updateAuthState({
        user,
        error: null
      });

      return user;
    } catch (error) {
      // If getting user fails due to auth error, logout
      if (error instanceof APIError && error.status === 401) {
        this.logout();
      }
      throw error;
    }
  }

  /**
   * Update user profile
   */
  async updateProfile(updates: Partial<Pick<User, 'name' | 'email'>>): Promise<User> {
    try {
      const user = await apiClient.patch<User>('/auth/profile', updates);
      
      // Update stored user data
      authUtils.setUser(user);
      
      // Update auth state
      this.updateAuthState({
        user,
        error: null
      });

      return user;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Change password
   */
  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    try {
      await apiClient.patch('/auth/password', {
        current_password: currentPassword,
        new_password: newPassword
      });
    } catch (error) {
      throw error;
    }
  }

  /**
   * Request password reset
   */
  async requestPasswordReset(email: string): Promise<void> {
    try {
      await apiClient.post('/auth/password-reset/request', { email });
    } catch (error) {
      throw error;
    }
  }

  /**
   * Reset password with token
   */
  async resetPassword(token: string, newPassword: string): Promise<void> {
    try {
      await apiClient.post('/auth/password-reset/confirm', {
        token,
        new_password: newPassword
      });
    } catch (error) {
      throw error;
    }
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return this.authState.isAuthenticated && !!authUtils.getToken() && !this.isTokenExpired();
  }

  /**
   * Check if token is expired
   */
  private isTokenExpired(): boolean {
    const token = authUtils.getToken();
    return !token || authUtils.isTokenExpired(token);
  }

  /**
   * Setup automatic token refresh
   */
  setupTokenRefresh(): void {
    const token = authUtils.getToken();
    if (!token) return;

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const expiryTime = payload.exp * 1000;
      const currentTime = Date.now();
      const refreshTime = expiryTime - (15 * 60 * 1000); // Refresh 15 minutes before expiry

      if (refreshTime > currentTime) {
        setTimeout(() => {
          this.refreshToken().catch(() => {
            // Refresh failed, user will need to login again
            this.logout();
          });
        }, refreshTime - currentTime);
      }
    } catch (error) {
      console.warn('Failed to setup token refresh:', error);
    }
  }
}

// Export singleton instance
export const authService = AuthService.getInstance();

// React hook for authentication state
export const useAuth = () => {
  const [authState, setAuthState] = React.useState<AuthState>(authService.getAuthState());

  React.useEffect(() => {
    const unsubscribe = authService.subscribe(setAuthState);
    return unsubscribe;
  }, []);

  return {
    ...authState,
    login: authService.login.bind(authService),
    register: authService.register.bind(authService),
    logout: authService.logout.bind(authService),
    refreshToken: authService.refreshToken.bind(authService),
    getCurrentUser: authService.getCurrentUser.bind(authService),
    updateProfile: authService.updateProfile.bind(authService),
    changePassword: authService.changePassword.bind(authService),
    requestPasswordReset: authService.requestPasswordReset.bind(authService),
    resetPassword: authService.resetPassword.bind(authService),
    isAuthenticated: authService.isAuthenticated.bind(authService)
  };
};

// Add React import for the hook
import React from 'react';

export default authService;