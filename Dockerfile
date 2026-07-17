# ---- Build stage ----
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies first (better layer caching -- only reinstalls
# when package.json/package-lock.json actually change)
COPY package*.json ./
RUN npm ci

# Copy the rest of the source and build
COPY . .
RUN npm run build

# ---- Production stage ----
FROM node:20-alpine AS production

WORKDIR /app

ENV NODE_ENV=production

# Only install production dependencies, not devDependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Copy compiled output and anything the app needs at runtime
COPY --from=builder /app/dist ./dist

# Migrations run separately (see README), but the compiled migration
# files and data-source config need to be available inside the
# container if you ever run `npm run migration:run` against it directly
COPY --from=builder /app/src/data-source.ts ./src/data-source.ts
COPY --from=builder /app/src/migrations ./src/migrations
COPY --from=builder /app/src/modules ./src/modules
COPY tsconfig.json ./

EXPOSE 3004

CMD ["node", "dist/main.js"]