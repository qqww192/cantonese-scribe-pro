/**
 * UsageWidget.tsx - Compact sidebar widget for usage tracking
 * Shows current usage status in header/sidebar with minimal space
 */

import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  BarChart3,
  Calendar,
  Zap,
  AlertTriangle,
  CheckCircle,
  Clock,
  TrendingUp,
  ExternalLink,
  ChevronDown,
  CreditCard
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { UsageData, UsageWidgetProps } from '@/types/usage';

const UsageWidget: React.FC<UsageWidgetProps> = ({
  usage,
  compact = true,
  showDetails = false,
  onClick,
  className
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const utilizationRate = (usage.creditsUsed / usage.creditsTotal) * 100;
  const remainingCredits = usage.creditsTotal - usage.creditsUsed;

  const getStatusColor = () => {
    if (usage.isAtLimit) return 'red';
    if (usage.isNearLimit) return 'orange';
    if (utilizationRate >= 60) return 'yellow';
    return 'green';
  };

  const getStatusIcon = () => {
    if (usage.isAtLimit) return AlertTriangle;
    if (usage.isNearLimit) return AlertTriangle;
    return CheckCircle;
  };

  const getStatusText = () => {
    if (usage.isAtLimit) return 'Limit Reached';
    if (usage.isNearLimit) return 'Near Limit';
    if (utilizationRate >= 60) return 'Active';
    return 'Good';
  };

  const getProgressClassName = () => {
    const color = getStatusColor();
    return cn(
      "h-1.5 transition-all",
      color === 'red' && "[&>div]:bg-red-500",
      color === 'orange' && "[&>div]:bg-orange-500",
      color === 'yellow' && "[&>div]:bg-yellow-500",
      color === 'green' && "[&>div]:bg-green-500"
    );
  };

  // Ultra-compact version for minimal space (header)
  if (compact) {
    const StatusIcon = getStatusIcon();
    
    return (
      <div className={cn("relative", className)}>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "h-8 px-2 gap-1.5 text-xs hover:bg-gray-100 relative",
            usage.isAtLimit && "text-red-600 hover:bg-red-50",
            usage.isNearLimit && "text-orange-600 hover:bg-orange-50"
          )}
          onClick={() => {
            if (onClick) {
              onClick();
            } else {
              setIsExpanded(!isExpanded);
            }
          }}
        >
          <BarChart3 className="h-3 w-3" />
          <span className="font-medium">
            {usage.creditsUsed}/{usage.creditsTotal}
          </span>
          {usage.isAtLimit || usage.isNearLimit ? (
            <StatusIcon className="h-3 w-3" />
          ) : null}
          <ChevronDown className={cn(
            "h-3 w-3 opacity-50 transition-transform",
            isExpanded && "rotate-180"
          )} />
        </Button>
        
        {/* Dropdown Panel */}
        {isExpanded && (
          <div className="absolute top-full right-0 mt-1 w-80 z-50">
            <Card className="border shadow-lg">
              <CardContent className="p-4 space-y-3">
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold text-gray-900 text-sm">
                      Usage This Month
                    </h4>
                    <p className="text-xs text-gray-500">
                      Learner Plan
                    </p>
                  </div>
                  <Badge 
                    variant={usage.isAtLimit ? "destructive" : usage.isNearLimit ? "secondary" : "default"}
                    className="text-xs"
                  >
                    {getStatusText()}
                  </Badge>
                </div>

                {/* Progress */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-gray-900">
                      {usage.creditsUsed} / {usage.creditsTotal} credits
                    </span>
                    <span className={cn(
                      "font-medium",
                      usage.isAtLimit && "text-red-600",
                      usage.isNearLimit && "text-orange-600",
                      !usage.isNearLimit && "text-gray-600"
                    )}>
                      {utilizationRate.toFixed(0)}%
                    </span>
                  </div>
                  <Progress value={utilizationRate} className={getProgressClassName()} />
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>{remainingCredits} remaining</span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {usage.daysUntilReset}d until reset
                    </span>
                  </div>
                </div>

                {/* Warning/Alert */}
                {(usage.isAtLimit || usage.isNearLimit) && (
                  <div className={cn(
                    "p-2 rounded-md text-xs",
                    usage.isAtLimit && "bg-red-50 text-red-800",
                    usage.isNearLimit && "bg-orange-50 text-orange-800"
                  )}>
                    <div className="flex items-center gap-1.5">
                      <StatusIcon className="h-3 w-3" />
                      <span className="font-medium">
                        {usage.isAtLimit ? 'Monthly limit reached' : 'Approaching limit'}
                      </span>
                    </div>
                    <div className="mt-1">
                      {usage.isAtLimit 
                        ? `Credits reset on ${usage.resetDate}`
                        : `${remainingCredits} credits remaining`
                      }
                    </div>
                  </div>
                )}

                {/* Quick Stats */}
                <div className="grid grid-cols-2 gap-3 pt-2 border-t">
                  <div className="text-center">
                    <div className="text-lg font-bold text-gray-900">
                      {usage.currentMonth.split(' ')[0]}
                    </div>
                    <div className="text-xs text-gray-500">Current month</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-gray-900">
                      {usage.daysUntilReset}
                    </div>
                    <div className="text-xs text-gray-500">Days to reset</div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-2 border-t">
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="flex-1 text-xs h-7"
                    onClick={() => {
                      setIsExpanded(false);
                      window.location.href = '/usage';
                    }}
                  >
                    <TrendingUp className="h-3 w-3 mr-1" />
                    View Details
                  </Button>
                  {(usage.isAtLimit || usage.isNearLimit) && (
                    <Button 
                      size="sm" 
                      className="flex-1 text-xs h-7"
                      onClick={() => {
                        setIsExpanded(false);
                        window.location.href = '/waitlist';
                      }}
                    >
                      <Zap className="h-3 w-3 mr-1" />
                      Upgrade
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
        
        {/* Backdrop to close dropdown */}
        {isExpanded && (
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsExpanded(false)}
          />
        )}
      </div>
    );
  }

  // Expanded widget version (for dashboard/sidebar)
  return (
    <Card 
      className={cn(
        "cursor-pointer transition-all hover:shadow-md",
        usage.isAtLimit && "border-red-200 bg-red-50",
        usage.isNearLimit && "border-orange-200 bg-orange-50",
        className
      )}
      onClick={onClick}
    >
      <CardContent className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-gray-500" />
            <span className="font-semibold text-gray-900 text-sm">
              Usage
            </span>
          </div>
          <Badge 
            variant={usage.isAtLimit ? "destructive" : usage.isNearLimit ? "secondary" : "default"}
            className="text-xs"
          >
            {getStatusText()}
          </Badge>
        </div>

        {/* Usage Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">
              {usage.creditsUsed} / {usage.creditsTotal}
            </span>
            <span className={cn(
              "text-xs",
              usage.isAtLimit && "text-red-600",
              usage.isNearLimit && "text-orange-600"
            )}>
              {utilizationRate.toFixed(0)}%
            </span>
          </div>
          <Progress value={utilizationRate} className={getProgressClassName()} />
        </div>

        {/* Details */}
        {showDetails && (
          <div className="space-y-2 text-xs text-gray-600">
            <div className="flex items-center justify-between">
              <span>Remaining credits</span>
              <span className="font-medium">{remainingCredits}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Resets in</span>
              <span className="font-medium">{usage.daysUntilReset} days</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Plan</span>
              <span className="font-medium">Learner (Free)</span>
            </div>
          </div>
        )}

        {/* Alert Message */}
        {usage.isAtLimit && (
          <div className="flex items-center gap-2 text-xs text-red-700 bg-red-100 p-2 rounded">
            <AlertTriangle className="h-3 w-3" />
            <span>Monthly limit reached</span>
          </div>
        )}

        {usage.isNearLimit && !usage.isAtLimit && (
          <div className="flex items-center gap-2 text-xs text-orange-700 bg-orange-100 p-2 rounded">
            <AlertTriangle className="h-3 w-3" />
            <span>{remainingCredits} credits remaining</span>
          </div>
        )}

        {/* Quick Action */}
        {(usage.isAtLimit || usage.isNearLimit) && (
          <Button 
            size="sm" 
            className="w-full text-xs h-7"
            onClick={(e) => {
              e.stopPropagation();
              window.location.href = '/waitlist';
            }}
          >
            <Zap className="h-3 w-3 mr-1" />
            Join Pro Waitlist
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

export default UsageWidget;