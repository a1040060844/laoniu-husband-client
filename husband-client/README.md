# 老妞大人宠宠我 · 老公端升级版原型

这是独立于旧版的 React + TypeScript 本地原型。旧版仍保留在项目根目录的 `index.html`、`app.js`、`styles.css`、`server.js`，本目录不会覆盖旧版。

## 运行

```bash
cd husband-client
npm install
npm run dev
```

打开：

```text
http://127.0.0.1:5174/
```

## 检查

```bash
npm run check
```

当前已实现：

- `RolePage`：默认进入 Lv.01 落魄女仆职务页，可左右预览等级，可跳权益页和任务页。
- `BenefitPage`：气泡式权益布局、锁定/冷却/可用状态、权益详情弹窗和申请使用剧情反馈。
- `TaskPage`：老婆发布/每日任务 Tab、状态筛选、开始执行、提交弹窗、提交后待确认、本月收获。
- `StoryModal`：用于任务提交、权益申请等关键事件反馈。
- 经验等级系统：等级、当前经验、总经验、零花钱和已结算任务会持久化；确认完成的任务会防重复发奖，并按经验阈值自动晋升。
- 数据文件：`src/data/roles.ts`、`src/data/benefits.ts`、`src/data/tasks.ts`。

## 素材替换

图片已复制到：

```text
public/assets/roles/
public/assets/benefits/
public/assets/tasks/
```

后续替换 0-11 级素材时，优先保持文件命名：

```text
role-00.png ... role-11.png
benefit-00.png ... benefit-11.png
```

如果文件名不同，只需要改 `src/data/roles.ts` 里的 `roleImage` 和 `benefitImage`。

注意：本次上传素材里没有单独的 `06` 职务页效果图，当前 `role-06.png` 临时复用了 `06 贴身女婢` 权益图。
