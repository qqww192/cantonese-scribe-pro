// src/components/HowItWorks.tsx
export const HowItWorks = () => {
  const steps = [
    {
      number: "1",
      title: "Paste YouTube URL",
      description: "Simply paste any YouTube video URL containing Cantonese speech into the input field above."
    },
    {
      number: "2", 
      title: "AI Processing",
      description: "Our advanced speech recognition processes the audio and generates accurate transcription and romanisation."
    },
    {
      number: "3",
      title: "Download Results", 
      description: "Get your transcription in Chinese characters, Yale and Jyutping formats with synchronized timestamps."
    }
  ];

  return (
    <section className="py-20 bg-white">
      <div className="max-w-6xl mx-auto px-5">
        <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
          How It Works
        </h2>
        
        <div className="grid md:grid-cols-3 gap-10 max-w-4xl mx-auto">
          {steps.map((step) => (
            <div key={step.number} className="text-center">
              <div className="w-12 h-12 bg-orange-500 text-white rounded-full flex items-center justify-center text-lg font-bold mx-auto mb-5">
                {step.number}
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                {step.title}
              </h3>
              <p className="text-gray-600 leading-relaxed">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;