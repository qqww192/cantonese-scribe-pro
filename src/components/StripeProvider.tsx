/**
 * Stripe Provider component for CantoneseScribe
 * Provides Stripe context to the entire application
 */

import React, { useState, useEffect } from 'react';
import { loadStripe, Stripe } from '@stripe/stripe-js';

interface StripeProviderProps {
  children: React.ReactNode;
}

// Create Stripe context
export const StripeContext = React.createContext<{
  stripe: Stripe | null;
  isLoading: boolean;
}>({
  stripe: null,
  isLoading: true,
});

export const StripeProvider: React.FC<StripeProviderProps> = ({ children }) => {
  const [stripe, setStripe] = useState<Stripe | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initializeStripe = async () => {
      try {
        const publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
        
        if (!publishableKey) {
          console.warn('Stripe publishable key not found in environment variables');
          setIsLoading(false);
          return;
        }

        const stripeInstance = await loadStripe(publishableKey);
        setStripe(stripeInstance);
      } catch (error) {
        console.error('Failed to initialize Stripe:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeStripe();
  }, []);

  return (
    <StripeContext.Provider value={{ stripe, isLoading }}>
      {children}
    </StripeContext.Provider>
  );
};

// Hook to use Stripe context
export const useStripe = () => {
  const context = React.useContext(StripeContext);
  if (context === undefined) {
    throw new Error('useStripe must be used within a StripeProvider');
  }
  return context;
};

export default StripeProvider;