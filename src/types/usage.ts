/**
 * TypeScript interfaces for usage tracking and limits
 * Used across usage components for consistent data structures
 */

export interface UsageData {
  creditsUsed: number;
  creditsTotal: number;
  currentMonth: string;
  resetDate: string;
  daysUntilReset: number;
  isNearLimit: boolean; // 80%+ usage
  isAtLimit: boolean; // 100% usage
}

export interface UsageHistory {
  month: string;
  creditsUsed: number;
  creditsTotal: number;
  utilizationRate: number; // percentage
}

export interface UsageStats {
  totalTranscriptions: number;
  totalMinutesProcessed: number;
  averageAccuracy: number;
  favoriteFormat: string;
  mostActiveDay: string;
}

export interface UsagePlan {
  id: string;
  name: string;
  creditsPerMonth: number;
  pricePerMonth: number;
  features: string[];
  isCurrentPlan: boolean;
  isRecommended?: boolean;
}

export interface UsageAlert {
  id: string;
  type: 'warning' | 'limit_reached' | 'reset_soon';
  title: string;
  message: string;
  actionText?: string;
  actionUrl?: string;
  dismissible: boolean;
  priority: 'low' | 'medium' | 'high';
}

export interface UsageWidgetProps {
  usage: UsageData;
  compact?: boolean;
  showDetails?: boolean;
  onClick?: () => void;
}

export interface WaitlistConversionData {
  source: 'usage_limit' | 'feature_upgrade' | 'plan_comparison';
  currentPlan: string;
  desiredFeatures?: string[];
  urgency: 'low' | 'medium' | 'high';
}

export interface UsageLimitConfig {
  warningThreshold: number; // percentage (default 80)
  blockingThreshold: number; // percentage (default 100)
  enableSoftBlocking: boolean; // allow overages with warning
  gracePeriodDays: number; // days after limit before hard block
}

// Mock data generator interface
export interface UsageMockData {
  generateUsageData: (overrides?: Partial<UsageData>) => UsageData;
  generateUsageHistory: (months: number) => UsageHistory[];
  generateUsageStats: () => UsageStats;
  generateUsageAlerts: (usage: UsageData) => UsageAlert[];
  generateUsagePlans: (currentPlanId: string) => UsagePlan[];
}