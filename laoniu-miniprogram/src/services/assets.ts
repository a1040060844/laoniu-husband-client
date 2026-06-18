import { ASSET_CONFIG, isRemoteAssetMode, type AssetMode } from "../config/assets";

export type { AssetMode };

export function publicAsset(path: string): string {
  const clean = path.startsWith("/") ? path : `/${path}`;
  if (isRemoteAssetMode()) {
    if (ASSET_CONFIG.remoteBase) {
      const remoteBase = ASSET_CONFIG.remoteBase.replace(/\/$/, "");
      const remotePath = clean.startsWith("/assets/") ? clean.slice("/assets".length) : clean;
      return `${remoteBase}${remotePath}`;
    }
  }
  if (clean.startsWith("/assets/")) return clean;
  return `${ASSET_CONFIG.localBase}${clean}`;
}

export function roleAsset(level: number): string {
  return publicAsset(`/roles/role-${String(level).padStart(2, "0")}.png`);
}

export function benefitAsset(level: number): string {
  return publicAsset(`/benefits/benefit-${String(level).padStart(2, "0")}.png`);
}

export function taskAsset(name: string): string {
  return publicAsset(`/tasks/${name}.png`);
}

export function loginAsset(name: string): string {
  return publicAsset(`/login/${name}`);
}

export function loadingAsset(name: string): string {
  return publicAsset(`/loading/${name}`);
}

export function loginSpriteAsset(path: string): string {
  return publicAsset(`/login-sprites/${path}`);
}
