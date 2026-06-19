# Local Visual Audit

## Audit Method

Use `husband-client/` as the visual and behavior source of truth. For each migrated page, record source files, target files, restored elements, differences, and items needing WeChat DevTools or real-device review.

## Login Page

- H5 source: `husband-client/src/pages/LoginPage.tsx`, `LoginPage.css`, `loginSpriteData.ts`, `public/assets/login/`, `src/assets/login-final/`.
- Mini Program target: `laoniu-miniprogram/src/pages/login/index.tsx`, `index.scss`, `components/SpriteActor/`, `components/SpriteSheetActor/`.
- Status: second-pass migrated.
- Restored: room background, title/subtitle images, love-day plaque, husband/wife role cards, role selection feedback, cat/reset area, speech bubble feedback, pixel rendering, selected husband/wife/cat blink sprite-sheet playback, role actor tap-pop feedback, cat tap feedback, bounded actor/cat dragging, random idle bubble rotation and light floating motion. Remote asset mode can load husband/wife/cat-blue complete action sheets, a remote-only cat-white actor from `assets/login-sprites-full/`, H5 husband/wife speech/thought bubble images from `assets/login-speech-full/` with state-based image selection, H5 top-level static art from `assets/login-static-full/`, and an H5-like independent actor stage with bottom card-image buttons.
- Difference: selected blink sprite sheets and lightweight text bubbles are packaged, while the full `login-final/` batch and H5 speech/thought bubble images are remote-only for package-size control. Exact H5 hitbox rectangles, anchor metrics and original percentage choreography still need real-device tuning in the Mini Program layout.
- Needs device review: sprite playback smoothness, drag feel on real touch screens, touch target size, image scaling on narrow phones, and whether additional sprite-sheet frame assets should move to remote assets or stricter package groups.

## Loading Page

- H5 source: `husband-client/src/components/AppLoadingPage.tsx`, `AppLoadingPage.css`, `public/assets/loading/`.
- Mini Program target: `laoniu-miniprogram/src/pages/loading/index.tsx`, `components/LoadingStage/`.
- Status: second-pass migrated.
- Restored: loading page route, local preload flow, source loading logo/panel/person/error/button assets, rotating task copy, 13-segment progress rhythm, percent text, ready/error state, retry/continue buttons.
- Difference: room/current backdrop mode is still represented by the Mini Program scene background rather than the full H5 fixed modal backdrop choreography.
- Needs device review: first-load timing, asset availability from `dist/assets`, panel scaling on short phones, and transition into husband/wife subpackages.

## Husband Pages

- H5 source: `RolePage`, `BenefitPage`, `TaskPage`, `SlavePage`, `HusbandVerticalPager`.
- Mini Program target: `src/subpackages/husband/pages/*`.
- Status: first-pass migrated.
- Restored: role/progress/wallet display, H5-style role full-screen preview shell, dark scrim, top return control, top-right benefit guide, bottom glass biography/progress/wallet panel, bottom task entry, role preview left/right switching, locked future-role state, level dot row, H5-style benefit stage with current-role background and horizontal benefit bubbles, H5-style task stage with current-role avatar, daily overview and monthly harvest stats, task filter tabs, dark glass task status cards, submit confirmation, H5-style dark wallet ledger stage, current balance/monthly salary/wallet and experience total cards, timeline ledger entries, H5-style slave full-screen illustration, FINAL/status title, recovery progress, freeze-state grid, benefit filter tabs, locked/cooldown/pending/available benefit states, recent benefit records, slave state display, slave-mode ambient overlay, wallet ledger display, recent reward flight panel, Mini Program-safe reward flight overlay, vertical swipe helper.
- Difference: H5 micro-animations, benefit bubble auto-scroll/burst timing, exact DOM-to-target reward projectile paths, exact role navigator art, task source tab split and full pager choreography are simplified into Mini Program-safe reward cards, viewport-based reward flight chips, native button controls and page motion.
- Needs device review: role/slave image framing under the bottom panel, benefit bubble track touch feel, task/wallet/slave stage density on short phones, top button hitboxes, long list scrolling, button density, and subpackage navigation.

## Wife Pages

- H5 source: `WifeDashboard`, `SlaveRulingModal`, task/benefit/decree/log sections.
- Mini Program target: `src/subpackages/wife/pages/*`.
- Status: first-pass migrated.
- Restored: H5-style wife throne console, wife portrait hero, dark shade, return control, status card, EXP/recovery progress, salary/slave state line, pending summary stats, command grid, H5-style task publisher stage with portrait hero, dark command sections, A/B selection, deadline/reward editor and confirm-publish preview, H5-style dark "审核殿" with stat plaques, gold tabs, task/benefit/recent-record review cards, task approve/reject/fail actions, benefit approval/rejection tabs, clean reward chips, manual decrees, decree tone states, log filters/detail preview, punishment/slave controls, slave enter/restore cinematic feedback, Mini Program-safe wife command motion, reset local data.
- Difference: dense H5 dashboard subpages are still split into focused Mini Program pages; wife command motion now uses explicit command wrappers instead of DOM data-attribute querying, and the throne image uses the packaged wife loading portrait until a richer wife-dashboard portrait is moved into remote assets.
- Needs device review: wife hero framing, status-card overlap on short phones, task publisher hero crop, review-card density, gold tab touch feel, dark input contrast, picker values, form ergonomics, and review actions after repeated state changes.

## Effects

- H5 source: `src/components/effects/*`.
- Mini Program target: `src/components/PixelTransition`, `ClickSpark`, `CountUp`, `StoryModal`, `DecreeModal`, `OverlayRoot`, `RoleUpgradeCinematic`, `SlaveStateCinematic`, `RewardFlight`, `WifeCommandMotion`.
- Status: baseline migrated.
- Restored: overlay shell, story modal shell, tone-aware decree modal, upgrade/down/punish decree styling, Mini Program-safe role upgrade cinematic, lightweight decree aura/particle motion, slave enter/restore cinematic overlay, slave ambient overlay, recent reward flight panel plus fixed reward flight chips, wife command active/dim/pending/danger feedback, count-up component API, 10 x 18 pixel transition grid, click spark placeholder, swipe hint.
- Difference: `RoleUpgradeCinematic`, `SlaveStateCinematic`, reward flight, and `WifeCommandMotion` now exist as Mini Program-safe variants; exact H5 DOM-target reward paths and DOM data-attribute command querying are replaced by viewport-based paths and explicit command wrappers.
- Needs device review: z-index stacking over native page elements and transition smoothness.

## Package Notes

- `scripts/copy-assets.mjs` copies filtered local assets into `dist/assets` after Taro build.
- `scripts/audit-package.mjs` reports package totals, top-level groups and largest files, and warns while the local package is close to the 20 MB upload limit.
- `src/config/assets.ts` centralizes `local` vs `remote` asset mode so additional sprite sheets can move to CDN/HTTPS static hosting without page rewrites.
- Source-only directories such as loading PSD files, the full `login-final/` batch, H5 login speech images and full-size H5 login static images were kept out of `laoniu-miniprogram/src/assets`; only selected blink sprite sheets and compressed local images are packaged. The remote asset export includes full `login-final` sprite sheets under `assets/login-sprites-full/`, speech images under `assets/login-speech-full/`, and top-level login art under `assets/login-static-full/`.
- Unused full-page task/wife/reference images and unused loading/login static images were not kept in the baseline package; generated `dist` currently has 124 files, about 19.55 MB total, with `dist/assets` at about 19.04 MB.
- Future production packaging should move large role/benefit images behind remote assets or stricter subpackage asset groups if WeChat package size becomes tight.
