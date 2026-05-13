# Mite Client

## Setup

### Prod

```sh
MITE_API_KEY=123 MITE_ACCOUNT_NAME=456 npm start
```

### Dev

```sh
cp .env.template .env
npm ci
npm run dev
```

## Notes

- Requires service names to use the following pattern: `Customer Name :: Project Name :: Service Name`
