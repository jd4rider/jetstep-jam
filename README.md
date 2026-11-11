# Jetstep Jam!

A portrait-first jet-boot arcade platformer for [Little Joy Arcade](https://littlejoyarcade.site/).

Pip, a tiny inventor with enormous rocket boots, descends through the broken Harmony Engine to recover its scattered Sound Sparks. Every stage is a vertical machine of floors, lifts, gaps, switches, hazards and hidden resonance fragments.

- **1,000 campaign levels** across **20 worlds**, with one boss at the end of each world.
- **35 power-ups**, 20 outfits, 30 boot skins and **102 achievements**.
- **Six extra modes**: Endless Descent, Classic Arcade, Daily Challenge, Time Attack, Boss Rush and Zen.
- Portrait-first 540×960 design, responsive to taller phones and desktop.
- Original code-generated art, animation and adaptive Web Audio soundtrack — no third-party game assets.

## Play

```bash
npm install
npm run dev
```

Open the URL Vite prints. A production build is a static Vite application:

```bash
npm run build
npm run preview
```

## Controls

| Action | Keyboard | Touch |
| --- | --- | --- |
| Move | `A` / `D` or `←` / `→` | Left / right buttons |
| Jump / jet | `Space`, `W` or `↑` | JET button; tap to jump, hold to thrust |
| Duck / slide | `S` or `↓` | DUCK button |
| Interact | `E` | Automatic on contact |
| Pause | `Esc` | Pause button |
| Restart | `R` | Pause → restart |

On the ground a JET tap jumps. Hold JET in the air to burn energy and hover. Release it to descend. Duck while moving to slide under low machinery. Collect every required Sound Spark to light the exit portal, then reach it. Optional fragments and no-damage clears earn extra stars.

Gamepad input is supported through the browser Gamepad API. Touch size, opacity and left-handed layout are configurable in Settings.

## Content

The campaign catalogue is deterministic: level IDs, names, seeds, boss stages and world progression are stable for a given release. Levels are generated from validated floor segments with reachable required sparks, reachable exits, sufficient energy and floor-spanning collection routes. All 1,000 are checked by the test suite. The 20 world-opening stages use their world's palette, hazard family, music and boss identity; later stages increase floor count and combine mechanics.

Five star criteria are shown before play; the standard clear awards one star, 25% remaining energy awards a second, and a no-damage or all-optional run awards the third.

## Architecture

```text
src/
  core/        save schema, progression reconciliation, adaptive audio, RNG
  data/        worlds, 1,000-level catalogue, powers, cosmetics, achievements
  generator/   deterministic level builder and reachability validator
  player/      movement helpers, arcade player, layered Pip renderer
  world/       generated backdrops, platforms/lifts, hazards, enemies, textures
  ui/          HUD, touch controls, shared panels and buttons
  scenes/      boot, menu, universe, world, modes, game, boss, results, settings
tests/         movement, 1,000-level catalogue, saves, content
tools/         real-browser smoke test
```

Phaser 3 Arcade Physics runs at a fixed 60 Hz target. Movement helpers are frame-rate independent. Rendering uses code-generated Canvas/WebGL textures, layered parallax, pooled short-lived particles and quality settings driven by accessibility options.

## Little Joy Arcade integration

The real drop-in client is served from `public/arcade-client.js` and loaded by `index.html` with `data-game-id="jetstep-jam"`. It exposes the arcade account shell, cloud save mirroring and identity. The game stores a versioned save in `localStorage` under `jetstep-jam-save-v1`; the drop-in client mirrors that storage for signed-in players. When the client or network is unavailable, the game continues on local storage and never destroys local progress. Achievements are evaluated and stored locally because the drop-in client exposes saves and identity, not an achievement endpoint. The game does not claim an online leaderboard endpoint.

## Verification

```bash
npm run typecheck
npm test
npm run build
npm run preview -- --port 4320
node tools/smoke.mjs http://127.0.0.1:4320/
```

`npm test` includes full generation and structural validation of all 1,000 levels, save sanitisation and progression, movement/jet/duck/scoring helpers, and catalogue counts. The smoke test launches Chrome, plays a level through collection and exit, checks pause and touch state, completes a world boss, and asserts local progress was saved. It requires a Chromium-based browser. Set `CHROME_PATH` to an ARM-native Chrome headless shell if the installed Google Chrome is the Intel build on Apple Silicon.

## Deployment

The Vite build uses relative asset paths and works at both a domain root and a `/play/` subpath. See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for GitHub Pages and Little Joy Arcade catalogue steps.
