/**
 * Authentication context provider for CantoneseScribe
 * Provides authentication state and functions throughout the app
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
import { authService, AuthState, User } from '@/services/authService';

interface AuthContextType extends AuthState {
  login: (credentials: { email: string; password: string }) => Promise<any>;
  register: (userData: { name: string; email: string; password: string; confirmPassword: string }) => Promise<any>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<void>;
  getCurrentUser: () => Promise<User>;
  updateProfile: (updates: Partial<Pick<User, 'name' | 'email'>>) => Promise<User>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  requestPasswordReset: (email: string) => Promise<void>;
  resetPassword: (token: string, newPassword: string) => Promise<void>;
  isAuthenticated: () => boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [authState, setAuthState] = useState<AuthState>(authService.getAuthState());

  useEffect(() => {
    // Subscribe to auth state changes
    const unsubscribe = authService.subscribe(setAuthState);
    
    // Setup automatic token refresh if authenticated
    if (authService.isAuthenticated()) {
      authService.setupTokenRefresh();
    }
    
    // Check if user data needs to be refreshed
    const checkUserData = async () => {
      if (authService.isAuthenticated() && !authState.user) {
        try {
          await authService.getCurrentUser();
        } catch (error) {
          console.warn('Failed to refresh user data:', error);
        }
      }
    };
    
    checkUserData();
    
    return unsubscribe;
  }, [authState.user]);

  const contextValue: AuthContextType = {
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

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};