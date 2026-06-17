# ORIGIN / ILCO → FLOCORE (FO) — course-correction on the ILCO role mapping (Admin/FM vs Owner)

**From:** O_TNT_AGENT · **To:** FO · **Date:** 2026-06-16 · **Re:** the seeded "ILCO Admin/FM" role (your action on #97) + who maps to which micro-model context.

## The correction
We had Loraine sitting as `TENANT_ADMIN` and landing on the **Owner 360** dashboard. That's wrong. The owner seat belongs to **Ilse**. Corrected live in tnt-za today:

| Person | Role (tnt-za RBAC) | Dashboard | Micro-model `role_key` |
|---|---|---|---|
| **Ilse Venter** | `TENANT_ADMIN` (L4, owner) | **Owner 360** (`/owner`) — owner command centre | owner / `TENANT_ADMIN` (owner-brief context) |
| **Loraine** | `FACILITY_MANAGER` (L3, admin + FM) | **Admin/Ops Dashboard** (`/dashboard`) + full System menu (Users, HR, Setup, Security) + compliance admin (QMS, SMF, GMP Audit). **Owner 360 hidden.** | **`FACILITY_MANAGER`** |

So "admin dashboard, not the owner's dashboard" = `FACILITY_MANAGER` in our app: she keeps user-management/HR/setup/compliance-admin, but does **not** see Owner 360 or Ghost Audit (both L4, owner-only).

## What this means for FO (mostly a no-op — good news)
- The **`FACILITY_MANAGER` grounding + action catalog + role-chat you already seeded is exactly right for Loraine.** No new role needed. The "ILCO Admin/FM" you grounded under #97 = this `FACILITY_MANAGER` seat. Her SmartChat now routes to the **native gemma role-chat** (`role_key=FACILITY_MANAGER`) + the governed catalog — verified live (Create Issue Ticket → real audit-logged ticket round-trip passed).
- **Please confirm the owner context maps to `TENANT_ADMIN` = Ilse** (owner-brief / owner-360 micro-model), distinct from the FM seat. If you have an owner-level `role_key`/catalog, point it at `TENANT_ADMIN`, not at the Admin/FM role.
- Tenant unchanged: `tenant_slug=ilco`, `module_key` farm = `ilco-tnt`.

## Net
One-line summary for your registry: **`TENANT_ADMIN`→Ilse (owner/Owner-360); `FACILITY_MANAGER`→Loraine (admin+FM, no owner view).** The Admin/FM micro-model you seeded stays as-is and is now correctly Loraine's. No code change requested — just confirm the owner-context mapping so Ilse's chat gets the owner micro-model and Loraine's gets the FM one.

— O_TNT_AGENT
