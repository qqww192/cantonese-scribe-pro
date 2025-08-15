import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { HeroSection } from '@/components/HeroSection';
import { HowItWorks } from '@/components/HowItWorks';
import { Features } from '@/components/Features';
import { Footer } from '@/components/Footer';
import PricingPageMVP from '@/components/PricingPageMVP';
import LoginPage from '@/components/LoginPage';
import HistoryPage from '@/components/HistoryPage';
import SettingsPage from '@/components/SettingsPage';
import UsagePage from '@/components/UsagePage';
import VideoProcessPage from '@/components/VideoProcessPage';
import CheckoutPage from '@/components/CheckoutPage';
import PaymentSuccessPage from '@/components/PaymentSuccessPage';
import StripeProvider from '@/components/StripeProvider';
import OnboardingFlow, { useOnboarding } from '@/components/OnboardingFlow';
import { useAuth } from '@/contexts/AuthContext';

// Protected Route Component
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated } = useAuth();
  
  if (!isAuthenticated()) {
    return <Navigate to="/auth" replace />;
  }
  
  return <>{children}</>;
};

// Home Page Component - Updated navigation and functionality
const HomePage = () => {
  const { isAuthenticated, user } = useAuth();
  
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      {isAuthenticated() && user && (
        <div className="bg-green-50 border-b border-green-200 px-4 py-2">
          <div className="max-w-6xl mx-auto">
            <p className="text-green-800 text-sm">
              ✅ Welcome back, {user.name}! You have {user.usage_quota - user.usage_count} credits remaining.
            </p>
          </div>
        </div>
      )}
      <HeroSection />
      <HowItWorks />
      <Features />
      <Footer />
    </div>
  );
};

function App() {
  const { isAuthenticated } = useAuth();
  const { hasCompletedOnboarding, completeOnboarding } = useOnboarding();
  
  // Setup token refresh on app initialization
  useEffect(() => {
    if (isAuthenticated()) {
      // Setup automatic token refresh
      import('@/services/authService').then(({ authService }) => {
        authService.setupTokenRefresh();
      });
    }
  }, [isAuthenticated]);
  
  // Show onboarding for new authenticated users
  const shouldShowOnboarding = isAuthenticated() && !hasCompletedOnboarding;

  return (
    <StripeProvider>
      <Router>
        {shouldShowOnboarding && (
          <OnboardingFlow
            onComplete={completeOnboarding}
            onSkip={completeOnboarding}
          />
        )}
        
        <Routes>
        {/* Public Routes */}
        <Route path="/" element={<HomePage />} />
        
        <Route path="/pricing" element={
          <div className="min-h-screen bg-gray-50">
            <Header />
            <PricingPageMVP />
            <Footer />
          </div>
        } />
        
        <Route path="/auth" element={<LoginPage />} />
        
        <Route path="/checkout" element={
          <ProtectedRoute>
            <div className="min-h-screen bg-gray-50">
              <CheckoutPage />
            </div>
          </ProtectedRoute>
        } />
        
        <Route path="/payments/success" element={
          <ProtectedRoute>
            <PaymentSuccessPage />
          </ProtectedRoute>
        } />

        {/* Protected Routes - No Dashboard */}
        <Route path="/usage" element={
          <ProtectedRoute>
            <div className="min-h-screen bg-gray-50">
              <Header />
              <UsagePage />
              <Footer />
            </div>
          </ProtectedRoute>
        } />

        <Route path="/history" element={
          <ProtectedRoute>
            <div className="min-h-screen bg-gray-50">
              <Header />
              <HistoryPage />
              <Footer />
            </div>
          </ProtectedRoute>
        } />

        <Route path="/settings" element={
          <ProtectedRoute>
            <div className="min-h-screen bg-gray-50">
              <Header />
              <SettingsPage />
              <Footer />
            </div>
          </ProtectedRoute>
        } />

        <Route path="/process" element={
          <ProtectedRoute>
            <div className="min-h-screen bg-gray-50">
              <Header />
              <VideoProcessPage />
              <Footer />
            </div>
          </ProtectedRoute>
        } />

        {/* Catch all route */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      </Router>
    </StripeProvider>
  );
}

export default App;