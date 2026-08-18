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
    ├── login_visual_overlay.gd
    └── main.gd
```

## 当前 PoC 范围

- 390×844 手机基准画布
- 像素素材 nearest filtering
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
- 登录页第一阶段真实构图：背景、标题、副标题、老哥、老妞、两只猫、身份卡、音乐按钮
- 登录背景按照原 React 页面 941×1672 素材使用 contain 居中
- 登录人物沿用 React 默认锚点：老哥 38%/65%，老妞 59%/65%，蓝猫 51%/74%，白猫 63%/76%
- 恋爱天数挂牌按原图像坐标 206/1144 映射到屏幕
- 人物和猫咪静态拖拽
- 标题、身份卡和音乐按钮轻微浮动
- 点击老哥身份卡后 360ms 淡出并进入老哥端

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

开发期远程清单不存在时，会退回 `config/asset_manifest.example.json`。当前 fallback 直接指向网站已有 `/assets`，因此无需把大图片复制进 Godot 项目就能验证登录页。

正式清单建议至少包含：

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

## 登录页像素对齐基准

第一阶段不直接迁移复杂 Sprite Sheet，而是先用现有静态透明 PNG 把构图对齐。原 React 登录页的关键参数已经固化到 `login_visual_overlay.gd`：

```text
基准画布       390 × 844
背景源尺寸     941 × 1672
背景缩放       keep aspect centered / contain
标题宽度       86vw，上限 370
副标题宽度     57vw，上限 245
老哥锚点       x=38%, y=65%
老妞锚点       x=59%, y=65%
蓝猫锚点       x=51%, y=74%
白猫锚点       x=63%, y=76%
身份卡宽度     47vw
身份卡底部     7.3% - 80px
```

等静态构图截图 overlay 验收通过后，再把人物节点替换为逐帧 Sprite 动画，避免一开始同时排查布局偏差和帧动画偏差。

## 不在本阶段处理

- 不修改现有 `husband-client` React 生产前端
- 不迁移 `/admin`
- 不替换服务器和 SQLite
- 不在首包内复制当前大体积 PNG/BGM
- 暂不接微信登录、支付或审核相关 API

## 下一阶段

1. 在 Godot 编辑器实际运行登录页并做第一轮截图 overlay。
2. 根据截图逐项校准人物尺寸、锚点、身份卡和安全区位置。
3. 将老哥/老妞/猫咪静态节点替换为 Sprite Sheet 动画节点。
4. 恢复点击人物后的气泡、思考动画、拖拽动作和复位按钮。
5. 逐项复刻 `RolePage` 的插画、职务、经验、零花钱、人物小传和底部上滑提示。
6. 评估并接入 Godot → 微信小游戏导出插件。

## 运行

使用 Godot 4.x 打开 `godot-wechat/project.godot` 后运行项目。

默认 API 地址为：

```text
https://www.laoniulaoge.cn
```

可在 `src/api_client.gd` 中临时修改 `base_url` 进行本地联调。
