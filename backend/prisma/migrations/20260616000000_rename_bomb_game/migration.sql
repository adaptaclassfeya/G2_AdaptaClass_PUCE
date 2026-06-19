-- Renames the legacy "Quiz Rapido - Lectura" game to "Bomb-Man".
-- The seed.ts already uses the new name for fresh installs; this
-- migration keeps existing Supabase rows in sync.
UPDATE "games"
SET "titulo" = 'Bomb-Man'
WHERE "titulo" = 'Quiz Rapido - Lectura'
   OR "titulo" = 'Quiz Rápido - Lectura';
