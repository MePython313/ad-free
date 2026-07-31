# ad-free — TubeXP

Watch YouTube **ad-free** with a built-in AdBlocker. Paste a link in the box and hit Play — no ads, no tracking (uses `youtube-nocookie.com` embeds).

## What's inside

- 🛡️ **Built-in AdBlocker** — a uBlock-style filter engine:
  - Blocks known ad/tracker domains (`doubleclick.net`, `googlesyndication.com`, `adservice.google.com`, `taboola`, `outbrain`, etc.)
  - `MutationObserver` nukes ads the moment they're injected into the page
  - Live counter badge: "🛡️ N ads blocked"
- 📺 **Ad-free player** — YouTube embeds with `youtube-nocookie.com`, autoplay, and start-time support
- 🔗 **Smart link parsing** — `watch?v=`, `youtu.be`, `/shorts/`, `/embed/`, `/live/`, plus `&t=` / `&start=` timestamps
- 🕘 **History** — thumbnails, click to replay, per-item delete, clear all (saved in localStorage)
- 🔍 **Search** — opens YouTube results in a new tab
- Real video titles via the noembed oEmbed proxy

## How to use

1. Open `index.html` (or host it anywhere — it's 100% client-side).
2. Paste a YouTube link → hit **▶ Play**.
3. Watch ad-free. The shield badge counts what the AdBlocker removed.

Made by **Prakshit** @Hyd2026.
