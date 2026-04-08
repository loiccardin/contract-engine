"use client";

const STEPS = [
  { number: 1, label: "Modifier" },
  { number: 2, label: "Générer" },
  { number: 3, label: "Pousser" },
];

interface StepIndicatorProps {
  currentStep: number;
}

export default function StepIndicator({ currentStep }: StepIndicatorProps) {
  return (
    <div className="flex items-center gap-2">
      {STEPS.map((step, i) => (
        <div key={step.number} className="flex items-center gap-2">
          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${
              step.number === currentStep
                ? "bg-blue-600 text-white"
                : step.number < currentStep
                  ? "bg-blue-100 text-blue-700"
                  : "bg-gray-100 text-gray-400"
            }`}
          >
            <span>{step.number}</span>
            <span>{step.label}</span>
          </div>
          {i < STEPS.length - 1 && (
            <div className={`w-8 h-0.5 ${step.number < currentStep ? "bg-blue-300" : "bg-gray-200"}`} />
          )}
        </div>
      ))}
    </div>
  );
}
