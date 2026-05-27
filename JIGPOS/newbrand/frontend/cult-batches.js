// cult-batches.js — Batch lifecycle tracking (seed → harvest) with kanban pipeline
// Depends on: cult-core.js

let allBatches = [];
let batchViewMode = 'kanban'; // 'kanban' | 'list'

const PHASES = ['propagation', 'vegetative', 'flowering', 'harvest_ready', 'harvested', 'processing', 'complete'];

async function loadBatches() {
    try {
        const res = await cultApiCall('/batches?status=active');
        if (res.success) {
            allBatches = res.batches;
        }

        // Also load completed for the full view
        const completedRes = await cultApiCall('/batches?status=completed');
        if (completedRes.success) {
            allBatches = allBatches.concat(completedRes.batches);
        }

        renderBatches();
    } catch (error) {
        console.error('Failed to load batches:', error);
    }
}

function toggleBatchView(mode) {
    batchViewMode = mode;
    document.querySelectorAll('.batch-view-toggle button').forEach(b => b.classList.remove('active'));
    event.target.classList.add('active');
    renderBatches();
}

function renderBatches() {
    const container = document.getElementById('batchesContent');
    if (!container) return;

    if (allBatches.length === 0) {
        container.innerHTML = `<div class="empty-state">
            <i class="fas fa-seedling"></i>
            <p>No batches yet. Create your first batch to start tracking.</p>
            <button class="cult-btn cult-btn-primary" onclick="showAddBatchModal()">
                <i class="fas fa-plus"></i> New Batch
            </button>
        </div>`;
        return;
    }

    if (batchViewMode === 'kanban') {
        renderKanban(container);
    } else {
        renderBatchList(container);
    }
}

function renderKanban(container) {
    const grouped = {};
    PHASES.forEach(p => { grouped[p] = []; });
    allBatches.forEach(b => {
        if (grouped[b.phase]) grouped[b.phase].push(b);
    });

    container.innerHTML = `<div class="kanban-container">
        ${PHASES.map(phase => `
            <div class="kanban-column">
                <div class="kanban-column-header">
                    <h4><i class="fas ${phaseIcon(phase)}"></i> ${phaseLabel(phase)}</h4>
                    <span class="count">${grouped[phase].length}</span>
                </div>
                ${grouped[phase].length === 0
                    ? '<div style="text-align: center; color: #444; font-size: 0.75rem; padding: 1rem;">No batches</div>'
                    : grouped[phase].map(b => renderBatchCard(b)).join('')
                }
            </div>
        `).join('')}
    </div>`;
}

function renderBatchCard(batch) {
    const zoneName = batch.zoneId?.name || '—';
    const daysInPhase = batch.daysInPhase || '—';
    const projDate = batch.projectedHarvestDate ? formatDate(batch.projectedHarvestDate) : '—';
    const docsComplete = batch.complianceChecklist?.batchDocumentation ? '<i class="fas fa-file-check" style="color: var(--cult-green);" title="Docs complete"></i>' : '';

    return `
        <div class="batch-card" onclick="showBatchDetail('${batch._id}')">
            <div class="batch-id">${batch.batchId} ${docsComplete}</div>
            <div class="batch-strain">${batch.strain}</div>
            <div class="batch-meta">
                <span><i class="fas fa-cannabis"></i> ${batch.plantCount} plants</span>
                <span><i class="fas fa-warehouse"></i> ${zoneName}</span>
                <span><i class="fas fa-clock"></i> ${daysInPhase}d</span>
            </div>
            ${batch.projectedHarvestDate ? `<div style="margin-top: 6px; font-size: 0.7rem; color: #555;"><i class="fas fa-calendar"></i> Proj. harvest: ${projDate}</div>` : ''}
        </div>
    `;
}

function renderBatchList(container) {
    const rows = allBatches.map(b => [
        `<span class="batch-id" style="cursor: pointer;" onclick="showBatchDetail('${b._id}')">${b.batchId}</span>`,
        b.strain,
        `<span class="phase-badge ${b.phase}">${phaseLabel(b.phase)}</span>`,
        b.plantCount,
        b.zoneId?.name || '—',
        b.daysInPhase != null ? b.daysInPhase + 'd' : '—',
        b.projectedHarvestDate ? formatDate(b.projectedHarvestDate) : '—',
        `<span class="status-badge ${b.status === 'active' ? 'green' : 'yellow'}">${b.status}</span>`
    ]);

    container.innerHTML = buildTable(
        ['Batch ID', 'Strain', 'Phase', 'Plants', 'Zone', 'Days', 'Proj. Harvest', 'Status'],
        rows,
        'No batches'
    );
}

function showAddBatchModal() {
    document.getElementById('batchModalTitle').textContent = 'New Batch';
    document.getElementById('batchForm').reset();
    document.getElementById('batchEditId').value = '';
    loadZoneSelectorForBatch();
    showModal('batchModal');
}

async function loadZoneSelectorForBatch() {
    try {
        const res = await cultApiCall('/zones?status=active');
        if (!res.success) return;
        const sel = document.getElementById('batchZone');
        if (!sel) return;
        sel.innerHTML = res.zones.map(z => `<option value="${z._id}">${z.name} (${zoneTypeLabel(z.type)})</option>`).join('');
    } catch (e) {}
}

async function saveBatch(e) {
    e.preventDefault();
    const id = document.getElementById('batchEditId').value;
    const data = {
        strain: document.getElementById('batchStrain').value,
        zoneId: document.getElementById('batchZone').value,
        plantCount: parseInt(document.getElementById('batchPlantCount').value),
        projectedHarvestDate: document.getElementById('batchProjHarvest').value || null,
        targetYield: parseFloat(document.getElementById('batchTargetYield').value) || 0,
        notes: document.getElementById('batchNotes').value
    };

    try {
        if (id) {
            await cultApiCall(`/batches/${id}`, 'PUT', data);
            showToast('Batch updated', 'success');
        } else {
            await cultApiCall('/batches', 'POST', data);
            showToast('Batch created', 'success');
        }
        hideModal('batchModal');
        loadBatches();
    } catch (error) {
        showToast(error.message || 'Failed to save batch', 'error');
    }
}

async function showBatchDetail(id) {
    try {
        const batch = allBatches.find(b => b._id === id);
        if (!batch) return;

        const timeline = (batch.phaseTransitions || []).map(t => `
            <div style="display: flex; gap: 12px; padding: 8px 0; border-bottom: 1px solid #1A1A1A;">
                <div style="color: #555; font-size: 0.75rem; min-width: 100px;">${formatDateTime(t.date)}</div>
                <div>
                    <span class="phase-badge ${t.to}">${phaseLabel(t.to)}</span>
                    ${t.notes ? `<span style="color: #777; font-size: 0.8rem; margin-left: 8px;">${t.notes}</span>` : ''}
                </div>
            </div>
        `).join('');

        // Find valid next phase
        const validTransitions = {
            propagation: ['vegetative'],
            vegetative: ['flowering'],
            flowering: ['harvest_ready'],
            harvest_ready: ['harvested'],
            harvested: ['processing'],
            processing: ['complete']
        };
        const nextPhases = validTransitions[batch.phase] || [];

        const detailHtml = `
            <div class="cult-modal-header">
                <h3>${batch.batchId} — ${batch.strain}</h3>
                <button class="cult-modal-close" onclick="hideModal('batchDetailModal')">&times;</button>
            </div>

            <div style="display: flex; gap: 8px; margin-bottom: 1rem;">
                <span class="phase-badge ${batch.phase}">${phaseLabel(batch.phase)}</span>
                <span class="status-badge ${batch.status === 'active' ? 'green' : 'yellow'}">${batch.status}</span>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1.5rem;">
                <div><strong style="color: #777; font-size: 0.75rem;">Plants:</strong> <span style="color: var(--or-white);">${batch.plantCount}</span></div>
                <div><strong style="color: #777; font-size: 0.75rem;">Zone:</strong> <span style="color: var(--or-white);">${batch.zoneId?.name || '—'}</span></div>
                <div><strong style="color: #777; font-size: 0.75rem;">Start Date:</strong> <span style="color: var(--or-white);">${formatDate(batch.startDate)}</span></div>
                <div><strong style="color: #777; font-size: 0.75rem;">Proj. Harvest:</strong> <span style="color: var(--or-white);">${batch.projectedHarvestDate ? formatDate(batch.projectedHarvestDate) : '—'}</span></div>
                <div><strong style="color: #777; font-size: 0.75rem;">Days in Phase:</strong> <span style="color: var(--or-white);">${batch.daysInPhase || '—'}</span></div>
                <div><strong style="color: #777; font-size: 0.75rem;">Target Yield:</strong> <span style="color: var(--or-white);">${batch.targetYield ? batch.targetYield + ' kg' : '—'}</span></div>
            </div>

            ${nextPhases.length > 0 && batch.status === 'active' ? `
                <div style="margin-bottom: 1.5rem; padding: 1rem; background: #1A1A1A; border-radius: 8px;">
                    <strong style="color: #777; font-size: 0.75rem; display: block; margin-bottom: 8px;">Advance Phase:</strong>
                    ${nextPhases.map(p => `
                        <button class="cult-btn cult-btn-primary cult-btn-sm" onclick="transitionBatch('${batch._id}', '${p}')" style="margin-right: 8px;">
                            <i class="fas ${phaseIcon(p)}"></i> Move to ${phaseLabel(p)}
                        </button>
                    `).join('')}
                </div>
            ` : ''}

            <div style="margin-bottom: 1rem;">
                <h4 style="font-family: Inter, sans-serif; color: #ccc; font-size: 0.85rem; margin-bottom: 8px;">Phase Timeline</h4>
                ${timeline || '<div style="color: #555; font-size: 0.8rem;">No transitions yet</div>'}
            </div>

            ${batch.notes ? `<div style="color: #999; font-size: 0.85rem; padding: 1rem; background: #1A1A1A; border-radius: 8px; margin-bottom: 1rem;"><strong>Notes:</strong> ${batch.notes}</div>` : ''}

            <!-- Nutrient Log -->
            <div style="margin-bottom: 1rem;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                    <h4 style="font-family: Inter, sans-serif; color: #ccc; font-size: 0.85rem; margin: 0;">
                        <i class="fas fa-flask" style="color: #22C55E;"></i> Nutrient Log
                    </h4>
                    <button class="cult-btn cult-btn-secondary cult-btn-sm" onclick="showNutrientForm('${batch._id}')">
                        <i class="fas fa-plus"></i> Add
                    </button>
                </div>
                <div id="nutrientFormArea-${batch._id}" style="display: none; padding: 12px; background: #1A1A1A; border-radius: 8px; margin-bottom: 8px;">
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                        <input type="text" id="nutProduct-${batch._id}" class="cult-input" placeholder="Product name" style="font-size: 0.8rem;">
                        <input type="text" id="nutAmount-${batch._id}" class="cult-input" placeholder="Amount (e.g. 5ml/L)" style="font-size: 0.8rem;">
                    </div>
                    <input type="text" id="nutNotes-${batch._id}" class="cult-input" placeholder="Notes (optional)" style="font-size: 0.8rem; margin-top: 8px;">
                    <div style="display: flex; gap: 8px; margin-top: 8px; justify-content: flex-end;">
                        <button class="cult-btn cult-btn-secondary cult-btn-sm" onclick="document.getElementById('nutrientFormArea-${batch._id}').style.display='none'">Cancel</button>
                        <button class="cult-btn cult-btn-primary cult-btn-sm" onclick="saveNutrientEntry('${batch._id}')">Save</button>
                    </div>
                </div>
                ${batch.nutrientLog && batch.nutrientLog.length > 0 ? `
                    <div style="max-height: 200px; overflow-y: auto;">
                    ${batch.nutrientLog.slice().reverse().map(n => `
                        <div style="display: flex; gap: 12px; padding: 6px 0; border-bottom: 1px solid #1A1A1A; font-size: 0.8rem;">
                            <span style="color: #555; min-width: 80px;">${formatDate(n.date)}</span>
                            <span style="color: #22C55E; font-weight: 500;">${n.product || '—'}</span>
                            <span style="color: #999;">${n.amount || ''}</span>
                            <span style="color: #666; font-style: italic;">${n.notes || ''}</span>
                        </div>
                    `).join('')}
                    </div>
                ` : '<div style="color: #444; font-size: 0.75rem;">No nutrient entries yet</div>'}
            </div>

            <!-- Pest & Disease Log -->
            <div style="margin-bottom: 1rem;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                    <h4 style="font-family: Inter, sans-serif; color: #ccc; font-size: 0.85rem; margin: 0;">
                        <i class="fas fa-bug" style="color: #F59E0B;"></i> Pest & Disease Log
                    </h4>
                    <button class="cult-btn cult-btn-secondary cult-btn-sm" onclick="showPestForm('${batch._id}')">
                        <i class="fas fa-plus"></i> Add
                    </button>
                </div>
                <div id="pestFormArea-${batch._id}" style="display: none; padding: 12px; background: #1A1A1A; border-radius: 8px; margin-bottom: 8px;">
                    <input type="text" id="pestObs-${batch._id}" class="cult-input" placeholder="Observation (e.g. spider mites on lower leaves)" style="font-size: 0.8rem;">
                    <input type="text" id="pestAction-${batch._id}" class="cult-input" placeholder="Action taken (e.g. applied neem oil)" style="font-size: 0.8rem; margin-top: 8px;">
                    <div style="display: flex; gap: 8px; margin-top: 8px; justify-content: flex-end;">
                        <button class="cult-btn cult-btn-secondary cult-btn-sm" onclick="document.getElementById('pestFormArea-${batch._id}').style.display='none'">Cancel</button>
                        <button class="cult-btn cult-btn-primary cult-btn-sm" onclick="savePestEntry('${batch._id}')">Save</button>
                    </div>
                </div>
                ${batch.pestLog && batch.pestLog.length > 0 ? `
                    <div style="max-height: 200px; overflow-y: auto;">
                    ${batch.pestLog.slice().reverse().map(p => `
                        <div style="display: flex; gap: 12px; padding: 6px 0; border-bottom: 1px solid #1A1A1A; font-size: 0.8rem;">
                            <span style="color: #555; min-width: 80px;">${formatDate(p.date)}</span>
                            <span style="color: #F59E0B;">${p.observation || '—'}</span>
                            <span style="color: #666;">→ ${p.action || 'No action'}</span>
                        </div>
                    `).join('')}
                    </div>
                ` : '<div style="color: #444; font-size: 0.75rem;">No pest/disease entries yet</div>'}
            </div>
        `;

        document.getElementById('batchDetailContent').innerHTML = detailHtml;
        showModal('batchDetailModal');
    } catch (error) {
        console.error('Failed to show batch detail:', error);
    }
}

async function transitionBatch(id, toPhase) {
    const notes = prompt(`Notes for transition to ${phaseLabel(toPhase)} (optional):`);

    try {
        await cultApiCall(`/batches/${id}/transition`, 'POST', { toPhase, notes: notes || '' });
        showToast(`Batch moved to ${phaseLabel(toPhase)}`, 'success');
        hideModal('batchDetailModal');
        loadBatches();
    } catch (error) {
        showToast(error.message || 'Failed to transition batch', 'error');
    }
}

// ============================================
// NUTRIENT & PEST LOG FORMS
// ============================================

function showNutrientForm(batchId) {
    const area = document.getElementById('nutrientFormArea-' + batchId);
    if (area) area.style.display = 'block';
}

function showPestForm(batchId) {
    const area = document.getElementById('pestFormArea-' + batchId);
    if (area) area.style.display = 'block';
}

async function saveNutrientEntry(batchId) {
    const product = document.getElementById('nutProduct-' + batchId)?.value;
    const amount = document.getElementById('nutAmount-' + batchId)?.value;
    const notes = document.getElementById('nutNotes-' + batchId)?.value;

    if (!product) {
        showToast('Product name is required', 'error');
        return;
    }

    try {
        await cultApiCall(`/batches/${batchId}/nutrient-log`, 'POST', { product, amount, notes });
        showToast('Nutrient entry added', 'success');
        await loadBatches();
        showBatchDetail(batchId);
    } catch (error) {
        showToast(error.message || 'Failed to add nutrient entry', 'error');
    }
}

async function savePestEntry(batchId) {
    const observation = document.getElementById('pestObs-' + batchId)?.value;
    const action = document.getElementById('pestAction-' + batchId)?.value;

    if (!observation) {
        showToast('Observation is required', 'error');
        return;
    }

    try {
        await cultApiCall(`/batches/${batchId}/pest-log`, 'POST', { observation, action });
        showToast('Pest entry added', 'success');
        await loadBatches();
        showBatchDetail(batchId);
    } catch (error) {
        showToast(error.message || 'Failed to add pest entry', 'error');
    }
}
