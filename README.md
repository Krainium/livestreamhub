# ⚽ LiveStream Hub

Watch football live. Pulls streams from multiple broadcasts, plays them right in your browser — no app, no sign-in.

Handles DASH with ClearKey DRM and HLS. Switches quality on the fly. Browser plays the stream directly.

## What it does

- Loads live football streams from multiple sources
- Plays DASH (encrypted with ClearKey) and HLS natively in-browser
- Quality selector per stream
- Works anywhere — Vercel edge, desktop, mobile

## Stack

Next.js 16 · TypeScript · dash.js · hls.js · Tailwind CSS

## Run locally

```bash
npm install
npm run dev
```

## Deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/Krainium/livestreamhub)

> Streams go live when matches kick off. Quiet times = no active games.
