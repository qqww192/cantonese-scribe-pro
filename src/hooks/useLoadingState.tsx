/**
 * Loading state management hook for CantoneseScribe
 * Provides consistent loading states and error handling across components
 */

import React, { useState, useCallback } from 'react';

interface LoadingState {
  isLoading: boolean;
  error: string | null;
  data: any | null;
}

interface AsyncActionOptions {
  onSuccess?: (data: any) => void;
  onError?: (error: Error) => void;
  errorMessage?: string;
  retryCount?: number;
  retryDelay?: number;
}

export const useLoadingState = <T = any>(initialData: T | null = null) => {
  const [state, setState] = useState<LoadingState>({
    isLoading: false,
    error: null,
    data: initialData
  });

  const setLoading = useCallback((loading: boolean) => {
    setState(prev => ({ ...prev, isLoading: loading }));
  }, []);

  const setError = useCallback((error: string | null) => {
    setState(prev => ({ ...prev, error, isLoading: false }));
  }, []);

  const setData = useCallback((data: T | null) => {
    setState(prev => ({ ...prev, data, error: null, isLoading: false }));
  }, []);

  const reset = useCallback(() => {
    setState({
      isLoading: false,
      error: null,
      data: initialData
    });
  }, [initialData]);

  const executeAsync = useCallback(async <R = T>(
    asyncFunction: () => Promise<R>,
    options: AsyncActionOptions = {}
  ): Promise<R | null> => {
    const {
      onSuccess,
      onError,
      errorMessage = 'An error occurred',
      retryCount = 0,
      retryDelay = 1000
    } = options;

    setLoading(true);
    setError(null);

    let lastError: Error;
    
    for (let attempt = 0; attempt <= retryCount; attempt++) {
      try {
        const result = await asyncFunction();
        setData(result as T);
        
        if (onSuccess) {
          onSuccess(result);
        }
        
        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        // If this is the last attempt, handle the error
        if (attempt === retryCount) {
          console.error('Async operation failed:', lastError);
          
          const finalErrorMessage = lastError.message || errorMessage;
          setError(finalErrorMessage);
          
          if (onError) {
            onError(lastError);
          }
          
          return null;
        }
        
        // Wait before retrying
        if (retryDelay > 0) {
          await new Promise(resolve => setTimeout(resolve, retryDelay));
        }
      }
    }
    
    return null;
  }, [setLoading, setError, setData]);

  const retry = useCallback((
    asyncFunction: () => Promise<any>,
    options?: AsyncActionOptions
  ) => {
    return executeAsync(asyncFunction, options);
  }, [executeAsync]);

  return {
    ...state,
    setLoading,
    setError,
    setData,
    reset,
    executeAsync,
    retry
  };
};

// Specialized hooks for different types of loading states
export const useApiCall = <T = any>(initialData: T | null = null) => {
  const loadingState = useLoadingState<T>(initialData);
  
  const callApi = useCallback(async <R = T>(
    apiFunction: () => Promise<R>,
    options: AsyncActionOptions = {}
  ) => {
    return loadingState.executeAsync(apiFunction, {
      retryCount: 1, // API calls get one retry by default
      retryDelay: 1000,
      errorMessage: 'Failed to load data. Please try again.',
      ...options
    });
  }, [loadingState]);
  
  return {
    ...loadingState,
    callApi
  };
};

export const useFileUpload = () => {
  const loadingState = useLoadingState();
  const [uploadProgress, setUploadProgress] = useState(0);
  
  const uploadFile = useCallback(async (
    uploadFunction: (onProgress?: (progress: number) => void) => Promise<any>,
    options: AsyncActionOptions = {}
  ) => {
    setUploadProgress(0);
    
    return loadingState.executeAsync(
      () => uploadFunction((progress) => setUploadProgress(progress)),
      {
        errorMessage: 'File upload failed. Please try again.',
        ...options,
        onSuccess: (data) => {
          setUploadProgress(100);
          if (options.onSuccess) {
            options.onSuccess(data);
          }
        },
        onError: (error) => {
          setUploadProgress(0);
          if (options.onError) {
            options.onError(error);
          }
        }
      }
    );
  }, [loadingState]);
  
  const resetUpload = useCallback(() => {
    setUploadProgress(0);
    loadingState.reset();
  }, [loadingState]);
  
  return {
    ...loadingState,
    uploadProgress,
    uploadFile,
    resetUpload
  };
};

export const useSubscription = () => {
  const loadingState = useLoadingState();
  const [processingPayment, setProcessingPayment] = useState(false);
  
  const processPayment = useCallback(async (
    paymentFunction: () => Promise<any>,
    options: AsyncActionOptions = {}
  ) => {
    setProcessingPayment(true);
    
    const result = await loadingState.executeAsync(paymentFunction, {
      errorMessage: 'Payment processing failed. Please try again.',
      ...options,
      onSuccess: (data) => {
        setProcessingPayment(false);
        if (options.onSuccess) {
          options.onSuccess(data);
        }
      },
      onError: (error) => {
        setProcessingPayment(false);
        if (options.onError) {
          options.onError(error);
        }
      }
    });
    
    return result;
  }, [loadingState]);
  
  return {
    ...loadingState,
    processingPayment,
    processPayment
  };
};

// Higher-order component for loading states
export const withLoadingState = <P extends object>(
  Component: React.ComponentType<P>,
  LoadingSkeleton: React.ComponentType
) => {
  return (props: P & { isLoading?: boolean; error?: string | null }) => {
    const { isLoading, error, ...componentProps } = props;
    
    if (isLoading) {
      return <LoadingSkeleton />;
    }
    
    if (error) {
      return (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="text-red-600 mb-4">
            <svg className="h-12 w-12 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <p className="font-medium">{error}</p>
          </div>
        </div>
      );
    }
    
    return <Component {...(componentProps as P)} />;
  };
};

export default useLoadingState;