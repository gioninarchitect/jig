/**
 * Fix & Add Users - Production Script
 * Run on server: node fix-users.js
 */

const { MongoClient } = require('mongodb');

async function fixUsers() {
    const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/dbc';
    const client = new MongoClient(uri);

    try {
        await client.connect();
        const db = client.db('dbc');
        const users = db.collection('users');

        // 1. Fix Owner name
        const ownerResult = await users.updateOne(
            { email: 'owner@debudchef.co.za' },
            { $set: { firstName: 'Power', lastName: 'Lethunya', updatedAt: new Date() } }
        );
        console.log('Owner name fixed:', ownerResult.modifiedCount ? 'YES' : 'NO CHANGE');

        // 2. Fix Branch Manager PIN
        const managerResult = await users.updateOne(
            { email: 'ormonde.manager@debudchef.co.za' },
            { $set: { permanentPin: '482963', updatedAt: new Date() } }
        );
        console.log('Branch Manager PIN fixed:', managerResult.modifiedCount ? 'YES' : 'NO CHANGE');

        // 3. Add Packer
        const existingPacker = await users.findOne({ email: 'packer@debudchef.co.za' });
        if (existingPacker) {
            console.log('Packer already exists - skipping');
        } else {
            await users.insertOne({
                email: 'packer@debudchef.co.za',
                username: 'ormonde_packer',
                firstName: 'Ormonde',
                lastName: 'Packer',
                role: 'packer',
                permanentPin: '361548',
                isActive: true,
                isEmailVerified: true,
                membership: { status: 'active' },
                permissions: ['viewOrders', 'packOrders'],
                createdAt: new Date(),
                updatedAt: new Date()
            });
            console.log('Packer created: packer@debudchef.co.za | PIN: 361548');
        }

        // 4. Add Dispatch Manager
        const existingDispatch = await users.findOne({ email: 'dispatch@debudchef.co.za' });
        if (existingDispatch) {
            console.log('Dispatch Manager already exists - skipping');
        } else {
            await users.insertOne({
                email: 'dispatch@debudchef.co.za',
                username: 'ormonde_dispatch',
                firstName: 'Ormonde',
                lastName: 'Dispatch',
                role: 'dispatch_manager',
                permanentPin: '729415',
                isActive: true,
                isEmailVerified: true,
                membership: { status: 'active' },
                permissions: ['viewOrders', 'dispatchOrders'],
                createdAt: new Date(),
                updatedAt: new Date()
            });
            console.log('Dispatch Manager created: dispatch@debudchef.co.za | PIN: 729415');
        }

        // Print final user list
        console.log('\n==========================================');
        console.log('ALL USERS');
        console.log('==========================================');
        const allUsers = await users.find({}, {
            projection: { email: 1, role: 1, firstName: 1, lastName: 1, permanentPin: 1 }
        }).sort({ role: 1 }).toArray();

        allUsers.forEach(u => {
            console.log(u.role + ' | ' + u.email + ' | PIN: ' + (u.permanentPin || 'NONE') + ' | ' + (u.firstName || '') + ' ' + (u.lastName || ''));
        });
        console.log('==========================================');

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await client.close();
    }
}

fixUsers();
