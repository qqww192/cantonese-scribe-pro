// src/App.tsx (or your main routing file)
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Header } from '@/components/Header';
import { HeroSection } from '@/components/HeroSection';
import { HowItWorks } from '@/components/HowItWorks';
import { Features } from '@/components/Features';
import { Footer } from '@/components/Footer';
import PricingPage from '@/components/PricingPage';
import LoginPage from '@/components/LoginPage';

function App() {
  return (
    <Router>
      <Routes>
        {/* Homepage */}
        <Route path="/" element={
          <div className="min-h-screen bg-gray-50">
            <Header />
            <HeroSection />
            <HowItWorks />
            <Features />
            <Footer />
          </div>
        } />
        
        {/* Pricing page */}
        <Route path="/pricing" element={
          <div className="min-h-screen bg-gray-50">
            <Header />
            <PricingPage />
            <Footer />
          </div>
        } />
        
        {/* Login page - no header/footer for cleaner look */}
        <Route path="/auth" element={<LoginPage />} />
      </Routes>
    </Router>
  );
}

export default App;