import { ProgressBar } from "./ProgressBar";
import { RoleNavigator } from "./RoleNavigator";
import { publicAsset } from "../lib/assets";
import type { Role, ViewKey } from "../types/domain";
import { AnimatedContent } from "./effects/AnimatedContent";
import { ClickSpark } from "./effects/ClickSpark";
import { CountUp } from "./effects/CountUp";

interface RolePageProps {
  role: Role;
  previewRole: Role;
  previewDirection: "none" | "next" | "prev";
  canPrev: boolean;
  canNext: boolean;
  roleCount: number;
  wallet: number;
  onPreviewPrev: () => void;
  onPreviewNext: () => void;
  onReturnToLogin: () => void;
  onSelectView: (view: ViewKey) => void;
}

export function RolePage({
  role,
  previewRole,
  previewDirection,
  canPrev,
  canNext,
  roleCount = 12,
  wallet,
  onPreviewPrev,
  onPreviewNext,
  onReturnToLogin,
  onSelectView,
}: RolePageProps) {
  const isPreviewing = previewRole.level !== role.level;
  const isLockedPreview = previewRole.level > role.level;
  const directionClass = `role-page--dir-${previewDirection}`;

  return (
    <section
      className={`role-page page-screen role-page--level-${String(previewRole.level).padStart(2, "0")} ${directionClass}${isLockedPreview ? " page-screen--locked-role" : ""}`}
    >
      <img
        className="cinema-image"
        src={previewRole.roleImage}
        alt={`${previewRole.title}职务形象`}
      />
      <div className="image-scrim" />
      {isLockedPreview && (
        <div className="locked-character-mask" aria-hidden="true" />
      )}

      <AnimatedContent
        as="header"
        key={`role-title-${previewRole.level}`}
        className="hero-title hero-title--role"
        duration={360}
      >
        <div className="level-line">
          <span />
          <strong>
            Lv. <CountUp value={previewRole.level} minimumIntegerDigits={2} />
          </strong>
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
          <h1>{previewRole.title}</h1>
        </div>
        <i />
      </AnimatedContent>

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

      <RoleNavigator
        canPrev={canPrev}
        canNext={canNext}
        locked={isLockedPreview}
        onPrev={onPreviewPrev}
        onNext={onPreviewNext}
      />

      <AnimatedContent
        as="div"
        key={`role-panel-${previewRole.level}`}
        className="bottom-panel bottom-panel--role"
        delay={80}
        duration={380}
      >
        <article className="bio-panel bio-panel--role">
          <p className="panel-title">
            <span /> 人物小传 <span />
          </p>
          <p>{previewRole.biography}</p>
        </article>

        {!isPreviewing && (
          <div className="exp-block exp-block--role" data-reward-target="exp">
            <strong>
              <CountUp value={previewRole.expCurrent} /> /{" "}
              <CountUp value={previewRole.expRequired} />
            </strong>
            <ProgressBar
              current={previewRole.expCurrent}
              required={previewRole.expRequired}
            />
          </div>
        )}
        {isPreviewing && (
          <div className="exp-block-placeholder" aria-hidden="true" />
        )}

        {!isPreviewing ? (
          <p className="role-wallet-line" data-reward-target="money">
            零花钱 <strong>¥ <CountUp value={wallet} /></strong>
          </p>
        ) : null}

        <div className="role-dots" aria-hidden="true">
          {Array.from({ length: roleCount }).map((_, index) => (
            <span
              key={index}
              className={index === previewRole.level ? "active" : ""}
            />
          ))}
        </div>

        <button
          className="swipe-hint swipe-hint--image"
          type="button"
          aria-label="上滑查看任务"
          onClick={() => onSelectView("tasks")}
        >
          <img src={publicAsset("/assets/ui/swipe-up.png")} alt="" />
        </button>
      </AnimatedContent>
    </section>
  );
}
