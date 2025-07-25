// src/components/HeroSection.tsx
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';

export const HeroSection = () => {
  const [url, setUrl] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const handleConvert = async () => {
    if (!url.trim()) {
      toast({
        title: "Please enter a YouTube URL",
        variant: "destructive"
      });
      return;
    }

    // Basic URL validation
    if (!url.includes('youtube.com') && !url.includes('youtu.be') && !url.includes('vimeo.com')) {
      toast({
        title: "Please enter a valid YouTube or Vimeo URL",
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);
    
    // Simulate processing
    setTimeout(() => {
      toast({
        title: "Demo: Video processing complete! 🎉",
        description: "You would receive: ✅ Chinese characters ✅ Yale romanisation ✅ Jyutping romanisation ✅ SRT/VTT files ✅ Synchronized timestamps"
      });
      setIsProcessing(false);
      setUrl('');
    }, 2500);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleConvert();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setUrl(value);
  };

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
            />
            <Button
              onClick={handleConvert}
              disabled={isProcessing}
              className="h-12 px-8 bg-orange-500 hover:bg-orange-600 text-white font-semibold"
            >
              {isProcessing ? 'Processing...' : 'Convert Now'}
            </Button>
          </div>
          <p className="text-sm text-gray-600">
            Supports YouTube, Vimeo and direct video links • Free: 5 minutes per month
          </p>
        </div>
      </div>
    </section>
  );
};