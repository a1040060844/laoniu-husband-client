import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Copy,
  FilePlus2,
  Plus,
  RefreshCw,
  Save,
  Send,
  Trash2,
} from "lucide-react";
import { adminApi } from "../services/adminApi";
import type { TaskTemplate } from "../../lib/adminConfig";
import type { Task, TaskModuleId, TaskReward, TaskRewardType, TaskStatus } from "../../types/domain";

type TaskFilter = "all" | TaskStatus;

const statusOptions: Array<{ value: TaskFilter; label: string }> = [
  { value: "all", label: "全部" },
  { value: "doing", label: "进行中" },
  { value: "submitted", label: "待审核" },
  { value: "confirmed", label: "已完成" },
  { value: "failed", label: "失败" },
  { value: "expired", label: "已过期" },
];

const modules: Array<{ value: TaskModuleId; label: string }> = [
  { value: "cleaning", label: "打扫" },
  { value: "laundry", label: "洗衣" },
  { value: "cooking", label: "做饭" },
  { value: "shopping", label: "购物" },
  { value: "movie", label: "电影" },
  { value: "game", label: "游戏" },
  { value: "photo", label: "拍照" },
  { value: "custom", label: "自定义" },
];

const rewardTypes: Array<{ value: TaskRewardType; label: string }> = [
  { value: "experience", label: "经验" },
  { value: "allowance", label: "零花钱" },
  { value: "level_up", label: "直接升级" },
  { value: "benefit", label: "权益次数" },
  { value: "custom", label: "自定义" },
  { value: "none", label: "无奖励" },
];

function statusLabel(status: TaskStatus) {
  const labels: Record<TaskStatus, string> = {
    todo: "未开始",
    doing: "进行中",
    submitted: "待审核",
    confirmed: "已完成",
    failed: "失败",
    expired: "已过期",
    failed_pending: "失败待确认",
    completed: "已完成",
  };
  return labels[status];
}

function formatDate(value?: string) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("zh-CN", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "2-digit",
  }).format(new Date(value));
}

function rewardText(rewards?: TaskReward[]) {
  if (!rewards?.length) return "无";
  return rewards.map((reward) => reward.label || reward.type).join(" / ");
}

function patchReward(
  template: TaskTemplate,
  patch: Partial<TaskReward>,
): TaskTemplate {
  const firstReward = template.defaultRewards[0] ?? {
    id: `reward-${Date.now()}`,
    type: "experience",
    label: "10经验",
    value: 10,
    unit: "经验",
  };
  const nextReward = { ...firstReward, ...patch };
  return {
    ...template,
    defaultRewards: [
      {
        ...nextReward,
        label:
          patch.label ??
          nextReward.label ??
          `${nextReward.value ?? ""}${nextReward.unit ?? ""}`,
      },
      ...template.defaultRewards.slice(1),
    ],
  };
}

export function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [templates, setTemplates] = useState<TaskTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [draft, setDraft] = useState<TaskTemplate | null>(null);
  const [filter, setFilter] = useState<TaskFilter>("all");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const filteredTasks = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    return tasks.filter((task) => {
      const statusMatched = filter === "all" || task.status === filter;
      const keywordMatched =
        !keyword ||
        task.title.toLowerCase().includes(keyword) ||
        task.description.toLowerCase().includes(keyword) ||
        task.moduleId?.toLowerCase().includes(keyword);
      return statusMatched && keywordMatched;
    });
  }, [filter, query, tasks]);

  async function load(preferredTemplateId = selectedTemplateId) {
    setLoading(true);
    setError(null);
    try {
      const [nextTasks, nextTemplates] = await Promise.all([
        adminApi.getTasks(),
        adminApi.getTaskTemplates(),
      ]);
      setTasks(nextTasks);
      setTemplates(nextTemplates);
      const selected =
        nextTemplates.find((template) => template.id === preferredTemplateId) ??
        nextTemplates[0] ??
        null;
      if (selected) {
        setSelectedTemplateId(selected.id);
        setDraft(selected);
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "读取任务中心失败");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function selectTemplate(template: TaskTemplate) {
    setSelectedTemplateId(template.id);
    setDraft(template);
    setMessage(null);
    setError(null);
  }

  function patchDraft(patch: Partial<TaskTemplate>) {
    setDraft((current) => (current ? { ...current, ...patch } : current));
  }

  async function createTemplate() {
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      const created = await adminApi.createTaskTemplate();
      await adminApi.saveTaskTemplate(created);
      setMessage("已新建任务模板。");
      await load(created.id);
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "新建模板失败");
    } finally {
      setSaving(false);
    }
  }

  async function saveTemplate() {
    if (!draft) return;
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      const result = await adminApi.saveTaskTemplate(draft);
      if (!result.ok) throw new Error(result.message);
      setMessage("模板已保存。");
      await load(draft.id);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "保存模板失败");
    } finally {
      setSaving(false);
    }
  }

  async function duplicateTemplate() {
    if (!draft) return;
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      const duplicate = await adminApi.duplicateTaskTemplate(draft.id);
      setMessage("已复制模板。");
      await load(duplicate.id);
    } catch (duplicateError) {
      setError(duplicateError instanceof Error ? duplicateError.message : "复制模板失败");
    } finally {
      setSaving(false);
    }
  }

  async function deleteTemplate() {
    if (!draft) return;
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      const result = await adminApi.deleteTaskTemplate(draft.id);
      if (!result.ok) throw new Error(result.message);
      setMessage("已删除模板。");
      await load();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "删除模板失败");
    } finally {
      setSaving(false);
    }
  }

  async function publishTask() {
    if (!draft) return;
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      await adminApi.saveTaskTemplate(draft);
      await adminApi.createTaskFromTemplate(draft.id, {
        title: draft.title,
        description: draft.description,
        target: draft.target,
        action: draft.action,
        standard: draft.standard,
        timeConfig: draft.defaultTimeConfig,
        rewards: draft.defaultRewards,
      });
      setMessage("已从模板发布正式任务。");
      await load(draft.id);
    } catch (publishError) {
      setError(publishError instanceof Error ? publishError.message : "发布任务失败");
    } finally {
      setSaving(false);
    }
  }

  const primaryReward = draft?.defaultRewards[0];

  return (
    <section className="admin-page">
      <header className="admin-page-header">
        <div>
          <span className="admin-eyebrow">Tasks</span>
          <h1>任务中心</h1>
          <p>任务模板只作为发布预设；确认发布后才生成现有 Task 数据结构。</p>
        </div>
        <div className="admin-toolbar">
          <button className="admin-secondary-button" type="button" onClick={() => void load()}>
            <RefreshCw size={17} />
            刷新
          </button>
          <button className="admin-primary-button" type="button" onClick={createTemplate}>
            <Plus size={17} />
            新建模板
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

      <section className="admin-panel">
        <div className="admin-panel__header">
          <div>
            <h2>正式任务</h2>
            <p>来自当前任务系统，审核与奖励结算逻辑仍由手机端现有流程处理。</p>
          </div>
          <div className="admin-toolbar">
            <select
              className="admin-input admin-input--compact"
              value={filter}
              onChange={(event) => setFilter(event.target.value as TaskFilter)}
            >
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <input
              className="admin-input admin-input--search"
              placeholder="搜索任务"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
        </div>

        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>任务名称</th>
                <th>模块</th>
                <th>状态</th>
                <th>奖励</th>
                <th>发布时间</th>
                <th>截止时间</th>
              </tr>
            </thead>
            <tbody>
              {filteredTasks.map((task) => (
                <tr key={task.id}>
                  <td>
                    <strong>{task.title}</strong>
                    <small>{task.description}</small>
                  </td>
                  <td>{task.moduleId ?? task.moduleLabel ?? "-"}</td>
                  <td>
                    <span className={`admin-tag admin-tag--status-${task.status}`}>
                      {statusLabel(task.status)}
                    </span>
                  </td>
                  <td>{rewardText(task.rewards)}</td>
                  <td>{formatDate(task.createdAt)}</td>
                  <td>{task.deadline}</td>
                </tr>
              ))}
              {!filteredTasks.length ? (
                <tr>
                  <td colSpan={6}>
                    <div className="admin-empty-state">
                      {loading ? "正在读取任务..." : "暂无匹配任务"}
                    </div>
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <div className="admin-page-split admin-page-split--templates">
        <aside className="admin-template-grid" aria-label="任务模板库">
          {templates.map((template) => (
            <button
              className={`admin-template-card${
                selectedTemplateId === template.id ? " admin-template-card--active" : ""
              }`}
              key={template.id}
              type="button"
              onClick={() => selectTemplate(template)}
            >
              <FilePlus2 size={18} />
              <strong>{template.name}</strong>
              <span>{template.title}</span>
              <small>{template.enabled ? "启用" : "停用"} · {template.module}</small>
            </button>
          ))}
        </aside>

        <main className="admin-editor">
          {draft ? (
            <>
              <div className="admin-panel__header">
                <div>
                  <h2>模板编辑</h2>
                  <p>{draft.id}</p>
                </div>
                <label className="admin-inline-toggle">
                  <input
                    checked={draft.enabled}
                    type="checkbox"
                    onChange={(event) => patchDraft({ enabled: event.target.checked })}
                  />
                  启用模板
                </label>
              </div>

              <div className="admin-form-grid">
                <label className="admin-field">
                  <span>模板名称</span>
                  <input
                    className="admin-input"
                    value={draft.name}
                    onChange={(event) => patchDraft({ name: event.target.value })}
                  />
                </label>
                <label className="admin-field">
                  <span>任务标题</span>
                  <input
                    className="admin-input"
                    value={draft.title}
                    onChange={(event) => patchDraft({ title: event.target.value })}
                  />
                </label>
                <label className="admin-field">
                  <span>任务模块</span>
                  <select
                    className="admin-input"
                    value={draft.module}
                    onChange={(event) =>
                      patchDraft({ module: event.target.value as TaskModuleId })
                    }
                  >
                    {modules.map((module) => (
                      <option key={module.value} value={module.value}>
                        {module.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="admin-field">
                  <span>截止规则</span>
                  <input
                    className="admin-input"
                    value={draft.defaultTimeConfig?.label ?? ""}
                    onChange={(event) =>
                      patchDraft({
                        defaultTimeConfig: {
                          type: draft.defaultTimeConfig?.type ?? "today",
                          label: event.target.value,
                        },
                      })
                    }
                  />
                </label>
                <label className="admin-field admin-field--wide">
                  <span>任务描述</span>
                  <textarea
                    className="admin-textarea"
                    value={draft.description}
                    onChange={(event) => patchDraft({ description: event.target.value })}
                  />
                </label>
                <label className="admin-field">
                  <span>执行目标</span>
                  <input
                    className="admin-input"
                    value={draft.target ?? ""}
                    onChange={(event) => patchDraft({ target: event.target.value })}
                  />
                </label>
                <label className="admin-field">
                  <span>动作要求</span>
                  <input
                    className="admin-input"
                    value={draft.action ?? ""}
                    onChange={(event) => patchDraft({ action: event.target.value })}
                  />
                </label>
                <label className="admin-field admin-field--wide">
                  <span>验收标准</span>
                  <textarea
                    className="admin-textarea"
                    value={draft.standard ?? ""}
                    onChange={(event) => patchDraft({ standard: event.target.value })}
                  />
                </label>
                <label className="admin-field">
                  <span>奖励类型</span>
                  <select
                    className="admin-input"
                    value={primaryReward?.type ?? "experience"}
                    onChange={(event) =>
                      setDraft((current) =>
                        current
                          ? patchReward(current, {
                              type: event.target.value as TaskRewardType,
                            })
                          : current,
                      )
                    }
                  >
                    {rewardTypes.map((reward) => (
                      <option key={reward.value} value={reward.value}>
                        {reward.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="admin-field">
                  <span>奖励数值</span>
                  <input
                    className="admin-input"
                    type="number"
                    value={primaryReward?.value ?? 0}
                    onChange={(event) =>
                      setDraft((current) =>
                        current
                          ? patchReward(current, {
                              value: Number(event.target.value) || 0,
                            })
                          : current,
                      )
                    }
                  />
                </label>
                <label className="admin-field">
                  <span>奖励文案</span>
                  <input
                    className="admin-input"
                    value={primaryReward?.label ?? ""}
                    onChange={(event) =>
                      setDraft((current) =>
                        current ? patchReward(current, { label: event.target.value }) : current,
                      )
                    }
                  />
                </label>
                <label className="admin-field">
                  <span>标签</span>
                  <input
                    className="admin-input"
                    value={draft.tags.join(",")}
                    onChange={(event) =>
                      patchDraft({
                        tags: event.target.value
                          .split(",")
                          .map((tag) => tag.trim())
                          .filter(Boolean),
                      })
                    }
                  />
                </label>
              </div>

              <div className="admin-toolbar admin-toolbar--end">
                <button className="admin-secondary-button" type="button" onClick={duplicateTemplate}>
                  <Copy size={17} />
                  复制模板
                </button>
                <button className="admin-danger-button" type="button" onClick={deleteTemplate}>
                  <Trash2 size={17} />
                  删除模板
                </button>
                <button className="admin-secondary-button" type="button" disabled={saving} onClick={saveTemplate}>
                  <Save size={17} />
                  保存模板
                </button>
                <button className="admin-primary-button" type="button" disabled={saving} onClick={publishTask}>
                  <Send size={17} />
                  从模板发布
                </button>
              </div>
            </>
          ) : (
            <div className="admin-empty-state">请选择一个任务模板。</div>
          )}
        </main>
      </div>
    </section>
  );
}
