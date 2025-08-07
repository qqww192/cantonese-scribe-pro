// src/components/HeroSection.tsx - Integrated card-based design with navigation system
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

interface HeroSectionProps {
  onVideoSelected?: (url: string) => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({ onVideoSelected }) => {
  const [selectedDemo, setSelectedDemo] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [url, setUrl] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const { toast } = useToast();
  
  // Check if user is logged in - with debugging
  const authToken = localStorage.getItem('authToken');
  const isLoggedIn = authToken !== null && authToken !== undefined && authToken !== '';
  
  // Debug logging (remove in production)
  console.log('Auth token:', authToken);
  console.log('Is logged in:', isLoggedIn);

  const demoVideos = [
    {
      id: 'news-demo',
      title: 'Hong Kong News Broadcast',
      description: 'Clear pronunciation, formal Cantonese',
      duration: '3:45',
      thumbnail: '/demo-thumbnails/hk-news.jpg',
      url: 'https://www.youtube.com/watch?v=TlC0SSeRNXc'
    },
    {
      id: 'movie-demo', 
      title: 'Classic Hong Kong Film Scene',
      description: 'Natural conversation, cultural context',
      duration: '4:12',
      thumbnail: '/demo-thumbnails/hk-movie.jpg',
      url: 'https://www.youtube.com/watch?v=YgOexHTGnXY'
    },
    {
      id: 'music-demo',
      title: 'Cantonese Music Video',
      description: 'Popular music with clear vocals',
      duration: '2:30',
      thumbnail: '/demo-thumbnails/cantonese-music.jpg',
      url: 'https://www.youtube.com/watch?v=rTOHjnH-rXE'
    }
  ];

  const validateYouTubeUrl = (url: string) => {
    const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)[a-zA-Z0-9_-]{11}/;
    const vimeoRegex = /^(https?:\/\/)?(www\.)?(vimeo\.com\/)[0-9]+/;
    
    return youtubeRegex.test(url) || vimeoRegex.test(url);
  };

  const handleCustomUrlSubmit = async () => {
    if (!url.trim()) {
      toast({
        title: "Please enter a video URL",
        variant: "destructive"
      });
      return;
    }

    if (!validateYouTubeUrl(url)) {
      toast({
        title: "Invalid URL",
        description: "Please enter a valid YouTube or Vimeo URL",
        variant: "destructive"
      });
      return;
    }

    setIsValidating(true);

    try {
      // Simulate URL validation
      await new Promise(resolve => setTimeout(resolve, 1500));

      toast({
        title: "Video found! 🎉",
        description: "Redirecting to video selection..."
      });

      // Navigate to video selection
      if (onVideoSelected) {
        onVideoSelected(url);
      }

    } catch (error) {
      toast({
        title: "Video not accessible",
        description: "Please check the URL and try again. Make sure the video is public.",
        variant: "destructive"
      });
    } finally {
      setIsValidating(false);
    }
  };

  const handleDemoSelection = async (demo: typeof demoVideos[0]) => {
    setSelectedDemo(demo.id);
    setIsLoading(true);
    
    try {
      toast({
        title: `Loading ${demo.title}...`,
        description: "Processing demo video"
      });

      // Simulate loading the pre-processed demo
      await new Promise(resolve => setTimeout(resolve, 1500));

      toast({
        title: "Demo ready! 🎉",
        description: "Redirecting to results..."
      });

      // Navigate to video results using the callback
      if (onVideoSelected) {
        onVideoSelected(demo.url);
      }

    } catch (error) {
      toast({
        title: "Demo loading error",
        description: "Please try another demo video",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
      setSelectedDemo('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleCustomUrlSubmit();
    }
  };

  return (
    <section className="pt-20 pb-16 bg-white">
      <div className="max-w-6xl mx-auto px-5 text-center">
        <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
          Transform{' '}
          <span className="bg-gradient-to-r from-orange-500 to-red-500 bg-clip-text text-transparent">
            Cantonese Videos
          </span>{' '}
          into Learning Materials
        </h1>
        
        <p className="text-xl text-gray-600 mb-12 max-w-3xl mx-auto">
          See how any YouTube video becomes interactive Cantonese learning content with 
          synchronised romanisation, vocabulary tools, and study materials.
        </p>

        {/* Debug Panel - Remove in production */}
        <div className="fixed top-4 right-4 bg-gray-800 text-white p-3 rounded text-xs">
          <div>Auth Token: {authToken || 'None'}</div>
          <div>Logged In: {isLoggedIn ? 'Yes' : 'No'}</div>
          <button 
            onClick={() => {
              localStorage.removeItem('authToken');
              window.location.reload();
            }}
            className="mt-2 bg-red-500 px-2 py-1 rounded text-xs"
          >
            Clear Login & Reload
          </button>
        </div>

        {/* Custom URL Input - Only for Logged In Users */}
        {isLoggedIn && (
          <div className="max-w-2xl mx-auto mb-12 p-6 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Process Your Own Video
            </h3>
            <div className="flex gap-3">
              <Input
                type="url"
                placeholder="Paste YouTube URL here (e.g., https://youtube.com/watch?v=...)"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyPress={handleKeyPress}
                className="flex-1 h-12 px-4 text-base border-gray-300 focus:border-orange-500 focus:ring-orange-500"
                disabled={isValidating}
              />
              <Button
                onClick={handleCustomUrlSubmit}
                disabled={isValidating || !url.trim()}
                className="h-12 px-6 bg-orange-500 hover:bg-orange-600 text-white font-semibold"
              >
                {isValidating ? (
                  <div className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
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
            <p className="text-sm text-gray-600 mt-3">
              ✅ Supports YouTube and Vimeo links • ✅ 85%+ accuracy for clear Cantonese speech
            </p>
          </div>
        )}

        {/* Demo Selection Section */}
        <div className="max-w-4xl mx-auto">
          <h3 className="text-2xl font-semibold text-gray-900 mb-4">
            {isLoggedIn ? 'Or Try a Demo Video' : 'Choose a Demo Video Below'}
          </h3>
          <p className="text-gray-600 mb-8">
            Experience the full transcription process with these curated examples
          </p>
          
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            {demoVideos.map((demo) => (
              <Card 
                key={demo.id}
                className={`cursor-pointer transition-all hover:shadow-lg hover:-translate-y-1 ${
                  selectedDemo === demo.id ? 'ring-2 ring-orange-500 shadow-lg' : ''
                } ${isLoading ? 'pointer-events-none opacity-75' : ''}`}
                onClick={() => !isLoading && handleDemoSelection(demo)}
              >
                <CardContent className="p-0">
                  <div className="aspect-video bg-gray-200 rounded-t-lg relative overflow-hidden">
                    <img 
                      src={demo.thumbnail} 
                      alt={demo.title}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        // Fallback to gradient background if image fails
                        e.currentTarget.style.display = 'none';
                        e.currentTarget.parentElement!.style.background = 'linear-gradient(135deg, #f97316, #ea580c)';
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-orange-500/20 to-red-500/20 flex items-center justify-center">
                      <div className="bg-white/90 rounded-full p-3">
                        {isLoading && selectedDemo === demo.id ? (
                          <svg className="animate-spin w-8 h-8 text-orange-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                        ) : (
                          <svg className="w-8 h-8 text-orange-500" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M8 5v14l11-7z"/>
                          </svg>
                        )}
                      </div>
                    </div>
                    <div className="absolute top-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                      {demo.duration}
                    </div>
                  </div>
                  
                  <div className="p-4 text-left">
                    <h4 className="font-semibold text-gray-900 mb-2">{demo.title}</h4>
                    <p className="text-sm text-gray-600 mb-3">{demo.description}</p>
                    <div className="text-xs text-orange-600 font-medium">
                      Click to view transcription results →
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Sign up prompt for non-logged users */}
          {!isLoggedIn && (
            <div className="mt-8 p-6 bg-blue-50 rounded-xl">
              <h4 className="font-semibold text-blue-900 mb-2">
                Want to process your own videos?
              </h4>
              <p className="text-blue-800 mb-4">
                Sign up for free to transcribe unlimited YouTube and Vimeo videos with our advanced Cantonese AI
              </p>
              <Button 
                onClick={() => window.location.href = '/auth'}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2"
              >
                Sign Up Free
              </Button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default HeroSection;