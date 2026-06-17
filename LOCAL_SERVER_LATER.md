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

Current local build uses `scripts/copy-assets.mjs` after `taro build` to copy filtered `src/assets` files into `dist/assets`. Source PSD folders and unused sprite batches are excluded from this Mini Program baseline.

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
