import { useMemo, useState } from "react";
import Taro from "@tarojs/taro";
import { Button, Input, Picker, Text, Textarea, View } from "@tarojs/components";
import { stateService } from "../../../../services/state";
import type { TaskModuleId, TaskRewardType } from "../../../../types/domain";
import "./index.scss";

interface MiniTaskModule {
  id: TaskModuleId;
  label: string;
  targets: string[];
  actions: string[];
}

const modules: MiniTaskModule[] = [
  { id: "cleaning", label: "打扫卫生", targets: ["卧室", "客厅", "厨房", "卫生间", "全屋"], actions: ["简单整理", "标准清洁", "深度清洁", "老妞指定标准"] },
  { id: "laundry", label: "洗衣整理", targets: ["今日衣物", "床单被套", "毛巾", "自定义"], actions: ["洗好晾好", "收纳叠好", "分类整理"] },
  { id: "cooking", label: "做饭", targets: ["早餐", "午餐", "晚餐", "夜宵", "自定义"], actions: ["按老妞口味", "少油少盐", "摆盘好看"] },
  { id: "shopping", label: "买东西", targets: ["饮料", "零食", "日用品", "水果", "自定义"], actions: ["买指定品牌", "买性价比高的", "送到家"] },
  { id: "movie", label: "看电影", targets: ["老妞指定电影", "爱情片", "恐怖片", "自定义"], actions: ["认真陪看", "不玩手机", "看完一起讨论"] },
  { id: "game", label: "打游戏", targets: ["双人游戏", "老妞指定游戏", "自定义"], actions: ["认真配合", "不摆烂", "不急眼"] },
  { id: "photo", label: "拍照", targets: ["帮老妞拍照", "拍穿搭", "拍产品", "自定义"], actions: ["拍到满意", "帮忙选图", "简单修图"] },
  { id: "custom", label: "自定义任务", targets: ["自定义"], actions: ["自定义"] }
];

const deadlineOptions = ["今天完成", "一天内完成", "一周内完成", "本月内完成", "自定义"];
const rewardOptions: Array<{ type: TaskRewardType; label: string; defaultValue: string }> = [
  { type: "experience", label: "经验", defaultValue: "10" },
  { type: "allowance", label: "零花钱", defaultValue: "20" },
  { type: "benefit", label: "权益", defaultValue: "1" },
  { type: "level_up", label: "直接升级", defaultValue: "1" },
  { type: "custom", label: "自定义奖励", defaultValue: "1" },
  { type: "none", label: "无奖励", defaultValue: "0" }
];

export default function WifeTaskCreatePage() {
  const [title, setTitle] = useState("");
  const [customText, setCustomText] = useState("");
  const [moduleIndex, setModuleIndex] = useState(0);
  const [targetIndex, setTargetIndex] = useState(0);
  const [actionIndex, setActionIndex] = useState(0);
  const [customTarget, setCustomTarget] = useState("");
  const [customAction, setCustomAction] = useState("");
  const [deadlineIndex, setDeadlineIndex] = useState(0);
  const [customDeadline, setCustomDeadline] = useState("");
  const [rewardIndex, setRewardIndex] = useState(0);
  const [rewardValue, setRewardValue] = useState("10");
  const [rewardName, setRewardName] = useState("");

  const module = modules[moduleIndex];
  const reward = rewardOptions[rewardIndex];
  const target = module.targets[targetIndex] === "自定义" ? customTarget : module.targets[targetIndex];
  const action = module.actions[actionIndex] === "自定义" ? customAction : module.actions[actionIndex];

  const preview = useMemo(() => {
    const parts = [module.label, target, action, customText].filter(Boolean);
    return parts.join(" · ");
  }, [action, customText, module.label, target]);

  function onModuleChange(index: number) {
    setModuleIndex(index);
    setTargetIndex(0);
    setActionIndex(0);
  }

  function onRewardChange(index: number) {
    setRewardIndex(index);
    setRewardValue(rewardOptions[index].defaultValue);
  }

  async function submit() {
    if (!title.trim() && !preview.trim()) {
      await Taro.showToast({ title: "先写任务内容", icon: "none" });
      return;
    }

    const finalTitle = title.trim() || `${module.label}任务`;
    const deadline = deadlineOptions[deadlineIndex] === "自定义" ? customDeadline.trim() || "老妞自定义截止时间" : deadlineOptions[deadlineIndex];
    const description = customText.trim() || preview || "按老妞大人要求完成，完成后提交验收。";
    const value = Number(rewardValue) || 0;

    await stateService.createTask({
      title: finalTitle,
      description,
      moduleId: module.id,
      moduleLabel: module.label,
      target,
      action,
      standard: customText,
      rewardType: reward.type,
      rewardValue: value,
      rewardExp: reward.type === "experience" ? value : 0,
      rewardMoney: reward.type === "allowance" ? value : 0,
      rewardBenefit: rewardName.trim() || reward.label,
      deadline
    });
    await Taro.showToast({ title: "任务已发布", icon: "success" });
    await Taro.navigateBack();
  }

  return (
    <View className="page scene-page task-create-page">
      <Text className="title">发布任务</Text>
      <Text className="subtitle">A 分类 + B 选项 + 自由要求 + 奖励，一次下达清楚。</Text>

      <View className="panel section form-panel">
        <View className="field">
          <Text className="label">任务标题</Text>
          <Input className="input" value={title} placeholder="例如：今天表现任务" onInput={(event) => setTitle(String(event.detail.value))} />
        </View>

        <View className="field">
          <Text className="label">A 分类</Text>
          <Picker mode="selector" range={modules.map((item) => item.label)} value={moduleIndex} onChange={(event) => onModuleChange(Number(event.detail.value))}>
            <View className="picker-line">{module.label}</View>
          </Picker>
        </View>

        <View className="field">
          <Text className="label">B 对象</Text>
          <Picker mode="selector" range={module.targets} value={targetIndex} onChange={(event) => setTargetIndex(Number(event.detail.value))}>
            <View className="picker-line">{module.targets[targetIndex]}</View>
          </Picker>
          {module.targets[targetIndex] === "自定义" ? <Input className="input nested" value={customTarget} placeholder="输入具体对象" onInput={(event) => setCustomTarget(String(event.detail.value))} /> : null}
        </View>

        <View className="field">
          <Text className="label">执行要求</Text>
          <Picker mode="selector" range={module.actions} value={actionIndex} onChange={(event) => setActionIndex(Number(event.detail.value))}>
            <View className="picker-line">{module.actions[actionIndex]}</View>
          </Picker>
          {module.actions[actionIndex] === "自定义" ? <Input className="input nested" value={customAction} placeholder="输入具体要求" onInput={(event) => setCustomAction(String(event.detail.value))} /> : null}
        </View>

        <View className="field">
          <Text className="label">自由输入内容</Text>
          <Textarea className="textarea" value={customText} placeholder="补充老妞的具体标准、注意事项、验收方式" onInput={(event) => setCustomText(String(event.detail.value))} />
        </View>

        <View className="field">
          <Text className="label">截止时间</Text>
          <Picker mode="selector" range={deadlineOptions} value={deadlineIndex} onChange={(event) => setDeadlineIndex(Number(event.detail.value))}>
            <View className="picker-line">{deadlineOptions[deadlineIndex]}</View>
          </Picker>
          {deadlineOptions[deadlineIndex] === "自定义" ? <Input className="input nested" value={customDeadline} placeholder="例如：周五晚上前" onInput={(event) => setCustomDeadline(String(event.detail.value))} /> : null}
        </View>

        <View className="field">
          <Text className="label">奖励类型</Text>
          <Picker mode="selector" range={rewardOptions.map((item) => item.label)} value={rewardIndex} onChange={(event) => onRewardChange(Number(event.detail.value))}>
            <View className="picker-line">{reward.label}</View>
          </Picker>
        </View>

        {reward.type !== "none" ? (
          <View className="field">
            <Text className="label">奖励数值</Text>
            <Input className="input" type="number" value={rewardValue} onInput={(event) => setRewardValue(String(event.detail.value))} />
          </View>
        ) : null}

        {["benefit", "custom"].includes(reward.type) ? (
          <View className="field">
            <Text className="label">奖励名称</Text>
            <Input className="input" value={rewardName} placeholder="例如：奶茶一次 / 老妞指定奖励" onInput={(event) => setRewardName(String(event.detail.value))} />
          </View>
        ) : null}

        <View className="preview-box">
          <Text className="preview-title">预览</Text>
          <Text className="preview-text">{preview || "选择分类后会在这里预览任务内容"}</Text>
          <Text className="preview-text">奖励：{reward.label}{reward.type !== "none" ? ` ${rewardValue}` : ""}</Text>
        </View>

        <Button className="btn section" onClick={submit}>下达任务</Button>
      </View>
    </View>
  );
}
