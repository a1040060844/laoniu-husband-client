import { useEffect, useState, type SyntheticEvent } from "react";
import bgRoom from "../assets/login/bg-room.png";
import { publicAsset } from "../lib/assets";
import type { AppRoute } from "../lib/preloadAssets";
import "./AppLoadingPage.css";
import { ClickSpark } from "./effects/ClickSpark";

export type LoadingBackdropMode = "current" | "room";
export type LoadingPhase = "loading" | "ready" | "error";

interface AppLoadingPageProps {
  target: AppRoute;
  percent: number;
  phase: LoadingPhase;
  backdropMode: LoadingBackdropMode;
  onContinue: () => void;
  onRetry: () => void;
}

const loadingCopy: Record<AppRoute, string[]> = {
  login: ["正在整理登录场景……", "正在叫醒两只小猫……"],
  husband: [
    "正在检查今日任务……",
    "正在清点零花钱……",
    "正在换上职务制服……",
    "正在等待老妞裁定……",
  ],
  wife: [
    "正在调取老哥表现记录……",
    "正在整理今日待处理……",
    "正在加载赏罚权限……",
    "正在准备裁定页面……",
  ],
};

function hideBrokenImage(event: SyntheticEvent<HTMLImageElement>) {
  event.currentTarget.hidden = true;
}

export function AppLoadingPage({
  target,
  percent,
  phase,
  backdropMode,
  onContinue,
  onRetry,
}: AppLoadingPageProps) {
  const [copyIndex, setCopyIndex] = useState(0);
  const phrases = loadingCopy[target];
  const displayPercent = phase === "ready"
    ? 100
    : Math.max(0, Math.min(99, Math.round(percent)));
  const filledSegments = displayPercent <= 0
    ? 0
    : displayPercent >= 100
      ? 13
      : Math.max(1, Math.round((displayPercent / 100) * 13));

  useEffect(() => {
    setCopyIndex(0);
    if (phase !== "loading" || phrases.length < 2) return;
    const timer = window.setInterval(() => {
      setCopyIndex((current) => (current + 1) % phrases.length);
    }, 1_450);
    return () => window.clearInterval(timer);
  }, [phase, phrases]);

  const statusText = phase === "error"
    ? "部分素材加载失败"
    : phase === "ready"
      ? target === "wife" ? "老妞端准备完成" : "老哥档案整理完成"
      : target === "wife" ? "正在打开老妞控制台…" : "正在整理老哥档案…";
  const taskText = phase === "error"
    ? "请检查网络后重试…"
    : phase === "ready"
      ? "准备完成，请点击继续进入"
      : phrases[copyIndex];

  return (
    <section
      className={`loading-page loading-page--${backdropMode}`}
      aria-label={phase === "error" ? "加载失败" : "页面加载中"}
      aria-modal="true"
      role="dialog"
    >
      {backdropMode === "room" ? (
        <img className="loading-page__room" src={bgRoom} alt="" />
      ) : null}
      <div className="loading-page__shade" aria-hidden="true" />

      <div className={`loading-stage loading-stage--${phase}`}>
        <img
          className="loading-stage__logo"
          src={publicAsset("/assets/loading/loading-logo.png")}
          alt="老妞大人宠宠我"
          onError={hideBrokenImage}
        />
        <img
          className="loading-stage__panel"
          src={publicAsset("/assets/loading/loading-psd-panel.png")}
          alt=""
          onError={hideBrokenImage}
        />

        {phase === "error" ? (
          <img
            className="loading-stage__alert"
            src={publicAsset("/assets/loading/loading-alert.png")}
            alt="加载失败"
            onError={hideBrokenImage}
          />
        ) : (
          <>
            <img
              className="loading-stage__husband"
              src={publicAsset("/assets/loading/loading-psd-husband.png")}
              alt="老哥"
              onError={hideBrokenImage}
            />
            <img
              className="loading-stage__wife"
              src={publicAsset("/assets/loading/loading-psd-wife.png")}
              alt="老妞大人"
              onError={hideBrokenImage}
            />
          </>
        )}

        <div
          className={`loading-stage__status${
            phase === "loading" && target === "husband"
              ? " loading-stage__status--image"
              : " loading-stage__status--text"
          }`}
          aria-live="polite"
        >
          {phase === "loading" && target === "husband" ? (
            <img
              src={publicAsset("/assets/loading/loading-status-husband.png")}
              alt="正在整理老哥档案"
              onError={hideBrokenImage}
            />
          ) : (
            <span>{statusText}</span>
          )}
        </div>

        <div className="loading-stage__task" aria-live="polite">
          {phase === "loading" && target === "husband" && copyIndex === 0 ? (
            <img
              src={publicAsset("/assets/loading/loading-task-husband.png")}
              alt="正在检查今日任务"
              onError={hideBrokenImage}
            />
          ) : (
            <span>{taskText}</span>
          )}
        </div>

        <div
          className="loading-stage__progress"
          role="progressbar"
          aria-label="资源加载进度"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={displayPercent}
        >
          <img
            className="loading-stage__progress-track"
            src={publicAsset("/assets/loading/loading-progress-track.png")}
            alt=""
            onError={hideBrokenImage}
          />
          <div className="loading-stage__segments" aria-hidden="true">
            {Array.from({ length: filledSegments }, (_, index) => (
              <img
                key={index}
                src={publicAsset("/assets/loading/loading-progress-block.png")}
                alt=""
                onError={hideBrokenImage}
              />
            ))}
          </div>
          <strong>{displayPercent}%</strong>
        </div>

        <img
          className="loading-stage__tip"
          src={publicAsset("/assets/loading/loading-tip.png")}
          alt="小贴士：完成任务可以提升职务等级哦"
          onError={hideBrokenImage}
        />

        {phase === "ready" ? (
          <ClickSpark>
            <button
              className="loading-stage__action"
              type="button"
              aria-label="继续进入"
              onClick={onContinue}
            >
              <img
                src={publicAsset("/assets/loading/loading-continue-button.png")}
                alt="继续进入"
                onError={hideBrokenImage}
              />
            </button>
          </ClickSpark>
        ) : null}

        {phase === "error" ? (
          <button
            className="loading-stage__action"
            type="button"
            aria-label="重试加载"
            onClick={onRetry}
          >
            <img
              src={publicAsset("/assets/loading/loading-retry-button.png")}
              alt="重试"
              onError={hideBrokenImage}
            />
          </button>
        ) : null}
      </div>
    </section>
  );
}
