import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Clock, 
  CreditCard, 
  Package,
  CheckCircle,
  AlertCircle,
  History
} from "lucide-react";

const CreditsPage = () => {
  // Mock user data
  const [userCredits, setUserCredits] = useState({
    current: 5,
    monthlyLimit: 25,
    totalUsed: 8,
    minutesUsed: 127,
    minutesLimit: 1500, // 25 hours
    plan: "Learner Pro"
  });

  // Transcription packages
  const packages = [
    {
      id: 'package-30min',
      duration: '30 minutes',
      credits: 5,
      price: 1.5,
      popular: false,
      description: 'Perfect for short videos and clips'
    },
    {
      id: 'package-1hour',
      duration: '1 hour',
      credits: 10,
      price: 2.5,
      popular: true,
      description: 'Great for medium-length content'
    },
    {
      id: 'package-1.5hour',
      duration: '1.5 hours',
      credits: 15,
      price: 3.0,
      popular: false,
      description: 'Best value for longer videos'
    }
  ];

  // Recent credit transactions
  const creditHistory = [
    {
      id: 1,
      type: 'used',
      amount: -1,
      description: 'Hong Kong News Broadcast',
      date: '2024-01-15T14:30:00',
      duration: '4:32'
    },
    {
      id: 2,
      type: 'used',
      amount: -2,
      description: 'Cantonese Conversation Practice',
      date: '2024-01-14T10:15:00',
      duration: '12:15'
    },
    {
      id: 3,
      type: 'purchased',
      amount: 10,
      description: '1 Hour Transcription Package',
      date: '2024-01-13T16:20:00',
      price: '£2.50'
    },
    {
      id: 4,
      type: 'used',
      amount: -1,
      description: 'Traditional Cantonese Song',
      date: '2024-01-12T16:20:00',
      duration: '3:45'
    }
  ];

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handlePurchase = (packageItem: typeof packages[0]) => {
    // Simulate purchase process
    const confirmed = confirm(
      `Purchase ${packageItem.duration} transcription package for £${packageItem.price}?\n\n` +
      `You will receive ${packageItem.credits} credits.`
    );
    
    if (confirmed) {
      setUserCredits(prev => ({
        ...prev,
        current: prev.current + packageItem.credits
      }));
      
      alert(`Successfully purchased ${packageItem.duration} package!\n${packageItem.credits} credits added to your account.`);
    }
  };

  const creditUsagePercentage = (userCredits.totalUsed / userCredits.monthlyLimit) * 100;
  const minutesUsagePercentage = (userCredits.minutesUsed / userCredits.minutesLimit) * 100;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Credits & Usage</h1>
          <p className="text-gray-600 mt-2">
            Manage your transcription credits and view usage statistics
          </p>
        </div>

        {/* Current Credits Overview */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Available Credits</CardTitle>
              <CreditCard className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">{userCredits.current}</div>
              <p className="text-xs text-gray-500">Ready to use</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Monthly Usage</CardTitle>
              <Package className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{userCredits.totalUsed}</div>
              <p className="text-xs text-gray-500">of {userCredits.monthlyLimit} videos</p>
              <Progress value={creditUsagePercentage} className="mt-2" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Minutes Used</CardTitle>
              <Clock className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{userCredits.minutesUsed}</div>
              <p className="text-xs text-gray-500">of {userCredits.minutesLimit} minutes</p>
              <Progress value={minutesUsagePercentage} className="mt-2" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Current Plan</CardTitle>
              <Badge variant="secondary" className="bg-purple-100 text-purple-800">
                {userCredits.plan}
              </Badge>
            </CardHeader>
            <CardContent>
              <div className="text-sm font-medium text-green-600">Active</div>
              <p className="text-xs text-gray-500">Subscription active</p>
            </CardContent>
          </Card>
        </div>

        {/* Purchase Transcription Hours */}
        <Card>
          <CardHeader>
            <CardTitle>Buy Transcription Hours</CardTitle>
            <CardDescription>
              Purchase additional transcription time with instant credit delivery
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              {packages.map((pkg) => (
                <div
                  key={pkg.id}
                  className={`relative p-6 border rounded-lg transition-all hover:shadow-md ${
                    pkg.popular 
                      ? 'border-orange-500 bg-orange-50' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {pkg.popular && (
                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                      <Badge className="bg-orange-600 text-white">Most Popular</Badge>
                    </div>
                  )}
                  
                  <div className="text-center">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      {pkg.duration}
                    </h3>
                    
                    <div className="text-3xl font-bold text-orange-600 mb-1">
                      £{pkg.price}
                    </div>
                    
                    <div className="text-sm text-gray-600 mb-4">
                      {pkg.credits} credits
                    </div>
                    
                    <p className="text-sm text-gray-500 mb-6">
                      {pkg.description}
                    </p>
                    
                    <Button
                      onClick={() => handlePurchase(pkg)}
                      className={`w-full ${
                        pkg.popular 
                          ? 'bg-orange-600 hover:bg-orange-700 text-white' 
                          : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                      }`}
                    >
                      Purchase Package
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <h4 className="text-sm font-medium text-blue-900">How Credits Work</h4>
                  <ul className="text-sm text-blue-700 mt-2 space-y-1">
                    <li>• 1 credit = ~6 minutes of video transcription</li>
                    <li>• Credits never expire and roll over each month</li>
                    <li>• Instant delivery - use immediately after purchase</li>
                    <li>• All formats included: Chinese, Yale, Jyutping, English</li>
                  </ul>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Credit History */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Credit History
            </CardTitle>
            <CardDescription>
              Your recent credit transactions and usage
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {creditHistory.map((transaction) => (
                <div key={transaction.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-4">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      transaction.type === 'used' 
                        ? 'bg-red-100 text-red-600' 
                        : 'bg-green-100 text-green-600'
                    }`}>
                      {transaction.type === 'used' ? '-' : '+'}
                    </div>
                    
                    <div>
                      <div className="font-medium text-gray-900">
                        {transaction.description}
                      </div>
                      <div className="text-sm text-gray-500">
                        {formatDate(transaction.date)}
                        {transaction.duration && ` • ${transaction.duration} duration`}
                        {transaction.price && ` • ${transaction.price}`}
                      </div>
                    </div>
                  </div>
                  
                  <div className={`text-right ${
                    transaction.amount > 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    <div className="font-medium">
                      {transaction.amount > 0 ? '+' : ''}{transaction.amount} credits
                    </div>
                    <div className="text-xs text-gray-500">
                      {transaction.type === 'used' ? 'Used' : 'Purchased'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Low Credit Warning */}
        {userCredits.current <= 2 && (
          <Card className="border-amber-200 bg-amber-50">
            <CardContent className="p-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
                <div>
                  <h3 className="font-medium text-amber-900">Low Credit Warning</h3>
                  <p className="text-sm text-amber-700 mt-1">
                    You only have {userCredits.current} credits remaining. Purchase more credits above to continue transcribing videos.
                  </p>
                  <Button
                    onClick={() => handlePurchase(packages[1])} // Default to 1 hour package
                    className="mt-3 bg-amber-600 hover:bg-amber-700 text-white"
                    size="sm"
                  >
                    Buy More Credits
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default CreditsPage;