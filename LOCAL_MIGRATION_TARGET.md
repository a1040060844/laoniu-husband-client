# Local Mini Program Migration Target

## Stage 1 Analysis

### H5 Technical Stack

- App: React 19 + Vite 7 + TypeScript.
- Runtime: browser DOM, Vite PWA assets, service worker, local browser storage, optional HTTP `/api/state`.
- Styling: plain CSS modules/files, pixel-art visual language, fixed overlays, CSS animations and image sprites.
- Important incompatibilities for Mini Program: `window`, `document`, `localStorage`, `fetch`, `history`, `location`, DOM event/pointer logic, `createPortal(document.body)`, browser asset base URL.

### Pages To Migrate

- Login page: `husband-client/src/pages/LoginPage.tsx`, `LoginPage.css`, `loginSpriteData.ts`.
- Loading page: `husband-client/src/components/AppLoadingPage.tsx`, `AppLoadingPage.css`.
- Husband role page: `RolePage.tsx`.
- Husband benefit page: `BenefitPage.tsx`, `BenefitModal.tsx`, `BenefitBubble.tsx`.
- Husband task page: `TaskPage.tsx`, `TaskCard.tsx`.
- Slave/punishment page: `SlavePage.tsx`, `SlaveRulingModal.tsx`.
- Wife dashboard and management: `WifeDashboard.tsx`.
- Decrees and story overlays: `DecreeModal.tsx`, `StoryModal.tsx`.
- Pager/navigation: `HusbandVerticalPager.tsx`, `RoleNavigator.tsx`.

### Components To Migrate

- `ProgressBar`, `StatCard`, `TaskCard`, `RoleNavigator`.
- `StoryModal`, `DecreeModal`, `SlaveRulingModal`, `BenefitModal`, `BenefitBubble`.
- Effects: `PixelTransition`, `ClickSpark`, `CountUp`, `AnimatedList`, `AnimatedContent`.
- Newer H5 effects currently present in working tree: `RoleUpgradeCinematic`, `SlaveStateCinematic`, `TaskRewardFlight`, `WifeCommandMotion`.

### Effects And Touch Interactions

- Login sprite idle/random/drag/click/hitbox.
- Pixel transition: 10 x 18 blocks, cover/hold/reveal timing.
- Click spark overlay.
- Count-up numbers.
- Vertical pager swipe gestures.
- Role preview left/right transitions.
- Loading progress with 13-step progress feel.
- Modal entry/exit and overlay hierarchy.

### Reusable TypeScript Logic

- `src/types/domain.ts`: domain types for role, benefits, tasks, punishments, decrees, wallet ledger, logs.
- `src/data/roles.ts`, `benefits.ts`, `tasks.ts`, `taskModules.ts`.
- `src/game/progression.ts`: levels, experience, salary/allowance, reward settlement.
- `src/lib/taskSchedule.ts`: due date, repeat/cycle refresh.
- `src/lib/taskRewards.ts`: reward labels and derived amounts.
- Pure parts of `src/lib/taskSystem.ts`: hydration, normalization, punishment, merge decrees. Browser storage and fetch must be replaced.

### Browser API Replacement Points

- `App.tsx`: `window.location`, `window.history`, `window.setTimeout`, `window.requestAnimationFrame`, `window.setInterval`, browser route handling.
- `taskSystem.ts`: `localStorage`, `fetch`, `import.meta.env`.
- `preloadAssets.ts`: browser image preload and route asset handling.
- Login interactions: pointer events and DOM bounds.
- ClickSpark: root overlay must not use DOM portal.

### H5 To Mini Program Mapping

| H5 Source | Mini Program Target |
| --- | --- |
| `src/pages/LoginPage.tsx` | `laoniu-miniprogram/src/pages/login/index.tsx` |
| `src/pages/LoginPage.css` | `laoniu-miniprogram/src/pages/login/index.scss` |
| `src/pages/loginSpriteData.ts` | `laoniu-miniprogram/src/components/SpriteActor/` |
| `src/components/AppLoadingPage.tsx` | `laoniu-miniprogram/src/pages/loading/index.tsx`, `src/components/LoadingStage/` |
| `src/components/RolePage.tsx` | `src/subpackages/husband/pages/role/index.tsx` |
| `src/components/BenefitPage.tsx` | `src/subpackages/husband/pages/benefit/index.tsx` |
| `src/components/TaskPage.tsx` | `src/subpackages/husband/pages/task/index.tsx` |
| `src/components/SlavePage.tsx` | `src/subpackages/husband/pages/slave/index.tsx` |
| Wallet ledger sections in App/WifeDashboard | `src/subpackages/husband/pages/wallet/index.tsx` |
| `src/components/WifeDashboard.tsx` | `src/subpackages/wife/pages/dashboard/index.tsx` |
| Task creation/review in WifeDashboard | `src/subpackages/wife/pages/task-create/`, `review/` |
| Decree/log sections | `src/subpackages/wife/pages/decrees/`, `logs/` |
| `src/components/effects/*` | `src/components/PixelTransition`, `ClickSpark`, `CountUp`, overlay components |
| `src/data/*`, `src/game/*`, `src/lib/task*` | `src/data`, `src/game`, `src/domain`, `src/services/state` |

### Local Data Plan

- Current stage uses `StateService` with `STATE_BACKEND = "local"`.
- Pages call `services/state/index.ts` only.
- `localState.ts` persists one `AppState` through Taro storage.
- `httpState.ts` remains a no-network TODO adapter for future server integration.

### Future Server Adapter

- Keep all state-changing operations behind `StateService`.
- Later replace `STATE_BACKEND` with `"http"` and implement `httpState.ts`.
- Server must own identity, approval, reward settlement, punishment, and ledger integrity.

### Package And Resource Risks

- H5 contains many role, benefit, loading and sprite-sheet images.
- Mini Program main package must avoid importing every large image.
- Use `services/assets.ts` and subpackages/static paths, with future remote/CDN mode.
- Login sprite sheets and loading source assets are the largest visual risk.

### Visual Parity Risks

- Browser CSS animations and pixel-perfect absolute positioning may need Taro-compatible approximations.
- Sprite drag/hitbox should use touch events and `Taro.createSelectorQuery`.
- Overlay layering differs from DOM portals.
- WeChat devtools and real device must be used for final visual verification.

### Recommended Migration Order

1. Scaffold Taro project and docs.
2. Migrate domain logic and local state service.
3. Add asset and visual foundation.
4. Migrate login static UI, then dynamic sprite interactions.
5. Migrate loading.
6. Migrate global effects and swipe navigation.
7. Migrate husband pages.
8. Migrate wife pages.
9. Finish preview, package, server-later and final report docs.
