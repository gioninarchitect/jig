// Branches Controller — Business logic for branch management
const Branch = require('../modules/database/models/Branch');
const BranchInventory = require('../modules/database/models/BranchInventory');
const User = require('../modules/database/models/User');
const Sale = require('../modules/database/models/Sale');
const TillSession = require('../modules/database/models/TillSession');
const DailyCashup = require('../modules/database/models/DailyCashup');

// Get all active branches (public - for store locator)
exports.getAll = async (req, res) => {
  try {
    const { type, city, province, includeInactive } = req.query;

    const query = {};
    if (!includeInactive) query.isActive = true;
    if (type) query.type = type;
    if (city) query['address.city'] = new RegExp(city, 'i');
    if (province) query['address.province'] = new RegExp(province, 'i');

    const branches = await Branch.find(query)
      .select('-bankDetails -stats')
      .sort({ name: 1 });

    const branchesWithStatus = branches.map(branch => {
      const branchObj = branch.toObject();
      branchObj.isOpenNow = branch.isOpenNow();
      return branchObj;
    });

    res.json({ success: true, count: branchesWithStatus.length, branches: branchesWithStatus });
  } catch (error) {
    console.error('Error fetching branches:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get single branch details
exports.getById = async (req, res) => {
  try {
    const branch = await Branch.findById(req.params.id)
      .populate('manager', 'firstName lastName email');

    if (!branch) {
      return res.status(404).json({ success: false, message: 'Branch not found' });
    }

    const branchObj = branch.toObject();
    branchObj.isOpenNow = branch.isOpenNow();

    res.json({ success: true, branch: branchObj });
  } catch (error) {
    console.error('Error fetching branch:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get branch inventory
exports.getInventory = async (req, res) => {
  try {
    const branchId = req.params.id;

    // Internal service accounts and admin/owner can access any branch inventory
    const adminRoles = ['admin', 'owner', 'super_admin'];
    if (!adminRoles.includes(req.user.role)) {
      const user = await User.findById(req.user.id);
      if (!user.hasAccessToBranch(branchId)) {
        return res.status(403).json({ success: false, message: 'You do not have access to this branch' });
      }
    }

    const { lowStock, category, search } = req.query;

    let inventory;
    if (lowStock === 'true') {
      inventory = await BranchInventory.getLowStockItems(branchId);
    } else {
      const query = { branchId, isActive: true };
      inventory = await BranchInventory.find(query)
        .populate('productId', 'name sku category price images')
        .sort({ 'productId.name': 1 });
    }

    if (category) {
      inventory = inventory.filter(item => item.productId?.category === category);
    }

    if (search) {
      const searchLower = search.toLowerCase();
      inventory = inventory.filter(item =>
        item.productId?.name?.toLowerCase().includes(searchLower) ||
        item.productId?.sku?.toLowerCase().includes(searchLower)
      );
    }

    const inventoryValue = await BranchInventory.getBranchInventoryValue(branchId);

    res.json({ success: true, count: inventory.length, inventory, value: inventoryValue });
  } catch (error) {
    console.error('Error fetching branch inventory:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get branch statistics
exports.getStats = async (req, res) => {
  try {
    const branchId = req.params.id;
    const user = await User.findById(req.user.id);

    if (!user.hasAccessToBranch(branchId)) {
      return res.status(403).json({ success: false, message: 'You do not have access to this branch' });
    }

    const branch = await Branch.findById(branchId);
    if (!branch) {
      return res.status(404).json({ success: false, message: 'Branch not found' });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const weekStart = new Date(today);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

    const [todaySales, weekSales, monthSales] = await Promise.all([
      Sale.aggregate([
        { $match: { branchId: branch._id, createdAt: { $gte: today, $lt: tomorrow } } },
        { $group: { _id: null, total: { $sum: '$total' }, count: { $sum: 1 } } }
      ]),
      Sale.aggregate([
        { $match: { branchId: branch._id, createdAt: { $gte: weekStart } } },
        { $group: { _id: null, total: { $sum: '$total' }, count: { $sum: 1 } } }
      ]),
      Sale.aggregate([
        { $match: { branchId: branch._id, createdAt: { $gte: monthStart } } },
        { $group: { _id: null, total: { $sum: '$total' }, count: { $sum: 1 } } }
      ])
    ]);

    const inventoryStats = await BranchInventory.getBranchInventoryValue(branchId);
    const lowStockCount = await BranchInventory.countDocuments({
      branchId, isActive: true,
      $expr: { $lte: ['$quantity', '$lowStockThreshold'] }
    });

    const staffCount = await User.countDocuments({
      isActive: true,
      $or: [
        { 'assignedBranches.branch': branchId },
        { primaryBranch: branchId }
      ]
    });

    res.json({
      success: true,
      stats: {
        sales: {
          today: { total: todaySales[0]?.total || 0, count: todaySales[0]?.count || 0 },
          week: { total: weekSales[0]?.total || 0, count: weekSales[0]?.count || 0 },
          month: { total: monthSales[0]?.total || 0, count: monthSales[0]?.count || 0 }
        },
        inventory: { ...inventoryStats, lowStockItems: lowStockCount },
        staff: { count: staffCount },
        branch: {
          isActive: branch.isActive, isOpenNow: branch.isOpenNow(),
          activeTills: branch.activeTills.length
        }
      }
    });
  } catch (error) {
    console.error('Error fetching branch stats:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Create a new branch
exports.create = async (req, res) => {
  try {
    const {
      branchCode, name, type, address, phone, email, operatingHours, tills,
      hasLifestyleTrack, hasMedicalTrack, managerId, bankDetails, isFranchise, franchiseOwnerId
    } = req.body;

    if (!branchCode || !name || !phone) {
      return res.status(400).json({ success: false, message: 'Branch code, name, and phone are required' });
    }

    const existing = await Branch.findOne({ branchCode: branchCode.toUpperCase() });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Branch code already exists' });
    }

    const branch = new Branch({
      branchCode: branchCode.toUpperCase(), name, type: type || 'retail',
      address: address || {}, phone, email,
      operatingHours: operatingHours || [
        { day: 'Monday', open: '09:00', close: '17:00' },
        { day: 'Tuesday', open: '09:00', close: '17:00' },
        { day: 'Wednesday', open: '09:00', close: '17:00' },
        { day: 'Thursday', open: '09:00', close: '17:00' },
        { day: 'Friday', open: '09:00', close: '17:00' },
        { day: 'Saturday', open: '09:00', close: '17:00' },
        { day: 'Sunday', closed: true }
      ],
      tills: tills || [{ tillNumber: '1', name: 'Main Till', isActive: true }],
      hasLifestyleTrack: hasLifestyleTrack !== false,
      hasMedicalTrack: hasMedicalTrack || false,
      manager: managerId, bankDetails,
      isFranchise: isFranchise || false, franchiseOwnerId
    });

    await branch.save();

    if (managerId) {
      const manager = await User.findById(managerId);
      if (manager) await manager.assignToBranch(branch._id, true, req.user.id);
    }

    res.status(201).json({ success: true, message: 'Branch created successfully', branch });
  } catch (error) {
    console.error('Error creating branch:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update a branch
exports.update = async (req, res) => {
  try {
    const updates = req.body;
    delete updates.branchCode;
    delete updates._id;

    const branch = await Branch.findByIdAndUpdate(
      req.params.id, { $set: updates }, { new: true, runValidators: true }
    );

    if (!branch) {
      return res.status(404).json({ success: false, message: 'Branch not found' });
    }

    res.json({ success: true, message: 'Branch updated successfully', branch });
  } catch (error) {
    console.error('Error updating branch:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Deactivate a branch (soft delete)
exports.deactivate = async (req, res) => {
  try {
    const branch = await Branch.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
    if (!branch) {
      return res.status(404).json({ success: false, message: 'Branch not found' });
    }
    res.json({ success: true, message: 'Branch deactivated successfully', branch });
  } catch (error) {
    console.error('Error deactivating branch:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Reactivate a branch
exports.activate = async (req, res) => {
  try {
    const branch = await Branch.findByIdAndUpdate(req.params.id, { isActive: true }, { new: true });
    if (!branch) {
      return res.status(404).json({ success: false, message: 'Branch not found' });
    }
    res.json({ success: true, message: 'Branch activated successfully', branch });
  } catch (error) {
    console.error('Error activating branch:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get all staff assigned to a branch
exports.getStaff = async (req, res) => {
  try {
    const branchId = req.params.id;
    const user = await User.findById(req.user.id);

    if (req.user.role === 'branch_manager' && !user.hasAccessToBranch(branchId)) {
      return res.status(403).json({ success: false, message: 'You do not have access to this branch' });
    }

    const staff = await User.getStaffForBranch(branchId);

    res.json({
      success: true, count: staff.length,
      staff: staff.map(s => ({
        _id: s._id, firstName: s.firstName, lastName: s.lastName,
        fullName: s.fullName, email: s.email, role: s.role, staffInfo: s.staffInfo,
        isPrimary: s.assignedBranches?.some(ab => ab.branch?.toString() === branchId && ab.isPrimary),
        assignedAt: s.assignedBranches?.find(ab => ab.branch?.toString() === branchId)?.assignedAt
      }))
    });
  } catch (error) {
    console.error('Error fetching branch staff:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Assign staff to a branch
exports.assignStaff = async (req, res) => {
  try {
    const branchId = req.params.id;
    const { userId, isPrimary } = req.body;

    if (!userId) {
      return res.status(400).json({ success: false, message: 'User ID is required' });
    }

    const branch = await Branch.findById(branchId);
    if (!branch) {
      return res.status(404).json({ success: false, message: 'Branch not found' });
    }

    const staffMember = await User.findById(userId);
    if (!staffMember) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    await staffMember.assignToBranch(branchId, isPrimary || false, req.user.id);

    res.json({
      success: true,
      message: `${staffMember.fullName} assigned to ${branch.name}`,
      user: {
        _id: staffMember._id, fullName: staffMember.fullName,
        role: staffMember.role, assignedBranches: staffMember.assignedBranches
      }
    });
  } catch (error) {
    console.error('Error assigning staff to branch:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Remove staff from a branch
exports.removeStaff = async (req, res) => {
  try {
    const { id: branchId, userId } = req.params;

    const staffMember = await User.findById(userId);
    if (!staffMember) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    await staffMember.removeFromBranch(branchId);

    res.json({
      success: true,
      message: `${staffMember.fullName} removed from branch`,
      user: { _id: staffMember._id, fullName: staffMember.fullName, assignedBranches: staffMember.assignedBranches }
    });
  } catch (error) {
    console.error('Error removing staff from branch:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Add a till to a branch
exports.addTill = async (req, res) => {
  try {
    const { tillNumber, name, speedPointProvider, speedPointDeviceId } = req.body;

    if (!tillNumber) {
      return res.status(400).json({ success: false, message: 'Till number is required' });
    }

    const branch = await Branch.findById(req.params.id);
    if (!branch) {
      return res.status(404).json({ success: false, message: 'Branch not found' });
    }

    if (branch.tills.some(t => t.tillNumber === tillNumber)) {
      return res.status(400).json({ success: false, message: 'Till number already exists at this branch' });
    }

    branch.tills.push({
      tillNumber, name: name || `Till ${tillNumber}`,
      speedPointProvider: speedPointProvider || 'manual',
      speedPointDeviceId, isActive: true
    });

    await branch.save();

    res.json({ success: true, message: 'Till added successfully', tills: branch.tills });
  } catch (error) {
    console.error('Error adding till:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update a till
exports.updateTill = async (req, res) => {
  try {
    const { tillNumber } = req.params;
    const updates = req.body;

    const branch = await Branch.findById(req.params.id);
    if (!branch) {
      return res.status(404).json({ success: false, message: 'Branch not found' });
    }

    const till = branch.tills.find(t => t.tillNumber === tillNumber);
    if (!till) {
      return res.status(404).json({ success: false, message: 'Till not found' });
    }

    Object.assign(till, updates);
    await branch.save();

    res.json({ success: true, message: 'Till updated successfully', till });
  } catch (error) {
    console.error('Error updating till:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Owner Stats — per-branch live data for owner dashboard 360
exports.ownerStats = async (req, res) => {
  try {
    // Only return Origin-prefixed branches (exclude legacy ORM, FKS, etc.)
    const branches = await Branch.find({ branchCode: /^PG-/ }).select('name branchCode isActive address settings').lean();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

    const branchIds = branches.map(b => b._id);

    // Parallel queries across all branches
    const [todaySales, monthSales, inventoryStats, staffCounts, openTills, pendingCashups] = await Promise.all([
      // Today's sales per branch
      Sale.aggregate([
        { $match: { branchId: { $in: branchIds }, createdAt: { $gte: today, $lt: tomorrow }, status: 'completed' } },
        { $group: { _id: '$branchId', total: { $sum: '$totalAmount' }, count: { $sum: 1 } } }
      ]),
      // This month's sales per branch
      Sale.aggregate([
        { $match: { branchId: { $in: branchIds }, createdAt: { $gte: monthStart }, status: 'completed' } },
        { $group: { _id: '$branchId', total: { $sum: '$totalAmount' }, count: { $sum: 1 } } }
      ]),
      // Stock per branch
      BranchInventory.aggregate([
        { $match: { branchId: { $in: branchIds }, isActive: true } },
        { $lookup: { from: 'products', localField: 'productId', foreignField: '_id', as: 'product' } },
        { $unwind: { path: '$product', preserveNullAndEmptyArrays: true } },
        { $group: {
          _id: '$branchId',
          itemCount: { $sum: 1 },
          totalQty: { $sum: '$quantity' },
          totalValue: { $sum: { $multiply: ['$quantity', { $ifNull: ['$product.price', 0] }] } }
        }}
      ]),
      // Staff per branch
      User.aggregate([
        { $match: { isActive: true, role: { $in: ['branch_manager', 'branch_assistant', 'packer', 'dispatch_manager', 'inventory_manager'] } } },
        { $group: { _id: '$primaryBranch', count: { $sum: 1 } } }
      ]),
      // Open till sessions per branch
      TillSession.aggregate([
        { $match: { status: 'open' } },
        { $group: { _id: '$branchId', count: { $sum: 1 } } }
      ]),
      // Pending cashups per branch
      DailyCashup.aggregate([
        { $match: { status: 'submitted' } },
        { $group: { _id: '$branchId', count: { $sum: 1 } } }
      ])
    ]);

    // Build lookup maps
    const toMap = (arr) => {
      const m = {};
      arr.forEach(item => { if (item._id) m[item._id.toString()] = item; });
      return m;
    };
    const todayMap = toMap(todaySales);
    const monthMap = toMap(monthSales);
    const invMap = toMap(inventoryStats);
    const staffMap = toMap(staffCounts);
    const tillMap = toMap(openTills);
    const cashupMap = toMap(pendingCashups);

    const result = branches.map(b => {
      const id = b._id.toString();
      return {
        _id: b._id,
        name: b.name,
        branchCode: b.branchCode,
        isActive: b.isActive,
        address: b.address,
        cameraUrl: b.settings?.cameraUrl || null,
        cameraUrls: b.settings?.cameraUrls || [],
        todaySales: todayMap[id]?.total || 0,
        todayTransactions: todayMap[id]?.count || 0,
        monthSales: monthMap[id]?.total || 0,
        monthTransactions: monthMap[id]?.count || 0,
        stockItems: invMap[id]?.itemCount || 0,
        stockQty: invMap[id]?.totalQty || 0,
        stockValue: invMap[id]?.totalValue || 0,
        staffCount: staffMap[id]?.count || 0,
        openTills: tillMap[id]?.count || 0,
        pendingCashups: cashupMap[id]?.count || 0
      };
    });

    res.json({ success: true, branches: result });
  } catch (error) {
    console.error('Error fetching owner branch stats:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
