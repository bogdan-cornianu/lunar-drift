# Lunar Drift

Lunar Drift is a Phaser 3 lunar lander game built with Vite, TypeScript, and Vitest. Pilot a fragile lander through an endless descent, manage fuel, compensate for wind, and touch down on multiplier pads without exceeding the safe speed or angle limits.

## Gameplay

- Land safely on marked pads to score points and advance to the next site.
- Smaller pads award larger multipliers.
- Clean landings preserve more fuel and build streak bonuses.
- Each crash costs one life; the run ends after three crashes.
- Settings include screen shake, reduced motion, and exhaust particles.

## Controls

- `Left Arrow` / `A`: rotate left
- `Right Arrow` / `D`: rotate right
- `Up Arrow` / `W` / `Space`: thrust
- `Esc`: pause during a run, return from pause settings, or go to the main menu from game over
- `R`: restart from the game over screen

## Requirements

- Node.js 18 or newer
- npm

## Getting Started

Install dependencies:

```sh
npm install
```

Start the development server:

```sh
npm run dev
```

Create a production build:

```sh
npm run build
```

Preview the production build locally:

```sh
npm run preview
```

## Scripts

- `npm run dev`: start the Vite development server
- `npm run build`: run TypeScript checks and build the production bundle
- `npm run preview`: serve the production build locally
- `npm run typecheck`: run `tsc --noEmit`
- `npm run test`: run the Vitest suite once
- `npm run test:watch`: run Vitest in watch mode

## Project Structure

```text
src/
  main.ts              Phaser game bootstrap
  config.ts            shared game constants
  scenes/              boot, menu, gameplay, and game over scenes
  entities/            Phaser game objects such as the lander and terrain
  systems/             reusable gameplay logic, HUD, controls, settings, and scoring
  ui/                  Phaser UI components
  utils/               reusable math and generation helpers
```

Unit tests live next to the modules they cover as `*.test.ts`.

## Development Notes

Keep gameplay rules testable outside Phaser where practical. For gameplay logic changes, run:

```sh
npm run test && npm run typecheck
```

Generated files in `dist/` should not be edited by hand.

## License

MIT. See [LICENSE.md](./LICENSE.md).
