# AGENTS.md

## Project goal

Migrate the local `husband-client` React + Vite H5 project to a WeChat Mini Program using Taro + React + TypeScript + SCSS.

The migration target is visual and behavioral parity with the existing H5 app. Do not redesign the product. Preserve existing pages, UI proportions, illustration display, animation timing, swipe behavior, transition effects, modal layering, loading flow, click effects, role/login interactions, task system, benefit system, level system, wallet ledger, punishment/slave state, decrees, husband flow, and wife flow.

## Local-only phase

This project is currently local-only.

Do not depend on:

- cloud server
- CloudBase
- remote database
- online API
- GitHub repository access
- production HTTPS domain
- real WeChat backend configuration

Use local state and mock data first. Reserve an HTTP service adapter for later server integration.

## Hard rules

- Do not delete or overwrite `husband-client/`.
- Create the Mini Program implementation in `laoniu-miniprogram/`.
- Treat `husband-client/` as the source of truth for UI and behavior.
- Do not use third-party UI component libraries to replace the current UI.
- Do not redesign screens.
- Do not simplify animations or swipe behavior unless Mini Program limitations require it, and document every difference.
- Do not introduce new business features.
- Keep business logic in reusable TypeScript modules.
- Keep state access behind a service layer.
- Current state backend must be local.
- Future server integration must be isolated behind `httpState.ts`.
- Keep large illustrations out of the Mini Program main package when possible.
- Use a resource abstraction layer for all images and illustrations.
- Preserve original asset naming semantics where practical.
- Run available build/type-check commands after changes.
- Explain any command that cannot run.

## Web API replacement rules

Replace:

- `div`, `section`, `span`, `i` with `View` or `Text`
- `img` with `Image`
- `button` with `Button` or a tappable `View` when visual fidelity requires it
- `localStorage` with `Taro.getStorageSync` / `Taro.setStorageSync`
- `fetch` with a service-layer abstraction
- `window.location` / `history` with Taro navigation or local scene switching
- `document.body` / `createPortal` with root fixed overlay components
- `PointerEvent` with `onTouchStart`, `onTouchMove`, `onTouchEnd`
- `getBoundingClientRect` with `Taro.createSelectorQuery`

Do not leave `window`, `document`, `localStorage`, or `createPortal(document.body)` in Mini Program runtime code.

## Stage process

For every stage:

1. Read the H5 reference files first.
2. Implement the Mini Program version.
3. Run available checks.
4. Fix build/type/runtime issues.
5. Self-review the diff.
6. Compare against the H5 reference.
7. Update migration/audit documentation.
8. Commit a Git checkpoint if Git is available.
9. Continue to the next stage without asking the user.

## Stage summary requirements

After every stage, document:

- What was migrated.
- Which H5 files were used as references.
- Which Mini Program files were created or changed.
- Which commands were run.
- Whether the build passed.
- Known visual differences.
- Remaining risks.
