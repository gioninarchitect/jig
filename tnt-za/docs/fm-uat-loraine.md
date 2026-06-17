# FM UAT — Loraine (Facility Manager + Admin)

**For:** Loraine · **Role:** TENANT_ADMIN (does FM **and** all admin) · **App:** https://tntilco.cleva-ai.co.za
**Login:** `ray@ilcofarming.co.za` — the OTP currently lands in Flo's inbox (alias); swap to her real email later.
**Verified:** 2026-06-15 — account live + login path proven (request-pin → 200 + email sent). Dashboard surface (`/owner`) already W31-verified at 390px for a TENANT_ADMIN.

## How she logs in (permanent PIN — NO email needed)
> Local stopgap for the UAT (AUTH_MODE=local). Migrates to FLOCORE's W33 PIN rail next (#94).
1. Open **tntilco.cleva-ai.co.za/login** on a phone/tablet.
2. Enter the email **`ray@ilcofarming.co.za`**.
3. Enter the **permanent PIN: `100100`** → Verify. (No email — the PIN is fixed.)
4. Lands on her dashboard. (Reload keeps her logged in — no bounce.)

### Today's role login table (permanent PINs)
| Role | Email | PIN |
|---|---|---|
| **Loraine — FM / Admin** | `ray@ilcofarming.co.za` | **100100** |
| **Lou — Cultivation** | `florisolivier7+lou@gmail.com` | **200200** |
| Keke — QA | `florisolivier7+keke@gmail.com` | 300300 |
| JR Botha — Processing | `florisolivier7+jr@gmail.com` | 400400 |
| Ray — FM (acct) | `florisolivier7+ray@gmail.com` | 500500 |
| Sipho — Security | `florisolivier7+sipho@gmail.com` | 600600 |
| Coenie — Owner | `florisolivier7+coenie@gmail.com` | 110110 |
| Ilse — Owner | `florisolivier7+ilse@gmail.com` | 120120 |
| Flo — Super Admin | `florisolivier7@gmail.com` | 999999 |

## The 10 acceptance checks

| # | She does… | Expect | State |
|---|-----------|--------|-------|
| 1 | Log in via OTP | Lands on dashboard, greeting "…, Loraine"; reload stays logged in | ✅ proven live |
| 2 | View dashboard on phone + desktop | Tiles (Plants/Batches/Staff/Open Tickets), AI brief, no blank/crash | ✅ wired (same surface W31-proven) |
| 3 | Open the **ticket queue** | Sees the live EU-GMP "SOP governance sync" tickets | ✅ wired |
| 4 | Action a ticket — comment → change status → resolve/close | Change sticks; recorded in the audit trail | ✅ wired (W7.4) |
| 5 | Try to close a **compliance** ticket without sign-off | **Blocked** — stays open until RP/AR sign-off + evidence | ✅ wired (W7.1 control) |
| 6 | Raise a new ticket / requisition | Appears in the queue; audit-logged | ✅ wired |
| 7 | Open **Approvals waiting** | Shows items needing her approval (empty = no error) | ✅ wired |
| 8 | "What to do now" | On her view: **Smart Notifications + Bottleneck Radar + Approvals** flag priorities | ⚠️ via owner-view widgets (dedicated Driver queue lives on the FM `/dashboard` view she's routed past) |
| 9 | Audit trail (`/audit`) | Her actions appear, tamper-proof (hash-chained, append-only) | ✅ wired |
| 10 | Admin view + **Generate brief** | Admin tiles + AI morning brief render | ✅ wired |

## Known gaps — DON'T send her to these tomorrow
- **Staff / shift allocation (FM assigns staff to shifts)** — ❌ no UI yet (the API exists; task #26). The Shifts screen only shows *her own* shift. **Scope out of tomorrow's UAT.**
- **Weight-variance alert to FM** — ⚠️ wired, but only fires on real container weigh data (don't fabricate regulated weights). Present as "fires when Processing captures weights."

## Bottom line
**Nothing is UAT-blocking.** 8 of 10 checks are fully wired; #8 is covered by the dashboard's own priority widgets; the 2 gaps above are scoped out / data-dependent. Loraine can start the FM UAT tomorrow on login #1.
