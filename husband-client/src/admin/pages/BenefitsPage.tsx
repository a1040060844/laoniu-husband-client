import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Eye,
  Gift,
  Plus,
  RefreshCw,
  RotateCcw,
  Save,
  Trash2,
} from "lucide-react";
import { adminApi } from "../services/adminApi";
import type {
  BenefitDefinition,
  BenefitOverride,
  CooldownRule,
  ResolvedBenefit,
} from "../../lib/adminConfig";
import type { BenefitStatus } from "../../types/domain";

type BenefitBundle = Awaited<ReturnType<typeof adminApi.getBenefitsConfig>>;

const previewStates: BenefitStatus[] = [
  "available",
  "cooldown",
  "pending",
  "frozen",
  "locked",
];

function benefitDraft(benefit: ResolvedBenefit): BenefitOverride {
  return {
    id: benefit.id,
    name: benefit.name,
    subtitle: benefit.subtitle ?? "",
    description: benefit.description,
    unlockLevel: benefit.unlockLevel,
    frequencyLabel: benefit.frequencyLabel,
    cooldown: benefit.cooldown,
    icon: benefit.icon,
    illustration: benefit.illustration ?? "",
    requestButtonText: benefit.requestButtonText,
    requestSuccessText: benefit.requestSuccessText,
    approveText: benefit.approveText,
    rejectText: benefit.rejectText,
    enabled: benefit.enabled,
  };
}

function sourceLabel(source: string) {
  if (source === "custom") return "新增";
  if (source === "override") return "已修改";
  return "默认";
}

function statusLabel(status: BenefitStatus) {
  const labels: Record<BenefitStatus, string> = {
    available: "可申请",
    cooldown: "冷却中",
    pending: "待审批",
    frozen: "已冻结",
    locked: "未解锁",
  };
  return labels[status];
}

export function BenefitsPage() {
  const [bundle, setBundle] = useState<BenefitBundle | null>(null);
  const [selectedId, setSelectedId] = useState<string>("");
  const [draft, setDraft] = useState<BenefitOverride | null>(null);
  const [previewStatus, setPreviewStatus] = useState<BenefitStatus>("available");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const sortedBenefits = useMemo(
    () =>
      [...(bundle?.resolved ?? [])].sort(
        (first, second) =>
          first.unlockLevel - second.unlockLevel || first.name.localeCompare(second.name),
      ),
    [bundle],
  );

  const selectedBenefit = useMemo(
    () => sortedBenefits.find((benefit) => benefit.id === selectedId) ?? null,
    [selectedId, sortedBenefits],
  );

  const selectedSource = selectedBenefit?.source ?? "default";

  async function load(preferredId = selectedId) {
    setLoading(true);
    setError(null);
    try {
      const nextBundle = await adminApi.getBenefitsConfig();
      setBundle(nextBundle);
      const nextBenefit =
        nextBundle.resolved.find((benefit) => benefit.id === preferredId) ??
        nextBundle.resolved[0];
      if (nextBenefit) {
        setSelectedId(nextBenefit.id);
        setDraft(benefitDraft(nextBenefit));
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "读取权益配置失败");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function selectBenefit(benefit: ResolvedBenefit) {
    setSelectedId(benefit.id);
    setDraft(benefitDraft(benefit));
    setMessage(null);
    setError(null);
  }

  function patchDraft(patch: Partial<BenefitDefinition>) {
    setDraft((current) => (current ? { ...current, ...patch } : current));
  }

  function patchCooldown(patch: Partial<CooldownRule>) {
    setDraft((current) =>
      current
        ? {
            ...current,
            cooldown: {
              amount: current.cooldown?.amount ?? 0,
              unit: current.cooldown?.unit ?? "none",
              ...patch,
            },
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
      const result = await adminApi.saveBenefit(draft.id, draft);
      if (!result.ok) throw new Error(result.message);
      setMessage(result.message);
      await load(draft.id);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "保存权益失败");
    } finally {
      setSaving(false);
    }
  }

  async function createBenefit() {
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      const created = await adminApi.createBenefit();
      setMessage("已新增权益定义，运行状态不会被覆盖。");
      await load(created.id);
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "新增权益失败");
    } finally {
      setSaving(false);
    }
  }

  async function resetBenefit() {
    if (!draft) return;
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      const result = await adminApi.resetBenefit(draft.id);
      if (!result.ok) throw new Error(result.message);
      setMessage("已恢复该权益的默认定义。");
      await load(draft.id);
    } catch (resetError) {
      setError(resetError instanceof Error ? resetError.message : "恢复默认失败");
    } finally {
      setSaving(false);
    }
  }

  async function deleteCustomBenefit() {
    if (!draft || selectedSource !== "custom") return;
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      const result = await adminApi.deleteCustomBenefit(draft.id);
      if (!result.ok) throw new Error(result.message);
      setMessage("已删除新增权益定义。");
      await load();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "删除权益失败");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="admin-page">
      <header className="admin-page-header">
        <div>
          <span className="admin-eyebrow">Benefits</span>
          <h1>权益管理</h1>
          <p>编辑权益名称、描述、频率、冷却、提示文案、图标和插画；不覆盖当前申请、冷却和可用次数。</p>
        </div>
        <div className="admin-toolbar">
          <button className="admin-secondary-button" type="button" onClick={() => void load()}>
            <RefreshCw size={17} />
            刷新
          </button>
          <button className="admin-primary-button" type="button" onClick={createBenefit}>
            <Plus size={17} />
            新增权益
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
        <aside className="admin-editor-list" aria-label="权益列表">
          {loading && !bundle ? <div className="admin-empty-state">正在读取权益配置...</div> : null}
          {sortedBenefits.map((benefit) => (
            <button
              className={`admin-editor-list__item${
                selectedId === benefit.id ? " admin-editor-list__item--active" : ""
              }`}
              key={benefit.id}
              type="button"
              onClick={() => selectBenefit(benefit)}
            >
              <strong>Lv.{String(benefit.unlockLevel).padStart(2, "0")}</strong>
              <span>{benefit.name}</span>
              <small>{benefit.frequencyLabel}</small>
              <em className={`admin-tag admin-tag--${benefit.source}`}>
                {sourceLabel(benefit.source)}
              </em>
            </button>
          ))}
        </aside>

        <main className="admin-editor">
          {draft ? (
            <>
              <div className="admin-panel__header">
                <div>
                  <h2>{draft.name || "未命名权益"}</h2>
                  <p>ID 创建后保持稳定：{draft.id}</p>
                </div>
                <span className={`admin-tag admin-tag--${selectedSource}`}>
                  {sourceLabel(selectedSource)}
                </span>
              </div>

              <div className="admin-preview-state-row" role="tablist" aria-label="预览状态">
                {previewStates.map((status) => (
                  <button
                    className={`admin-chip${previewStatus === status ? " admin-chip--active" : ""}`}
                    key={status}
                    type="button"
                    onClick={() => setPreviewStatus(status)}
                  >
                    {statusLabel(status)}
                  </button>
                ))}
              </div>

              <div className="admin-form-grid">
                <label className="admin-field">
                  <span>权益名称</span>
                  <input
                    className="admin-input"
                    value={draft.name ?? ""}
                    onChange={(event) => patchDraft({ name: event.target.value })}
                  />
                </label>
                <label className="admin-field">
                  <span>副标题</span>
                  <input
                    className="admin-input"
                    value={draft.subtitle ?? ""}
                    onChange={(event) => patchDraft({ subtitle: event.target.value })}
                  />
                </label>
                <label className="admin-field">
                  <span>解锁等级</span>
                  <input
                    className="admin-input"
                    min={0}
                    type="number"
                    value={draft.unlockLevel ?? 0}
                    onChange={(event) =>
                      patchDraft({ unlockLevel: Math.max(0, Number(event.target.value) || 0) })
                    }
                  />
                </label>
                <label className="admin-field">
                  <span>使用频率</span>
                  <input
                    className="admin-input"
                    value={draft.frequencyLabel ?? ""}
                    onChange={(event) => patchDraft({ frequencyLabel: event.target.value })}
                  />
                </label>
                <label className="admin-field">
                  <span>冷却数量</span>
                  <input
                    className="admin-input"
                    min={0}
                    type="number"
                    value={draft.cooldown?.amount ?? 0}
                    onChange={(event) =>
                      patchCooldown({ amount: Math.max(0, Number(event.target.value) || 0) })
                    }
                  />
                </label>
                <label className="admin-field">
                  <span>冷却单位</span>
                  <select
                    className="admin-input"
                    value={draft.cooldown?.unit ?? "none"}
                    onChange={(event) =>
                      patchCooldown({ unit: event.target.value as CooldownRule["unit"] })
                    }
                  >
                    <option value="none">无</option>
                    <option value="day">天</option>
                    <option value="week">周</option>
                    <option value="month">月</option>
                  </select>
                </label>
                <label className="admin-field">
                  <span>权益图标</span>
                  <input
                    className="admin-input"
                    value={draft.icon ?? ""}
                    onChange={(event) => patchDraft({ icon: event.target.value })}
                  />
                </label>
                <label className="admin-field admin-field--toggle">
                  <span>启用权益</span>
                  <input
                    checked={draft.enabled !== false}
                    type="checkbox"
                    onChange={(event) => patchDraft({ enabled: event.target.checked })}
                  />
                </label>
                <label className="admin-field admin-field--wide">
                  <span>权益描述</span>
                  <textarea
                    className="admin-textarea"
                    value={draft.description ?? ""}
                    onChange={(event) => patchDraft({ description: event.target.value })}
                  />
                </label>
                <label className="admin-field admin-field--wide">
                  <span>权益插画</span>
                  <input
                    className="admin-input"
                    value={draft.illustration ?? ""}
                    onChange={(event) => patchDraft({ illustration: event.target.value })}
                  />
                </label>
                <label className="admin-field">
                  <span>申请按钮文字</span>
                  <input
                    className="admin-input"
                    value={draft.requestButtonText ?? ""}
                    onChange={(event) => patchDraft({ requestButtonText: event.target.value })}
                  />
                </label>
                <label className="admin-field">
                  <span>申请提示</span>
                  <input
                    className="admin-input"
                    value={draft.requestSuccessText ?? ""}
                    onChange={(event) => patchDraft({ requestSuccessText: event.target.value })}
                  />
                </label>
                <label className="admin-field">
                  <span>通过提示</span>
                  <input
                    className="admin-input"
                    value={draft.approveText ?? ""}
                    onChange={(event) => patchDraft({ approveText: event.target.value })}
                  />
                </label>
                <label className="admin-field">
                  <span>拒绝提示</span>
                  <input
                    className="admin-input"
                    value={draft.rejectText ?? ""}
                    onChange={(event) => patchDraft({ rejectText: event.target.value })}
                  />
                </label>
              </div>

              <div className="admin-draft-preview">
                <div className="admin-draft-preview__image">
                  {draft.illustration ? <img src={draft.illustration} alt={draft.name} /> : <Gift size={28} />}
                </div>
                <div>
                  <span className="admin-eyebrow">State preview</span>
                  <h3>{statusLabel(previewStatus)} · {draft.name}</h3>
                  <p>{draft.description || "该状态仅用于后台预览，不写入真实权益运行状态。"}</p>
                </div>
              </div>

              <div className="admin-toolbar admin-toolbar--end">
                <button
                  className="admin-secondary-button"
                  type="button"
                  onClick={() => selectedBenefit && setDraft(benefitDraft(selectedBenefit))}
                >
                  <RotateCcw size={17} />
                  撤销
                </button>
                <button className="admin-secondary-button" type="button" onClick={resetBenefit}>
                  <RotateCcw size={17} />
                  恢复默认
                </button>
                {selectedSource === "custom" ? (
                  <button className="admin-danger-button" type="button" onClick={deleteCustomBenefit}>
                    <Trash2 size={17} />
                    删除新增权益
                  </button>
                ) : null}
                <button className="admin-secondary-button" type="button">
                  <Eye size={17} />
                  预览权益页
                </button>
                <button className="admin-primary-button" type="button" disabled={saving} onClick={save}>
                  <Save size={17} />
                  {saving ? "保存中" : "保存修改"}
                </button>
              </div>
            </>
          ) : (
            <div className="admin-empty-state">请选择一个权益。</div>
          )}
        </main>
      </div>
    </section>
  );
}
