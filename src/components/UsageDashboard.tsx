/**
 * UsageDashboard.tsx - Comprehensive usage tracking dashboard
 * Shows detailed usage statistics, history, and plan management
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import {
  BarChart3,
  Calendar,
  Clock,
  CreditCard,
  FileText,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Zap,
  Star,
  ArrowUpRight,
  RefreshCw
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUsageMockData } from '@/services/usageMockData';
import { useWaitlist } from '@/services/waitlistService';
import { UsageData, UsageHistory, UsageStats, UsageAlert, UsagePlan } from '@/types/usage';

interface UsageDashboardProps {
  className?: string;
  showUpgradePrompt?: boolean;
  onUpgradeClick?: () => void;
}

const UsageDashboard: React.FC<UsageDashboardProps> = ({
  className,
  showUpgradePrompt = true,
  onUpgradeClick
}) => {
  const [usageData, setUsageData] = useState<UsageData | null>(null);
  const [usageHistory, setUsageHistory] = useState<UsageHistory[]>([]);
  const [usageStats, setUsageStats] = useState<UsageStats | null>(null);
  const [alerts, setAlerts] = useState<UsageAlert[]>([]);
  const [plans, setPlans] = useState<UsagePlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set());

  const mockData = useUsageMockData();
  const { signupForWaitlist, trackWaitlistEvent } = useWaitlist();

  useEffect(() => {
    loadUsageData();
  }, []);

  const loadUsageData = async () => {
    setIsLoading(true);
    try {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const usage = mockData.generateUsageData();
      const history = mockData.generateUsageHistory(6);
      const stats = mockData.generateUsageStats();
      const usageAlerts = mockData.generateUsageAlerts(usage);
      const usagePlans = mockData.generateUsagePlans('learner');

      setUsageData(usage);
      setUsageHistory(history);
      setUsageStats(stats);
      setAlerts(usageAlerts);
      setPlans(usagePlans);
    } catch (error) {
      console.error('Failed to load usage data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const dismissAlert = (alertId: string) => {
    setDismissedAlerts(prev => new Set(prev).add(alertId));
  };

  const getUsageColor = (utilizationRate: number) => {
    if (utilizationRate >= 100) return 'text-red-600';
    if (utilizationRate >= 80) return 'text-orange-600';
    if (utilizationRate >= 60) return 'text-yellow-600';
    return 'text-green-600';
  };

  const getProgressColor = (utilizationRate: number) => {
    if (utilizationRate >= 100) return 'bg-red-500';
    if (utilizationRate >= 80) return 'bg-orange-500';
    if (utilizationRate >= 60) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const handleWaitlistSignup = async () => {
    try {
      await signupForWaitlist({
        email: 'user@example.com', // This would come from auth context
        plan_id: 'learner_pro',
        source: 'usage_dashboard',
        metadata: {
          current_usage: usageData?.creditsUsed,
          usage_limit: usageData?.creditsTotal
        }
      });
      
      await trackWaitlistEvent({
        action: 'signup',
        plan_id: 'learner_pro',
        source: 'usage_dashboard'
      });

      if (onUpgradeClick) {
        onUpgradeClick();
      }
    } catch (error) {
      console.error('Failed to sign up for waitlist:', error);
    }
  };

  if (isLoading) {
    return (
      <div className={cn("space-y-6", className)}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-8 bg-gray-200 rounded w-1/2 mb-4"></div>
                  <div className="h-2 bg-gray-200 rounded"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!usageData) {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Unable to load usage data. Please try again later.
        </AlertDescription>
      </Alert>
    );
  }

  const utilizationRate = (usageData.creditsUsed / usageData.creditsTotal) * 100;
  const remainingCredits = usageData.creditsTotal - usageData.creditsUsed;

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Usage Dashboard</h2>
          <p className="text-gray-600">Track your transcription usage and plan details</p>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={loadUsageData}
          className="flex items-center gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Alerts */}
      {alerts.filter(alert => !dismissedAlerts.has(alert.id)).map(alert => (
        <Alert 
          key={alert.id}
          variant={alert.type === 'limit_reached' ? 'destructive' : 'default'}
          className={cn(
            alert.priority === 'high' && 'border-red-500 bg-red-50',
            alert.priority === 'medium' && 'border-orange-500 bg-orange-50'
          )}
        >
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <div>
              <div className="font-semibold">{alert.title}</div>
              <div className="text-sm">{alert.message}</div>
            </div>
            <div className="flex items-center gap-2">
              {alert.actionText && alert.actionUrl && (
                <Button 
                  size="sm" 
                  variant={alert.type === 'limit_reached' ? 'default' : 'outline'}
                  onClick={() => window.location.href = alert.actionUrl!}
                >
                  {alert.actionText}
                </Button>
              )}
              {alert.dismissible && (
                <Button 
                  size="sm" 
                  variant="ghost" 
                  onClick={() => dismissAlert(alert.id)}
                >
                  ×
                </Button>
              )}
            </div>
          </AlertDescription>
        </Alert>
      ))}

      {/* Usage Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Current Usage */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="h-5 w-5 text-orange-500" />
              Current Usage
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-baseline justify-between">
                <span className="text-3xl font-bold text-gray-900">
                  {usageData.creditsUsed}
                </span>
                <span className="text-lg text-gray-500">
                  / {usageData.creditsTotal}
                </span>
              </div>
              
              <Progress 
                value={utilizationRate} 
                className={cn(
                  "h-2",
                  "[&>div]:transition-all",
                  utilizationRate >= 100 && "[&>div]:bg-red-500",
                  utilizationRate >= 80 && utilizationRate < 100 && "[&>div]:bg-orange-500",
                  utilizationRate >= 60 && utilizationRate < 80 && "[&>div]:bg-yellow-500",
                  utilizationRate < 60 && "[&>div]:bg-green-500"
                )}
              />
              
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">
                  {remainingCredits} credits remaining
                </span>
                <span className={getUsageColor(utilizationRate)}>
                  {utilizationRate.toFixed(0)}%
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Reset Info */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Calendar className="h-5 w-5 text-blue-500" />
              Next Reset
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-2xl font-bold text-gray-900">
                {usageData.daysUntilReset}
              </div>
              <div className="text-sm text-gray-600">
                days remaining
              </div>
              <div className="text-sm text-gray-500">
                Resets on {usageData.resetDate}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Current Plan */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <CreditCard className="h-5 w-5 text-green-500" />
              Current Plan
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Badge variant="secondary" className="text-sm font-medium">
                Learner (Free)
              </Badge>
              <div className="text-sm text-gray-600">
                30 credits/month
              </div>
              {showUpgradePrompt && (
                <Button 
                  size="sm" 
                  className="w-full mt-2"
                  onClick={handleWaitlistSignup}
                >
                  <Zap className="h-4 w-4 mr-1" />
                  Join Waitlist
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Usage Statistics */}
      {usageStats && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Usage Statistics
            </CardTitle>
            <CardDescription>
              Your transcription activity summary
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">
                  {usageStats.totalTranscriptions}
                </div>
                <div className="text-sm text-gray-600">
                  Total Transcriptions
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">
                  {usageStats.totalMinutesProcessed}
                </div>
                <div className="text-sm text-gray-600">
                  Minutes Processed
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">
                  {usageStats.averageAccuracy}%
                </div>
                <div className="text-sm text-gray-600">
                  Average Accuracy
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">
                  {usageStats.favoriteFormat}
                </div>
                <div className="text-sm text-gray-600">
                  Favorite Format
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Usage History Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Usage History
          </CardTitle>
          <CardDescription>
            Monthly credit usage over the last 6 months
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {usageHistory.map((month, index) => (
              <div key={month.month} className="flex items-center gap-4">
                <div className="w-16 text-sm text-gray-600">
                  {month.month}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium">
                      {month.creditsUsed} / {month.creditsTotal}
                    </span>
                    <span className="text-sm text-gray-500">
                      {month.utilizationRate.toFixed(0)}%
                    </span>
                  </div>
                  <Progress 
                    value={month.utilizationRate} 
                    className="h-2"
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Available Plans */}
      {showUpgradePrompt && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="h-5 w-5" />
              Available Plans
            </CardTitle>
            <CardDescription>
              Upgrade your plan for more features and credits
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {plans.map(plan => (
                <div 
                  key={plan.id}
                  className={cn(
                    "relative p-4 border rounded-lg",
                    plan.isCurrentPlan && "border-orange-500 bg-orange-50",
                    plan.isRecommended && !plan.isCurrentPlan && "border-green-500 bg-green-50"
                  )}
                >
                  {plan.isRecommended && (
                    <Badge className="absolute -top-2 left-4 bg-green-500">
                      Recommended
                    </Badge>
                  )}
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold">{plan.name}</h3>
                      {plan.isCurrentPlan && (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      )}
                    </div>
                    
                    <div className="text-2xl font-bold">
                      {plan.pricePerMonth === 0 ? 'Free' : `$${plan.pricePerMonth}`}
                      {plan.pricePerMonth > 0 && (
                        <span className="text-sm text-gray-500">/month</span>
                      )}
                    </div>
                    
                    <div className="text-sm text-gray-600">
                      {plan.creditsPerMonth} credits/month
                    </div>
                    
                    <ul className="space-y-1">
                      {plan.features.slice(0, 3).map(feature => (
                        <li key={feature} className="text-sm text-gray-600 flex items-center gap-1">
                          <CheckCircle className="h-3 w-3 text-green-500" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                    
                    {!plan.isCurrentPlan && (
                      <Button 
                        className="w-full" 
                        variant={plan.isRecommended ? 'default' : 'outline'}
                        onClick={handleWaitlistSignup}
                      >
                        <ArrowUpRight className="h-4 w-4 mr-1" />
                        Join Waitlist
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default UsageDashboard;