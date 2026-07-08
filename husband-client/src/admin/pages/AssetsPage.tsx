import { ChangeEvent, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Copy,
  ExternalLink,
  Image,
  RefreshCw,
  Save,
  Upload,
} from "lucide-react";
import { adminApi } from "../services/adminApi";
import type { AssetReference } from "../../lib/adminConfig";

type AssetCategory = AssetReference["category"];

const categories: Array<{ value: "all" | AssetCategory; label: string }> = [
  { value: "all", label: "全部素材" },
  { value: "role-illustration", label: "人物职务插画" },
  { value: "wife-illustration", label: "老妞插画" },
  { value: "benefit-illustration", label: "权益插画" },
  { value: "sprite", label: "Sprite Sheet" },
  { value: "background", label: "背景图" },
  { value: "ui", label: "UI 组件" },
  { value: "bgm", label: "BGM" },
  { value: "sfx", label: "音效" },
];

function sizeText(size?: number) {
  if (!size) return "-";
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

function categoryLabel(category: AssetCategory) {
  return categories.find((item) => item.value === category)?.label ?? category;
}

export function AssetsPage() {
  const [assets, setAssets] = useState<AssetReference[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [category, setCategory] = useState<"all" | AssetCategory>("all");
  const [label, setLabel] = useState("");
  const [assetCategory, setAssetCategory] = useState<AssetCategory>("role-illustration");
  const [url, setUrl] = useState("");
  const [version, setVersion] = useState("");
  const [usedBy, setUsedBy] = useState("");
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);
  const [fileMeta, setFileMeta] = useState<{
    fileName?: string;
    fileType?: string;
    sizeBytes?: number;
  }>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const filteredAssets = useMemo(
    () => (category === "all" ? assets : assets.filter((asset) => asset.category === category)),
    [assets, category],
  );

  const selectedAsset = useMemo(
    () => assets.find((asset) => asset.id === selectedId) ?? filteredAssets[0] ?? null,
    [assets, filteredAssets, selectedId],
  );

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const nextAssets = await adminApi.getAssets(category === "all" ? undefined : category);
      setAssets(nextAssets);
      const selected = nextAssets.find((asset) => asset.id === selectedId) ?? nextAssets[0];
      if (selected) setSelectedId(selected.id);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "读取素材失败");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category]);

  useEffect(() => {
    if (!selectedAsset) return;
    setLabel(selectedAsset.label);
    setAssetCategory(selectedAsset.category);
    setUrl(selectedAsset.url);
    setVersion(selectedAsset.version ?? "");
    setUsedBy(selectedAsset.usedBy?.join(",") ?? "");
    setFileMeta({
      fileName: selectedAsset.fileName,
      fileType: selectedAsset.fileType,
      sizeBytes: selectedAsset.sizeBytes,
    });
  }, [selectedAsset]);

  function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (filePreviewUrl) URL.revokeObjectURL(filePreviewUrl);
    const preview = URL.createObjectURL(file);
    setFilePreviewUrl(preview);
    setFileMeta({
      fileName: file.name,
      fileType: file.type || file.name.split(".").pop(),
      sizeBytes: file.size,
    });
    setMessage("已选择本地文件；正式上传接口接入前请填写服务器 URL 后保存引用。");
  }

  async function saveAsset() {
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      const saved = await adminApi.registerAsset({
        category: assetCategory,
        label: label || fileMeta.fileName || "未命名素材",
        url,
        version: version || undefined,
        usedBy: usedBy
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
        fileName: fileMeta.fileName,
        fileType: fileMeta.fileType,
        sizeBytes: fileMeta.sizeBytes,
      });
      setMessage("已保存素材引用；后续可由正式上传接口替换为服务器文件。");
      setCategory(saved.category);
      await load();
      setSelectedId(saved.id);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "保存素材失败");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="admin-page">
      <header className="admin-page-header">
        <div>
          <span className="admin-eyebrow">Assets</span>
          <h1>素材中心</h1>
          <p>管理图片、Sprite、BGM 与音效引用；第一阶段保存 URL 与版本号。</p>
        </div>
        <button className="admin-secondary-button" type="button" onClick={() => void load()}>
          <RefreshCw size={17} />
          刷新
        </button>
      </header>

      {error ? (
        <div className="admin-alert admin-alert--danger">
          <AlertTriangle size={18} />
          <span>{error}</span>
        </div>
      ) : null}
      {message ? <div className="admin-alert admin-alert--success">{message}</div> : null}

      <div className="admin-page-split admin-page-split--assets">
        <aside className="admin-panel">
          <div className="admin-panel__header">
            <div>
              <h2>素材分类</h2>
              <p>按引用用途筛选。</p>
            </div>
          </div>
          <div className="admin-preview-state-row">
            {categories.map((item) => (
              <button
                className={`admin-chip${category === item.value ? " admin-chip--active" : ""}`}
                key={item.value}
                type="button"
                onClick={() => setCategory(item.value)}
              >
                {item.label}
              </button>
            ))}
          </div>
          <div className="admin-asset-grid">
            {filteredAssets.map((asset) => (
              <button
                className={`admin-asset-card${
                  selectedAsset?.id === asset.id ? " admin-asset-card--active" : ""
                }`}
                key={asset.id}
                type="button"
                onClick={() => setSelectedId(asset.id)}
              >
                <div className="admin-asset-thumb">
                  {asset.fileType?.startsWith("audio") || asset.category === "bgm" || asset.category === "sfx" ? (
                    <span>BGM</span>
                  ) : (
                    <img src={asset.url} alt={asset.label} />
                  )}
                </div>
                <strong>{asset.label}</strong>
                <small>{categoryLabel(asset.category)}</small>
              </button>
            ))}
            {!filteredAssets.length ? (
              <div className="admin-empty-state">{loading ? "正在读取素材..." : "暂无素材"}</div>
            ) : null}
          </div>
        </aside>

        <main className="admin-editor">
          <div className="admin-panel__header">
            <div>
              <h2>素材引用</h2>
              <p>不要把高清图片 base64 写入 /api/state；这里只保存可同步的资源地址。</p>
            </div>
            <span className="admin-tag admin-tag--override">
              {selectedAsset?.isDefault ? "默认资源" : "自定义资源"}
            </span>
          </div>

          <div className="admin-draft-preview admin-draft-preview--asset">
            <div className="admin-draft-preview__image">
              {filePreviewUrl ? (
                <img src={filePreviewUrl} alt={label} />
              ) : selectedAsset?.url ? (
                <img src={selectedAsset.url} alt={selectedAsset.label} />
              ) : (
                <Image size={28} />
              )}
            </div>
            <div>
              <span className="admin-eyebrow">Current reference</span>
              <h3>{selectedAsset?.label ?? "未选择素材"}</h3>
              <p>{selectedAsset?.url ?? "请选择素材或登记新素材 URL。"}</p>
            </div>
          </div>

          <div className="admin-form-grid">
            <label className="admin-field">
              <span>素材名称</span>
              <input
                className="admin-input"
                value={label}
                onChange={(event) => setLabel(event.target.value)}
              />
            </label>
            <label className="admin-field">
              <span>素材分类</span>
              <select
                className="admin-input"
                value={assetCategory}
                onChange={(event) => setAssetCategory(event.target.value as AssetCategory)}
              >
                {categories
                  .filter((item): item is { value: AssetCategory; label: string } => item.value !== "all")
                  .map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
              </select>
            </label>
            <label className="admin-field admin-field--wide">
              <span>资源 URL</span>
              <input
                className="admin-input"
                value={url}
                onChange={(event) => setUrl(event.target.value)}
                placeholder="/uploads/role-12-v1.webp"
              />
            </label>
            <label className="admin-field">
              <span>版本号</span>
              <input
                className="admin-input"
                value={version}
                onChange={(event) => setVersion(event.target.value)}
                placeholder="20260707"
              />
            </label>
            <label className="admin-field">
              <span>当前使用位置</span>
              <input
                className="admin-input"
                value={usedBy}
                onChange={(event) => setUsedBy(event.target.value)}
                placeholder="用英文逗号分隔"
              />
            </label>
            <label className="admin-field">
              <span>上传新素材</span>
              <input className="admin-input" type="file" onChange={handleFile} />
            </label>
            <label className="admin-field">
              <span>文件信息</span>
              <input
                className="admin-input"
                readOnly
                value={`${fileMeta.fileName ?? "-"} · ${fileMeta.fileType ?? "-"} · ${sizeText(fileMeta.sizeBytes)}`}
              />
            </label>
          </div>

          <div className="admin-asset-meta">
            <div>
              <span>引用路径</span>
              <strong>{selectedAsset?.url ?? "-"}</strong>
            </div>
            <div>
              <span>图片尺寸</span>
              <strong>
                {selectedAsset?.width && selectedAsset?.height
                  ? `${selectedAsset.width} × ${selectedAsset.height}`
                  : "待服务端识别"}
              </strong>
            </div>
            <div>
              <span>文件大小</span>
              <strong>{sizeText(selectedAsset?.sizeBytes)}</strong>
            </div>
          </div>

          <div className="admin-toolbar admin-toolbar--end">
            <button
              className="admin-secondary-button"
              type="button"
              onClick={() => selectedAsset?.url && window.open(selectedAsset.url, "_blank")}
            >
              <ExternalLink size={17} />
              查看原图
            </button>
            <button
              className="admin-secondary-button"
              type="button"
              onClick={() => selectedAsset?.url && void navigator.clipboard?.writeText(selectedAsset.url)}
            >
              <Copy size={17} />
              复制路径
            </button>
            <button
              className="admin-primary-button"
              type="button"
              disabled={saving || !url.trim()}
              onClick={saveAsset}
            >
              <Save size={17} />
              {saving ? "保存中" : "保存素材引用"}
            </button>
          </div>

          <div className="admin-panel admin-sprite-panel">
            <div className="admin-panel__header">
              <div>
                <h2>Sprite Sheet 预览</h2>
                <p>正式解析接口接入后展示整图尺寸、帧数、单帧尺寸、FPS 与循环方式。</p>
              </div>
              <Upload size={18} />
            </div>
            <div className="admin-sprite-preview">
              <span />
              <span />
              <span />
              <span />
            </div>
          </div>
        </main>
      </div>
    </section>
  );
}
