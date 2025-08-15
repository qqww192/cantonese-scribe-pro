/**
 * Simple Pricing Page for CantoneseScribe
 * Simplified version without complex dependencies
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { CheckCircle, Star, Loader2 } from 'lucide-react';

export const PricingPageSimple = () => {
  const [isAnnual, setIsAnnual] = useState(false);
  const [processingPlan, setProcessingPlan] = useState<string | null>(null);
  
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();

  // Static pricing plans
  const plans = [
    {
      id: 'free',
      name: 'Free',
      description: 'Perfect for trying out CantoneseScribe',
      price: 0,
      currency: 'usd',
      billing_period: 'monthly',
      credits_included: 60,
      features: [
        '60 minutes per month',
        'Basic transcription quality',
        'Standard export formats',
        'Community support'
      ],
      popular: false,
      stripe_price_id: 'free'
    },
    {
      id: 'pro',
      name: 'Pro',
      description: 'For serious Cantonese learners and content creators',
      price: 999, // $9.99 in cents
      currency: 'usd',
      billing_period: 'monthly',
      credits_included: 500,
      features: [
        '500 minutes per month',
        'High-quality transcription',
        'All export formats (SRT, VTT, CSV, JSON)',
        'Yale + Jyutping romanization',
        'English translations',
        'Priority processing',
        'Email support'
      ],
      popular: true,
      stripe_price_id: 'price_1RwLYuICypWYw6CLcRdEWa8X'
    }
  ];

  // Handle subscription creation
  const handleSubscribe = async (plan: typeof plans[0]) => {
    if (!isAuthenticated()) {
      // Redirect to login with return URL
      navigate(`/auth?returnTo=${encodeURIComponent(window.location.pathname)}`);
      return;
    }
    
    if (plan.price === 0) {
      // Free plan - redirect to dashboard
      navigate('/process');
      return;
    }
    
    try {
      setProcessingPlan(plan.id);
      
      // For now, simulate creating a subscription
      // In a real implementation, this would call your payment service
      setTimeout(() => {
        // Simulate successful payment setup
        navigate(`/checkout?subscription_id=sub_mock&client_secret=seti_mock_client_secret`);
      }, 1000);
      
    } catch (err) {
      console.error('Failed to create subscription:', err);
      setProcessingPlan(null);
    }
  };
  
  // Format pricing display
  const formatPrice = (plan: typeof plans[0]) => {
    if (plan.price === 0) return 'Free';
    
    const price = isAnnual && plan.billing_period === 'yearly' 
      ? plan.price / 12 
      : plan.price;
    
    return `$${(price / 100).toFixed(2)}`;
  };
  
  // Get button text
  const getButtonText = (plan: typeof plans[0]) => {
    if (plan.price === 0) {
      return 'Start Free';
    }
    
    return 'Subscribe';
  };

  return (
    <div className="min-h-screen bg-gray-50 py-16">
      <div className="max-w-7xl mx-auto px-6">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold text-gray-900 mb-6">
            Choose Your Cantonese Learning Plan
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Transform YouTube videos into interactive Cantonese learning experiences. 
            Plans designed for learners with AI-powered tools and mastery features.
          </p>
          
          {/* Annual/Monthly Toggle */}
          <div className="flex items-center justify-center gap-4 mb-8">
            <span className={`text-sm font-medium ${!isAnnual ? 'text-orange-600' : 'text-gray-500'}`}>
              Monthly
            </span>
            <button
              onClick={() => setIsAnnual(!isAnnual)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                isAnnual ? 'bg-orange-600' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  isAnnual ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
            <span className={`text-sm font-medium ${isAnnual ? 'text-orange-600' : 'text-gray-500'}`}>
              Annual
            </span>
            {isAnnual && (
              <span className="ml-2 inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                Save 20%
              </span>
            )}
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid lg:grid-cols-2 gap-8 mb-16 max-w-4xl mx-auto">
          {plans.map((plan, index) => (
            <Card 
              key={plan.id} 
              className={`relative ${
                plan.popular 
                  ? 'ring-2 ring-orange-500 shadow-lg scale-105' 
                  : ''
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <Badge className="bg-orange-500 text-white">
                    <Star className="h-3 w-3 mr-1" />
                    Most Popular
                  </Badge>
                </div>
              )}
              
              <CardHeader className="text-center pb-4">
                <CardTitle className="text-2xl font-bold text-gray-900 mb-2">
                  {plan.name}
                </CardTitle>
                <p className="text-gray-600 text-sm mb-4">
                  {plan.description}
                </p>
                <div className="text-center">
                  <span className="text-4xl font-bold text-gray-900">
                    {formatPrice(plan)}
                  </span>
                  {plan.price > 0 && (
                    <span className="text-gray-600 ml-1">/month</span>
                  )}
                  {isAnnual && plan.billing_period === 'yearly' && plan.price > 0 && (
                    <div className="text-sm text-gray-500 mt-1">
                      ${(plan.price / 100).toFixed(2)}/year (billed annually)
                    </div>
                  )}
                </div>
                
                {/* Credits included */}
                <div className="mt-4 p-2 bg-gray-50 rounded-lg">
                  <div className="text-lg font-semibold text-gray-900">
                    {plan.credits_included === -1 ? 'Unlimited' : plan.credits_included} Credits
                  </div>
                  <div className="text-xs text-gray-500">per month</div>
                </div>
              </CardHeader>
              
              <CardContent className="pt-0">
                <Button 
                  className="w-full mb-6"
                  variant={plan.price === 0 ? 'outline' : 'default'}
                  disabled={processingPlan === plan.id}
                  onClick={() => handleSubscribe(plan)}
                >
                  {processingPlan === plan.id ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Processing...</>
                  ) : (
                    getButtonText(plan)
                  )}
                </Button>
                
                <ul className="space-y-3">
                  {plan.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-start">
                      <CheckCircle className="flex-shrink-0 w-5 h-5 text-green-500 mt-0.5 mr-3" />
                      <span className="text-sm text-gray-700">{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
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
              <div className="text-3xl font-bold text-orange-500 mb-2">10 min</div>
              <div className="text-gray-600 font-medium">Average Video</div>
              <div className="text-sm text-gray-500 mt-1">uses 10 credits</div>
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
              <h4 className="font-semibold text-gray-900 mb-2">How accurate is the transcription?</h4>
              <p className="text-gray-600 text-sm">Our AI achieves 85%+ accuracy for clear Cantonese speech, with dual romanisation (Yale + Jyutping) included.</p>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">What export formats are available?</h4>
              <p className="text-gray-600 text-sm">All plans include SRT, VTT, TXT, CSV, and JSON formats for maximum compatibility with learning tools and video players.</p>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">Can I cancel anytime?</h4>
              <p className="text-gray-600 text-sm">Yes, cancel anytime. No commitments. Your plan remains active until the end of your billing period.</p>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">Do unused credits expire?</h4>
              <p className="text-gray-600 text-sm">No! Your unused credits roll over month to month, so you never lose what you've paid for.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PricingPageSimple;