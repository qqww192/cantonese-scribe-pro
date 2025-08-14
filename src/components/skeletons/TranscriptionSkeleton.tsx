/**
 * Skeleton loading components for CantoneseScribe
 * Provides smooth loading states while data is being fetched
 */

import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

// Individual transcription item skeleton
export const TranscriptionItemSkeleton: React.FC = () => (
  <div className="p-4 border rounded-lg">
    <div className="flex items-start justify-between mb-3">
      <div className="flex items-center gap-3">
        {/* Timestamp */}
        <Skeleton className="h-4 w-24" />
        {/* Confidence badge */}
        <Skeleton className="h-5 w-16" />
        {/* Speaker badge */}
        <Skeleton className="h-5 w-20" />
      </div>
      {/* Copy button */}
      <Skeleton className="h-8 w-8" />
    </div>
    
    <div className="space-y-2">
      {/* Chinese text */}
      <Skeleton className="h-6 w-full" />
      <Skeleton className="h-6 w-4/5" />
      
      {/* Romanization */}
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-4 w-2/3" />
      
      {/* English translation */}
      <Skeleton className="h-4 w-5/6" />
    </div>
  </div>
);

// Multiple transcription items skeleton
export const TranscriptionListSkeleton: React.FC<{ count?: number }> = ({ count = 5 }) => (
  <div className="space-y-4">
    {Array.from({ length: count }, (_, i) => (
      <TranscriptionItemSkeleton key={i} />
    ))}
  </div>
);

// Transcription results card skeleton
export const TranscriptionResultsSkeleton: React.FC = () => (
  <Card>
    <CardHeader>
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-80" />
        </div>
        <Skeleton className="h-4 w-16" />
      </div>
    </CardHeader>
    <CardContent>
      <div className="space-y-4 mb-4">
        {/* Search bar skeleton */}
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 flex-1 max-w-md" />
          <Skeleton className="h-4 w-20" />
        </div>
      </div>
      
      {/* Transcription items */}
      <TranscriptionListSkeleton count={6} />
    </CardContent>
  </Card>
);

// Processing progress skeleton
export const ProcessingSkeleton: React.FC = () => (
  <Card>
    <CardHeader>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-5 rounded-full" />
          <Skeleton className="h-6 w-32" />
        </div>
        <Skeleton className="h-5 w-12" />
      </div>
      <Skeleton className="h-4 w-40" />
    </CardHeader>
    <CardContent>
      <div className="space-y-4">
        {/* Progress bar */}
        <Skeleton className="h-2 w-full" />
        
        {/* Progress message */}
        <Skeleton className="h-4 w-64" />
        
        {/* Processing details */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="text-center">
              <Skeleton className="h-8 w-12 mx-auto mb-2" />
              <Skeleton className="h-3 w-16 mx-auto" />
            </div>
          ))}
        </div>
        
        {/* Cancel button */}
        <div className="flex justify-center pt-4">
          <Skeleton className="h-8 w-20" />
        </div>
      </div>
    </CardContent>
  </Card>
);

// Job summary skeleton
export const JobSummarySkeleton: React.FC = () => (
  <Card>
    <CardHeader>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-5" />
          <Skeleton className="h-6 w-48" />
        </div>
        <Skeleton className="h-6 w-24" />
      </div>
      <Skeleton className="h-4 w-64" />
    </CardHeader>
    <CardContent>
      {/* Stats grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="flex items-center gap-2">
            <Skeleton className="h-4 w-4" />
            <Skeleton className="h-4 w-16" />
          </div>
        ))}
      </div>
      
      {/* Source info */}
      <div className="p-3 bg-gray-50 rounded-lg">
        <div className="flex items-center gap-2">
          <Skeleton className="h-3 w-3" />
          <Skeleton className="h-4 w-80" />
        </div>
      </div>
    </CardContent>
  </Card>
);

// Export options skeleton
export const ExportOptionsSkeleton: React.FC = () => (
  <Card>
    <CardHeader>
      <Skeleton className="h-6 w-32 mb-2" />
      <Skeleton className="h-4 w-64" />
    </CardHeader>
    <CardContent>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    </CardContent>
  </Card>
);

// File upload skeleton
export const FileUploadSkeleton: React.FC = () => (
  <Card>
    <CardHeader>
      <div className="flex items-center gap-2">
        <Skeleton className="h-5 w-5" />
        <Skeleton className="h-6 w-48" />
      </div>
      <Skeleton className="h-4 w-80" />
    </CardHeader>
    <CardContent>
      <div className="border-2 border-dashed rounded-lg p-8">
        <div className="text-center space-y-3">
          <Skeleton className="h-12 w-12 mx-auto" />
          <div className="space-y-2">
            <Skeleton className="h-5 w-48 mx-auto" />
            <Skeleton className="h-4 w-64 mx-auto" />
          </div>
        </div>
      </div>
    </CardContent>
  </Card>
);

// Pricing page skeleton
export const PricingPageSkeleton: React.FC = () => (
  <div className="min-h-screen bg-gray-50">
    <div className="max-w-7xl mx-auto px-6 py-16">
      {/* Header */}
      <div className="text-center mb-16">
        <Skeleton className="h-10 w-96 mx-auto mb-6" />
        <Skeleton className="h-6 w-full max-w-3xl mx-auto mb-2" />
        <Skeleton className="h-6 w-2/3 mx-auto mb-8" />
        
        {/* Toggle */}
        <div className="flex items-center justify-center gap-4 mb-8">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-6 w-11 rounded-full" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-6 w-16 rounded-full" />
        </div>
      </div>

      {/* Pricing cards */}
      <div className="grid lg:grid-cols-2 gap-8 mb-16 max-w-4xl mx-auto">
        {Array.from({ length: 2 }, (_, i) => (
          <Card key={i} className={i === 1 ? 'scale-105' : ''}>
            {i === 1 && <Skeleton className="h-8 w-32 mx-auto -mt-4 mb-4" />}
            
            <CardHeader className="text-center pb-4">
              <Skeleton className="h-8 w-32 mx-auto mb-2" />
              <Skeleton className="h-4 w-48 mx-auto mb-4" />
              
              <div className="text-center">
                <Skeleton className="h-10 w-24 mx-auto mb-2" />
                <Skeleton className="h-4 w-16 mx-auto" />
              </div>
              
              {/* Credits info */}
              <div className="mt-4 p-2 bg-gray-50 rounded-lg">
                <Skeleton className="h-5 w-20 mx-auto mb-1" />
                <Skeleton className="h-3 w-16 mx-auto" />
              </div>
            </CardHeader>
            
            <CardContent className="pt-0">
              <Skeleton className="h-10 w-full mb-6" />
              
              <div className="space-y-3">
                {Array.from({ length: 5 }, (_, j) => (
                  <div key={j} className="flex items-start gap-3">
                    <Skeleton className="h-5 w-5 mt-0.5" />
                    <Skeleton className="h-4 w-full" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Credits info */}
      <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-200 mb-16">
        <Skeleton className="h-6 w-48 mx-auto mb-6" />
        <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="text-center">
              <Skeleton className="h-8 w-16 mx-auto mb-2" />
              <Skeleton className="h-5 w-24 mx-auto mb-1" />
              <Skeleton className="h-4 w-32 mx-auto" />
            </div>
          ))}
        </div>
      </div>

      {/* FAQ */}
      <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-200">
        <Skeleton className="h-6 w-64 mx-auto mb-6" />
        <div className="grid md:grid-cols-2 gap-8">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i}>
              <Skeleton className="h-5 w-48 mb-2" />
              <Skeleton className="h-4 w-full mb-1" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
);

// Dashboard/History page skeleton
export const HistoryPageSkeleton: React.FC = () => (
  <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Skeleton className="h-9 w-48 mb-2" />
        <Skeleton className="h-5 w-80" />
      </div>
      
      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {Array.from({ length: 3 }, (_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <Skeleton className="h-4 w-24 mb-2" />
                  <Skeleton className="h-8 w-16" />
                </div>
                <Skeleton className="h-8 w-8" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      
      {/* Recent jobs */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-9 w-24" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 5 }, (_, i) => (
              <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10" />
                  <div>
                    <Skeleton className="h-5 w-48 mb-1" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Skeleton className="h-6 w-16" />
                  <Skeleton className="h-8 w-8" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  </div>
);