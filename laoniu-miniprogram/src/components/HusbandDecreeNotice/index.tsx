import { useMemo } from "react";
import { DecreeModal } from "../DecreeModal";
import { stateService } from "../../services/state";
import type { AppState } from "../../services/state";

export function HusbandDecreeNotice({
  state,
  onStateChange,
}: {
  state?: AppState;
  onStateChange: (state: AppState) => void;
}) {
  const decree = useMemo(() => {
    return state?.decrees.find((item) => !item.acknowledgedAt) || null;
  }, [state]);

  if (!decree) return null;

  const decreeId = decree.id;

  async function acknowledge() {
    onStateChange(await stateService.acknowledgeDecree(decreeId));
  }

  return <DecreeModal decree={decree} onAcknowledge={acknowledge} />;
}
