# Future Server Integration Notes

## Current Decision

The current migration is local-only. It does not use a cloud server, CloudBase, remote database, online API, HTTPS domain, or WeChat legal request domain.

## Current Local State

The Mini Program must read and write all app state through `services/state/index.ts`. The active backend is `STATE_BACKEND = "local"`, implemented by `localState.ts` using Taro storage.

## Future Replacement Points

- Replace `STATE_BACKEND` with `"http"` in `services/state/index.ts`.
- Implement `services/state/httpState.ts`. The file already exists as a no-network placeholder and intentionally throws a clear error.
- Keep page code unchanged.
- Move reward settlement, approval, punishment, identity and ledger integrity to server-side endpoints.

## Suggested API Shape

- `GET /api/state`
- `PUT /api/state`
- `POST /api/tasks`
- `POST /api/tasks/:id/submit`
- `POST /api/tasks/:id/approve`
- `POST /api/tasks/:id/reject`
- `POST /api/benefits/:id/request`
- `POST /api/benefits/:id/approve`
- `POST /api/benefits/:id/reject`
- `POST /api/decrees`
- `POST /api/punishment/slave`
- `POST /api/punishment/restore`

## Suggested Data Structures

- `progress`: level, exp, totalExp, wallet, rewardedTaskIds.
- `tasks`: task lifecycle, rewards, schedule, submit/review fields.
- `benefits`: unlock level, status, cooldown, pending request.
- `logs`: immutable audit log.
- `walletLedger`: money/exp/benefit/level/punishment ledger.
- `punishment`: normal/slave state and restore snapshot.
- `decrees`: husband-facing rulings and read/acknowledged state.

## Asset/CDN Plan

Large role, benefit, loading and sprite images can later move to CDN. Keep all references behind `services/assets.ts` so `ASSET_MODE` can switch from `local` to `remote`.

The Mini Program now keeps asset mode in `laoniu-miniprogram/src/config/assets.ts`:

```ts
export const ASSET_CONFIG = {
  mode: "local",
  localBase: "/assets",
  remoteBase: "",
};
```

When full sprite sheets or large role/benefit art need to move out of the local package, upload the same folder layout to a CDN or HTTPS static host, then set:

```ts
mode: "remote",
remoteBase: "https://your-cdn.example.com/assets"
```

After switching to remote mode, the code paths in `services/assets.ts` keep page code unchanged. In production, remember that WeChat Mini Program image hosts must be available over HTTPS and configured as legal download/request domains when required.

Current local build uses `scripts/copy-assets.mjs` after `taro build` to copy filtered `src/assets` files into `dist/assets`. Source PSD folders and unused sprite batches are excluded from this Mini Program baseline.

### Remote Asset Export Command

Use this command when you are ready to upload larger artwork or complete sprite sheets to a CDN/static host:

```bash
cd laoniu-miniprogram
npm run export:remote-assets
```

The command creates:

- `laoniu-miniprogram/remote-assets/assets/`: upload this entire folder to HTTPS storage.
- `laoniu-miniprogram/remote-assets/asset-manifest.json`: generated file count, byte size and largest files.
- `laoniu-miniprogram/remote-assets/README.md`: upload and config notes.

The generated `remote-assets/` directory is intentionally ignored by git because it can be large. The export includes the current Mini Program `src/assets` layout and also copies the complete H5 `husband-client/src/assets/login-final` sprite batch to `assets/login-sprites-full/` for later full visual parity work.

It also copies the H5 login speech/thought bubble images from `husband-client/src/assets/login/speech` to:

```text
assets/login-speech-full/
```

After upload, set `laoniu-miniprogram/src/config/assets.ts`:

```ts
export const ASSET_CONFIG = {
  mode: "remote",
  localBase: "/assets",
  remoteBase: "https://your-cdn.example.com/assets",
};
```

`remoteBase` must point to the public URL of the uploaded `assets` directory. For example, `publicAsset("/roles/role-00.png")` will resolve to `https://your-cdn.example.com/assets/roles/role-00.png`.

### Login Sprite Remote Mode

Local mode keeps only selected blink sprite sheets inside the Mini Program package. Remote mode can use the complete exported H5 login sprite batch from:

```text
assets/login-sprites-full/
```

The login page already switches these actions when `ASSET_CONFIG.mode` is `"remote"`:

- husband: idle pool `blink`, `adjust-glasses`, `nervous`; overrides `drag`, `select`
- wife: idle pool `blink`, `thinking`, `helpless`; overrides `drag`, `select`
- cat-blue: idle pool `blink`, `lick`, `tail`, `yawn`, `lift`; override `drag`
- cat-white: remote-only idle pool `idle`, `lookaround`, `stretch`, `roll`, `jump`; override `drag`

Frame metadata is loaded with `Taro.request` from the remote `index.json`. If the request fails or the remote host is not configured as a legal WeChat domain yet, the component falls back to the local blink animation instead of blocking the login page.

Remote mode also swaps husband/wife login bubbles from the lightweight local text bubbles to H5 speech/thought image bubbles from `assets/login-speech-full/`. Cat bubbles keep the local text fallback because the H5 source does not define cat-specific speech images.

## WeChat Production Requirements

- HTTPS server domain.
- WeChat public platform legal request domain.
- Identity binding and access control.
- Server-side reward and approval validation.
- Backup/export strategy.

## Security Notes

Do not rely on frontend-only checks for:

- identity
- task approval
- reward settlement
- punishment status
- wallet and ledger writes
- benefit cooldowns
