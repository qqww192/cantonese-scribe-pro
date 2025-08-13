// src/components/VideoResultsPage.tsx
import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { 
  Download, 
  Play, 
  Settings, 
  Copy,
  FileText
} from 'lucide-react';

interface SubtitleSegment {
  id: number;
  startTime: number;
  endTime: number;
  chinese: string;
  yale: string;
  jyutping: string;
  english: string;
  confidence: number;
}

interface VideoResultsProps {
  videoUrl: string;
  videoTitle: string;
  processingData: {
    startTime: number;
    endTime: number;
    duration: number;
  };
  onBack: () => void;
}

export const VideoResultsPage: React.FC<VideoResultsProps> = ({
  videoUrl,
  videoTitle,
  processingData,
  onBack
}) => {
  const [showChinese, setShowChinese] = useState(true);
  const [showYale, setShowYale] = useState(false);
  const [showJyutping, setShowJyutping] = useState(false);
  const [showEnglish, setShowEnglish] = useState(false);
  const [showDisplayOptions, setShowDisplayOptions] = useState(false);
  const [activeSegmentId, setActiveSegmentId] = useState<number | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showSaveSuccessModal, setShowSaveSuccessModal] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false); // In real app, get from auth context
  
  const { toast } = useToast();
  const subtitleRefs = useRef<{ [key: number]: HTMLDivElement | null }>({});
  const displayOptionsRef = useRef<HTMLDivElement>(null);

  // Mock subtitle data - in real app, this would come from API
  const mockSubtitles: SubtitleSegment[] = [
    {
      id: 1,
      startTime: 0,
      endTime: 3.5,
      chinese: "大家好，歡迎收看今天的節目",
      yale: "daai6 gaa1 hou2, fun1 ying4 sau1 toi2 gam1 tin1 ge3 zit3 muk6",
      jyutping: "daai6 gaa1 hou2, fun1 ying4 sau1 toi2 gam1 tin1 ge3 zit3 muk6",
      english: "Hello everyone, welcome to today's program",
      confidence: 0.95
    },
    {
      id: 2,
      startTime: 3.5,
      endTime: 7.2,
      chinese: "今日我哋會討論廣東話嘅發音技巧",
      yale: "gam1 yat6 ngo5 dei6 wui5 tou2 leon6 gwong2 dung1 waa2 ge3 faat3 yam1 gei6 haau2",
      jyutping: "gam1 jat6 ngo5 dei6 wui5 tou2 leon6 gwong2 dung1 waa2 ge3 faat3 jam1 gei6 haau2",
      english: "Today we will discuss Cantonese pronunciation techniques",
      confidence: 0.92
    },
    {
      id: 3,
      startTime: 7.2,
      endTime: 11.8,
      chinese: "聲調係廣東話最重要嘅部分",
      yale: "seng1 diu6 hai6 gwong2 dung1 waa2 zeui3 jung6 yiu3 ge3 bou6 fan6",
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

  // Check for login status changes (e.g., when user logs in from another tab)
  useEffect(() => {
    const checkAuthStatus = () => {
      // In real app, check with your auth system
      const authToken = localStorage.getItem('auth-token');
      const wasLoggedIn = isLoggedIn;
      const nowLoggedIn = !!authToken;
      
      if (!wasLoggedIn && nowLoggedIn) {
        setIsLoggedIn(true);
        toast({
          title: "Welcome back! 👋",
          description: "You're now logged in. You can save your transcription."
        });
      }
    };

    // Listen for storage changes (when user logs in from another tab)
    window.addEventListener('storage', checkAuthStatus);
    
    // Also check periodically in case user logs in
    const interval = setInterval(checkAuthStatus, 2000);

    return () => {
      window.removeEventListener('storage', checkAuthStatus);
      clearInterval(interval);
    };
  // Check for login status changes (e.g., when user logs in from another tab)
  useEffect(() => {
    const checkAuthStatus = () => {
      // In real app, check with your auth system
      const authToken = localStorage.getItem('auth-token');
      const wasLoggedIn = isLoggedIn;
      const nowLoggedIn = !!authToken;
      
      if (!wasLoggedIn && nowLoggedIn) {
        setIsLoggedIn(true);
        toast({
          title: "Welcome back! 👋",
          description: "You're now logged in. You can save your transcription."
        });
      }
    };

    // Listen for storage changes (when user logs in from another tab)
    window.addEventListener('storage', checkAuthStatus);
    
    // Also check periodically in case user logs in
    const interval = setInterval(checkAuthStatus, 2000);

    return () => {
      window.removeEventListener('storage', checkAuthStatus);
      clearInterval(interval);
    };
  }, [isLoggedIn, toast]);

  // Close display options when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (displayOptionsRef.current && !displayOptionsRef.current.contains(event.target as Node)) {
        setShowDisplayOptions(false);
      }
    };

    if (showDisplayOptions) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDisplayOptions]);
    const handleClickOutside = (event: MouseEvent) => {
      if (displayOptionsRef.current && !displayOptionsRef.current.contains(event.target as Node)) {
        setShowDisplayOptions(false);
      }
    };

    if (showDisplayOptions) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDisplayOptions]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSegmentClick = (segment: SubtitleSegment) => {
    setActiveSegmentId(segment.id);
    toast({
      title: "Jumping to timestamp",
      description: `${formatTime(segment.startTime)} - ${formatTime(segment.endTime)}`
    });
  };

  const getDisplayText = (segment: SubtitleSegment) => {
    const formats = [];
    
    if (showChinese) {
      formats.push({ label: '中文', text: segment.chinese, className: 'text-gray-900 font-medium' });
    }
    if (showYale) {
      formats.push({ label: 'Yale', text: segment.yale, className: 'text-blue-700' });
    }
    if (showJyutping) {
      formats.push({ label: 'Jyutping', text: segment.jyutping, className: 'text-green-700' });
    }
    if (showEnglish) {
      formats.push({ label: 'English', text: segment.english, className: 'text-purple-700 italic' });
    }
    
    return formats;
  };

  const getActiveFormats = () => {
    const formats = [];
    if (showChinese) formats.push('chinese');
    if (showYale) formats.push('yale');
    if (showJyutping) formats.push('jyutping');
    if (showEnglish) formats.push('english');
    return formats;
  };

  const saveTranscriptionToAccount = () => {
    if (!isLoggedIn) {
      setShowAuthModal(true);
      return;
    }
    
    // If logged in, save the transcription
    const transcriptionData = {
      videoUrl,
      videoTitle,
      processingData,
      subtitles: mockSubtitles,
      displayPreferences: {
        showChinese,
        showYale,
        showJyutping,
        showEnglish
      },
      savedAt: new Date().toISOString()
    };
    
    // In real app, this would make an API call to save to user's account
    localStorage.setItem(`transcription-${Date.now()}`, JSON.stringify(transcriptionData));
    
    toast({
      title: "Transcription saved! ✅",
      description: "Your transcription has been saved to your account."
    });
  };

  const copySubtitle = (segment: SubtitleSegment) => {
    const formats = getDisplayText(segment);
    const text = formats.map(f => `${f.label}: ${f.text}`).join('\n');
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied to clipboard",
      description: "Subtitle text copied successfully"
    });
  };

  const exportSubtitles = (format: string) => {
    const activeFormats = getActiveFormats();
    
    if (activeFormats.length === 0) {
      toast({
        title: "No formats selected",
        description: "Please toggle at least one format before exporting.",
        variant: "destructive"
      });
      return;
    }
    
    let content = '';
    
    if (format === 'srt') {
      content = mockSubtitles.map((segment, index) => {
        const startTime = formatSRTTime(segment.startTime);
        const endTime = formatSRTTime(segment.endTime);
        const formats = getDisplayText(segment);
        const text = formats.map(f => `${f.text}`).join('\n');
        return `${index + 1}\n${startTime} --> ${endTime}\n${text}\n`;
      }).join('\n');
    } else if (format === 'txt') {
      content = mockSubtitles.map(segment => {
        const formats = getDisplayText(segment);
        const text = formats.map(f => `${f.label}: ${f.text}`).join(' | ');
        return `[${formatTime(segment.startTime)}] ${text}`;
      }).join('\n');
    }
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cantonese-subtitles-${activeFormats.join('-')}.${format}`;
    a.click();
    
    toast({
      title: "Download started",
      description: `${format.toUpperCase()} file with ${activeFormats.join(', ')} formats`
    });
  };

  const formatSRTTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 1000);
    
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')},${ms.toString().padStart(3, '0')}`;
  };

  const getYouTubeVideoId = (url: string) => {
    const regex = /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/;
    const match = url.match(regex);
    return match ? match[1] : null;
  };

  const videoId = getYouTubeVideoId(videoUrl);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={onBack}>
              ← Back
            </Button>
            <div>
              <h1 className="text-xl font-semibold text-gray-900 truncate max-w-md">
                {videoTitle}
              </h1>
              <p className="text-sm text-gray-500">
                Processed: {formatTime(processingData.startTime)} - {formatTime(processingData.endTime)}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Login Status Indicator (for demo) */}
            <div className="text-xs text-gray-500">
              Status: {isLoggedIn ? (
                <span className="text-green-600 font-medium">Logged In</span>
              ) : (
                <span className="text-red-600 font-medium">Not Logged In</span>
              )}
              <button
                onClick={() => setIsLoggedIn(!isLoggedIn)}
                className="ml-2 text-blue-500 underline"
                title="Toggle login status (demo only)"
              >
                {isLoggedIn ? 'Logout' : 'Login'}
              </button>
            </div>
            
            {/* Display Options Dropdown */}
            <div className="relative" ref={displayOptionsRef}>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDisplayOptions(!showDisplayOptions)}
                className="flex items-center gap-2"
              >
                <Settings className="w-4 h-4" />
                Display Options
              </Button>
              
              {showDisplayOptions && (
                <div className="absolute right-0 top-full mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-50 p-4">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between pb-2 border-b">
                      <h3 className="font-medium text-gray-900">Display Options</h3>
                      <button
                        onClick={() => setShowDisplayOptions(false)}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        ×
                      </button>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-medium text-gray-700">中文 (Chinese)</label>
                        <button
                          onClick={() => setShowChinese(!showChinese)}
                          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                            showChinese ? 'bg-orange-500' : 'bg-gray-300'
                          }`}
                        >
                          <span
                            className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                              showChinese ? 'translate-x-5' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-medium text-gray-700">Yale Romanisation</label>
                        <button
                          onClick={() => setShowYale(!showYale)}
                          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                            showYale ? 'bg-blue-500' : 'bg-gray-300'
                          }`}
                        >
                          <span
                            className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                              showYale ? 'translate-x-5' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-medium text-gray-700">Jyutping Romanisation</label>
                        <button
                          onClick={() => setShowJyutping(!showJyutping)}
                          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                            showJyutping ? 'bg-green-500' : 'bg-gray-300'
                          }`}
                        >
                          <span
                            className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                              showJyutping ? 'translate-x-5' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-medium text-gray-700">English Translation</label>
                        <button
                          onClick={() => setShowEnglish(!showEnglish)}
                          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                            showEnglish ? 'bg-purple-500' : 'bg-gray-300'
                          }`}
                        >
                          <span
                            className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                              showEnglish ? 'translate-x-5' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </div>
                    </div>
                    
                    {/* Quick presets */}
                    <div className="pt-3 border-t border-gray-200">
                      <p className="text-xs text-gray-500 mb-2">Quick presets:</p>
                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setShowChinese(true);
                            setShowYale(false);
                            setShowJyutping(false);
                            setShowEnglish(false);
                          }}
                          className="text-xs h-7"
                        >
                          Chinese Only
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setShowChinese(true);
                            setShowYale(true);
                            setShowJyutping(false);
                            setShowEnglish(false);
                          }}
                          className="text-xs h-7"
                        >
                          Chinese + Yale
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setShowChinese(true);
                            setShowYale(false);
                            setShowJyutping(false);
                            setShowEnglish(true);
                          }}
                          className="text-xs h-7"
                        >
                          Chinese + English
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setShowChinese(true);
                            setShowYale(true);
                            setShowJyutping(true);
                            setShowEnglish(true);
                          }}
                          className="text-xs h-7"
                        >
                          Show All
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Video Player */}
          <div className="lg:col-span-2 space-y-4">
            <Card>
              <CardContent className="p-6">
                <div className="aspect-video bg-black rounded-lg overflow-hidden">
                  <iframe
                    width="100%"
                    height="100%"
                    src={`https://www.youtube.com/embed/${videoId}?start=${Math.floor(processingData.startTime)}&end=${Math.floor(processingData.endTime)}&controls=1&autoplay=0`}
                    title="YouTube video player"
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  ></iframe>
                </div>
              </CardContent>
            </Card>

            {/* Export Options */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Download className="w-5 h-5" />
                  Export Options
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => exportSubtitles('srt')}
                    className="flex items-center gap-2"
                  >
                    <FileText className="w-4 h-4" />
                    SRT
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => exportSubtitles('txt')}
                    className="flex items-center gap-2"
                  >
                    <FileText className="w-4 h-4" />
                    TXT
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => exportSubtitles('vtt')}
                    className="flex items-center gap-2"
                  >
                    <FileText className="w-4 h-4" />
                    VTT
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => exportSubtitles('csv')}
                    className="flex items-center gap-2"
                  >
                    <FileText className="w-4 h-4" />
                    CSV
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Subtitles Panel */}
          <div className="space-y-4">
            {/* Subtitles List */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center justify-between">
                  Subtitles
                  <span className="text-sm font-normal text-gray-500">
                    {mockSubtitles.length} segments • {getActiveFormats().length} format{getActiveFormats().length !== 1 ? 's' : ''} active
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="max-h-96 overflow-y-auto">
                  {mockSubtitles.map((segment) => (
                    <div
                      key={segment.id}
                      ref={(el) => subtitleRefs.current[segment.id] = el}
                      className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors ${
                        activeSegmentId === segment.id ? 'bg-orange-50 border-l-4 border-l-orange-500' : ''
                      }`}
                      onClick={() => handleSegmentClick(segment)}
                    >
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <span className="text-xs font-medium text-orange-600 bg-orange-100 px-2 py-1 rounded">
                          {formatTime(segment.startTime)} - {formatTime(segment.endTime)}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            copySubtitle(segment);
                          }}
                          className="text-gray-400 hover:text-gray-600 p-1"
                          title="Copy text"
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                      </div>
                      
                      {/* Display multiple formats */}
                      <div className="space-y-2 mb-3">
                        {getDisplayText(segment).map((format, index) => (
                          <div key={index} className="leading-relaxed">
                            <span className="text-xs text-gray-400 uppercase tracking-wide">
                              {format.label}:
                            </span>
                            <p className={`text-sm mt-1 ${format.className}`}>
                              {format.text}
                            </p>
                          </div>
                        ))}
                        
                        {getDisplayText(segment).length === 0 && (
                          <p className="text-sm text-gray-400 italic">
                            No formats selected. Please toggle at least one format above.
                          </p>
                        )}
                      </div>
                      
                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-green-500"></div>
                          <span className="text-xs text-gray-500">
                            {Math.round(segment.confidence * 100)}% confidence
                          </span>
                        </div>
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSegmentClick(segment);
                          }}
                          className="text-xs h-6 px-2"
                        >
                          <Play className="w-3 h-3 mr-1" />
                          Play
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            
            {/* Save Transcription Button */}
            <Button
              onClick={saveTranscriptionToAccount}
              className="w-full bg-orange-500 hover:bg-orange-600 text-white font-medium py-3"
            >
              Save Transcription to Your Account
            </Button>
          </div>
        </div>
      </div>

      {/* Authentication Modal */}
      {showAuthModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="text-center">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">
                Sign in to Save Transcription
              </h3>
              <p className="text-gray-600 mb-6">
                Create an account or sign in to save your transcriptions and access them anywhere. The login page will open in a new tab so you don't lose your current results.
              </p>
              
              <div className="space-y-3">
                <Button
                  onClick={() => {
                    setShowAuthModal(false);
                    // Open login page in new tab to preserve current results
                    window.open('/auth?mode=login', '_blank');
                  }}
                  className="w-full bg-blue-500 hover:bg-blue-600 text-white"
                >
                  Sign In (Opens in New Tab)
                </Button>
                
                <Button
                  onClick={() => {
                    setShowAuthModal(false);
                    // Open signup page in new tab to preserve current results
                    window.open('/auth?mode=register', '_blank');
                  }}
                  variant="outline"
                  className="w-full border-blue-500 text-blue-500 hover:bg-blue-50"
                >
                  Create Account (Opens in New Tab)
                </Button>
                
                <Button
                  onClick={() => setShowAuthModal(false)}
                  variant="ghost"
                  className="w-full text-gray-500"
                >
                  Cancel
                </Button>
              </div>
              
              <div className="mt-4 pt-4 border-t border-gray-200">
                <p className="text-xs text-gray-500">
                  Free accounts get 3 saved transcriptions per month.<br/>
                  Pro accounts get unlimited storage.<br/>
                  <span className="text-orange-600 font-medium">After logging in, return to this tab to save your transcription.</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoResultsPage;