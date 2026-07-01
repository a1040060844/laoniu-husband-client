import { publicAsset } from "./assets";

export const soundEffectNames = [
  "ui-tap",
  "ui-open",
  "ui-close",
  "ui-disabled",
  "ui-switch",
  "ui-back",
  "ui-page-snap",
  "login-enter",
  "audio-toggle",
  "chat-open",
  "benefit-bubble-open",
  "notification-open",
  "role-preview-next",
  "role-preview-prev",
  "role-bio-open",
  "task-card-open",
  "task-start",
  "task-submit",
  "benefit-apply",
  "benefit-frozen",
  "slave-enter",
  "slave-release",
  "locked",
  "level-up",
  "task-approved",
  "task-reward-exp",
  "task-reward-money",
  "money-reward",
  "loading-complete",
  "wife-command-button",
  "wife-level-up-command",
  "wife-level-down-command",
  "task-rejected",
  "benefit-rejected",
  "slave-ruling",
  "notify-new",
  "chat-send-husband",
  "chat-send-wife",
  "ui-swipe-up",
  "ui-swipe-down",
  "pixel-transition-cover",
  "pixel-transition-reveal",
] as const;

export type SoundEffectName = (typeof soundEffectNames)[number];

interface PlaySoundEffectOptions {
  force?: boolean;
  playbackRate?: number;
  volume?: number;
}

const STORAGE_KEY = "laoniu-audio-enabled";
const audioCache = new Map<SoundEffectName, HTMLAudioElement>();
const unavailableSounds = new Set<SoundEffectName>();
const soundNameSet = new Set<string>(soundEffectNames);
const soundEffectListeners = new Set<(enabled: boolean) => void>();

const defaultVolumes: Partial<Record<SoundEffectName, number>> = {
  "audio-toggle": 0.45,
  "benefit-bubble-open": 0.5,
  "chat-open": 0.5,
  "chat-send-husband": 0.55,
  "chat-send-wife": 0.55,
  "notification-open": 0.55,
  "pixel-transition-cover": 0.65,
  "pixel-transition-reveal": 0.65,
  "role-preview-next": 0.5,
  "role-preview-prev": 0.5,
  "ui-tap": 0.45,
  "ui-switch": 0.45,
};

let soundEffectsEnabled = readInitialEnabled();

function readInitialEnabled() {
  if (typeof window === "undefined") return true;
  try {
    return window.localStorage.getItem(STORAGE_KEY) !== "0";
  } catch {
    return true;
  }
}

function soundEffectPath(name: SoundEffectName) {
  return publicAsset(`/assets/audio/sfx/${name}.mp3`);
}

function clampVolume(value: number) {
  return Math.min(1, Math.max(0, value));
}

export function isSoundEffectName(name: string): name is SoundEffectName {
  return soundNameSet.has(name);
}

export function areSoundEffectsEnabled() {
  return soundEffectsEnabled;
}

export function syncSoundEffectsEnabled() {
  soundEffectsEnabled = readInitialEnabled();
  return soundEffectsEnabled;
}

export function subscribeSoundEffects(
  listener: (enabled: boolean) => void,
): () => void {
  soundEffectListeners.add(listener);
  return () => {
    soundEffectListeners.delete(listener);
  };
}

export function setSoundEffectsEnabled(enabled: boolean) {
  soundEffectsEnabled = enabled;
  try {
    window.localStorage.setItem(STORAGE_KEY, enabled ? "1" : "0");
  } catch {
    // Audio still follows the in-memory setting when storage is unavailable.
  }
  soundEffectListeners.forEach((listener) => listener(enabled));
}

export function toggleSoundEffects() {
  const nextEnabled = !areSoundEffectsEnabled();
  setSoundEffectsEnabled(nextEnabled);
  playSoundEffect("audio-toggle", { force: true });
  return nextEnabled;
}

export function playSoundEffect(
  name: SoundEffectName,
  options: PlaySoundEffectOptions = {},
) {
  if (typeof Audio === "undefined") return;
  if (!options.force) {
    soundEffectsEnabled = readInitialEnabled();
  }
  if (!options.force && !areSoundEffectsEnabled()) return;
  if (unavailableSounds.has(name)) return;

  let audio = audioCache.get(name);
  if (!audio) {
    audio = new Audio(soundEffectPath(name));
    audio.preload = "auto";
    audio.addEventListener(
      "error",
      () => {
        unavailableSounds.add(name);
        audioCache.delete(name);
      },
      { once: true },
    );
    audioCache.set(name, audio);
  }

  audio.pause();
  audio.currentTime = 0;
  audio.volume = clampVolume(options.volume ?? defaultVolumes[name] ?? 0.7);
  audio.playbackRate = options.playbackRate ?? 1;
  audio.play().catch(() => undefined);
}
