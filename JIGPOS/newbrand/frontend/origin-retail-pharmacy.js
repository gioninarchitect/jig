const PharmacyCore = (() => {
  const base = `${API_URL}/origin-retail/pharmacy-core`;

  function token() {
    return localStorage.getItem('adminToken') || sessionStorage.getItem('adminToken') || localStorage.getItem('token');
  }

  async function request(path, options = {}) {
    const res = await fetch(`${base}${path}`, {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token()}`,
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
    const payload = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(payload.message || payload.error || `Request failed: ${res.status}`);
    return payload;
  }

  return {
    listPharmacies: () => request('/pharmacies'),
    createPharmacy: (body) => request('/pharmacies', { method: 'POST', body }),
    addDocument: (pharmacyId, body) => request(`/pharmacies/${pharmacyId}/documents`, { method: 'POST', body }),
    reviewDocument: (pharmacyId, documentId, body) => request(`/pharmacies/${pharmacyId}/documents/${documentId}/review`, { method: 'PATCH', body }),
    addUser: (pharmacyId, body) => request(`/pharmacies/${pharmacyId}/users`, { method: 'POST', body }),
    activatePharmacy: (pharmacyId) => request(`/pharmacies/${pharmacyId}/activate`, { method: 'POST', body: {} }),
    createOrder: (body) => request('/orders', { method: 'POST', body }),
    getOrder: (orderId) => request(`/orders/${orderId}`),
    confirmSection21: (orderId, body) => request(`/orders/${orderId}/confirm-section21-dispensing`, { method: 'POST', body }),
    recordPayment: (orderId, body) => request(`/orders/${orderId}/payment-events`, { method: 'POST', body }),
    createInventoryBatch: (body) => request('/inventory/batches', { method: 'POST', body }),
    packOrder: (orderId, body) => request(`/orders/${orderId}/pack`, { method: 'POST', body }),
    dispatchOrder: (orderId, body) => request(`/orders/${orderId}/dispatch-to-pharmacy`, { method: 'POST', body }),
    pharmacyArrival: (orderId, body) => request(`/orders/${orderId}/pharmacy-arrival`, { method: 'POST', body }),
    verifyOtp: (orderId, body) => request(`/orders/${orderId}/verify-collection-otp`, { method: 'POST', body }),
    collectOrder: (orderId, body) => request(`/orders/${orderId}/collect`, { method: 'POST', body }),
    requestReturn: (orderId, body) => request(`/orders/${orderId}/request-return`, { method: 'POST', body }),
    receiveReturn: (orderId, body) => request(`/orders/${orderId}/receive-return`, { method: 'POST', body }),
    runExpiry: () => request('/jobs/uncollected-expiry/run', { method: 'POST', body: {} }),
    ledger: (pharmacyId) => request(`/ledger${pharmacyId ? `?pharmacyId=${encodeURIComponent(pharmacyId)}` : ''}`),
    refunds: () => request('/refunds-payable'),
    createSettlement: (body) => request('/pharmacy-settlements', { method: 'POST', body }),
    updateSettlementStatus: (settlementId, body) => request(`/pharmacy-settlements/${settlementId}/status`, { method: 'PATCH', body }),
    updateRefundStatus: (refundId, body) => request(`/refunds-payable/${refundId}/status`, { method: 'PATCH', body }),
    audit: (entityType, entityId) => {
      const params = new URLSearchParams();
      if (entityType) params.set('entityType', entityType);
      if (entityId) params.set('entityId', entityId);
      return request(`/audit-events${params.toString() ? `?${params}` : ''}`);
    },
  };
})();

function el(id) { return document.getElementById(id); }
function val(id) { return el(id).value.trim(); }
function num(id) { const n = Number(val(id)); return Number.isFinite(n) ? n : 0; }

function showResult(data) {
  el('lastResult').textContent = JSON.stringify(data, null, 2);
}

function toast(message, type = 'info') {
  const node = el('toast');
  node.textContent = message;
  node.className = `toast show ${type}`;
  setTimeout(() => { node.className = 'toast'; }, 3500);
}

function setSelectedPharmacy(id) {
  ['pharmacyId', 'docPharmacyId', 'userPharmacyId', 'orderPharmacyId', 'settlementPharmacyId'].forEach((field) => {
    el(field).value = id;
  });
  toast('Pharmacy selected', 'success');
}

async function refreshPharmacies() {
  try {
    const data = await PharmacyCore.listPharmacies();
    el('pharmacyRows').innerHTML = (data.pharmacies || []).map((p) => `
      <tr>
        <td>${p.facility_name}</td>
        <td>${p.status}</td>
        <td>${p.vault_status ? 'Enabled' : 'Disabled'}</td>
        <td>${p.license_number || '-'}</td>
        <td>${p.handling_fee_type} ${p.handling_fee_value}</td>
        <td><button onclick="setSelectedPharmacy('${p.id}')">Use</button></td>
      </tr>
    `).join('');
    showResult(data);
  } catch (error) {
    toast(error.message, 'error');
  }
}

async function createPharmacy() {
  try {
    const data = await PharmacyCore.createPharmacy({
      facilityName: val('facilityName'),
      licenseNumber: val('licenseNumber'),
      licenseExpiry: val('licenseExpiry') || null,
      responsiblePharmacistName: val('rpName'),
      responsiblePharmacistEmail: val('rpEmail'),
      responsiblePharmacistRegistration: val('rpReg'),
      contactEmail: val('contactEmail'),
      contactPhone: val('contactPhone'),
      addressCity: val('addressCity'),
      addressProvince: val('addressProvince'),
      handlingFeeType: val('handlingFeeType'),
      handlingFeeValue: num('handlingFeeValue'),
    });
    showResult(data);
    toast('Pharmacy created', 'success');
    refreshPharmacies();
  } catch (error) {
    toast(error.message, 'error');
  }
}

async function addDocument() {
  try {
    const data = await PharmacyCore.addDocument(val('docPharmacyId'), {
      docType: val('docType'),
      fileName: val('docFileName') || `${val('docType')}.pdf`,
      filePath: val('docFilePath') || `/uploads/pharmacy/${val('docType')}.pdf`,
      mimeType: 'application/pdf',
      expiryDate: val('docExpiry') || null,
    });
    el('reviewDocumentId').value = data.document.id;
    showResult(data);
    toast('Document added', 'success');
  } catch (error) {
    toast(error.message, 'error');
  }
}

async function reviewDocument(status) {
  try {
    const data = await PharmacyCore.reviewDocument(val('docPharmacyId'), val('reviewDocumentId'), {
      status,
      adminNotes: val('reviewNotes'),
    });
    showResult(data);
    toast(`Document ${status}`, 'success');
  } catch (error) {
    toast(error.message, 'error');
  }
}

async function addPharmacyUser() {
  try {
    const role = val('pharmacyUserRole');
    const data = await PharmacyCore.addUser(val('userPharmacyId'), {
      email: val('pharmacyUserEmail'),
      name: val('pharmacyUserName'),
      role,
      registrationNumber: val('pharmacyUserReg'),
      canScanArrivals: ['RESPONSIBLE_PHARMACIST', 'PHARMACIST', 'PHARMACY_ASSISTANT'].includes(role),
      canReleaseCollections: ['RESPONSIBLE_PHARMACIST', 'PHARMACIST'].includes(role),
      canMarkReturns: ['RESPONSIBLE_PHARMACIST', 'PHARMACIST', 'PHARMACY_ASSISTANT'].includes(role),
      canViewSettlements: ['RESPONSIBLE_PHARMACIST', 'PHARMACY_ADMIN'].includes(role),
    });
    showResult(data);
    toast('Pharmacy user added', 'success');
  } catch (error) {
    toast(error.message, 'error');
  }
}

async function activatePharmacy() {
  try {
    const data = await PharmacyCore.activatePharmacy(val('pharmacyId'));
    showResult(data);
    toast('Pharmacy activated', 'success');
    refreshPharmacies();
  } catch (error) {
    toast(error.message, 'error');
  }
}

async function createPharmacyOrder() {
  try {
    const total = num('orderTotal');
    const data = await PharmacyCore.createOrder({
      orderNumber: val('orderNumber') || `ORP-${Date.now()}`,
      pharmacyId: val('orderPharmacyId'),
      total,
      medicationTotal: total,
      consultationFee: num('consultationFee'),
      collectionOtp: val('collectionOtp') || '123456',
      collectionOtpExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      section21DocumentRef: val('section21Ref') || null,
      prescriptionReference: val('prescriptionRef') || null,
      prescriberReference: val('prescriberRef') || null,
      section21Verified: Boolean(val('section21Ref') || val('prescriptionRef')),
      dispensingPartnerConfirmed: Boolean(val('orderPharmacyId')),
      items: [{
        sku: val('itemSku') || 'SECTION21-MED',
        name: val('itemName') || 'Section 21 Medicine',
        quantity: num('itemQty') || 1,
        unitPrice: total,
        totalPrice: total,
      }],
    });
    el('orderId').value = data.order.id;
    showResult(data);
    toast('Order created', 'success');
  } catch (error) {
    toast(error.message, 'error');
  }
}

async function confirmSection21() {
  try {
    const data = await PharmacyCore.confirmSection21(val('orderId'), {
      section21DocumentRef: val('section21Ref'),
      prescriptionReference: val('prescriptionRef'),
      prescriberReference: val('prescriberRef'),
    });
    showResult(data);
    toast('Section 21 dispensing confirmed', 'success');
  } catch (error) {
    toast(error.message, 'error');
  }
}

async function recordPayment() {
  try {
    const amount = num('paymentAmount') || num('orderTotal');
    const data = await PharmacyCore.recordPayment(val('orderId'), {
      gateway: 'manual',
      gatewayReference: val('paymentRef') || `PAY-${Date.now()}`,
      eventType: 'paid',
      amount,
      allocations: [{ allocationType: 'medication_total', amount }],
    });
    showResult(data);
    toast('Payment recorded', 'success');
  } catch (error) {
    toast(error.message, 'error');
  }
}

async function runOrderAction(action) {
  try {
    let data;
    if (action === 'pack') {
      const itemId = val('packOrderItemId');
      const batchId = val('inventoryBatchId');
      const quantity = num('packQty') || num('itemQty') || 1;
      data = await PharmacyCore.packOrder(val('orderId'), {
        items: itemId && batchId ? [{ orderItemId: itemId, inventoryBatchId: batchId, quantity }] : [],
      });
    }
    if (action === 'dispatch') data = await PharmacyCore.dispatchOrder(val('orderId'), { courierName: val('courierName') || 'Internal Courier' });
    if (action === 'arrival') data = await PharmacyCore.pharmacyArrival(val('orderId'), {});
    if (action === 'verify') data = await PharmacyCore.verifyOtp(val('orderId'), { collectionOtp: val('collectionOtp') });
    if (action === 'collect') data = await PharmacyCore.collectOrder(val('orderId'), { collectionOtp: val('collectionOtp') });
    if (action === 'requestReturn') data = await PharmacyCore.requestReturn(val('orderId'), { reasonCode: 'uncollected_expired' });
    if (action === 'receiveReturn') data = await PharmacyCore.receiveReturn(val('orderId'), {});
    showResult(data);
    toast(`${action} complete`, 'success');
  } catch (error) {
    toast(error.message, 'error');
  }
}

async function createSettlement() {
  try {
    const data = await PharmacyCore.createSettlement({
      pharmacyId: val('settlementPharmacyId'),
      periodStart: val('periodStart'),
      periodEnd: val('periodEnd'),
    });
    showResult(data);
    toast('Settlement created', 'success');
  } catch (error) {
    toast(error.message, 'error');
  }
}

async function loadLedger() {
  try { showResult(await PharmacyCore.ledger(val('settlementPharmacyId'))); } catch (error) { toast(error.message, 'error'); }
}
async function loadRefunds() {
  try { showResult(await PharmacyCore.refunds()); } catch (error) { toast(error.message, 'error'); }
}
async function loadAudit() {
  try { showResult(await PharmacyCore.audit(val('auditEntityType'), val('auditEntityId'))); } catch (error) { toast(error.message, 'error'); }
}
async function runExpiry() {
  try {
    const data = await PharmacyCore.runExpiry();
    showResult(data);
    toast(`Expiry complete: ${data.expired || 0}`, 'success');
  } catch (error) {
    toast(error.message, 'error');
  }
}

async function createInventoryBatch() {
  try {
    const data = await PharmacyCore.createInventoryBatch({
      sku: val('inventorySku') || val('itemSku') || 'SECTION21-MED',
      productName: val('inventoryProductName') || val('itemName') || 'Section 21 Medicine',
      batchNumber: val('inventoryBatchNumber'),
      lotNumber: val('inventoryLotNumber'),
      expiryDate: val('inventoryExpiryDate') || null,
      quantityOnHand: num('inventoryQty'),
    });
    el('inventoryBatchId').value = data.batch.id;
    showResult(data);
    toast('Inventory batch created', 'success');
  } catch (error) {
    toast(error.message, 'error');
  }
}

async function loadOrderDetail() {
  try {
    const data = await PharmacyCore.getOrder(val('orderId'));
    if (data.items && data.items[0]) el('packOrderItemId').value = data.items[0].id;
    showResult(data);
    toast('Order detail loaded', 'success');
  } catch (error) {
    toast(error.message, 'error');
  }
}

async function updateSettlementStatus() {
  try {
    const data = await PharmacyCore.updateSettlementStatus(val('settlementId'), { status: val('settlementStatus') });
    showResult(data);
    toast('Settlement status updated', 'success');
  } catch (error) {
    toast(error.message, 'error');
  }
}

async function updateRefundStatus() {
  try {
    const data = await PharmacyCore.updateRefundStatus(val('refundId'), { status: val('refundStatus') });
    showResult(data);
    toast('Refund status updated', 'success');
  } catch (error) {
    toast(error.message, 'error');
  }
}

window.addEventListener('load', refreshPharmacies);
