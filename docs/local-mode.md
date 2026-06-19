# 本地数据模式预览说明

当前 `laoniu-husband-miniprogram` 已支持本地数据模式，不需要先部署 CloudBase 云函数，也不需要创建数据库集合。

## 1. 当前模式

配置文件：

```ts
// laoniu-husband-miniprogram/src/config/cloud.ts
export const DATA_MODE: "local" | "cloud" = "local";
```

`local` 模式下：

- 登录、身份绑定、任务、权益、资料、流水都写入微信小程序本地缓存。
- 使用 `Taro.setStorageSync` / `Taro.getStorageSync`。
- 不调用 `cloud.callFunction`。
- 登录页“云连接检测”会显示本地数据模式。

## 2. 预览步骤

```bash
cd laoniu-husband-miniprogram
npm install
npm run build:weapp
```

然后在微信开发者工具里导入整个 `laoniu-husband-miniprogram` 目录，点击“编译”。

## 3. 本地测试闭环

1. 登录页点击“重绑老妞”。
2. 进入老妞端，发布任务。
3. 返回登录页，点击“重绑老哥”。
4. 进入老哥端，查看任务并提交。
5. 返回登录页，点击“重绑老妞”。
6. 老妞端确认任务。
7. 返回老哥端查看经验、零花钱、流水变化。

## 4. 切回 CloudBase

等本地迁移完整后，改为：

```ts
export const DATA_MODE: "local" | "cloud" = "cloud";
```

并确认：

```ts
export const CLOUD_ENV_ID: string = "cloud1-d3gtxsqq99b2366e1";
```

然后重新构建：

```bash
npm run build:weapp
```

切回云模式后，需要部署 `cloudfunctions/api` 并创建：

- `users`
- `profile`
- `tasks`
- `rights`
- `logs`
