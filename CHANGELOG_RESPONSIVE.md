# Responsive Overhaul — Changelog & Breakpoint Summary

**Date:** 2026-06-10  
**Repo:** https://github.com/Shishoop/portfolio  
**Modified files:** `index.css`, `index.html`

---

## What changed

The portfolio was a fixed-layout desktop site (≈1400–1600px baseline). Five breakpoints were added as an override `@media` layer appended to `index.css` — desktop rule&#8209;book above 1441px is completely untouched. A JS guard was added to `index.html` so the rotate-icon drag interaction disengages automatically on touch/coarse-pointer devices.

---

## Desktop rules replaced by clamp() / min() / max()

| Selector | Original fixed value | Strategy |
|---|---|---|
| `.logo-parent` | `width: 980px` | `min(980px, 67vw)` at 1440; `width: 100%` below |
| `.website-footer` | `width: 1740px` | `width: 100%` from 1024px down |
| `.contact` | `width: 1191px` | `min(1191px, 78vw)` at 1440; `width: 100%` below |
| `.cv-link` | `width: 797px` | `min(797px, 54vw)` at 1440; `width: 100%` below |
| `.experience-description` | `width: 1549px` | `min(1549px, 88vw)` at 1440; `width: 100%` below |
| `.skills-description-wrapper` | `min-width: 779px` | `min-width: unset` from 1440px |
| `.skills-img` | `min-width: 562px` | `min-width: unset` from 1440px |
| `.skills-img-child` | `width/height: 562px / 742px` | `min(562px, 44vw) / min(742px, 58vw)` |
| `.section-1-child` | `height: 1080px` | `min-height` reduced + content-driven at 1024px |
| `.rotate-icon` | `width: 856px`, absolute offset | `clamp()` + `left: 50%; translateX(-50%)` |
| `.x1-pic-card` | fixed large width | `aspect-ratio: 1/1` + responsive clamp |
| `.section-4` / `.section-5` child `.website-1-1` | fixed widths | `width: 100%` + `height: auto` for images |

---

## Breakpoint summary

### `@media (max-width: 1440px)` — Early-tighten
**Affected:** 1440px screens, ultrawide laptop displays.  
**Actions:** clamp() replaces raw px for fonts, paddings, and gaps. Fixed widths capped via `min()`. min-width locks removed so flex/grid can re-flow early.

### `@media (max-width: 1024px)` — Tablet landscape / small laptop
**Affected:** iPad landscape, 11" MacBook Air, 1366×768 laptops.  
**Actions:** Primary behavioural breakpoint. Sections switch from horizontal to vertical flex stacking. `.rotate-icon` opacity drops to 0.15; pointer-events disabled (becomespure decoration). Nav wraps; brand text hidden; compact ring icon shown. Home button shrinks. Contact details → column. All 1740px-max-width blocks release to 100%. Screenshots become fluid images.

### `@media (max-width: 768px)` — Tablet portrait / large phone
**Affected:** iPad portrait, Pixel 7 Pro, Galaxy Tab.  
**Actions:** `.rotate-icon` further subdued (opacity 0.1). Nav brand text stays hidden. Font sizes drop via clamp. Stack gaps tighten. x1-pic-card caps at 340px. Skills-img-child caps at 260×340px. Footer text 0.68rem. Padding everywhere reduced to ≤10px increments.

### `@media (max-width: 480px)` — Mobile
**Affected:** iPhone SE, Galaxy A series, most phones in portrait.  
**Actions:** `.rotate-icon` set to `display: none` (no visual waste). Logo padding halved, font 1.1–1.5rem with text-shadow. CV link `word-break: break-word`, full width. Contact full-width left-aligned. Home button 38×38; bottom/left offsets 8px. Skills-img-child 190–250px. Footer 0.6rem centered text. All decorative absolute positions neutralised.

### `@media (max-width: 375px)` — Extra-small phones
**Affected:** iPhone 5/SE 1st-gen, tiny Android screens.  
**Actions:** Last-resort tightening — no structural changes, just px → px values reduced by ~20% from 480px baseline. Minimum viable padding (4px), smallest acceptable type (0.56–0.65rem), home button at 34px floor.

---

## JS touch-device guard (`index.html`)

**File:** `index.html` — rotate-icon drag interaction block  
**Change:** Wrapped drag state variables and all pointer/dblclick listeners in:

```js
const hasFinePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
if (rotateIcon && hasFinePointer) { ... }
```

**Effect:** Touch/coarse-pointer devices (phones, tablets in touch mode) see the rotate icon only as a decorative `::after` pseudoelement — no drag, no spin toggling, no accidental firing of `pointerdown`/`pointermove`. Desktop/mouse users get full interaction.

---

## Verification

| Check | Result |
|---|---|
| CSS file terminates cleanly at EOF | ✓ line 1739, no unclosed `}` |
| All 5 `@media` blocks correctly opened/closed | ✓ (1440, 1024, 768, 480, 375) |
| Desktop rules unmodified above 1441px | ✓ (surgical append) |
| No `min-width` lock remains unbroken below 1024px | ✓ all set to `unset` or 100% |
| `.rotate-icon` interaction guarded on touch | ✓ matchMedia check before listener attachment |
| LSP diagnostics | ⚠ biome not installed in environment — not run; structural review passed |

---

## Notes for next steps

1. **Install biome** (`npm install -g @biomejs/biome`) and run `biome check index.css index.html` before PR.
2. Test at these physical widths (or DevTools device emulation): 1600px, 1440px, 1366px, 1024px, 768px, 480px, 375px.
3. The `.rotate-icon` `animation: rotate-spin` keyframes (desktop) are preserved; mobile `display: none` on `.rotate-icon` takes precedence so animation never fires.
4. If the project gains a build step, move this override into a separate `responsive.css` and import conditionally.
