const mongoose = require('mongoose');
const User = require('./backend/modules/database/models/User');
const ModuleInstallation = require('./backend/modules/database/models/ModuleInstallation');

async function installModule() {
    try {
        await mongoose.connect('mongodb://localhost:27017/bmh');
        console.log('Connected to MongoDB');

        const user = await User.findOne({ email: 'user@basothomedicalherbs.ls' });
        if (!user) {
            console.log('User not found');
            process.exit(1);
        }

        console.log('User found:', user.email);

        // Check if already installed
        const existing = await ModuleInstallation.findOne({
            businessId: user._id,
            moduleId: 'retail-store'
        });

        if (existing) {
            console.log('Module already installed, updating status to active');
            existing.status = 'active';
            existing.subscription.paymentStatus = 'paid';
            await existing.save();
        } else {
            console.log('Installing retail-store module...');
            const installation = await ModuleInstallation.create({
                businessId: user._id,
                moduleId: 'retail-store',
                status: 'active',
                installedAt: new Date(),
                subscription: {
                    startDate: new Date(),
                    paymentStatus: 'paid'
                }
            });
            console.log('Module installed:', installation.moduleId);
        }

        console.log('✅ Drive-through module is now active for user@basothomedicalherbs.ls');
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

installModule();
