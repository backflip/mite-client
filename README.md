# Mite Client

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

- Requires service names to use the following pattern: `Customer Name :: Project Name :: Service Name`
