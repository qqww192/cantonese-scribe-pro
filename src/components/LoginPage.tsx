import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth } from '@/contexts/AuthContext';
import { APIError, ValidationError } from '@/services/api';

const LoginPage = () => {
  const navigate = useNavigate();
  const { login, register, loading, error, isAuthenticated } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [localError, setLocalError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string[]>>({});
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    agreeToTerms: false
  });

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated()) {
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const toggleMode = () => {
    setIsLogin(!isLogin);
    setLocalError(null);
    setValidationErrors({});
    setFormData({
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
      agreeToTerms: false
    });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    
    // Clear field-specific validation errors
    if (validationErrors[name]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
    
    // Clear general errors
    if (localError) setLocalError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    setValidationErrors({});

    try {
      if (isLogin) {
        // Login
        await login({
          email: formData.email,
          password: formData.password
        });
      } else {
        // Registration - client-side validation
        if (formData.password !== formData.confirmPassword) {
          setValidationErrors({ confirmPassword: ['Passwords do not match'] });
          return;
        }
        
        if (!formData.agreeToTerms) {
          setValidationErrors({ agreeToTerms: ['You must agree to the terms and conditions'] });
          return;
        }
        
        await register({
          name: formData.name,
          email: formData.email,
          password: formData.password,
          confirmPassword: formData.confirmPassword
        });
      }
      
      // Navigate to home page on success
      navigate('/', { replace: true });
      
    } catch (err) {
      console.error('Authentication failed:', err);
      
      if (err instanceof ValidationError) {
        setValidationErrors(err.errors);
      } else if (err instanceof APIError) {
        setLocalError(err.message);
      } else {
        setLocalError(isLogin ? 'Login failed. Please try again.' : 'Registration failed. Please try again.');
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <img 
            src="/src/assets/logo.png" 
            alt="CantoneseScribe Logo" 
            className="mx-auto w-12 h-12 object-contain"
          />
          <h2 className="mt-6 text-3xl font-bold text-gray-900">
            {isLogin ? 'Sign in to your account' : 'Create your account'}
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            {isLogin 
              ? 'Welcome back to CantoneseScribe'
              : 'Start transcribing Cantonese content today'
            }
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{isLogin ? 'Sign In' : 'Create Account'}</CardTitle>
            <CardDescription>
              {isLogin 
                ? 'Enter your credentials to access your account'
                : 'Create a new account to get started'
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Display errors */}
            {(error || localError) && (
              <Alert variant="destructive">
                <AlertDescription>
                  {error || localError}
                </AlertDescription>
              </Alert>
            )}
            
            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && (
                <div>
                  <Input
                    name="name"
                    type="text"
                    placeholder="Full name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required={!isLogin}
                    className={`w-full ${validationErrors.name ? 'border-red-500' : ''}`}
                  />
                  {validationErrors.name && (
                    <p className="text-red-500 text-sm mt-1">{validationErrors.name[0]}</p>
                  )}
                </div>
              )}
              
              <div>
                <Input
                  name="email"
                  type="email"
                  placeholder="Email address"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                  className={`w-full ${validationErrors.email ? 'border-red-500' : ''}`}
                />
                {validationErrors.email && (
                  <p className="text-red-500 text-sm mt-1">{validationErrors.email[0]}</p>
                )}
              </div>
              
              <div>
                <Input
                  name="password"
                  type="password"
                  placeholder="Password"
                  value={formData.password}
                  onChange={handleInputChange}
                  required
                  className={`w-full ${validationErrors.password ? 'border-red-500' : ''}`}
                />
                {validationErrors.password && (
                  <p className="text-red-500 text-sm mt-1">{validationErrors.password[0]}</p>
                )}
              </div>
              
              {!isLogin && (
                <div>
                  <Input
                    name="confirmPassword"
                    type="password"
                    placeholder="Confirm password"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    required={!isLogin}
                    className={`w-full ${validationErrors.confirmPassword ? 'border-red-500' : ''}`}
                  />
                  {validationErrors.confirmPassword && (
                    <p className="text-red-500 text-sm mt-1">{validationErrors.confirmPassword[0]}</p>
                  )}
                </div>
              )}

              {!isLogin && (
                <div>
                  <div className="flex items-center space-x-2">
                    <input
                      id="agree-terms"
                      name="agreeToTerms"
                      type="checkbox"
                      checked={formData.agreeToTerms}
                      onChange={handleInputChange}
                      required={!isLogin}
                      className={`h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded ${validationErrors.agreeToTerms ? 'border-red-500' : ''}`}
                    />
                    <label htmlFor="agree-terms" className="text-sm text-gray-600">
                      I agree to the{' '}
                      <a href="#" className="text-orange-600 hover:text-orange-700 underline">
                        Terms of Service
                      </a>{' '}
                      and{' '}
                      <a href="#" className="text-orange-600 hover:text-orange-700 underline">
                        Privacy Policy
                      </a>
                    </label>
                  </div>
                  {validationErrors.agreeToTerms && (
                    <p className="text-red-500 text-sm mt-1">{validationErrors.agreeToTerms[0]}</p>
                  )}
                </div>
              )}

              <Button
                type="submit"
                disabled={loading || (!isLogin && !formData.agreeToTerms)}
                className="w-full bg-orange-600 hover:bg-orange-700 text-white"
              >
                {loading ? 'Processing...' : (isLogin ? 'Sign In' : 'Create Account')}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Toggle between login and register */}
        <div className="text-center">
          <p className="text-sm text-gray-600">
            {isLogin 
              ? "Don't have an account? " 
              : "Already have an account? "
            }
            <button
              onClick={toggleMode}
              className="text-orange-600 hover:text-orange-700 font-medium underline"
            >
              {isLogin ? 'Sign up for free' : 'Sign in here'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;