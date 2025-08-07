// src/App.tsx - Fixed with proper video navigation flow
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useState } from 'react';
import { Header } from '@/components/Header';
import { HeroSection } from '@/components/HeroSection';
import { HowItWorks } from '@/components/HowItWorks';
import { Features } from '@/components/Features';
import { Footer } from '@/components/Footer';
import { VideoSelectionPage } from '@/components/VideoSelectionPage';
import VideoResultsPage from '@/components/VideoResultsPage';
import PricingPage from '@/components/PricingPage';
import LoginPage from '@/components/LoginPage';
import DashboardLayout from '@/components/DashboardLayout';
import { UsagePage } from '@/pages/dashboard/UsagePage';
import { SavedFilesPage } from '@/pages/dashboard/SavedFilesPage';
import { SettingsPage } from '@/pages/dashboard/SettingsPage';
import { DashboardHomePage } from '@/pages/dashboard/DashboardHomePage';
import { FlashcardGamesPage } from '@/pages/dashboard/FlashcardGamesPage';
import { VocabularyPage } from '@/pages/dashboard/VocabularyPage';
import { PronunciationPage } from '@/pages/dashboard/PronunciationPage';
import { AnalyticsPage } from '@/pages/dashboard/AnalyticsPage';

// Placeholder components for remaining features
const AdaptiveLearningPage = () => (
  <div className="space-y-6">
    <h1 className="text-3xl font-bold tracking-tight">Adaptive Learning</h1>
    <p className="text-muted-foreground">
      AI-powered adaptive difficulty system - Coming soon!
    </p>
  </div>
);

const ExportPage = () => (
  <div className="space-y-6">
    <h1 className="text-3xl font-bold tracking-tight">Export & Integration</h1>
    <p className="text-muted-foreground">
      Export to Anki, Quizlet, and other platforms - Coming soon!
    </p>
  </div>
);

const SpacedRepetitionPage = () => (
  <div className="space-y-6">
    <h1 className="text-3xl font-bold tracking-tight">Spaced Repetition</h1>
    <p className="text-muted-foreground">
      Intelligent spaced repetition scheduling - Coming soon!
    </p>
  </div>
);

// Protected Route Component
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const isAuthenticated = localStorage.getItem('authToken');
  
  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }
  
  return <>{children}</>;
};

// Public Route Component
const PublicRoute = ({ children }: { children: React.ReactNode }) => {
  const isAuthenticated = localStorage.getItem('authToken');
  
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }
  
  return <>{children}</>;
};

// Main Homepage Component with Video Flow
const HomePage = () => {
  const [currentStep, setCurrentStep] = useState<'home' | 'selection' | 'results'>('home');
  const [selectedVideoUrl, setSelectedVideoUrl] = useState<string>('');
  const [processingData, setProcessingData] = useState<{
    startTime: number;
    endTime: number;
    duration: number;
  } | null>(null);

  const handleVideoSelected = (url: string) => {
    setSelectedVideoUrl(url);
    setCurrentStep('selection');
  };

  const handleVideoSelectionProceed = (startTime: number, endTime: number, selectedDuration: number) => {
    setProcessingData({ startTime, endTime, duration: selectedDuration });
    setCurrentStep('results');
  };

  const handleBackToHome = () => {
    setCurrentStep('home');
    setSelectedVideoUrl('');
    setProcessingData(null);
  };

  const handleBackToSelection = () => {
    setCurrentStep('selection');
    setProcessingData(null);
  };

  // Render different steps based on current state
  if (currentStep === 'results' && processingData) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <VideoResultsPage
          videoUrl={selectedVideoUrl}
          videoTitle="Sample Cantonese Video" // You can extract this from video metadata
          processingData={processingData}
          onBack={handleBackToSelection}
        />
        <Footer />
      </div>
    );
  }

  if (currentStep === 'selection') {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <VideoSelectionPage
          videoUrl={selectedVideoUrl}
          onProceed={handleVideoSelectionProceed}
          onBack={handleBackToHome}
        />
        <Footer />
      </div>
    );
  }

  // Default home view
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <HeroSection onVideoSelected={handleVideoSelected} />
      <HowItWorks />
      <Features />
      <Footer />
    </div>
  );
};

function App() {
  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<HomePage />} />
        
        <Route path="/pricing" element={
          <div className="min-h-screen bg-gray-50">
            <Header />
            <PricingPage />
            <Footer />
          </div>
        } />
        
        <Route path="/auth" element={
          <PublicRoute>
            <LoginPage />
          </PublicRoute>
        } />

        {/* Protected Dashboard Routes */}
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }>
          {/* Core Dashboard Pages */}
          <Route index element={<DashboardHomePage />} />
          <Route path="usage" element={<UsagePage />} />
          <Route path="files" element={<SavedFilesPage />} />
          <Route path="settings" element={<SettingsPage />} />
          
          {/* Learning Feature Pages */}
          <Route path="flashcards" element={<FlashcardGamesPage />} />
          <Route path="vocabulary" element={<VocabularyPage />} />
          <Route path="pronunciation" element={<PronunciationPage />} />
          <Route path="analytics" element={<AnalyticsPage />} />
          <Route path="adaptive" element={<AdaptiveLearningPage />} />
          <Route path="export" element={<ExportPage />} />
          <Route path="spaced-repetition" element={<SpacedRepetitionPage />} />
        </Route>

        {/* Catch all route */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;