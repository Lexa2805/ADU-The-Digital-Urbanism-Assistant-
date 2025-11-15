import { DossierStep } from "@/types";

interface StatusTimelineProps {
  steps: DossierStep[];
  currentStep: number;
}

export default function StatusTimeline({ steps, currentStep }: StatusTimelineProps) {
  const getStepColor = (step: DossierStep, index: number) => {
    switch (step.status) {
      case "done":
        return "bg-purple-600";
      case "in_progress":
        return "bg-purple-500";
      case "pending":
        return "bg-gray-300";
      default:
        return "bg-gray-300";
    }
  };

  const getLineColor = (index: number, nextStep?: DossierStep) => {
    if (!nextStep) return "bg-gray-300";
    if (nextStep.status === "done") return "bg-purple-600";
    if (nextStep.status === "in_progress") return "bg-gradient-to-r from-purple-600 to-purple-400";
    return "bg-gray-300";
  };

  const getStepIcon = (step: DossierStep) => {
    switch (step.status) {
      case "done":
        return (
          <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
              clipRule="evenodd"
            />
          </svg>
        );
      case "in_progress":
        return (
          <div className="w-3 h-3 bg-white rounded-full animate-pulse" />
        );
      default:
        return (
          <div className="w-3 h-3 bg-white rounded-full opacity-50" />
        );
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto py-8">
      <div className="relative">
        {steps.map((step, index) => {
          const isLast = index === steps.length - 1;
          const nextStep = !isLast ? steps[index + 1] : undefined;

          return (
            <div key={step.id} className="relative">
              {/* Timeline Item */}
              <div className="flex items-start gap-4 pb-8">
                {/* Icon Container */}
                <div className="relative flex flex-col items-center">
                  <div
                    className={`flex items-center justify-center w-10 h-10 rounded-full ${getStepColor(
                      step,
                      index
                    )} shadow-lg z-10 transition-all ${
                      step.status === "in_progress" ? "ring-4 ring-purple-200" : ""
                    }`}
                  >
                    {getStepIcon(step)}
                  </div>

                  {/* Connecting Line */}
                  {!isLast && (
                    <div
                      className={`w-0.5 h-full absolute top-10 ${getLineColor(
                        index,
                        nextStep
                      )}`}
                      style={{ minHeight: "40px" }}
                    />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 pt-1">
                  <h3
                    className={`text-base font-semibold ${
                      step.status === "in_progress"
                        ? "text-purple-700"
                        : step.status === "done"
                        ? "text-purple-600"
                        : "text-gray-500"
                    }`}
                  >
                    {step.label}
                  </h3>
                  
                  {step.status === "in_progress" && (
                    <p className="text-sm text-gray-600 mt-1">
                      În procesare...
                    </p>
                  )}
                  {step.status === "done" && (
                    <p className="text-sm text-purple-600 mt-1">
                      Completat ✓
                    </p>
                  )}
                  {step.status === "pending" && (
                    <p className="text-sm text-gray-500 mt-1">
                      În așteptare
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
