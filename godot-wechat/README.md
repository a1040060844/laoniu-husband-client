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
    ├── husband_communication_overlay.gd
    ├── communication_acceptance_fixture.gd
    ├── communication_state_transforms.gd
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
- 通知快捷入口、通知弹窗和未读标记
- 聊天留言快捷入口、独立滚动抽屉、头像和上奏图标
- 通知/聊天 Debug 夹具：`F9` 未读、`F10` 空状态、`F11` 长文本、`F12` 恢复只读
- 通知、已读、略过、发送在 Debug 构建中均由 UI 和控制器双层短路，不调用 `save_remote()`
- 聊天状态变换由 `CommunicationStateTransforms` 纯函数承载，便于后续老妞端复用

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

任务页第二轮视觉复刻已加入：

- Web 字体栈：宋体/思源衬线、微软雅黑/苹方控件字、Georgia/Times 数字字形
- 本地 Lucide SVG 图标与许可证说明，不依赖 emoji 或彩色表情字体
- 390×844 四列概况卡；宽度 ≤380 时自动切换为 2×2
- 任务卡按标题、说明、重复进度和结果文字动态计算高度
- 多枚经验/零花钱/权益奖励胶囊、重复任务进度与 `resultText`
- 来源、状态、卡片和提交预览的 Web 对齐动画与阴影
- 仅 Debug 存在的零写入验收夹具：`live`、`all_statuses`、`empty`、`stress`、`modal_preview`

Debug 夹具快捷键：

```text
F2  all_statuses       展示 todo / doing / submitted / completed 等状态
F3  empty              空列表
F4  stress             长标题、多奖励、重复进度、结果文字
F5  modal_preview      只打开提交弹窗预览，不允许提交
F7  live               恢复真实只读任务
F8  展开/收起验收面板
F6  循环 314×706 → 376×806 → 390×844
F9  通知/聊天未读夹具
F10 通知/聊天空状态夹具
F11 通知/聊天长文本夹具
F12 恢复真实只读状态
```

夹具会禁用任务操作，并在业务函数入口再次硬性短路；不会修改 `GameState.state`、revision、日志或调用保存接口。Release 构建不创建夹具入口。

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

- 当前开发分支已包含登录、职务、权益和任务页第一轮视觉/交互实现，以及 376×806 输入诊断工具。
- 已用 Godot 4.7.1 headless 完成项目与脚本解析检查；当前没有发现 Parser Error、SCRIPT Error 或 Autoload 加载错误。
- 项目内置 Godot MCP Toolkit 1.0.0；Windows 通过 `godot-wechat/.mcp.json` 使用 `cmd /c npx -y @npgamedev/godot-mcp-server`。
- Debug 运行时可用 `F8` 展开验收面板，`F6` 循环 `314×706 → 376×806 → 390×844`，也可用 `--debug-window-size=376x806` 直接启动指定尺寸。
- 固定端口验收可运行 `tools/start-godot-mcp-acceptance.ps1 -Size 390x844|376x806|314x706`；它会为 Godot 编辑器与独立运行时同时注入 Editor `6551`、Runtime `6571`、LSP `6005`，避免依赖机器级 MCP registry。
- 生产零写入门禁可运行 `tools/acceptance-state-guard.ps1 -Mode before`，验收结束后运行 `-Mode after`；脚本只读取 `/api/state` 并比较 revision、任务、日志、权益、通知和聊天指纹。
- 当前代码已保留编辑器与运行时 MCP 通道、输入诊断和独立窗口复现器；本环境的 MCP registry 写入受沙箱权限限制，运行时双通道和截图仍需在本机 Godot 任务中复验，不能以静态检查代替。
- 已加入可复用的老哥通知/聊天覆盖层和纯内存状态变换测试；本机 Godot 4.7.1 日志已确认 `Communication state transforms: PASS`，但通知/聊天的 MCP 截图与三尺寸交互仍需桌面 runtime bridge 完成。
- 通信层零写入脚本：`tools/communication-zero-write-check.ps1`。它先后调用状态守卫，再运行纯内存变换测试；验收产物写入被忽略的 `.acceptance/`。
- 任务页第二轮已完成代码侧响应式布局、字体、SVG 图标、动态任务卡、零写入夹具和提交弹窗预览；三种尺寸的截图热图仍需在 MCP runtime bridge 可用后生成。
- 既有功能基线：任务页 BGM 为 `none`，返回职务后恢复 `bgm-role-03`；验收禁止点击任务执行/提交或权益申请/使用控件。
- 验收期间不点击任务执行/提交或权益申请/使用控件，避免写入正式数据。

## 后续

1. 根据 Web/Godot 对照截图做任务页第二轮 1–3px 视觉微调，并继续保持任务滚动/顶部下拉返回行为。
2. 用 MCP runtime bridge 完成三尺寸通知/聊天截图和状态守卫验收。
3. 继续迁移老妞端（复用通信公共层）。
4. 把开发期 GitHub 动画资源迁到正式云资源。
5. 接入 Godot → 微信小游戏导出适配层并在微信开发者工具验证。

## 运行

```text
godot-wechat/project.godot
```

默认 API：

```text
https://www.laoniulaoge.cn
```
