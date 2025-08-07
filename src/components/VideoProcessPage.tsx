import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Play, 
  Download, 
  FileText, 
  Clock,
  CheckCircle,
  AlertCircle,
  Copy,
  ExternalLink
} from "lucide-react";

const VideoProcessPage = () => {
  const [url, setUrl] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState(null);

  // Mock transcription data
  const mockTranscription = [
    {
      id: 1,
      startTime: 0.5,
      endTime: 3.2,
      chinese: "大家好，歡迎收看今日新聞",
      yale: "daai6 gaa1 hou2, fun1 ying4 sau1 toi2 gam1 jat6 san1 man4",
      jyutping: "daai6 gaa1 hou2, fun1 jing4 sau1 toi2 gam1 jat6 san1 man4",
      english: "Hello everyone, welcome to today's news",
      confidence: 0.92
    },
    {
      id: 2,
      startTime: 3.2,
      endTime: 7.8,
      chinese: "今日我哋會討論香港嘅最新發展",
      yale: "gam1 jat6 ngo5 dei6 wui5 tou2 leon6 hoeng1 gong2 ge3 zeui3 san1 faat3 zin2",
      jyutping: "gam1 jat6 ngo5 dei6 wui5 tou2 leon6 hoeng1 gong2 ge3 zeui3 san1 faat3 zin2",
      english: "Today we will discuss the latest developments in Hong Kong",
      confidence: 0.88
    },
    {
      id: 3,
      startTime: 7.8,
      endTime: 11.5,
      chinese: "聲調係廣東話最重要嘅部分",
      yale: "sing1 diu6 hai6 gwong2 dung1 waa2 zeui3 zung6 yiu3 ge3 bou6 fan6",
      jyutping: "sing1 diu6 hai6 gwong2 dung1 waa2 zeui3 zung6 jiu3 ge3 bou6 fan6",
      english: "Tones are the most important part of Cantonese",
      confidence: 0.89
    },
    {
      id: 4,
      startTime: 11.8,
      endTime: 15.5,
      chinese: "我哋有九個聲調，每個都有唔同嘅用法",
      yale: "ngo5 dei6 yau5 gau2 go3 seng1 diu6, mui5 go3 dou1 yau5 m4 tung4 ge3 yung6 faat3",
      jyutping: "ngo5 dei6 jau5 gau2 go3 sing1 diu6, mui5 go3 dou1 jau5 m4 tung4 ge3 jung6 faat3",
      english: "We have nine tones, each with different uses",
      confidence: 0.87
    },
    {
      id: 5,
      startTime: 15.5,
      endTime: 19.3,
      chinese: "初學者要多加練習，熟能生巧",
      yale: "cho1 hok6 je2 yiu3 do1 gaa1 lin6 jaap6, suk6 nang4 sang1 haau2",
      jyutping: "co1 hok6 ze2 jiu3 do1 gaa1 lin6 zaap6, suk6 nang4 saang1 haau2",
      english: "Beginners need to practice more, practice makes perfect",
      confidence: 0.91
    }
  ];

  // Get URL from query params on page load
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const videoUrl = urlParams.get('video');
    if (videoUrl) {
      setUrl(decodeURIComponent(videoUrl));
      // Auto-start processing if URL is provided
      handleProcess();
    }
  }, []);

  const handleUrlSubmit = (e) => {
    e.preventDefault();
    if (!url.trim()) return;
    handleProcess();
  };

  const handleProcess = () => {
    if (!url.trim()) return;
    
    setIsProcessing(true);
    setProgress(0);
    setResult(null);

    // Simulate processing with progress updates
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 95) {
          clearInterval(interval);
          setTimeout(() => {
            setIsProcessing(false);
            setResult({
              url,
              title: "Video Transcription Results",
              duration: "4:32",
              totalLines: mockTranscription.length,
              avgConfidence: 0.89,
              creditsUsed: 1,
              transcription: mockTranscription
            });
          }, 500);
          return 100;
        }
        return prev + Math.random() * 15;
      });
    }, 200);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getConfidenceColor = (confidence) => {
    if (confidence >= 0.9) return "bg-green-100 text-green-800";
    if (confidence >= 0.8) return "bg-yellow-100 text-yellow-800";
    return "bg-red-100 text-red-800";
  };

  const getConfidenceText = (confidence) => {
    if (confidence >= 0.9) return "Excellent";
    if (confidence >= 0.8) return "Good";
    return "Fair";
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    alert("Copied to clipboard!");
  };

  const exportFormat = (format) => {
    let content = "";
    
    switch(format) {
      case 'SRT':
        content = result.transcription.map((item, index) => 
          `${index + 1}\n${formatTime(item.startTime)} --> ${formatTime(item.endTime)}\n${item.chinese}\n${item.english}\n`
        ).join('\n');
        break;
      case 'VTT':
        content = "WEBVTT\n\n" + result.transcription.map(item => 
          `${formatTime(item.startTime)} --> ${formatTime(item.endTime)}\n${item.chinese}\n${item.english}\n`
        ).join('\n');
        break;
      case 'TXT':
        content = result.transcription.map(item => 
          `[${formatTime(item.startTime)}] ${item.chinese} (${item.english})`
        ).join('\n');
        break;
      case 'CSV':
        content = "Start Time,End Time,Chinese,Yale,Jyutping,English,Confidence\n" + 
          result.transcription.map(item => 
            `${item.startTime},${item.endTime},"${item.chinese}","${item.yale}","${item.jyutping}","${item.english}",${item.confidence}`
          ).join('\n');
        break;
    }
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transcription.${format.toLowerCase()}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Video Transcription</h1>
          <p className="text-gray-600 mt-2">
            Process your Cantonese videos and get accurate transcriptions
          </p>
        </div>

        {/* URL Input Form */}
        {!result && (
          <Card>
            <CardHeader>
              <CardTitle>Enter Video URL</CardTitle>
              <CardDescription>
                Paste a YouTube URL or direct video link to start transcription
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUrlSubmit} className="space-y-4">
                <div>
                  <input
                    type="url"
                    placeholder="https://www.youtube.com/watch?v=..."
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    disabled={isProcessing}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    required
                  />
                </div>
                <Button
                  type="submit"
                  disabled={isProcessing || !url.trim()}
                  className="bg-orange-600 hover:bg-orange-700 text-white"
                >
                  {isProcessing ? 'Processing...' : 'Start Transcription'}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Processing Progress */}
        {isProcessing && (
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-orange-600"></div>
                  <span className="font-medium">Processing your video...</span>
                </div>
                <Progress value={progress} className="w-full" />
                <div className="text-sm text-gray-600">
                  {progress < 30 && "Downloading and analyzing video..."}
                  {progress >= 30 && progress < 70 && "Extracting audio and processing speech..."}
                  {progress >= 70 && progress < 95 && "Generating transcriptions..."}
                  {progress >= 95 && "Finalizing results..."}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Results */}
        {result && (
          <div className="space-y-6">
            {/* Result Summary */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      Transcription Complete
                    </CardTitle>
                    <CardDescription>
                      Your video has been successfully processed
                    </CardDescription>
                  </div>
                  <Badge variant="secondary" className="bg-green-100 text-green-800">
                    {result.creditsUsed} credit used
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="flex items-center gap-2">
                    <Play className="h-4 w-4 text-gray-500" />
                    <span className="text-sm">{result.duration}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-gray-500" />
                    <span className="text-sm">{result.totalLines} lines</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-gray-500" />
                    <span className="text-sm">Just now</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="text-sm">{Math.round(result.avgConfidence * 100)}% accuracy</span>
                  </div>
                </div>
                
                <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <ExternalLink className="h-3 w-3" />
                    <span className="font-mono break-all">{result.url}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Export Options */}
            <Card>
              <CardHeader>
                <CardTitle>Export Options</CardTitle>
                <CardDescription>
                  Download your transcription in various formats
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <Button 
                    variant="outline" 
                    onClick={() => exportFormat('SRT')}
                    className="justify-start"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    SRT
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => exportFormat('VTT')}
                    className="justify-start"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    VTT
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => exportFormat('TXT')}
                    className="justify-start"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    TXT
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => exportFormat('CSV')}
                    className="justify-start"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    CSV
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Transcription Results */}
            <Card>
              <CardHeader>
                <CardTitle>Transcription Results</CardTitle>
                <CardDescription>
                  Chinese characters, romanization, and English translations with timestamps
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {result.transcription.map((item) => (
                    <div key={item.id} className="p-4 border rounded-lg hover:bg-gray-50 group">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-mono text-gray-500">
                            {formatTime(item.startTime)} - {formatTime(item.endTime)}
                          </span>
                          <Badge 
                            variant="outline" 
                            className={`text-xs ${getConfidenceColor(item.confidence)}`}
                          >
                            {getConfidenceText(item.confidence)} ({Math.round(item.confidence * 100)}%)
                          </Badge>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(`${item.chinese}\n${item.yale}\n${item.jyutping}\n${item.english}`)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="text-lg font-medium text-gray-900">
                          {item.chinese}
                        </div>
                        <div className="text-sm text-blue-600 font-mono">
                          Yale: {item.yale}
                        </div>
                        <div className="text-sm text-green-600 font-mono">
                          Jyutping: {item.jyutping}
                        </div>
                        <div className="text-sm text-gray-600 italic">
                          {item.english}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Actions */}
            <div className="flex gap-3">
              <Button onClick={() => {
                setResult(null);
                setUrl('');
                setProgress(0);
              }}>
                Process Another Video
              </Button>
              <Button 
                variant="outline"
                onClick={() => window.location.href = '/history'}
              >
                View History
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VideoProcessPage;