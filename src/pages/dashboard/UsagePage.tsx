// src/pages/dashboard/UsagePage.tsx
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { BarChart3, Clock, FileText, Zap } from "lucide-react";

export const UsagePage = () => {
  // Mock data - replace with real data from your API
  const usageData = {
    minutesUsed: 125,
    minutesLimit: 300,
    filesProcessed: 23,
    filesLimit: 50,
    currentPlan: "Pro Plan"
  };

  const progressPercentage = (usageData.minutesUsed / usageData.minutesLimit) * 100;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Usage & Analytics</h1>
        <p className="text-muted-foreground">
          Monitor your transcription usage and account limits
        </p>
      </div>

      {/* Usage Overview Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Minutes Used</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{usageData.minutesUsed}</div>
            <p className="text-xs text-muted-foreground">
              of {usageData.minutesLimit} minutes
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Files Processed</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{usageData.filesProcessed}</div>
            <p className="text-xs text-muted-foreground">
              of {usageData.filesLimit} files
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current Plan</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{usageData.currentPlan}</div>
            <p className="text-xs text-muted-foreground">
              Active subscription
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Accuracy Rate</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">94.2%</div>
            <p className="text-xs text-muted-foreground">
              Average accuracy
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Usage Progress */}
      <Card>
        <CardHeader>
          <CardTitle>Monthly Usage</CardTitle>
          <CardDescription>
            Your usage for the current billing period
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span>Transcription Minutes</span>
              <span>{usageData.minutesUsed} / {usageData.minutesLimit}</span>
            </div>
            <Progress value={progressPercentage} className="h-2" />
          </div>
          
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span>Files Processed</span>
              <span>{usageData.filesProcessed} / {usageData.filesLimit}</span>
            </div>
            <Progress value={(usageData.filesProcessed / usageData.filesLimit) * 100} className="h-2" />
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>
            Your latest transcription jobs
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[
              { file: "cantonese_lesson_01.mp4", date: "2 hours ago", duration: "12:34", status: "Completed" },
              { file: "interview_recording.wav", date: "1 day ago", duration: "45:12", status: "Completed" },
              { file: "podcast_episode_15.mp3", date: "3 days ago", duration: "28:45", status: "Completed" },
            ].map((item, index) => (
              <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-1">
                  <p className="text-sm font-medium">{item.file}</p>
                  <p className="text-xs text-muted-foreground">{item.date} • {item.duration}</p>
                </div>
                <div className="text-sm text-green-600 font-medium">{item.status}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};