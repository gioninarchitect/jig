# JIG Craft Cannabis - Session Handoff

## Session Date: 2026-02-19

## What We Did
- Fixed order creation bugs (JIG-XXXXXX format, "Done" button routing, address fallback)
- Built button-driven ordering flow (category -> product -> quantity buttons)
- Improved product catalog UX (formatted prices, category headers, better layout)
- Changed company address from Cape Town to Johannesburg on invoices
- Added 10+ Telegram notification types:
  - Order confirmed (with FULL INVOICE: line items, VAT, banking details)
  - Order shipped (with courier tracking URLs for SA couriers)
  - Order delivered
  - Payment confirmed / overdue
  - POP approved / rejected
  - Verification doc approved / rejected
  - Account activated
  - Daily restock reminders (8am, products due within 3 days)
  - New product announcements (checks every 5min)
- Built self-service Telegram onboarding (new client registration + doc upload in chat)
- Removed credit limits from display (user doesn't use credit limits)
- Softened verification gating (clients can browse and order while pending)
- Notification scheduler runs on server startup (restock daily 8am, new products every 5min)

## What Needs Deploying
All changes built and tested locally (0 TS errors, 48/48 tests pass).
Run: `bash deploy/deploy-now.sh`

## Pending / Next Steps

### Immediate
1. Deploy current changes: `bash deploy/deploy-now.sh`
2. Test self-service registration flow on Telegram
3. Test invoice notification (confirm order from admin, check Telegram)

### Parked Features
1. **n8n workflow automation** - user said "lets deploy first then n8n after"
2. **WhatsApp Business API** - user has no Meta Business account
3. **Courier API integration** - user said "we will add the courier api later"
4. **Product images** - no imageUrl in DB, needed for carousel
5. **Horizontal scrolling carousel** - needs Telegram Mini App (WebApp)

## Key File Paths
- Chat engine: `src/server/chat/chatEngine.ts` (~1900 lines)
- Webhook routes: `src/server/chat/webhookRoutes.ts`
- Chat types: `src/server/chat/types.ts`
- Notifications scheduler: `src/server/chat/notifications.ts`
- Order routes: `src/server/routes/orders.routes.ts`
- Verification routes: `src/server/routes/verification.routes.ts`
- Deploy script: `deploy/deploy-now.sh`
- DB functions: `src/server/db.ts` (createClient, createOrder, etc.)

## Server Details
| Item | Value |
|------|-------|
| IP | 154.66.197.199 |
| Domain | jig.cleva-ai.co.za |
| Port | 3002 |
| PM2 | jig-api |
| App dir | /var/www/jig |

## Important Gotchas
- SSH auth fails from Claude - user must run deploy commands manually
- orders.id is VARCHAR(20) not UUID - use JIG-XXXXXX format
- No credit limits in this business
- Verification is soft-gated: pending clients CAN order
- Company address: Johannesburg, Gauteng (not Cape Town)
- Telegram callback_data limit: 64 bytes - keep prefixes short

## Deploy Commands
```bash
bash deploy/deploy-now.sh
```

## Build Status
- 0 TypeScript errors, 48/48 tests pass
