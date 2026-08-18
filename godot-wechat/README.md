# 老妞大人宠宠我 · Godot 微信小游戏 PoC

这个目录是独立于现有 React/PWA 的 Godot 4 重构验证项目。当前目标不是替换生产站点，而是验证：

1. Godot 能否按 390×844 基准画布复刻现有手机端视觉。
2. 登录页 → 老哥主页 → 权益/任务上下滑的交互能否稳定实现。
3. Godot 客户端能否继续复用 `https://www.laoniulaoge.cn/api/state` 的状态与 revision 冲突保护。
4. 大图、Sprite、BGM、SFX 是否可以全部走云资源，避免进入小游戏首包。
5. 后续能否通过微信小游戏 Godot 导出适配层发布为个人主体可使用的微信小游戏。

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
    └── main.gd
```

## 当前 PoC 范围

- 390×844 手机基准画布
- 像素素材 nearest filtering
- 登录占位界面
- 老哥三屏结构：权益 / 职务 / 任务
- 上下滑切屏与 Tween 动画
- GET `/api/state`
- PUT `/api/state` + `revision`
- 409 revision conflict 基础处理
- 云资源 manifest 读取
- `user://cloud-assets` 本地缓存
- PNG / WebP / JPEG 运行时纹理解码
- MP3 / WAV 运行时音频加载
- 登录页基础资源预取
- 登录 BGM 云资源入口

## 云资源设计

小游戏首包不复制现有大体积 PNG、Sprite Sheet 和 BGM。

启动流程：

```text
Godot 启动
  ↓
读取远程 manifest.json
  ↓
检查资源 version
  ↓
优先读取 user://cloud-assets
  ↓
缓存不存在才走 HTTPS 下载
  ↓
页面使用 Texture2D / AudioStream
```

默认资源清单地址暂定：

```text
https://www.laoniulaoge.cn/game-assets/manifest.json
```

在 `project.godot` 的 `laoniu/assets/manifest_url` 中统一配置。以后换成 OSS、COS、CDN 或其他对象存储时，不需要修改页面代码。

`config/asset_manifest.example.json` 只用于定义结构和本地降级，不内置正式资源地址。正式清单建议至少包含：

- `version`
- `base_url`
- `login`
- `roles`
- `benefits`
- `wife`
- `audio`

每个资源条目建议包含：

```json
{
  "path": "roles/5/main.webp",
  "format": "webp",
  "version": 3
}
```

资源版本变化后会生成新的缓存键，不需要覆盖旧文件才能生效。

## 不在本阶段处理

- 不修改现有 `husband-client` React 生产前端
- 不迁移 `/admin`
- 不替换服务器和 SQLite
- 不在首包内复制当前大体积 PNG/BGM
- 暂不接微信登录、支付或审核相关 API

## 下一阶段

1. 把当前登录页的背景、老哥、老妞、猫咪、标题和按钮逐层接到 `TextureRect`。
2. 逐项复刻 `RolePage` 的插画、职务、经验、零花钱、人物小传和底部上滑提示。
3. 将当前等级对应职务插画通过 `AssetManifest.get_role_asset()` 动态加载。
4. 将不同职务 BGM 接入 `AudioManager`。
5. 建立 Web 390×844 与 Godot 390×844 的截图 overlay 验收流程。
6. 评估并接入 Godot → 微信小游戏导出插件。

## 运行

使用 Godot 4.x 打开 `godot-wechat/project.godot` 后运行项目。

默认 API 地址为：

```text
https://www.laoniulaoge.cn
```

可在 `src/api_client.gd` 中临时修改 `base_url` 进行本地联调。
