# Jetstep Jam! 1.0.2 — QA Report

Date: 2026-11-11

## What changed in 1.0.2

- **Falling through floors.** Three faults combined. Lifts descended a full floor, but gaps alternate sides, so the floor below a lift is solid exactly where it travelled; riding a lift down drove Pip into that floor. The rider was also carried by teleporting the player every frame, which could push them through any surface at high frame rates. And one-way platforms tested the *current* feet position, which a fast fall already overshoots.
  - Lifts now stop 100 units above the floor below, inside a jump's reach, and never overlap a solid floor.
  - The manual rider teleport is gone; the lift's collider carries Pip, which it does cleanly (feet stayed within 3 units of the lift surface across a full descent).
  - A swept guard compares the previous frame's feet with the current position and puts Pip on the highest surface he crossed downwards.
  - One-way platforms compare the pre-step feet position instead of the current one.
  - Arcade physics is pinned to fixed 60 Hz steps, so a long frame is split instead of moving the player through a 28-unit floor in one jump.
- **Width.** The stage now covers the width whenever doing so costs at most 6% of the height. A 390×664 viewport (a phone whose browser chrome shortens the page) now draws a 390×693 canvas: full width, centred. Tall phones were already full-bleed. Tablets and desktop keep the whole stage with `FIT`, because covering 768×1024 or 1280×800 would crop the HUD and touch pads off-screen.

## Checks run

| Check | Result |
| --- | --- |
| `npm run typecheck` | Pass |
| `npm test` (32 tests) | Pass |
| Lift placement test (60 sampled levels) | Pass; flush at the top, at least 90 units clear of the floor below |
| `npm run build` | Pass; 1.67 MB JS before gzip, 396 KB gzip |
| Browser smoke, 390×844 touch | Pass; 0 console errors |
| Canvas fills and centres | Pass; 474.8×844 in 390×844, centre within 1.5 px |
| Narrow phone viewport 390×664 | Pass; 390×693 canvas, full width |
| Tablet 768×1024 and desktop 1280×800 | Whole stage, centred, side space (by design) |
| Lift motion | Pass; 7 units per 700 ms, readable |
| Ride a lift | Pass; feet tracked the lift surface within 0–3 units across a 2 s descent |
| Terminal-speed drops onto solid floors | Pass on repeated runs after fixed-step physics (the 1.0.1 build fell through on the first attempt) |
| Terminal-speed drops onto one-way platforms | Improved by the pre-step check; the synthetic probe still overshoots a one-way occasionally |
| Touch right, jet, pause/resume, 8/8 sparks, results, boss save | Pass |
| Live reported version | 1.0.2 |

## Automated coverage

1,000 generated levels validated for reachable sparks, exits, start positions, floor spread, energy minimums and top-floor gaps; deterministic generation, zen hazard removal, world gating; lift geometry; horizontal acceleration, frame-rate independence, jump cut, coyote time, input buffering, energy drain/refill and collision-height changes; 35 power-ups, 20 outfits, 30 boot skins, 20 worlds/bosses and 102 achievements; save sanitisation and result recording; campaign-only completion, daily/time/boss-rush separation and one-time achievement reconciliation.

## Limitations

- Campaign levels are **deterministically generated and validated**, not hand-authored; the 20 world openers reuse their world's palette, hazards, music and boss identity.
- The 20 bosses share one framework with distinct names, palettes, pattern mixes and weak-point fights, not wholly separate scene code.
- The 30 enemy names map to 10 behavior families and 30 visual variants.
- Achievements are local; the arcade client exposes identity and save mirroring, not leaderboard endpoints.
- No physical phone or tablet was available. Mobile coverage is touch-emulated 390×844 and 390×664 viewports plus synthetic multitouch.
- Lift boarding, the swept guard and high-speed drops are tested through the debug surface and scripted probes, not by a human hand on a device.
- A portrait stage cannot fill a landscape or tablet width without cropping the HUD; those screens intentionally show the whole stage.
