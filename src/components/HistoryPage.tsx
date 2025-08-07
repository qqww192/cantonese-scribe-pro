import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Clock, 
  FileText, 
  Download, 
  Calendar,
  Play,
  Eye,
  ExternalLink
} from "lucide-react";

const HistoryPage = () => {
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
      formats: ["SRT", "VTT", "TXT"],
      creditsUsed: 1
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
      formats: ["SRT", "CSV"],
      creditsUsed: 2
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
      formats: ["SRT", "VTT", "TXT", "CSV"],
      creditsUsed: 1
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
      formats: ["SRT", "TXT"],
      creditsUsed: 1
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
      formats: ["SRT", "VTT", "CSV"],
      creditsUsed: 2
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
    if (confidence >= 0.9) return "bg-green-100 text-green-800";
    if (confidence >= 0.8) return "bg-yellow-100 text-yellow-800";
    return "bg-red-100 text-red-800";
  };

  const getConfidenceText = (confidence: number) => {
    if (confidence >= 0.9) return "Excellent";
    if (confidence >= 0.8) return "Good";
    return "Fair";
  };

  const totalCreditsUsed = transcriptionHistory.reduce((sum, item) => sum + item.creditsUsed, 0);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Transcription History</h1>
          <p className="text-gray-600 mt-2">
            View and manage your past video transcriptions
          </p>
        </div>

        {/* Stats Overview */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Videos</CardTitle>
              <FileText className="h-4 w-4 text-gray-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{transcriptionHistory.length}</div>
              <p className="text-xs text-gray-500">Videos processed</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Credits Used</CardTitle>
              <Clock className="h-4 w-4 text-gray-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalCreditsUsed}</div>
              <p className="text-xs text-gray-500">Total credits spent</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg. Quality</CardTitle>
              <Badge variant="secondary" className="bg-green-100 text-green-800">
                Excellent
              </Badge>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">89%</div>
              <p className="text-xs text-gray-500">Average confidence</p>
            </CardContent>
          </Card>
        </div>

        {/* History List */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Transcriptions</CardTitle>
            <CardDescription>
              Your transcription history with download options
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {transcriptionHistory.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-medium text-gray-900">{item.title}</h3>
                      <Badge 
                        variant="outline" 
                        className={getConfidenceColor(item.confidence)}
                      >
                        {getConfidenceText(item.confidence)} ({Math.round(item.confidence * 100)}%)
                      </Badge>
                      <Badge variant="secondary" className="text-xs">
                        {item.creditsUsed} credit{item.creditsUsed > 1 ? 's' : ''}
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-2 text-sm text-gray-600 mb-2">
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
                    
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <ExternalLink className="h-3 w-3" />
                      <span className="font-mono truncate max-w-md">{item.url}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 ml-4">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => window.open(`/process?video=${encodeURIComponent(item.url)}`, '_blank')}
                    >
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
    </div>
  );
};

export default HistoryPage;