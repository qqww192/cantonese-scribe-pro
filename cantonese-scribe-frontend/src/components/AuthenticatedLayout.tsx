// src/components/AuthenticatedLayout.tsx
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  LogOut, 
  BarChart3, 
  FileText, 
  Upload,
  Play,
  Download,
  Clock
} from 'lucide-react';

const AuthenticatedLayout = () => {
  const [activeTab, setActiveTab] = useState('process');
  const [url, setUrl] = useState('');
  const [isValidating, setIsValidating] = useState(false);

  // Mock user data
  const user = {
    name: "John Doe",
    plan: "Learner Pro",
    videosUsed: 8,
    videosLimit: 25,
    minutesUsed: 127,
    minutesLimit: 1500 // 25 hours
  };

  // Mock processed videos data
  const processedVideos = [
    {
      id: 1,
      title: "Hong Kong News Broadcast",
      url: "https://youtube.com/watch?v=TlC0SSeRNXc",
      duration: "4:32",
      processedAt: "2024-01-15",
      status: "completed"
    },
    {
      id: 2,
      title: "Cantonese Conversation Practice",
      url: "https://youtube.com/watch?v=abc123",
      duration: "12:15",
      processedAt: "2024-01-14",
      status: "completed"
    },
    {
      id: 3,
      title: "Traditional Cantonese Song",
      url: "https://youtube.com/watch?v=xyz789",
      duration: "3:45",
      processedAt: "2024-01-12",
      status: "completed"
    }
  ];

  const handleLogout = () => {
    // Clear authentication and redirect to landing page
    localStorage.removeItem('authToken');
    window.location.href = '/';
  };

  const handleUrlSubmit = () => {
    if (!url.trim()) return;
    
    setIsValidating(true);
    // Simulate processing
    setTimeout(() => {
      setIsValidating(false);
      // Navigate to video results
      window.location.href = `/video-results/${encodeURIComponent(url)}`;
    }, 2000);
  };

  const demoVideos = [
    {
      id: 'news-demo',
      title: 'Hong Kong News Broadcast',
      description: 'Clear pronunciation, formal Cantonese',
      duration: '3:45',
      url: 'https://www.youtube.com/watch?v=TlC0SSeRNXc'
    },
    {
      id: 'movie-demo', 
      title: 'Classic Hong Kong Film Scene',
      description: 'Natural conversation, cultural context',
      duration: '4:12',
      url: 'https://www.youtube.com/watch?v=YgOexHTGnXY'
    },
    {
      id: 'music-demo',
      title: 'Cantonese Music Video',
      description: 'Popular music with clear vocals',
      duration: '2:30',
      url: 'https://www.youtube.com/watch?v=rTOHjnH-rXE'
    }
  ];

  const renderProcessTab = () => (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
          Convert Your{' '}
          <span className="bg-gradient-to-r from-orange-500 to-red-500 bg-clip-text text-transparent">
            Cantonese Videos
          </span>
        </h1>
        <p className="text-xl text-gray-600 mb-8">
          Transform YouTube videos into interactive learning materials with synchronised romanisation
        </p>
      </div>

      {/* URL Input */}
      <Card className="mb-8">
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Process Your Video
          </h3>
          
          <div className="flex gap-3 mb-4">
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=..."
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              disabled={isValidating}
            />
            <Button 
              onClick={handleUrlSubmit}
              disabled={!url.trim() || isValidating}
              className="px-6 py-3 bg-orange-500 hover:bg-orange-600"
            >
              {isValidating ? (
                <div className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processing...
                </div>
              ) : (
                'Process Video'
              )}
            </Button>
          </div>

          <div className="text-sm text-gray-600">
            ✅ Supports YouTube, Vimeo and direct video links<br />
            ✅ Up to 1 hour per video on your {user.plan} plan<br />
            ✅ 85%+ accuracy for clear Cantonese speech
          </div>
        </CardContent>
      </Card>

      {/* Demo Videos */}
      <Card>
        <CardHeader>
          <CardTitle>Try Our Demo Videos</CardTitle>
          <p className="text-gray-600">Or explore these pre-processed examples</p>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-4">
            {demoVideos.map((demo) => (
              <div 
                key={demo.id}
                className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                onClick={() => window.location.href = `/demo-results/${demo.id}`}
              >
                <h4 className="font-medium text-gray-900 mb-2">{demo.title}</h4>
                <p className="text-sm text-gray-600 mb-2">{demo.description}</p>
                <div className="flex justify-between items-center text-xs text-gray-500">
                  <span>{demo.duration}</span>
                  <Play className="w-4 h-4" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderUsageTab = () => (
    <div className="max-w-4xl mx-auto">
      <h2 className="text-3xl font-bold text-gray-900 mb-8">Usage & Analytics</h2>
      
      <div className="grid md:grid-cols-2 gap-6 mb-8">
        {/* Video Usage */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Video Usage
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm text-gray-600">Videos this month</span>
                  <span className="text-sm font-medium">{user.videosUsed} / {user.videosLimit}</span>
                </div>
                <Progress value={(user.videosUsed / user.videosLimit) * 100} className="h-2" />
              </div>
              
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm text-gray-600">Minutes processed</span>
                  <span className="text-sm font-medium">{user.minutesUsed} / {user.minutesLimit}</span>
                </div>
                <Progress value={(user.minutesUsed / user.minutesLimit) * 100} className="h-2" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Plan Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Current Plan
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Plan</span>
                <Badge variant="secondary">{user.plan}</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Monthly Reset</span>
                <span className="text-sm">Jan 30, 2024</span>
              </div>
              <Button variant="outline" className="w-full">
                Upgrade Plan
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Usage History Chart Placeholder */}
      <Card>
        <CardHeader>
          <CardTitle>Monthly Usage Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center">
            <p className="text-gray-500">Usage chart will be displayed here</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderProcessedVideosTab = () => (
    <div className="max-w-4xl mx-auto">
      <h2 className="text-3xl font-bold text-gray-900 mb-8">Processed Videos</h2>
      
      <Card>
        <CardContent className="p-0">
          <div className="divide-y">
            {processedVideos.map((video) => (
              <div key={video.id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900 mb-1">{video.title}</h3>
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {video.duration}
                      </span>
                      <span>Processed on {video.processedAt}</span>
                      <Badge variant="secondary" className="text-xs">
                        {video.status}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => window.location.href = `/video-results/${video.id}`}
                    >
                      <Play className="w-4 h-4 mr-1" />
                      View
                    </Button>
                    <Button variant="outline" size="sm">
                      <Download className="w-4 h-4 mr-1" />
                      Export
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Navigation */}
      <header className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="text-xl font-bold text-orange-500">CantoneseScribe</div>
            </div>

            {/* Tab Navigation */}
            <nav className="flex items-center gap-8">
              <button
                onClick={() => setActiveTab('process')}
                className={`px-3 py-2 text-sm font-medium transition-colors ${
                  activeTab === 'process'
                    ? 'text-orange-600 border-b-2 border-orange-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Process Videos
              </button>
              <button
                onClick={() => setActiveTab('usage')}
                className={`px-3 py-2 text-sm font-medium transition-colors ${
                  activeTab === 'usage'
                    ? 'text-orange-600 border-b-2 border-orange-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Usage
              </button>
              <button
                onClick={() => setActiveTab('videos')}
                className={`px-3 py-2 text-sm font-medium transition-colors ${
                  activeTab === 'videos'
                    ? 'text-orange-600 border-b-2 border-orange-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Processed Videos
              </button>
            </nav>

            {/* User Actions */}
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">Welcome, {user.name}</span>
              <Button variant="outline" size="sm" onClick={handleLogout}>
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="py-8 px-6">
        {activeTab === 'process' && renderProcessTab()}
        {activeTab === 'usage' && renderUsageTab()}
        {activeTab === 'videos' && renderProcessedVideosTab()}
      </main>
    </div>
  );
};

export default AuthenticatedLayout;