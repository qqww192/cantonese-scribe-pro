/**
 * Payment service for CantoneseScribe
 * Handles Stripe integration for subscription management and payments
 */

import { apiClient, APIError } from './api';

// Types
export interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  billing_period: 'monthly' | 'yearly';
  credits_included: number;
  features: string[];
  popular?: boolean;
  stripe_price_id: string;
}

export interface Subscription {
  id: string;
  user_id: string;
  plan: SubscriptionPlan;
  status: 'active' | 'canceled' | 'past_due' | 'unpaid' | 'trialing';
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
  created_at: string;
  updated_at: string;
}

export interface PaymentMethod {
  id: string;
  type: 'card';
  card: {
    brand: string;
    last4: string;
    exp_month: number;
    exp_year: number;
  };
  is_default: boolean;
}

export interface PaymentIntent {
  id: string;
  client_secret: string;
  status: string;
  amount: number;
  currency: string;
}

export interface Invoice {
  id: string;
  amount: number;
  currency: string;
  status: 'paid' | 'open' | 'draft' | 'uncollectible' | 'void';
  created_at: string;
  due_date: string;
  invoice_pdf_url?: string;
}

export interface UsageRecord {
  date: string;
  credits_used: number;
  credits_remaining: number;
  description: string;
}

// Payment service class
class PaymentService {
  private static instance: PaymentService;
  private stripePromise: Promise<any> | null = null;

  static getInstance(): PaymentService {
    if (!PaymentService.instance) {
      PaymentService.instance = new PaymentService();
    }
    return PaymentService.instance;
  }

  constructor() {
    this.initializeStripe();
  }

  /**
   * Initialize Stripe
   */
  private async initializeStripe() {
    if (typeof window !== 'undefined' && !this.stripePromise) {
      const { loadStripe } = await import('@stripe/stripe-js');
      const publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
      
      if (!publishableKey) {
        console.warn('Stripe publishable key not found');
        return null;
      }
      
      this.stripePromise = loadStripe(publishableKey);
    }
  }

  /**
   * Get Stripe instance
   */
  async getStripe() {
    if (!this.stripePromise) {
      await this.initializeStripe();
    }
    return this.stripePromise;
  }

  /**
   * Get available subscription plans
   */
  async getSubscriptionPlans(): Promise<SubscriptionPlan[]> {
    try {
      return await apiClient.get<SubscriptionPlan[]>('/payments/plans');
    } catch (error) {
      console.error('Failed to get subscription plans:', error);
      throw error;
    }
  }

  /**
   * Get current user subscription
   */
  async getCurrentSubscription(): Promise<Subscription | null> {
    try {
      return await apiClient.get<Subscription>('/payments/subscription');
    } catch (error) {
      if (error instanceof APIError && error.status === 404) {
        return null; // No subscription
      }
      console.error('Failed to get current subscription:', error);
      throw error;
    }
  }

  /**
   * Create subscription
   */
  async createSubscription(priceId: string): Promise<{ client_secret: string; subscription_id: string }> {
    try {
      return await apiClient.post('/payments/subscription', {
        price_id: priceId
      });
    } catch (error) {
      console.error('Failed to create subscription:', error);
      throw error;
    }
  }

  /**
   * Update subscription
   */
  async updateSubscription(subscriptionId: string, priceId: string): Promise<Subscription> {
    try {
      return await apiClient.patch(`/payments/subscription/${subscriptionId}`, {
        price_id: priceId
      });
    } catch (error) {
      console.error('Failed to update subscription:', error);
      throw error;
    }
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription(subscriptionId: string, cancelAtPeriodEnd: boolean = true): Promise<Subscription> {
    try {
      return await apiClient.patch(`/payments/subscription/${subscriptionId}/cancel`, {
        cancel_at_period_end: cancelAtPeriodEnd
      });
    } catch (error) {
      console.error('Failed to cancel subscription:', error);
      throw error;
    }
  }

  /**
   * Reactivate canceled subscription
   */
  async reactivateSubscription(subscriptionId: string): Promise<Subscription> {
    try {
      return await apiClient.patch(`/payments/subscription/${subscriptionId}/reactivate`);
    } catch (error) {
      console.error('Failed to reactivate subscription:', error);
      throw error;
    }
  }

  /**
   * Get payment methods
   */
  async getPaymentMethods(): Promise<PaymentMethod[]> {
    try {
      return await apiClient.get<PaymentMethod[]>('/payments/payment-methods');
    } catch (error) {
      console.error('Failed to get payment methods:', error);
      throw error;
    }
  }

  /**
   * Add payment method
   */
  async addPaymentMethod(): Promise<{ client_secret: string }> {
    try {
      return await apiClient.post('/payments/payment-methods/setup-intent');
    } catch (error) {
      console.error('Failed to create setup intent:', error);
      throw error;
    }
  }

  /**
   * Delete payment method
   */
  async deletePaymentMethod(paymentMethodId: string): Promise<void> {
    try {
      await apiClient.delete(`/payments/payment-methods/${paymentMethodId}`);
    } catch (error) {
      console.error('Failed to delete payment method:', error);
      throw error;
    }
  }

  /**
   * Set default payment method
   */
  async setDefaultPaymentMethod(paymentMethodId: string): Promise<void> {
    try {
      await apiClient.patch(`/payments/payment-methods/${paymentMethodId}/default`);
    } catch (error) {
      console.error('Failed to set default payment method:', error);
      throw error;
    }
  }

  /**
   * Get billing history
   */
  async getBillingHistory(limit: number = 10, offset: number = 0): Promise<Invoice[]> {
    try {
      return await apiClient.get<Invoice[]>('/payments/invoices', { limit, offset });
    } catch (error) {
      console.error('Failed to get billing history:', error);
      throw error;
    }
  }

  /**
   * Get usage history
   */
  async getUsageHistory(limit: number = 30): Promise<UsageRecord[]> {
    try {
      return await apiClient.get<UsageRecord[]>('/payments/usage', { limit });
    } catch (error) {
      console.error('Failed to get usage history:', error);
      throw error;
    }
  }

  /**
   * Purchase additional credits
   */
  async purchaseCredits(amount: number): Promise<PaymentIntent> {
    try {
      return await apiClient.post<PaymentIntent>('/payments/credits', {
        amount
      });
    } catch (error) {
      console.error('Failed to purchase credits:', error);
      throw error;
    }
  }

  /**
   * Confirm payment with Stripe
   */
  async confirmPayment(clientSecret: string, paymentMethodId: string): Promise<any> {
    try {
      const stripe = await this.getStripe();
      if (!stripe) {
        throw new Error('Stripe not initialized');
      }

      return await stripe.confirmPayment({
        clientSecret,
        payment_method: paymentMethodId,
        return_url: `${window.location.origin}/payments/success`
      });
    } catch (error) {
      console.error('Failed to confirm payment:', error);
      throw error;
    }
  }

  /**
   * Confirm setup intent for payment method
   */
  async confirmSetupIntent(clientSecret: string, paymentElement: any): Promise<any> {
    try {
      const stripe = await this.getStripe();
      if (!stripe) {
        throw new Error('Stripe not initialized');
      }

      return await stripe.confirmSetup({
        elements: paymentElement,
        clientSecret,
        redirect: 'if_required'
      });
    } catch (error) {
      console.error('Failed to confirm setup intent:', error);
      throw error;
    }
  }

  /**
   * Create Stripe Elements
   */
  async createElements(clientSecret: string, options?: any) {
    try {
      const stripe = await this.getStripe();
      if (!stripe) {
        throw new Error('Stripe not initialized');
      }

      return stripe.elements({
        clientSecret,
        appearance: {
          theme: 'stripe',
          variables: {
            colorPrimary: '#ea580c', // Orange-600
            colorBackground: '#ffffff',
            colorText: '#1f2937',
            colorDanger: '#dc2626',
            fontFamily: 'system-ui, sans-serif',
            spacingUnit: '4px',
            borderRadius: '6px'
          }
        },
        ...options
      });
    } catch (error) {
      console.error('Failed to create Stripe elements:', error);
      throw error;
    }
  }

  /**
   * Format currency for display
   */
  formatCurrency(amount: number, currency: string = 'usd'): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase()
    }).format(amount / 100);
  }

  /**
   * Get formatted card display
   */
  formatCardDisplay(card: PaymentMethod['card']): string {
    return `**** **** **** ${card.last4}`;
  }

  /**
   * Get card brand display name
   */
  getCardBrandName(brand: string): string {
    const brands: Record<string, string> = {
      visa: 'Visa',
      mastercard: 'Mastercard',
      amex: 'American Express',
      discover: 'Discover',
      diners: 'Diners Club',
      jcb: 'JCB',
      unionpay: 'UnionPay'
    };
    return brands[brand] || brand;
  }

  /**
   * Check if payment method is expired
   */
  isPaymentMethodExpired(card: PaymentMethod['card']): boolean {
    const now = new Date();
    const expiry = new Date(card.exp_year, card.exp_month - 1);
    return expiry < now;
  }
}

// Export singleton instance
export const paymentService = PaymentService.getInstance();

// React hook for payment operations
export const usePayments = () => {
  return {
    getSubscriptionPlans: paymentService.getSubscriptionPlans.bind(paymentService),
    getCurrentSubscription: paymentService.getCurrentSubscription.bind(paymentService),
    createSubscription: paymentService.createSubscription.bind(paymentService),
    updateSubscription: paymentService.updateSubscription.bind(paymentService),
    cancelSubscription: paymentService.cancelSubscription.bind(paymentService),
    reactivateSubscription: paymentService.reactivateSubscription.bind(paymentService),
    getPaymentMethods: paymentService.getPaymentMethods.bind(paymentService),
    addPaymentMethod: paymentService.addPaymentMethod.bind(paymentService),
    deletePaymentMethod: paymentService.deletePaymentMethod.bind(paymentService),
    setDefaultPaymentMethod: paymentService.setDefaultPaymentMethod.bind(paymentService),
    getBillingHistory: paymentService.getBillingHistory.bind(paymentService),
    getUsageHistory: paymentService.getUsageHistory.bind(paymentService),
    purchaseCredits: paymentService.purchaseCredits.bind(paymentService),
    confirmPayment: paymentService.confirmPayment.bind(paymentService),
    confirmSetupIntent: paymentService.confirmSetupIntent.bind(paymentService),
    createElements: paymentService.createElements.bind(paymentService),
    formatCurrency: paymentService.formatCurrency.bind(paymentService),
    formatCardDisplay: paymentService.formatCardDisplay.bind(paymentService),
    getCardBrandName: paymentService.getCardBrandName.bind(paymentService),
    isPaymentMethodExpired: paymentService.isPaymentMethodExpired.bind(paymentService)
  };
};

export default paymentService;