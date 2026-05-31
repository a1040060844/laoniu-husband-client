import type { ReactNode } from "react";

interface StatCardProps {
  label: string;
  value: string | number;
  icon?: ReactNode;
  muted?: string;
}

export function StatCard({ label, value, icon, muted }: StatCardProps) {
  return (
    <article className="stat-card">
      <div className="stat-card__icon">{icon}</div>
      <span>{label}</span>
      <strong>{value}</strong>
      {muted ? <small>{muted}</small> : null}
    </article>
  );
}
