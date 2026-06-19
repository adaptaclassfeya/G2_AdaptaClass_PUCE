-- Per-paralelo chatbot configuration. See CLAUDE.md "Chatbot" and the chat
-- module for how each flag is consumed.
--
-- chatbot_enabled            master switch — frontend hides the FAB when false.
-- chatbot_llm_enabled        opt-in LLM fallback for free-form questions.
-- chatbot_persona_name       optional override of the assistant name.
-- chatbot_extra_suggestions  up to 5 extra quick-reply chips (validated in DTO).

ALTER TABLE "paralelos"
  ADD COLUMN "chatbot_enabled"           BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "chatbot_llm_enabled"       BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "chatbot_persona_name"      TEXT,
  ADD COLUMN "chatbot_extra_suggestions" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
