import type { ReactNode } from "react";
import { AnimatedContent } from "./effects/AnimatedContent";

interface StatCardProps {
  label: string;
  value: ReactNode;
  icon?: ReactNode;
  muted?: string;
  rewardTarget?: "exp" | "money";
}

export function StatCard({
  label,
  value,
  icon,
  muted,
  rewardTarget,
}: StatCardProps) {
  return (
    <AnimatedContent
      as="article"
      className="stat-card"
      data-reward-target={rewardTarget}
      duration={320}
    >
      <div className="stat-card__icon">{icon}</div>
      <span>{label}</span>
      <strong>{value}</strong>
      {muted ? <small>{muted}</small> : null}
    </AnimatedContent>
  );
}
