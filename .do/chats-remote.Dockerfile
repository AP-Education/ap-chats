# syntax=docker/dockerfile:1
# Chats as a remote for the AP App university shell (uni.ap-platform.online), which serves it
# under /remotes/chats/ next to itself; the shell proxies its API and socket to production.
FROM node:24-alpine AS build
ENV CI=true
RUN corepack enable
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY patches ./patches
COPY web/package.json ./web/
COPY mobile/package.json ./mobile/
# A GitHub token with read:packages for the @ap-education packages; it stays in this stage.
ARG NODE_AUTH_TOKEN
RUN echo "//npm.pkg.github.com/:_authToken=${NODE_AUTH_TOKEN}" > /root/.npmrc \
    && pnpm install --frozen-lockfile --filter @ap-chats/web \
    && rm /root/.npmrc

ARG VITE_IMAGES_URL
ARG VITE_KLIPY_API_KEY
ENV VITE_IMAGES_URL=${VITE_IMAGES_URL} \
    VITE_KLIPY_API_KEY=${VITE_KLIPY_API_KEY}
COPY web ./web
RUN pnpm --filter @ap-chats/web build --base=/remotes/chats/

FROM scratch
COPY --from=build /app/web/dist /srv/chats
