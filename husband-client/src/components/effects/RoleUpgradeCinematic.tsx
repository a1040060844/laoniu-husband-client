import { type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { Crown } from "lucide-react";
import { CountUp } from "./CountUp";
import "./RoleUpgradeCinematic.css";

export interface RoleUpgradeCinematicEvent {
  id: string;
  audience?: "husband" | "wife";
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
  confirmDisabled?: boolean;
  confirmLabel?: string;
  error?: string;
}

const PARTICLE_COUNT = 28;
const RING_COUNT = 3;
const SHARD_CLIPS = [
  "polygon(0 0, 26% 0, 18% 28%, 0 22%)",
  "polygon(26% 0, 52% 0, 42% 34%, 18% 28%)",
  "polygon(52% 0, 78% 0, 66% 30%, 42% 34%)",
  "polygon(78% 0, 100% 0, 100% 24%, 66% 30%)",
  "polygon(0 22%, 18% 28%, 25% 52%, 0 50%)",
  "polygon(18% 28%, 42% 34%, 36% 58%, 25% 52%)",
  "polygon(42% 34%, 66% 30%, 62% 55%, 36% 58%)",
  "polygon(66% 30%, 100% 24%, 100% 48%, 62% 55%)",
  "polygon(0 50%, 25% 52%, 16% 76%, 0 78%)",
  "polygon(25% 52%, 36% 58%, 48% 78%, 16% 76%)",
  "polygon(36% 58%, 62% 55%, 72% 76%, 48% 78%)",
  "polygon(62% 55%, 100% 48%, 100% 74%, 72% 76%)",
  "polygon(0 78%, 16% 76%, 28% 100%, 0 100%)",
  "polygon(16% 76%, 48% 78%, 50% 100%, 28% 100%)",
  "polygon(48% 78%, 72% 76%, 74% 100%, 50% 100%)",
  "polygon(72% 76%, 100% 74%, 100% 100%, 74% 100%)",
];

function UpgradeParticles() {
  return (
    <>
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
    </>
  );
}

export function RoleUpgradeCinematic({
  isOpen,
  audience = "husband",
  fromLevel,
  toLevel,
  fromRoleName,
  toRoleName,
  fromRoleImage,
  toRoleImage,
  onComplete,
  confirmDisabled = false,
  confirmLabel = "\u77e5\u9053\u4e86",
  error,
}: RoleUpgradeCinematicProps) {
  if (!isOpen) return null;

  const oldImage = (
    <div className="role-upgrade-cinematic__old">
      <div className="role-upgrade-cinematic__old-frame">
        <img src={fromRoleImage} alt="" />
        {audience === "wife" || audience === "husband" ? (
          <>
            <span className="role-upgrade-cinematic__crack" aria-hidden="true" />
            <span className="role-upgrade-cinematic__shards" aria-hidden="true">
              {SHARD_CLIPS.map((clipPath, index) => (
                <i
                  key={`${clipPath}-${index}`}
                  style={
                    {
                      "--shard-clip": clipPath,
                      "--shard-x": `${((index % 4) - 1.5) * 13}px`,
                      "--shard-y": `${(Math.floor(index / 4) - 1.5) * 15}px`,
                      "--shard-rotate": `${((index % 7) - 3) * 7}deg`,
                      "--shard-delay": `${index * 24}ms`,
                      backgroundImage: `url(${fromRoleImage})`,
                    } as CSSProperties
                  }
                />
              ))}
            </span>
          </>
        ) : null}
      </div>
      <span>
        {"\u65e7\u804c\u52a1"}
      </span>
      <strong>{fromRoleName}</strong>
    </div>
  );

  const newImage = (
    <div className="role-upgrade-cinematic__new">
      <img src={toRoleImage} alt={`${toRoleName}\u804c\u52a1\u5f62\u8c61`} />
      <span>{"\u65b0\u804c\u52a1"}</span>
      <strong>{toRoleName}</strong>
    </div>
  );

  const ceremonyPanel = (
    <div className="role-upgrade-cinematic__panel">
      <header className="role-upgrade-cinematic__seal">
        <Crown className="role-upgrade-cinematic__crown" aria-hidden="true" />
        <p>
          {audience === "wife"
            ? "\u8001\u54e5\u804c\u52a1\u53d8\u5316"
            : "\u804c\u52a1\u664b\u5347"}
        </p>
        <strong>
          <span>Lv.</span>
          <CountUp value={toLevel} minimumIntegerDigits={2} />
        </strong>
        <span>
          Lv. {String(fromLevel).padStart(2, "0")} -&gt; Lv.{" "}
          {String(toLevel).padStart(2, "0")}
        </span>
        <em className="role-upgrade-cinematic__status">
          <b>{"\u68c0\u6d4b\u5230\u8001\u54e5\u804c\u52a1\u53d8\u5316"}</b>
          <b>{"\u65e7\u804c\u52a1\u6863\u6848\u89e3\u9664\u4e2d..."}</b>
          <b>{"\u65e7\u8eab\u4efd\u5df2\u89e3\u9664"}</b>
          <b>{"\u65b0\u804c\u52a1\u7b7e\u53d1\u4e2d"}</b>
          <b>{"\u65b0\u804c\u52a1\u5df2\u5f52\u6863"}</b>
        </em>
      </header>

      <div className="role-upgrade-cinematic__archive">
        <i className="role-upgrade-cinematic__corner role-upgrade-cinematic__corner--tl" />
        <i className="role-upgrade-cinematic__corner role-upgrade-cinematic__corner--tr" />
        <i className="role-upgrade-cinematic__corner role-upgrade-cinematic__corner--bl" />
        <i className="role-upgrade-cinematic__corner role-upgrade-cinematic__corner--br" />
        <span className="role-upgrade-cinematic__scanline" aria-hidden="true" />
        <span className="role-upgrade-cinematic__core" aria-hidden="true" />
        {oldImage}
        {newImage}

        <div className="role-upgrade-cinematic__result">
          <strong>{toRoleName}</strong>
        </div>
      </div>

      <footer className="role-upgrade-cinematic__footer">
        {error ? <p>{error}</p> : null}
        <button type="button" disabled={confirmDisabled} onClick={onComplete}>
          {confirmLabel}
        </button>
      </footer>
    </div>
  );

  return createPortal(
    <section
      className={`role-upgrade-cinematic role-upgrade-cinematic--ceremony role-upgrade-cinematic--${audience}`}
      aria-live="assertive"
    >
      <div className="role-upgrade-cinematic__scrim" aria-hidden="true" />
      <UpgradeParticles />
      {ceremonyPanel}
    </section>,
    document.body,
  );
}
