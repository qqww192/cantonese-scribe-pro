/**
 * Onboarding Flow for CantoneseScribe
 * Provides guided tour and setup for new users
 */

import React, { useState, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  ChevronRight, 
  ChevronLeft,
  Play,
  Upload,
  Download,
  Star,
  CheckCircle,
  ArrowRight,
  Lightbulb,
  Video,
  FileText,
  Settings,
  CreditCard,
  Users,
  Sparkles,
  X
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

// Types
interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<any>;
  content: React.ReactNode;
  actionText?: string;
  onAction?: () => void;
  skippable?: boolean;
}

interface OnboardingFlowProps {
  onComplete: () => void;
  onSkip?: () => void;
  className?: string;
}

interface TourHighlight {
  element: string;
  title: string;
  description: string;
  position: 'top' | 'bottom' | 'left' | 'right';
}

// Welcome step component
const WelcomeStep: React.FC<{ user: any; onNext: () => void }> = ({ user, onNext }) => (
  <div className="text-center space-y-6">
    <div className="flex justify-center">
      <div className="relative">
        <div className="w-20 h-20 bg-gradient-to-r from-orange-500 to-red-500 rounded-full flex items-center justify-center text-white text-3xl font-bold">
          C
        </div>
        <Sparkles className="absolute -top-2 -right-2 h-6 w-6 text-yellow-500" />
      </div>
    </div>
    
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">
        Welcome to CantoneseScribe, {user?.name}!
      </h2>
      <p className="text-gray-600">
        Let's take a quick tour to help you get the most out of your Cantonese transcription experience.
      </p>
    </div>
    
    <div className="bg-orange-50 rounded-lg p-4">
      <div className="flex items-center gap-3 text-orange-800">
        <Lightbulb className="h-5 w-5" />
        <p className="text-sm">
          This onboarding will take about 2 minutes and will help you understand all the features available to you.
        </p>
      </div>
    </div>
    
    <Button onClick={onNext} className="bg-orange-600 hover:bg-orange-700">
      Let's Get Started
      <ArrowRight className="ml-2 h-4 w-4" />
    </Button>
  </div>
);

// Feature showcase step
const FeatureStep: React.FC<{ feature: any; onNext: () => void }> = ({ feature, onNext }) => (
  <div className="space-y-6">
    <div className="text-center">
      <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <feature.icon className="h-8 w-8 text-orange-600" />
      </div>
      <h3 className="text-xl font-semibold text-gray-900 mb-2">{feature.title}</h3>
      <p className="text-gray-600">{feature.description}</p>
    </div>
    
    <div className="bg-gray-50 rounded-lg p-4">
      {feature.content}
    </div>
    
    <div className="flex justify-center">
      <Button onClick={onNext} variant="outline">
        Got it, what's next?
        <ChevronRight className="ml-2 h-4 w-4" />
      </Button>
    </div>
  </div>
);

// Interactive demo step
const DemoStep: React.FC<{ onNext: () => void }> = ({ onNext }) => {
  const [demoStage, setDemoStage] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const runDemo = () => {
    setIsProcessing(true);
    setDemoStage(1);
    
    setTimeout(() => setDemoStage(2), 1000);
    setTimeout(() => setDemoStage(3), 2000);
    setTimeout(() => {
      setDemoStage(4);
      setIsProcessing(false);
    }, 3000);
  };
  
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-xl font-semibold text-gray-900 mb-2">Try a Quick Demo</h3>
        <p className="text-gray-600">
          See how CantoneseScribe processes a sample video
        </p>
      </div>
      
      <Card>
        <CardContent className="p-6">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium",
                demoStage >= 1 ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"
              )}>
                {demoStage >= 1 ? <CheckCircle className="h-4 w-4" /> : "1"}
              </div>
              <div>
                <p className="font-medium">Upload Video</p>
                <p className="text-sm text-gray-500">Sample Cantonese video selected</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium",
                demoStage >= 2 ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"
              )}>
                {demoStage >= 2 ? <CheckCircle className="h-4 w-4" /> : "2"}
              </div>
              <div>
                <p className="font-medium">Process Audio</p>
                <p className="text-sm text-gray-500">AI analyzes Cantonese speech</p>
              </div>
              {isProcessing && demoStage === 2 && (
                <div className="ml-auto">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-orange-600"></div>
                </div>
              )}
            </div>
            
            <div className="flex items-center gap-3">
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium",
                demoStage >= 3 ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"
              )}>
                {demoStage >= 3 ? <CheckCircle className="h-4 w-4" /> : "3"}
              </div>
              <div>
                <p className="font-medium">Generate Transcription</p>
                <p className="text-sm text-gray-500">Chinese + Yale + Jyutping + English</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium",
                demoStage >= 4 ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"
              )}>
                {demoStage >= 4 ? <CheckCircle className="h-4 w-4" /> : "4"}
              </div>
              <div>
                <p className="font-medium">Export Results</p>
                <p className="text-sm text-gray-500">Multiple formats available</p>
              </div>
            </div>
          </div>
          
          {demoStage === 0 && (
            <div className="mt-6 text-center">
              <Button onClick={runDemo} className="bg-orange-600 hover:bg-orange-700">
                <Play className="h-4 w-4 mr-2" />
                Start Demo
              </Button>
            </div>
          )}
          
          {demoStage === 4 && (
            <div className="mt-6 p-4 bg-green-50 rounded-lg">
              <div className="text-center text-green-800">
                <CheckCircle className="h-8 w-8 mx-auto mb-2" />
                <p className="font-medium">Demo Complete!</p>
                <p className="text-sm">Your actual transcriptions will be even more accurate.</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      
      <div className="flex justify-center">
        <Button onClick={onNext} disabled={demoStage < 4}>
          Continue Setup
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

// Tips and best practices step
const TipsStep: React.FC<{ onNext: () => void }> = ({ onNext }) => {
  const tips = [
    {
      icon: Video,
      title: "Upload Quality Audio/Video",
      description: "Clear audio with minimal background noise gives the best transcription results."
    },
    {
      icon: Settings,
      title: "Choose the Right Options",
      description: "Select Yale, Jyutping, or both romanization systems based on your learning needs."
    },
    {
      icon: Star,
      title: "Provide Feedback",
      description: "Rate your transcriptions to help us improve our AI and your future results."
    },
    {
      icon: Download,
      title: "Export in Your Preferred Format",
      description: "Choose from SRT, VTT, TXT, CSV, or JSON formats for different use cases."
    }
  ];
  
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-xl font-semibold text-gray-900 mb-2">Pro Tips for Best Results</h3>
        <p className="text-gray-600">
          Follow these tips to get the most accurate transcriptions
        </p>
      </div>
      
      <div className="space-y-4">
        {tips.map((tip, index) => (
          <div key={index} className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg">
            <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
              <tip.icon className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <h4 className="font-medium text-gray-900 mb-1">{tip.title}</h4>
              <p className="text-sm text-gray-600">{tip.description}</p>
            </div>
          </div>
        ))}
      </div>
      
      <div className="flex justify-center">
        <Button onClick={onNext}>
          Ready to Start!
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

// Main onboarding flow component
const OnboardingFlow: React.FC<OnboardingFlowProps> = ({
  onComplete,
  onSkip,
  className
}) => {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(true);
  
  const steps: OnboardingStep[] = [
    {
      id: 'welcome',
      title: 'Welcome',
      description: 'Welcome to CantoneseScribe',
      icon: Sparkles,
      content: <WelcomeStep user={user} onNext={() => setCurrentStep(1)} />,
      skippable: true
    },
    {
      id: 'upload',
      title: 'Upload Files',
      description: 'Learn how to upload and process videos',
      icon: Upload,
      content: (
        <FeatureStep 
          feature={{
            icon: Upload,
            title: "Upload & Process",
            description: "Upload video files or paste YouTube URLs to get started",
            content: (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <Upload className="h-4 w-4 text-blue-600" />
                  </div>
                  <span className="text-sm">Drag & drop files or click to browse</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                    <Video className="h-4 w-4 text-red-600" />
                  </div>
                  <span className="text-sm">Paste YouTube URLs for direct processing</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                    <Settings className="h-4 w-4 text-green-600" />
                  </div>
                  <span className="text-sm">Supports MP3, MP4, WAV, and more formats</span>
                </div>
              </div>
            )
          }}
          onNext={() => setCurrentStep(2)}
        />
      )
    },
    {
      id: 'transcription',
      title: 'Transcription Features',
      description: 'Understand transcription outputs',
      icon: FileText,
      content: (
        <FeatureStep 
          feature={{
            icon: FileText,
            title: "Rich Transcription Output",
            description: "Get comprehensive transcriptions with multiple romanization systems",
            content: (
              <div className="space-y-4">
                <div className="p-3 border rounded-lg bg-white">
                  <div className="text-lg font-medium text-gray-900 mb-2">大家好，歡迎收看今日新聞</div>
                  <div className="text-sm text-blue-600 mb-1">Yale: daai6 gaa1 hou2, fun1 ying4 sau1 toi2</div>
                  <div className="text-sm text-green-600 mb-1">Jyutping: daai6 gaa1 hou2, fun1 jing4 sau1 toi2</div>
                  <div className="text-sm text-gray-600 italic">Hello everyone, welcome to today's news</div>
                </div>
                <div className="text-xs text-gray-500">
                  Each segment includes timestamps, confidence scores, and multiple romanization systems
                </div>
              </div>
            )
          }}
          onNext={() => setCurrentStep(3)}
        />
      )
    },
    {
      id: 'demo',
      title: 'Quick Demo',
      description: 'See the process in action',
      icon: Play,
      content: <DemoStep onNext={() => setCurrentStep(4)} />
    },
    {
      id: 'tips',
      title: 'Pro Tips',
      description: 'Best practices for success',
      icon: Lightbulb,
      content: <TipsStep onNext={handleComplete} />
    }
  ];
  
  const totalSteps = steps.length;
  const progressPercentage = ((currentStep + 1) / totalSteps) * 100;
  
  function handleComplete() {
    setIsVisible(false);
    setTimeout(onComplete, 300);
  }
  
  const handleSkip = () => {
    if (onSkip) {
      onSkip();
    } else {
      handleComplete();
    }
  };
  
  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };
  
  if (!isVisible) return null;
  
  const currentStepData = steps[currentStep];
  
  return (
    <div className={cn(
      "fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4",
      className
    )}>
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                {steps.map((step, index) => (
                  <div
                    key={step.id}
                    className={cn(
                      "w-2 h-2 rounded-full transition-colors",
                      index === currentStep
                        ? "bg-orange-600"
                        : index < currentStep
                        ? "bg-green-500"
                        : "bg-gray-300"
                    )}
                  />
                ))}
              </div>
              <span className="text-sm text-gray-500">
                {currentStep + 1} of {totalSteps}
              </span>
            </div>
            
            <Button variant="ghost" size="sm" onClick={handleSkip}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          <div>
            <CardTitle className="flex items-center gap-2">
              <currentStepData.icon className="h-5 w-5 text-orange-600" />
              {currentStepData.title}
            </CardTitle>
            <Progress value={progressPercentage} className="mt-3" />
          </div>
        </CardHeader>
        
        <CardContent className="pb-6">
          {currentStepData.content}
        </CardContent>
        
        <div className="px-6 pb-6">
          <div className="flex items-center justify-between">
            <div>
              {currentStep > 0 && (
                <Button variant="ghost" onClick={handlePrevious}>
                  <ChevronLeft className="h-4 w-4 mr-2" />
                  Previous
                </Button>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              {currentStepData.skippable && (
                <Button variant="ghost" onClick={handleSkip}>
                  Skip Tour
                </Button>
              )}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

// Hook to manage onboarding state
export const useOnboarding = () => {
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(() => {
    return localStorage.getItem('cantonese-scribe-onboarding') === 'completed';
  });
  
  const completeOnboarding = useCallback(() => {
    localStorage.setItem('cantonese-scribe-onboarding', 'completed');
    setHasCompletedOnboarding(true);
  }, []);
  
  const resetOnboarding = useCallback(() => {
    localStorage.removeItem('cantonese-scribe-onboarding');
    setHasCompletedOnboarding(false);
  }, []);
  
  return {
    hasCompletedOnboarding,
    completeOnboarding,
    resetOnboarding
  };
};

export default OnboardingFlow;