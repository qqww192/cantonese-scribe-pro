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