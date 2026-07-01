import type { TaskStatus } from "../types/domain";

export function isTaskCompleteStatus(status: TaskStatus) {
  return status === "confirmed" || status === "completed";
}

export function isTaskSubmittableStatus(status: TaskStatus) {
  return status === "doing";
}

export function taskStatusAfterApproval(
  completedCount: number,
  repeatCount: number,
): TaskStatus {
  return completedCount < repeatCount ? "doing" : "completed";
}
