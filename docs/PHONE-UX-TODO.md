# Phone UI/UX — Future Session TODO

> Created: 2026-05-18
> Priority: After Marketplace build

The user tested the app on mobile and the experience was "terrible" despite the responsive overhaul done in session 2026-05-18. This file captures what needs to be fixed.

---

## Known Issues to Audit First

Before building fixes, test each screen on an iPhone (real device or Safari DevTools iPhone simulator) and document exact breakage:

1. **Chat page** — input box gets pushed under iOS keyboard? Scroll behavior? Message bubbles overflow?
2. **Agent Lab** — TeamBuilder three-column layout even with `hidden md:flex`? Modal sizing?
3. **Schedule page** — Calendar grid cells too small to tap? Day numbers unreadable?
4. **Brain / Knowledge Graph** — Canvas physics sim responsive? Nodes readable at mobile scale?
5. **Dashboard widgets** — Drag-drop broken on touch? Widget picker modal scrollable?
6. **Bottom nav** — Does it actually stay in-flow (not overlap)? Safe area respected?

---

## Priority Fixes to Implement

### 1. Chat input area
- iOS Safari: the input bar can slide under the keyboard. The fix is to use `visualViewport` resize event to adjust the bottom padding dynamically.
- The token counter / attachment row may overflow horizontally on narrow screens — needs horizontal scroll or collapse.
- File attach / mic / send buttons need larger touch targets (min 44×44pt per Apple HIG).

### 2. Calendar grid (Schedule page)
- 7-column grid on a 375px screen gives ~53px/cell — day numbers and dots are barely visible.
- Fix: on mobile, switch to a vertical list view of days with events (no grid), and show the grid only on `md:`.
- Or: make the cells taller, larger text, and use horizontal scroll for the week view on mobile.

### 3. Modal sizing
- Modals use `width: 420px` or `width: 440px` fixed — these overflow on phones.
- All modals already have `w-full max-w-[420px] mx-4` classes... but some don't. Audit each one.
- The meeting participant picker modal is particularly tall — needs scrollable content area.

### 4. Agent Lab
- The agent/team editor modal has a multi-column form layout — collapses to single column on `sm:`.
- The team preview panel (`hidden md:flex`) is correct but the form half still feels cramped.

### 5. Knowledge Graph (Brain)
- Canvas zoom/pan: needs pinch-to-zoom and two-finger pan on mobile.
- Node labels overflow canvas bounds on small screens.

### 6. Bottom nav "More" sheet
- The more sheet opens but items may be hard to tap if not spaced for 44pt touch targets.
- Add subtle haptics feedback (CSS: `touch-action: manipulation`).

### 7. General typography
- Several places use `text-[9px]`, `text-[8px]` — these are basically unreadable on phone.
- Floor at `text-[11px]` for anything the user actually reads.

---

## Implementation Approach

1. **Audit first** — screenshot every page on iPhone Safari DevTools and list exact issues.
2. **Fix in priority order**: Chat input, Modals, Calendar, Graph, Typography.
3. **iOS keyboard handling** — create a `useVisualViewport` hook that adjusts layout when the keyboard appears.
4. **Touch targets** — run a quick audit of all `<button>` elements and ensure `min-h-[44px] min-w-[44px]` or `p-3` on anything touch-primary.
5. **Test PWA mode** — with "Add to Home Screen", the app runs in standalone mode. Test reminders, navigation back gesture, etc.

---

## Notes on Current State
- `MobileNav.tsx` bottom tab bar is in-flow (correct, not fixed). But it's new and may have edge cases.
- `env(safe-area-inset-bottom)` is set in MobileNav padding — should handle notch/home-bar.
- `viewport: { viewportFit: "cover" }` is set in `app/layout.tsx`.
- The `h-full` / `max-h-full` approach in chat should prevent the 100vh overflow — confirm on device.
