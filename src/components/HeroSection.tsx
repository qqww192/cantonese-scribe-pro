// src/components/HeroSection.tsx
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export const HeroSection = () => {
  const [selectedDemo, setSelectedDemo] = useState('');
  const [isLoading, setIsLoading] = useState(false);

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

  const handleDemoSelection = async (demoId: string) => {
    setSelectedDemo(demoId);
    setIsLoading(true);
    
    // Simulate loading the pre-processed demo
    setTimeout(() => {
      setIsLoading(false);
      // Navigate to demo results page
      window.location.href = `/demo-results/${demoId}`;
    }, 1500);
  };

  return (
    <section className="pt-24 pb-20 bg-white">
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

        {/* Demo Selection Section */}
        <div className="max-w-4xl mx-auto">
          <h3 className="text-2xl font-semibold text-gray-900 mb-4">
            Choose a Demo Video Below
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
                }`}
                onClick={() => !isLoading && handleDemoSelection(demo.id)}
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
                        <svg className="w-8 h-8 text-orange-500" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M8 5v14l11-7z"/>
                        </svg>
                      </div>
                    </div>
                    <div className="absolute top-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                      {demo.duration}
                    </div>
                  </div>
                  
                  <div className="p-4 text-left">
                    <h4 className="font-semibold text-gray-900 mb-2">{demo.title}</h4>
                    <p className="text-sm text-gray-600 mb-3">{demo.description}</p>
                    

                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {selectedDemo && (
            <Button 
              onClick={() => handleDemoSelection(selectedDemo)}
              disabled={isLoading}
              className="px-8 py-3 bg-orange-500 hover:bg-orange-600 text-white font-semibold text-lg"
            >
              {isLoading ? (
                <div className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processing Demo...
                </div>
              ) : (
                'View Demo Results'
              )}
            </Button>
          )}

          <div className="mt-8 pt-6 border-t border-gray-200">
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;