-- Migration: adapta_g_and_dashboard_schema
--
-- These changes were introduced in the Adapta-G / Dashboard branch
-- but the migration files were never created. This file backfills them.
--
-- Changes applied:
-- 1. Add ADMIN to the Role enum.
-- 2. Convert games.tema, question_sources.tema, questions.tema
--    from the Tema enum to plain TEXT, then drop the Tema enum.
-- 3. Add nullable paralelo_id FK column to question_sources.
-- 4. Add nullable paralelo_id FK column to questions.

-- ── 1. Role: add ADMIN value ─────────────────────────────────────────────────
-- IF NOT EXISTS prevents errors if the value was already added manually.
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'ADMIN';

-- ── 2. Convert Tema enum columns to TEXT ─────────────────────────────────────
-- Cast the enum label to its text representation first, then change the type.

ALTER TABLE "games"
  ALTER COLUMN "tema" TYPE TEXT USING "tema"::TEXT;

ALTER TABLE "question_sources"
  ALTER COLUMN "tema" TYPE TEXT USING "tema"::TEXT;

ALTER TABLE "question_sources"
  ALTER COLUMN "tema" SET DEFAULT 'General';

ALTER TABLE "questions"
  ALTER COLUMN "tema" TYPE TEXT USING "tema"::TEXT;

ALTER TABLE "questions"
  ALTER COLUMN "tema" SET DEFAULT 'General';

-- ── 3. Drop Tema enum (no column references it anymore) ─────────────────────
DROP TYPE IF EXISTS "Tema";

-- ── 4. Add paralelo_id to question_sources ───────────────────────────────────
ALTER TABLE "question_sources"
  ADD COLUMN "paralelo_id" TEXT;

ALTER TABLE "question_sources"
  ADD CONSTRAINT "question_sources_paralelo_id_fkey"
  FOREIGN KEY ("paralelo_id") REFERENCES "paralelos"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- ── 5. Add paralelo_id to questions ──────────────────────────────────────────
ALTER TABLE "questions"
  ADD COLUMN "paralelo_id" TEXT;

ALTER TABLE "questions"
  ADD CONSTRAINT "questions_paralelo_id_fkey"
  FOREIGN KEY ("paralelo_id") REFERENCES "paralelos"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
