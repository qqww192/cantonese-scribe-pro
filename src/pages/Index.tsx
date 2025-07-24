import Header from "@/components/Header";
import HeroSection from "@/components/HeroSection";
import FeaturesSection from "@/components/FeaturesSection";
import FileUpload from "@/components/FileUpload";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const Index = () => {
  return (
    <div className="min-h-screen bg-background font-ui">
      <Header />
      <HeroSection />
      <FeaturesSection />
      
      {/* Upload Section */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl lg:text-4xl font-bold font-ui mb-4">
                Ready to get started?
              </h2>
              <p className="text-lg text-muted-foreground font-ui">
                Upload your Cantonese audio or video files and receive accurate transcriptions 
                in minutes, not hours.
              </p>
            </div>
            
            <FileUpload />
          </div>
        </div>
      </section>
    </div>
  );
};

export default Index;
