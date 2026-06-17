export type AssetMode = "local" | "remote";

export const ASSET_MODE: AssetMode = "local";

const LOCAL_BASE = "/assets";
const REMOTE_BASE = "";

export function publicAsset(path: string): string {
  const clean = path.startsWith("/") ? path : `/${path}`;
  if (ASSET_MODE === "remote") return `${REMOTE_BASE}${clean}`;
  if (clean.startsWith("/assets/")) return clean;
  return `${LOCAL_BASE}${clean}`;
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
