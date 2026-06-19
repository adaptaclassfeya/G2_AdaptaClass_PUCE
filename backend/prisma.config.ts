import * as dotenv from 'dotenv';
import path from 'path';

// Lee el .env desde la raíz del repo (un nivel arriba de backend/).
// En producción (Vercel) las vars vienen del dashboard, no de este archivo.
dotenv.config({ path: path.resolve(__dirname, '../.env') });

export default {
  // Prisma 7 reads connection URLs from this config (not from `schema.prisma`).
  // Use DIRECT_URL for Migrate so DDL doesn't go through the PgBouncer pool.
  datasource: {
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL,
  },
  migrations: {
    seed: 'ts-node ./prisma/seed.ts',
  },
};