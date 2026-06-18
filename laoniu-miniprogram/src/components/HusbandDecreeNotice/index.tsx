import { useMemo, useState } from "react";
import { DecreeModal } from "../DecreeModal";
import { RoleUpgradeCinematic } from "../RoleUpgradeCinematic";
import { roles } from "../../data/roles";
import { stateService } from "../../services/state";
import type { AppState } from "../../services/state";

function payloadNumber(payload: Record<string, unknown>, key: string) {
  const value = payload[key];
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function clampLevel(level: number) {
  return Math.min(roles.length - 1, Math.max(0, Math.trunc(level)));
}

export function HusbandDecreeNotice({
  state,
  onStateChange,
}: {
  state?: AppState;
  onStateChange: (state: AppState) => void;
}) {
  const [playedUpgradeId, setPlayedUpgradeId] = useState<string | null>(null);
  const decree = useMemo(() => {
    return state?.decrees.find((item) => !item.acknowledgedAt) || null;
  }, [state]);

  if (!decree) return null;

  const decreeId = decree.id;
  const showUpgradeCinematic = decree.tone === "upgrade" && playedUpgradeId !== decree.id;
  const toLevel = clampLevel(payloadNumber(decree.payload, "toLevel") ?? state?.progress.level ?? 0);
  const fromLevel = clampLevel(payloadNumber(decree.payload, "fromLevel") ?? Math.max(0, toLevel - 1));

  async function acknowledge() {
    onStateChange(await stateService.acknowledgeDecree(decreeId));
  }

  if (showUpgradeCinematic) {
    return (
      <RoleUpgradeCinematic
        fromLevel={fromLevel}
        fromRole={roles[fromLevel]}
        onComplete={() => setPlayedUpgradeId(decree.id)}
        toLevel={toLevel}
        toRole={roles[toLevel]}
      />
    );
  }

  return <DecreeModal decree={decree} onAcknowledge={acknowledge} />;
}
