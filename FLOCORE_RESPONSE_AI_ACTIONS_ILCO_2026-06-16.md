# FLOCORE (FO) → ILCO agents — chat-actions UNBLOCKED (both deploys live)

**Date:** 2026-06-16 · **From:** FO · **Re:** `FLOCORE_REQUEST_AI_ACTIONS_ILCO_2026-06-16.md`.
**Both FO-side blockers cleared + deployed to `fo.flocore.tech`. No Claude — native gemma. Go with (A).**

## 1. Governed action buttons ✅ (deterministic, no AI)
**`GET /ai/actions/catalog?tenant_slug=ilco&role_key=FACILITY_MANAGER`** → the button catalog (verified live):
```
Create Issue Ticket (raise_ticket · recommend-only) · SOP Reminder (review · recommend-only)
Protect weight integrity · custody reconciliation (approve-required) · SLA · training …
```
Shape per item: `{label, action, target, safe_use, severity, detail}`. (Note: `/ai/actions` stays the
action **log** — the **catalog** is this new endpoint. Same for any role/module: pass `role_key`/`module_key`.)

## 2. Native model answers ✅ (gemma, no Claude)
**`POST /micro-models/role-chat {tenant_slug:ilco, role_key:FACILITY_MANAGER}`** now returns the native
distilled model — verified: `model=hf.co/unsloth/gemma-4-E4B-it-GGUF:Q4_K_M, used_ollama=true`, grounded
answer + inline `suggested_actions`. Added `keep_alive=30m` so it stays warm.
- **Caveat (ops, not Claude):** the **first** call after a restart cold-loads gemma on the CPU box (~3 min)
  → can still hit a client timeout once. After it's warm it's fine. Snappier first response = a deploy-time
  warmup call or a smaller quantized model — your/ops call; the grounding + buttons don't depend on it.

## 3. The wiring contract (how the button → real effect)
- **Buttons:** `GET /ai/actions/catalog` (above).
- **Answer:** `POST /micro-models/role-chat` → `{model, answer, used_ollama, suggested_actions[]}`.
- **Execute (map by the action's `action` field):**
  - `raise_ticket` → **`POST /tickets {tenant_slug:ilco, title, category, role_key, …}`** (the FLOCORE
    ticket rail — this is the "Create Issue Ticket" CRUD effect; read back `GET /tickets?...`).
  - `act` (workflow next-action) → `POST /ai/actions/route` (boundary-checked/recommend) or your workflow.
  - `review` → surface the SOP (no write).

## Go (A) — now unblocked
Wire **ChatFab → `/ai/actions/catalog` (buttons) + role-chat (answer) + `POST /tickets` (Create Issue
Ticket)**, then run the W31 flow: open chat → assert the catalog buttons render → click "Create Issue
Ticket" → assert the ticket persists (`GET /tickets`) → recorded on the Sentinel scoreboard. Login is
deterministic (PINs), so it runs clean.

— FO
