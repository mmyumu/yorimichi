# Repository Guidelines

## Project Structure & Module Organization

`src/main.ts` contains the Phaser scene, movement, interactions, and game state. `src/art.ts` draws the pixel art in code; `src/network.ts` defines places, routes, fares, and platforms; `src/ticket-machine.ts` implements the ticket kiosk UI. Styles live in `src/style.css`, and `index.html` is the Vite entry point. `scripts/export-mobile.mjs` packages a production build as one HTML file. See `README.md` for gameplay and `REFERENCES.md` for the railway reference material. There is currently no test directory or external asset directory.

## Build, Test, and Development Commands

- `npm ci` installs the locked dependencies. Use Node.js 22.12 or newer.
- `npm run dev` starts the Vite development server.
- `npm run build` checks TypeScript with `tsc --noEmit` and writes the production site to `dist/`.
- `npm run preview` serves the production build locally.
- `npm run build:mobile` builds and creates `dist/yorimichi-mobile.html` for offline mobile use.

There is no configured `npm test` or lint command. Run `npm run build` before submitting changes.

## Coding Style & Naming Conventions

Use TypeScript with strict types, ES modules, single quotes, and two-space indentation, following the existing `src/` files. Name classes and types in `PascalCase`, and variables and functions in `camelCase`; use descriptive route and place identifiers consistent with `src/network.ts`. Keep railway data in `network.ts`, generated visuals in `art.ts`, and kiosk behavior in `ticket-machine.ts`. No formatter or linter is configured, so keep changes consistent with nearby code.

## Testing Guidelines

Automated tests and coverage thresholds are not set up. After building, manually check movement, interaction prompts, ticket purchase and cancellation, platform validation, return trips, and the souvenir journal in the browser. For kiosk changes, check both Japanese and English screens and keyboard dismissal. Check the standalone HTML in a browser after changing the mobile export.

## Commit & Pull Request Guidelines

The short Git history uses brief imperative commit subjects, such as `Build Yorimichi pixel art travel game with Japanese rail hubs`. Follow that style and keep each commit focused. Pull requests should describe the player-visible change, list the build and manual checks performed, link any relevant issue, and include screenshots or a short recording for visual changes. Update `README.md` or `REFERENCES.md` when gameplay or source references change.
