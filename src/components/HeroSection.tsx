// src/components/HeroSection.tsx
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';

interface HeroSectionProps {
  onVideoSelected?: (url: string) => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({ onVideoSelected }) => {
  const [url, setUrl] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const { toast } = useToast();

  const validateYouTubeUrl = (url: string) => {
    const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)[a-zA-Z0-9_-]{11}/;
    const vimeoRegex = /^(https?:\/\/)?(www\.)?(vimeo\.com\/)[0-9]+/;
    
    return youtubeRegex.test(url) || vimeoRegex.test(url);
  };

  const extractVideoId = (url: string) => {
    // YouTube URL patterns
    const youtubeRegex = /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/;
    const youtubeMatch = url.match(youtubeRegex);
    
    if (youtubeMatch) {
      return { platform: 'youtube', id: youtubeMatch[1] };
    }
    
    // Vimeo URL patterns
    const vimeoRegex = /vimeo\.com\/([0-9]+)/;
    const vimeoMatch = url.match(vimeoRegex);
    
    if (vimeoMatch) {
      return { platform: 'vimeo', id: vimeoMatch[1] };
    }
    
    return null;
  };

  const handleSubmit = async () => {
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
      // Simulate URL validation and video info fetching
      const videoInfo = extractVideoId(url);
      
      if (!videoInfo) {
        throw new Error('Could not extract video ID');
      }

      // Simulate API call to validate video exists and is accessible
      await new Promise(resolve => setTimeout(resolve, 1500));

      toast({
        title: "Video found! 🎉",
        description: "Redirecting to video selection..."
      });

      // Call the parent callback to navigate to video selection
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

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setUrl(value);
  };

  // Sample URLs for testing
  const sampleUrls = [
    "https://youtube.com/watch?v=dQw4w9WgXcQ",
    "https://youtu.be/dQw4w9WgXcQ", 
    "https://vimeo.com/123456789"
  ];

  return (
    <section className="bg-white py-20">
      <div className="max-w-6xl mx-auto px-5 text-center">
        <h1 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-4 leading-tight">
          Accurately Convert YouTube Videos to Cantonese Transcription
        </h1>
        <p className="text-lg text-gray-600 mb-12 max-w-2xl mx-auto">
          Get Chinese characters, Yale romanisation, and Jyutping romanisation with synchronized timestamps
        </p>
        
        <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-xl p-12 max-w-3xl mx-auto hover:border-orange-500 transition-colors">
          <div className="flex gap-3 mb-6">
            <Input
              type="url"
              placeholder="Paste YouTube URL here (e.g., https://youtube.com/watch?v=...)"
              value={url}
              onChange={handleInputChange}
              onKeyPress={handleKeyPress}
              className="flex-1 h-12 px-5 text-base border-gray-300 focus:border-orange-500 focus:ring-orange-500"
              disabled={isValidating}
            />
            <Button
              onClick={handleSubmit}
              disabled={isValidating || !url.trim()}
              className="h-12 px-8 bg-orange-500 hover:bg-orange-600 text-white font-semibold"
            >
              {isValidating ? (
                <div className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Validating...
                </div>
              ) : (
                'Next Step'
              )}
            </Button>
          </div>
          
          <div className="space-y-3">
            <p className="text-sm text-gray-600">
              ✅ Supports YouTube, Vimeo and direct video links<br />
              ✅ Free tier: 3 videos per month, 10 minutes each<br />
              ✅ 85%+ accuracy for clear Cantonese speech
            </p>
            
            {/* Sample URLs for testing */}
            <div className="pt-4 border-t border-gray-200">
              <p className="text-xs text-gray-500 mb-2">Try with sample URLs:</p>
              <div className="flex gap-2 justify-center flex-wrap">
                {sampleUrls.map((sampleUrl, index) => (
                  <button
                    key={index}
                    onClick={() => setUrl(sampleUrl)}
                    className="text-xs text-orange-600 hover:text-orange-700 underline"
                    disabled={isValidating}
                  >
                    Sample {index + 1}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Benefits Section */}
        <div className="grid md:grid-cols-3 gap-8 mt-16 max-w-4xl mx-auto">
          <div className="text-center">
            <div className="text-2xl mb-2">🎯</div>
            <h3 className="font-semibold text-gray-900 mb-2">Select Duration</h3>
            <p className="text-gray-600 text-sm">Choose exactly which part of the video you want to process</p>
          </div>
          <div className="text-center">
            <div className="text-2xl mb-2">⚡</div>
            <h3 className="font-semibold text-gray-900 mb-2">Fast Processing</h3>
            <p className="text-gray-600 text-sm">Get your transcription in minutes, not hours</p>
          </div>
          <div className="text-center">
            <div className="text-2xl mb-2">📝</div>
            <h3 className="font-semibold text-gray-900 mb-2">Triple Format</h3>
            <p className="text-gray-600 text-sm">Chinese characters, Yale and Jyutping romanisation</p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;