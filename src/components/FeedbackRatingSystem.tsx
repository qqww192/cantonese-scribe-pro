/**
 * Feedback and Rating System for CantoneseScribe
 * Allows users to rate transcription quality and provide feedback
 */

import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  Star, 
  ThumbsUp, 
  ThumbsDown, 
  MessageSquare,
  Send,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Users
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { APIError } from '@/services/api';
import { cn } from '@/lib/utils';

// Types
interface FeedbackData {
  transcriptionJobId: string;
  overallRating: number;
  accuracyRating: number;
  speedRating: number;
  usefulnessRating: number;
  feedback: string;
  reportIssues: string[];
}

interface TranscriptionRating {
  id: string;
  jobId: string;
  userId: string;
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
}

interface RatingStats {
  averageRating: number;
  totalRatings: number;
  ratingDistribution: Record<number, number>;
  commonIssues: Array<{ issue: string; count: number }>;
  recentTrend: 'up' | 'down' | 'stable';
}

interface FeedbackRatingProps {
  jobId: string;
  onSubmit?: (feedback: FeedbackData) => void;
  showStats?: boolean;
  className?: string;
}

interface RatingDisplayProps {
  ratings: TranscriptionRating[];
  stats: RatingStats;
  onHelpful?: (ratingId: string, helpful: boolean) => void;
}

const ISSUE_CATEGORIES = [
  'Incorrect Chinese characters',
  'Wrong romanization (Yale)',
  'Wrong romanization (Jyutping)', 
  'Inaccurate English translation',
  'Missing punctuation',
  'Speaker identification errors',
  'Timestamp synchronization issues',
  'Background noise interference',
  'Multiple speakers confusion',
  'Technical/domain-specific terms',
  'Regional accent difficulties',
  'Audio quality issues'
];

// Star rating component
const StarRating: React.FC<{
  value: number;
  onChange?: (value: number) => void;
  readonly?: boolean;
  size?: 'sm' | 'md' | 'lg';
  showValue?: boolean;
}> = ({ value, onChange, readonly = false, size = 'md', showValue = false }) => {
  const [hoverValue, setHoverValue] = useState(0);

  const sizes = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6'
  };

  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={readonly}
          className={cn(
            "transition-colors",
            readonly ? "cursor-default" : "cursor-pointer hover:scale-110"
          )}
          onClick={() => !readonly && onChange && onChange(star)}
          onMouseEnter={() => !readonly && setHoverValue(star)}
          onMouseLeave={() => !readonly && setHoverValue(0)}
        >
          <Star
            className={cn(
              sizes[size],
              "transition-colors",
              (hoverValue || value) >= star
                ? "fill-yellow-400 text-yellow-400"
                : "text-gray-300"
            )}
          />
        </button>
      ))}
      {showValue && (
        <span className="ml-2 text-sm text-gray-600">
          ({value}/5)
        </span>
      )}
    </div>
  );
};

// Individual rating display
const RatingDisplay: React.FC<{
  rating: TranscriptionRating;
  onHelpful?: (helpful: boolean) => void;
}> = ({ rating, onHelpful }) => {
  const [voted, setVoted] = useState<boolean | null>(null);

  const handleVote = (helpful: boolean) => {
    if (voted !== null) return; // Already voted
    setVoted(helpful);
    onHelpful && onHelpful(helpful);
  };

  return (
    <Card className="mb-4">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="space-y-2">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">Overall:</span>
                <StarRating value={rating.ratings.overall} readonly size="sm" />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">Accuracy:</span>
                <StarRating value={rating.ratings.accuracy} readonly size="sm" />
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">Speed:</span>
                <StarRating value={rating.ratings.speed} readonly size="sm" />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">Usefulness:</span>
                <StarRating value={rating.ratings.usefulness} readonly size="sm" />
              </div>
            </div>
          </div>
          
          <div className="text-xs text-gray-500">
            {new Date(rating.createdAt).toLocaleDateString()}
          </div>
        </div>
        
        {rating.feedback && (
          <div className="mb-3 p-3 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-700">{rating.feedback}</p>
          </div>
        )}
        
        {rating.issues.length > 0 && (
          <div className="mb-3">
            <div className="text-sm text-gray-600 mb-2">Reported Issues:</div>
            <div className="flex flex-wrap gap-1">
              {rating.issues.map((issue, index) => (
                <Badge key={index} variant="secondary" className="text-xs">
                  {issue}
                </Badge>
              ))}
            </div>
          </div>
        )}
        
        <div className="flex items-center justify-between pt-3 border-t">
          <div className="text-xs text-gray-500">
            Was this review helpful?
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleVote(true)}
              disabled={voted !== null}
              className={cn(
                "h-8 px-3",
                voted === true && "bg-green-100 text-green-700"
              )}
            >
              <ThumbsUp className="h-3 w-3 mr-1" />
              {rating.helpful + (voted === true ? 1 : 0)}
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleVote(false)}
              disabled={voted !== null}
              className={cn(
                "h-8 px-3",
                voted === false && "bg-red-100 text-red-700"
              )}
            >
              <ThumbsDown className="h-3 w-3 mr-1" />
              {rating.notHelpful + (voted === false ? 1 : 0)}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Stats display component
const RatingStats: React.FC<{ stats: RatingStats }> = ({ stats }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      <Card>
        <CardContent className="p-4 text-center">
          <div className="flex items-center justify-center mb-2">
            <Star className="h-8 w-8 text-yellow-400 fill-current" />
          </div>
          <div className="text-2xl font-bold">{stats.averageRating.toFixed(1)}</div>
          <div className="text-sm text-gray-500">Average Rating</div>
          <div className="text-xs text-gray-400 mt-1">
            {stats.totalRatings} total ratings
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="p-4 text-center">
          <div className="flex items-center justify-center mb-2">
            {stats.recentTrend === 'up' ? (
              <TrendingUp className="h-8 w-8 text-green-500" />
            ) : stats.recentTrend === 'down' ? (
              <TrendingDown className="h-8 w-8 text-red-500" />
            ) : (
              <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center">
                <div className="w-4 h-0.5 bg-gray-400"></div>
              </div>
            )}
          </div>
          <div className="text-sm font-medium capitalize">{stats.recentTrend}</div>
          <div className="text-sm text-gray-500">Recent Trend</div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="p-4 text-center">
          <div className="flex items-center justify-center mb-2">
            <Users className="h-8 w-8 text-blue-500" />
          </div>
          <div className="text-2xl font-bold">{stats.totalRatings}</div>
          <div className="text-sm text-gray-500">Total Reviews</div>
        </CardContent>
      </Card>
    </div>
  );
};

// Main feedback component
const FeedbackRatingSystem: React.FC<FeedbackRatingProps> = ({
  jobId,
  onSubmit,
  showStats = false,
  className
}) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState<FeedbackData>({
    transcriptionJobId: jobId,
    overallRating: 0,
    accuracyRating: 0,
    speedRating: 0,
    usefulnessRating: 0,
    feedback: '',
    reportIssues: []
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRatingChange = useCallback((field: keyof FeedbackData, value: number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  }, []);

  const handleIssueToggle = useCallback((issue: string) => {
    setFormData(prev => ({
      ...prev,
      reportIssues: prev.reportIssues.includes(issue)
        ? prev.reportIssues.filter(i => i !== issue)
        : [...prev.reportIssues, issue]
    }));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.overallRating === 0) {
      setError('Please provide an overall rating');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Submit to API or callback
      if (onSubmit) {
        await onSubmit(formData);
      }
      
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof APIError ? err.message : 'Failed to submit feedback');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <Card className={className}>
        <CardContent className="p-6 text-center">
          <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Thank You for Your Feedback!
          </h3>
          <p className="text-gray-600">
            Your rating and feedback help us improve our transcription quality.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Rate This Transcription
        </CardTitle>
        <p className="text-sm text-gray-600">
          Help us improve by rating the quality of this transcription
        </p>
      </CardHeader>
      
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Overall Rating */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Overall Rating *
            </label>
            <StarRating
              value={formData.overallRating}
              onChange={(value) => handleRatingChange('overallRating', value)}
              size="lg"
              showValue
            />
          </div>

          {/* Detailed Ratings */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Accuracy
              </label>
              <StarRating
                value={formData.accuracyRating}
                onChange={(value) => handleRatingChange('accuracyRating', value)}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Processing Speed
              </label>
              <StarRating
                value={formData.speedRating}
                onChange={(value) => handleRatingChange('speedRating', value)}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Usefulness
              </label>
              <StarRating
                value={formData.usefulnessRating}
                onChange={(value) => handleRatingChange('usefulnessRating', value)}
              />
            </div>
          </div>

          {/* Issue Categories */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Report Issues (optional)
            </label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {ISSUE_CATEGORIES.map((issue) => (
                <label key={issue} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.reportIssues.includes(issue)}
                    onChange={() => handleIssueToggle(issue)}
                    className="rounded border-gray-300 text-orange-600 focus:ring-orange-500 mr-2"
                  />
                  <span className="text-sm text-gray-700">{issue}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Written Feedback */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Additional Feedback (optional)
            </label>
            <Textarea
              placeholder="Share your thoughts on the transcription quality, suggestions for improvement, or any other comments..."
              value={formData.feedback}
              onChange={(e) => setFormData(prev => ({ ...prev, feedback: e.target.value }))}
              className="min-h-[100px]"
              maxLength={1000}
            />
            <div className="text-right text-xs text-gray-500 mt-1">
              {formData.feedback.length}/1000
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={isSubmitting || formData.overallRating === 0}
              className="bg-orange-600 hover:bg-orange-700"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Submit Feedback
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default FeedbackRatingSystem;
export { StarRating, RatingDisplay, RatingStats };