// src/components/Features.tsx
export const Features = () => {
  const features = [
    {
      icon: "📝",
      title: "Triple Format Output",
      description: "Chinese characters, Yale romanisation, and Jyutping romanisation in one conversion"
    },
    {
      icon: "⏱️",
      title: "Synchronized Timestamps", 
      description: "Every transcription line includes precise timestamps for easy video navigation"
    },
    {
      icon: "🎯",
      title: "High Accuracy",
      description: "85%+ accuracy for clear Cantonese speech using advanced AI models"
    },
    {
      icon: "📱",
      title: "Multiple Formats",
      description: "Export as SRT, VTT, TXT, or CSV for use in any video player or learning app"
    },
    {
      icon: "⚡",
      title: "Fast Processing",
      description: "Most videos processed in under 3 minutes, regardless of video length"
    },
    {
      icon: "🔒",
      title: "Secure & Private",
      description: "Videos are processed securely and deleted after conversion. No data stored."
    }
  ];

  return (
    <section className="py-20 bg-gray-50">
      <div className="max-w-6xl mx-auto px-5">
        <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
          Features
        </h2>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div 
              key={index}
              className="bg-white p-8 rounded-xl text-center shadow-sm hover:shadow-md transition-shadow border border-gray-100 hover:-translate-y-1 transition-transform"
            >
              <div className="text-3xl mb-4">
                {feature.icon}
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                {feature.title}
              </h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;