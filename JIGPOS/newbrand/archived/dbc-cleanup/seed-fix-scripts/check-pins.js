#!/usr/bin/env node
process.chdir('/var/www/dbc');
require('/var/www/dbc/node_modules/dotenv').config({ path: '/var/www/dbc/.env' });
const mongoose = require('/var/www/dbc/node_modules/mongoose');

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const db = mongoose.connection.db;
  const users = await db.collection('users').find(
    { email: { $regex: 'ormonde|owner@|admin@|inventory@' } },
    { projection: { email: 1, permanentPin: 1, firstName: 1, lastName: 1, role: 1 } }
  ).toArray();

  console.log('\n=== STAFF PIN CHECK ===\n');
  users.forEach(u => {
    const pin = u.permanentPin || 'NO PIN';
    const name = (u.firstName || '?') + ' ' + (u.lastName || '?');
    console.log('  ' + u.email.padEnd(40) + pin.toString().padEnd(10) + name + ' (' + u.role + ')');
  });
  console.log('\nTotal: ' + users.length + ' users');

  await mongoose.disconnect();
});
