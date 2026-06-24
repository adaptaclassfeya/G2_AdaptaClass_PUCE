import { defineConfig } from 'prisma/config';
import * as dotenv from 'dotenv';
import path from 'path';

// En desarrollo lee el .env local. En producción (Coolify) las vars vienen del entorno.
dotenv.config({ path: path.resolve(__dirname, '../.env') });

export default defineConfig({
  // Prisma 7: la URL de conexión va aquí, no en schema.prisma
  // El motor Rust de Prisma maneja MySQL nativamente con esta URL.
  datasource: {
    url: process.env.DATABASE_URL,
  },
});
