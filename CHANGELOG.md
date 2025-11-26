# CHANGELOG

All notable changes to this project will be documented in this file.

## [Unreleased]

### Added
- Polished MUI theme to better match Devias aesthetics (typography, palette, spacing, shadows).
- `Header` + `MainLayout` new layout with:
  - Collapsible left sidebar (desktop) with persisted state in `localStorage`.
  - Mobile temporary drawer preserved for small screens.
  - Tooltips for collapsed items (hover + focus), with tuned delays for UX.
  - Smooth width animation for sidebar collapse/expand and label fade transitions.
- Right user panel with profile, small stats and quick links.

### Changed
- Replaced old frontend components with a lean MUI-based scaffold.
- Improved app typography by loading Inter + Roboto.
- Accessibility improvements: ARIA attributes for toggle, focusable tooltips.

### Files of interest
- `src/theme/index.js` — theme polish and component overrides
- `src/layouts/Header.jsx` — app bar and collapse toggle
- `src/layouts/MainLayout.jsx` — responsive drawer, tooltips, and right panel

### How to run
```powershell
cd frontend
npm install
npm run dev
# open http://localhost:5173/
```

---

Please review visuals in Chrome and file any requested tweaks as issues or new PRs.
