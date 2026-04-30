#!/bin/bash
set -e
SERVER="root@154.66.197.199"

echo "══════════════════════════════════════"
echo "  TnT-ZA — Deploy + Seed"
echo "══════════════════════════════════════"

echo "Uploading..."
scp /tmp/tnt-backend.tar.gz /tmp/tnt-frontend.tar.gz $SERVER:/tmp/tnt-deploy/

echo "Backend..."
ssh $SERVER 'cd /var/www/tnt-za/backend && rm -rf dist && tar -xzf /tmp/tnt-deploy/tnt-backend.tar.gz && npx prisma generate && npx prisma db push --accept-data-loss'

echo "Frontend..."
ssh $SERVER 'cd /var/www/tnt-za/frontend && tar -xzf /tmp/tnt-deploy/tnt-frontend.tar.gz'

echo "Restart..."
ssh $SERVER 'pm2 restart tnt-za && sleep 3'

echo "Seeding users..."
ssh $SERVER 'cd /var/www/tnt-za/backend && node -e '"'"'
const{PrismaClient}=require("@prisma/client"),bcrypt=require("bcryptjs"),p=new PrismaClient();
(async()=>{
const h=await bcrypt.hash("123456",10);
const t=await p.tenant.findFirst();
const f=await p.facility.findFirst();
if(!t||!f){console.log("No tenant/facility");process.exit(1)}
const U=[
["Ilze","ilze@ilcofarm.co.za","TENANT_ADMIN"],
["Coenie","coenie@ilcofarm.co.za","TENANT_ADMIN"],
["Floris Admin","florisolivier7@gmail.com","TENANT_ADMIN"],
["RP","rp@ilcofarms.co.za","RESPONSIBLE_PHARMACIST"],
["Ray","ray@ilcofarming.co.za","FACILITY_MANAGER"],
["Jannette","jr@ilcofarms.co.za","PROCESSING_MANAGER"],
["Loraine","loraine@ilcofarms.co.za","FACILITY_SUPERVISOR"],
["QA Inspector","qa@ilcofarms.co.za","QA_INSPECTOR"],
["Maintenance","maint@ilcofarms.co.za","MAINTENANCE_MANAGER"],
["Lou","lou@ilcofarming.co.za","HEAD_OF_CULTIVATION"],
["Nursery","nursery@ilcofarms.co.za","NURSERY_MANAGER"],
["Cultivator 1","cult1@ilcofarms.co.za","CULTIVATOR"],
["Cultivator 2","cult2@ilcofarms.co.za","CULTIVATOR"],
["Keke","keke@ilcofarms.co.za","LAB_TECH"],
["Irrigation","irrigation@ilcofarms.co.za","IRRIGATION_TECH"],
["Sipho","sipho@ilcofarms.co.za","SECURITY_OFFICER"],
["Trimmer 1","trimmer1@ilcofarms.co.za","TRIMMER"],
["Trimmer 2","trimmer2@ilcofarms.co.za","TRIMMER"],
["Worker","worker@ilcofarms.co.za","GENERAL_WORKER"],
["Housekeeping","hk@ilcofarms.co.za","HOUSEKEEPING"],
["Laundry","laundry@ilcofarms.co.za","LAUNDRY"],
["Inspector","inspector@ilcofarms.co.za","VIEWER"]
];
for(const[name,email,role]of U){
const e=await p.user.findFirst({where:{email}});
if(e){await p.user.update({where:{id:e.id},data:{pinHash:h,role,name}});console.log("UPD "+email)}
else{await p.user.create({data:{name,email,role,pinHash:h,tenantId:t.id,facilityId:f.id,active:true}});console.log("NEW "+email)}
}
console.log("All PINs set to 123456");
await p.$disconnect()
})()
'"'"''

echo "Health..."
ssh $SERVER 'curl -s http://127.0.0.1:6000/api/health'

echo ""
echo "══════════════════════════════════════"
echo "  DONE — https://tntilco.cleva-ai.co.za"
echo "  PIN: 123456 for all accounts"
echo "══════════════════════════════════════"
