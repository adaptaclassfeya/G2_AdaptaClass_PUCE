# ─── Stage 1: Build ──────────────────────────────────────────────────────────
FROM node:20-slim AS builder

# Dependencias necesarias para compilar bcrypt y Prisma engines
RUN apt-get update && apt-get install -y \
    python3 make g++ openssl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/

# Instalar todas las dependencias (incluyendo devDependencies para el build)
RUN npm ci

# Generar Prisma Client
RUN npx prisma generate

COPY . .

# Compilar NestJS → dist/
RUN npm run build

# ─── Stage 2: Production ─────────────────────────────────────────────────────
FROM node:20-slim AS production

RUN apt-get update && apt-get install -y openssl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/

# Solo dependencias de producción
RUN npm ci --only=production

# Generar Prisma Client en la imagen de producción
RUN npx prisma generate

# Copiar el build compilado
COPY --from=builder /app/dist ./dist

EXPOSE 3000

# Correr migraciones y luego arrancar el servidor
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main"]
