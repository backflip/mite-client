# Mite Client

Custom UI for [mite](https://mite.de) to simplify my transition from the [soon-to-be-enshittified](https://www.reddit.com/r/HarvestApp/comments/1q25xpy/purchase_by_bending_spoons/) [harvest](https://www.getharvest.com).

![Screenshot showing overview page](./docs/screenshot.png)

Features:

- Minimal time tracking UI.
- [Server-sent event](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events) endpoint for current timer.
- One-click PDF invoice generation using [Puppeteer](https://pptr.dev).

The goal is to use it for a minimal [Tauri](https://tauri.app) menubar app because [mite.nano](https://mite.de/blog/2021/10/13/mite-nano-app-macos/) is missing the possibility to add notes.

## Setup

### Prod

```sh
MITE_API_KEY=key MITE_ACCOUNT_NAME=name BASIC_AUTH=user:pass npm start
```

### Dev

```sh
cp .env.template .env
npm ci
npx puppeteer browsers install chrome
npm run dev
```

### Deployment

```sh
fly deploy
```

`Dockerfile` is auto-generated via `npx @flydotio/dockerfile@latest`.

## Notes

- Expects Mite service names to use the following pattern: `Customer Name :: Project Name :: Service Name`
