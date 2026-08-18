# 老妞大人宠宠我 · Godot 微信小游戏 PoC

这个目录是独立于现有 React/PWA 的 Godot 4 重构验证项目。当前目标不是替换生产站点，而是验证：

1. Godot 能否按 390×844 基准画布复刻现有手机端视觉。
2. 登录页 → 老哥主页 → 权益/任务上下滑的交互能否稳定实现。
3. Godot 客户端能否继续复用 `https://www.laoniulaoge.cn/api/state` 的状态与 revision 冲突保护。
4. 后续能否通过微信小游戏 Godot 导出适配层发布为个人主体可使用的微信小游戏。

## 当前目录

```text
godot-wechat/
├── project.godot
├── scenes/
│   └── main.tscn
└── src/
    ├── api_client.gd
    ├── game_state.gd
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

## 不在本阶段处理

- 不修改现有 `husband-client` React 生产前端
- 不迁移 `/admin`
- 不替换服务器和 SQLite
- 不在首包内复制当前大体积 PNG/BGM
- 暂不接微信登录、支付或审核相关 API

## 下一阶段

1. 把现有登录页资产通过远程资源或经过优化的本地资源接入。
2. 逐项复刻 `RolePage` 的插画、职务、经验、零花钱、人物小传和底部上滑提示。
3. 用真实 `/api/state` 数据替换 PoC 占位文案。
4. 加入 BGM/SFX 管理层。
5. 建立 Web 390×844 与 Godot 390×844 的截图 overlay 验收流程。
6. 评估并接入 Godot → 微信小游戏导出插件。

## 运行

使用 Godot 4.x 打开 `godot-wechat/project.godot` 后运行项目。

默认 API 地址为：

```text
https://www.laoniulaoge.cn
```

可在 `src/api_client.gd` 中临时修改 `base_url` 进行本地联调。
