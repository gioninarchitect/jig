// One-off CFS loader: rebuild GH1 (VEG) + GH2 (FLOWERING) with 4 rows × 4 subrows × 130,
// then allocate strains per subrow from the canonical facility notes. Run on tr-api.
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const SPP = 130; // spots per subrow

// (greenhouse) → bayName → row → {subrow: strain}
const GH1 = {
  'Bay 1': { 1: { 1:'SL',2:'SL',3:'SL',4:'SL' } },
  'Bay 2': {
    1: { 1:'KB',2:'KB',3:'KB',4:'KB' },
    2: { 1:'Elvis',2:'Elvis',3:'KB',4:'KB' },
    3: { 1:'Heady Eddy',2:'Heady Eddy',3:'Heady Eddy',4:'Heady Eddy' },
    4: { 1:'Subr01?',2:'Subr01?',3:'Subr01?',4:'Subr01?' },
  },
  'Bay 3': {
    1: { 1:'SL',2:'SL',3:'SL',4:'SL' },
    2: { 1:'Heady Daddy',2:'Heady Eddy',3:'GP',4:'Sunday Driver' },
    3: { 1:'Elvis',2:'Heady Eddy',3:'Heady Eddy',4:'SL' },
    4: { 1:'Heady Daddy',2:'Higher Primate',3:'DP',4:'Keke' }, // R&D mix (top counts; full mix in note)
  },
};
const GH2 = {
  'Bay 4': { 1:{1:'KB',2:'KB',3:'KB',4:'KB'}, 2:{1:'KB',2:'KB',3:'KB',4:'KB'} },
  'Bay 5': {
    1:{1:'Elvis',2:'Elvis',3:'Elvis',4:'Elvis'},
    2:{1:'Elvis',2:'Elvis',3:'Elvis',4:'Elvis'},
    3:{1:'Strawberry Lemonade',2:'Strawberry Lemonade',3:'Strawberry Lemonade',4:'Strawberry Lemonade'},
    4:{1:'Strawberry Lemonade',2:'Strawberry Lemonade',3:'Strawberry Lemonade',4:'Strawberry Lemonade'},
  },
  'Bay 6': { 1:{1:'Cereal Milk',2:'Cereal Milk',3:'Cheese',4:'Cheese'} },
};

async function makeGreenhouse(name, type, bayStart, totalBays, facilityId, tenantId) {
  const gh = await prisma.greenhouse.create({ data: { name, type, totalBays, facilityId, tenantId } });
  for (let b = 0; b < totalBays; b++) {
    const bayNo = bayStart + b;
    const bay = await prisma.bay.create({ data: { name: `Bay ${bayNo}`, greenhouseId: gh.id, lines: 4, capacity: 4*4*SPP } });
    const spots = [];
    for (let row=1; row<=4; row++) for (let sub=1; sub<=4; sub++) for (let pos=1; pos<=SPP; pos++)
      spots.push({ spotId:`${name}-B${bayNo}-R${row}-S${sub}-P${pos}`, row, subrow:sub, position:pos, bayId:bay.id });
    await prisma.baySpot.createMany({ data: spots });
  }
  return gh;
}

async function allocate(ghId, map) {
  const bays = await prisma.bay.findMany({ where: { greenhouseId: ghId } });
  for (const bay of bays) {
    const rows = map[bay.name]; if (!rows) continue;
    const strains = new Set();
    for (const row of Object.keys(rows)) {
      for (const sub of Object.keys(rows[row])) {
        const strain = rows[row][sub]; strains.add(strain);
        await prisma.baySpot.updateMany({
          where: { bayId: bay.id, row: Number(row), subrow: Number(sub) },
          data: { strain, status: 'OCCUPIED', allocatedAt: new Date() },
        });
      }
    }
    await prisma.bay.update({ where: { id: bay.id }, data: { currentStrain: strains.size === 1 ? [...strains][0] : 'MIXED', status: 'PARTIAL', allocatedAt: new Date() } });
  }
}

(async () => {
  const fac = await prisma.facility.findFirst();
  const { id: facilityId, tenantId } = fac;
  console.log('facility', facilityId);
  // wipe existing greenhouse structure (CFS rebuild)
  await prisma.baySpot.deleteMany({});
  await prisma.bayAllocation.deleteMany({});
  await prisma.bay.deleteMany({});
  await prisma.greenhouse.deleteMany({});
  console.log('cleared old greenhouses');
  const gh1 = await makeGreenhouse('GH1', 'VEG', 1, 3, facilityId, tenantId);
  const gh2 = await makeGreenhouse('GH2', 'FLOWER', 4, 3, facilityId, tenantId);
  console.log('created GH1 + GH2');
  await allocate(gh1.id, GH1);
  await allocate(gh2.id, GH2);
  console.log('allocated strains');
  // summary
  const summary = await prisma.$queryRawUnsafe(`
    select g.name gh, b.name bay, s.row, s.subrow, s.strain, count(*) spots
    from "BaySpot" s join "Bay" b on b.id=s."bayId" join "Greenhouse" g on g.id=b."greenhouseId"
    where s.strain is not null
    group by g.name,b.name,s.row,s.subrow,s.strain order by g.name,b.name,s.row,s.subrow`);
  console.log('allocated subrows:', summary.length);
  console.table(summary.map(r => ({ ...r, spots: Number(r.spots) })).slice(0, 40));
  await prisma.$disconnect();
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
