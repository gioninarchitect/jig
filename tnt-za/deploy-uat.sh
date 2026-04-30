#!/bin/bash
# TnT-ZA — Full UAT Deployment Script
set -e
SERVER="root@154.66.197.199"
REMOTE_DIR="/var/www/tnt-za"

echo "═══════════════════════════════════════════"
echo "  TnT-ZA v2.0 — Full UAT Deployment"
echo "═══════════════════════════════════════════"

echo ""
echo "1/6 — Uploading packages..."
scp /tmp/tnt-backend.tar.gz /tmp/tnt-frontend.tar.gz "$SERVER":/tmp/tnt-deploy/

echo ""
echo "2/6 — Deploying backend..."
ssh "$SERVER" "cd $REMOTE_DIR/backend && rm -rf dist && tar -xzf /tmp/tnt-deploy/tnt-backend.tar.gz && echo '  ✅ Backend extracted'"

echo ""
echo "3/6 — Pushing schema + generating client..."
ssh "$SERVER" "cd $REMOTE_DIR/backend && npx prisma generate && npx prisma db push --accept-data-loss && echo '  ✅ Schema pushed'"

echo ""
echo "4/6 — Deploying frontend..."
ssh "$SERVER" "cd $REMOTE_DIR/frontend && tar -xzf /tmp/tnt-deploy/tnt-frontend.tar.gz && echo '  ✅ Frontend deployed'"

echo ""
echo "5/6 — Restarting server..."
ssh "$SERVER" "pm2 restart tnt-za && sleep 3 && curl -s http://127.0.0.1:6000/api/health"

echo ""
echo "6/6 — Seeding UAT test accounts (19 users)..."
ssh "$SERVER" "cd $REMOTE_DIR/backend && node -e \"
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

const USERS = [
  { name: 'Ilze', email: 'ilze@ilcofarms.co.za', role: 'TENANT_ADMIN' },
  { name: 'RP', email: 'rp@ilcofarms.co.za', role: 'RESPONSIBLE_PHARMACIST' },
  { name: 'Ray', email: 'ray@ilcofarms.co.za', role: 'FACILITY_MANAGER' },
  { name: 'Jannette (JR)', email: 'jr@ilcofarms.co.za', role: 'PROCESSING_MANAGER' },
  { name: 'Loraine', email: 'loraine@ilcofarms.co.za', role: 'FACILITY_SUPERVISOR' },
  { name: 'QA Inspector', email: 'qa@ilcofarms.co.za', role: 'QA_INSPECTOR' },
  { name: 'Maintenance Mgr', email: 'maint@ilcofarms.co.za', role: 'MAINTENANCE_MANAGER' },
  { name: 'Lou', email: 'lou@ilcofarms.co.za', role: 'HEAD_OF_CULTIVATION' },
  { name: 'Cultivator 1', email: 'cult1@ilcofarms.co.za', role: 'CULTIVATOR' },
  { name: 'Cultivator 2', email: 'cult2@ilcofarms.co.za', role: 'CULTIVATOR' },
  { name: 'Keke', email: 'keke@ilcofarms.co.za', role: 'LAB_TECH' },
  { name: 'Irrigation Tech', email: 'irrigation@ilcofarms.co.za', role: 'IRRIGATION_TECH' },
  { name: 'Sipho', email: 'sipho@ilcofarms.co.za', role: 'SECURITY_OFFICER' },
  { name: 'Trimmer 1', email: 'trimmer1@ilcofarms.co.za', role: 'TRIMMER' },
  { name: 'Trimmer 2', email: 'trimmer2@ilcofarms.co.za', role: 'TRIMMER' },
  { name: 'General Worker', email: 'worker@ilcofarms.co.za', role: 'GENERAL_WORKER' },
  { name: 'Housekeeping', email: 'hk@ilcofarms.co.za', role: 'HOUSEKEEPING' },
  { name: 'Laundry', email: 'laundry@ilcofarms.co.za', role: 'LAUNDRY' },
  { name: 'SAHPRA Inspector', email: 'inspector@ilcofarms.co.za', role: 'VIEWER' },
];

(async () => {
  const tenant = await prisma.tenant.findFirst();
  const facility = await prisma.facility.findFirst({ where: { tenantId: tenant.id } });
  const pinHash = await bcrypt.hash('123456', 10);
  let created = 0, skipped = 0;
  for (const u of USERS) {
    const exists = await prisma.user.findFirst({ where: { email: u.email } });
    if (exists) { await prisma.user.update({ where: { id: exists.id }, data: { pinHash, role: u.role, name: u.name } }); console.log('  UPDATE: ' + u.email + ' → ' + u.role); skipped++; continue; }
    await prisma.user.create({ data: { name: u.name, email: u.email, role: u.role, pinHash, tenantId: tenant.id, facilityId: facility.id, active: true } });
    console.log('  ✅ ' + u.name + ' (' + u.role + ') — ' + u.email);
    created++;
  }
  console.log('  Done: ' + created + ' created, ' + skipped + ' skipped');
  await prisma.\\\$disconnect();
})();
\""

echo ""
echo "═══════════════════════════════════════════"
echo "  ✅ DEPLOYMENT COMPLETE"
echo ""
echo "  App:  https://tntilco.cleva-ai.co.za"
echo "  API:  https://tntilco.cleva-ai.co.za/api/health"
echo ""
echo "  Existing: superilco@cleva-ai.co.za (Super Admin)"
echo ""
echo "  New accounts (PIN: 123456 for all):"
echo "  ├── ilze@ilcofarms.co.za (Tenant Admin)"
echo "  ├── rp@ilcofarms.co.za (Responsible Pharmacist)"
echo "  ├── ray@ilcofarms.co.za (Facility Manager)"
echo "  ├── jr@ilcofarms.co.za (Processing Manager - JR)"
echo "  ├── loraine@ilcofarms.co.za (Facility Supervisor)"
echo "  ├── qa@ilcofarms.co.za (QA Inspector)"
echo "  ├── maint@ilcofarms.co.za (Maintenance Manager)"
echo "  ├── lou@ilcofarms.co.za (Head of Cultivation)"
echo "  ├── cult1@ilcofarms.co.za (Cultivator 1)"
echo "  ├── cult2@ilcofarms.co.za (Cultivator 2)"
echo "  ├── keke@ilcofarms.co.za (Lab Tech)"
echo "  ├── irrigation@ilcofarms.co.za (Irrigation Tech)"
echo "  ├── sipho@ilcofarms.co.za (Security)"
echo "  ├── trimmer1@ilcofarms.co.za (Trimmer 1)"
echo "  ├── trimmer2@ilcofarms.co.za (Trimmer 2)"
echo "  ├── worker@ilcofarms.co.za (General Worker)"
echo "  ├── hk@ilcofarms.co.za (Housekeeping)"
echo "  ├── laundry@ilcofarms.co.za (Laundry)"
echo "  └── inspector@ilcofarms.co.za (SAHPRA Viewer)"
echo ""
echo "  Next: login as Ray → Tasks → 'Seed SAHPRA SOPs'"
echo "═══════════════════════════════════════════"
