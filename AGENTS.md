# Repository Guidelines

## Project Structure & Module Organization

This is a buildless static web game. All browser code lives in `dist/`:

- `dist/index.html` defines the game UI and accessible labels.
- `dist/app.js` owns round state, controls, scoring flow, and UI updates.
- `dist/game.js` contains pure game rules: orders, target masks, pouring, timers, and scoring.
- `dist/scene.js` renders the Three.js cup, milk pitcher, and foam texture.
- `dist/style.css` contains responsive and reduced-motion styles.
- `tests/game.test.js` tests the pure functions in `game.js` using Node’s built-in test runner.

Keep gameplay logic in `game.js`; keep WebGL details in `scene.js`. The app module should compose those two layers rather than duplicate their calculations.

## Build, Test, and Development Commands

- `npm run dev` — serves `dist/` at `http://127.0.0.1:5183` for local play.
- `npm test` — runs `node --test tests/*.test.js`.
- `npm run check` — syntax-checks the three JavaScript modules shipped to browsers.

There is no bundler, install step, or build output. Run `npm test`, `npm run check`, and `git diff --check` before committing a behavior change.

## Coding Style & Naming Conventions

Use modern ES modules and four-space indentation in JavaScript. Prefer small named functions and direct DOM access through the existing `$` helper in `app.js`. Use `camelCase` for functions and variables, `UPPER_SNAKE_CASE` for exported constants, and concise kebab-case IDs/classes in HTML and CSS.

Avoid dependencies and framework abstractions. Three.js is loaded from jsDelivr inside `scene.js`; keep the site usable as static files. Preserve the current compact CSS style when editing nearby rules.

## Testing Guidelines

Add or update a focused `node:test` case whenever changing a pure game rule, target shape, score calculation, timer, or tilt conversion. Test names should describe user-visible behavior, for example: `every order has a distinct, scoreable target`.

Browser-only changes should still receive a local play-through when possible. Check both pointer controls and the phone tilt path when touching input behavior; tilt needs HTTPS and a real motion sensor for final confirmation.

## Commit & Pull Request Guidelines

Use short Conventional Commit-style subjects already used in this repository: `feat: add varied latte orders` or `fix: prevent selection while pouring`. Keep each commit focused.

Pull requests should explain the player-facing change, list commands run, and include a screenshot or short recording for UI, layout, or 3D-scene changes. Mention any untested device-specific behavior, especially motion permissions and WebGL.
