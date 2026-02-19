#!/bin/bash
# ──────────────────────────────────────────────────────────────
# JIG Craft Cannabis - n8n Cloud Integration Setup
#
# This script generates the commands you need to run to connect
# JIG (on the server) with your n8n cloud instance.
#
# n8n Cloud: https://cleva-ai.app.n8n.cloud/
# JIG API:   https://jig.cleva-ai.co.za/api/v1
# Server:    154.66.197.199
#
# Usage:
#   bash deploy/n8n-setup.sh
#
# This does NOT SSH into the server. It prints commands for
# you to copy-paste and run yourself.
# ──────────────────────────────────────────────────────────────

set -euo pipefail

# ── Config ────────────────────────────────────────────────────

SERVER="154.66.197.199"
APP_DIR="/var/www/jig"
PM2_NAME="jig-api"
JIG_API="https://jig.cleva-ai.co.za/api/v1"
N8N_CLOUD="https://cleva-ai.app.n8n.cloud"
N8N_WEBHOOK_URL="${N8N_CLOUD}/webhook"

# ── Generate API key ─────────────────────────────────────────

API_KEY=$(openssl rand -base64 32 | tr -dc 'a-zA-Z0-9' | head -c 48)

# ── Output ───────────────────────────────────────────────────

echo ""
echo "========================================================"
echo "  JIG x n8n Cloud - Integration Setup"
echo "========================================================"
echo ""
echo "  n8n Cloud:  ${N8N_CLOUD}"
echo "  JIG API:    ${JIG_API}"
echo "  Server:     ${SERVER}"
echo ""
echo "--------------------------------------------------------"
echo "  GENERATED API KEY (save this - you will need it twice)"
echo "--------------------------------------------------------"
echo ""
echo "  ${API_KEY}"
echo ""
echo "========================================================"
echo ""
echo ""

# ── Step 1: Server command ───────────────────────────────────

cat << 'STEP1_HEADER'
STEP 1: Set env vars on the server
───────────────────────────────────
Copy and run this command:

STEP1_HEADER

# Build the one-liner command for the user
cat << EOF
ssh root@${SERVER} "cd ${APP_DIR} && grep -q '^N8N_ENABLED=' .env 2>/dev/null && sed -i 's/^N8N_ENABLED=.*/N8N_ENABLED=true/' .env || echo 'N8N_ENABLED=true' >> .env && grep -q '^N8N_WEBHOOK_URL=' .env 2>/dev/null && sed -i 's|^N8N_WEBHOOK_URL=.*|N8N_WEBHOOK_URL=${N8N_WEBHOOK_URL}|' .env || echo 'N8N_WEBHOOK_URL=${N8N_WEBHOOK_URL}' >> .env && grep -q '^N8N_API_KEY=' .env 2>/dev/null && sed -i 's/^N8N_API_KEY=.*/N8N_API_KEY=${API_KEY}/' .env || echo 'N8N_API_KEY=${API_KEY}' >> .env && pm2 restart ${PM2_NAME} && echo '' && echo 'n8n env vars set and server restarted' && echo '' && grep -E '^N8N_' .env"
EOF

echo ""
echo ""

# ── Step 2: Verify ───────────────────────────────────────────

cat << 'STEP2_HEADER'
STEP 2: Verify JIG is responding
─────────────────────────────────
After running Step 1, test the n8n data API:

STEP2_HEADER

cat << EOF
curl -s -H "X-N8N-API-KEY: ${API_KEY}" ${JIG_API}/n8n/data/stats | python3 -m json.tool
EOF

echo ""
echo ""
echo "You should see a JSON response with today/pending/totals."
echo ""
echo ""

# ── Step 3: n8n cloud configuration ─────────────────────────

cat << 'STEP3_HEADER'
STEP 3: Configure n8n Cloud
─────────────────────────────
In your n8n cloud instance (https://cleva-ai.app.n8n.cloud/):

STEP3_HEADER

cat << EOF
  A. Create an "HTTP Header Auth" credential:
     - Name:         JIG API Key
     - Header Name:  X-N8N-API-KEY
     - Header Value: ${API_KEY}

  B. JIG Data Endpoints (use HTTP Request node with the credential above):

     Clients list:         GET  ${JIG_API}/n8n/data/clients
     Single client:        GET  ${JIG_API}/n8n/data/clients/{id}
     Unpaid orders:        GET  ${JIG_API}/n8n/data/orders/unpaid
     Recent orders:        GET  ${JIG_API}/n8n/data/orders/recent?days=7
     Restock predictions:  GET  ${JIG_API}/n8n/data/restock-predictions
     All products:         GET  ${JIG_API}/n8n/data/products
     Dashboard stats:      GET  ${JIG_API}/n8n/data/stats

  C. JIG Webhook Events (use Webhook trigger nodes):

     JIG fires POST requests to these URLs when events occur.
     Create Webhook nodes for the events you want to automate:

     ${N8N_WEBHOOK_URL}/order-created        Order placed
     ${N8N_WEBHOOK_URL}/order-confirmed       Order confirmed
     ${N8N_WEBHOOK_URL}/order-shipped         Order shipped
     ${N8N_WEBHOOK_URL}/order-delivered       Order delivered
     ${N8N_WEBHOOK_URL}/order-cancelled       Order cancelled
     ${N8N_WEBHOOK_URL}/payment-received      Payment recorded
     ${N8N_WEBHOOK_URL}/payment-overdue       Payment overdue
     ${N8N_WEBHOOK_URL}/pop-uploaded          Proof of payment uploaded
     ${N8N_WEBHOOK_URL}/pop-approved          POP approved
     ${N8N_WEBHOOK_URL}/pop-rejected          POP rejected
     ${N8N_WEBHOOK_URL}/client-created        New client registered
     ${N8N_WEBHOOK_URL}/client-activated       Client activated
     ${N8N_WEBHOOK_URL}/doc-uploaded          Verification doc uploaded
     ${N8N_WEBHOOK_URL}/doc-approved          Document approved
     ${N8N_WEBHOOK_URL}/doc-rejected          Document rejected
     ${N8N_WEBHOOK_URL}/product-created       New product added

     Each webhook receives a JSON body:
     {
       "type": "order.created",
       "timestamp": "2026-02-19T12:00:00.000Z",
       "payload": { ... event-specific data ... }
     }
EOF

echo ""
echo ""

# ── Step 4: Test webhook ─────────────────────────────────────

cat << 'STEP4_HEADER'
STEP 4: Test the webhook round-trip
─────────────────────────────────────
Once you have a Webhook node active in n8n, test that JIG can
reach it by sending a test event from the server:

STEP4_HEADER

cat << EOF
ssh root@${SERVER} "curl -s -X POST ${N8N_WEBHOOK_URL}/test -H 'Content-Type: application/json' -d '{\"type\":\"test\",\"timestamp\":\"$(date -u +%Y-%m-%dT%H:%M:%S.000Z)\",\"payload\":{\"message\":\"Hello from JIG\"}}' && echo '' && echo 'Test webhook sent'"
EOF

echo ""
echo ""
echo "========================================================"
echo "  Setup complete. Save the API key somewhere safe."
echo "========================================================"
echo ""
