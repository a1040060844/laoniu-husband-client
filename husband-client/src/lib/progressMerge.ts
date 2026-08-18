import type { GameProgress } from "../game/progression.ts";

function sameJson(first: unknown, second: unknown) {
  return JSON.stringify(first) === JSON.stringify(second);
}

export function mergeProgressForSave(
  serverProgress: GameProgress,
  localProgress: GameProgress,
  baseProgress?: GameProgress,
): GameProgress {
  if (!baseProgress) return localProgress;
  const localChanged = !sameJson(localProgress, baseProgress);
  const serverChanged = !sameJson(serverProgress, baseProgress);
  const rewardedTaskIds = Array.from(
    new Set([
      ...serverProgress.rewardedTaskIds,
      ...localProgress.rewardedTaskIds,
    ]),
  );
  if (localChanged && !serverChanged) {
    return { ...localProgress, rewardedTaskIds };
  }
  if (!localChanged && serverChanged) {
    return { ...serverProgress, rewardedTaskIds };
  }
  if (localChanged && serverChanged) {
    const serverLevelChanged = serverProgress.level !== baseProgress.level;
    const localLevelChanged = localProgress.level !== baseProgress.level;
    if (serverLevelChanged && !localLevelChanged) {
      return {
        ...serverProgress,
        exp: Math.max(
          0,
          serverProgress.exp + (localProgress.exp - baseProgress.exp),
        ),
        totalExp: Math.max(
          0,
          serverProgress.totalExp +
            (localProgress.totalExp - baseProgress.totalExp),
        ),
        wallet: Math.max(
          0,
          serverProgress.wallet + (localProgress.wallet - baseProgress.wallet),
        ),
        rewardedTaskIds,
      };
    }
    if (!serverLevelChanged && localLevelChanged) {
      return {
        ...localProgress,
        exp: Math.max(
          0,
          localProgress.exp + (serverProgress.exp - baseProgress.exp),
        ),
        totalExp: Math.max(
          0,
          localProgress.totalExp +
            (serverProgress.totalExp - baseProgress.totalExp),
        ),
        wallet: Math.max(
          0,
          localProgress.wallet + (serverProgress.wallet - baseProgress.wallet),
        ),
        rewardedTaskIds,
      };
    }
    if (!serverLevelChanged && !localLevelChanged) {
      return {
        ...localProgress,
        exp: Math.max(
          0,
          baseProgress.exp +
            (serverProgress.exp - baseProgress.exp) +
            (localProgress.exp - baseProgress.exp),
        ),
        totalExp: Math.max(
          0,
          baseProgress.totalExp +
            (serverProgress.totalExp - baseProgress.totalExp) +
            (localProgress.totalExp - baseProgress.totalExp),
        ),
        wallet: Math.max(
          0,
          baseProgress.wallet +
            (serverProgress.wallet - baseProgress.wallet) +
            (localProgress.wallet - baseProgress.wallet),
        ),
        rewardedTaskIds,
      };
    }
    return { ...localProgress, rewardedTaskIds };
  }
  return { ...serverProgress, rewardedTaskIds };
}
