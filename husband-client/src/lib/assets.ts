export function publicAsset(path: string) {
  const base = import.meta.env.BASE_URL.replace(/\/$/, "");
  const normalizedPath = path.replace(/^\//, "");
  return `${base}/${normalizedPath}`;
}
