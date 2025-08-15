/**
 * Mock data service for usage limit components testing
 * Provides realistic data for development and testing
 */

import { 
  UsageData, 
  UsageHistory, 
  UsageStats, 
  UsageAlert, 
  UsagePlan, 
  UsageMockData 
} from '@/types/usage';

class UsageMockDataService implements UsageMockData {
  private static instance: UsageMockDataService;

  static getInstance(): UsageMockDataService {
    if (!UsageMockDataService.instance) {
      UsageMockDataService.instance = new UsageMockDataService();
    }
    return UsageMockDataService.instance;
  }

  generateUsageData(overrides: Partial<UsageData> = {}): UsageData {
    const currentDate = new Date();
    const nextMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
    const daysUntilReset = Math.ceil((nextMonth.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24));
    
    const defaultData: UsageData = {
      creditsUsed: 22,
      creditsTotal: 30,
      currentMonth: currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
      resetDate: nextMonth.toLocaleDateString('en-US', { 
        month: 'long', 
        day: 'numeric',
        year: 'numeric'
      }),
      daysUntilReset,
      isNearLimit: false,
      isAtLimit: false
    };

    const usage = { ...defaultData, ...overrides };
    
    // Calculate threshold states
    const utilizationRate = usage.creditsUsed / usage.creditsTotal;
    usage.isNearLimit = utilizationRate >= 0.8;
    usage.isAtLimit = utilizationRate >= 1.0;

    return usage;
  }

  generateUsageHistory(months: number = 6): UsageHistory[] {
    const history: UsageHistory[] = [];
    const currentDate = new Date();
    
    for (let i = months - 1; i >= 0; i--) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
      const creditsTotal = 30;
      const creditsUsed = Math.floor(Math.random() * creditsTotal) + Math.floor(creditsTotal * 0.3);
      
      history.push({
        month: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        creditsUsed: Math.min(creditsUsed, creditsTotal),
        creditsTotal,
        utilizationRate: Math.min(creditsUsed / creditsTotal * 100, 100)
      });
    }

    return history;
  }

  generateUsageStats(): UsageStats {
    return {
      totalTranscriptions: 89,
      totalMinutesProcessed: 1247,
      averageAccuracy: 87.3,
      favoriteFormat: 'SRT',
      mostActiveDay: 'Tuesday'
    };
  }

  generateUsageAlerts(usage: UsageData): UsageAlert[] {
    const alerts: UsageAlert[] = [];

    if (usage.isAtLimit) {
      alerts.push({
        id: 'limit_reached',
        type: 'limit_reached',
        title: 'Monthly Limit Reached',
        message: `You've used all ${usage.creditsTotal} credits for ${usage.currentMonth}. Your usage will reset on ${usage.resetDate}.`,
        actionText: 'Join Waitlist',
        actionUrl: '/waitlist',
        dismissible: false,
        priority: 'high'
      });
    } else if (usage.isNearLimit) {
      const remaining = usage.creditsTotal - usage.creditsUsed;
      alerts.push({
        id: 'usage_warning',
        type: 'warning',
        title: 'Approaching Monthly Limit',
        message: `You have ${remaining} credit${remaining === 1 ? '' : 's'} remaining until ${usage.resetDate}.`,
        actionText: 'Upgrade Plan',
        actionUrl: '/pricing',
        dismissible: true,
        priority: 'medium'
      });
    }

    if (usage.daysUntilReset <= 3) {
      alerts.push({
        id: 'reset_soon',
        type: 'reset_soon',
        title: 'Usage Resets Soon',
        message: `Your monthly credits reset in ${usage.daysUntilReset} day${usage.daysUntilReset === 1 ? '' : 's'}.`,
        dismissible: true,
        priority: 'low'
      });
    }

    return alerts;
  }

  generateUsagePlans(currentPlanId: string = 'learner'): UsagePlan[] {
    return [
      {
        id: 'learner',
        name: 'Learner',
        creditsPerMonth: 30,
        pricePerMonth: 0,
        features: [
          '30 transcription credits/month',
          'Basic accuracy',
          'Standard export formats',
          'Community support'
        ],
        isCurrentPlan: currentPlanId === 'learner'
      },
      {
        id: 'learner_pro',
        name: 'Learner Pro',
        creditsPerMonth: 100,
        pricePerMonth: 19,
        features: [
          '100 transcription credits/month',
          'Enhanced accuracy',
          'All export formats',
          'Priority support',
          'Bulk processing',
          'Advanced features'
        ],
        isCurrentPlan: currentPlanId === 'learner_pro',
        isRecommended: true
      },
      {
        id: 'educator',
        name: 'Educator',
        creditsPerMonth: 300,
        pricePerMonth: 49,
        features: [
          '300 transcription credits/month',
          'Maximum accuracy',
          'All premium features',
          'Educational discounts',
          'Team collaboration',
          'Custom integrations'
        ],
        isCurrentPlan: currentPlanId === 'educator'
      }
    ];
  }

  // Helper methods for specific scenarios
  generateNearLimitUsage(): UsageData {
    return this.generateUsageData({
      creditsUsed: 25,
      creditsTotal: 30
    });
  }

  generateAtLimitUsage(): UsageData {
    return this.generateUsageData({
      creditsUsed: 30,
      creditsTotal: 30
    });
  }

  generateLowUsage(): UsageData {
    return this.generateUsageData({
      creditsUsed: 8,
      creditsTotal: 30
    });
  }
}

// Export singleton instance
export const usageMockData = UsageMockDataService.getInstance();

// React hook for usage mock data
export const useUsageMockData = () => {
  return {
    generateUsageData: usageMockData.generateUsageData.bind(usageMockData),
    generateUsageHistory: usageMockData.generateUsageHistory.bind(usageMockData),
    generateUsageStats: usageMockData.generateUsageStats.bind(usageMockData),
    generateUsageAlerts: usageMockData.generateUsageAlerts.bind(usageMockData),
    generateUsagePlans: usageMockData.generateUsagePlans.bind(usageMockData),
    generateNearLimitUsage: usageMockData.generateNearLimitUsage.bind(usageMockData),
    generateAtLimitUsage: usageMockData.generateAtLimitUsage.bind(usageMockData),
    generateLowUsage: usageMockData.generateLowUsage.bind(usageMockData)
  };
};

export default usageMockData;