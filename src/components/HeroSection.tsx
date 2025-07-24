import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Play, ArrowRight, Languages, FileAudio } from "lucide-react";
import heroImage from "@/assets/hero-image.jpg";

const HeroSection = () => {
  return (
    <section className="relative bg-gradient-to-br from-background to-muted py-20 lg:py-32 overflow-hidden">
      <div className="container mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Column - Content */}
          <div className="space-y-8">
            <div className="space-y-4">
              <Badge variant="secondary" className="font-ui">
                <Languages className="mr-2 h-4 w-4" />
                AI-Powered Transcription
              </Badge>
              
              <h1 className="text-4xl lg:text-6xl font-bold font-ui text-foreground leading-tight">
                Transcribe Cantonese with
                <span className="text-primary"> Precision</span>
              </h1>
              
              <p className="text-lg lg:text-xl text-muted-foreground font-ui max-w-lg">
                Professional transcription of Cantonese audio and video into Chinese characters, 
                Yale romanisation, and Jyutping romanisation. Perfect for educators, linguists, 
                and language learners.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <Button size="lg" className="font-ui group">
                Start Transcribing
                <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
              </Button>
              
              <Button variant="outline" size="lg" className="font-ui">
                <Play className="mr-2 h-5 w-5" />
                Watch Demo
              </Button>
            </div>

            {/* Features Preview */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-8">
              <div className="text-center sm:text-left">
                <div className="text-2xl font-bold text-primary font-ui">3</div>
                <div className="text-sm text-muted-foreground font-ui">Output Formats</div>
              </div>
              <div className="text-center sm:text-left">
                <div className="text-2xl font-bold text-accent font-ui">AI</div>
                <div className="text-sm text-muted-foreground font-ui">Powered Engine</div>
              </div>
              <div className="text-center sm:text-left">
                <div className="text-2xl font-bold text-success font-ui">95%</div>
                <div className="text-sm text-muted-foreground font-ui">Accuracy Rate</div>
              </div>
            </div>
          </div>

          {/* Right Column - Hero Image */}
          <div className="relative">
            <div className="relative overflow-hidden rounded-2xl shadow-2xl">
              <img
                src={heroImage}
                alt="Cantonese transcription interface showing audio waveforms and Chinese characters"
                className="w-full h-auto object-cover"
              />
              
              {/* Floating Elements */}
              <div className="absolute top-4 left-4 bg-card/90 backdrop-blur-sm rounded-lg p-3 shadow-lg">
                <FileAudio className="h-6 w-6 text-primary" />
              </div>
              
              <div className="absolute bottom-4 right-4 bg-card/90 backdrop-blur-sm rounded-lg p-3 shadow-lg">
                <div className="text-sm font-medium font-transcription">
                  粵語 → Yale → Jyutping
                </div>
              </div>
            </div>

            {/* Background Decoration */}
            <div className="absolute -top-8 -right-8 w-32 h-32 bg-primary/20 rounded-full blur-3xl"></div>
            <div className="absolute -bottom-8 -left-8 w-24 h-24 bg-accent/20 rounded-full blur-2xl"></div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;