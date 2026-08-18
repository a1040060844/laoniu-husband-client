# 老妞大人宠宠我 · Godot 微信小游戏 PoC

这个目录与现有 React/PWA 完全隔离，用于验证 Godot 4 → 微信小游戏重构路线。生产站点和 `main` 不受影响。

## 当前目录

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
    └── main.gd
```

## 已完成

### 基础运行骨架

- 390×844 手机基准画布
- nearest texture filtering
- 老哥三屏：权益 / 职务 / 任务
- 上下滑切屏与 Tween 动画
- GET `/api/state`
- PUT `/api/state` + revision
- HTTP 409 revision conflict 处理

### 云资源层

- 远程 `manifest.json`
- `user://cloud-assets` 本地缓存
- 资源 version 缓存键
- PNG / WebP / JPEG 运行时纹理解码
- MP3 / WAV 运行时音频加载
- BGM / SFX 管理器
- 登录资源预取

正式资源清单默认地址：

```text
https://www.laoniulaoge.cn/game-assets/manifest.json
```

如果远程清单不存在，开发环境会使用 `config/asset_manifest.example.json`。

### 登录页

已按 React 页面参数迁移：

```text
背景源尺寸     941 × 1672
背景缩放       contain / keep aspect centered
标题宽度       86vw，上限 370
副标题宽度     57vw，上限 245
老哥锚点       38%, 65%
老妞锚点       59%, 65%
蓝猫锚点       51%, 74%
白猫锚点       63%, 76%
身份卡宽度     47vw
```

已实现：

- 背景、标题、副标题
- 老哥、老妞、蓝猫、白猫
- 两张身份卡
- 音乐按钮
- 复位按钮
- 上下暗角
- 恋爱天数挂牌
- 人物/猫咪拖拽
- 标题和卡片轻浮动
- 登录 BGM
- `index.json + metrics.json + sprite.png` Sprite Sheet 播放器
- 老哥 idle / drag / select / adjust-glasses / nervous
- 老妞 idle / drag / select / response / thinking
- 蓝猫 idle / blink / drag / lick / lift / tail / yawn
- 白猫 idle / drag / jump / lookaround / roll / stretch
- 原 React 随机待机时间与权重
- 登录欢迎气泡
- 老妞思考气泡
- 选择老哥时 `husband.select + wife.response + 气泡`
- select 完成后延迟进入老哥端
- 动画下载失败 7 秒兜底，避免登录页卡死
- 动画首帧加载成功前保留静态 PNG，避免白屏

### 老哥职务主页

已新增状态驱动的 Godot 覆盖层：

- 根据 `/api/state` 当前 level 找到 role
- 动态加载 `roleImage`
- Lv / 职务名称
- 基础零花钱
- 当前经验 / 所需经验
- 经验条
- 人物小传
- 12 个等级指示点
- 下滑查看权益 / 上滑查看任务提示
- 全屏插画 contain + 暗角遮罩

## 开发期资源说明

当前网站已有的静态资源直接使用：

```text
https://www.laoniulaoge.cn/assets/...
```

`login-final` Sprite Sheet 和部分气泡目前为了方便 Godot 编辑器验证，fallback 临时读取 `raw.githubusercontent.com`。

**这不是微信小游戏正式资源方案。** 正式导出前必须把这些 Sprite Sheet、JSON 和气泡一起迁到你自己的 HTTPS 云资源域名，并在正式 manifest 中替换 `root_url`。页面和动画代码不需要随之修改。

## 当前不处理

- 不修改现有 React/PWA 生产前端
- 不迁移 `/admin`
- 不替换 Node/SQLite
- 不把当前大 PNG / Sprite Sheet / BGM 打入小游戏首包
- 暂不接微信登录、支付或审核 API

## 下一阶段

1. 在 Godot 4.x 实际运行并截图，对登录页做 390×844 overlay 校准。
2. 校准 Sprite anchor、人物层级和气泡位置。
3. 完成职务页左右等级预览、返回登录、通知/音乐/聊天快捷按钮。
4. 把权益页从占位层替换成真实插画和权益数据。
5. 把任务页接真实任务数组和统计数据。
6. 将开发期 GitHub Sprite 资源迁到正式云资源清单。
7. 接入 Godot → 微信小游戏导出适配层。

## 运行

使用 Godot 4.x 打开：

```text
godot-wechat/project.godot
```

API 默认：

```text
https://www.laoniulaoge.cn
```
