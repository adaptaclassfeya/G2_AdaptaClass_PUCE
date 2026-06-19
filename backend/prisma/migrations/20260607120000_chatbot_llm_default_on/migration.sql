-- Flip the default of chatbot_llm_enabled from FALSE to TRUE.
--
-- Context: the chatbot's value with the new context-aware builder
-- (paralelo, teacher name, materials, current game, accuracy, top
-- missions) depends on questions reaching the LLM fallback. The old
-- default (false) made every non-deterministic question hit the
-- canned reply, leaving Adapti useless for anything beyond the
-- ~18 hardcoded intents.
--
-- We also backfill existing rows so paralelos created before this
-- migration get the new default. Teachers who explicitly want to
-- pause the API (cost concerns, etc.) can still flip it off from the
-- paralelo settings.

ALTER TABLE "paralelos"
  ALTER COLUMN "chatbot_llm_enabled" SET DEFAULT true;

UPDATE "paralelos"
SET "chatbot_llm_enabled" = true
WHERE "chatbot_llm_enabled" = false;
