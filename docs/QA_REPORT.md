# Jetstep Jam! 1.0.0 — QA Report

Date: 2026-11-11

## Checks run

| Check | Result |
| --- | --- |
| `npm run typecheck` | Pass |
| `npm test` (31 tests) | Pass |
| All 1,000 generated campaign levels validated | Pass, 0 failures |
| `npm run build` | Pass; 1.67 MB JS before gzip, 396 KB gzip |
| Browser smoke, 390×844 touch viewport | Pass |
| Touch right button | Pass, Pip moved from x 102 to x 190 |
| Jump / jet energy consumption | Pass, 100 → 98 |
| Pause and resume | Pass |
| Collect all 8 required sparks and light exit | Pass |
| Reach exit, show results and save 3-star clear | Pass |
| Save `w1-50` after boss completion | Pass |
| Console/page errors during smoke | 0 |
| Supabase catalogue row | Pass, `jetstep-jam` 1.0.0, live |

The smoke run uses the native ARM headless Chrome from the local Playwright cache because the installed Google Chrome is the Intel build and its DevTools launch was unreliable on this Apple Silicon host. The game itself reported Canvas/Web Audio fallback rendering in that browser, not WebGL.

## Automated coverage

- 1,000 unique level IDs, 20 worlds × 50 levels, one boss per world.
- Reachable required sparks, exits, start positions, floor spread, energy minimums and top-floor gaps on all 1,000 levels.
- Deterministic generation, zen hazard removal and world gating.
- Horizontal acceleration, frame-rate independence, jump cut, coyote time, input buffering, energy drain/refill and collision-height changes.
- 35 power-ups, 20 outfits, 30 boot skins, 20 worlds/bosses and 102 achievements.
- Save sanitisation, invalid IDs, clamped values, storage failure fallback and result recording.
- Campaign-only level completion, daily/time/boss-rush record separation and one-time achievement reconciliation.

## Limitations

- The campaign is **deterministically generated and validated**, not 200 individually hand-authored levels. The 20 world openers use their world's palette, hazards, music and boss identity, but they are not 20 separately designed maps per world.
- The 20 bosses share one gameplay framework; each has a distinct name, palette, pattern mix and weak-point fight, but not wholly separate scene code.
- The 30 enemy names map to 10 behavior families and 30 visual variants. They are not 30 wholly different AI programs.
- Achievements are evaluated locally. The arcade drop-in client exposes identity and save mirroring, not an achievement or leaderboard endpoint, so no online achievement/leaderboard claims are made.
- No physical phone or tablet was available. Mobile coverage is a 390×844 touch-emulated Chromium viewport plus synthetic multitouch pointer events.
- Boss weak-point hits in the smoke test use the debug test surface; the boss scene, patterns, weak-point window, defeat animation, save and results transition were exercised, but a human did not manually land all three hits.
- The custom domain `jetstepjam.littlejoyarcade.site` is not configured in this pass. The verified deployment URL is the GitHub Pages project URL.
