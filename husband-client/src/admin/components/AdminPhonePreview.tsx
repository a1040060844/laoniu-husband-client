import { useMemo, useState } from "react";
import {
  ClipboardList,
  Crown,
  Gift,
  RefreshCw,
  Smartphone,
} from "lucide-react";
import type { AdminPreviewMode } from "../types/admin";

const previewOptions: Array<{
  id: AdminPreviewMode;
  label: string;
  path: string;
  Icon: typeof Crown;
}> = [
  {
    id: "husband-role",
    label: "老哥职务页",
    path: "/husband?admin-preview=role",
    Icon: Crown,
  },
  {
    id: "husband-benefits",
    label: "老哥权益页",
    path: "/husband?admin-preview=benefits",
    Icon: Gift,
  },
  {
    id: "husband-tasks",
    label: "老哥任务页",
    path: "/husband?admin-preview=tasks",
    Icon: ClipboardList,
  },
  {
    id: "wife-home",
    label: "老妞主页",
    path: "/wife?admin-preview=home",
    Icon: Smartphone,
  },
];

function withBasePath(path: string) {
  const base = import.meta.env.BASE_URL.replace(/\/$/, "");
  return `${base}${path}`;
}

export function AdminPhonePreview() {
  const [mode, setMode] = useState<AdminPreviewMode>("husband-role");
  const [reloadKey, setReloadKey] = useState(0);
  const selected = previewOptions.find((option) => option.id === mode) ?? previewOptions[0];
  const previewUrl = useMemo(() => withBasePath(selected.path), [selected.path]);

  return (
    <aside className="admin-phone-preview" aria-label="手机实时预览">
      <div className="admin-phone-preview__header">
        <div>
          <span className="admin-eyebrow">Live phone preview</span>
          <h2>手机实时预览</h2>
        </div>
        <button
          className="admin-icon-button"
          type="button"
          aria-label="刷新手机预览"
          onClick={() => setReloadKey((current) => current + 1)}
        >
          <RefreshCw size={18} />
        </button>
      </div>

      <div className="admin-preview-tabs" role="tablist" aria-label="预览页面">
        {previewOptions.map(({ id, label, Icon }) => (
          <button
            className={`admin-preview-tab${mode === id ? " admin-preview-tab--active" : ""}`}
            key={id}
            type="button"
            role="tab"
            aria-selected={mode === id}
            title={label}
            onClick={() => setMode(id)}
          >
            <Icon size={16} />
            <span>{label}</span>
          </button>
        ))}
      </div>

      <div className="admin-phone-shell">
        <div className="admin-phone-shell__speaker" aria-hidden="true" />
        <iframe
          key={`${mode}-${reloadKey}`}
          className="admin-phone-shell__frame"
          title={selected.label}
          src={previewUrl}
        />
      </div>
    </aside>
  );
}
