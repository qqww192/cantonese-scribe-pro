/**
 * WaitlistPrompt.tsx - Conversion prompts for waitlist signup
 * Handles different conversion scenarios and signup flows
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import {
  Zap,
  Star,
  CheckCircle,
  Mail,
  Users,
  Clock,
  Gift,
  TrendingUp,
  ArrowRight,
  X,
  ExternalLink,
  Sparkles,
  Heart,
  Target,
  Award
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { WaitlistConversionData } from '@/types/usage';
import { useWaitlist } from '@/services/waitlistService';

interface WaitlistPromptProps {
  source: 'usage_limit' | 'feature_upgrade' | 'plan_comparison' | 'pricing_page';
  currentPlan?: string;
  desiredFeatures?: string[];
  urgency?: 'low' | 'medium' | 'high';
  className?: string;
  variant?: 'modal' | 'inline' | 'fullscreen';
  onClose?: () => void;
  onSuccess?: () => void;
}

const WaitlistPrompt: React.FC<WaitlistPromptProps> = ({
  source,
  currentPlan = 'learner',
  desiredFeatures = [],
  urgency = 'medium',
  className,
  variant = 'modal',
  onClose,
  onSuccess
}) => {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>(desiredFeatures);
  const [error, setError] = useState<string>('');

  const { signupForWaitlist, trackWaitlistEvent, generateReferralLink } = useWaitlist();

  const getPromptConfig = () => {
    switch (source) {
      case 'usage_limit':
        return {
          title: 'Unlock Unlimited Transcriptions',
          subtitle: 'Join 1,000+ learners on our Pro waitlist',
          description: 'Get early access to unlimited monthly credits, enhanced accuracy, and premium features.',
          urgencyText: 'Limited early access spots available',
          benefits: [
            'Unlimited transcription credits',
            'Enhanced AI accuracy',
            'Priority processing',
            'Advanced export formats',
            'Priority support'
          ],
          ctaText: 'Join Pro Waitlist',
          ctaIcon: Zap
        };
      case 'feature_upgrade':
        return {
          title: 'Early Access to Premium Features',
          subtitle: 'Be first to try advanced Cantonese tools',
          description: 'Get exclusive access to bulk processing, team features, and advanced romanization options.',
          urgencyText: 'Beta testing starts next month',
          benefits: [
            'Bulk file processing',
            'Team collaboration',
            'Custom romanization',
            'API access',
            'Advanced analytics'
          ],
          ctaText: 'Get Early Access',
          ctaIcon: Star
        };
      case 'plan_comparison':
        return {
          title: 'Upgrade to Pro Features',
          subtitle: 'Get 3x more credits and premium tools',
          description: 'Perfect for serious learners and educators who need reliable, high-quality transcriptions.',
          urgencyText: 'Launch pricing: 40% off first 3 months',
          benefits: [
            '100+ monthly credits',
            'Maximum accuracy',
            'All export formats',
            'Educational discounts',
            'White-label options'
          ],
          ctaText: 'Reserve My Spot',
          ctaIcon: Target
        };
      default:
        return {
          title: 'Join CantoneseScribe Pro',
          subtitle: 'Early access to premium features',
          description: 'Be among the first to experience the next generation of Cantonese transcription tools.',
          urgencyText: 'Limited spots available',
          benefits: [
            'Enhanced features',
            'Priority support',
            'Early access pricing',
            'Feature voting rights',
            'Direct developer feedback'
          ],
          ctaText: 'Join Waitlist',
          ctaIcon: Award
        };
    }
  };

  const config = getPromptConfig();

  const availableFeatures = [
    'Bulk processing (multiple files)',
    'Team collaboration tools',
    'Advanced romanization options',
    'Custom vocabulary training',
    'API access for developers',
    'White-label solutions',
    'Educational institution pricing',
    'Integration with learning platforms'
  ];

  const handleFeatureToggle = (feature: string) => {
    setSelectedFeatures(prev => 
      prev.includes(feature) 
        ? prev.filter(f => f !== feature)
        : [...prev, feature]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email.trim()) {
      setError('Please enter your email address');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address');
      return;
    }

    setIsSubmitting(true);

    try {
      await signupForWaitlist({
        email: email.trim(),
        plan_id: 'learner_pro',
        source,
        metadata: {
          current_plan: currentPlan,
          desired_features: selectedFeatures,
          urgency,
          email_notifications: emailNotifications,
          signup_timestamp: new Date().toISOString()
        }
      });

      await trackWaitlistEvent({
        action: 'signup',
        plan_id: 'learner_pro',
        source,
        metadata: {
          features_selected: selectedFeatures.length,
          email_notifications: emailNotifications
        }
      });

      setIsSubmitted(true);
      
      if (onSuccess) {
        setTimeout(onSuccess, 2000);
      }
    } catch (error) {
      console.error('Waitlist signup failed:', error);
      setError('Failed to join waitlist. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleShare = async () => {
    const referralLink = generateReferralLink(email);
    
    if (navigator.share) {
      await navigator.share({
        title: 'Join CantoneseScribe Pro Waitlist',
        text: 'Get early access to unlimited Cantonese transcriptions!',
        url: referralLink
      });
    } else {
      navigator.clipboard.writeText(referralLink);
      // Could show a toast here
    }

    await trackWaitlistEvent({
      action: 'share',
      source: 'waitlist_success',
      metadata: { referral_link: referralLink }
    });
  };

  const getVariantStyles = () => {
    switch (variant) {
      case 'modal':
        return "fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4";
      case 'fullscreen':
        return "min-h-screen bg-gradient-to-br from-orange-50 to-red-50 flex items-center justify-center p-4";
      case 'inline':
      default:
        return "";
    }
  };

  const content = (
    <div className="max-w-2xl w-full space-y-6">
      {/* Success State */}
      {isSubmitted ? (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-8 text-center space-y-4">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            
            <div>
              <h3 className="text-2xl font-bold text-green-900 mb-2">
                You're on the list!
              </h3>
              <p className="text-green-700">
                Thanks for joining the CantoneseScribe Pro waitlist. We'll notify you when early access opens.
              </p>
            </div>

            <div className="bg-white rounded-lg p-4">
              <div className="flex items-center gap-3 text-sm text-gray-600">
                <Mail className="h-4 w-4" />
                <span>Confirmation sent to {email}</span>
              </div>
            </div>

            <div className="space-y-3">
              <Button onClick={handleShare} variant="outline" className="w-full">
                <Users className="h-4 w-4 mr-2" />
                Share & Earn Bonus Credits
              </Button>
              
              {onClose && (
                <Button onClick={onClose} className="w-full">
                  Continue Using CantoneseScribe
                </Button>
              )}
            </div>

            <div className="text-xs text-gray-500">
              Position #247 in line • Estimated launch: Q2 2025
            </div>
          </CardContent>
        </Card>
      ) : (
        /* Signup Form */
        <Card className="border-orange-200">
          <CardHeader className="text-center pb-4">
            {onClose && variant === 'modal' && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={onClose}
                className="absolute right-4 top-4"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
            
            <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <config.ctaIcon className="h-8 w-8 text-orange-600" />
            </div>
            
            <CardTitle className="text-2xl text-gray-900">
              {config.title}
            </CardTitle>
            <CardDescription className="text-lg">
              {config.subtitle}
            </CardDescription>
            
            {urgency === 'high' && (
              <Badge variant="destructive" className="mt-2">
                <Clock className="h-3 w-3 mr-1" />
                {config.urgencyText}
              </Badge>
            )}
          </CardHeader>
          
          <CardContent className="space-y-6">
            <p className="text-gray-600 text-center">
              {config.description}
            </p>

            {/* Benefits */}
            <div className="bg-gradient-to-r from-orange-50 to-red-50 rounded-lg p-4">
              <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-orange-500" />
                What you'll get:
              </h4>
              <ul className="space-y-2">
                {config.benefits.map((benefit, index) => (
                  <li key={index} className="flex items-center gap-2 text-sm">
                    <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
                    <span className="text-gray-700">{benefit}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Email Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="email" className="text-sm font-medium">
                  Email address
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1"
                  required
                />
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {/* Feature Selection */}
              {source === 'feature_upgrade' && (
                <div>
                  <Label className="text-sm font-medium">
                    Which features interest you most? (optional)
                  </Label>
                  <div className="mt-2 space-y-2 max-h-40 overflow-y-auto">
                    {availableFeatures.map(feature => (
                      <div key={feature} className="flex items-start gap-2">
                        <Checkbox
                          id={feature}
                          checked={selectedFeatures.includes(feature)}
                          onCheckedChange={() => handleFeatureToggle(feature)}
                        />
                        <label 
                          htmlFor={feature}
                          className="text-sm text-gray-600 cursor-pointer"
                        >
                          {feature}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Email Notifications */}
              <div className="flex items-start gap-2">
                <Checkbox
                  id="notifications"
                  checked={emailNotifications}
                  onCheckedChange={setEmailNotifications}
                />
                <label htmlFor="notifications" className="text-sm text-gray-600 cursor-pointer">
                  Send me updates about new features and early access opportunities
                </label>
              </div>

              <Button 
                type="submit" 
                className="w-full bg-orange-600 hover:bg-orange-700"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Joining...
                  </div>
                ) : (
                  <>
                    <config.ctaIcon className="h-4 w-4 mr-2" />
                    {config.ctaText}
                  </>
                )}
              </Button>
            </form>

            {/* Trust Signals */}
            <div className="text-center space-y-2">
              <div className="flex items-center justify-center gap-4 text-sm text-gray-500">
                <div className="flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  <span>1,247+ joined</span>
                </div>
                <div className="flex items-center gap-1">
                  <Heart className="h-4 w-4" />
                  <span>Trusted by educators</span>
                </div>
              </div>
              
              <div className="text-xs text-gray-400">
                No spam. Unsubscribe anytime.
              </div>
            </div>

            {/* Social Proof */}
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="text-xs text-gray-500 mb-2">Recent signups:</div>
              <div className="flex -space-x-2">
                {[...Array(8)].map((_, i) => (
                  <div 
                    key={i}
                    className="w-6 h-6 bg-gradient-to-br from-orange-400 to-red-400 rounded-full border-2 border-white flex items-center justify-center text-xs font-bold text-white"
                  >
                    {String.fromCharCode(65 + i)}
                  </div>
                ))}
                <div className="w-6 h-6 bg-gray-300 rounded-full border-2 border-white flex items-center justify-center text-xs text-gray-600">
                  +
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );

  if (variant === 'inline') {
    return <div className={className}>{content}</div>;
  }

  return (
    <div className={cn(getVariantStyles(), className)}>
      {content}
    </div>
  );
};

export default WaitlistPrompt;