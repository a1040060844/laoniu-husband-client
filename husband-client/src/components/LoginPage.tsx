import { publicAsset } from "../lib/assets";

interface LoginPageProps {
  onEnterRole: (role: "husband" | "wife") => void;
}

const loginAsset = (name: string) => publicAsset(`/assets/login/${name}`);

export function LoginPage({ onEnterRole }: LoginPageProps) {
  return (
    <section className="login-page" aria-label="角色登录">
      <div className="login-stage">
        <img
          className="login-layer login-bg"
          src={loginAsset("bg-room.png")}
          alt=""
          draggable={false}
        />
        <img
          className="login-layer login-title"
          src={loginAsset("title.png")}
          alt="今天谁来上线？"
          draggable={false}
        />
        <img
          className="login-layer login-subtitle"
          src={loginAsset("subtitle.png")}
          alt="点击角色进入对应主页"
          draggable={false}
        />
        <img
          className="login-layer login-speech login-speech--husband"
          src={loginAsset("speech-husband.png")}
          alt=""
          draggable={false}
        />
        <img
          className="login-layer login-speech login-speech--wife"
          src={loginAsset("speech-wife.png")}
          alt=""
          draggable={false}
        />

        <button
          className="login-click login-click--husband-avatar"
          type="button"
          aria-label="选择老哥本人登录"
          onClick={() => onEnterRole("husband")}
        >
          <img
            className="login-layer login-avatar login-avatar--husband"
            src={loginAsset("husband.png")}
            alt="老哥本人"
            draggable={false}
          />
        </button>
        <button
          className="login-click login-click--wife-avatar"
          type="button"
          aria-label="选择老妞大人登录"
          onClick={() => onEnterRole("wife")}
        >
          <img
            className="login-layer login-avatar login-avatar--wife"
            src={loginAsset("wife.png")}
            alt="老妞大人"
            draggable={false}
          />
        </button>

        <img
          className="login-layer login-cat login-cat--blue"
          src={loginAsset("cat-blue.png")}
          alt=""
          draggable={false}
        />
        <img
          className="login-layer login-cat login-cat--white"
          src={loginAsset("cat-white.png")}
          alt=""
          draggable={false}
        />

        <button
          className="login-click login-click--husband-card"
          type="button"
          aria-label="点击老哥本人角色卡进入老公端"
          onClick={() => onEnterRole("husband")}
        >
          <img
            className="login-layer login-card login-card--husband"
            src={loginAsset("card-husband.png")}
            alt="老哥本人"
            draggable={false}
          />
        </button>
        <button
          className="login-click login-click--wife-card"
          type="button"
          aria-label="点击老妞大人角色卡进入老婆端"
          onClick={() => onEnterRole("wife")}
        >
          <img
            className="login-layer login-card login-card--wife"
            src={loginAsset("card-wife.png")}
            alt="老妞大人"
            draggable={false}
          />
        </button>
      </div>
    </section>
  );
}
