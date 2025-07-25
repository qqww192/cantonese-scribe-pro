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

// src/pages/dashboard/SavedFilesPage.tsx
import React, { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Download, 
  Search, 
  Filter, 
  MoreVertical, 
  Eye,
  Trash2,
  FileText,
  Clock
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export const SavedFilesPage = () => {
  const [searchTerm, setSearchTerm] = useState("");

  // Mock data - replace with real data from your API
  const savedFiles = [
    {
      id: 1,
      filename: "cantonese_lesson_01.mp4",
      originalName: "Cantonese Lesson 01 - Basic Greetings",
      dateCreated: "2024-01-15",
      duration: "12:34",
      status: "completed",
      size: "45.2 MB",
      transcriptionType: "Yale + Jyutping"
    },
    {
      id: 2,
      filename: "interview_recording.wav",
      originalName: "Business Interview Recording",
      dateCreated: "2024-01-14",
      duration: "45:12",
      status: "completed",
      size: "87.5 MB",
      transcriptionType: "Yale Only"
    },
    {
      id: 3,
      filename: "podcast_episode_15.mp3",
      originalName: "Cantonese Culture Podcast Episode 15",
      dateCreated: "2024-01-12",
      duration: "28:45",
      status: "processing",
      size: "32.1 MB",
      transcriptionType: "Jyutping Only"
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'processing': return 'bg-yellow-100 text-yellow-800';
      case 'failed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredFiles = savedFiles.filter(file =>
    file.originalName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    file.filename.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Saved Files</h1>
        <p className="text-muted-foreground">
          Manage and download your transcribed files
        </p>
      </div>

      {/* Search and Filter Bar */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search files..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button variant="outline">
          <Filter className="h-4 w-4 mr-2" />
          Filter
        </Button>
      </div>

      {/* Files Grid */}
      <div className="grid gap-4">
        {filteredFiles.map((file) => (
          <Card key={file.id}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <FileText className="h-6 w-6 text-orange-600" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-medium">{file.originalName}</h3>
                    <p className="text-sm text-muted-foreground">{file.filename}</p>
                    <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                      <span className="flex items-center">
                        <Clock className="h-3 w-3 mr-1" />
                        {file.duration}
                      </span>
                      <span>{file.size}</span>
                      <span>{file.dateCreated}</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  <Badge className={getStatusColor(file.status)}>
                    {file.status}
                  </Badge>
                  <Badge variant="outline">
                    {file.transcriptionType}
                  </Badge>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>
                        <Eye className="h-4 w-4 mr-2" />
                        View Transcription
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-red-600">
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredFiles.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No files found</h3>
            <p className="text-muted-foreground text-center">
              {searchTerm ? 'Try adjusting your search terms.' : 'Upload your first video to get started with transcription.'}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

// src/pages/dashboard/SettingsPage.tsx
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { User, Bell, Zap, Shield, CreditCard } from "lucide-react";

export const SettingsPage = () => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const [settings, setSettings] = useState({
    name: "John Doe",
    email: "john@example.com",
    defaultRomanization: "both",
    emailNotifications: true,
    processingNotifications: true,
    marketingEmails: false,
    autoDelete: false,
    retentionPeriod: "30"
  });

  const handleSave = async () => {
    setIsLoading(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsLoading(false);
    
    toast({
      title: "Settings saved",
      description: "Your preferences have been updated successfully.",
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Manage your account settings and preferences
        </p>
      </div>

      {/* Profile Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <User className="h-5 w-5 mr-2" />
            Profile
          </CardTitle>
          <CardDescription>
            Update your account information
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src="" alt={settings.name} />
              <AvatarFallback>{settings.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
            </Avatar>
            <Button variant="outline">Change Avatar</Button>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                value={settings.name}
                onChange={(e) => setSettings({...settings, name: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={settings.email}
                onChange={(e) => setSettings({...settings, email: e.target.value})}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Transcription Preferences */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Zap className="h-5 w-5 mr-2" />
            Transcription Preferences
          </CardTitle>
          <CardDescription>
            Configure your default transcription settings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="romanization">Default Romanization Format</Label>
            <Select
              value={settings.defaultRomanization}
              onValueChange={(value) => setSettings({...settings, defaultRomanization: value})}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="yale">Yale Only</SelectItem>
                <SelectItem value="jyutping">Jyutping Only</SelectItem>
                <SelectItem value="both">Yale + Jyutping</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Auto-delete processed files</Label>
              <p className="text-sm text-muted-foreground">
                Automatically delete source files after processing
              </p>
            </div>
            <Switch
              checked={settings.autoDelete}
              onCheckedChange={(checked) => setSettings({...settings, autoDelete: checked})}
            />
          </div>
        </CardContent>
      </Card>

      {/* Notification Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Bell className="h-5 w-5 mr-2" />
            Notifications
          </CardTitle>
          <CardDescription>
            Choose what notifications you'd like to receive
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Email notifications</Label>
              <p className="text-sm text-muted-foreground">
                Receive notifications about your account via email
              </p>
            </div>
            <Switch
              checked={settings.emailNotifications}
              onCheckedChange={(checked) => setSettings({...settings, emailNotifications: checked})}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Processing updates</Label>
              <p className="text-sm text-muted-foreground">
                Get notified when your transcriptions are ready
              </p>
            </div>
            <Switch
              checked={settings.processingNotifications}
              onCheckedChange={(checked) => setSettings({...settings, processingNotifications: checked})}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Marketing emails</Label>
              <p className="text-sm text-muted-foreground">
                Receive emails about new features and promotions
              </p>
            </div>
            <Switch
              checked={settings.marketingEmails}
              onCheckedChange={(checked) => setSettings({...settings, marketingEmails: checked})}
            />
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isLoading}>
          {isLoading ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </div>
  );
};

// src/pages/dashboard/DashboardHomePage.tsx
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