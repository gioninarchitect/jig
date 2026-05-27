// cult-harvest.js — Harvest records + yield tracking
// Depends on: cult-core.js, Chart.js

let allHarvests = [];
let yieldChart = null;
let yieldByStrainChart = null;

async function loadHarvests() {
    try {
        const res = await cultApiCall('/harvests');
        if (res.success) {
            allHarvests = res.harvests;
            renderHarvestTable();
            renderYieldAnalytics();
        }
    } catch (error) {
        console.error('Failed to load harvests:', error);
    }
}

function renderHarvestTable() {
    const container = document.getElementById('harvestTable');
    if (!container) return;

    if (allHarvests.length === 0) {
        container.innerHTML = `<div class="empty-state">
            <i class="fas fa-cut"></i>
            <p>No harvest records yet. Record your first harvest when a batch is ready.</p>
        </div>`;
        return;
    }

    const rows = allHarvests.map(h => [
        h.batchId?.batchId || '—',
        h.strain,
        h.zoneId?.name || '—',
        formatDate(h.harvestDate),
        formatWeight(h.wetWeight),
        formatWeight(h.dryWeight),
        h.yieldPercent ? h.yieldPercent.toFixed(1) + '%' : '—',
        h.qualityGrade ? `<span class="status-badge ${h.qualityGrade === 'A' ? 'green' : h.qualityGrade === 'B' ? 'yellow' : 'red'}">${h.qualityGrade}</span>` : '—',
        `<span class="status-badge ${h.labResults?.status === 'passed' ? 'green' : h.labResults?.status === 'failed' ? 'red' : 'yellow'}">${h.labResults?.status || 'pending'}</span>`,
        h.labResults?.thc ? h.labResults.thc + '%' : '—',
        h.labResults?.cbd ? h.labResults.cbd + '%' : '—'
    ]);

    container.innerHTML = buildTable(
        ['Batch', 'Strain', 'Zone', 'Date', 'Wet', 'Dry', 'Yield%', 'Grade', 'Lab', 'THC', 'CBD'],
        rows,
        'No harvests'
    );
}

function renderYieldAnalytics() {
    if (allHarvests.length === 0) return;

    // Yield by strain chart
    const strainData = {};
    allHarvests.forEach(h => {
        if (!strainData[h.strain]) strainData[h.strain] = { totalDry: 0, count: 0 };
        strainData[h.strain].totalDry += h.dryWeight || 0;
        strainData[h.strain].count++;
    });

    const strainCanvas = document.getElementById('yieldByStrainChart');
    if (strainCanvas) {
        if (yieldByStrainChart) yieldByStrainChart.destroy();

        const strains = Object.keys(strainData);
        const avgYields = strains.map(s => Math.round(strainData[s].totalDry / strainData[s].count));

        yieldByStrainChart = new Chart(strainCanvas, {
            type: 'bar',
            data: {
                labels: strains,
                datasets: [{
                    label: 'Avg Dry Weight (g)',
                    data: avgYields,
                    backgroundColor: 'rgba(201, 168, 76, 0.6)',
                    borderColor: '#C9A84C',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { labels: { color: '#999' } } },
                scales: {
                    x: { ticks: { color: '#666' }, grid: { color: '#1A1A1A' } },
                    y: { ticks: { color: '#999' }, grid: { color: '#1A1A1A' }, title: { display: true, text: 'Grams', color: '#777' } }
                }
            }
        });
    }

    // Yield trend over time
    const trendCanvas = document.getElementById('yieldTrendChart');
    if (trendCanvas) {
        if (yieldChart) yieldChart.destroy();

        const sorted = [...allHarvests].sort((a, b) => new Date(a.harvestDate) - new Date(b.harvestDate));
        const labels = sorted.map(h => formatDate(h.harvestDate));
        const dryWeights = sorted.map(h => h.dryWeight || 0);

        yieldChart = new Chart(trendCanvas, {
            type: 'line',
            data: {
                labels,
                datasets: [{
                    label: 'Dry Weight (g)',
                    data: dryWeights,
                    borderColor: '#22C55E',
                    backgroundColor: 'rgba(34,197,94,0.1)',
                    tension: 0.3,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { labels: { color: '#999' } } },
                scales: {
                    x: { ticks: { color: '#666' }, grid: { color: '#1A1A1A' } },
                    y: { ticks: { color: '#999' }, grid: { color: '#1A1A1A' } }
                }
            }
        });
    }
}

function showAddHarvestModal() {
    document.getElementById('harvestForm').reset();
    loadBatchSelectorForHarvest();
    showModal('harvestModal');
}

async function loadBatchSelectorForHarvest() {
    try {
        const res = await cultApiCall('/batches?status=active');
        if (!res.success) return;

        const sel = document.getElementById('harvestBatch');
        if (!sel) return;

        // Only show batches in harvest_ready or flowering
        const eligible = res.batches.filter(b => ['harvest_ready', 'flowering'].includes(b.phase));
        sel.innerHTML = '<option value="">Select batch...</option>' +
            eligible.map(b => `<option value="${b._id}" data-strain="${b.strain}" data-zone="${b.zoneId?._id || ''}" data-plants="${b.plantCount}">${b.batchId} — ${b.strain} (${phaseLabel(b.phase)})</option>`).join('');
    } catch (e) {}
}

function onHarvestBatchSelect(select) {
    const opt = select.options[select.selectedIndex];
    if (opt.dataset.strain) {
        document.getElementById('harvestStrain').value = opt.dataset.strain;
    }
    if (opt.dataset.plants) {
        document.getElementById('harvestPlants').value = opt.dataset.plants;
    }
}

async function saveHarvest(e) {
    e.preventDefault();

    const batchSelect = document.getElementById('harvestBatch');
    const batchOpt = batchSelect.options[batchSelect.selectedIndex];
    const photoInput = document.getElementById('harvestPhoto');
    const hasPhoto = photoInput && photoInput.files && photoInput.files.length > 0;

    const strain = document.getElementById('harvestStrain').value;
    const wetWeight = parseFloat(document.getElementById('harvestWet').value) || 0;

    if (!strain || !wetWeight) {
        showToast('Strain and wet weight are required', 'error');
        return;
    }

    if (hasPhoto) {
        // Use FormData for file upload
        const formData = new FormData();
        formData.append('scalePhoto', photoInput.files[0]);
        formData.append('batchId', batchSelect.value || '');
        formData.append('zoneId', batchOpt?.dataset?.zone || '');
        formData.append('strain', strain);
        formData.append('plantCount', document.getElementById('harvestPlants').value || '0');
        formData.append('harvestDate', document.getElementById('harvestDate').value || new Date().toISOString());
        formData.append('wetWeight', String(wetWeight));
        formData.append('dryWeight', document.getElementById('harvestDry').value || '0');
        formData.append('trimWeight', document.getElementById('harvestTrim').value || '0');
        formData.append('wasteWeight', document.getElementById('harvestWaste').value || '0');
        formData.append('qualityGrade', document.getElementById('harvestGrade').value || 'B');
        formData.append('notes', document.getElementById('harvestNotes').value || '');
        formData.append('labStatus', document.getElementById('harvestLabStatus')?.value || 'pending');
        formData.append('thc', document.getElementById('harvestTHC')?.value || '');
        formData.append('cbd', document.getElementById('harvestCBD')?.value || '');

        try {
            const token = localStorage.getItem('token');
            const baseUrl = typeof API_BASE !== 'undefined' ? API_BASE : (typeof getApiBase === 'function' ? getApiBase() : '/api/v1');
            const response = await fetch(`${baseUrl}/cultivation/harvests`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });
            const result = await response.json();
            if (result.success) {
                showToast('Harvest recorded with photo', 'success');
                hideModal('harvestModal');
                loadHarvests();
            } else {
                showToast(result.message || 'Failed to record harvest', 'error');
            }
        } catch (error) {
            showToast(error.message || 'Failed to record harvest', 'error');
        }
    } else {
        const data = {
            batchId: batchSelect.value || null,
            zoneId: batchOpt?.dataset?.zone || null,
            strain,
            plantCount: parseInt(document.getElementById('harvestPlants').value) || 0,
            harvestDate: document.getElementById('harvestDate').value || new Date().toISOString(),
            wetWeight,
            dryWeight: parseFloat(document.getElementById('harvestDry').value) || 0,
            trimWeight: parseFloat(document.getElementById('harvestTrim').value) || 0,
            wasteWeight: parseFloat(document.getElementById('harvestWaste').value) || 0,
            qualityGrade: document.getElementById('harvestGrade').value || 'B',
            notes: document.getElementById('harvestNotes').value,
            labResults: {
                status: document.getElementById('harvestLabStatus')?.value || 'pending',
                thc: parseFloat(document.getElementById('harvestTHC')?.value) || null,
                cbd: parseFloat(document.getElementById('harvestCBD')?.value) || null
            }
        };

        try {
            await cultApiCall('/harvests', 'POST', data);
            showToast('Harvest recorded', 'success');
            hideModal('harvestModal');
            loadHarvests();
        } catch (error) {
            showToast(error.message || 'Failed to record harvest', 'error');
        }
    }
}

// Photo preview
document.addEventListener('DOMContentLoaded', function() {
    const photoInput = document.getElementById('harvestPhoto');
    if (photoInput) {
        photoInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            const preview = document.getElementById('harvestPhotoPreview');
            const img = document.getElementById('harvestPhotoImg');
            if (file && preview && img) {
                const reader = new FileReader();
                reader.onload = function(ev) {
                    img.src = ev.target.result;
                    preview.style.display = 'block';
                };
                reader.readAsDataURL(file);
            } else if (preview) {
                preview.style.display = 'none';
            }
        });
    }
});
