# Coolify / container deploy for the cloud SKU (not the desktop static export).
# Build context: repo root. Listens on 3000.

FROM node:24-alpine AS build
# `zip`: prebuild (scripts/pack-till-print-bridge-downloads.mjs) shells out to it.
RUN apk add --no-cache zip libc6-compat
# Not /app: the repo has an `app/app/` route, and building under /app makes
# webpack compile `/` from app/app/page.tsx (root URL 404s).
WORKDIR /srv/kiosk

COPY package.json package-lock.json ./
# Mirrors vercel.json installCommand so dependency resolution matches Vercel.
RUN npm ci || npm install

COPY . .

# NEXT_PUBLIC_* and BACKEND_ORIGIN are inlined into the bundle / rewrites at build.
ARG SOURCE_COMMIT
ARG BACKEND_ORIGIN
ARG NEXT_PUBLIC_API_BASE_URL
ARG NEXT_PUBLIC_APP_BASE_URL
ARG NEXT_PUBLIC_REALTIME_WS_ORIGIN
ARG NEXT_PUBLIC_STOREFRONT_SLUG
ARG NEXT_PUBLIC_STOREFRONT_WHATSAPP
ARG NEXT_PUBLIC_TENANT_ID
# next.config.ts and /api/client-version read GITHUB_SHA when VERCEL_* is absent;
# without it every build is "dev" and tills never detect a new deploy.
ENV GITHUB_SHA=$SOURCE_COMMIT \
    NEXT_TELEMETRY_DISABLED=1 \
    NODE_OPTIONS=--max-old-space-size=3072

RUN npm run build

FROM node:24-alpine AS run
RUN apk add --no-cache libc6-compat
WORKDIR /srv/kiosk
ARG SOURCE_COMMIT
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    GITHUB_SHA=$SOURCE_COMMIT

COPY --from=build /srv/kiosk/package.json ./
COPY --from=build /srv/kiosk/node_modules ./node_modules
COPY --from=build /srv/kiosk/next.config.ts ./
COPY --from=build /srv/kiosk/public ./public
COPY --from=build /srv/kiosk/.next ./.next

EXPOSE 3000
CMD ["node_modules/.bin/next", "start", "-p", "3000"]
