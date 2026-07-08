import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Copy,
  Image,
  Plus,
  RefreshCw,
  RotateCcw,
  Save,
  Trash2,
} from "lucide-react";
import { adminApi } from "../services/adminApi";
import type {
  ResolvedRole,
  RoleDefinition,
  RoleOverride,
  RoleThemeConfig,
} from "../../lib/adminConfig";

type RoleBundle = Awaited<ReturnType<typeof adminApi.getRolesConfig>>;

const emptyTheme: RoleThemeConfig = {
  accentColor: "#8f243f",
  backgroundColor: "#f6f3ef",
  textColor: "#272321",
};

function roleDraft(role: ResolvedRole): RoleOverride {
  return {
    level: role.level,
    title: role.title,
    englishTitle: role.englishTitle ?? "",
    salary: role.salary,
    description: role.description ?? "",
    story: role.story,
    illustration: role.illustration,
    benefitIllustration: role.benefitIllustration,
    bgm: role.bgm ?? "",
    theme: role.theme ?? emptyTheme,
  };
}

function roleDefinitionDraft(role: ResolvedRole): RoleDefinition {
  const draft = roleDraft(role);
  return {
    level: role.level,
    title: draft.title ?? role.title,
    englishTitle: draft.englishTitle,
    salary: draft.salary ?? role.salary,
    description: draft.description,
    story: draft.story ?? role.story,
    illustration: draft.illustration ?? role.illustration,
    benefitIllustration: draft.benefitIllustration ?? role.benefitIllustration,
    bgm: draft.bgm,
    theme: draft.theme,
  };
}

function roleSourceLabel(source: string) {
  if (source === "custom") return "新增";
  if (source === "override") return "已修改";
  return "默认";
}

export function RolesPage() {
  const [bundle, setBundle] = useState<RoleBundle | null>(null);
  const [selectedLevel, setSelectedLevel] = useState(0);
  const [draft, setDraft] = useState<RoleOverride | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selectedRole = useMemo(
    () => bundle?.resolved.find((role) => role.level === selectedLevel) ?? null,
    [bundle, selectedLevel],
  );

  const selectedSource = bundle
    ? adminApi.roleSource(selectedLevel, {
        roles: {
          customRoles: bundle.customRoles,
          overrides: bundle.overrides,
        },
        benefits: { customBenefits: [], overrides: [] },
        taskTemplates: [],
        assets: [],
      })
    : "default";

  async function load(preferredLevel = selectedLevel) {
    setLoading(true);
    setError(null);
    try {
      const nextBundle = await adminApi.getRolesConfig();
      setBundle(nextBundle);
      const nextRole =
        nextBundle.resolved.find((role) => role.level === preferredLevel) ??
        nextBundle.resolved[0];
      if (nextRole) {
        setSelectedLevel(nextRole.level);
        setDraft(roleDraft(nextRole));
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "读取职务配置失败");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function selectRole(role: ResolvedRole) {
    setSelectedLevel(role.level);
    setDraft(roleDraft(role));
    setMessage(null);
    setError(null);
  }

  function patchDraft(patch: Partial<RoleDefinition>) {
    setDraft((current) => (current ? { ...current, ...patch } : current));
  }

  function patchTheme(patch: Partial<RoleThemeConfig>) {
    setDraft((current) =>
      current
        ? {
            ...current,
            theme: { ...(current.theme ?? emptyTheme), ...patch },
          }
        : current,
    );
  }

  async function save() {
    if (!draft) return;
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      const result = await adminApi.saveRole(draft.level, draft);
      if (!result.ok) throw new Error(result.message);
      setMessage(result.message);
      await load(draft.level);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "保存职务失败");
    } finally {
      setSaving(false);
    }
  }

  async function createRole() {
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      const created = await adminApi.createRole();
      setMessage(`已新增 Lv.${created.level}，手机端最高等级会按配置动态识别。`);
      await load(created.level);
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "新增等级失败");
    } finally {
      setSaving(false);
    }
  }

  async function resetRole() {
    if (!draft) return;
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      const result = await adminApi.resetRole(draft.level);
      if (!result.ok) throw new Error(result.message);
      setMessage("已恢复该等级的默认配置。");
      await load(draft.level);
    } catch (resetError) {
      setError(resetError instanceof Error ? resetError.message : "恢复默认失败");
    } finally {
      setSaving(false);
    }
  }

  async function deleteCustomRole() {
    if (!draft || selectedSource !== "custom") return;
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      const result = await adminApi.deleteCustomRole(draft.level);
      if (!result.ok) throw new Error(result.message);
      setMessage("已删除新增等级。");
      await load(0);
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "删除新增等级失败");
    } finally {
      setSaving(false);
    }
  }

  const previewRole = selectedRole ? roleDefinitionDraft(selectedRole) : null;
  const roleTitle = draft?.title?.trim() || previewRole?.title || "未命名职务";
  const roleImage = draft?.illustration?.trim() || previewRole?.illustration;

  return (
    <section className="admin-page">
      <header className="admin-page-header">
        <div>
          <span className="admin-eyebrow">Roles & Levels</span>
          <h1>人物与等级</h1>
          <p>默认 roles.ts 继续作为内置配置，后台保存的是 override 与 customRoles。</p>
        </div>
        <div className="admin-toolbar">
          <button className="admin-secondary-button" type="button" onClick={() => void load()}>
            <RefreshCw size={17} />
            刷新
          </button>
          <button className="admin-primary-button" type="button" onClick={createRole}>
            <Plus size={17} />
            新增等级
          </button>
        </div>
      </header>

      {error ? (
        <div className="admin-alert admin-alert--danger">
          <AlertTriangle size={18} />
          <span>{error}</span>
        </div>
      ) : null}
      {message ? <div className="admin-alert admin-alert--success">{message}</div> : null}

      <div className="admin-page-split">
        <aside className="admin-editor-list" aria-label="全部职务等级">
          {loading && !bundle ? <div className="admin-empty-state">正在读取等级配置...</div> : null}
          {bundle?.resolved.map((role) => {
            const source = adminApi.roleSource(role.level, {
              roles: {
                customRoles: bundle.customRoles,
                overrides: bundle.overrides,
              },
              benefits: { customBenefits: [], overrides: [] },
              taskTemplates: [],
              assets: [],
            });
            return (
              <button
                className={`admin-editor-list__item${
                  selectedLevel === role.level ? " admin-editor-list__item--active" : ""
                }`}
                key={role.level}
                type="button"
                onClick={() => selectRole(role)}
              >
                <strong>Lv.{String(role.level).padStart(2, "0")}</strong>
                <span>{role.title}</span>
                <small>¥{role.salary}</small>
                <em className={`admin-tag admin-tag--${source}`}>
                  {roleSourceLabel(source)}
                </em>
              </button>
            );
          })}
        </aside>

        <main className="admin-editor">
          {draft ? (
            <>
              <div className="admin-panel__header">
                <div>
                  <h2>Lv.{String(draft.level).padStart(2, "0")} 配置</h2>
                  <p>未保存内容只影响当前后台草稿；保存后手机端通过同步状态读取。</p>
                </div>
                <span className={`admin-tag admin-tag--${selectedSource}`}>
                  {roleSourceLabel(selectedSource)}
                </span>
              </div>

              <div className="admin-form-grid">
                <label className="admin-field">
                  <span>职务名称</span>
                  <input
                    className="admin-input"
                    value={draft.title ?? ""}
                    onChange={(event) => patchDraft({ title: event.target.value })}
                  />
                </label>
                <label className="admin-field">
                  <span>英文名称</span>
                  <input
                    className="admin-input"
                    value={draft.englishTitle ?? ""}
                    onChange={(event) => patchDraft({ englishTitle: event.target.value })}
                  />
                </label>
                <label className="admin-field">
                  <span>月基础零花钱</span>
                  <input
                    className="admin-input"
                    min={0}
                    type="number"
                    value={draft.salary ?? 0}
                    onChange={(event) =>
                      patchDraft({ salary: Math.max(0, Number(event.target.value) || 0) })
                    }
                  />
                </label>
                <label className="admin-field">
                  <span>背景音乐</span>
                  <input
                    className="admin-input"
                    value={draft.bgm ?? ""}
                    onChange={(event) => patchDraft({ bgm: event.target.value })}
                    placeholder="/assets/audio/bgm-role-12.mp3"
                  />
                </label>
                <label className="admin-field admin-field--wide">
                  <span>人物小传</span>
                  <textarea
                    className="admin-textarea"
                    value={draft.story ?? ""}
                    onChange={(event) => patchDraft({ story: event.target.value })}
                  />
                </label>
                <label className="admin-field admin-field--wide">
                  <span>职务描述</span>
                  <textarea
                    className="admin-textarea"
                    value={draft.description ?? ""}
                    onChange={(event) => patchDraft({ description: event.target.value })}
                  />
                </label>
                <label className="admin-field admin-field--wide">
                  <span>职务插画</span>
                  <input
                    className="admin-input"
                    value={draft.illustration ?? ""}
                    onChange={(event) => patchDraft({ illustration: event.target.value })}
                  />
                </label>
                <label className="admin-field admin-field--wide">
                  <span>权益插画</span>
                  <input
                    className="admin-input"
                    value={draft.benefitIllustration ?? ""}
                    onChange={(event) => patchDraft({ benefitIllustration: event.target.value })}
                  />
                </label>
                <label className="admin-field">
                  <span>强调色</span>
                  <input
                    className="admin-input"
                    value={draft.theme?.accentColor ?? ""}
                    onChange={(event) => patchTheme({ accentColor: event.target.value })}
                  />
                </label>
                <label className="admin-field">
                  <span>背景色</span>
                  <input
                    className="admin-input"
                    value={draft.theme?.backgroundColor ?? ""}
                    onChange={(event) => patchTheme({ backgroundColor: event.target.value })}
                  />
                </label>
              </div>

              <div className="admin-draft-preview">
                <div className="admin-draft-preview__image">
                  {roleImage ? <img src={roleImage} alt={roleTitle} /> : <Image size={28} />}
                </div>
                <div>
                  <span className="admin-eyebrow">Draft preview</span>
                  <h3>{roleTitle}</h3>
                  <p>{draft.story || draft.description || "保存后会成为手机端可同步配置。"}</p>
                </div>
              </div>

              <div className="admin-toolbar admin-toolbar--end">
                <button
                  className="admin-secondary-button"
                  type="button"
                  onClick={() => selectedRole && setDraft(roleDraft(selectedRole))}
                >
                  <RotateCcw size={17} />
                  撤销
                </button>
                <button
                  className="admin-secondary-button"
                  type="button"
                  onClick={() => void navigator.clipboard?.writeText(JSON.stringify(draft, null, 2))}
                >
                  <Copy size={17} />
                  复制配置
                </button>
                <button className="admin-secondary-button" type="button" onClick={resetRole}>
                  <RotateCcw size={17} />
                  恢复默认
                </button>
                {selectedSource === "custom" ? (
                  <button className="admin-danger-button" type="button" onClick={deleteCustomRole}>
                    <Trash2 size={17} />
                    删除新增等级
                  </button>
                ) : null}
                <button className="admin-primary-button" type="button" disabled={saving} onClick={save}>
                  <Save size={17} />
                  {saving ? "保存中" : "保存修改"}
                </button>
              </div>
            </>
          ) : (
            <div className="admin-empty-state">请选择一个等级。</div>
          )}
        </main>
      </div>
    </section>
  );
}
