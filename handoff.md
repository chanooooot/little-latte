# Little Latte Handoff

## Current State

Little Latte is a static, one-round mobile-first latte-art game. It is published on GitHub Pages:

<https://chanooooot.github.io/little-latte/dist/>

Players receive a random Heart, Tulip, or Leaf order. The active reference is a large ceramic latte at the top-left of the game, with a small customer avatar beneath it. Customer names are deliberately not shown. Players tilt a phone to aim, hold the cup area to pour, and tap **Serve** to finish early. Desktop keeps mouse and keyboard controls.

The result panel shows the poured latte beside the requested latte and reports a shape-match score.

## Important Files

- `dist/app.js` — round lifecycle, sensor permission, input, order selection, preview drawing, and result comparison.
- `dist/game.js` — pure order definitions, target masks, pouring, score, timer, and tilt calculations.
- `dist/scene.js` — Three.js cup, pitcher, foam rendering, and camera. The camera target is raised to place the cup lower in the scene.
- `dist/index.html` and `dist/style.css` — compact mobile UI. Asset query strings in `index.html` intentionally change when browser-cached files need invalidation.
- `tests/game.test.js` — Node tests for game rules.

## Validate Changes

Run:

```sh
npm test
npm run check
git diff --check
npm run dev
```

Open `http://127.0.0.1:5183`. Check the first screen at a phone-sized viewport, then play through to **Serve** and verify both comparison cups. For sensor changes, use a real HTTPS phone: desktop Chrome cannot verify device orientation.

## Deployment

Commit focused changes and push `main`; GitHub Pages deploys automatically. Use a commit query string for a fresh verification, for example:

`https://chanooooot.github.io/little-latte/dist/?v=<commit>`

## Known Limits

Foam is a soft brush rather than fluid physics. The Three.js module loads from jsDelivr, so initial play needs network access and WebGL. Motion controls require browser permission and a physical sensor.
