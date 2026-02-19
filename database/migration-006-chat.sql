-- Migration 006: Chat Bot Integration (Telegram / WhatsApp / Slack)
-- Creates tables for chat user linking and conversation sessions.

-- Platform enum
CREATE TYPE chat_platform AS ENUM ('telegram', 'whatsapp', 'slack');

-- Link state machine: pending_email -> pending_otp -> linked
CREATE TYPE chat_link_state AS ENUM ('pending_email', 'pending_otp', 'linked');

-- ── chat_user_links ─────────────────────────────────────────
-- Maps a platform chat user to a JIG client account.
-- One link per user per platform.

CREATE TABLE IF NOT EXISTS chat_user_links (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform        chat_platform NOT NULL,
  platform_user_id VARCHAR(100) NOT NULL,
  platform_username VARCHAR(100),
  platform_display_name VARCHAR(255),
  link_state      chat_link_state NOT NULL DEFAULT 'pending_email',
  pending_email   VARCHAR(255),
  client_id       UUID REFERENCES clients(id) ON DELETE SET NULL,
  message_count   INTEGER NOT NULL DEFAULT 0,
  last_message_at TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(platform, platform_user_id)
);

-- ── chat_sessions ───────────────────────────────────────────
-- Rolling conversation context per user.
-- Stores recent message history and pending multi-step action state.

CREATE TABLE IF NOT EXISTS chat_sessions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  link_id         UUID NOT NULL REFERENCES chat_user_links(id) ON DELETE CASCADE,
  messages        JSONB NOT NULL DEFAULT '[]',
  pending_action  JSONB,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(link_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_chat_links_platform ON chat_user_links(platform, platform_user_id);
CREATE INDEX IF NOT EXISTS idx_chat_links_client ON chat_user_links(client_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_link ON chat_sessions(link_id);
