# Repository Guidelines

## Project Structure & Module Organization

This is a Phaser 3 lunar lander game named Lunar Drift, built with Vite and TypeScript. Source code lives under `src/`.

- `src/main.ts` creates the Phaser game instance.
- `src/scenes/` contains Phaser scenes such as boot, gameplay, and game over screens.
- `src/entities/` contains game objects like the lander and terrain.
- `src/systems/` contains pure gameplay systems such as scoring, HUD updates, controls, and run progression.
- `src/utils/` contains reusable math and generation helpers.
- Unit tests live next to the code they cover using `*.test.ts`.

Generated build output goes to `dist/` and should not be edited by hand.

## Build, Test, and Development Commands

- `npm run dev` starts the Vite development server.
- `npm run build` runs TypeScript checks and creates a production build.
- `npm run preview` serves the production build locally.
- `npm run typecheck` runs `tsc --noEmit`.
- `npm run test` runs the Vitest suite once.
- `npm run test:watch` runs Vitest in watch mode.

Use `npm run test && npm run typecheck` before submitting gameplay logic changes.

## Coding Style & Naming Conventions

Use TypeScript with strict mode. Keep files focused by responsibility: scene orchestration in scenes, reusable rules in systems, and rendering/game object behavior in entities.

Follow the existing style: two-space indentation, semicolons, single quotes, named exports, and explicit return types for public methods. Use `PascalCase` for classes and Phaser scene/entity files, and `camelCase` for functions, variables, and private methods.

## Testing Guidelines

Vitest is the unit test framework. Prefer fast tests for pure logic in `src/systems/` and `src/utils/`. Avoid Phaser runtime tests unless a browser or scene harness is intentionally added.

Name tests with the source module plus `.test.ts`, for example `Scoring.test.ts`. Cover important gameplay thresholds, deterministic generation, and progression edge cases.

## Commit & Pull Request Guidelines

This repository has no existing commit history yet. Use concise imperative commit messages, for example `Add landing score tests` or `Fix pad collision surface`.

Pull requests should include a short summary, test results, and screenshots or a short recording for visual gameplay changes. Mention any tuning changes to physics, scoring, terrain, or collision behavior.

## Agent-Specific Instructions

Keep gameplay rules testable outside Phaser when practical. Do not edit generated `dist/` assets directly. Always add or update unit tests after fixing bugs or implementing new features, especially for collision, scoring, progression, settings, and pause/menu state.
