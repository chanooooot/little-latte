# Little Latte

A one-round latte art game. Make a heart in 30 seconds.

## Play

On a phone, tap **Start pouring** and allow motion access. The phone's current angle becomes the center. Tilt to aim, and hold the cup to pour. Tap **Finish** whenever you are done, or let the round end automatically. Tap **Recenter** if your grip changes.

On a computer, move the mouse to aim and hold the cup to pour. Arrow keys and Space also work.

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

The site is static HTML, CSS, and JavaScript in `dist/`. Three.js loads from jsDelivr. It needs internet access and WebGL. Phone tilt needs HTTPS and motion sensor access. Foam is a soft brush, not a fluid simulation. Scoring compares the poured shape with a heart using a small alignment tolerance. No accounts, server data, analytics, or leaderboard.
