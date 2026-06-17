import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";

const STEPS = [
  "Extracting article text...",
  "Stage 1: ML Classification & Extracting Claims (Parallel)...",
  "Stage 2: Evaluating claims via Groq LLaMA 3.1...",
  "Stage 3: Generating hybrid verdict & explainability..."
];

export default function LoadingState() {
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    // 🚀 سرعنا التايمر جداً (400 ملي ثانية) عشان يواكب سرعة السيستم الجديد
    const timer = setInterval(() => {
      setCurrentStep((prev) => (prev < STEPS.length - 1 ? prev + 1 : prev));
    }, 400); 

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center py-12 animate-fade-in">
      <div className="relative mb-6">
        <Loader2 className="w-12 h-12 text-brand-500 animate-spin" />
        <div className="absolute inset-0 blur-xl bg-brand-500/20 rounded-full animate-pulse"></div>
      </div>
      
      <h2 className="text-2xl font-bold text-white mb-2">Analyzing Article</h2>
      
      {/* 🚀 غيرنا الجملة القديمة بجملة بتعكس قوة السيستم */}
      <p className="text-slate-400 mb-8 text-sm font-medium">
        Powered by Hybrid AI. This usually takes 1–3 seconds...
      </p>

      <div className="w-full max-w-md space-y-3">
        {STEPS.map((step, index) => {
          const isCompleted = index < currentStep;
          const isCurrent = index === currentStep;

          return (
            <div
              key={index}
              className={`flex items-center gap-3 p-3 rounded-xl transition-all duration-300 ${
                isCurrent 
                  ? "bg-surface-800 border border-surface-700 shadow-lg shadow-surface-900/20" 
                  : "border border-transparent"
              }`}
            >
              <div
                className={`w-2.5 h-2.5 rounded-full flex-shrink-0 transition-all duration-500 ${
                  isCompleted 
                    ? "bg-brand-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" 
                    : isCurrent 
                    ? "bg-blue-400 animate-pulse shadow-[0_0_8px_rgba(96,165,250,0.5)]" 
                    : "bg-surface-600"
                }`}
              />
              <span
                className={`text-sm transition-colors duration-300 ${
                  isCompleted 
                    ? "text-slate-400" 
                    : isCurrent 
                    ? "text-white font-medium" 
                    : "text-slate-600"
                }`}
              >
                {step}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}