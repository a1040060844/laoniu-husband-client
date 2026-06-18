# Local Visual Audit

## Audit Method

Use `husband-client/` as the visual and behavior source of truth. For each migrated page, record source files, target files, restored elements, differences, and items needing WeChat DevTools or real-device review.

## Login Page

- H5 source: `husband-client/src/pages/LoginPage.tsx`, `LoginPage.css`, `loginSpriteData.ts`, `public/assets/login/`, `src/assets/login-final/`.
- Mini Program target: `laoniu-miniprogram/src/pages/login/index.tsx`, `index.scss`, `components/SpriteActor/`.
- Status: first-pass migrated.
- Restored: room background, title/subtitle images, love-day plaque, husband/wife role cards, role selection feedback, cat/reset area, speech bubble feedback, pixel rendering, role actor tap-pop feedback, cat tap feedback and light floating motion.
- Difference: the H5 sprite-sheet idle/random/drag/hitbox behavior is represented by static actors plus Mini Program-safe tap/pop/spark feedback. `login-final/` was not copied into the Mini Program package to avoid a large unused asset batch.
- Needs device review: touch target size, image scaling on narrow phones, and whether sprite-sheet interaction should be reintroduced with selective frame assets.

## Loading Page

- H5 source: `husband-client/src/components/AppLoadingPage.tsx`, `AppLoadingPage.css`, `public/assets/loading/`.
- Mini Program target: `laoniu-miniprogram/src/pages/loading/index.tsx`, `components/LoadingStage/`.
- Status: first-pass migrated.
- Restored: loading page route, local preload flow, progress bar, ready/error state, retry/continue buttons.
- Difference: the H5 13-step visual rhythm and source PSD/panel details are simplified to Taro-native blocks and text.
- Needs device review: first-load timing, asset availability from `dist/assets`, and transition into husband/wife subpackages.

## Husband Pages

- H5 source: `RolePage`, `BenefitPage`, `TaskPage`, `SlavePage`, `HusbandVerticalPager`.
- Mini Program target: `src/subpackages/husband/pages/*`.
- Status: first-pass migrated.
- Restored: role/progress/wallet display, role preview left/right switching, locked future-role state, level dot row, task filter tabs, task status cards, submit confirmation, benefit filter tabs, locked/cooldown/pending/available benefit states, recent benefit records, slave state display, wallet ledger display, recent reward flight panel, vertical swipe helper.
- Difference: H5 micro-animations, full reward projectile path animation, and full pager choreography are simplified into Mini Program-safe reward cards and page motion.
- Needs device review: long list scrolling, button density, and subpackage navigation.

## Wife Pages

- H5 source: `WifeDashboard`, `SlaveRulingModal`, task/benefit/decree/log sections.
- Mini Program target: `src/subpackages/wife/pages/*`.
- Status: first-pass migrated.
- Restored: dashboard summary, structured task creation with A/B selection and reward types, task review tabs, task approve/reject/fail actions, benefit approval/rejection tabs, recent review records, manual decrees, decree tone states, log filters/detail preview, punishment/slave controls, reset local data.
- Difference: dense H5 dashboard panels are split into focused Mini Program pages; advanced wife command motion is not ported yet.
- Needs device review: form ergonomics, picker values, and review actions after repeated state changes.

## Effects

- H5 source: `src/components/effects/*`.
- Mini Program target: `src/components/PixelTransition`, `ClickSpark`, `CountUp`, `StoryModal`, `DecreeModal`, `OverlayRoot`.
- Status: baseline migrated.
- Restored: overlay shell, story modal shell, tone-aware decree modal, upgrade/down/punish decree styling, lightweight decree aura/particle motion, recent reward flight panel, count-up component API, 10 x 18 pixel transition grid, click spark placeholder, swipe hint.
- Difference: full `RoleUpgradeCinematic`, `SlaveStateCinematic`, `TaskRewardFlight`, `WifeCommandMotion` choreography remains simplified into Mini Program-safe decree/reward feedback and lightweight motion.
- Needs device review: z-index stacking over native page elements and transition smoothness.

## Package Notes

- `scripts/copy-assets.mjs` copies filtered local assets into `dist/assets` after Taro build.
- Source-only directories such as loading PSD files and the unused `login-final/` batch were removed from `laoniu-miniprogram/src/assets`.
- Unused full-page task/wife/reference images were not kept in the baseline package; current asset payload is 63 files, about 18.82 MB after resizing.
- Future production packaging should move large role/benefit images behind remote assets or stricter subpackage asset groups if WeChat package size becomes tight.
