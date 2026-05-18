FROM node:20-alpine AS builder
WORKDIR /app

RUN apk add --no-cache openssl

COPY package*.json ./
RUN npm ci --include=dev

COPY tsconfig.json ./
COPY prisma ./prisma/
RUN npx prisma generate

COPY src ./src/
RUN npm run build

# ---- Runtime ----
FROM node:20-alpine AS runner
WORKDIR /app

RUN apk add --no-cache wget openssl

COPY package*.json ./
RUN npm ci --only=production

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY prisma ./prisma/

EXPOSE 4000

# Push schema to DB (creates tables if not exist), then start
CMD ["sh", "-c", "npx prisma db push --accept-data-loss && node dist/index.js"]
