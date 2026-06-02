import { ShieldAlert } from "lucide-react";
import { publicAsset } from "../lib/assets";
import { getPunishmentRemainingDays } from "../lib/taskSystem";
import type { Punishment, Role, ViewKey } from "../types/domain";

interface SlavePageProps {
  role: Role;
  punishment: Punishment;
  onSelectView: (view: ViewKey) => void;
}

export function SlavePage({ role, punishment, onSelectView }: SlavePageProps) {
  const slaveImage = publicAsset("/assets/slave/slave-market.png");
  const punishmentRemainingDays = getPunishmentRemainingDays(punishment);
  const recoveryPercent = Math.min(
    100,
    Math.round(
      (punishment.recoveryExp / punishment.requiredRecoveryExp) * 100,
    ),
  );

  return (
    <section className="slave-page role-page page-screen">
      <img className="cinema-image" src={slaveImage} alt="卖身奴隶状态形象" />
      <div className="image-scrim" />
      <div className="locked-character-mask" aria-hidden="true" />

      <header className="hero-title hero-title--role hero-title--slave">
        <div className="level-line">
          <span />
          <strong>FINAL</strong>
          <span />
        </div>
        <h1>卖身奴隶</h1>
        <i />
      </header>

      <div className="side-guide side-guide--slave">
        <ShieldAlert size={20} />
        <span>下滑查看权益</span>
      </div>

      <div className="bottom-panel bottom-panel--role bottom-panel--slave">
        <article className="bio-panel bio-panel--role bio-panel--slave">
          <p className="panel-title">
            <span /> 人物小传 <span />
          </p>
          <div className="slave-bio-copy">
            <strong>{role.title}</strong>
            <span>{role.biography}</span>
          </div>
        </article>

        <div className="exp-block exp-block--role exp-block--slave">
          <strong>
            {punishment.recoveryExp} / {punishment.requiredRecoveryExp}
          </strong>
          <div className="slave-progress" aria-label="恢复经验进度">
            <i style={{ width: `${recoveryPercent}%` }} />
          </div>
          <p>惩罚剩余 {punishmentRemainingDays} 天 · 恢复进度</p>
        </div>

        <div className="role-dots role-dots--slave" aria-hidden="true">
          <span className="active" />
        </div>

        <button
          className="swipe-hint"
          type="button"
          onClick={() => onSelectView("tasks")}
        >
          <span>∧</span>
          上滑查看任务
        </button>
      </div>
    </section>
  );
}
