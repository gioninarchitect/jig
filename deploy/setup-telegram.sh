#!/bin/bash
# ═══════════════════════════════════════════════════════════════
# PureGro Telegram Bot - Setup & Verification Script
#
# Usage:  bash deploy/setup-telegram.sh [step]
#
# Steps:
#   all      — Full setup (migration + token + webhook + test)
#   check    — Check current status (no changes)
#   migrate  — Apply chat DB migration (create tables)
#   token    — Set bot token in production .env
#   webhook  — Register webhook with Telegram API
#   test     — Send a test message to verify bot works
#   reset    — Unlink all chat users (fresh start)
#   logs     — Show recent chat-related logs
#
# Prerequisites:
#   - SSH access to production server
#   - Telegram bot token from @BotFather
#
# ═══════════════════════════════════════════════════════════════

set -euo pipefail

# ── Config ─────────────────────────────────────────────────────
SERVER="154.66.197.199"
SERVER_USER="root"
DOMAIN="puregro.cleva-ai.co.za"
REMOTE_B2B="/var/www/puregro/b2b"
WEBHOOK_URL="https://$DOMAIN/api/v1/chat/webhook/telegram"

# Bot credentials (from @BotFather)
BOT_TOKEN="8500017565:AAGYFkAzUBIfHF7SxEh8DtI-K1WwJ1zDdYc"
WEBHOOK_SECRET="puregro_webhook_secret_2026"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

log()  { echo -e "${GREEN}[OK]${NC} $1"; }
warn() { echo -e "${YELLOW}[!!]${NC} $1"; }
err()  { echo -e "${RED}[ERR]${NC} $1"; }
step() { echo -e "\n${CYAN}--- $1 ---${NC}"; }

# ── Step: Check Current Status ─────────────────────────────────
do_check() {
    step "Checking Telegram bot status"

    echo -e "${BOLD}1. Bot Token in .env${NC}"
    TOKEN_SET=$(ssh "$SERVER_USER@$SERVER" "grep -c '^TELEGRAM_BOT_TOKEN=.\+' $REMOTE_B2B/.env 2>/dev/null || echo 0")
    if [ "$TOKEN_SET" -gt 0 ]; then
        log "TELEGRAM_BOT_TOKEN is set"
    else
        err "TELEGRAM_BOT_TOKEN is NOT set"
    fi

    echo -e "\n${BOLD}2. Chat Database Tables${NC}"
    TABLES=$(ssh "$SERVER_USER@$SERVER" "sudo -u postgres psql -U puregro -d puregro -tc \"SELECT count(*) FROM information_schema.tables WHERE table_name IN ('chat_user_links','chat_sessions');\" 2>/dev/null || echo 0")
    TABLES=$(echo "$TABLES" | tr -d ' ')
    if [ "$TABLES" = "2" ]; then
        log "chat_user_links + chat_sessions tables exist"
    else
        err "Chat tables missing ($TABLES/2 found). Run: bash deploy/setup-telegram.sh migrate"
    fi

    echo -e "\n${BOLD}3. Telegram Webhook${NC}"
    WEBHOOK_INFO=$(curl -sf "https://api.telegram.org/bot${BOT_TOKEN}/getWebhookInfo" 2>/dev/null || echo '{"ok":false}')
    WEBHOOK_CURRENT=$(echo "$WEBHOOK_INFO" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('result',{}).get('url','NONE'))" 2>/dev/null || echo "NONE")
    PENDING=$(echo "$WEBHOOK_INFO" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('result',{}).get('pending_update_count',0))" 2>/dev/null || echo "?")
    LAST_ERR=$(echo "$WEBHOOK_INFO" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('result',{}).get('last_error_message','none'))" 2>/dev/null || echo "?")

    if [ "$WEBHOOK_CURRENT" = "$WEBHOOK_URL" ]; then
        log "Webhook registered: $WEBHOOK_CURRENT"
    elif [ "$WEBHOOK_CURRENT" = "NONE" ] || [ "$WEBHOOK_CURRENT" = "" ]; then
        err "No webhook registered. Run: bash deploy/setup-telegram.sh webhook"
    else
        warn "Webhook points to wrong URL: $WEBHOOK_CURRENT"
        warn "Expected: $WEBHOOK_URL"
    fi
    echo "    Pending updates: $PENDING"
    echo "    Last error: $LAST_ERR"

    echo -e "\n${BOLD}4. Bot Identity${NC}"
    BOT_INFO=$(curl -sf "https://api.telegram.org/bot${BOT_TOKEN}/getMe" 2>/dev/null || echo '{"ok":false}')
    BOT_OK=$(echo "$BOT_INFO" | python3 -c "import json,sys; print(json.load(sys.stdin).get('ok',False))" 2>/dev/null || echo "False")
    if [ "$BOT_OK" = "True" ]; then
        BOT_USER=$(echo "$BOT_INFO" | python3 -c "import json,sys; r=json.load(sys.stdin)['result']; print(f\"@{r.get('username','?')} ({r.get('first_name','?')})\")" 2>/dev/null)
        log "Bot active: $BOT_USER"
    else
        err "Bot token invalid or bot not responding"
    fi

    echo -e "\n${BOLD}5. B2B Process Running${NC}"
    B2B_STATUS=$(ssh "$SERVER_USER@$SERVER" "pm2 jlist 2>/dev/null | python3 -c \"import json,sys; ps=json.load(sys.stdin); b=[p for p in ps if p['name']=='puregro-b2b']; print(b[0]['pm2_env']['status'] if b else 'NOT FOUND')\" 2>/dev/null || echo 'ERROR'")
    if [ "$B2B_STATUS" = "online" ]; then
        log "puregro-b2b is online"
    else
        err "puregro-b2b status: $B2B_STATUS"
    fi

    echo -e "\n${BOLD}6. Linked Chat Users${NC}"
    LINKED=$(ssh "$SERVER_USER@$SERVER" "sudo -u postgres psql -U puregro -d puregro -tc \"SELECT count(*) FROM chat_user_links WHERE link_state='linked';\" 2>/dev/null || echo '?'")
    TOTAL=$(ssh "$SERVER_USER@$SERVER" "sudo -u postgres psql -U puregro -d puregro -tc \"SELECT count(*) FROM chat_user_links;\" 2>/dev/null || echo '?'")
    echo "    Total links: $(echo $TOTAL | tr -d ' ')"
    echo "    Fully linked: $(echo $LINKED | tr -d ' ')"

    echo -e "\n${BOLD}7. Webhook Endpoint Reachable${NC}"
    HTTP_CODE=$(curl -sf -o /dev/null -w "%{http_code}" -X POST "https://$DOMAIN/api/v1/chat/webhook/telegram" -H "Content-Type: application/json" -d '{}' 2>/dev/null || echo "000")
    if [ "$HTTP_CODE" = "200" ]; then
        log "POST $WEBHOOK_URL -> 200 OK"
    elif [ "$HTTP_CODE" = "403" ]; then
        log "POST $WEBHOOK_URL -> 403 (webhook secret required - correct behavior)"
    else
        err "POST $WEBHOOK_URL -> $HTTP_CODE"
    fi

    echo ""
}

# ── Step: Apply Chat Migration ─────────────────────────────────
do_migrate() {
    step "Applying chat database migration"

    # Check if tables already exist
    EXISTS=$(ssh "$SERVER_USER@$SERVER" "sudo -u postgres psql -U puregro -d puregro -tc \"SELECT count(*) FROM information_schema.tables WHERE table_name='chat_user_links';\" 2>/dev/null || echo 0")
    EXISTS=$(echo "$EXISTS" | tr -d ' ')

    if [ "$EXISTS" = "1" ]; then
        log "chat_user_links already exists, skipping migration"
        return
    fi

    echo "Creating chat_user_links and chat_sessions tables..."

    ssh "$SERVER_USER@$SERVER" bash <<'REMOTE_MIGRATE'
set -euo pipefail

sudo -u postgres psql -U puregro -d puregro <<'SQL'
-- Platform enum (skip if exists)
DO $$ BEGIN
    CREATE TYPE chat_platform AS ENUM ('telegram', 'whatsapp', 'slack');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Link state enum (skip if exists)
DO $$ BEGIN
    CREATE TYPE chat_link_state AS ENUM ('pending_email', 'pending_otp', 'linked');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- chat_user_links
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

-- chat_sessions
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
SQL

echo "Chat tables created successfully!"
REMOTE_MIGRATE

    log "Chat migration applied"
}

# ── Step: Set Bot Token ────────────────────────────────────────
do_token() {
    step "Setting Telegram bot token"

    ssh "$SERVER_USER@$SERVER" bash -s -- "$BOT_TOKEN" "$WEBHOOK_SECRET" <<'REMOTE_TOKEN'
set -euo pipefail
TOKEN="$1"
SECRET="$2"
ENV_FILE="/var/www/puregro/b2b/.env"

# Remove existing lines
sed -i '/^TELEGRAM_BOT_TOKEN=/d' "$ENV_FILE"
sed -i '/^TELEGRAM_WEBHOOK_SECRET=/d' "$ENV_FILE"

# Append fresh
echo "TELEGRAM_BOT_TOKEN=$TOKEN" >> "$ENV_FILE"
echo "TELEGRAM_WEBHOOK_SECRET=$SECRET" >> "$ENV_FILE"

echo "Token and webhook secret written to .env"

# Restart B2B to pick up new env
pm2 restart puregro-b2b
sleep 3

# Verify it's running
STATUS=$(pm2 jlist | python3 -c "import json,sys; ps=json.load(sys.stdin); b=[p for p in ps if p['name']=='puregro-b2b']; print(b[0]['pm2_env']['status'] if b else 'NOT FOUND')" 2>/dev/null)
echo "puregro-b2b status: $STATUS"
REMOTE_TOKEN

    log "Bot token set and B2B restarted"
}

# ── Step: Register Webhook ─────────────────────────────────────
do_webhook() {
    step "Registering webhook with Telegram"

    echo "Setting webhook to: $WEBHOOK_URL"

    RESULT=$(curl -sf -X POST \
        "https://api.telegram.org/bot${BOT_TOKEN}/setWebhook" \
        -H "Content-Type: application/json" \
        -d "{\"url\":\"$WEBHOOK_URL\",\"secret_token\":\"$WEBHOOK_SECRET\",\"allowed_updates\":[\"message\",\"callback_query\"]}" \
        2>/dev/null || echo '{"ok":false,"description":"curl failed"}')

    OK=$(echo "$RESULT" | python3 -c "import json,sys; print(json.load(sys.stdin).get('ok',False))" 2>/dev/null)
    DESC=$(echo "$RESULT" | python3 -c "import json,sys; print(json.load(sys.stdin).get('description','unknown'))" 2>/dev/null)

    if [ "$OK" = "True" ]; then
        log "Webhook registered: $DESC"
    else
        err "Webhook registration failed: $DESC"
        echo "    Full response: $RESULT"
    fi

    # Verify
    echo ""
    echo "Verifying webhook..."
    INFO=$(curl -sf "https://api.telegram.org/bot${BOT_TOKEN}/getWebhookInfo" 2>/dev/null)
    echo "$INFO" | python3 -m json.tool 2>/dev/null || echo "$INFO"
}

# ── Step: Test Bot ─────────────────────────────────────────────
do_test() {
    step "Testing bot end-to-end"

    echo -e "${BOLD}Bot Identity:${NC}"
    BOT_INFO=$(curl -sf "https://api.telegram.org/bot${BOT_TOKEN}/getMe" 2>/dev/null)
    echo "$BOT_INFO" | python3 -c "
import json, sys
d = json.load(sys.stdin)
if d.get('ok'):
    r = d['result']
    print(f\"  Name: {r.get('first_name','?')}\")
    print(f\"  Username: @{r.get('username','?')}\")
    print(f\"  Bot ID: {r.get('id','?')}\")
else:
    print('  ERROR: Bot not responding')
" 2>/dev/null

    echo -e "\n${BOLD}Webhook Status:${NC}"
    curl -sf "https://api.telegram.org/bot${BOT_TOKEN}/getWebhookInfo" 2>/dev/null | python3 -c "
import json, sys
d = json.load(sys.stdin)
if d.get('ok'):
    r = d['result']
    print(f\"  URL: {r.get('url','NOT SET')}\")
    print(f\"  Pending: {r.get('pending_update_count',0)}\")
    err = r.get('last_error_message')
    if err:
        print(f\"  Last Error: {err}\")
        ts = r.get('last_error_date',0)
        if ts:
            from datetime import datetime
            print(f\"  Error Time: {datetime.fromtimestamp(ts)}\")
    else:
        print(f\"  Errors: None\")
" 2>/dev/null

    echo -e "\n${BOLD}Webhook Endpoint:${NC}"
    HTTP_CODE=$(curl -sf -o /dev/null -w "%{http_code}" -X POST "$WEBHOOK_URL" \
        -H "Content-Type: application/json" \
        -H "X-Telegram-Bot-Api-Secret-Token: $WEBHOOK_SECRET" \
        -d '{"message":{"message_id":1,"from":{"id":1,"is_bot":false,"first_name":"Test"},"chat":{"id":1,"type":"private"},"date":1,"text":"/ping"}}' \
        2>/dev/null || echo "000")
    if [ "$HTTP_CODE" = "200" ]; then
        log "Webhook accepted test payload (HTTP $HTTP_CODE)"
    else
        err "Webhook rejected test payload (HTTP $HTTP_CODE)"
    fi

    echo -e "\n${BOLD}Database:${NC}"
    ssh "$SERVER_USER@$SERVER" bash <<'REMOTE_DB_CHECK'
sudo -u postgres psql -U puregro -d puregro -c "
SELECT
    (SELECT count(*) FROM chat_user_links) AS total_links,
    (SELECT count(*) FROM chat_user_links WHERE link_state = 'linked') AS linked,
    (SELECT count(*) FROM chat_user_links WHERE link_state = 'pending_email') AS pending_email,
    (SELECT count(*) FROM chat_sessions) AS sessions;
" 2>/dev/null || echo "  ERROR: Chat tables may not exist. Run: bash deploy/setup-telegram.sh migrate"
REMOTE_DB_CHECK

    echo -e "\n${BOLD}B2B Logs (last 10 chat entries):${NC}"
    ssh "$SERVER_USER@$SERVER" "pm2 logs puregro-b2b --lines 100 --nostream 2>&1 | grep -i 'chat\|telegram\|webhook\|bot' | tail -10" 2>/dev/null || echo "  No chat log entries found"

    echo -e "\n${GREEN}=== Test Complete ===${NC}"
    echo ""
    echo "To test the registration flow manually:"
    echo "  1. Open Telegram"
    BOT_USER=$(curl -sf "https://api.telegram.org/bot${BOT_TOKEN}/getMe" 2>/dev/null | python3 -c "import json,sys; print(json.load(sys.stdin).get('result',{}).get('username','UNKNOWN'))" 2>/dev/null || echo "UNKNOWN")
    echo "  2. Search for @$BOT_USER"
    echo "  3. Send /start"
    echo "  4. Tap 'New Client'"
    echo "  5. Follow the registration prompts"
    echo ""
}

# ── Step: Show Logs ────────────────────────────────────────────
do_logs() {
    step "Recent chat/Telegram logs"
    ssh "$SERVER_USER@$SERVER" "pm2 logs puregro-b2b --lines 200 --nostream 2>&1 | grep -i 'chat\|telegram\|webhook\|registration\|OTP\|link' | tail -50"
}

# ── Step: Reset (unlink all users) ────────────────────────────
do_reset() {
    step "Resetting all chat links (CAUTION)"

    echo -e "${YELLOW}This will unlink ALL chat users. They'll need to /start again.${NC}"
    read -p "Are you sure? (yes/no): " CONFIRM
    if [ "$CONFIRM" != "yes" ]; then
        echo "Cancelled."
        return
    fi

    ssh "$SERVER_USER@$SERVER" bash <<'REMOTE_RESET'
sudo -u postgres psql -U puregro -d puregro <<SQL
DELETE FROM chat_sessions;
DELETE FROM chat_user_links;
SQL
echo "All chat links and sessions cleared."
REMOTE_RESET

    log "Chat reset complete"
}

# ── Main ───────────────────────────────────────────────────────
STEP="${1:-all}"

echo -e "${CYAN}"
echo "  ================================================"
echo "  PureGro Telegram Bot Setup"
echo "  Server: $SERVER"
echo "  Webhook: $WEBHOOK_URL"
echo "  ================================================"
echo -e "${NC}"

case "$STEP" in
    all)
        do_migrate
        do_token
        do_webhook
        echo ""
        sleep 2
        do_test
        ;;
    check)    do_check ;;
    migrate)  do_migrate ;;
    token)    do_token ;;
    webhook)  do_webhook ;;
    test)     do_test ;;
    logs)     do_logs ;;
    reset)    do_reset ;;
    *)
        echo "Usage: $0 {all|check|migrate|token|webhook|test|logs|reset}"
        echo ""
        echo "Steps:"
        echo "  all      Full setup (migration + token + webhook + test)"
        echo "  check    Check current status without making changes"
        echo "  migrate  Apply chat DB tables to PostgreSQL"
        echo "  token    Set bot token in production .env"
        echo "  webhook  Register webhook URL with Telegram API"
        echo "  test     Verify bot is working end-to-end"
        echo "  logs     Show recent chat-related server logs"
        echo "  reset    Clear all chat links (users must /start again)"
        exit 1
        ;;
esac

echo -e "\n${GREEN}Done!${NC}"
