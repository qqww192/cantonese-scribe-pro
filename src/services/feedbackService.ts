/**
 * Feedback service for CantoneseScribe
 * Handles user feedback, ratings, and quality improvements
 */

import { apiClient, APIError } from './api';

// Types
export interface FeedbackSubmission {
  transcriptionJobId: string;
  ratings: {
    overall: number;
    accuracy: number;
    speed: number;
    usefulness: number;
  };
  feedback: string;
  reportedIssues: string[];
}

export interface FeedbackResponse {
  id: string;
  userId: string;
  jobId: string;
  ratings: {
    overall: number;
    accuracy: number;
    speed: number;
    usefulness: number;
  };
  feedback: string;
  issues: string[];
  createdAt: string;
  helpful: number;
  notHelpful: number;
  verified: boolean;
}

export interface FeedbackStats {
  averageRating: number;
  totalRatings: number;
  ratingDistribution: Record<number, number>;
  commonIssues: Array<{ issue: string; count: number; percentage: number }>;
  recentTrend: 'up' | 'down' | 'stable';
  qualityMetrics: {
    accuracy: number;
    speed: number;
    usefulness: number;
  };
}

export interface ImprovementSuggestion {
  id: string;
  category: 'accuracy' | 'speed' | 'features' | 'usability';
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  votes: number;
  status: 'submitted' | 'in_review' | 'planned' | 'in_progress' | 'completed' | 'rejected';
  createdAt: string;
  estimatedImpact: string;
}

export interface QualityReport {
  period: {
    start: string;
    end: string;
  };
  totalJobs: number;
  feedbackRate: number;
  averageRating: number;
  topIssues: Array<{ issue: string; count: number; trend: 'up' | 'down' | 'stable' }>;
  improvements: Array<{
    area: string;
    change: number;
    significance: 'major' | 'minor' | 'none';
  }>;
  recommendations: string[];
}

// Feedback service class
class FeedbackService {
  private static instance: FeedbackService;

  static getInstance(): FeedbackService {
    if (!FeedbackService.instance) {
      FeedbackService.instance = new FeedbackService();
    }
    return FeedbackService.instance;
  }

  /**
   * Submit user feedback for a transcription job
   */
  async submitFeedback(feedback: FeedbackSubmission): Promise<FeedbackResponse> {
    try {
      return await apiClient.post<FeedbackResponse>('/feedback/submit', feedback);
    } catch (error) {
      console.error('Failed to submit feedback:', error);
      throw error;
    }
  }

  /**
   * Get feedback for a specific job
   */
  async getJobFeedback(jobId: string, limit: number = 10, offset: number = 0): Promise<FeedbackResponse[]> {
    try {
      return await apiClient.get<FeedbackResponse[]>(`/feedback/job/${jobId}`, { limit, offset });
    } catch (error) {
      console.error('Failed to get job feedback:', error);
      throw error;
    }
  }

  /**
   * Get user's feedback history
   */
  async getUserFeedback(limit: number = 20, offset: number = 0): Promise<FeedbackResponse[]> {
    try {
      return await apiClient.get<FeedbackResponse[]>('/feedback/user', { limit, offset });
    } catch (error) {
      console.error('Failed to get user feedback:', error);
      throw error;
    }
  }

  /**
   * Vote on feedback helpfulness
   */
  async voteFeedbackHelpfulness(feedbackId: string, helpful: boolean): Promise<void> {
    try {
      await apiClient.post(`/feedback/${feedbackId}/vote`, { helpful });
    } catch (error) {
      console.error('Failed to vote on feedback:', error);
      throw error;
    }
  }

  /**
   * Get overall feedback statistics
   */
  async getFeedbackStats(period?: { start: string; end: string }): Promise<FeedbackStats> {
    try {
      const params = period ? { start: period.start, end: period.end } : {};
      return await apiClient.get<FeedbackStats>('/feedback/stats', params);
    } catch (error) {
      console.error('Failed to get feedback stats:', error);
      throw error;
    }
  }

  /**
   * Submit improvement suggestion
   */
  async submitImprovement(suggestion: Omit<ImprovementSuggestion, 'id' | 'votes' | 'status' | 'createdAt'>): Promise<ImprovementSuggestion> {
    try {
      return await apiClient.post<ImprovementSuggestion>('/feedback/improvements', suggestion);
    } catch (error) {
      console.error('Failed to submit improvement:', error);
      throw error;
    }
  }

  /**
   * Get improvement suggestions
   */
  async getImprovements(
    category?: string,
    status?: string,
    limit: number = 20,
    offset: number = 0
  ): Promise<ImprovementSuggestion[]> {
    try {
      const params: any = { limit, offset };
      if (category) params.category = category;
      if (status) params.status = status;
      
      return await apiClient.get<ImprovementSuggestion[]>('/feedback/improvements', params);
    } catch (error) {
      console.error('Failed to get improvements:', error);
      throw error;
    }
  }

  /**
   * Vote on improvement suggestion
   */
  async voteImprovement(improvementId: string, vote: 'up' | 'down'): Promise<void> {
    try {
      await apiClient.post(`/feedback/improvements/${improvementId}/vote`, { vote });
    } catch (error) {
      console.error('Failed to vote on improvement:', error);
      throw error;
    }
  }

  /**
   * Get quality report for admin/analytics
   */
  async getQualityReport(period: { start: string; end: string }): Promise<QualityReport> {
    try {
      return await apiClient.get<QualityReport>('/feedback/quality-report', period);
    } catch (error) {
      console.error('Failed to get quality report:', error);
      throw error;
    }
  }

  /**
   * Get feedback trends over time
   */
  async getFeedbackTrends(
    period: { start: string; end: string },
    granularity: 'day' | 'week' | 'month' = 'day'
  ): Promise<Array<{ date: string; avgRating: number; count: number }>> {
    try {
      return await apiClient.get('/feedback/trends', { 
        ...period, 
        granularity 
      });
    } catch (error) {
      console.error('Failed to get feedback trends:', error);
      throw error;
    }
  }

  /**
   * Get issue categories with counts
   */
  async getIssueCategories(): Promise<Array<{ category: string; count: number; description: string }>> {
    try {
      return await apiClient.get('/feedback/issue-categories');
    } catch (error) {
      console.error('Failed to get issue categories:', error);
      throw error;
    }
  }

  /**
   * Report transcription error with specific details
   */
  async reportTranscriptionError(
    jobId: string,
    segmentId: number,
    errorType: string,
    correction: string,
    description?: string
  ): Promise<void> {
    try {
      await apiClient.post('/feedback/report-error', {
        jobId,
        segmentId,
        errorType,
        correction,
        description
      });
    } catch (error) {
      console.error('Failed to report error:', error);
      throw error;
    }
  }

  /**
   * Get personalized feedback insights for user
   */
  async getUserInsights(): Promise<{
    feedbackCount: number;
    averageRating: number;
    mostCommonIssues: string[];
    improvementAreas: string[];
    qualityTrend: 'improving' | 'declining' | 'stable';
  }> {
    try {
      return await apiClient.get('/feedback/user-insights');
    } catch (error) {
      console.error('Failed to get user insights:', error);
      throw error;
    }
  }

  /**
   * Calculate satisfaction score
   */
  calculateSatisfactionScore(ratings: { overall: number; accuracy: number; speed: number; usefulness: number }): number {
    // Weighted satisfaction score
    const weights = {
      overall: 0.4,
      accuracy: 0.3,
      speed: 0.15,
      usefulness: 0.15
    };
    
    return (
      ratings.overall * weights.overall +
      ratings.accuracy * weights.accuracy +
      ratings.speed * weights.speed +
      ratings.usefulness * weights.usefulness
    );
  }

  /**
   * Generate feedback summary text
   */
  generateFeedbackSummary(stats: FeedbackStats): string {
    const rating = stats.averageRating;
    const totalRatings = stats.totalRatings;
    
    if (totalRatings === 0) {
      return "No feedback available yet.";
    }
    
    let summary = `Based on ${totalRatings} user review${totalRatings > 1 ? 's' : ''}, `;
    
    if (rating >= 4.5) {
      summary += "users are extremely satisfied with transcription quality.";
    } else if (rating >= 4.0) {
      summary += "users are very satisfied with transcription quality.";
    } else if (rating >= 3.5) {
      summary += "users are generally satisfied with transcription quality.";
    } else if (rating >= 3.0) {
      summary += "users have mixed feelings about transcription quality.";
    } else {
      summary += "users are not satisfied with transcription quality.";
    }
    
    if (stats.commonIssues.length > 0) {
      const topIssue = stats.commonIssues[0];
      summary += ` The most common issue is "${topIssue.issue}" (${topIssue.percentage}% of reports).`;
    }
    
    return summary;
  }

  /**
   * Get feedback prompts based on usage patterns
   */
  getFeedbackPrompts(jobCount: number, avgRating?: number): string[] {
    const prompts = [];
    
    if (jobCount === 1) {
      prompts.push("How was your first experience with CantoneseScribe?");
    } else if (jobCount === 5) {
      prompts.push("You've processed 5 files! How has the quality been?");
    } else if (jobCount % 10 === 0) {
      prompts.push(`You've processed ${jobCount} files! We'd love your feedback.`);
    }
    
    if (avgRating && avgRating < 4.0) {
      prompts.push("We noticed you've had some issues. How can we improve?");
    }
    
    return prompts;
  }
}

// Export singleton instance
export const feedbackService = FeedbackService.getInstance();

// React hook for feedback operations
export const useFeedback = () => {
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  
  const submitFeedback = React.useCallback(async (feedback: FeedbackSubmission) => {
    setIsSubmitting(true);
    setError(null);
    
    try {
      const result = await feedbackService.submitFeedback(feedback);
      return result;
    } catch (err) {
      const errorMessage = err instanceof APIError ? err.message : 'Failed to submit feedback';
      setError(errorMessage);
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  }, []);
  
  const voteFeedback = React.useCallback(async (feedbackId: string, helpful: boolean) => {
    try {
      await feedbackService.voteFeedbackHelpfulness(feedbackId, helpful);
    } catch (err) {
      console.error('Failed to vote on feedback:', err);
    }
  }, []);
  
  return {
    isSubmitting,
    error,
    submitFeedback,
    voteFeedback,
    reportError: feedbackService.reportTranscriptionError.bind(feedbackService),
    getUserInsights: feedbackService.getUserInsights.bind(feedbackService)
  };
};

// Add React import for the hook
import React from 'react';

export default feedbackService;