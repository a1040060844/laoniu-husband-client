# CloudBase 联调准备说明

本文档用于 `laoniu-husband-miniprogram` 微信小程序体验版的真实云开发联调。当前阶段不购买传统服务器，所有关键数据通过微信云开发 CloudBase 写入云数据库和云函数。

## 1. 需要创建的集合

在微信开发者工具的“云开发”控制台中创建以下集合：

| 集合 | 用途 |
| --- | --- |
| `users` | 保存 openid 与身份绑定关系，区分老哥、老妞、未知用户 |
| `profile` | 保存老哥当前等级、经验、零花钱、卖身奴隶状态 |
| `tasks` | 保存老妞发布的任务、老哥提交状态、确认/失败结果 |
| `rights` | 保存权益冷却、奖励次数、待审批权益申请 |
| `logs` | 保存操作日志、奖励流水、圣旨/通知记录 |

## 2. 建议基础字段

### users

- `_id`
- `openid`
- `role`: `husband` / `wife` / `unknown`
- `nickname`
- `createdAt`
- `updatedAt`

首次进入小程序时，如果没有手动选择身份，云函数会保存 `unknown`。开发阶段点击“我是老哥”或“我是老妞”后，会把同一个 openid 绑定为 `husband` 或 `wife`。

### profile

- `_id`: 当前使用固定值 `husband-profile`
- `currentLevel`
- `currentExp`
- `allowance`
- `slaveMode`
- `slaveEndAt`
- `slaveStartedAt`
- `slaveRestoreLevel`
- `slaveRestoreExp`
- `slaveRestoreAllowance`
- `updatedAt`

如果 `profile` 不存在，云函数会自动初始化默认资料。

### tasks

- `_id`
- `title`
- `categoryA`
- `categoryB`
- `customText`
- `source`
- `moduleId`
- `moduleLabel`
- `target`
- `action`
- `rewardType`
- `rewardValue`
- `rewardRightKey`
- `deadlineType`
- `deadlineAt`
- `status`: `pending` / `doing` / `submitted` / `confirmed` / `failed`
- `createdBy`
- `submitText`
- `resultText`
- `submittedAt`
- `confirmedAt`
- `settledAt`
- `createdAt`
- `updatedAt`

`settledAt` 用于防止确认任务后重复发放奖励。

### rights

- `_id`
- `rightKey`
- `levelRequired`
- `cooldownType`
- `lastUsedAt`
- `availableBonusCount`
- `pendingRequest`
- `updatedAt`

如果 `rights` 不存在，云函数会根据内置权益规则自动补齐默认数据。

### logs

- `_id`
- `type`
- `message`
- `taskId`
- `action`
- `before`
- `after`
- `beforeValue`
- `afterValue`
- `operatorRole`
- `operatorOpenid`
- `createdAt`
- `acknowledgedAt`

任务创建、提交、确认、驳回、失败、权益审批、资料调整都会写入 `logs`。

## 3. 打开微信云开发

1. 打开微信开发者工具。
2. 导入项目目录：`laoniu-husband-miniprogram`。
3. 确认 `project.config.json` 中：
   - `miniprogramRoot` 是 `dist/`
   - `cloudfunctionRoot` 是 `cloudfunctions/`
4. 点击顶部或侧边栏的“云开发”。
5. 如果还没有环境，开通免费体验环境。
6. 复制环境 ID。

## 4. 填入真实 envId

只需要修改一个文件：

```ts
// laoniu-husband-miniprogram/src/config/cloud.ts
export const CLOUD_ENV_ID = "你的真实云开发环境 ID";
```

不要在页面、服务或云函数里重复写死 envId。前端统一从 `src/config/cloud.ts` 读取。

如果仍然保留占位值 `your-cloudbase-env-id`，登录页底部会显示：

```text
请先配置真实微信云开发环境 ID
```

## 5. 创建集合

1. 在“云开发”面板进入“数据库”。
2. 点击“+”或“新建集合”。
3. 依次创建：
   - `users`
   - `profile`
   - `tasks`
   - `rights`
   - `logs`
4. 权限建议体验阶段先使用云函数读写，不直接依赖前端数据库权限。

## 6. 部署 cloudfunctions/api

1. 在微信开发者工具左侧找到 `cloudfunctions/api`。
2. 右键 `api`。
3. 选择“上传并部署：云端安装依赖”。
4. 部署完成后，在云开发控制台的“云函数”里确认 `api` 存在。

## 7. 重新构建

在项目目录运行：

```bash
cd laoniu-husband-miniprogram
npm install
npm test
npx tsc --noEmit
npm run build:weapp
```

构建产物在：

```text
laoniu-husband-miniprogram/dist
```

微信开发者工具会根据 `project.config.json` 使用 `dist/` 作为小程序根目录。

## 8. 测试 healthCheck

1. 打开小程序登录页。
2. 点击底部“云连接检测”。
3. 成功时显示“云连接正常”。
4. 失败时会显示错误信息。

常见失败原因：

- `src/config/cloud.ts` 仍是占位 envId。
- 没有开通云开发环境。
- 没有部署 `cloudfunctions/api`。
- 微信开发者工具没有选择正确 AppID 或环境。

## 9. 第一次业务联调

按以下顺序测试完整闭环：

1. 清空或保留数据库均可，确保 5 个集合存在。
2. 用老妞微信进入小程序，点击“我是老妞”。
3. 进入老妞首页，点击“发布任务”。
4. 创建一个经验奖励任务，例如奖励 `20` 经验。
5. 用老哥微信进入小程序，点击“我是老哥”。
6. 老哥首页进入“任务”，打开刚创建的任务。
7. 点击“开始执行”，再填写完成说明并“提交完成”。
8. 回到老妞端，进入“任务”，找到待确认任务。
9. 点击“确认发奖”。
10. 回到老哥端刷新页面，确认：
    - 任务状态变为 `confirmed`
    - 经验增加
    - 超过 100 EXP 时等级升级
    - `logs` 集合出现 `task_confirmed`

## 10. 身份绑定说明

开发阶段允许手动绑定：

- 老哥点击“我是老哥”，`users.role` 写入 `husband`。
- 老妞点击“我是老妞”，`users.role` 写入 `wife`。
- 第一次进入但还没选身份时，`users.role` 可为 `unknown`。

如果绑定错了，可在云开发数据库 `users` 集合里找到对应 openid，手动修改 `role`，或删除该用户记录后重新进入小程序选择身份。

后续正式体验版可以隐藏手动绑定入口，改为在云端预置老哥和老妞的 openid。

## 11. 卖身奴隶状态联调

1. 老妞端进入“裁定”。
2. 点击“进入资料调整”。
3. 打开“卖身奴隶状态”。
4. 保存后确认：
   - `profile.slaveMode` 为 `true`
   - 老哥端显示卖身奴隶状态
   - 权益显示冻结/不可用
   - 零花钱显示暂停或归零
5. 关闭“卖身奴隶状态”并保存。
6. 确认等级、经验、零花钱恢复到进入奴隶状态前的记录。

## 12. 当前阶段边界

本阶段只做真实 CloudBase 联调准备和完整业务闭环验证，不迁移：

- PixiJS / Phaser / Godot
- sprite sheet 动画
- 像素转场
- loading 动画
- 奖励飞行动画
- 晋升 cinematic

这些内容建议放到下一阶段，在业务链路稳定后再逐步迁移。
