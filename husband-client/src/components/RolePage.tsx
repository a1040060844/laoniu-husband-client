import { ShieldCheck } from "lucide-react";
import { ProgressBar } from "./ProgressBar";
import { RoleNavigator } from "./RoleNavigator";
import type { Role, ViewKey } from "../types/domain";

interface RolePageProps {
  role: Role;
  previewRole: Role;
  canPrev: boolean;
  canNext: boolean;
  roleCount: number;
  onPreviewPrev: () => void;
  onPreviewNext: () => void;
  onSelectView: (view: ViewKey) => void;
}

export function RolePage({
  role,
  previewRole,
  canPrev,
  canNext,
  roleCount = 12,
  onPreviewPrev,
  onPreviewNext,
  onSelectView,
}: RolePageProps) {
  const isPreviewing = previewRole.level !== role.level;
  const isLockedPreview = previewRole.level > role.level;

  return (
    <section className={`role-page page-screen${isLockedPreview ? " page-screen--locked-role" : ""}`}>
      <img className="cinema-image" src={previewRole.roleImage} alt={`${previewRole.title}职务形象`} />
      <div className="image-scrim" />
      {isLockedPreview && <div className="locked-character-mask" aria-hidden="true" />}

      <header className="hero-title hero-title--role">
        <div className="level-line">
          <span />
          <strong>Lv. {String(previewRole.level).padStart(2, "0")}</strong>
          <span />
        </div>
        <h1>{previewRole.title}</h1>
        <i />
      </header>

      <div className="side-guide">
        <ShieldCheck size={20} />
        <span>下滑查看权益</span>
      </div>

      <RoleNavigator
        canPrev={canPrev}
        canNext={canNext}
        locked={isLockedPreview}
        onPrev={onPreviewPrev}
        onNext={onPreviewNext}
      />

      <div className="bottom-panel bottom-panel--role">
        <article className="bio-panel bio-panel--role">
          <p className="panel-title">
            <span /> 人物小传 <span />
          </p>
          <p>{previewRole.biography}</p>
        </article>

        {!isPreviewing && (
          <div className="exp-block exp-block--role">
            <strong>
              {previewRole.expCurrent} / {previewRole.expRequired}
            </strong>
            <ProgressBar current={previewRole.expCurrent} required={previewRole.expRequired} />
          </div>
        )}
        {isPreviewing && <div className="exp-block-placeholder" aria-hidden="true" />}

        <div className="role-dots" aria-hidden="true">
          {Array.from({ length: roleCount }).map((_, index) => (
            <span key={index} className={index === previewRole.level ? "active" : ""} />
          ))}
        </div>

        <button className="swipe-hint" type="button" onClick={() => onSelectView("tasks")}>
          <span>⌃</span>
          上滑查看任务
        </button>
      </div>
    </section>
  );
}
