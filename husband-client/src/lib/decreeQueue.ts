import type { DecreeEvent } from "../types/domain";

const EXPERIENCE_DECREE_TYPES = new Set([
  "experience_granted",
  "experience_penalty",
]);

function isExperienceAdjustment(decree: DecreeEvent) {
  return EXPERIENCE_DECREE_TYPES.has(decree.type);
}

function experienceDelta(decree: DecreeEvent) {
  const amount = Number(decree.payload.amount);
  const safeAmount = Number.isFinite(amount) ? Math.trunc(amount) : 0;
  if (decree.type === "experience_penalty") return -Math.abs(safeAmount);
  return Math.abs(safeAmount);
}

function experienceSummaryText(delta: number) {
  if (delta > 0) {
    return `老妞大人本次累计赏赐 ${delta} 点经验。`;
  }
  if (delta < 0) {
    return `老妞大人本次累计扣罚 ${Math.abs(delta)} 点经验，命你认真反省。`;
  }
  return "老妞大人本次经验赏罚相抵，经验没有变化。";
}

function experienceSummaryTitle(delta: number) {
  if (delta > 0) return "老妞大人赏赐";
  if (delta < 0) return "经验扣罚";
  return "经验调整";
}

export function aggregatePendingExperienceDecrees(
  pendingDecrees: DecreeEvent[],
) {
  const experienceDecrees = pendingDecrees.filter(isExperienceAdjustment);
  if (experienceDecrees.length <= 1) return pendingDecrees;

  const firstExperience = experienceDecrees[0];
  const aggregateSourceIds = experienceDecrees.map((decree) => decree.id);
  const totalDelta = experienceDecrees.reduce(
    (sum, decree) => sum + experienceDelta(decree),
    0,
  );
  const aggregate: DecreeEvent = {
    ...firstExperience,
    type: totalDelta < 0 ? "experience_penalty" : "experience_granted",
    title: experienceSummaryTitle(totalDelta),
    text: experienceSummaryText(totalDelta),
    tone: totalDelta > 0 ? "upgrade" : totalDelta < 0 ? "down" : "normal",
    payload: {
      ...firstExperience.payload,
      aggregateCount: experienceDecrees.length,
      aggregateSourceIds,
      amount: totalDelta,
      unit: "EXP",
    },
  };

  return pendingDecrees.flatMap((decree) => {
    if (!isExperienceAdjustment(decree)) return [decree];
    return decree.id === firstExperience.id ? [aggregate] : [];
  });
}

export function decreeAcknowledgeIds(decree: DecreeEvent) {
  const aggregateSourceIds = decree.payload.aggregateSourceIds;
  if (Array.isArray(aggregateSourceIds)) {
    const sourceIds = aggregateSourceIds.filter(
      (sourceId): sourceId is string => typeof sourceId === "string",
    );
    if (sourceIds.length > 0) return sourceIds;
  }
  return [decree.id];
}
