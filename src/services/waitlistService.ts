/**
 * Waitlist service for CantoneseScribe MVP
 * Handles Pro tier waitlist signup and management
 */

import { apiClient, APIError } from './api';

// Types
export interface WaitlistSignup {
  email: string;
  plan_id: string;
  user_id?: string;
  source: string; // 'pricing_page', 'usage_limit', 'feature_request', etc.
  metadata?: Record<string, any>;
}

export interface WaitlistStatus {
  is_on_waitlist: boolean;
  signup_date?: string;
  plan_id?: string;
  position?: number;
  estimated_launch?: string;
}

export interface WaitlistStats {
  total_signups: number;
  plan_breakdown: Record<string, number>;
  recent_signups: number; // last 7 days
}

// Waitlist service class
class WaitlistService {
  private static instance: WaitlistService;

  static getInstance(): WaitlistService {
    if (!WaitlistService.instance) {
      WaitlistService.instance = new WaitlistService();
    }
    return WaitlistService.instance;
  }

  /**
   * Sign up for Pro waitlist
   */
  async signupForWaitlist(signup: WaitlistSignup): Promise<{ success: boolean; position?: number }> {
    try {
      const response = await apiClient.post('/waitlist/signup', signup);
      
      // Store local indication for better UX
      localStorage.setItem('waitlist_signup', JSON.stringify({
        email: signup.email,
        plan_id: signup.plan_id,
        signup_date: new Date().toISOString()
      }));
      
      return response;
    } catch (error) {
      console.error('Failed to signup for waitlist:', error);
      
      // Fallback to local storage for offline/API failure cases
      const localSignup = {
        email: signup.email,
        plan_id: signup.plan_id,
        signup_date: new Date().toISOString(),
        offline: true
      };
      
      localStorage.setItem('waitlist_signup', JSON.stringify(localSignup));
      
      throw error;
    }
  }

  /**
   * Check waitlist status for current user or email
   */
  async getWaitlistStatus(email?: string): Promise<WaitlistStatus> {
    try {
      const params = email ? { email } : {};
      return await apiClient.get<WaitlistStatus>('/waitlist/status', params);
    } catch (error) {
      console.error('Failed to get waitlist status:', error);
      
      // Check local storage as fallback
      const localSignup = localStorage.getItem('waitlist_signup');
      if (localSignup) {
        const parsed = JSON.parse(localSignup);
        return {
          is_on_waitlist: true,
          signup_date: parsed.signup_date,
          plan_id: parsed.plan_id,
          estimated_launch: 'Q2 2025'
        };
      }
      
      return { is_on_waitlist: false };
    }
  }

  /**
   * Update waitlist preferences
   */
  async updateWaitlistPreferences(preferences: {
    email_notifications?: boolean;
    sms_notifications?: boolean;
    feature_interests?: string[];
  }): Promise<void> {
    try {
      await apiClient.patch('/waitlist/preferences', preferences);
    } catch (error) {
      console.error('Failed to update waitlist preferences:', error);
      throw error;
    }
  }

  /**
   * Remove from waitlist
   */
  async removeFromWaitlist(email?: string): Promise<void> {
    try {
      const params = email ? { email } : {};
      await apiClient.delete('/waitlist/remove', { data: params });
      
      // Clear local storage
      localStorage.removeItem('waitlist_signup');
    } catch (error) {
      console.error('Failed to remove from waitlist:', error);
      throw error;
    }
  }

  /**
   * Get waitlist statistics (for admin/marketing)
   */
  async getWaitlistStats(): Promise<WaitlistStats> {
    try {
      return await apiClient.get<WaitlistStats>('/waitlist/stats');
    } catch (error) {
      console.error('Failed to get waitlist stats:', error);
      throw error;
    }
  }

  /**
   * Send notification to waitlist about updates
   */
  async sendWaitlistUpdate(update: {
    subject: string;
    message: string;
    plan_ids?: string[];
    segment?: 'all' | 'recent' | 'high_engagement';
  }): Promise<{ sent_count: number }> {
    try {
      return await apiClient.post('/waitlist/notify', update);
    } catch (error) {
      console.error('Failed to send waitlist update:', error);
      throw error;
    }
  }

  /**
   * Check if user has already signed up for waitlist
   */
  isOnWaitlist(): boolean {
    const localSignup = localStorage.getItem('waitlist_signup');
    return !!localSignup;
  }

  /**
   * Get local waitlist signup info
   */
  getLocalWaitlistInfo(): WaitlistSignup | null {
    const localSignup = localStorage.getItem('waitlist_signup');
    if (localSignup) {
      try {
        return JSON.parse(localSignup);
      } catch (error) {
        console.error('Failed to parse local waitlist signup:', error);
        localStorage.removeItem('waitlist_signup');
      }
    }
    return null;
  }

  /**
   * Track waitlist interaction events
   */
  async trackWaitlistEvent(event: {
    action: 'signup' | 'view_pricing' | 'feature_request' | 'share';
    plan_id?: string;
    source?: string;
    metadata?: Record<string, any>;
  }): Promise<void> {
    try {
      await apiClient.post('/waitlist/track', {
        ...event,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      // Don't fail the main flow for tracking errors
      console.warn('Failed to track waitlist event:', error);
    }
  }

  /**
   * Generate referral link for waitlist sharing
   */
  generateReferralLink(email: string): string {
    const baseUrl = window.location.origin;
    const referralCode = btoa(email).slice(0, 8);
    return `${baseUrl}/pricing?ref=${referralCode}`;
  }

  /**
   * Process referral signup
   */
  async processReferral(referralCode: string, newSignup: WaitlistSignup): Promise<void> {
    try {
      await apiClient.post('/waitlist/referral', {
        referral_code: referralCode,
        new_signup: newSignup
      });
    } catch (error) {
      console.error('Failed to process referral:', error);
      // Don't fail the main signup for referral processing errors
    }
  }
}

// Export singleton instance
export const waitlistService = WaitlistService.getInstance();

// React hook for waitlist operations
export const useWaitlist = () => {
  return {
    signupForWaitlist: waitlistService.signupForWaitlist.bind(waitlistService),
    getWaitlistStatus: waitlistService.getWaitlistStatus.bind(waitlistService),
    updateWaitlistPreferences: waitlistService.updateWaitlistPreferences.bind(waitlistService),
    removeFromWaitlist: waitlistService.removeFromWaitlist.bind(waitlistService),
    getWaitlistStats: waitlistService.getWaitlistStats.bind(waitlistService),
    sendWaitlistUpdate: waitlistService.sendWaitlistUpdate.bind(waitlistService),
    isOnWaitlist: waitlistService.isOnWaitlist.bind(waitlistService),
    getLocalWaitlistInfo: waitlistService.getLocalWaitlistInfo.bind(waitlistService),
    trackWaitlistEvent: waitlistService.trackWaitlistEvent.bind(waitlistService),
    generateReferralLink: waitlistService.generateReferralLink.bind(waitlistService),
    processReferral: waitlistService.processReferral.bind(waitlistService)
  };
};

export default waitlistService;