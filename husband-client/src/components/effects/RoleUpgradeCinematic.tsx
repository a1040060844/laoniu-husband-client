import { useEffect, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { CountUp } from "./CountUp";
import "./RoleUpgradeCinematic.css";

export interface RoleUpgradeCinematicEvent {
  id: string;
  fromLevel: number;
  toLevel: number;
  fromRoleName: string;
  toRoleName: string;
  fromRoleImage: string;
  toRoleImage: string;
}

interface RoleUpgradeCinematicProps extends RoleUpgradeCinematicEvent {
  isOpen: boolean;
  onComplete: () => void;
}

const PARTICLE_COUNT = 28;
const RING_COUNT = 3;

export function RoleUpgradeCinematic({
  isOpen,
  fromLevel,
  toLevel,
  fromRoleName,
  toRoleName,
  fromRoleImage,
  toRoleImage,
  onComplete,
}: RoleUpgradeCinematicProps) {
  useEffect(() => {
    if (!isOpen) return;
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const timer = window.setTimeout(onComplete, reducedMotion ? 1250 : 2850);
    return () => window.clearTimeout(timer);
  }, [isOpen, onComplete]);

  if (!isOpen) return null;

  return createPortal(
    <section className="role-upgrade-cinematic" aria-live="assertive">
      <div className="role-upgrade-cinematic__scrim" aria-hidden="true" />
      <div className="role-upgrade-cinematic__burst" aria-hidden="true">
        {Array.from({ length: PARTICLE_COUNT }, (_, index) => (
          <i
            key={index}
            style={
              {
                "--particle-angle": `${(360 / PARTICLE_COUNT) * index}deg`,
                "--particle-distance": `${72 + (index % 7) * 13}px`,
                "--particle-delay": `${(index % 9) * 24}ms`,
                "--particle-color": ["#f8dfac", "#c08a3f", "#6f3c1d"][
                  index % 3
                ],
              } as CSSProperties
            }
          />
        ))}
      </div>
      <div className="role-upgrade-cinematic__rings" aria-hidden="true">
        {Array.from({ length: RING_COUNT }, (_, index) => (
          <i
            key={index}
            style={{ "--ring-delay": `${index * 170}ms` } as CSSProperties}
          />
        ))}
      </div>

      <div className="role-upgrade-cinematic__panel">
        <div className="role-upgrade-cinematic__old">
          <img src={fromRoleImage} alt="" />
          <span>Lv. {String(fromLevel).padStart(2, "0")}</span>
          <strong>{fromRoleName}</strong>
        </div>

        <div className="role-upgrade-cinematic__seal">
          <p>职务晋升</p>
          <strong>
            Lv. <CountUp value={toLevel} minimumIntegerDigits={2} />
          </strong>
          <span>
            Lv. {String(fromLevel).padStart(2, "0")} → Lv.{" "}
            {String(toLevel).padStart(2, "0")}
          </span>
        </div>

        <div className="role-upgrade-cinematic__new">
          <img src={toRoleImage} alt={`${toRoleName}职务形象`} />
          <span>新职务</span>
          <strong>{toRoleName}</strong>
        </div>
      </div>
    </section>,
    document.body,
  );
}
