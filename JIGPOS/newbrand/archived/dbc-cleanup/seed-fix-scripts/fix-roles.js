#!/usr/bin/env node
process.chdir('/var/www/dbc');
require('/var/www/dbc/node_modules/dotenv').config({ path: '/var/www/dbc/.env' });
const mongoose = require('/var/www/dbc/node_modules/mongoose');

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const db = mongoose.connection.db;

  // Fix 1: staff_assistant -> branch_assistant
  const r1 = await db.collection('users').updateMany(
    { role: 'staff_assistant' },
    { $set: { role: 'branch_assistant' } }
  );
  console.log('Fixed staff_assistant -> branch_assistant: ' + r1.modifiedCount + ' users');

  // Fix 2: staff_manager -> branch_manager (just in case)
  const r2 = await db.collection('users').updateMany(
    { role: 'staff_manager' },
    { $set: { role: 'branch_manager' } }
  );
  console.log('Fixed staff_manager -> branch_manager: ' + r2.modifiedCount + ' users');

  // Fix 3: Owner (Power) has wrong name (showing FP OLIVIER instead of Power)
  const r3 = await db.collection('users').updateOne(
    { email: 'owner@jig.cleva-ai.co.za' },
    { $set: { firstName: 'Power', lastName: 'Olivier' } }
  );
  console.log('Fixed owner name -> Power Olivier: ' + r3.modifiedCount + ' updated');

  // Verify all
  const users = await db.collection('users').find(
    { email: { $regex: 'ormonde|owner@|admin@|florisolivier' } },
    { projection: { email: 1, role: 1, firstName: 1, lastName: 1 } }
  ).toArray();
  console.log('\nVerification:');
  users.forEach(u => console.log('  ' + u.email.padEnd(40) + u.role.padEnd(20) + (u.firstName || '') + ' ' + (u.lastName || '')));

  await mongoose.disconnect();
  console.log('\nDone.');
});
