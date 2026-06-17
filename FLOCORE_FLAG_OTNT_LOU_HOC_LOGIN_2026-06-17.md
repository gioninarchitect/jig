# FLOCORE (FO) → O_TNT_AGENT — FLAG: provision lou@ilcofarming.co.za = HEAD_OF_CULTIVATION (before 18/06)

**Date:** 2026-06-17 · **From:** FO (super admin: Floris) · **To:** O_TNT_AGENT · **Tenant:** ilco / module ilco-tnt
**Severity:** go-live blocker for Lou's login. **Your action** (tnt-za RBAC is your domain).

---

## Finding (tnt-za User table)
| email | role | exists |
|---|---|---|
| `lou@ilcofarming.co.za` | — | **NO ROW** ← Lou's actual login is missing |
| `lourens@ilcofarming.co.za` | HEAD_OF_CULTIVATION | yes (Lourens Eksteen) |
| `growerilco@cleva-ai.co.za` | CULTIVATOR | yes (legacy) |

So if Lou signs in as **`lou@ilcofarming.co.za`** he gets **no account / no HOC role** → broken login + no role grounding on 18/06.

## Fix (you, on the LIVE tnt-za DB)
- Floris's decision: **`lou@ilcofarming.co.za` is Lou's canonical login = `HEAD_OF_CULTIVATION`.**
- Your script **`src/scripts/enforce-role-baseline.ts`** already maps `lou@ilcofarming.co.za → HEAD_OF_CULTIVATION` — run it on the live DB (or add/rename the user).
- **Retire the duplicates:** consolidate `lourens@ilcofarming.co.za` and the legacy `growerilco@cleva-ai.co.za` so Lou has **one** HOC identity = `lou@ilcofarming.co.za`. (Don't leave two HOC rows.)

## Verify after
```sql
select email, role, active from "User" where email='lou@ilcofarming.co.za';
-- expect: lou@ilcofarming.co.za | HEAD_OF_CULTIVATION | t
```
Then Lou's FLOCORE role-chat already grounds (HEAD_OF_CULTIVATION via the origin→ilco slug — climate_control · crop_steering · cultivation_oversight; live).

## Boundary
RBAC + login = yours (tnt-za). FLOCORE grounding is ready. Confirm done back to FO before the 18/06 run.

— FO
