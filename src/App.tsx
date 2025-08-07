import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { HeroSection } from '@/components/HeroSection';
import { HowItWorks } from '@/components/HowItWorks';
import { Features } from '@/components/Features';
import { Footer } from '@/components/Footer';
import PricingPage from '@/components/PricingPage';
import LoginPage from '@/components/LoginPage';
import HistoryPage from '@/components/HistoryPage';
import SettingsPage from '@/components/SettingsPage';
import CreditsPage from '@/components/CreditsPage';
import VideoProcessPage from '@/components/VideoProcessPage';

// Protected Route Component
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const isAuthenticated = localStorage.getItem('authToken');
  
  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }
  
  return <>{children}</>;
};

// Home Page Component - Updated navigation and functionality
const HomePage = () => {
  const isAuthenticated = localStorage.getItem('authToken');
  
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      {isAuthenticated && (
        <div className="bg-green-50 border-b border-green-200 px-4 py-2">
          <div className="max-w-6xl mx-auto">
            <p className="text-green-800 text-sm">
              ✅ Successfully logged in! Current URL: <span className="font-mono">{window.location.href}</span>
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
        
        <Route path="/auth" element={<LoginPage />} />

        {/* Protected Routes - No Dashboard */}
        <Route path="/credits" element={
          <ProtectedRoute>
            <div className="min-h-screen bg-gray-50">
              <Header />
              <CreditsPage />
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
  );
}

export default App;