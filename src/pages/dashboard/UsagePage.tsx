import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  Clock, 
  FileText, 
  Download, 
  Calendar,
  Play,
  Eye
} from "lucide-react";

export const UsagePage = () => {
  // Mock user data
  const user = {
    plan: "Learner Pro",
    videosUsed: 8,
    videosLimit: 25,
    minutesUsed: 127,
    minutesLimit: 1500 // 25 hours
  };

  // Mock transcription history data
  const transcriptionHistory = [
    {
      id: 1,
      title: "Hong Kong News Broadcast",
      url: "https://youtube.com/watch?v=TlC0SSeRNXc",
      duration: "4:32",
      processedAt: "2024-01-15T14:30:00",
      status: "completed",
      confidence: 0.89,
      transcriptionLines: 45,
      formats: ["SRT", "VTT", "TXT"]
    },
    {
      id: 2,
      title: "Cantonese Conversation Practice",
      url: "https://youtube.com/watch?v=abc123",
      duration: "12:15",
      processedAt: "2024-01-14T10:15:00",
      status: "completed",
      confidence: 0.91,
      transcriptionLines: 120,
      formats: ["SRT", "CSV"]
    },
    {
      id: 3,
      title: "Traditional Cantonese Song",
      url: "https://youtube.com/watch?v=xyz789",
      duration: "3:45",
      processedAt: "2024-01-12T16:20:00",
      status: "completed",
      confidence: 0.85,
      transcriptionLines: 32,
      formats: ["SRT", "VTT", "TXT", "CSV"]
    },
    {
      id: 4,
      title: "Hong Kong Movie Scene",
      url: "https://youtube.com/watch?v=movie123",
      duration: "8:22",
      processedAt: "2024-01-11T09:45:00",
      status: "completed",
      confidence: 0.87,
      transcriptionLines: 78,
      formats: ["SRT", "TXT"]
    },
    {
      id: 5,
      title: "Cantonese Tutorial Video",
      url: "https://youtube.com/watch?v=tutorial456",
      duration: "15:30",
      processedAt: "2024-01-10T13:00:00",
      status: "completed",
      confidence: 0.92,
      transcriptionLines: 156,
      formats: ["SRT", "VTT", "CSV"]
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

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.9) return "text-green-600 bg-green-50";
    if (confidence >= 0.8) return "text-yellow-600 bg-yellow-50";
    return "text-red-600 bg-red-50";
  };

  const getConfidenceText = (confidence: number) => {
    if (confidence >= 0.9) return "Excellent";
    if (confidence >= 0.8) return "Good";
    return "Fair";
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Usage & History</h1>
        <p className="text-muted-foreground">
          View your transcription history and account usage
        </p>
      </div>

      {/* Usage Overview Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Videos Processed</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{user.videosUsed}</div>
            <p className="text-xs text-muted-foreground">
              of {user.videosLimit} videos
            </p>
            <Progress 
              value={(user.videosUsed / user.videosLimit) * 100} 
              className="mt-2"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Minutes Used</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{user.minutesUsed}</div>
            <p className="text-xs text-muted-foreground">
              of {user.minutesLimit} minutes
            </p>
            <Progress 
              value={(user.minutesUsed / user.minutesLimit) * 100} 
              className="mt-2"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current Plan</CardTitle>
            <Badge variant="secondary">{user.plan}</Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Active</div>
            <p className="text-xs text-muted-foreground">
              Subscription active
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Transcription History */}
      <Card>
        <CardHeader>
          <CardTitle>Transcription History</CardTitle>
          <CardDescription>
            Your recent transcription jobs and their details
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {transcriptionHistory.map((item) => (
              <div key={item.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-medium">{item.title}</h3>
                    <Badge 
                      variant="outline" 
                      className={getConfidenceColor(item.confidence)}
                    >
                      {getConfidenceText(item.confidence)} ({Math.round(item.confidence * 100)}%)
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-2 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Play className="h-3 w-3" />
                      {item.duration}
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {formatDate(item.processedAt)}
                    </div>
                    <div className="flex items-center gap-1">
                      <FileText className="h-3 w-3" />
                      {item.transcriptionLines} lines
                    </div>
                    <div className="flex items-center gap-1">
                      <Download className="h-3 w-3" />
                      {item.formats.join(", ")}
                    </div>
                  </div>
                  
                  <p className="text-xs text-muted-foreground mt-1 font-mono">
                    {item.url}
                  </p>
                </div>
                
                <div className="flex items-center gap-2 ml-4">
                  <Button variant="outline" size="sm">
                    <Eye className="h-3 w-3 mr-1" />
                    View
                  </Button>
                  <Button variant="outline" size="sm">
                    <Download className="h-3 w-3 mr-1" />
                    Download
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};