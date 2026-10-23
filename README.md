# Little Latte

A one-round latte art game. Make the customer's heart, tulip, or leaf in 30 seconds.

## Play

Each round shows a named latte order and a large milk-art example to copy. On a phone, tap **Start pouring** and allow motion access. The phone's current angle becomes the center. Tilt to aim, and hold the **Hold to pour** button to pour. Tap **Serve** whenever you are done, or let the round end automatically. Tap **Recenter** if your grip changes. The next round uses a different latte shape.

On a computer, move the mouse to aim and hold the **Hold to pour** button to pour. Arrow keys and Space also work.

## Run

```sh
npm run dev
```

Open http://127.0.0.1:5183. There is no build step or package installation.

## Check

```sh
npm test
npm run check
```

The site is static HTML, CSS, and JavaScript in `dist/`. Three.js 0.180.0 is bundled in `dist/vendor/three/` with its MIT license, so startup does not depend on a CDN. WebGL is required. Phone tilt needs HTTPS and motion sensor access. Foam is a soft brush, not a fluid simulation. Scoring compares the poured shape with a heart using a small alignment tolerance. No accounts, server data, analytics, or leaderboard.
