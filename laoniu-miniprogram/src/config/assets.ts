export type AssetMode = "local" | "remote";

export const ASSET_CONFIG = {
  mode: "local" as AssetMode,
  localBase: "/assets",
  remoteBase: "",
};

export function isRemoteAssetMode() {
  return ASSET_CONFIG.mode === "remote";
}
