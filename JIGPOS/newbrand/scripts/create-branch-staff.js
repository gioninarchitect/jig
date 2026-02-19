/**
 * Create Staff Account for a Branch
 * Run: node scripts/create-branch-staff.js <branch-code> <phone> <first-name> <last-name> [role]
 * Example: node scripts/create-branch-staff.js SPR-001 0831234567 John Smith branch_assistant
 *
 * Creates a staff account and assigns to the specified branch
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Branch = require('../backend/modules/database/models/Branch');
const User = require('../backend/modules/database/models/User');

const args = process.argv.slice(2);
const branchCode = args[0];
const phone = args[1];
const firstName = args[2];
const lastName = args[3];
const role = args[4] || 'branch_assistant';

if (!branchCode || !phone || !firstName || !lastName) {
  console.log('Usage: node scripts/create-branch-staff.js <branch-code> <phone> <first-name> <last-name> [role]');
  console.log('Example: node scripts/create-branch-staff.js SPR-001 0831234567 John Smith branch_assistant');
  console.log('\nRoles: branch_assistant, branch_manager, inventory_manager, packer, dispatch_manager');
  process.exit(1);
}

async function createBranchStaff() {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/jig';
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    // Find the branch
    const branch = await Branch.findOne({ branchCode: branchCode.toUpperCase() });
    if (!branch) {
      console.error(`Branch not found: ${branchCode}`);
      process.exit(1);
    }

    // Normalize phone number
    const normalizedPhone = phone.replace(/\D/g, '');
    const formattedPhone = normalizedPhone.startsWith('27') ? normalizedPhone : `27${normalizedPhone.replace(/^0/, '')}`;

    // Check if user already exists
    let user = await User.findOne({
      $or: [
        { phone: formattedPhone },
        { phone: phone },
        { email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@jig.cleva-ai.co.za` }
      ]
    });

    if (user) {
      console.log(`User already exists: ${user.firstName} ${user.lastName}`);

      // Just assign to branch
      const alreadyAssigned = user.assignedBranches?.some(
        ab => ab.branch?.toString() === branch._id.toString()
      );

      if (!alreadyAssigned) {
        user.assignedBranches = user.assignedBranches || [];
        user.assignedBranches.push({
          branch: branch._id,
          isPrimary: true,
          assignedAt: new Date()
        });
        user.primaryBranch = branch._id;
        await user.save();
        console.log(`Assigned to ${branch.name}`);
      } else {
        console.log(`Already assigned to ${branch.name}`);
      }
    } else {
      // Create new user
      const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}@jig.cleva-ai.co.za`;
      const username = `${firstName.toLowerCase()}${lastName.toLowerCase()}${Date.now().toString().slice(-4)}`;
      const tempPassword = `JIG${Date.now().toString().slice(-6)}!`;
      const hashedPassword = await bcrypt.hash(tempPassword, 10);

      user = new User({
        email,
        username,
        password: hashedPassword,
        firstName,
        lastName,
        phone: formattedPhone,
        role,
        isActive: true,
        primaryBranch: branch._id,
        assignedBranches: [{
          branch: branch._id,
          isPrimary: true,
          assignedAt: new Date()
        }],
        staffInfo: {
          hireDate: new Date(),
          department: role.includes('inventory') ? 'inventory' :
                      role.includes('dispatch') ? 'dispatch' : 'sales',
          workSchedule: 'full-time'
        }
      });

      await user.save();

      console.log(`\n========================================`);
      console.log(`STAFF ACCOUNT CREATED`);
      console.log(`========================================`);
      console.log(`Name: ${firstName} ${lastName}`);
      console.log(`Email: ${email}`);
      console.log(`Phone: ${formattedPhone}`);
      console.log(`Role: ${role}`);
      console.log(`Branch: ${branch.name}`);
      console.log(`\n--- TEMPORARY LOGIN CREDENTIALS ---`);
      console.log(`Phone: ${formattedPhone}`);
      console.log(`Password: ${tempPassword}`);
      console.log(`\n[!] User should change password on first login`);
      console.log(`[!] Or use OTP login with phone number`);
    }

    // Show all staff at this branch
    const branchStaff = await User.find({
      $or: [
        { 'assignedBranches.branch': branch._id },
        { primaryBranch: branch._id }
      ]
    }).select('firstName lastName role phone email');

    console.log(`\n========================================`);
    console.log(`ALL STAFF AT ${branch.name.toUpperCase()}`);
    console.log(`========================================`);
    branchStaff.forEach(s => {
      console.log(`${s.firstName} ${s.lastName} - ${s.role} - ${s.phone}`);
    });

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Error creating staff:', error);
    process.exit(1);
  }
}

createBranchStaff();
