import type { Benefit, DecreeEvent, EventLog, Punishment, Task, WalletLedgerEntry } from "../../types/domain";
import type { GameProgress } from "../../game/progression";

export type StateBackend = "local" | "http";

export interface AppState {
  progress: GameProgress;
  tasks: Task[];
  benefits: Benefit[];
  logs: EventLog[];
  punishment: Punishment;
  walletLedger: WalletLedgerEntry[];
  decrees: DecreeEvent[];
}

export interface SubmitTaskPayload {
  note?: string;
}

export interface ApproveTaskPayload {
  note?: string;
}

export interface RejectTaskPayload {
  reason?: string;
}

export interface RequestBenefitPayload {
  reason?: string;
}

export interface ApproveBenefitPayload {
  note?: string;
}

export interface RejectBenefitPayload {
  reason?: string;
}

export interface CreateTaskPayload {
  title: string;
  description: string;
  rewardExp: number;
  rewardMoney?: number;
  deadline?: string;
}

export interface CreateDecreePayload {
  title: string;
  text: string;
  tone?: DecreeEvent["tone"];
}

export interface StartSlaveModePayload {
  reason?: string;
  durationDays?: number;
  requiredRecoveryExp?: number;
}

export interface RestoreNormalModePayload {
  reason?: string;
}

export interface StateService {
  loadState(): Promise<AppState>;
  saveState(next: AppState): Promise<AppState>;
  resetState(): Promise<AppState>;
  submitTask(taskId: string, payload: SubmitTaskPayload): Promise<AppState>;
  approveTask(taskId: string, payload?: ApproveTaskPayload): Promise<AppState>;
  rejectTask(taskId: string, payload?: RejectTaskPayload): Promise<AppState>;
  requestBenefit(benefitId: string, payload?: RequestBenefitPayload): Promise<AppState>;
  approveBenefit(benefitId: string, payload?: ApproveBenefitPayload): Promise<AppState>;
  rejectBenefit(benefitId: string, payload?: RejectBenefitPayload): Promise<AppState>;
  createTask(payload: CreateTaskPayload): Promise<AppState>;
  createDecree(payload: CreateDecreePayload): Promise<AppState>;
  startSlaveMode(payload?: StartSlaveModePayload): Promise<AppState>;
  restoreNormalMode(payload?: RestoreNormalModePayload): Promise<AppState>;
}
