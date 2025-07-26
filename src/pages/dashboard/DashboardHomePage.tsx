// src/pages/dashboard/DashboardHomePage.tsx - Simplified version
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useNavigate } from 'react-router-dom';
import { 
  FileText, 
  Clock,
  Youtube,
  Play
} from "lucide-react";

export const DashboardHomePage = () => {
  const navigate = useNavigate();
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

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

  const handleYouTubeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!youtubeUrl.trim()) return;
    
    setIsProcessing(true);
    
    // Simulate processing
    setTimeout(() => {
      setIsProcessing(false);
      setYoutubeUrl("");
      // Here you would typically make an API call to process the video
      console.log("Processing YouTube URL:", youtubeUrl);
    }, 2000);
  };

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Welcome back!</h1>
        <p className="text-muted-foreground">
          Process Cantonese YouTube videos for transcription
        </p>
      </div>

      {/* YouTube URL Input */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center text-xl">
            <Youtube className="h-6 w-6 mr-2 text-red-600" />
            YouTube Video Transcription
          </CardTitle>
          <CardDescription>
            Enter a YouTube URL to generate Cantonese transcription with Yale and Jyutping romanization
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleYouTubeSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="youtube-url">YouTube URL</Label>
              <Input
                id="youtube-url"
                type="url"
                placeholder="https://www.youtube.com/watch?v=..."
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
                className="text-base"
                disabled={isProcessing}
              />
            </div>
            <Button 
              type="submit" 
              className="w-full bg-red-600 hover:bg-red-700 text-white"
              disabled={!youtubeUrl.trim() || isProcessing}
            >
              {isProcessing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Processing...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Process Video
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-2">
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

      {/* Recent Files */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recent Files</CardTitle>
          <CardDescription>Your latest transcription jobs</CardDescription>
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
    </div>
  );
};