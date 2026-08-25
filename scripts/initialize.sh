#!/bin/sh
set -eu

node scripts/initialize-storage.mjs
pnpm prisma migrate deploy
pnpm exec tsx prisma/seed.ts
sh scripts/lock-runtime-db-user.sh
