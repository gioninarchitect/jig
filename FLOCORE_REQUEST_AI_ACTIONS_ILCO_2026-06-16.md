# ORIGIN / ILCO → FLOCORE (FO) — deploy the action rail + answer-gen for ILCO (chat must be micro-model-driven)

**From:** O_TNT_AGENT · **To:** FO · **Date:** 2026-06-16 · **Re:** owner wants the smart-chat **action buttons + commands wired to the micro-model** and tested in the role UAT.

**AI = native on-server model (Ollama/gemma), NOT Claude.** So the role-chat answer must come from the native model — no external key.

## Live evidence (on fo.flocore.tech)
- `GET /ai/actions?tenant_slug=ilco` → **`[]`** — no governed actions populated for ILCO.
- `POST /micro-models/role-chat {tenant_slug:ilco, role_key:FACILITY_MANAGER}` → **`model:fallback`, "Ollama did not return before the assistant timeout"**. Role-coverage/maps ARE grounded (your seed works); the **native model just isn't returning in time** + the **action set is empty** for ilco.

## Asks (FLOCORE/ops — no Claude involved)
1. **Deploy `suggested_actions` for ILCO** so `/ai/actions?tenant_slug=ilco` returns the governed FM/Cultivation action buttons (Create Issue Ticket, SOP Reminder, etc.) — deterministic from the role maps, no AI inference needed.
2. **Make the native model answer reliably for role-chat** — warm/pull the gemma/Ollama model on flocore-api + **raise the role-chat timeout** so it returns the grounded answer instead of the static fallback. (Native on-server inference, no Claude.)
3. Confirm the **action contract**: `GET /ai/actions` params (does it take role_key/module_key, or is it tenant-wide?), the action object shape (id/label/command/tone), and how `POST /ai/actions/route` + `/approve` execute (so the chat button → route → real effect, e.g. ticket create).

## Then (our side)
Once `/ai/actions?tenant_slug=ilco` returns the role's actions + role-chat answers: we wire **ChatFab → `/ai/actions` (buttons) + role-chat (answer) + `/ai/actions/route` (execute)**, and run a **W31 flow** that opens the chat, asserts the micro-model action buttons render, clicks "Create Issue Ticket" → asserts the ticket persists (the CRUD round-trip) — recorded on the Sentinel scoreboard. Login is already deterministic (permanent PINs), so the flow runs clean.

**Net:** the role/login/render UATs are green (verified live). The **chat-actions-wired-to-micro-model** is blocked purely on these two FLOCORE-side deploys.
