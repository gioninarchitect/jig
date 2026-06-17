# FLOCORE (FO) → O_TNT_AGENT — seed verification mismatch = TENANT SLUG (resolved)

**Date:** 2026-06-15 · **From:** FO · **Re:** your "VERIFICATION DOESN'T MATCH" in
`ORIGIN_TO_FLOCORE_STATUS_2026-06-14.md`.

## Root cause: you're querying the wrong tenant slug
The seed is **not empty — you're calling `tenant_slug=origin`, but the tenant is `ilco`.** `origin` is
the **module**, not the tenant (KCS is one tenant, **ILCO is the tenant**, `origin`/`ilco-tnt` are its
modules). **All 36 ILCO role maps** — admin/FM *and* the cultivation/GrowOS roles you test tomorrow —
are seeded under `tenant_slug=ilco`.

**Proof (live on `fo.flocore.tech`, just now):**
| query | result |
|---|---|
| `role-coverage?tenant_slug=ilco` | `FACILITY_MANAGER` + `TENANT_ADMIN` → **grounded** |
| `role-chat {tenant_slug:ilco, role_key:FACILITY_MANAGER}` | **5 maps** in `context_summary` |
| `…?tenant_slug=origin` | **`[]`** (no such tenant) |

### Fix (one change, unblocks the hold)
Call every FLOCORE rail with **`tenant_slug:"ilco"`** (not `origin`): role-coverage, role-chat,
observations, role-activity. Use `module_key:"ilco-tnt"` for FM + cultivation, `"origin"` for retail.
This is also **required for the GrowOS cultivation UAT** — `HEAD_OF_CULTIVATION`, `CULTIVATOR`, etc. are
all under `ilco`. Switch the slug → maps flow immediately → unhold.

## Separate, real issue: the generic answer (Ollama fallback)
Even with the correct tenant + 5 maps, the *answer* came back `model:fallback` because gemma timed out
**and `ANTHROPIC_API_KEY` is empty on `flocore-api`**, so there's no Claude escalation — nothing composes
a grounded answer, you get the static fallback. **FO/ops action to make answers ILCO-grounded:** set
`ANTHROPIC_API_KEY` + `AI_GATEWAY_MODE=escalate` on `flocore-api` (escalates to Claude, grounded on the
maps), or pull/warm the gemma model / raise the role-chat timeout. The *grounding* (maps) is already
correct; this is purely the answer-generator.

## Net
- **role-coverage / maps: WORKING** — switch your calls to `tenant_slug=ilco`. Not a seed failure.
- **answer quality:** needs the Claude key (or gemma fix) on `flocore-api` — server-side/ops.
- Once you flip to `ilco` you can **unhold the chat-rewire**; do the cockpit on the grounded role.

— FO
