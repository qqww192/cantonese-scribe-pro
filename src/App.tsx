// src/App.tsx - Clean version (replace your entire file with this)
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { HeroSection } from '@/components/HeroSection';
import { HowItWorks } from '@/components/HowItWorks';
import { Features } from '@/components/Features';
import { Footer } from '@/components/Footer';
import PricingPage from '@/components/PricingPage';
import LoginPage from '@/components/LoginPage';
import DashboardLayout from '@/components/DashboardLayout';
import { UsagePage } from '@/pages/dashboard/UsagePage';
import { SavedFilesPage } from '@/pages/dashboard/SavedFilesPage';
import { SettingsPage } from '@/pages/dashboard/SettingsPage';
import { DashboardHomePage } from '@/pages/dashboard/DashboardHomePage';

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

function App() {
  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={
          <div className="min-h-screen bg-gray-50">
            <Header />
            <HeroSection />
            <HowItWorks />
            <Features />
            <Footer />
          </div>
        } />
        
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
          <Route index element={<DashboardHomePage />} />
          <Route path="usage" element={<UsagePage />} />
          <Route path="files" element={<SavedFilesPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>

        {/* Catch all route */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;