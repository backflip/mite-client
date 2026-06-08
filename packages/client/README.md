# Client application

## Setup

### Prod

```sh
MITE_API_KEY=key MITE_ACCOUNT_NAME=name BASIC_AUTH=user:pass pnpm start
```

### Dev

```sh
cp .env.template .env
pnpm ci
pnpx puppeteer browsers install chrome
pnpm run dev
```

### Deployment

```sh
fly deploy
```

`Dockerfile` has been auto-generated via `npx @flydotio/dockerfile@latest` and extended for the pnpm workspace.
