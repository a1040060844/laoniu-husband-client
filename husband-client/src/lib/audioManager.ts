import { publicAsset } from "./assets";
import { setSoundEffectsEnabled } from "./soundEffects";

export const AUDIO_STORAGE_KEY = "laoniu-audio-enabled";
export const BGM_VOLUME = 0.12;
export const ROLE_PREVIEW_BGM_VOLUME = 0.09;
export const WIFE_BGM_VOLUME = 0.12;
export const SLAVE_BGM_VOLUME = 0.14;
export const WIFE_TASK_COMPLETE_BGM_VOLUME = 0.13;
export const LOGIN_BGM_VOLUME = 0.1;

interface BgmOptions {
  volume?: number;
}

interface TrackRequest {
  trackKey: string;
  volume: number;
}

const roleTrackPaths = Array.from({ length: 12 }, (_, level) =>
  publicAsset(`/assets/audio/bgm/roles/bgm-role-${String(level).padStart(2, "0")}.mp3`),
);

const trackPaths: Record<string, string> = {
  login: publicAsset("/assets/audio/bgm/bgm-login.mp3"),
  "wife-00-02": publicAsset("/assets/audio/bgm/wife/bgm-wife-00-02.mp3"),
  "wife-03-04": publicAsset("/assets/audio/bgm/wife/bgm-wife-03-04.mp3"),
  "wife-05-06": publicAsset("/assets/audio/bgm/wife/bgm-wife-05-06.mp3"),
  "wife-07-08": publicAsset("/assets/audio/bgm/wife/bgm-wife-07-08.mp3"),
  "wife-09-10": publicAsset("/assets/audio/bgm/wife/bgm-wife-09-10.mp3"),
  "wife-11": publicAsset("/assets/audio/bgm/wife/bgm-wife-11.mp3"),
  "wife-task-complete": publicAsset("/assets/audio/bgm/wife/bgm-wife-task-complete.mp3"),
  slave: publicAsset("/assets/audio/bgm/bgm-slave.mp3"),
};

roleTrackPaths.forEach((path, level) => {
  trackPaths[`role-${level}`] = path;
});

let audioEnabled = readAudioEnabled();
let audioUnlocked = false;
let currentAudio: HTMLAudioElement | null = null;
let currentTrackKey: string | null = null;
let currentVolume = BGM_VOLUME;
let pendingTrack: TrackRequest | null = null;
let bgmLoopTimer: number | null = null;
const fadeTimers = new Set<number>();
const fadingAudios = new Set<HTMLAudioElement>();

const unavailableTracks = new Set<string>();
const audioEnabledListeners = new Set<(enabled: boolean) => void>();

function normalizedAudioPath(path: string) {
  if (/^https?:\/\//.test(path) || path.startsWith("blob:")) return path;
  return path.startsWith("/") ? publicAsset(path) : path;
}

function nearestRoleTrackKey(level: number) {
  const safeLevel = Math.max(0, Math.trunc(level));
  for (let current = safeLevel; current >= 0; current -= 1) {
    if (trackPaths[`role-${current}`]) return `role-${current}`;
  }
  return "role-0";
}

function readAudioEnabled() {
  if (typeof window === "undefined") return true;
  try {
    return window.localStorage.getItem(AUDIO_STORAGE_KEY) !== "0";
  } catch {
    return true;
  }
}

function writeAudioEnabled(enabled: boolean) {
  try {
    window.localStorage.setItem(AUDIO_STORAGE_KEY, enabled ? "1" : "0");
  } catch {
    // Keep the in-memory state when storage is unavailable.
  }
}

function clampVolume(value: number) {
  return Math.min(1, Math.max(0, value));
}

function clearBgmLoopTimer() {
  if (bgmLoopTimer !== null) {
    window.clearTimeout(bgmLoopTimer);
    bgmLoopTimer = null;
  }
}

function clearFadeTimer() {
  fadeTimers.forEach((timer) => window.clearInterval(timer));
  fadeTimers.clear();
  fadingAudios.forEach((audio) => releaseAudio(audio));
  fadingAudios.clear();
}

function releaseAudio(audio: HTMLAudioElement) {
  audio.pause();
  audio.removeAttribute("src");
  audio.load();
}

function fadeOutAndRelease(audio: HTMLAudioElement, durationMs = 800) {
  const startVolume = audio.volume;
  const startedAt = window.performance.now();

  fadingAudios.add(audio);
  const timer = window.setInterval(() => {
    const elapsed = window.performance.now() - startedAt;
    const progress = Math.min(1, elapsed / durationMs);
    audio.volume = startVolume * (1 - progress);
    if (progress >= 1) {
      window.clearInterval(timer);
      fadeTimers.delete(timer);
      fadingAudios.delete(audio);
      releaseAudio(audio);
    }
  }, 50);
  fadeTimers.add(timer);
}

function scheduleBgmReplay(trackKey: string) {
  clearBgmLoopTimer();
  bgmLoopTimer = window.setTimeout(() => {
    if (!audioEnabled) return;
    if (!audioUnlocked) return;
    if (currentTrackKey !== trackKey) return;
    replayCurrentBgm();
  }, 2000);
}

function replayCurrentBgm() {
  if (!currentAudio || !currentTrackKey) return;
  currentAudio.currentTime = 0;
  currentAudio.volume = currentVolume;
  currentAudio.play().catch(() => undefined);
}

function playRequestedTrack(request: TrackRequest) {
  if (typeof Audio === "undefined") return;
  const path = trackPaths[request.trackKey];
  if (!path || unavailableTracks.has(request.trackKey)) return;

  currentVolume = request.volume;

  if (currentTrackKey === request.trackKey && currentAudio) {
    currentAudio.volume = request.volume;
    if (currentAudio.paused && audioEnabled && audioUnlocked) {
      currentAudio.play().catch(() => undefined);
    }
    return;
  }

  clearBgmLoopTimer();
  if (currentAudio) {
    fadeOutAndRelease(currentAudio);
  }

  const nextAudio = new Audio(path);
  nextAudio.loop = false;
  nextAudio.preload = "auto";
  nextAudio.volume = request.volume;
  nextAudio.addEventListener("ended", () => scheduleBgmReplay(request.trackKey));
  nextAudio.addEventListener(
    "error",
    () => {
      unavailableTracks.add(request.trackKey);
      if (currentAudio === nextAudio) {
        currentAudio = null;
        currentTrackKey = null;
      }
    },
    { once: true },
  );

  currentAudio = nextAudio;
  currentTrackKey = request.trackKey;
  nextAudio.play().catch(() => undefined);
}

function requestBgm(trackKey: string, volume: number) {
  pendingTrack = { trackKey, volume: clampVolume(volume) };
  if (!audioEnabled || !audioUnlocked) return;
  playRequestedTrack(pendingTrack);
}

function notifyAudioEnabled() {
  audioEnabledListeners.forEach((listener) => listener(audioEnabled));
}

export function unlockAudio() {
  audioEnabled = readAudioEnabled();
  setSoundEffectsEnabled(audioEnabled);
  audioUnlocked = true;
  if (audioEnabled && pendingTrack) {
    playRequestedTrack(pendingTrack);
  }
}

export function isAudioUnlocked() {
  return audioUnlocked;
}

export function setAudioEnabled(enabled: boolean) {
  audioEnabled = enabled;
  writeAudioEnabled(enabled);
  setSoundEffectsEnabled(enabled);
  notifyAudioEnabled();

  if (!enabled) {
    stopCurrentBgm(false);
    return;
  }

  if (audioUnlocked && pendingTrack) {
    playRequestedTrack(pendingTrack);
  }
}

export function getAudioEnabled() {
  audioEnabled = readAudioEnabled();
  return audioEnabled;
}

export function subscribeAudioEnabled(listener: (enabled: boolean) => void) {
  audioEnabledListeners.add(listener);
  return () => {
    audioEnabledListeners.delete(listener);
  };
}

export function playBgm(trackKey: string, options: BgmOptions = {}) {
  requestBgm(trackKey, options.volume ?? BGM_VOLUME);
}

export function registerRoleBgm(level: number, path?: string) {
  if (!path) return;
  trackPaths[`role-${Math.max(0, Math.trunc(level))}`] = normalizedAudioPath(path);
}

export function playRoleBgm(level: number, options: BgmOptions = {}) {
  playBgm(nearestRoleTrackKey(level), {
    volume: options.volume ?? ROLE_PREVIEW_BGM_VOLUME,
  });
}

export function playWifeBgm(level: number, options: BgmOptions = {}) {
  const safeLevel = Math.max(0, Math.trunc(level));
  const trackKey =
    safeLevel <= 2
      ? "wife-00-02"
      : safeLevel <= 4
        ? "wife-03-04"
        : safeLevel <= 6
          ? "wife-05-06"
          : safeLevel <= 8
            ? "wife-07-08"
            : safeLevel <= 10
              ? "wife-09-10"
              : "wife-11";
  playBgm(trackKey, { volume: options.volume ?? WIFE_BGM_VOLUME });
}

export function playSlaveBgm() {
  playBgm("slave", { volume: SLAVE_BGM_VOLUME });
}

export function playWifeTaskCompleteBgm() {
  playBgm("wife-task-complete", {
    volume: WIFE_TASK_COMPLETE_BGM_VOLUME,
  });
}

export function playLoginBgm() {
  playBgm("login", { volume: LOGIN_BGM_VOLUME });
}

function stopCurrentBgm(clearPendingTrack: boolean) {
  if (clearPendingTrack) {
    pendingTrack = null;
  }
  clearBgmLoopTimer();
  clearFadeTimer();
  if (currentAudio) {
    releaseAudio(currentAudio);
  }
  currentAudio = null;
  currentTrackKey = null;
}

export function stopBgm() {
  stopCurrentBgm(true);
}

export function setBgmVolume(volume: number) {
  currentVolume = clampVolume(volume);
  if (currentAudio) {
    currentAudio.volume = currentVolume;
  }
}
