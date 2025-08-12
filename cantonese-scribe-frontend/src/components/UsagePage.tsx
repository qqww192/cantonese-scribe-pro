import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Clock, 
  VideoIcon, 
  Package,
  CheckCircle,
  AlertCircle,
  History,
  ShoppingCart,
  PlayCircle
} from "lucide-react";

const UsagePage = () => {
  // Mock user usage data
  const [userUsage, setUserUsage] = useState({
    videosProcessed: 8,
    totalMinutes: 127,
    monthlyVideoLimit: 25,
    monthlyMinuteLimit: 1500, // 25 hours
    plan: "Learner Pro",
    availableMinutes: 1373 // 1500 - 127
  });

  // Transcription packages based on time
  const packages = [
    {
      id: 'package-30min',
      duration: 30,
      price: 1.5,
      popular: false,
      description: 'Perfect for short videos and clips',
      estimatedVideos: '5-10 videos'
    },
    {
      id: 'package-60min',
      duration: 60,
      price: 2.5,
      popular: true,
      description: 'Great for medium-length content',
      estimatedVideos: '10-20 videos'
    },
    {
      id: 'package-90min',
      duration: 90,
      price: 3.0,
      popular: false,
      description: 'Best value for longer videos',
      estimatedVideos: '15-30 videos'
    }
  ];

  // Recent processing history
  const processingHistory = [
    {
      id: 1,
      type: 'processed',
      title: 'Hong Kong News Broadcast',
      duration: 4.53, // 4:32 in minutes
      date: '2024-01-15T14:30:00',
      url: 'https://youtube.com/watch?v=TlC0SSeRNXc'
    },
    {
      id: 2,
      type: 'processed',
      title: 'Cantonese Conversation Practice',
      duration: 12.25, // 12:15 in minutes
      date: '2024-01-14T10:15:00',
      url: 'https://youtube.com/watch?v=abc123'
    },
    {
      id: 3,
      type: 'purchased',
      title: '1 Hour Transcription Package',
      duration: 60,
      date: '2024-01-13T16:20:00',
      price: '£2.50'
    },
    {
      id: 4,
      type: 'processed',
      title: 'Traditional Cantonese Song',
      duration: 3.75, // 3:45 in minutes
      date: '2024-01-12T16:20:00',
      url: 'https://youtube.com/watch?v=xyz789'
    }
  ];

  const formatMinutes = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

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
      `Purchase ${packageItem.duration} minutes transcription package for £${packageItem.price}?\n\n` +
      `You will receive ${packageItem.duration} minutes of transcription time.\n` +
      `Estimated: ${packageItem.estimatedVideos}`
    );
    
    if (confirmed) {
      setUserUsage(prev => ({
        ...prev,
        availableMinutes: prev.availableMinutes + packageItem.duration,
        monthlyMinuteLimit: prev.monthlyMinuteLimit + packageItem.duration
      }));
      
      alert(`Successfully purchased ${packageItem.duration} minutes package!\n${packageItem.duration} minutes added to your account.`);
    }
  };

  const videoUsagePercentage = (userUsage.videosProcessed / userUsage.monthlyVideoLimit) * 100;
  const minuteUsagePercentage = (userUsage.totalMinutes / userUsage.monthlyMinuteLimit) * 100;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Usage & Transcription Time</h1>
          <p className="text-gray-600 mt-2">
            Monitor your video processing and purchase additional transcription time
          </p>
        </div>

        {/* Current Usage Overview */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Videos Processed</CardTitle>
              <VideoIcon className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600">{userUsage.videosProcessed}</div>
              <p className="text-xs text-gray-500">of {userUsage.monthlyVideoLimit} this month</p>
              <Progress value={videoUsagePercentage} className="mt-2" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Minutes Used</CardTitle>
              <Clock className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-orange-600">{userUsage.totalMinutes}</div>
              <p className="text-xs text-gray-500">of {userUsage.monthlyMinuteLimit} minutes</p>
              <Progress value={minuteUsagePercentage} className="mt-2" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Available Time</CardTitle>
              <PlayCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {formatMinutes(userUsage.availableMinutes)}
              </div>
              <p className="text-xs text-gray-500">Ready to use</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Current Plan</CardTitle>
              <Badge variant="secondary" className="bg-purple-100 text-purple-800">
                {userUsage.plan}
              </Badge>
            </CardHeader>
            <CardContent>
              <div className="text-sm font-medium text-green-600">Active</div>
              <p className="text-xs text-gray-500">Subscription active</p>
            </CardContent>
          </Card>
        </div>

        {/* Purchase Transcription Time */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              Buy Transcription Time
            </CardTitle>
            <CardDescription>
              Purchase additional transcription minutes for processing more videos
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
                      {pkg.duration} minutes
                    </h3>
                    
                    <div className="text-3xl font-bold text-orange-600 mb-1">
                      £{pkg.price}
                    </div>
                    
                    <div className="text-sm text-gray-600 mb-4">
                      {pkg.estimatedVideos}
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
                      Purchase {pkg.duration}m
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <h4 className="text-sm font-medium text-blue-900">How Transcription Time Works</h4>
                  <ul className="text-sm text-blue-700 mt-2 space-y-1">
                    <li>• Purchase minutes to transcribe any length of YouTube videos</li>
                    <li>• 1 minute of transcription = 1 minute of video content</li>
                    <li>• Minutes never expire and roll over each month</li>
                    <li>• Process unlimited number of videos within your minute allowance</li>
                    <li>• All formats included: Chinese, Yale, Jyutping, English</li>
                  </ul>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Usage History */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Processing History
            </CardTitle>
            <CardDescription>
              Your recent video processing and purchases
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {processingHistory.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-4">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      item.type === 'processed' 
                        ? 'bg-blue-100 text-blue-600' 
                        : 'bg-green-100 text-green-600'
                    }`}>
                      {item.type === 'processed' ? <VideoIcon className="h-4 w-4" /> : <ShoppingCart className="h-4 w-4" />}
                    </div>
                    
                    <div>
                      <div className="font-medium text-gray-900">
                        {item.title}
                      </div>
                      <div className="text-sm text-gray-500">
                        {formatDate(item.date)}
                        {item.url && (
                          <span className="ml-2 text-blue-600 underline cursor-pointer" 
                                onClick={() => window.open(item.url, '_blank')}>
                            View Video
                          </span>
                        )}
                        {item.price && ` • ${item.price}`}
                      </div>
                    </div>
                  </div>
                  
                  <div className={`text-right ${
                    item.type === 'purchased' ? 'text-green-600' : 'text-blue-600'
                  }`}>
                    <div className="font-medium">
                      {item.type === 'purchased' ? '+' : ''}{formatMinutes(item.duration)}
                    </div>
                    <div className="text-xs text-gray-500">
                      {item.type === 'processed' ? 'Used' : 'Purchased'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Low Minutes Warning */}
        {userUsage.availableMinutes <= 30 && (
          <Card className="border-amber-200 bg-amber-50">
            <CardContent className="p-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
                <div>
                  <h3 className="font-medium text-amber-900">Low Transcription Time Warning</h3>
                  <p className="text-sm text-amber-700 mt-1">
                    You only have {formatMinutes(userUsage.availableMinutes)} of transcription time remaining. 
                    Purchase more minutes above to continue processing videos.
                  </p>
                  <Button
                    onClick={() => handlePurchase(packages[1])} // Default to 1 hour package
                    className="mt-3 bg-amber-600 hover:bg-amber-700 text-white"
                    size="sm"
                  >
                    Buy More Time
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

export default UsagePage;