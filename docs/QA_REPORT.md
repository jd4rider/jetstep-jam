# Jetstep Jam! 1.0.1 — QA Report

Date: 2026-11-11

## What changed in 1.0.1

- Tall portrait viewports now use `ENVELOP`, so the stage fills the phone screen instead of letterboxing. The host element no longer centres the canvas with CSS: Phaser already centres it with margins, and the two together pushed the picture down and to the left.
- Fixed UI moved inside the margin that `ENVELOP` crops (HUD, touch pads, menus, panels, results, achievements and settings rows).
- Lifts are static bodies carried explicitly, with motion derived from a distance/speed cycle and clamped per frame. The previous sine used milliseconds as radians, so platforms oscillated roughly seven times a second. Lift tops now sit flush with the floor they serve.
- `BootScene` reports `VERSION` instead of a hardcoded `1.0.0`, which had made the live page advertise the wrong build.

## Checks run

| Check | Result |
| --- | --- |
| `npm run typecheck` | Pass |
| `npm test` (32 tests) | Pass |
| All 1,000 generated campaign levels validated | Pass, 0 failures |
| Lift placement test, 60 sampled levels | Pass; every lift flush with a floor, one-floor travel, authored speed in range |
| `npm run build` | Pass; 1.67 MB JS before gzip, 396 KB gzip |
| Browser smoke, local build at 390×844 touch | Pass |
| Canvas fills and centres | Pass, 474.8×844 in a 390×844 viewport; centre within 1.5 px |
| Lift motion sample | Pass, max 13 units per 700 ms locally and 17 live; the 1.0.0 build oscillated several times a second |
| Stand on and ride a lift | Pass, `onGround` retained, y 444 → 466 locally and 465 → 470 live, no health lost |
| Touch right button | Pass, Pip moved from x 102 to x 361 |
| Jump / jet energy consumption via the JET touch button | Pass, 100 → 97 locally and 100 → 98 live |
| Pause and resume | Pass |
| Collect all 8 required sparks, light exit, reach results, save 3 stars | Pass |
| Save `w1-50` after boss completion | Pass |
| Console/page errors during both smokes | 0 |
| Production GitHub Pages smoke | Pass at https://jd4rider.github.io/jetstep-jam/ |
| Live reported version | Pass, `1.0.1` (the first live check caught the BootScene `1.0.0` overwrite; fixed and redeployed) |
| Portal detail page | Pass, renders 1.0.1 |
| Portal play iframe | Pass, loads `?v=1.0.1`; canvas 407×723 inside a 390×723 frame, horizontally centred |
| Supabase catalogue row | Pass, `jetstep-jam` 1.0.1, live |
| Supabase migration ledger | Pass, `0048` recorded as applied on production |

The smoke run uses the native ARM headless Chrome from the local Playwright cache because the installed Google Chrome is the Intel build and its DevTools launch was unreliable on this Apple Silicon host. The game itself reported Canvas/Web Audio fallback rendering in that browser, not WebGL. The smoke program passed against the local production build, the deployed GitHub Pages URL, and the portal play iframe.

The portal page loads advertising frames from Google on the same screen; they are excluded from the game checks and produced no page errors. GitHub Pages serves HTML with `max-age=600`, so a browser that cached the previous `index.html` can show 1.0.0 until that entry expires.

## Automated coverage

- 1,000 unique level IDs, 20 worlds × 50 levels, one boss per world.
- Reachable required sparks, exits, start positions, floor spread, energy minimums and top-floor gaps on all 1,000 levels.
- Deterministic generation, zen hazard removal and world gating.
- Lift geometry: flush top with a served floor, exactly one floor of travel and authored speed bounds.
- Horizontal acceleration, frame-rate independence, jump cut, coyote time, input buffering, energy drain/refill and collision-height changes.
- 35 power-ups, 20 outfits, 30 boot skins, 20 worlds/bosses and 102 achievements.
- Save sanitisation, invalid IDs, clamped values, storage failure fallback and result recording.
- Campaign-only level completion, daily/time/boss-rush record separation and one-time achievement reconciliation.

## Limitations

- The campaign is **deterministically generated and validated**, not 200 individually hand-authored levels. The 20 world openers use their world's palette, hazards, music and boss identity, but they are not 20 separately designed maps per world.
- The 20 bosses share one gameplay framework; each has a distinct name, palette, pattern mix and weak-point fight, but not wholly separate scene code.
- The 30 enemy names map to 10 behavior families and 30 visual variants. They are not 30 wholly different AI programs.
- Achievements are evaluated locally. The arcade drop-in client exposes identity and save mirroring, not an achievement or leaderboard endpoint, so no online achievement/leaderboard claims are made.
- No physical phone or tablet was available. Mobile coverage is a 390×844 touch-emulated viewport, the same viewport inside the portal play frame, and synthetic multitouch pointer events.
- Lift boarding was checked by placing Pip on one lift through the debug surface in level w1-1 and holding the ride for about a second; every generated lift's flush placement is covered by the generator test, but each lift was not ridden by hand.
- Boss weak-point hits in the smoke test use the debug test surface; the boss scene, patterns, weak-point window, defeat animation, save and results transition were exercised, but a human did not manually land all three hits.
- The custom domain `jetstepjam.littlejoyarcade.site` is not configured in this pass. The verified deployment URL is the GitHub Pages project URL.
