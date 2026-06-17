import type { StateService } from "./types";

function unavailable(): never {
  throw new Error("HTTP state backend is reserved for future server integration and is disabled in the local-only phase.");
}

export const httpState: StateService = {
  loadState: async () => unavailable(),
  saveState: async () => unavailable(),
  resetState: async () => unavailable(),
  submitTask: async () => unavailable(),
  approveTask: async () => unavailable(),
  rejectTask: async () => unavailable(),
  requestBenefit: async () => unavailable(),
  approveBenefit: async () => unavailable(),
  rejectBenefit: async () => unavailable(),
  createTask: async () => unavailable(),
  createDecree: async () => unavailable()
};
