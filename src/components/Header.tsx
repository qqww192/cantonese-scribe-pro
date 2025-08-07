import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export const Header = () => {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [credits, setCredits] = useState(5); // Mock credits

  useEffect(() => {
    // Check authentication status on mount and when storage changes
    const checkAuth = () => {
      const authToken = localStorage.getItem('authToken');
      setIsAuthenticated(!!authToken);
    };

    checkAuth();

    // Listen for storage changes (when user logs in/out from another tab)
    window.addEventListener('storage', checkAuth);

    return () => {
      window.removeEventListener('storage', checkAuth);
    };
  }, []);

  const handleSignOut = () => {
    localStorage.removeItem('authToken');
    setIsAuthenticated(false);
    navigate('/');
  };

  const handleSignIn = () => {
    navigate('/auth');
  };

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          {/* Logo */}
          <div 
            className="flex items-center gap-3 cursor-pointer" 
            onClick={() => navigate('/')}
          >
            <img 
              src="/src/assets/logo.png" 
              alt="CantoneseScribe Logo" 
              className="w-8 h-8 object-contain"
            />
            <div className="text-xl font-bold text-gray-900 uppercase tracking-wide">
              CantoneseScribe
            </div>
          </div>

          {/* Navigation */}
          <div className="flex items-center gap-6">
            {/* Home - always visible */}
            <button
              onClick={() => navigate('/')}
              className="text-gray-600 hover:text-gray-900 transition-colors"
            >
              Home
            </button>

            {/* Pricing - always visible */}
            <button
              onClick={() => navigate('/pricing')}
              className="text-gray-600 hover:text-gray-900 transition-colors"
            >
              Pricing
            </button>

            {isAuthenticated ? (
              /* After Login Navigation */
              <>
                <button
                  onClick={() => navigate('/credits')}
                  className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
                >
                  <span>Credits</span>
                  <Badge variant="secondary" className="bg-green-100 text-green-800">
                    {credits}
                  </Badge>
                </button>
                
                <button
                  onClick={() => navigate('/history')}
                  className="text-gray-600 hover:text-gray-900 transition-colors"
                >
                  History
                </button>
                
                <button
                  onClick={() => navigate('/settings')}
                  className="text-gray-600 hover:text-gray-900 transition-colors"
                >
                  Settings
                </button>
                
                <button
                  onClick={handleSignOut}
                  className="text-red-600 hover:text-red-700 transition-colors"
                >
                  Sign out
                </button>
              </>
            ) : (
              /* Before Login Navigation */
              <>
                <button
                  onClick={handleSignIn}
                  className="text-gray-600 hover:text-gray-900 transition-colors"
                >
                  Login
                </button>
                
                <Button
                  onClick={handleSignIn}
                  className="bg-orange-600 hover:bg-orange-700 text-white"
                >
                  Register
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};