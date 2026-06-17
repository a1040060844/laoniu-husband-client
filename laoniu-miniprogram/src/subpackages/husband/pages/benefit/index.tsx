import { useMemo, useState } from "react";
import Taro, { useDidShow } from "@tarojs/taro";
import { Button, Image, Text, View } from "@tarojs/components";
import { roles } from "../../../../data/roles";
import { stateService } from "../../../../services/state";
import type { AppState } from "../../../../services/state";
import type { Benefit } from "../../../../types/domain";
import "./index.scss";

type BenefitFilter = "available" | "pending" | "cooldown" | "locked" | "all";

const filters: Array<{ key: BenefitFilter; label: string }> = [
  { key: "available", label: "可申请" },
  { key: "pending", label: "待审批" },
  { key: "cooldown", label: "冷却中" },
  { key: "locked", label: "未解锁" },
  { key: "all", label: "全部" }
];

function benefitKind(state: AppState, benefit: Benefit): BenefitFilter {
  if (state.progress.level < benefit.levelRequired) return "locked";
  if (benefit.pendingRequest || benefit.status === "pending") return "pending";
  if (benefit.status === "cooldown") return "cooldown";
  return "available";
}

function benefitStateLabel(state: AppState, benefit: Benefit) {
  if (state.punishment.status === "slave") return "卖身奴隶状态：权益暂停";
  const kind = benefitKind(state, benefit);
  if (kind === "locked") return `Lv.${benefit.levelRequired} 解锁`;
  if (kind === "pending") return "等待老妞审批";
  if (kind === "cooldown") return benefit.cooldownText || "冷却中";
  return `可申请 · ${benefit.frequency}`;
}

export default function HusbandBenefitPage() {
  const [state, setState] = useState<AppState>();
  const [filter, setFilter] = useState<BenefitFilter>("available");

  useDidShow(() => { stateService.loadState().then(setState); });

  const visibleBenefits = useMemo(() => {
    if (!state) return [];
    return state.benefits.filter((benefit) => filter === "all" || benefitKind(state, benefit) === filter);
  }, [filter, state]);

  if (!state) return <View className="page"><Text>加载中...</Text></View>;

  async function request(benefit: Benefit) {
    const result = await Taro.showModal({
      title: "申请权益",
      content: `确认申请《${benefit.name}》吗？`,
      confirmText: "申请",
      confirmColor: "#6f3f2c"
    });
    if (!result.confirm) return;
    try {
      setState(await stateService.requestBenefit(benefit.id, { reason: "老哥申请使用权益" }));
      await Taro.showToast({ title: "已申请", icon: "success" });
      setFilter("pending");
    } catch (error) {
      await Taro.showToast({ title: error instanceof Error ? error.message : "申请失败", icon: "none" });
    }
  }

  const currentRole = roles[state.progress.level];
  const pendingCount = state.benefits.filter((benefit) => benefitKind(state, benefit) === "pending").length;
  const availableCount = state.benefits.filter((benefit) => benefitKind(state, benefit) === "available").length;
  const recentBenefitLogs = state.logs
    .filter((log) => log.type.startsWith("benefit_"))
    .slice(0, 5);

  return (
    <View className="page scene-page benefit-page">
      <Text className="title">权益</Text>
      <Text className="subtitle">当前职务：{currentRole.title} · 可申请 {availableCount} · 待审批 {pendingCount}</Text>
      {state.punishment.status === "slave" ? <View className="empty benefit-freeze">卖身奴隶状态下权益暂停。</View> : null}

      <View className="benefit-filter-row">
        {filters.map((item) => (
          <Button key={item.key} className={`filter-chip ${filter === item.key ? "is-active" : ""}`} onClick={() => setFilter(item.key)}>
            {item.label}
          </Button>
        ))}
      </View>

      {visibleBenefits.length ? visibleBenefits.map((benefit) => {
        const kind = benefitKind(state, benefit);
        const image = roles[Math.min(benefit.levelRequired, roles.length - 1)]?.benefitImage || currentRole.benefitImage;
        const canRequest = kind === "available" && state.punishment.status !== "slave";
        return (
          <View className={`panel section benefit-card benefit-card--${kind}`} key={benefit.id}>
            <Image className={`benefit-image pixelated ${kind === "locked" ? "is-locked" : ""}`} src={image} mode="aspectFit" />
            <View className="benefit-card__body">
              <View className="benefit-card__header">
                <Text className="benefit-title">{benefit.name}</Text>
                <Text className="status-pill">{benefitStateLabel(state, benefit)}</Text>
              </View>
              <Text className="subtitle">{benefit.description}</Text>
              <Text className="benefit-meta">解锁等级：Lv.{benefit.levelRequired} · 频次：{benefit.frequency}</Text>
              {benefit.pendingRequest ? <Text className="benefit-meta">申请理由：{benefit.pendingRequest.reason}</Text> : null}
              {benefit.cooldownUntil ? <Text className="benefit-meta">冷却到：{benefit.cooldownUntil.slice(0, 10)}</Text> : null}
              {canRequest ? <Button className="btn section" onClick={() => request(benefit)}>申请使用</Button> : null}
            </View>
          </View>
        );
      }) : <View className="empty">当前筛选下没有权益</View>}

      <View className="panel section">
        <Text className="section-title">最近权益记录</Text>
        {recentBenefitLogs.length ? recentBenefitLogs.map((log) => (
          <View className="log-line" key={log.id}>
            <Text className="log-line__title">{log.title}</Text>
            <Text className="log-line__desc">{log.description}</Text>
          </View>
        )) : <Text className="subtitle">暂无权益记录</Text>}
      </View>
    </View>
  );
}
