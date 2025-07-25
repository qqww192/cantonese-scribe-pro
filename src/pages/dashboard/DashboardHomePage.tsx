import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from 'react-router-dom';
import { 
  Upload, 
  BarChart3, 
  FileText, 
  Zap, 
  Clock,
  CheckCircle,
  ArrowRight,
  Youtube
} from "lucide-react";

export const DashboardHomePage = () => {
  const navigate = useNavigate();

  const quickStats = [
    {
      title: "Files Processed",
      value: "23",
      change: "+3 this week",
      icon: FileText,
      color: "text-blue-600"
    },
    {
      title: "Minutes Transcribed",
      value: "125",
      change: "of 300 limit",
      icon: Clock,
      color: "text-green-600"
    },
    {
      title: "Accuracy Rate",
      value: "94.2%",
      change: "+2.1% this month",
      icon: CheckCircle,
      color: "text-purple-600"
    }
  ];

  const recentFiles = [
    {
      name: "Cantonese Lesson 01",
      status: "Completed",
      date: "2 hours ago",
      duration: "12:34"
    },
    {
      name: "Business Interview",
      status: "Completed", 
      date: "1 day ago",
      duration: "45:12"
    },
    {
      name: "Podcast Episode 15",
      status: "Processing",
      date: "3 days ago",
      duration: "28:45"
    }
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Welcome back!</h1>
        <p className="text-muted-foreground">
          Here's an overview of your CantoneseScribe activity
        </p>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate('/dashboard/files')}>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center text-lg">
              <Upload className="h-5 w-5 mr-2 text-orange-600" />
              Upload New File
            </CardTitle>
            <CardDescription>
              Upload video or audio for Cantonese transcription
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full bg-orange-500 hover:bg-orange-600">
              <Upload className="h-4 w-4 mr-2" />
              Start Transcription
            </Button>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-lg transition-shadow">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center text-lg">
              <Youtube className="h-5 w-5 mr-2 text-red-600" />
              YouTube URL
            </CardTitle>
            <CardDescription>
              Process Cantonese content directly from YouTube
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full">
              <Youtube className="h-4 w-4 mr-2" />
              Process YouTube Video
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        {quickStats.map((stat, index) => (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">{stat.change}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Activity & Quick Links */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Recent Files */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg">Recent Files</CardTitle>
              <CardDescription>Your latest transcription jobs</CardDescription>
            </div>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => navigate('/dashboard/files')}
            >
              View all
              <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentFiles.map((file, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="space-y-1">
                    <p className="text-sm font-medium">{file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {file.date} • {file.duration}
                    </p>
                  </div>
                  <div className={`text-xs px-2 py-1 rounded-full ${
                    file.status === 'Completed' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {file.status}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Quick Links */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Quick Links</CardTitle>
            <CardDescription>Common actions and settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button 
              variant="outline" 
              className="w-full justify-start"
              onClick={() => navigate('/dashboard/usage')}
            >
              <BarChart3 className="h-4 w-4 mr-2" />
              View Usage Analytics
            </Button>
            
            <Button 
              variant="outline" 
              className="w-full justify-start"
              onClick={() => navigate('/dashboard/settings')}
            >
              <Zap className="h-4 w-4 mr-2" />
              Transcription Settings
            </Button>
            
            <Button 
              variant="outline" 
              className="w-full justify-start"
              onClick={() => navigate('/pricing')}
            >
              <Zap className="h-4 w-4 mr-2" />
              Upgrade Plan
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};