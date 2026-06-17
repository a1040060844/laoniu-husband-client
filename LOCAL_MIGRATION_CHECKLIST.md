# Local Migration Checklist

## Stage Checklist

- [x] Stage 1: H5 analysis and migration documents initialized.
- [ ] Stage 2: `laoniu-miniprogram/` Taro scaffold.
- [ ] Stage 3: Shared domain logic migrated.
- [ ] Stage 4: Local state service.
- [ ] Stage 5: Asset and visual foundation.
- [ ] Stage 6: Login static UI.
- [ ] Stage 7: Login interactions.
- [ ] Stage 8: Loading page.
- [ ] Stage 9: Global effects.
- [ ] Stage 10: Swipe/navigation components.
- [ ] Stage 11: Husband pages.
- [ ] Stage 12: Wife pages.
- [ ] Stage 13: Local preview instructions.
- [ ] Stage 14: Future server notes.
- [ ] Stage 15: Package/resource audit.
- [ ] Stage 16: Final build, audit and report.

## Build Checklist

- [ ] `husband-client npm run check`
- [ ] `husband-client npm run build`
- [ ] `laoniu-miniprogram npm install`
- [ ] `laoniu-miniprogram npm run dev:weapp`
- [ ] `laoniu-miniprogram npm run build:weapp`

## Page Checklist

- [ ] Login
- [ ] Loading
- [ ] Husband role
- [ ] Husband benefit
- [ ] Husband task
- [ ] Husband slave
- [ ] Husband wallet
- [ ] Wife dashboard
- [ ] Wife task-create
- [ ] Wife review
- [ ] Wife decrees
- [ ] Wife logs

## Visual Audit Checklist

- [ ] Page structure follows H5 source.
- [ ] Images use asset service.
- [ ] Pixel-art rendering preserved.
- [ ] Overlay z-index is documented.
- [ ] Swipe direction and thresholds reviewed.
- [ ] Modal layering reviewed.
- [ ] Loading states reviewed.
- [ ] Login sprite interactions reviewed.

## Package Checklist

- [ ] No third-party UI replacement library.
- [ ] No CloudBase dependency in local runtime.
- [ ] No online API dependency.
- [ ] No large image batch imports in main package.
- [ ] Husband and wife pages use subpackages.
- [ ] Resource path abstraction exists.
- [ ] Large assets are candidates for future CDN.

## Stage 1 Command Log

- `git status --short`: current repository has pre-existing modified `husband-client` files and untracked `laoniu-husband-miniprogram/`.
- Stage 1 docs were created from local H5 source analysis.
