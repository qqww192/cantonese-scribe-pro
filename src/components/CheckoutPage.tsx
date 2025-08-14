/**
 * Stripe Checkout Page for CantoneseScribe
 * Handles subscription payment processing with Stripe Elements
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { usePayments } from '@/services/paymentService';
import { APIError } from '@/services/api';
import { 
  CheckCircle, 
  CreditCard, 
  Shield, 
  ArrowLeft,
  Loader2,
  AlertCircle
} from 'lucide-react';

// Stripe Elements components will be loaded dynamically
let Elements: any;
let PaymentElement: any;

const CheckoutPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const { createElements, confirmSetupIntent } = usePayments();
  
  // State
  const [stripe, setStripe] = useState<any>(null);
  const [elements, setElements] = useState<any>(null);
  const [clientSecret, setClientSecret] = useState<string>('');
  const [subscriptionId, setSubscriptionId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Initialize Stripe and Elements
  useEffect(() => {
    const initializeStripe = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Check authentication
        if (!isAuthenticated()) {
          navigate('/auth?returnTo=' + encodeURIComponent(window.location.pathname + window.location.search));
          return;
        }

        // Get parameters from URL
        const clientSecretParam = searchParams.get('client_secret');
        const subscriptionIdParam = searchParams.get('subscription_id');
        
        if (!clientSecretParam || !subscriptionIdParam) {
          setError('Missing payment parameters. Please try again.');
          return;
        }
        
        setClientSecret(clientSecretParam);
        setSubscriptionId(subscriptionIdParam);
        
        // Dynamically import Stripe Elements
        const [{ loadStripe }, { Elements: StripeElements, PaymentElement: StripePaymentElement }] = await Promise.all([
          import('@stripe/stripe-js'),
          import('@stripe/react-stripe-js')
        ]);
        
        Elements = StripeElements;
        PaymentElement = StripePaymentElement;
        
        // Load Stripe
        const publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
        if (!publishableKey) {
          setError('Payment system not configured. Please contact support.');
          return;
        }
        
        const stripeInstance = await loadStripe(publishableKey);
        if (!stripeInstance) {
          setError('Failed to load payment system. Please check your internet connection.');
          return;
        }
        
        setStripe(stripeInstance);
        
        // Create Elements with the client secret
        const elementsInstance = stripeInstance.elements({
          clientSecret: clientSecretParam,
          appearance: {
            theme: 'stripe' as const,
            variables: {
              colorPrimary: '#ea580c', // Orange-600
              colorBackground: '#ffffff',
              colorText: '#1f2937',
              colorDanger: '#dc2626',
              fontFamily: 'system-ui, sans-serif',
              spacingUnit: '4px',
              borderRadius: '6px'
            }
          }
        });
        
        setElements(elementsInstance);
      } catch (err) {
        console.error('Failed to initialize Stripe:', err);
        setError('Failed to initialize payment system. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    
    initializeStripe();
  }, [searchParams, navigate, isAuthenticated]);

  // Handle payment submission
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    
    if (!stripe || !elements) {
      setError('Payment system not ready. Please wait and try again.');
      return;
    }
    
    setProcessing(true);
    setError(null);
    
    try {
      // Confirm the subscription setup
      const { error: submitError } = await elements.submit();
      if (submitError) {
        throw new Error(submitError.message);
      }
      
      // Confirm setup intent
      const { error, setupIntent } = await stripe.confirmSetup({
        elements,
        clientSecret,
        redirect: 'if_required'
      });
      
      if (error) {
        throw new Error(error.message);
      }
      
      if (setupIntent && setupIntent.status === 'succeeded') {
        setSuccess(true);
        
        // Redirect to success page after a delay
        setTimeout(() => {
          navigate('/payments/success?subscription_id=' + subscriptionId);
        }, 2000);
      }
    } catch (err) {
      console.error('Payment failed:', err);
      setError(err instanceof Error ? err.message : 'Payment failed. Please try again.');
      setProcessing(false);
    }
  };
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center\">
          <Loader2 className="h-8 w-8 animate-spin text-orange-600 mx-auto mb-4\" />
          <p className="text-gray-600\">Loading payment form...</p>
        </div>
      </div>
    );
  }
  
  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center\">
        <Card className="max-w-md w-full\">
          <CardContent className="pt-6\">
            <div className="text-center\">
              <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4\" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2\">Payment Successful!</h2>\n              <p className="text-gray-600 mb-6\">
                Your subscription has been activated. You'll be redirected shortly.
              </p>
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-orange-600 mx-auto\"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50\">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8\">
        {/* Header */}
        <div className="mb-8\">
          <Button 
            variant=\"ghost\" 
            onClick={() => navigate('/pricing')}
            className="mb-4\"
          >
            <ArrowLeft className="h-4 w-4 mr-2\" />
            Back to Pricing
          </Button>
          
          <h1 className="text-3xl font-bold tracking-tight text-gray-900\">
            Complete Your Subscription
          </h1>
          <p className="text-gray-600 mt-2\">
            Secure payment powered by Stripe
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8\">
          {/* Order Summary */}
          <div className="space-y-6\">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2\">
                  <CheckCircle className="h-5 w-5 text-green-600\" />
                  Subscription Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4\">
                <div className="flex items-center justify-between py-3 border-b\">
                  <div>
                    <div className="font-medium text-gray-900\">CantoneseScribe Pro</div>
                    <div className="text-sm text-gray-500\">Monthly subscription</div>
                  </div>
                  <div className="text-right\">
                    <div className="font-semibold text-gray-900\">$9.99</div>
                    <div className="text-sm text-gray-500\">/month</div>
                  </div>
                </div>
                
                <div className="space-y-2\">
                  <div className="flex items-center gap-2 text-sm text-gray-600\">
                    <CheckCircle className="h-4 w-4 text-green-500\" />
                    500 credits per month
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600\">
                    <CheckCircle className="h-4 w-4 text-green-500\" />
                    All export formats (SRT, VTT, CSV, JSON)
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600\">
                    <CheckCircle className="h-4 w-4 text-green-500\" />
                    Yale + Jyutping romanization
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600\">
                    <CheckCircle className="h-4 w-4 text-green-500\" />
                    Priority processing
                  </div>
                </div>
                
                <div className="pt-4 border-t\">
                  <div className="flex items-center justify-between text-lg font-semibold\">
                    <span>Total</span>
                    <span>$9.99/month</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1\">
                    Billed monthly. Cancel anytime.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Security Features */}
            <Card>
              <CardContent className="pt-6\">
                <div className="space-y-3\">
                  <div className="flex items-center gap-3\">
                    <Shield className="h-5 w-5 text-green-600\" />
                    <span className="text-sm text-gray-700\">256-bit SSL encryption</span>
                  </div>
                  <div className="flex items-center gap-3\">
                    <CreditCard className="h-5 w-5 text-green-600\" />
                    <span className="text-sm text-gray-700\">PCI DSS compliant</span>
                  </div>
                  <div className="flex items-center gap-3\">
                    <CheckCircle className="h-5 w-5 text-green-600\" />
                    <span className="text-sm text-gray-700\">30-day money-back guarantee</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Payment Form */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2\">
                  <CreditCard className="h-5 w-5\" />
                  Payment Method
                </CardTitle>
              </CardHeader>
              <CardContent>
                {error && (
                  <Alert variant=\"destructive\" className="mb-6\">
                    <AlertCircle className="h-4 w-4\" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                
                {user && (
                  <div className="mb-6 p-4 bg-gray-50 rounded-lg\">
                    <div className="text-sm text-gray-600 mb-1\">Subscribing as:</div>
                    <div className="font-medium text-gray-900\">{user.name}</div>
                    <div className="text-sm text-gray-600\">{user.email}</div>
                  </div>
                )}
                
                {stripe && elements && Elements && PaymentElement ? (
                  <Elements stripe={stripe} options={{ clientSecret }}>
                    <form onSubmit={handleSubmit} className="space-y-6\">
                      <PaymentElement />
                      
                      <Button
                        type=\"submit\"
                        disabled={!stripe || processing}
                        className="w-full\"
                      >
                        {processing ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin\" />
                            Processing...
                          </>
                        ) : (
                          'Subscribe Now'
                        )}
                      </Button>
                      
                      <p className="text-xs text-gray-500 text-center\">
                        By subscribing, you agree to our Terms of Service and Privacy Policy.
                        You can cancel your subscription at any time.
                      </p>
                    </form>
                  </Elements>
                ) : (
                  <div className="text-center py-8\">
                    <Loader2 className="h-8 w-8 animate-spin text-orange-600 mx-auto mb-4\" />
                    <p className="text-gray-600\">Loading payment form...</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CheckoutPage;