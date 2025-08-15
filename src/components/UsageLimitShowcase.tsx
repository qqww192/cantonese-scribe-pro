/**
 * UsageLimitShowcase.tsx - Demo/test page for all usage limit components
 * Shows different scenarios and states for development and testing
 */

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
// import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'; // Not available
import { Separator } from '@/components/ui/separator';

// Import all usage components
import UsageDashboard from './UsageDashboard';
import UsageWarning from './UsageWarning';
import LimitReachedScreen from './LimitReachedScreen';
import WaitlistPrompt from './WaitlistPrompt';
import UsageWidget from './UsageWidget';

// Import services and types
import { useUsageMockData } from '@/services/usageMockData';
import { UsageData } from '@/types/usage';

const UsageLimitShowcase: React.FC = () => {
  const [scenario, setScenario] = useState<'low' | 'near_limit' | 'at_limit'>('near_limit');
  const [activeTab, setActiveTab] = useState<'dashboard' | 'warning' | 'limit' | 'waitlist' | 'widget'>('dashboard');
  const mockData = useUsageMockData();

  const getUsageData = (scenarioType: string): UsageData => {
    switch (scenarioType) {
      case 'low':
        return mockData.generateLowUsage();
      case 'near_limit':
        return mockData.generateNearLimitUsage();
      case 'at_limit':
        return mockData.generateAtLimitUsage();
      default:
        return mockData.generateUsageData();
    }
  };

  const usageData = getUsageData(scenario);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Usage Limit Components Showcase
          </h1>
          <p className="text-gray-600">
            Interactive demo of all usage limit UX components with different scenarios
          </p>
        </div>

        {/* Scenario Selector */}
        <Card>
          <CardHeader>
            <CardTitle>Test Scenarios</CardTitle>
            <CardDescription>
              Switch between different usage scenarios to see how components adapt
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3">
              <Button
                variant={scenario === 'low' ? 'default' : 'outline'}
                onClick={() => setScenario('low')}
                size="sm"
              >
                Low Usage (8/30)
              </Button>
              <Button
                variant={scenario === 'near_limit' ? 'default' : 'outline'}
                onClick={() => setScenario('near_limit')}
                size="sm"
              >
                Near Limit (25/30)
              </Button>
              <Button
                variant={scenario === 'at_limit' ? 'default' : 'outline'}
                onClick={() => setScenario('at_limit')}
                size="sm"
              >
                At Limit (30/30)
              </Button>
            </div>

            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <h4 className="font-semibold mb-2">Current Scenario:</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Credits Used:</span>
                  <div className="font-medium">{usageData.creditsUsed}/{usageData.creditsTotal}</div>
                </div>
                <div>
                  <span className="text-gray-600">Utilization:</span>
                  <div className="font-medium">
                    {((usageData.creditsUsed / usageData.creditsTotal) * 100).toFixed(0)}%
                  </div>
                </div>
                <div>
                  <span className="text-gray-600">Status:</span>
                  <div>
                    <Badge 
                      variant={usageData.isAtLimit ? 'destructive' : usageData.isNearLimit ? 'secondary' : 'default'}
                    >
                      {usageData.isAtLimit ? 'At Limit' : usageData.isNearLimit ? 'Near Limit' : 'Normal'}
                    </Badge>
                  </div>
                </div>
                <div>
                  <span className="text-gray-600">Reset:</span>
                  <div className="font-medium">{usageData.daysUntilReset}d</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Component Showcase */}
        <Card>
          <CardHeader>
            <CardTitle>Component Showcase</CardTitle>
            <CardDescription>
              Interactive demo of all usage limit components
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2 mb-6">
              {[
                { key: 'dashboard', label: 'Dashboard' },
                { key: 'warning', label: 'Warning' },
                { key: 'limit', label: 'Limit Screen' },
                { key: 'waitlist', label: 'Waitlist' },
                { key: 'widget', label: 'Widget' }
              ].map(({ key, label }) => (
                <Button
                  key={key}
                  variant={activeTab === key ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setActiveTab(key as any)}
                >
                  {label}
                </Button>
              ))}
            </div>

            {activeTab === 'dashboard' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-2">UsageDashboard Component</h3>
                  <p className="text-gray-600 text-sm mb-4">
                    Comprehensive usage tracking dashboard with statistics and plan management
                  </p>
                  <UsageDashboard 
                    showUpgradePrompt={true}
                    onUpgradeClick={() => alert('Upgrade clicked!')}
                  />
                </div>
              </div>
            )}

            {activeTab === 'warning' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-2">UsageWarning Component</h3>
                  <p className="text-gray-600 text-sm mb-4">
                    Warning notifications in different variants and configurations
                  </p>
                  
                  {/* Inline Warning */}
                  <div className="mb-6">
                    <h4 className="font-semibold mb-3">Inline Variant</h4>
                    <UsageWarning 
                      usage={usageData}
                      variant="inline"
                      showProgress={true}
                      onActionClick={() => alert('Action clicked!')}
                    />
                  </div>

                  <Separator className="my-6" />

                  {/* Banner Warning */}
                  <div className="mb-6">
                    <h4 className="font-semibold mb-3">Banner Variant</h4>
                    <UsageWarning 
                      usage={usageData}
                      variant="banner"
                      showProgress={true}
                      onActionClick={() => alert('Action clicked!')}
                    />
                  </div>

                  <Separator className="my-6" />

                  {/* Toast Warning (positioned demo) */}
                  <div>
                    <h4 className="font-semibold mb-3">Toast Variant (Demo)</h4>
                    <div className="relative bg-gray-100 p-8 rounded-lg">
                      <p className="text-sm text-gray-600 mb-4">
                        Toast warnings appear in the top-right corner:
                      </p>
                      <UsageWarning 
                        usage={usageData}
                        variant="toast"
                        showProgress={false}
                        className="relative top-0 right-0"
                        onActionClick={() => alert('Action clicked!')}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'limit' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-2">LimitReachedScreen Component</h3>
                  <p className="text-gray-600 text-sm mb-4">
                    Full blocking screen when users reach their usage limits
                  </p>
                  <div className="border rounded-lg overflow-hidden">
                    <LimitReachedScreen 
                      usage={mockData.generateAtLimitUsage()}
                      onRefresh={() => alert('Refresh clicked!')}
                      allowOverride={true}
                      showPlans={true}
                      showWaitlist={true}
                      className="min-h-[500px]"
                    />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'waitlist' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-2">WaitlistPrompt Component</h3>
                  <p className="text-gray-600 text-sm mb-4">
                    Conversion prompts for different waitlist signup scenarios
                  </p>
                  
                  <div className="space-y-8">
                    <div>
                      <h4 className="font-semibold mb-3">Usage Limit Source</h4>
                      <div className="border rounded-lg p-4">
                        <WaitlistPrompt 
                          source="usage_limit"
                          variant="inline"
                          onSuccess={() => alert('Signup successful!')}
                          onClose={() => alert('Prompt closed')}
                        />
                      </div>
                    </div>

                    <Separator />

                    <div>
                      <h4 className="font-semibold mb-3">Feature Upgrade Source</h4>
                      <div className="border rounded-lg p-4">
                        <WaitlistPrompt 
                          source="feature_upgrade"
                          variant="inline"
                          onSuccess={() => alert('Signup successful!')}
                          onClose={() => alert('Prompt closed')}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'widget' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-2">UsageWidget Component</h3>
                  <p className="text-gray-600 text-sm mb-4">
                    Compact widgets for headers, sidebars, and dashboards
                  </p>
                  
                  {/* Compact Widget */}
                  <div className="mb-6">
                    <h4 className="font-semibold mb-3">Compact Widget (Header)</h4>
                    <div className="border rounded-lg p-4 bg-gray-50">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Header Navigation:</span>
                        <UsageWidget 
                          usage={usageData}
                          compact={true}
                          onClick={() => alert('Widget clicked!')}
                        />
                      </div>
                    </div>
                  </div>

                  <Separator className="my-6" />

                  {/* Expanded Widget */}
                  <div>
                    <h4 className="font-semibold mb-3">Expanded Widget (Dashboard)</h4>
                    <div className="max-w-sm">
                      <UsageWidget 
                        usage={usageData}
                        compact={false}
                        showDetails={true}
                        onClick={() => alert('Widget clicked!')}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Integration Notes */}
        <Card>
          <CardHeader>
            <CardTitle>Integration Notes</CardTitle>
            <CardDescription>
              Key implementation details and usage guidelines
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold mb-2">Component Features</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Responsive design for all screen sizes</li>
                  <li>• Accessible with proper ARIA labels</li>
                  <li>• TypeScript interfaces for type safety</li>
                  <li>• Integration with waitlist service</li>
                  <li>• Mock data service for testing</li>
                  <li>• Real-time usage tracking support</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Usage Flow</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Widget shows in header at all times</li>
                  <li>• Warning appears at 80% usage</li>
                  <li>• Blocking screen at 100% usage</li>
                  <li>• Waitlist prompts for conversion</li>
                  <li>• Dashboard for detailed analytics</li>
                  <li>• Seamless upgrade flow integration</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default UsageLimitShowcase;