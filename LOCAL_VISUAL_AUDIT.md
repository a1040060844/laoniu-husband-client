# Local Visual Audit

## Audit Method

Use `husband-client/` as the visual and behavior source of truth. For each migrated page, record source files, target files, restored elements, differences, and items needing WeChat DevTools or real-device review.

## Login Page

- H5 source: `husband-client/src/pages/LoginPage.tsx`, `LoginPage.css`, `loginSpriteData.ts`, `public/assets/login/`, `src/assets/login-final/`.
- Mini Program target: `laoniu-miniprogram/src/pages/login/index.tsx`, `index.scss`, `components/SpriteActor/`.
- Status: pending migration.
- Known risk: sprite-sheet CSS and drag/hitbox need touch-based implementation.

## Loading Page

- H5 source: `husband-client/src/components/AppLoadingPage.tsx`, `AppLoadingPage.css`, `public/assets/loading/`.
- Mini Program target: `laoniu-miniprogram/src/pages/loading/index.tsx`, `components/LoadingStage/`.
- Status: pending migration.

## Husband Pages

- H5 source: `RolePage`, `BenefitPage`, `TaskPage`, `SlavePage`, `HusbandVerticalPager`.
- Mini Program target: `src/subpackages/husband/pages/*`.
- Status: pending migration.

## Wife Pages

- H5 source: `WifeDashboard`, `SlaveRulingModal`, task/benefit/decree/log sections.
- Mini Program target: `src/subpackages/wife/pages/*`.
- Status: pending migration.

## Effects

- H5 source: `src/components/effects/*`.
- Mini Program target: `src/components/PixelTransition`, `ClickSpark`, `CountUp`, `StoryModal`, `DecreeModal`, `OverlayRoot`.
- Status: pending migration.
