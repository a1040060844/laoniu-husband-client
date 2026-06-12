# PSD Loading Modal Design QA

- Source visual truth: `D:\下载\加载页效果图.psd`
- Source backup: `public/assets/loading/source/loading-page-effect.psd`
- Implementation screenshot: `loading-psd-husband-loading.png`
- Comparison artifact: `design-qa-comparison.png`
- Viewport: `390x844`

## Comparison

The implementation preserves the PSD component proportions and vertical order: logo,
cream pixel panel, paired characters, primary status, rotating task, 13-slot progress
track, tip strip, and the external action button. The modal is scaled as one composed
stage, so individual raster layers are never stretched independently.

Intentional state differences from the PSD composite:

- Loading state hides the action button until tasks, assets, and the three-second floor finish.
- Runtime progress and percentage are dynamic rather than fixed at the PSD's 78% example.
- The white PSD canvas is replaced by the visible login-room backdrop with a 25% warm-black overlay and light blur.
- Wife mode reuses the same geometry and renders route-specific status copy in the matching visual treatment.

## Interaction QA

- `loading`: progresses for at least three seconds and does not navigate automatically.
- `ready`: holds at 100% and displays the PSD continue button until the user clicks.
- `error`: displays the PSD retry button; retry is required before continue becomes available.
- `loading-preview=1`: reaches ready and keeps the modal open when the continue button is clicked.
- Login entry, direct route entry, and browser forward navigation all use the same gate.

## Responsive QA

- `390x844`: modal centered, both characters complete, no page scroll or bottom gap.
- Short viewport (`390x650`): composed stage scales down uniformly and remains within safe bounds.
- Background remains recognizable beneath `rgba(16, 9, 5, 0.25)` and a light blur.

## Result

No actionable P0, P1, or P2 visual mismatch remains. Final result: passed.
