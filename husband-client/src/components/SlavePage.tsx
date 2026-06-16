import { publicAsset } from "../lib/assets";
import { getPunishmentRemainingDays } from "../lib/taskSystem";
import type { Punishment, Role, ViewKey } from "../types/domain";
import { ClickSpark } from "./effects/ClickSpark";

interface SlavePageProps {
  role: Role;
  punishment: Punishment;
  onReturnToLogin: () => void;
  onSelectView: (view: ViewKey) => void;
}

export function SlavePage({
  role,
  punishment,
  onReturnToLogin,
  onSelectView,
}: SlavePageProps) {
  const slaveImage = publicAsset("/assets/slave/slave-page-latest.png");
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
        <div className="role-title-row">
          <ClickSpark>
            <button
              className="role-return-login-button"
              type="button"
              aria-label="返回登录"
              onClick={onReturnToLogin}
            >
              <img
                src={publicAsset("/assets/ui/return-login.png?v=3f13165c")}
                alt=""
              />
            </button>
          </ClickSpark>
          <h1>{role.title}</h1>
        </div>
        <i />
      </header>

      <button
        className="side-guide side-guide--image"
        type="button"
        aria-label="下滑查看权益"
        onClick={() => onSelectView("benefits")}
      >
        <img
          src={publicAsset("/assets/ui/swipe-down.png?v=2a55bb1a")}
          alt=""
        />
      </button>

      <div className="bottom-panel bottom-panel--role bottom-panel--slave">
        <article className="bio-panel bio-panel--role bio-panel--slave">
          <p className="panel-title">
            <span /> 人物小传 <span />
          </p>
          <div className="slave-bio-copy">
            <strong>表现太糟糕了</strong>
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
          className="swipe-hint swipe-hint--image"
          type="button"
          aria-label="上滑查看任务"
          onClick={() => onSelectView("tasks")}
        >
          <img src={publicAsset("/assets/ui/swipe-up.png")} alt="" />
        </button>
      </div>
    </section>
  );
}
