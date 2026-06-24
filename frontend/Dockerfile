# ─── Stage 1: Build ──────────────────────────────────────────────────────────
FROM node:20-slim AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# VITE_API_URL se inyecta en tiempo de build → debe apuntar al subdominio
# real del backend que configure Alejandro en Coolify.
# Ejemplo: https://api.adaptaclass.tudominio.com/api
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

RUN npm run build

# ─── Stage 2: Serve with nginx ───────────────────────────────────────────────
FROM nginx:stable-alpine AS production

# Copiar los estáticos generados por Vite
COPY --from=builder /app/dist /usr/share/nginx/html

# Copiar configuración de nginx (SPA routing)
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
