/**
 * MVP Pricing Page for CantoneseScribe
 * Focuses on free tier with Pro waitlist signup
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { useWaitlist } from '@/services/waitlistService';
import { 
  CheckCircle, 
  Star, 
  Bell, 
  Mail,
  Clock,
  Sparkles,
  Users,
  Loader2
} from 'lucide-react';

export const PricingPageMVP = () => {
  const [waitlistEmail, setWaitlistEmail] = useState('');
  const [waitlistLoading, setWaitlistLoading] = useState(false);
  const [waitlistSuccess, setWaitlistSuccess] = useState(false);
  
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const { signupForWaitlist, trackWaitlistEvent } = useWaitlist();

  // MVP Pricing plans - Free only with Pro coming soon
  const plans = [
    {
      id: 'free',
      name: 'Free',
      description: 'Perfect for getting started with Cantonese transcription',
      price: 0,
      currency: 'usd',
      credits_included: 30, // Reduced from 60 based on PM recommendation
      features: [
        '30 minutes per month',
        'All export formats (SRT, VTT, CSV, JSON)',
        'Yale + Jyutping romanization',
        'English translations',
        '90-day history retention',
        'Community support'
      ],
      available: true,
      popular: false
    },
    {
      id: 'pro',
      name: 'Pro',
      description: 'For serious learners and content creators',
      price: 999, // $9.99 shown as "launch pricing"
      currency: 'usd',
      credits_included: 500,
      features: [
        '500 minutes per month',
        'Priority processing (2x faster)',
        'Unlimited file size',
        'Advanced accuracy settings',
        'Bulk export features',
        'Unlimited history retention',
        'Email support',
        'Early access to new features'
      ],
      available: false,
      popular: true,
      comingSoon: true,
      earlyBirdDiscount: '50% off for early adopters'
    }
  ];

  // Handle free plan signup
  const handleFreePlan = () => {
    if (!isAuthenticated()) {
      navigate(`/auth?returnTo=${encodeURIComponent('/process')}`);
      return;
    }
    navigate('/process');
  };

  // Handle Pro waitlist signup
  const handleWaitlistSignup = async (planId: string) => {
    setWaitlistLoading(true);
    
    try {
      // Use current user email if authenticated, otherwise use form email
      const email = isAuthenticated() && user?.email ? user.email : waitlistEmail;
      
      if (!email) {
        alert('Please enter your email address');
        setWaitlistLoading(false);
        return;
      }

      // Sign up for waitlist
      const result = await signupForWaitlist({
        email,
        plan_id: planId,
        source: 'pricing_page',
        user_id: user?.id,
        metadata: {
          current_plan: 'free',
          signup_source: 'pricing_cta'
        }
      });
      
      if (result.success) {
        setWaitlistSuccess(true);
        setWaitlistEmail('');
        
        // Track successful signup
        await trackWaitlistEvent({
          action: 'signup',
          plan_id: planId,
          source: 'pricing_page'
        });
      }
      
    } catch (error) {
      console.error('Waitlist signup failed:', error);
      alert('Failed to join waitlist. Please try again.');
    } finally {
      setWaitlistLoading(false);
    }
  };

  const freePlan = plans.find(p => p.id === 'free')!;
  const proPlan = plans.find(p => p.id === 'pro')!;

  return (
    <div className="min-h-screen bg-gray-50 py-16">
      <div className="max-w-7xl mx-auto px-6">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold text-gray-900 mb-6">
            Start Your Cantonese Learning Journey
          </h1>
          <p className="text-xl text-gray-600 mb-4 max-w-3xl mx-auto">
            Transform YouTube videos into interactive Cantonese learning experiences. 
            Start free, upgrade when you're ready for more.
          </p>
          
          {/* MVP Notice */}
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-orange-100 text-orange-800 rounded-full text-sm font-medium">
            <Sparkles className="h-4 w-4" />
            Free launch - Pro features coming Q2 2025
          </div>
        </div>

        {/* Success notification */}
        {waitlistSuccess && (
          <Alert className="mb-8 max-w-2xl mx-auto bg-green-50 border-green-200">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              🎉 You're on the waitlist! We'll notify you when Pro features launch with exclusive early bird pricing.
            </AlertDescription>
          </Alert>
        )}

        {/* Pricing Cards */}
        <div className="grid lg:grid-cols-2 gap-8 mb-16 max-w-4xl mx-auto">
          {/* Free Plan */}
          <Card>
            <CardHeader className="text-center pb-4">
              <CardTitle className="text-2xl font-bold text-gray-900 mb-2">
                {freePlan.name}
              </CardTitle>
              <p className="text-gray-600 text-sm mb-4">
                {freePlan.description}
              </p>
              <div className="text-center">
                <span className="text-4xl font-bold text-gray-900">Free</span>
              </div>
              
              {/* Credits included */}
              <div className="mt-4 p-2 bg-gray-50 rounded-lg">
                <div className="text-lg font-semibold text-gray-900">
                  {freePlan.credits_included} Credits
                </div>
                <div className="text-xs text-gray-500">per month</div>
              </div>
            </CardHeader>
            
            <CardContent className="pt-0">
              <Button 
                className="w-full mb-6"
                onClick={handleFreePlan}
              >
                Start Free Now
              </Button>
              
              <ul className="space-y-3">
                {freePlan.features.map((feature, index) => (
                  <li key={index} className="flex items-start">
                    <CheckCircle className="flex-shrink-0 w-5 h-5 text-green-500 mt-0.5 mr-3" />
                    <span className="text-sm text-gray-700">{feature}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Pro Plan - Coming Soon */}
          <Card className="relative ring-2 ring-orange-500 shadow-lg scale-105">
            <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
              <Badge className="bg-orange-500 text-white">
                <Star className="h-3 w-3 mr-1" />
                Most Popular
              </Badge>
            </div>

            <div className="absolute -top-2 -right-2">
              <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                <Clock className="h-3 w-3 mr-1" />
                Coming Soon
              </Badge>
            </div>
            
            <CardHeader className="text-center pb-4">
              <CardTitle className="text-2xl font-bold text-gray-900 mb-2">
                {proPlan.name}
              </CardTitle>
              <p className="text-gray-600 text-sm mb-4">
                {proPlan.description}
              </p>
              <div className="text-center">
                <span className="text-4xl font-bold text-gray-900">
                  $9.99
                </span>
                <span className="text-gray-600 ml-1">/month</span>
                <div className="text-sm text-blue-600 mt-1 font-medium">
                  Launch Pricing
                </div>
                {proPlan.earlyBirdDiscount && (
                  <div className="text-xs text-green-600 font-medium">
                    {proPlan.earlyBirdDiscount}
                  </div>
                )}
              </div>
              
              {/* Credits included */}
              <div className="mt-4 p-2 bg-orange-50 rounded-lg">
                <div className="text-lg font-semibold text-gray-900">
                  {proPlan.credits_included} Credits
                </div>
                <div className="text-xs text-gray-500">per month</div>
              </div>
            </CardHeader>
            
            <CardContent className="pt-0">
              {/* Waitlist signup form */}
              <div className="space-y-4 mb-6">
                {!isAuthenticated() && (
                  <Input
                    type="email"
                    placeholder="Enter your email"
                    value={waitlistEmail}
                    onChange={(e) => setWaitlistEmail(e.target.value)}
                    className="w-full"
                  />
                )}
                
                <Button 
                  className="w-full bg-orange-600 hover:bg-orange-700"
                  onClick={() => handleWaitlistSignup('pro')}
                  disabled={waitlistLoading || waitlistSuccess}
                >
                  {waitlistLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Joining Waitlist...
                    </>
                  ) : waitlistSuccess ? (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      You're on the List!
                    </>
                  ) : (
                    <>
                      <Bell className="h-4 w-4 mr-2" />
                      Notify Me When Available
                    </>
                  )}
                </Button>
              </div>
              
              <ul className="space-y-3">
                {proPlan.features.map((feature, index) => (
                  <li key={index} className="flex items-start">
                    <CheckCircle className="flex-shrink-0 w-5 h-5 text-orange-500 mt-0.5 mr-3" />
                    <span className="text-sm text-gray-700">{feature}</span>
                  </li>
                ))}
              </ul>

              {/* Waitlist benefits */}
              <div className="mt-6 p-3 bg-blue-50 rounded-lg">
                <div className="flex items-center gap-2 text-blue-800 font-medium text-sm mb-2">
                  <Mail className="h-4 w-4" />
                  Waitlist Benefits
                </div>
                <ul className="text-xs text-blue-700 space-y-1">
                  <li>• 50% early bird discount</li>
                  <li>• 7-day free trial when launched</li>
                  <li>• Priority access to new features</li>
                  <li>• Exclusive Cantonese learning resources</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Social proof and timeline */}
        <div className="text-center mb-16">
          <div className="flex items-center justify-center gap-6 text-sm text-gray-600 mb-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span>Join 500+ on the waitlist</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span>Expected launch: Q2 2025</span>
            </div>
          </div>
        </div>

        {/* Credits Information */}
        <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-200 mb-16">
          <h3 className="text-xl font-bold text-gray-900 mb-6 text-center">
            How Credits Work
          </h3>
          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            <div className="text-center">
              <div className="text-3xl font-bold text-orange-500 mb-2">1 Credit</div>
              <div className="text-gray-600 font-medium">Per Minute</div>
              <div className="text-sm text-gray-500 mt-1">of audio/video processed</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-orange-500 mb-2">3-4 Videos</div>
              <div className="text-gray-600 font-medium">With Free Plan</div>
              <div className="text-sm text-gray-500 mt-1">typical 7-10 minute videos</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-orange-500 mb-2">No Expiry</div>
              <div className="text-gray-600 font-medium">Credits Roll Over</div>
              <div className="text-sm text-gray-500 mt-1">unused credits carry forward</div>
            </div>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-200">
          <h3 className="text-xl font-bold text-gray-900 mb-6 text-center">
            Frequently Asked Questions
          </h3>
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">Is the free plan really free?</h4>
              <p className="text-gray-600 text-sm">Yes! 30 minutes of transcription every month, completely free. No credit card required.</p>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">When will Pro features be available?</h4>
              <p className="text-gray-600 text-sm">We're targeting Q2 2025. Waitlist members get early access and 50% launch discount.</p>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">What happens if I exceed my free limit?</h4>
              <p className="text-gray-600 text-sm">You'll be notified when you're close to your limit. Additional processing will be available with Pro launch.</p>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">How accurate is the transcription?</h4>
              <p className="text-gray-600 text-sm">Our AI achieves 85%+ accuracy for clear Cantonese speech, with continuous improvements based on user feedback.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PricingPageMVP;