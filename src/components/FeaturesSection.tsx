import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Languages, 
  FileText, 
  Zap, 
  Download, 
  Globe, 
  Shield,
  Timer,
  Users,
  CheckCircle
} from "lucide-react";

const FeaturesSection = () => {
  const features = [
    {
      icon: Languages,
      title: "Triple Output Format",
      description: "Get transcriptions in Chinese characters, Yale romanisation, and Jyutping romanisation simultaneously.",
      badge: "Core Feature"
    },
    {
      icon: Zap,
      title: "AI-Powered Accuracy",
      description: "Advanced machine learning models trained specifically on Cantonese speech patterns for superior accuracy.",
      badge: "AI Enhanced"
    },
    {
      icon: FileText,
      title: "Multiple Export Options",
      description: "Export your transcriptions in TXT, SRT, CSV, or JSON formats for maximum compatibility.",
      badge: "Flexible"
    },
    {
      icon: Timer,
      title: "Real-time Processing",
      description: "Watch your transcriptions appear in real-time with live progress indicators and status updates.",
      badge: "Live Updates"
    },
    {
      icon: Globe,
      title: "URL Support",
      description: "Transcribe directly from YouTube, Vimeo, and other video platforms without downloading.",
      badge: "Web Integration"
    },
    {
      icon: Shield,
      title: "Secure & Private",
      description: "Your files are processed securely and automatically deleted after transcription completion.",
      badge: "Privacy First"
    }
  ];

  const stats = [
    { number: "50+", label: "Supported Formats" },
    { number: "95%", label: "Accuracy Rate" },
    { number: "10k+", label: "Hours Transcribed" },
    { number: "24/7", label: "Processing Available" }
  ];

  return (
    <section id="features" className="py-20 bg-card">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <Badge variant="secondary" className="mb-4 font-ui">
            <CheckCircle className="mr-2 h-4 w-4" />
            Powerful Features
          </Badge>
          <h2 className="text-3xl lg:text-5xl font-bold font-ui mb-6">
            Everything you need for
            <span className="text-primary"> Cantonese transcription</span>
          </h2>
          <p className="text-lg text-muted-foreground font-ui">
            Professional-grade tools designed specifically for Cantonese language processing,
            from basic transcription to advanced linguistic analysis.
          </p>
        </div>

        {/* Stats Bar */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {stats.map((stat, index) => (
            <div key={index} className="text-center p-6 bg-background rounded-lg border border-border">
              <div className="text-3xl font-bold text-primary font-ui mb-2">{stat.number}</div>
              <div className="text-sm text-muted-foreground font-ui">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <Card key={index} className="border-border hover:shadow-lg transition-shadow duration-300">
              <CardHeader>
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-primary/10 rounded-lg">
                    <feature.icon className="h-6 w-6 text-primary" />
                  </div>
                  <Badge variant="outline" className="text-xs font-ui">
                    {feature.badge}
                  </Badge>
                </div>
                <CardTitle className="font-ui text-xl">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground font-ui">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="text-center mt-16">
          <div className="inline-flex items-center space-x-2 text-sm text-muted-foreground font-ui mb-4">
            <Users className="h-4 w-4" />
            <span>Trusted by educators, linguists, and language learners worldwide</span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;