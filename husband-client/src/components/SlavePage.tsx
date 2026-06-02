import { ShieldAlert } from "lucide-react";
import { publicAsset } from "../lib/assets";
import type { Role, ViewKey } from "../types/domain";

interface SlavePageProps {
  role: Role;
  punishmentRemainingDays?: number;
  punishmentTotalDays?: number;
  onSelectView: (view: ViewKey) => void;
}

export function SlavePage({
  role,
  punishmentRemainingDays = 7,
  punishmentTotalDays = 7,
  onSelectView,
}: SlavePageProps) {
  const slaveImage = publicAsset("/assets/slave/slave-market.png");
  const punishmentPercent =
    punishmentTotalDays <= 0
      ? 0
      : Math.min(
          100,
          Math.round((punishmentRemainingDays / punishmentTotalDays) * 100),
        );

  return (
    <section className="slave-page role-page page-screen">
      <img
        className="cinema-image"
        src={slaveImage}
        alt="卖身奴隶状态形象"
      />
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
            <strong>表现太糟糕了</strong>
            <span>奴隶市场又新增了一个奴隶。</span>
          </div>
        </article>

        <div className="exp-block exp-block--role exp-block--slave">
          <strong>0 / {role.expRequired}</strong>
          <div className="slave-progress" aria-label="惩罚剩余进度">
            <i style={{ width: `${punishmentPercent}%` }} />
          </div>
          <p>惩罚剩余 {punishmentRemainingDays} 天</p>
        </div>

        <div className="role-dots role-dots--slave" aria-hidden="true">
          <span className="active" />
        </div>

        <button
          className="swipe-hint"
          type="button"
          onClick={() => onSelectView("tasks")}
        >
          <span>⌃</span>
          上滑查看任务
        </button>
      </div>
    </section>
  );
}
