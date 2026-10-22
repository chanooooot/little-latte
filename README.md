# Little Latte

A small 3D latte art game: move the pitcher and hold to pour, matching a reference in 30 seconds.

## Run

```sh
npm run dev
```

Open http://127.0.0.1:5183. There is no build step and no npm dependency installation.

## Play

- Select Heart, Tulip, or Rosetta, then press **Start pouring**.
- Move the pointer over the coffee and hold the mouse button or touch to pour.
- Adjust **Milk flow** for broad shapes or fine details. Holding still grows the foam pool.
- **Fresh canvas** clears the art without resetting the timer.
- **Serve latte** scores early; otherwise the round ends automatically at 30 seconds.
- Keyboard: focus the cup, use arrow keys to aim, hold Space to pour, and press F for fine/full flow.
- Sound is optional and starts muted.

## Checks

```sh
npm test
npm run check
```

Tests cover scoring, distinct targets, empty/flooded cups, stroke continuity, cup boundaries, frame-rate-independent deposition, and the round deadline.

## Implementation and limits

Static HTML/CSS/JavaScript in `dist/`. Three.js 0.180.0 loads from jsDelivr; fonts load from Google Fonts with local fallbacks. The game needs internet access and WebGL. Foam uses a soft deposition brush, not a fluid simulation. Shape matching uses a Dice score with a small alignment tolerance. No accounts, server data, analytics, or leaderboard.

The reference is https://softserve.nog.cc/. Its live interaction was not inspected because browser connection setup was unavailable. All game graphics and interface code here were made for this project.
