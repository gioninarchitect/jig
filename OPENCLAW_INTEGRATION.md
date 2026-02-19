# OpenClaw Integration -- AI Chat Assistant for SlipScan

## Overview

OpenClaw is a hosted AI chat assistant that allows SlipScan users to manage expenses via messaging platforms (Telegram, WhatsApp, Slack). One central bot serves all tenants. Users authenticate via deep link + email + PIN verification.

## Architecture

```
                                    +------------------+
   Telegram ----webhook----->       |                  |
   WhatsApp ----webhook----->  +--->| Chat Webhooks    |  (public, before tenant resolver)
   Slack    ----webhook----->  |    | /api/v1/chat/    |
                               |    | webhook/{platform}|
                               |    +--------+---------+
                               |             |
                               |    +--------v---------+
                               |    |  Chat Engine      |  (core orchestrator)
                               |    |  processMessage() |
                               |    +--------+---------+
                               |             |
                          +----+----+   +----v----+   +----------+
                          | Platform|   | Intent  |   | Tenant   |
                          | Services|   | Detector|   | DB       |
                          | (TG/WA/ |   | (Claude |   | (claims, |
                          |  Slack) |   |  Haiku) |   |  users)  |
                          +---------+   +---------+   +----------+
                               ^
                               |
                    +----------+----------+
                    |  ChatUserLink       |  (platform DB)
                    |  Maps chat user     |
                    |  -> tenant + user   |
                    +---------------------+
```

### Key Design Decisions

1. **One bot per platform** -- single Telegram bot, single WhatsApp number, single Slack app. Shared across all tenants.
2. **User linking via deep link** -- `t.me/SlipScanBot?start=TENANT_SLUG`. No API keys for business users.
3. **ChatUserLink in platform DB** -- maps platform user to specific tenant + SlipScan user.
4. **Webhook routes before tenant resolver** -- webhooks are public endpoints, tenant is resolved from ChatUserLink.
5. **Claude Haiku for NLP** -- fast intent detection with keyword fallback when API is unavailable.
6. **Direct DB execution** -- chat engine reads/writes tenant DB directly (no HTTP round-trip to own API).
7. **Response-first webhooks** -- return 200 immediately, process async to prevent retries/duplicates.

## Files Created

| File | Type | Purpose |
|------|------|---------|
| `backend/models/platform/ChatUserLink.js` | Platform model | Maps chat platform users to SlipScan tenant users |
| `backend/models/ChatSession.js` | Tenant model | Per-user conversation context, rolling 20-message history |
| `backend/services/chat/telegramService.js` | Service | Telegram Bot API: send, webhook, signature verify |
| `backend/services/chat/whatsappService.js` | Service | WhatsApp Cloud API: send, webhook verify, media download |
| `backend/services/chat/slackService.js` | Service | Slack Events API: send, signature verify |
| `backend/services/chat/intentDetector.js` | Service | Claude Haiku NLP intent classification with keyword fallback |
| `backend/services/chat/chatEngine.js` | Service | Core orchestrator: linking flow, intent routing, DB actions |
| `backend/controllers/chat.controller.js` | Controller | Webhook handlers + admin CRUD endpoints |
| `backend/routes/chat-webhooks.js` | Route | Public webhook routes (before tenant resolver) |
| `backend/routes/chat.js` | Route | Admin routes (after auth) |
| `frontend/ss-admin-chat.js` | Frontend | Admin UI for chat assistant management |

## Files Modified

| File | Change |
|------|--------|
| `backend/models/CompanySettings.js` | Added `chatAssistant` field (enabled, channels, stats) |
| `backend/services/connectionManager.js` | Registered ChatSession schema |
| `backend/services/tenantService.js` | Added `getChatUserLinkModel()` |
| `backend/config/index.js` | Added `chat` config block (Telegram, WhatsApp, Slack credentials) |
| `backend/server.js` | Mounted webhook routes before tenant resolver, added rawBody capture |
| `backend/routes/index.js` | Added `/api/v1/chat` admin route |
| `backend/middleware/rateLimiter.js` | Added `chatWebhookLimiter` (300 req/min) |
| `public/admin.html` | Added Chat Assistant sidebar nav, section, script |
| `public/sw.js` | Bumped cache version to v30, added ss-admin-chat.js |
| `.env.example` | Added chat environment variables |

## Environment Variables

```bash
# Claude API (required for NLP intent detection)
ANTHROPIC_API_KEY=sk-ant-your-key-here

# Telegram (create bot via @BotFather)
TELEGRAM_BOT_TOKEN=1234567890:ABCdefGHIjklMNOpqrSTUVwxyz
TELEGRAM_WEBHOOK_SECRET=random-secret-string

# WhatsApp Cloud API (Meta Business Suite)
WHATSAPP_API_TOKEN=EAAxxxxxxx
WHATSAPP_VERIFY_TOKEN=your-verify-token
WHATSAPP_APP_SECRET=your-app-secret
WHATSAPP_PHONE_NUMBER_ID=1234567890

# Slack (create app at api.slack.com)
SLACK_BOT_TOKEN=xoxb-xxxxxx
SLACK_SIGNING_SECRET=your-signing-secret
```

**Note:** `ANTHROPIC_API_KEY` is required for Claude Haiku NLP intent detection. Without it, the system falls back to keyword matching which handles basic commands but lacks natural language understanding. Get your key at [console.anthropic.com](https://console.anthropic.com/).

All variables are optional. The system gracefully handles unconfigured channels (shows "Not configured" in admin UI).

## User Linking Flow

### Step 1: Deep Link

Admin shares link with team: `t.me/SlipScanBot?start=demo`

When user clicks:
1. Telegram sends `/start demo` to webhook
2. ChatEngine creates ChatUserLink with `linkState: pending_email`
3. Bot responds: "Connected to Demo Corp! Please enter your email:"

### Step 2: Email Verification

User sends their SlipScan email address:
1. ChatEngine looks up email in tenant DB
2. If found: advances to `pending_pin`
3. Bot responds: "Account found for John. Please enter your 6-digit PIN:"

### Step 3: PIN Verification

User sends their PIN:
1. ChatEngine verifies against bcrypt hash
2. If match: sets `linkState: linked`, stores userId, role, etc.
3. Bot responds: "Account linked! Type /help to see commands."

### State Machine

```
pending_tenant -> pending_email -> pending_pin -> linked
                                                    |
                                                    v (unlink)
                                                  deleted
```

## NLP Intent Schema

17 intents detected by Claude Haiku:

| Intent | Description | Example |
|--------|-------------|---------|
| `trip_create` | Create new expense trip | "Create trip Cape Town Visit" |
| `trip_list` | List user's trips | "Show my trips" |
| `trip_view` | View trip details | "View Cape Town trip" |
| `trip_submit` | Submit trip for approval | "Submit my trip" |
| `item_add` | Add expense item | "Add R450 fuel from Engen" |
| `receipt_scan` | Scan receipt photo | (photo attachment) |
| `spending_summary` | Spending stats | "How much did I spend this month?" |
| `approval_pending` | View pending approvals | "Any pending approvals?" |
| `approval_verify` | Verify/approve trip | "Approve Cape Town trip" |
| `approval_reject` | Reject trip | "Reject trip: missing receipts" |
| `status_check` | Check trip status | "Status of my trip" |
| `help` | Show commands | "/help" |
| `greeting` | Say hello | "Hi" |
| `unlink` | Disconnect account | "/unlink" |
| `cancel` | Cancel current action | "/cancel" |
| `unknown` | Cannot determine | (fallback) |

### Extending Intents

To add a new intent:
1. Add to the SYSTEM_PROMPT in `intentDetector.js`
2. Add a case in the `switch` statement in `chatEngine.js` `handleLinkedMessage()`
3. Implement the handler function
4. Add to `keywordFallback()` for when Claude API is unavailable

## Platform-by-Platform Setup

### Telegram (Fastest, Recommended for Testing)

1. Open Telegram, search for `@BotFather`
2. Send `/newbot`, follow prompts to name your bot
3. Copy the bot token (format: `1234567890:ABCdef...`)
4. Set in `.env`: `TELEGRAM_BOT_TOKEN=<token>`
5. Optionally set `TELEGRAM_WEBHOOK_SECRET` to a random string
6. Register webhook:
   - Via admin dashboard: Chat Assistant > Setup Webhook
   - Or manually: `curl https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://yourdomain.com/api/v1/chat/webhook/telegram`
7. For local dev, use ngrok: `ngrok http 3005`

### WhatsApp (Requires Meta Business Account)

1. Go to [Meta Business Suite](https://business.facebook.com/)
2. Create a WhatsApp Business app
3. Get a permanent access token
4. Set in `.env`:
   - `WHATSAPP_API_TOKEN=<token>`
   - `WHATSAPP_VERIFY_TOKEN=<your-chosen-string>`
   - `WHATSAPP_APP_SECRET=<from app settings>`
   - `WHATSAPP_PHONE_NUMBER_ID=<from WhatsApp settings>`
5. Configure webhook URL: `https://yourdomain.com/api/v1/chat/webhook/whatsapp`
6. Subscribe to `messages` webhook field

### Slack (Requires Slack App)

1. Go to [api.slack.com/apps](https://api.slack.com/apps) > Create New App
2. Add Bot Token Scopes: `chat:write`, `im:history`, `im:read`, `im:write`
3. Install to workspace, copy Bot User OAuth Token
4. Set in `.env`:
   - `SLACK_BOT_TOKEN=xoxb-...`
   - `SLACK_SIGNING_SECRET=<from Basic Information>`
5. Enable Events API, set request URL: `https://yourdomain.com/api/v1/chat/webhook/slack`
6. Subscribe to bot events: `message.im`

## Admin Dashboard Features

Navigate to Admin > Integrations > Chat Assistant:

- **Enable toggle**: One-click activation
- **Channel cards**: Shows configured status, deep links for each platform
- **Copy link button**: Share Telegram/WhatsApp connect links with team
- **Stats**: Connected users, messages processed, last activity
- **Connected users table**: See who's linked, their role, message count, with unlink button

## API Endpoints

### Public (webhook, no auth):
- `POST /api/v1/chat/webhook/telegram` -- Telegram webhook
- `GET /api/v1/chat/webhook/whatsapp` -- WhatsApp verification
- `POST /api/v1/chat/webhook/whatsapp` -- WhatsApp messages
- `POST /api/v1/chat/webhook/slack` -- Slack events

### Admin (authenticated, admin role):
- `GET /api/v1/chat/settings` -- Get chat settings + channel info
- `PUT /api/v1/chat/settings` -- Enable/disable, channel toggles
- `GET /api/v1/chat/linked-users` -- List linked users for tenant
- `DELETE /api/v1/chat/linked-users/:linkId` -- Unlink a user
- `POST /api/v1/chat/setup-webhook` -- Register webhook URLs with platforms

## Replicating for Other Projects

To add OpenClaw to another project (e.g., wholesale product platform):

### 1. Copy chat infrastructure

Copy these directories/files:
- `backend/models/platform/ChatUserLink.js` (unchanged)
- `backend/models/ChatSession.js` (unchanged)
- `backend/services/chat/telegramService.js` (unchanged)
- `backend/services/chat/whatsappService.js` (unchanged)
- `backend/services/chat/slackService.js` (unchanged)
- `backend/services/chat/intentDetector.js` (modify intents)
- `backend/services/chat/chatEngine.js` (modify action handlers)
- `backend/controllers/chat.controller.js` (modify admin endpoints if needed)
- `backend/routes/chat-webhooks.js` (unchanged)
- `backend/routes/chat.js` (unchanged)
- `frontend/ss-admin-chat.js` (rename prefix, adjust branding)

### 2. Customize intents

Edit `intentDetector.js` SYSTEM_PROMPT for your domain. Example for wholesale:
- `order_create`, `order_list`, `order_status`
- `product_search`, `product_price`
- `invoice_view`, `payment_status`

### 3. Customize action handlers

Edit `chatEngine.js` to implement your domain actions instead of expense claim operations.

### 4. Wire up

- Set `ANTHROPIC_API_KEY` in your `.env` (same key works across projects, Claude Haiku for fast NLP)
- Add `chatAssistant` field to your settings model
- Register ChatSession in your connection manager
- Mount webhook routes before auth middleware
- Add rawBody capture to express.json
- Add admin UI section

### 5. Shared components (no changes needed)

- ChatUserLink model (platform-agnostic)
- Platform services (Telegram, WhatsApp, Slack)
- Linking flow in chatEngine (email + PIN verification)
- Admin linked users management

## Troubleshooting

### Bot not responding to messages

1. Check webhook is registered: Admin > Chat Assistant > channel should show "Configured"
2. Verify bot token is set in `.env` and server restarted
3. Check server logs for webhook errors
4. For Telegram: `curl https://api.telegram.org/bot<TOKEN>/getWebhookInfo`

### "Company not found" when using deep link

1. Verify tenant slug is correct
2. Check tenant status is `active` or `trial`
3. Ensure chat assistant is enabled in admin settings

### PIN verification failing

1. User must use the same PIN as web login
2. Check if account is locked (5 failed attempts)
3. Admin can reset PIN from Users section

### Messages not being processed

1. Check server logs for `[ChatEngine]` errors
2. Verify MongoDB is running and tenant DB is accessible
3. Check rate limiter (300 req/min on webhooks)
4. For Slack: ensure you're subscribing to `message.im` events

### Claude intent detection not working

1. Check `ANTHROPIC_API_KEY` is set
2. Keyword fallback will handle basic commands
3. Check intent detector logs for API errors

### WhatsApp webhook verification failing

1. Ensure `WHATSAPP_VERIFY_TOKEN` matches what you set in Meta dashboard
2. The GET endpoint must return the `hub.challenge` value
3. Check Meta dashboard for webhook delivery status
