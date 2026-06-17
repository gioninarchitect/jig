// Medical Providers Controller — Business logic for medical service provider management
const MedicalServiceProvider = require('../modules/database/models/MedicalServiceProvider');
const logger = require('../modules/logger');

// Get providers for patient portal (public, auth gets personalized results)
exports.getPortal = async (req, res) => {
  try {
    const { type, province, city, branch } = req.query;

    const options = {};
    if (type) options.providerType = type;
    if (province) options.province = province;
    if (branch) options.branch = branch;

    const providers = await MedicalServiceProvider.getForPatientPortal(options);

    // If city filter, apply it
    let results = providers;
    if (city) {
      results = providers.filter(p =>
        p.address?.city?.toLowerCase().includes(city.toLowerCase())
      );
    }

    res.json({
      success: true,
      providers: results,
      count: results.length
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get prescribers by location (for patient "Find a Doctor")
exports.getPrescribers = async (req, res) => {
  try {
    const { province, city } = req.query;

    if (!province) {
      return res.status(400).json({
        success: false,
        message: 'Province is required'
      });
    }

    const prescribers = await MedicalServiceProvider.getPrescribersByLocation(province, city);

    res.json({
      success: true,
      prescribers,
      count: prescribers.length
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get single provider by slug (public profile page)
exports.getProfile = async (req, res) => {
  try {
    const provider = await MedicalServiceProvider.findOne({
      slug: req.params.slug,
      status: 'active',
      showInPatientPortal: true
    }).select('-integration -notes -createdBy -lastModifiedBy');

    if (!provider) {
      return res.status(404).json({ success: false, message: 'Provider not found' });
    }

    res.json({ success: true, provider });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get featured providers (for homepage/dashboard)
exports.getFeatured = async (req, res) => {
  try {
    const featured = await MedicalServiceProvider.find({
      featuredProvider: true,
      status: 'active',
      showInPatientPortal: true
    })
    .select('name slug providerType shortDescription logoUrl rating consultationOptions')
    .limit(6)
    .sort({ displayOrder: 1 });

    res.json({ success: true, providers: featured });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get all providers (admin)
exports.getAll = async (req, res) => {
  try {
    const { status, type, branch, page = 1, limit = 50 } = req.query;

    const query = {};
    if (status) query.status = status;
    if (type) query.providerType = type;
    if (branch) query['servicedBranches.branch'] = branch;

    const providers = await MedicalServiceProvider.find(query)
      .populate('servicedBranches.branch', 'name branchCode')
      .populate('suppliedProducts.product', 'name sku')
      .populate('createdBy', 'firstName lastName')
      .sort('-createdAt')
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await MedicalServiceProvider.countDocuments(query);

    res.json({
      success: true,
      providers,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get single provider (admin)
exports.getById = async (req, res) => {
  try {
    const provider = await MedicalServiceProvider.findById(req.params.id)
      .populate('servicedBranches.branch', 'name branchCode address')
      .populate('suppliedProducts.product', 'name sku category')
      .populate('createdBy', 'firstName lastName')
      .populate('activatedBy', 'firstName lastName');

    if (!provider) {
      return res.status(404).json({ success: false, message: 'Provider not found' });
    }

    res.json({ success: true, provider });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Create provider
exports.create = async (req, res) => {
  try {
    const provider = new MedicalServiceProvider({
      ...req.body,
      createdBy: req.user.id
    });

    await provider.save();

    res.status(201).json({ success: true, provider });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// Update provider
exports.update = async (req, res) => {
  try {
    const provider = await MedicalServiceProvider.findByIdAndUpdate(
      req.params.id,
      {
        ...req.body,
        lastModifiedBy: req.user.id
      },
      { new: true, runValidators: true }
    );

    if (!provider) {
      return res.status(404).json({ success: false, message: 'Provider not found' });
    }

    res.json({ success: true, provider });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// Activate provider
exports.activate = async (req, res) => {
  try {
    const provider = await MedicalServiceProvider.findByIdAndUpdate(
      req.params.id,
      {
        status: 'active',
        activatedAt: new Date(),
        activatedBy: req.user.id
      },
      { new: true }
    );

    if (!provider) {
      return res.status(404).json({ success: false, message: 'Provider not found' });
    }

    res.json({ success: true, message: 'Provider activated', provider });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Suspend provider
exports.suspend = async (req, res) => {
  try {
    const { reason } = req.body;

    const provider = await MedicalServiceProvider.findByIdAndUpdate(
      req.params.id,
      {
        status: 'suspended',
        suspensionReason: reason,
        lastModifiedBy: req.user.id
      },
      { new: true }
    );

    if (!provider) {
      return res.status(404).json({ success: false, message: 'Provider not found' });
    }

    res.json({ success: true, message: 'Provider suspended', provider });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Delete provider
exports.remove = async (req, res) => {
  try {
    const provider = await MedicalServiceProvider.findByIdAndDelete(req.params.id);

    if (!provider) {
      return res.status(404).json({ success: false, message: 'Provider not found' });
    }

    res.json({ success: true, message: 'Provider deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Link provider to branches
exports.linkBranches = async (req, res) => {
  try {
    const { branches } = req.body; // Array of { branchId, isPreferred, deliveryDays, minOrderValue, leadTimeDays }

    const provider = await MedicalServiceProvider.findById(req.params.id);
    if (!provider) {
      return res.status(404).json({ success: false, message: 'Provider not found' });
    }

    // Add or update branch linkages
    for (const branchData of branches) {
      const existingIndex = provider.servicedBranches.findIndex(
        sb => sb.branch?.toString() === branchData.branchId
      );

      const linkage = {
        branch: branchData.branchId,
        isPreferred: branchData.isPreferred || false,
        deliveryDays: branchData.deliveryDays || [],
        minOrderValue: branchData.minOrderValue || 0,
        leadTimeDays: branchData.leadTimeDays || 3
      };

      if (existingIndex >= 0) {
        provider.servicedBranches[existingIndex] = linkage;
      } else {
        provider.servicedBranches.push(linkage);
      }
    }

    provider.lastModifiedBy = req.user.id;
    await provider.save();

    res.json({ success: true, provider });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// Remove branch linkage
exports.unlinkBranch = async (req, res) => {
  try {
    const provider = await MedicalServiceProvider.findById(req.params.id);
    if (!provider) {
      return res.status(404).json({ success: false, message: 'Provider not found' });
    }

    provider.servicedBranches = provider.servicedBranches.filter(
      sb => sb.branch?.toString() !== req.params.branchId
    );

    provider.lastModifiedBy = req.user.id;
    await provider.save();

    res.json({ success: true, message: 'Branch linkage removed', provider });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get suppliers for a branch (for PO creation)
exports.getSuppliersForBranch = async (req, res) => {
  try {
    const suppliers = await MedicalServiceProvider.getSuppliersForBranch(req.params.branchId);

    res.json({ success: true, suppliers });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Link products to supplier
exports.linkProducts = async (req, res) => {
  try {
    const { products } = req.body; // Array of { productId, wholesalePrice, minOrderQty }

    const provider = await MedicalServiceProvider.findById(req.params.id);
    if (!provider) {
      return res.status(404).json({ success: false, message: 'Provider not found' });
    }

    if (!['supplier', 'both'].includes(provider.providerType)) {
      return res.status(400).json({
        success: false,
        message: 'Provider must be a supplier to link products'
      });
    }

    for (const productData of products) {
      const existingIndex = provider.suppliedProducts.findIndex(
        sp => sp.product?.toString() === productData.productId
      );

      const linkage = {
        product: productData.productId,
        wholesalePrice: productData.wholesalePrice,
        minOrderQty: productData.minOrderQty || 1,
        isActive: true
      };

      if (existingIndex >= 0) {
        provider.suppliedProducts[existingIndex] = linkage;
      } else {
        provider.suppliedProducts.push(linkage);
      }
    }

    provider.lastModifiedBy = req.user.id;
    await provider.save();

    res.json({ success: true, provider });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};
