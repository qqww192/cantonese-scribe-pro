/**
 * Payment Success Page for CantoneseScribe
 * Shown after successful subscription payment
 */

import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { 
  CheckCircle, 
  Star, 
  CreditCard, 
  ArrowRight,
  FileText,
  Sparkles
} from 'lucide-react';

const PaymentSuccessPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  
  const subscriptionId = searchParams.get('subscription_id');

  useEffect(() => {
    // Check authentication
    if (!isAuthenticated()) {
      navigate('/auth');
      return;
    }

    // Simulate loading time for dramatic effect
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1500);

    return () => clearTimeout(timer);
  }, [isAuthenticated, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="h-16 w-16 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle className="h-8 w-8 text-green-600 animate-pulse" />
            </div>
            <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-2">
              <Sparkles className="h-6 w-6 text-yellow-400 animate-bounce" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Processing Payment...</h2>
          <p className="text-gray-600">Almost there! Setting up your subscription.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Success Header */}
        <div className="text-center mb-12">
          <div className="relative inline-block">
            <div className="h-20 w-20 mx-auto mb-6 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle className="h-12 w-12 text-green-600" />
            </div>
            <div className="absolute -top-2 -right-2">
              <Star className="h-8 w-8 text-yellow-400 fill-current" />
            </div>
          </div>
          
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Welcome to CantoneseScribe Pro! 🎉
          </h1>
          <p className="text-xl text-gray-600 mb-6">
            Your subscription is now active. Start transcribing Cantonese videos with advanced features!
          </p>
          
          <Badge variant="secondary" className="bg-green-100 text-green-800 px-4 py-2">
            <CreditCard className="h-4 w-4 mr-2" />
            Payment Successful
          </Badge>
        </div>

        <div className="grid lg:grid-cols-2 gap-8 mb-12">
          {/* Subscription Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                Your Subscription
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between py-3 border-b">
                <div>
                  <div className="font-medium text-gray-900">CantoneseScribe Pro</div>
                  <div className="text-sm text-gray-500">Monthly subscription</div>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-gray-900">$9.99</div>
                  <div className="text-sm text-gray-500">/month</div>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  500 credits per month
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  All export formats (SRT, VTT, CSV, JSON)
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  Yale + Jyutping romanization
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  Priority processing
                </div>
              </div>
              
              {subscriptionId && (
                <div className="pt-4 border-t">
                  <div className="text-sm text-gray-500">
                    Subscription ID: <code className="text-xs bg-gray-100 px-2 py-1 rounded">{subscriptionId}</code>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Next Steps */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ArrowRight className="h-5 w-5 text-orange-600" />
                What's Next?
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="h-8 w-8 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-semibold text-orange-600">1</span>
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">Start Transcribing</div>
                    <div className="text-sm text-gray-600">Upload your first Cantonese video or paste a YouTube URL</div>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="h-8 w-8 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-semibold text-orange-600">2</span>
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">Explore Features</div>
                    <div className="text-sm text-gray-600">Try different export formats and romanization styles</div>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="h-8 w-8 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-semibold text-orange-600">3</span>
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">Manage Account</div>
                    <div className="text-sm text-gray-600">View usage, billing history, and subscription settings</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Button
            onClick={() => navigate('/process')}
            className="px-8 py-3 text-lg"
          >
            Start Transcribing
            <ArrowRight className="h-5 w-5 ml-2" />
          </Button>
          
          <Button
            variant="outline"
            onClick={() => navigate('/settings')}
            className="px-8 py-3"
          >
            <FileText className="h-4 w-4 mr-2" />
            View Account Settings
          </Button>
        </div>

        {/* Support Information */}
        <div className="mt-12">
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Need help getting started?</strong> Check out our guides or contact support. 
              Your subscription includes priority email support - we're here to help you make the most of CantoneseScribe Pro!
            </AlertDescription>
          </Alert>
        </div>
      </div>
    </div>
  );
};

export default PaymentSuccessPage;