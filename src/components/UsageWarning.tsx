/**
 * UsageWarning.tsx - Warning notifications for approaching usage limits
 * Shows contextual warnings when users approach their monthly limits
 */

import React, { useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  AlertTriangle,
  Clock,
  Zap,
  X,
  ExternalLink,
  TrendingUp
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { UsageData, UsageAlert } from '@/types/usage';
import { useWaitlist } from '@/services/waitlistService';

interface UsageWarningProps {
  usage: UsageData;
  alert?: UsageAlert;
  className?: string;
  variant?: 'inline' | 'banner' | 'modal' | 'toast';
  showDismiss?: boolean;
  showProgress?: boolean;
  onDismiss?: () => void;
  onActionClick?: (actionUrl?: string) => void;
}

const UsageWarning: React.FC<UsageWarningProps> = ({
  usage,
  alert,
  className,
  variant = 'inline',
  showDismiss = true,
  showProgress = true,
  onDismiss,
  onActionClick
}) => {
  const [isDismissed, setIsDismissed] = useState(false);
  const { trackWaitlistEvent } = useWaitlist();

  if (isDismissed || (!usage.isNearLimit && !usage.isAtLimit)) {
    return null;
  }

  const utilizationRate = (usage.creditsUsed / usage.creditsTotal) * 100;
  const remainingCredits = usage.creditsTotal - usage.creditsUsed;

  const handleDismiss = () => {
    setIsDismissed(true);
    if (onDismiss) {
      onDismiss();
    }
  };

  const handleActionClick = async (actionUrl?: string) => {
    if (usage.isAtLimit || usage.isNearLimit) {
      await trackWaitlistEvent({
        action: 'view_pricing',
        source: 'usage_warning',
        metadata: {
          utilization_rate: utilizationRate,
          remaining_credits: remainingCredits
        }
      });
    }
    
    if (onActionClick) {
      onActionClick(actionUrl);
    } else if (actionUrl) {
      window.location.href = actionUrl;
    }
  };

  const getWarningConfig = () => {
    if (usage.isAtLimit) {
      return {
        title: 'Monthly Limit Reached',
        message: `You've used all ${usage.creditsTotal} credits for ${usage.currentMonth}. Your usage will reset in ${usage.daysUntilReset} days.`,
        variant: 'destructive' as const,
        icon: AlertTriangle,
        actionText: 'Join Pro Waitlist',
        actionUrl: '/waitlist',
        priority: 'high' as const,
        color: 'red'
      };
    } else if (usage.isNearLimit) {
      return {
        title: 'Approaching Monthly Limit',
        message: `You have ${remainingCredits} credit${remainingCredits === 1 ? '' : 's'} remaining until ${usage.resetDate}.`,
        variant: 'default' as const,
        icon: AlertTriangle,
        actionText: 'Upgrade Plan',
        actionUrl: '/pricing',
        priority: 'medium' as const,
        color: 'orange'
      };
    }
    return null;
  };

  const config = getWarningConfig();
  
  if (!config) return null;

  // Use alert config if provided, otherwise use generated config
  const warningConfig = alert || {
    id: 'usage-warning',
    type: usage.isAtLimit ? 'limit_reached' : 'warning',
    title: config.title,
    message: config.message,
    actionText: config.actionText,
    actionUrl: config.actionUrl,
    dismissible: !usage.isAtLimit,
    priority: config.priority
  };

  const getBannerStyles = () => {
    if (variant === 'banner') {
      return cn(
        "border-l-4 rounded-none border-l-current",
        usage.isAtLimit && "bg-red-50 border-red-500 text-red-800",
        usage.isNearLimit && !usage.isAtLimit && "bg-orange-50 border-orange-500 text-orange-800"
      );
    }
    return '';
  };

  const getModalStyles = () => {
    if (variant === 'modal') {
      return "fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4";
    }
    return '';
  };

  const getToastStyles = () => {
    if (variant === 'toast') {
      return cn(
        "fixed top-4 right-4 z-50 min-w-[350px] shadow-lg",
        usage.isAtLimit && "border-red-500",
        usage.isNearLimit && !usage.isAtLimit && "border-orange-500"
      );
    }
    return '';
  };

  if (variant === 'modal') {
    return (
      <div className={getModalStyles()}>
        <div className="bg-white rounded-lg p-6 max-w-md w-full space-y-4">
          <div className="flex items-start gap-3">
            <config.icon className={cn(
              "h-6 w-6 mt-0.5",
              usage.isAtLimit && "text-red-500",
              usage.isNearLimit && !usage.isAtLimit && "text-orange-500"
            )} />
            <div className="flex-1 space-y-2">
              <h3 className="font-semibold text-gray-900">
                {warningConfig.title}
              </h3>
              <p className="text-sm text-gray-600">
                {warningConfig.message}
              </p>
            </div>
          </div>

          {showProgress && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Usage this month</span>
                <span className="font-medium">
                  {usage.creditsUsed} / {usage.creditsTotal}
                </span>
              </div>
              <Progress 
                value={utilizationRate}
                className={cn(
                  "h-2",
                  usage.isAtLimit && "[&>div]:bg-red-500",
                  usage.isNearLimit && !usage.isAtLimit && "[&>div]:bg-orange-500"
                )}
              />
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>{remainingCredits} credits remaining</span>
                <span>Resets in {usage.daysUntilReset} days</span>
              </div>
            </div>
          )}

          <div className="flex items-center gap-3">
            {warningConfig.actionText && (
              <Button 
                onClick={() => handleActionClick(warningConfig.actionUrl)}
                className={cn(
                  usage.isAtLimit && "bg-red-600 hover:bg-red-700",
                  usage.isNearLimit && !usage.isAtLimit && "bg-orange-600 hover:bg-orange-700"
                )}
              >
                {warningConfig.actionText}
                <ExternalLink className="h-4 w-4 ml-2" />
              </Button>
            )}
            {warningConfig.dismissible && (
              <Button 
                variant="outline" 
                onClick={handleDismiss}
              >
                Dismiss
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <Alert 
      variant={config.variant}
      className={cn(
        className,
        getBannerStyles(),
        getToastStyles(),
        variant === 'toast' && "animate-in slide-in-from-right-full duration-300"
      )}
    >
      <config.icon className="h-4 w-4" />
      <AlertDescription className="flex items-start justify-between gap-4">
        <div className="flex-1 space-y-2">
          <div className="font-semibold">
            {warningConfig.title}
          </div>
          <div className="text-sm">
            {warningConfig.message}
          </div>

          {showProgress && (
            <div className="space-y-2 mt-3">
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <Progress 
                    value={utilizationRate}
                    className="h-1.5"
                  />
                </div>
                <span className="text-xs text-muted-foreground">
                  {utilizationRate.toFixed(0)}%
                </span>
              </div>
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" />
                  {usage.creditsUsed} / {usage.creditsTotal} used
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Resets in {usage.daysUntilReset} days
                </span>
              </div>
            </div>
          )}

          {variant === 'inline' && (
            <div className="flex items-center gap-2 mt-3">
              {warningConfig.actionText && (
                <Button 
                  size="sm"
                  onClick={() => handleActionClick(warningConfig.actionUrl)}
                  className="h-8"
                >
                  <Zap className="h-3 w-3 mr-1" />
                  {warningConfig.actionText}
                </Button>
              )}
              {warningConfig.dismissible && showDismiss && (
                <Button 
                  size="sm" 
                  variant="ghost"
                  onClick={handleDismiss}
                  className="h-8 w-8 p-0"
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
          )}
        </div>

        {variant === 'banner' && (
          <div className="flex items-center gap-2">
            {warningConfig.actionText && (
              <Button 
                size="sm"
                variant="outline"
                onClick={() => handleActionClick(warningConfig.actionUrl)}
                className="shrink-0"
              >
                {warningConfig.actionText}
              </Button>
            )}
            {warningConfig.dismissible && showDismiss && (
              <Button 
                size="sm" 
                variant="ghost"
                onClick={handleDismiss}
                className="shrink-0 w-8 h-8 p-0"
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
        )}
      </AlertDescription>
    </Alert>
  );
};

export default UsageWarning;