// Seed Test Influencer Accounts
// Creates sample influencer accounts for testing tier assignment and verification

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Affiliate = require('./modules/database/models/Affiliate');

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/cbdwellness24';

// Test influencer data with different follower counts for tier testing
const testInfluencers = [
  {
    username: 'nano_influencer',
    email: 'nano@testinfluencer.com',
    fullName: 'Nano Test Influencer',
    phone: '+27821234567',
    socialMedia: {
      instagram: 'https://www.instagram.com/nano_influencer',
      tiktok: 'https://www.tiktok.com/@nano_influencer'
    },
    affiliateCode: 'NANO2024',
    affiliateType: 'influencer',
    commissionRate: 15,
    status: 'active',
    followers: 5000, // Nano: 1K-10K
    tier: 'Nano Influencer'
  },
  {
    username: 'micro_influencer',
    email: 'micro@testinfluencer.com',
    fullName: 'Micro Test Influencer',
    phone: '+27821234568',
    socialMedia: {
      instagram: 'https://www.instagram.com/micro_influencer',
      tiktok: 'https://www.tiktok.com/@micro_influencer'
    },
    affiliateCode: 'MICRO2024',
    affiliateType: 'influencer',
    commissionRate: 15,
    status: 'active',
    followers: 50000, // Micro: 10K-100K
    tier: 'Micro Influencer'
  },
  {
    username: 'mid_influencer',
    email: 'mid@testinfluencer.com',
    fullName: 'Mid-Tier Test Influencer',
    phone: '+27821234569',
    socialMedia: {
      instagram: 'https://www.instagram.com/mid_influencer',
      tiktok: 'https://www.tiktok.com/@mid_influencer',
      youtube: 'https://www.youtube.com/@mid_influencer'
    },
    affiliateCode: 'MID2024',
    affiliateType: 'influencer',
    commissionRate: 15,
    status: 'active',
    followers: 250000, // Mid: 100K-500K
    tier: 'Mid-Tier Influencer'
  },
  {
    username: 'macro_influencer',
    email: 'macro@testinfluencer.com',
    fullName: 'Macro Test Influencer',
    phone: '+27821234570',
    socialMedia: {
      instagram: 'https://www.instagram.com/macro_influencer',
      tiktok: 'https://www.tiktok.com/@macro_influencer',
      youtube: 'https://www.youtube.com/@macro_influencer'
    },
    affiliateCode: 'MACRO2024',
    affiliateType: 'influencer',
    commissionRate: 15,
    status: 'active',
    followers: 750000, // Macro: 500K-1M
    tier: 'Macro Influencer'
  },
  {
    username: 'mega_influencer',
    email: 'mega@testinfluencer.com',
    fullName: 'Mega Test Influencer',
    phone: '+27821234571',
    socialMedia: {
      instagram: 'https://www.instagram.com/mega_influencer',
      tiktok: 'https://www.tiktok.com/@mega_influencer',
      youtube: 'https://www.youtube.com/@mega_influencer',
      twitter: 'https://twitter.com/mega_influencer'
    },
    affiliateCode: 'MEGA2024',
    affiliateType: 'influencer',
    commissionRate: 15,
    status: 'active',
    followers: 2500000, // Mega: 1M+
    tier: 'Mega Influencer'
  },
  {
    username: 'standard_rep',
    email: 'rep@testinfluencer.com',
    fullName: 'Standard Rep Test',
    phone: '+27821234572',
    socialMedia: {
      instagram: 'https://www.instagram.com/standard_rep'
    },
    affiliateCode: 'REP2024',
    affiliateType: 'rep',
    commissionRate: 5,
    status: 'active',
    followers: 500, // Below influencer threshold
    tier: 'Standard Rep'
  }
];

async function seedTestInfluencers() {
  try {
    console.log('\n==============================================');
    console.log('Seeding Test Influencer Accounts');
    console.log('==============================================\n');

    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Hash password for all test accounts
    const hashedPassword = await bcrypt.hash('Influencer123!', 10);

    let createdCount = 0;
    let updatedCount = 0;

    for (const influencerData of testInfluencers) {
      const { followers, tier, ...affiliateData } = influencerData;

      // Check if influencer already exists
      const existing = await Affiliate.findOne({ email: affiliateData.email });

      if (existing) {
        // Update existing
        await Affiliate.updateOne(
          { email: affiliateData.email },
          {
            $set: {
              ...affiliateData,
              password: hashedPassword,
              approvedAt: new Date(),
              termsAccepted: true,
              termsAcceptedAt: new Date()
            }
          }
        );
        console.log(`Updated: ${affiliateData.username} (${tier})`);
        console.log(`  - Followers: ${followers.toLocaleString()}`);
        console.log(`  - Commission Rate: ${affiliateData.commissionRate}%`);
        console.log(`  - Status: ${affiliateData.status}`);
        updatedCount++;
      } else {
        // Create new
        await Affiliate.create({
          ...affiliateData,
          password: hashedPassword,
          approvedAt: new Date(),
          termsAccepted: true,
          termsAcceptedAt: new Date()
        });
        console.log(`Created: ${affiliateData.username} (${tier})`);
        console.log(`  - Followers: ${followers.toLocaleString()}`);
        console.log(`  - Commission Rate: ${affiliateData.commissionRate}%`);
        console.log(`  - Status: ${affiliateData.status}`);
        createdCount++;
      }
      console.log('');
    }

    console.log('==============================================');
    console.log('SUMMARY');
    console.log('==============================================');
    console.log(`Created: ${createdCount} accounts`);
    console.log(`Updated: ${updatedCount} accounts`);
    console.log(`Total: ${testInfluencers.length} test influencer accounts`);
    console.log('');
    console.log('Test Credentials:');
    console.log('  Password (all accounts): Influencer123!');
    console.log('');
    console.log('Influencer Tiers Created:');
    testInfluencers.forEach(inf => {
      console.log(`  - ${inf.username}: ${inf.tier} (${inf.followers.toLocaleString()} followers)`);
    });
    console.log('');
    console.log('Commission Rates:');
    console.log(`  - Influencers: 15%`);
    console.log(`  - Standard Reps: 5%`);
    console.log('==============================================\n');

    // Verify tier assignment logic
    console.log('TIER ASSIGNMENT VERIFICATION');
    console.log('==============================================');

    for (const inf of testInfluencers) {
      const expectedTier = determineInfluencerTier(inf.followers);
      const match = expectedTier === inf.tier;
      console.log(`${inf.username}:`);
      console.log(`  Followers: ${inf.followers.toLocaleString()}`);
      console.log(`  Expected Tier: ${expectedTier}`);
      console.log(`  Assigned Tier: ${inf.tier}`);
      console.log(`  Match: ${match ? 'PASS' : 'FAIL'}`);
      console.log('');
    }
    console.log('==============================================\n');

    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
    console.log('Test influencer seeding completed successfully!\n');

  } catch (error) {
    console.error('Error seeding test influencers:', error);
    process.exit(1);
  }
}

// Determine influencer tier based on followers (same logic as verification test)
function determineInfluencerTier(followers) {
  if (followers >= 1000000) return 'Mega Influencer';
  if (followers >= 500000) return 'Macro Influencer';
  if (followers >= 100000) return 'Mid-Tier Influencer';
  if (followers >= 10000) return 'Micro Influencer';
  if (followers >= 1000) return 'Nano Influencer';
  return 'Standard Rep';
}

// Run if called directly
if (require.main === module) {
  seedTestInfluencers()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

module.exports = { seedTestInfluencers, determineInfluencerTier };
