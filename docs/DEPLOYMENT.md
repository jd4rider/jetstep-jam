# Deployment

## Build

```bash
PATH=/opt/homebrew/bin:$PATH npm ci
npm test
npm run build
```

The static site is written to `dist/`. `vite.config.ts` sets `base: './'`, so the same build works at a root domain or beneath `/play/`.

## GitHub Pages

The repository includes `.github/workflows/pages.yml`. Enable **Settings → Pages → Build and deployment → GitHub Actions**, then push to `main`. The workflow runs the tests and build, uploads `dist/` and deploys it.

Expected project URL:

```text
https://jd4rider.github.io/jetstep-jam/
```

If a custom domain is approved, point `jetstepjam.littlejoyarcade.site` at the Pages site and add the domain in repository settings. Do not publish the game under the Jet-Boot Jack name.

## Little Joy Arcade catalogue

1. Add an entry for the production URL in `littlejoyarcade/src/data/games.ts` with version `1.0.0`, the Jetstep Jam title, description and cover art.
2. Add a migration under `littlejoyarcade/supabase/migrations/` that inserts or updates the same slug and version. Do not edit applied migrations.
3. Apply the migration to the project and verify the catalogue row.
4. Open the live game through the portal and confirm the game boots, the arcade shell identifies the player and cloud saves appear.

The arcade drop-in client is loaded from `public/arcade-client.js` with `data-game-id="jetstep-jam"`. No secret keys belong in this frontend.

## Acceptance checks

- `npm test` passes all 1,000 level validations.
- `npm run build` succeeds.
- `node tools/smoke.mjs <preview-url>` passes without console errors.
- A real mobile-size browser can move, jump, jet, duck and pause with touch controls.
- A complete level saves its stars and score, and a boss clear saves `wX-50`.
- A hard reload restores campaign progress.
- The portal's live version matches the deployed build and the database row.

## Rollback

Keep the previous `dist/` deployment available in GitHub Actions history. Re-run the previous successful Pages deployment or revert the catalogue version and migration in the portal. Local saves are versioned; do not rename `jetstep-jam-save-v1` without a migration.
