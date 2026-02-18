import { useState } from "react";
import type { IncidentInput } from "../../lib/api";

export type WizardData = Partial<IncidentInput> & {
  detection_datetime: string;
  incident_type: "cyber" | "operational" | "payment";
  personal_data_involved: boolean;
};

const initialData: WizardData = {
  detection_datetime: new Date().toISOString().slice(0, 16),
  incident_type: "cyber",
  personal_data_involved: false,
  primary_criteria: [],
  materiality_thresholds: [],
  is_recurring: false,
  description: "",
};

export function useWizard() {
  const [step, setStep] = useState(1);
  const [data, setData] = useState<WizardData>(initialData);

  const update = (fields: Partial<WizardData>) =>
    setData((prev) => ({ ...prev, ...fields }));

  const getStepOrder = () => {
    const steps = [1, 2];
    if (data.personal_data_involved) steps.push(3);
    if (data.incident_type === "cyber") steps.push(4);
    steps.push(5);
    return steps;
  };

  const nextStep = () => {
    const order = getStepOrder();
    const idx = order.indexOf(step);
    if (idx < order.length - 1) setStep(order[idx + 1]);
  };

  const prevStep = () => {
    const order = getStepOrder();
    const idx = order.indexOf(step);
    if (idx > 0) setStep(order[idx - 1]);
  };

  const isLastStep = () => {
    const order = getStepOrder();
    return step === order[order.length - 1];
  };

  const progress = () => {
    const order = getStepOrder();
    return ((order.indexOf(step) + 1) / order.length) * 100;
  };

  return { step, data, update, nextStep, prevStep, isLastStep, progress };
}
