# ─── Stage 1: Build ──────────────────────────────────────────────────────────
FROM node:20-slim AS builder

# openssl necesario para Prisma; bcrypt solo necesita python3/make/g++
RUN apt-get update && apt-get install -y \
    python3 make g++ openssl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/

RUN npm ci

# Generar Prisma Client (MySQL)
RUN npx prisma generate

COPY . .

RUN npm run build

# ─── Stage 2: Production ─────────────────────────────────────────────────────
FROM node:20-slim AS production

RUN apt-get update && apt-get install -y openssl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/

RUN npm ci --only=production && npx prisma generate

COPY --from=builder /app/dist ./dist

EXPOSE 3000

# DATABASE_URL se inyecta como variable de entorno en Coolify
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main"]
