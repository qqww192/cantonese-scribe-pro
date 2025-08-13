// src/components/PricingPage.tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const PricingPage = () => {
  const [isAnnual, setIsAnnual] = useState(false);
  const navigate = useNavigate();

  const plans = [
    {
      name: "Free",
      description: "Perfect for trying out CantoneseScribe",
      monthlyPrice: 0,
      annualPrice: 0,
      videoLimit: "3 videos per month",
      videoLength: "Up to 10 minutes each",
      romanization: "Chinese + Yale OR Jyutping",
      exports: "Basic TXT format",
      processing: "Standard processing",
      support: "No support",
      features: [
        "3 YouTube videos per month",
        "10 minutes max per video", 
        "Basic subtitle (choose Yale or Jyutping or Chinese)",
        "English included",
        "TXT export only",
      ],
      buttonText: "Start Free",
      buttonStyle: "outline",
      popular: false
    },
    {
      name: "Learner Pro",
      description: "For serious Cantonese learners",
      monthlyPrice: 9.99,
      annualPrice: 79.99,
      videoLimit: "25 videos per month",
      videoLength: "Up to 1 hour each",
      romanization: "Chinese + Yale + Jyutping (all formats)",
      exports: "SRT, VTT, TXT, CSV formats",
      processing: "Priority processing",
      support: "Email support",
      features: [
        "25 YouTube videos per month",
        "Up to 1 hour per video",
        "Dual romanisation (Yale + Jyutping + Chinese + English)",
        "All export formats (SRT, VTT, TXT, CSV)",
        "Priority processing (3x faster)"
      ],
      buttonText: "Start Learning",
      buttonStyle: "default",
      popular: true
    }
  ];

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
              key={plan.name} 
              className={`relative ${plan.popular ? 'ring-2 ring-orange-500 shadow-lg scale-105' : ''}`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <span className="bg-orange-500 text-white px-4 py-1 rounded-full text-sm font-medium">
                    Most Popular
                  </span>
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
                    £{plan.monthlyPrice === 0 ? '0' : (isAnnual ? (plan.annualPrice / 12).toFixed(2) : plan.monthlyPrice)}
                  </span>
                  <span className="text-gray-600 ml-1">
                    /{isAnnual ? 'month' : 'month'}
                  </span>
                  {isAnnual && plan.annualPrice > 0 && (
                    <div className="text-sm text-gray-500 mt-1">
                      £{plan.annualPrice}/year (billed annually)
                    </div>
                  )}
                </div>
              </CardHeader>
              
              <CardContent className="pt-0">
                <Button 
                  className={`w-full mb-6 ${
                    plan.buttonStyle === 'outline' 
                      ? 'border-orange-500 text-orange-500 hover:bg-orange-50' 
                      : 'bg-orange-500 hover:bg-orange-600 text-white'
                  }`}
                  variant={plan.buttonStyle === 'outline' ? 'outline' : 'default'}
                >
                  {plan.buttonText}
                </Button>
                
                <ul className="space-y-3">
                  {plan.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-start">
                      <svg className="flex-shrink-0 w-5 h-5 text-green-500 mt-0.5 mr-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      <span className="text-sm text-gray-700">{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Usage Calculator */}
        <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-200 mb-16">
          <h3 className="text-xl font-bold text-gray-900 mb-6 text-center">
            Calculate Your Monthly Usage
          </h3>
          <div className="grid md:grid-cols-2 gap-6 max-w-2xl mx-auto">
            <div className="text-center">
              <div className="text-3xl font-bold text-orange-500 mb-2">~30 min</div>
              <div className="text-gray-600">Free Plan</div>
              <div className="text-sm text-gray-500 mt-1">3 videos × 10 min each</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-orange-500 mb-2">25 hours</div>
              <div className="text-gray-600">Learner Pro</div>
              <div className="text-sm text-gray-500 mt-1">25 videos × 1 hour each</div>
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
              <h4 className="font-semibold text-gray-900 mb-2">What learning tools are included?</h4>
              <p className="text-gray-600 text-sm">Learner Pro includes vocabulary highlighting, priority processing, and all export formats for comprehensive learning.</p>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">Can I cancel anytime?</h4>
              <p className="text-gray-600 text-sm">Yes, cancel anytime. No commitments. Your plan remains active until the end of your billing period.</p>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">How does vocabulary highlighting work?</h4>
              <p className="text-gray-600 text-sm">Our system identifies key vocabulary words in your transcriptions and highlights them to help focus your learning on important terms.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PricingPage;