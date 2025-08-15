/**
 * LimitReachedScreen.tsx - Blocking screen when users reach their limits
 * Prevents further processing and guides users to upgrade options
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import {
  Ban,
  Clock,
  Calendar,
  Zap,
  Star,
  CheckCircle,
  ArrowUpRight,
  RefreshCw,
  AlertTriangle,
  Gift,
  TrendingUp,
  Users,
  ExternalLink
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { UsageData, UsagePlan } from '@/types/usage';
import { useUsageMockData } from '@/services/usageMockData';
import { useWaitlist } from '@/services/waitlistService';
import WaitlistPrompt from './WaitlistPrompt';

interface LimitReachedScreenProps {
  usage: UsageData;
  className?: string;
  onRefresh?: () => void;
  allowOverride?: boolean;
  showPlans?: boolean;
  showWaitlist?: boolean;
}

const LimitReachedScreen: React.FC<LimitReachedScreenProps> = ({
  usage,
  className,
  onRefresh,
  allowOverride = false,
  showPlans = true,
  showWaitlist = true
}) => {
  const [plans, setPlans] = useState<UsagePlan[]>([]);
  const [showWaitlistPrompt, setShowWaitlistPrompt] = useState(false);
  const [timeUntilReset, setTimeUntilReset] = useState<string>('');
  
  const mockData = useUsageMockData();
  const { trackWaitlistEvent, signupForWaitlist } = useWaitlist();

  useEffect(() => {
    if (showPlans) {
      const availablePlans = mockData.generateUsagePlans('learner');
      setPlans(availablePlans.filter(plan => !plan.isCurrentPlan));
    }
  }, [showPlans, mockData]);

  useEffect(() => {
    // Update countdown timer
    const updateCountdown = () => {
      const now = new Date();
      const resetDate = new Date(usage.resetDate);
      const timeDiff = resetDate.getTime() - now.getTime();
      
      if (timeDiff > 0) {
        const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
        
        if (days > 0) {
          setTimeUntilReset(`${days}d ${hours}h ${minutes}m`);
        } else if (hours > 0) {
          setTimeUntilReset(`${hours}h ${minutes}m`);
        } else {
          setTimeUntilReset(`${minutes}m`);
        }
      } else {
        setTimeUntilReset('Resetting...');
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [usage.resetDate]);

  const handleWaitlistSignup = async () => {
    try {
      await signupForWaitlist({
        email: 'user@example.com', // This would come from auth context
        plan_id: 'learner_pro',
        source: 'limit_reached',
        metadata: {
          blocked_at: new Date().toISOString(),
          usage_data: {
            credits_used: usage.creditsUsed,
            credits_total: usage.creditsTotal
          }
        }
      });

      await trackWaitlistEvent({
        action: 'signup',
        plan_id: 'learner_pro',
        source: 'limit_reached'
      });

      setShowWaitlistPrompt(true);
    } catch (error) {
      console.error('Failed to sign up for waitlist:', error);
    }
  };

  const handlePlanClick = async (planId: string) => {
    await trackWaitlistEvent({
      action: 'view_pricing',
      plan_id: planId,
      source: 'limit_reached'
    });
    
    await handleWaitlistSignup();
  };

  if (showWaitlistPrompt) {
    return (
      <WaitlistPrompt
        source="limit_reached"
        onClose={() => setShowWaitlistPrompt(false)}
        className={className}
      />
    );
  }

  return (
    <div className={cn("min-h-[600px] flex items-center justify-center p-4", className)}>
      <div className="max-w-4xl w-full space-y-6">
        {/* Main Blocking Message */}
        <Card className="border-red-200 bg-red-50">
          <CardHeader className="text-center pb-4">
            <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <Ban className="h-8 w-8 text-red-600" />
            </div>
            <CardTitle className="text-2xl text-red-900">
              Monthly Limit Reached
            </CardTitle>
            <CardDescription className="text-red-700">
              You've used all {usage.creditsTotal} transcription credits for {usage.currentMonth}
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <div className="bg-white rounded-lg p-4">
              <Progress value={100} className="h-3 mb-3 [&>div]:bg-red-500" />
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">
                  {usage.creditsUsed} / {usage.creditsTotal} credits used
                </span>
                <Badge variant="destructive">100%</Badge>
              </div>
            </div>

            <div className="flex items-center justify-center gap-6 text-sm text-red-700">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span>Resets in {timeUntilReset}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span>{usage.resetDate}</span>
              </div>
            </div>

            <Alert className="border-orange-200 bg-orange-50">
              <AlertTriangle className="h-4 w-4 text-orange-600" />
              <AlertDescription className="text-orange-800">
                <div className="font-semibold">Need more credits?</div>
                <div className="text-sm mt-1">
                  Join our Pro waitlist to get early access to unlimited transcriptions and premium features.
                </div>
              </AlertDescription>
            </Alert>

            <div className="flex items-center justify-center gap-3">
              <Button 
                onClick={handleWaitlistSignup}
                className="bg-orange-600 hover:bg-orange-700"
              >
                <Zap className="h-4 w-4 mr-2" />
                Join Pro Waitlist
              </Button>
              {onRefresh && (
                <Button variant="outline" onClick={onRefresh}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Check Again
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Upgrade Options */}
        {showPlans && plans.length > 0 && (
          <Card>
            <CardHeader className="text-center">
              <CardTitle className="flex items-center justify-center gap-2">
                <Star className="h-5 w-5 text-yellow-500" />
                Unlock More with Pro Plans
              </CardTitle>
              <CardDescription>
                Get early access to premium features and higher limits
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {plans.slice(0, 2).map(plan => (
                  <div 
                    key={plan.id}
                    className={cn(
                      "relative p-4 border-2 rounded-lg cursor-pointer transition-all hover:shadow-md",
                      plan.isRecommended ? "border-green-500 bg-green-50" : "border-gray-200 hover:border-orange-300"
                    )}
                    onClick={() => handlePlanClick(plan.id)}
                  >
                    {plan.isRecommended && (
                      <Badge className="absolute -top-2 left-4 bg-green-500">
                        Most Popular
                      </Badge>
                    )}
                    
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {plan.name}
                        </h3>
                        <div className="text-right">
                          <div className="text-2xl font-bold">
                            ${plan.pricePerMonth}
                          </div>
                          <div className="text-sm text-gray-500">/month</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-green-500" />
                        <span className="font-medium text-green-700">
                          {plan.creditsPerMonth} credits/month
                        </span>
                      </div>

                      <ul className="space-y-1">
                        {plan.features.slice(0, 4).map(feature => (
                          <li key={feature} className="text-sm text-gray-600 flex items-start gap-2">
                            <CheckCircle className="h-3 w-3 text-green-500 mt-0.5 shrink-0" />
                            {feature}
                          </li>
                        ))}
                      </ul>

                      <Button 
                        className="w-full"
                        variant={plan.isRecommended ? "default" : "outline"}
                        onClick={() => handlePlanClick(plan.id)}
                      >
                        <ArrowUpRight className="h-4 w-4 mr-2" />
                        Join Waitlist
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <div className="flex items-start gap-3">
                  <Gift className="h-5 w-5 text-orange-500 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-1">
                      Early Access Benefits
                    </h4>
                    <ul className="text-sm text-gray-600 space-y-1">
                      <li>• Be among the first to try Pro features</li>
                      <li>• Special launch pricing discount</li>
                      <li>• Priority customer support</li>
                      <li>• Influence feature development</li>
                    </ul>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Alternative Solutions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              What can you do now?
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center shrink-0">
                  <Calendar className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-1">
                    Wait for Reset
                  </h4>
                  <p className="text-sm text-gray-600">
                    Your credits will automatically reset on {usage.resetDate}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center shrink-0">
                  <Zap className="h-4 w-4 text-orange-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-1">
                    Join Pro Waitlist
                  </h4>
                  <p className="text-sm text-gray-600">
                    Get early access to unlimited transcriptions
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center shrink-0">
                  <Users className="h-4 w-4 text-green-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-1">
                    Share & Earn
                  </h4>
                  <p className="text-sm text-gray-600">
                    Refer friends to earn bonus credits
                  </p>
                </div>
              </div>
            </div>

            <Separator className="my-4" />

            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Questions about usage limits?
              </div>
              <Button variant="outline" size="sm">
                <ExternalLink className="h-3 w-3 mr-1" />
                Help Center
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Override Option (if allowed) */}
        {allowOverride && (
          <Card className="border-yellow-200 bg-yellow-50">
            <CardContent className="p-4">
              <Alert className="border-yellow-300 bg-yellow-100">
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                <AlertDescription className="text-yellow-800">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold">One-time override available</div>
                      <div className="text-sm">You can process one more file, but accuracy may be reduced.</div>
                    </div>
                    <Button size="sm" variant="outline" className="border-yellow-600 text-yellow-800 hover:bg-yellow-200">
                      Use Override
                    </Button>
                  </div>
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default LimitReachedScreen;