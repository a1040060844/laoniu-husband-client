import { httpState } from "./httpState";
import { localState } from "./localState";
import type { StateBackend, StateService } from "./types";

export const STATE_BACKEND: StateBackend = "local";

export const stateService: StateService = STATE_BACKEND === "local" ? localState : httpState;

export * from "./types";
