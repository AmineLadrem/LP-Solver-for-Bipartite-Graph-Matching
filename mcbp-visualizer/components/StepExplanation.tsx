import type { Step } from "@/lib/types";

interface Props {
  currentStep: Step | null;
  fallbackMessage: string;
}

export function StepExplanation({ currentStep, fallbackMessage }: Props) {
  return (
    <div className="border-t border-border bg-surface px-5 py-3 text-sm text-text-secondary">
      {currentStep?.description ?? fallbackMessage}
    </div>
  );
}
