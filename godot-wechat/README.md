# 老妞大人宠宠我 · Godot 微信小游戏 PoC

这个目录与现有 React/PWA 完全隔离，用于验证 Godot 4 → 微信小游戏重构路线。生产站点和 `main` 不受影响。

## 当前结构

```text
godot-wechat/
├── project.godot
├── config/
│   └── asset_manifest.example.json
├── scenes/
│   └── main.tscn
└── src/
    ├── api_client.gd
    ├── game_state.gd
    ├── asset_manifest.gd
    ├── cloud_asset_manager.gd
    ├── audio_manager.gd
    ├── asset_bootstrap.gd
    ├── login_visual_overlay.gd
    ├── login_sprite_player.gd
    ├── login_animation_overlay.gd
    ├── role_visual_overlay.gd
    ├── benefit_visual_overlay.gd
    ├── task_visual_overlay.gd
    ├── husband_audio_controller.gd
    ├── husband_quick_controls.gd
    └── main.gd
```

## 已完成

### 基础与状态同步

- 390×844 手机基准画布
- nearest texture filtering
- 老哥三屏：权益 / 职务 / 任务
- 上下滑切屏 + Tween
- GET `/api/state`
- PUT `/api/state` + revision
- HTTP 409 revision conflict 处理

### 云资源

- 远程 `manifest.json`
- `user://cloud-assets` 缓存
- version 缓存键
- PNG / WebP / JPEG 运行时纹理解码
- MP3 / WAV 运行时音频加载
- BGM / SFX 管理器
- 异步 BGM 代际保护，旧下载不会覆盖新曲目

默认资源清单：

```text
https://www.laoniulaoge.cn/game-assets/manifest.json
```

远程清单不可用时，开发环境降级到 `config/asset_manifest.example.json`。

### 登录页

按原 React 参数迁移：

```text
背景源尺寸     941 × 1672
背景缩放       contain / centered
老哥锚点       38%, 65%
老妞锚点       59%, 65%
蓝猫锚点       51%, 74%
白猫锚点       63%, 76%
身份卡宽度     47vw
```

已实现：

- 背景、标题、副标题、身份卡、音乐按钮、复位按钮
- 上下暗角、恋爱天数挂牌
- 人物/猫咪拖拽
- 标题与卡片浮动
- 登录 BGM
- `index.json + metrics.json + sprite.png` Sprite Sheet 播放器
- 老哥 idle / drag / select / adjust-glasses / nervous
- 老妞 idle / drag / select / response / thinking
- 蓝猫 idle / blink / drag / lick / lift / tail / yawn
- 白猫 idle / drag / jump / lookaround / roll / stretch
- 原 React 随机待机间隔与权重
- 登录欢迎气泡、老妞思考气泡
- 选择老哥时 `husband.select + wife.response + 气泡`
- select 完成后进入老哥端
- 动画下载失败 7 秒兜底
- 动画首帧成功前保留静态 PNG

### 老哥职务页

- 根据 `/api/state` 当前 level 读取 role
- 动态加载 `roleImage`
- Lv / 职务名称
- 基础零花钱
- 当前经验 / 所需经验 + 经验条
- 人物小传
- 12 个等级点
- 下滑权益 / 上滑任务提示
- 全屏插画 contain + 暗角
- 返回登录按钮
- 音乐开关

### 老哥权益页

- 动态加载当前 role 的 `benefitImage`
- 按 `levelRequired` 过滤已解锁权益
- 支持 `displayVariants`
- 可申请 / 待审批 / 冷却 / 冻结 / 锁定状态
- 1–5 个权益复刻原稀疏气泡布局
- 超过 5 个自动循环漂移
- 权益名称、状态、频率、说明详情弹窗
- 显示当前职务佣金

### 老哥任务页

- 真实 `/api/state.tasks`
- 老婆发布 / 每日任务来源切换
- 全部 / 待执行 / 进行中 / 待确认 / 已完成筛选
- 今日待执行 / 待提交 / 待确认 / 今日可得 EXP 统计
- 本月零花钱 / 完成任务 / EXP 汇总
- 真实任务标题、描述、奖励、期限、状态
- `todo → doing` 开始执行
- `doing → submitted` 提交完成
- 写入 `submittedAt / submitNote`
- 追加 `task_submitted` 日志
- 保存继续走 revision 冲突保护

### BGM 路由

保持 Web 版规则：

```text
登录页           bgm-login
职务页           bgm-role-00 ~ bgm-role-11
权益页           延续当前等级 role BGM
任务页           停止 BGM
```

登录 BGM 约 -20 dB；职务/权益约 -20.92 dB，对应 Web 中约 0.10 / 0.09 的线性音量。

## 开发期资源说明

当前网站静态资源暂时直接读取：

```text
https://www.laoniulaoge.cn/assets/...
```

`login-final` Sprite Sheet、JSON 和部分气泡为了开发验证，fallback 暂时指向 `raw.githubusercontent.com`。

**正式微信小游戏导出前必须迁移到自己的 HTTPS 云资源域名。** 迁移时只需要替换 manifest / `root_url`，页面和动画逻辑不需要重写。

## 当前验收状态

- GitHub 分支代码和资源路径已完成静态核对。
- 使用 Godot 4.x 官方稳定 API 编写。
- 当前执行容器没有预装 Godot，且容器到 GitHub 的直接 DNS/二进制下载受限，所以尚未完成 `godot --headless` 真机解析。
- 因此当前不能把“代码已写入”表述为“Godot 已实际启动通过”。

## 后续

1. 在可运行 Godot 4.x 的环境执行 headless import / parse。
2. 运行 390×844 场景并与 Web 截图 overlay 校准。
3. 修正人物 anchor、气泡、职务页面板等像素差异。
4. 补职务左右等级预览、通知和聊天快捷入口。
5. 继续迁移老妞端。
6. 把开发期 GitHub 动画资源迁到正式云资源。
7. 接入 Godot → 微信小游戏导出适配层并在微信开发者工具验证。

## 运行

```text
godot-wechat/project.godot
```

默认 API：

```text
https://www.laoniulaoge.cn
```
