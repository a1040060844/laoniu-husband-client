# Local Migration Checklist

## Stage Checklist

- [x] Stage 1: H5 analysis and migration documents initialized.
- [x] Stage 2: `laoniu-miniprogram/` Taro scaffold.
- [x] Stage 3: Shared domain logic migrated.
- [x] Stage 4: Local state service.
- [x] Stage 5: Asset and visual foundation.
- [x] Stage 6: Login static UI.
- [x] Stage 7: Login interactions baseline.
- [x] Stage 8: Loading page.
- [x] Stage 9: Global effects baseline.
- [x] Stage 10: Swipe/navigation components baseline.
- [x] Stage 11: Husband pages.
- [x] Stage 12: Wife pages.
- [x] Stage 13: Local preview instructions.
- [x] Stage 14: Future server notes.
- [x] Stage 15: Package/resource audit.
- [x] Stage 16: Final build, audit and report baseline.

## Build Checklist

- [ ] `husband-client npm run check`
- [ ] `husband-client npm run build`
- [x] `laoniu-miniprogram npm install`
- [ ] `laoniu-miniprogram npm run dev:weapp`
- [x] `laoniu-miniprogram npm run build:weapp`

## Page Checklist

- [x] Login
- [x] Login remote full-sprite action wiring with local fallback
- [x] Login remote H5-like independent stage layout
- [x] Loading
- [x] Husband role
- [x] Husband role H5-style bottom panel and guide controls
- [x] Husband benefit
- [x] Husband benefit H5-style stage and benefit bubble rail
- [x] Husband task
- [x] Husband task H5-style overview stage and dark task cards
- [x] Husband slave
- [x] Husband slave H5-style full-screen status and recovery panel
- [x] Husband wallet
- [x] Husband wallet H5-style ledger stage and timeline
- [x] Wife dashboard
- [x] Wife dashboard H5-style throne console and command grid
- [x] Wife task-create
- [x] Wife review
- [x] Wife decrees
- [x] Wife logs

## Visual Audit Checklist

- [x] Page structure follows H5 source at first-pass level.
- [x] Images use asset service.
- [x] Pixel-art rendering preserved with `image-rendering: pixelated`.
- [x] Overlay z-index is documented.
- [x] Swipe direction and thresholds reviewed.
- [x] Modal layering reviewed.
- [x] Loading states reviewed.
- [ ] Login full drag/select/random sprite sheets and hitbox choreography need second-pass real-device/package work.

## Package Checklist

- [x] No third-party UI replacement library.
- [x] No CloudBase dependency in local runtime.
- [x] No online API dependency.
- [x] No large image batch imports in main package.
- [x] Husband and wife pages use subpackages.
- [x] Resource path abstraction exists.
- [x] Large assets are candidates for future CDN.
- [x] Package audit command exists: `npm run audit:package`.
- [x] Remote asset export command exists: `npm run export:remote-assets`.
- [x] `npm run check` runs tests, WeChat build and package audit.

## Stage 1 Command Log

- `git status --short`: current repository has pre-existing modified `husband-client` files and untracked `laoniu-husband-miniprogram/`.
- Stage 1 docs were created from local H5 source analysis.

## Current Command Log

- `npm install --prefer-offline --no-audit --no-fund` in `laoniu-miniprogram/`: passed. An earlier plain `npm install` attempt timed out before completion.
- `npm test` in `laoniu-miniprogram/`: passed, 2 tests.
- `npx tsc --noEmit` in `laoniu-miniprogram/`: passed.
- `npm run build:weapp` in `laoniu-miniprogram/`: passed and generated `dist/`. Sass `@import` deprecation warnings were cleared by switching the app stylesheet entry to `@use`.
- `npm run audit:package` in `laoniu-miniprogram/`: passed; current `dist` is 19.51 MB total and `dist/assets` is 19.04 MB, with a warning that package size is close to the 20 MB upload limit.
- `npm run export:remote-assets` in `laoniu-miniprogram/`: generates an ignored `remote-assets/` upload bundle with current Mini Program assets and the complete H5 `login-final` sprite batch for later CDN/static-host use.
- Browser API scan in `laoniu-miniprogram/src`: no `ReactDOM`, `localStorage`, `history`, `location`, `web-view`, `document`; only `app.config.ts` contains Taro's `window` config key.
- Filtered and optimized local assets: generated `dist` currently contains 124 files, about 19.51 MB total; `dist/assets` contains 55 files, about 19.04 MB after adding selected blink sprite sheets and removing unused loading/static login images.

## WeChat DevTools Preview

1. Open WeChat DevTools.
2. Choose import project.
3. Project directory: `D:\项目\老妞大人游戏项目\老妞大人1.0\laoniu-miniprogram`.
4. AppID can stay as test/tourist AppID for local preview.
5. Click compile. The generated Mini Program output is under `laoniu-miniprogram/dist`.
6. Preview the login page, choose husband or wife, and walk through each subpackage page.

## Known Follow-Up

- Login now has selected husband/wife/cat blink sprite-sheet playback, bounded actor/cat dragging, idle bubble rotation and tap feedback; remote mode can load full drag/select/action sprite sheets from `assets/login-sprites-full/`, randomly choose role/cat idle actions, show the H5 white cat as a remote-only actor, display H5 husband/wife speech images from `assets/login-speech-full/` according to intro/idle/drag/select/thinking states, use H5 top-level static art from `assets/login-static-full/`, and use an H5-like independent actor stage, while exact H5 hitbox choreography remains a real-device follow-up.
- H5 cinematic effects are approximated by lightweight Taro components and need real-device timing polish.
- H5 source package still has unrelated dirty changes; this migration avoided editing `husband-client/`.
