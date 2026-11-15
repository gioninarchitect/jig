// Unified Admin Vetting Queue — one place to approve/vet the 3 regulated parties:
//   Doctors/Pharmacists (MedicalServiceProvider), Suppliers (Supplier), Patients (User · Section 21).
// All parties land in their model's `pending` state via onboarding; an admin vets + approves/rejects here.
// Read-mostly aggregation + delegated approve/reject. No business logic duplicated — mirrors the same
// state transitions the per-model controllers already use (provider.activate, supplier.verify, patient KYC).
const MedicalServiceProvider = require('../modules/database/models/MedicalServiceProvider');
const Supplier = require('../modules/database/models/Supplier');
const User = require('../modules/database/models/User');

const actorId = (req) => req.user && (req.user.id || req.user._id || req.user.userId);

// Normalise each party to one row shape the queue UI renders uniformly.
function providerRow(p) {
  return {
    party: 'doctor',                                   // doctor covers prescriber/pharmacy/telehealth/lab
    subType: p.providerType,                            // 'prescriber' | 'pharmacy' | ...
    id: p._id,
    name: p.name,
    submittedAt: p.createdAt,
    documents: [
      { label: 'HPCSA / Company reg', value: p.registrationNumber || null },
      { label: 'Section 21 licence', value: p.licenseNumber || null },
      { label: 'Licence expiry', value: p.licenseExpiry || null },
      { label: 'Certifications', value: (p.certifications && p.certifications.length) ? p.certifications.join(', ') : null },
    ],
    meta: { providerType: p.providerType, sahpraApproved: p.compliance && p.compliance.sahpraApproved },
  };
}

function supplierRow(s) {
  const lic = s.license || {};
  return {
    party: 'supplier',
    subType: lic.type,                                  // cultivator | processor | distributor | manufacturer | importer
    id: s._id,
    name: s.name || s.legalName,
    submittedAt: s.createdAt,
    // Primary licence + the rich documents[] (license/certificate/insurance/tax_clearance/bbbee)
    documents: [
      { label: `Licence (${lic.type || 'n/a'})`, value: lic.number || lic.documentUrl || null, expiryDate: lic.expiryDate || null },
      ...(s.documents || []).map((d) => ({
        label: d.type, value: d.url || null, name: d.name || null, verified: !!d.verified, expiryDate: d.expiryDate || null,
      })),
    ],
    meta: { complianceStatus: s.complianceStatus, supplierType: lic.type },
  };
}

function patientRow(u) {
  return {
    party: 'patient',
    subType: 'section21',
    id: u._id,
    name: [u.firstName, u.lastName].filter(Boolean).join(' ') || u.username || u.email,
    submittedAt: u.createdAt,
    documents: [
      { label: 'ID document', value: u.kyc && u.kyc.idDocument && u.kyc.idDocument.url, verified: !!(u.kyc && u.kyc.idDocument && u.kyc.idDocument.verified) },
      { label: 'Section 21 script', value: u.kyc && u.kyc.section21 && u.kyc.section21.url, verified: !!(u.kyc && u.kyc.section21 && u.kyc.section21.verified) },
    ],
    meta: { section21Status: u.section21Status, kycStatus: u.kyc && u.kyc.status, email: u.email },
  };
}

// GET /api/v1/admin/vetting/pending — the unified queue across all 3 parties.
exports.getPending = async (req, res) => {
  try {
    const [doctors, suppliers, patients] = await Promise.all([
      MedicalServiceProvider.find({ status: 'pending' }).sort({ createdAt: 1 }).lean(),
      Supplier.find({ complianceStatus: 'pending' }).sort({ createdAt: 1 }).lean(),
      User.find({ section21Status: 'pending' }).select('firstName lastName username email kyc section21Status createdAt').sort({ createdAt: 1 }).lean(),
    ]);
    const queue = [
      ...doctors.map(providerRow),
      ...suppliers.map(supplierRow),
      ...patients.map(patientRow),
    ].sort((a, b) => new Date(a.submittedAt || 0) - new Date(b.submittedAt || 0));
    res.json({
      success: true,
      counts: { doctor: doctors.length, supplier: suppliers.length, patient: patients.length, total: queue.length },
      queue,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error loading vetting queue', error: err.message });
  }
};

// POST /api/v1/admin/vetting/:party/:id/approve
exports.approve = async (req, res) => {
  return transition(req, res, true);
};

// POST /api/v1/admin/vetting/:party/:id/reject   { reason }
exports.reject = async (req, res) => {
  return transition(req, res, false);
};

async function transition(req, res, approved) {
  const { party, id } = req.params;
  const reason = (req.body && req.body.reason) || '';
  try {
    if (party === 'doctor') {
      const p = await MedicalServiceProvider.findById(id);
      if (!p) return res.status(404).json({ success: false, message: 'Provider not found' });
      p.status = approved ? 'active' : 'inactive';
      if (!approved) p.rejectionReason = reason;
      await p.save();
      return res.json({ success: true, party, id, status: p.status });
    }
    if (party === 'supplier') {
      const s = await Supplier.findById(id);
      if (!s) return res.status(404).json({ success: false, message: 'Supplier not found' });
      s.complianceStatus = approved ? 'approved' : 'suspended';
      if (approved) { s.verifiedBy = actorId(req); s.verifiedAt = new Date(); }
      else { s.suspensionReason = reason; }
      await s.save();
      return res.json({ success: true, party, id, complianceStatus: s.complianceStatus });
    }
    if (party === 'patient') {
      const u = await User.findById(id);
      if (!u) return res.status(404).json({ success: false, message: 'Patient not found' });
      u.section21Status = approved ? 'approved' : 'rejected';
      if (u.kyc) u.kyc.status = approved ? 'verified' : 'rejected';
      await u.save();
      return res.json({ success: true, party, id, section21Status: u.section21Status });
    }
    return res.status(400).json({ success: false, message: `Unknown party '${party}' (expected doctor|supplier|patient)` });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error updating vetting status', error: err.message });
  }
}
