# syntax = docker/dockerfile:1

# Adjust NODE_VERSION as desired
ARG NODE_VERSION=24.15.0
FROM node:${NODE_VERSION}-slim AS base

LABEL fly_launch_runtime="Node.js"

# Node.js app lives here
WORKDIR /app

# Set production environment
ENV NODE_ENV="production"


# Throw-away build stage to reduce size of final image
FROM base AS build

# Install packages needed to build node modules
RUN apt-get update -qq && \
    apt-get install --no-install-recommends -y build-essential node-gyp pkg-config python-is-python3

# Set up pnpm using corepack, read version from package.json
COPY package.json ./
RUN corepack enable

# Copy files
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json .
COPY packages/client ./packages/client

# Create deployable build
RUN pnpm deploy --filter @responsive.ch/mite-client-app --prod build

# Final stage for app image
FROM base

# Install packages needed for deployment
RUN apt-get update -qq && \
    apt-get install --no-install-recommends -y chromium fonts-freefont-ttf && \
    rm -rf /var/lib/apt/lists /var/cache/apt/archives

# Copy built application
COPY --from=build /app/build /app

# Start the server by default, this can be overwritten at runtime
EXPOSE 3000
ENV PUPPETEER_EXECUTABLE_PATH="/usr/bin/chromium"
CMD [ "npm", "start" ]
