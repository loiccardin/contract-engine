"use client";

const STEPS = [
  { number: 1, label: "Modifier", href: "/editor" },
  { number: 2, label: "Générer", href: "/generate" },
  { number: 3, label: "Pousser", href: "/push" },
  { number: 4, label: "Contrats", href: "/contrats" },
];

interface StepIndicatorProps {
  currentStep: number;
}

export default function StepIndicator({ currentStep }: StepIndicatorProps) {
  return (
    <div className="flex items-center gap-0">
      {STEPS.map((step, i) => {
        const isActive = step.number === currentStep;
        const isCompleted = step.number < currentStep;
        const isFuture = step.number > currentStep;

        return (
          <div key={step.number} className="flex items-center">
            {/* Step circle + label — cliquable pour accès direct à chaque étape */}
            <a href={step.href} className="flex flex-col items-center gap-1.5 group">
              <div
                className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-semibold transition-colors group-hover:ring-2 group-hover:ring-indigo-200 ${
                  isCompleted
                    ? "bg-emerald-500 text-white"
                    : isActive
                      ? "bg-indigo-600 text-white"
                      : "bg-gray-200 text-gray-400"
                }`}
              >
                {isCompleted ? (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  step.number
                )}
              </div>
              <span
                className={`text-xs font-medium ${
                  isActive
                    ? "text-indigo-600"
                    : isCompleted
                      ? "text-emerald-600"
                      : "text-gray-400"
                }`}
              >
                {step.label}
              </span>
            </a>

            {/* Connecting line */}
            {i < STEPS.length - 1 && (
              <div
                className={`w-12 h-0.5 mx-3 mb-6 ${
                  isCompleted ? "bg-emerald-400" : isFuture ? "bg-gray-200" : "bg-gray-200"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
