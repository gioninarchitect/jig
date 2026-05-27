// cult-zones.js — Zone/room/tunnel management CRUD
// Depends on: cult-core.js

let allZones = [];

async function loadZones() {
    try {
        const res = await cultApiCall('/zones');
        if (res.success) {
            allZones = res.zones;
            renderZonesList();
        }
    } catch (error) {
        console.error('Failed to load zones:', error);
    }
}

function renderZonesList() {
    const container = document.getElementById('zonesContent');
    if (!container) return;

    if (allZones.length === 0) {
        container.innerHTML = `<div class="empty-state">
            <i class="fas fa-warehouse"></i>
            <p>No cultivation zones yet. Add your first zone to get started.</p>
            <button class="cult-btn cult-btn-primary" onclick="showAddZoneModal()">
                <i class="fas fa-plus"></i> Add Zone
            </button>
        </div>`;
        return;
    }

    container.innerHTML = `<div class="zone-grid">
        ${allZones.map(zone => {
            const reading = zone.latestReading;
            const temp = reading?.temperature != null ? reading.temperature.toFixed(1) + '°C' : '—';
            const humidity = reading?.humidity != null ? reading.humidity.toFixed(0) + '%' : '—';
            const co2 = reading?.co2 != null ? reading.co2 + ' ppm' : '—';
            const statusClass = statusColor(zone.status);

            return `
                <div class="zone-card type-${zone.type}" onclick="viewZoneDetail('${zone._id}')">
                    <div class="zone-header">
                        <div class="zone-name">${zone.name}</div>
                        <div class="zone-type-icon ${zone.type}">
                            <i class="fas ${zoneTypeIcon(zone.type)}"></i>
                        </div>
                    </div>
                    <div style="display: flex; gap: 8px; margin-bottom: 8px;">
                        <span class="status-badge ${statusClass}">${zone.status}</span>
                        <span class="status-badge" style="background: rgba(201,168,76,0.1); color: var(--or-gold);">${zoneTypeLabel(zone.type)}</span>
                    </div>
                    <div class="zone-stats">
                        <div class="zone-stat"><i class="fas fa-cannabis"></i> Batches: <span>${zone.activeBatchCount || 0}</span></div>
                        <div class="zone-stat"><i class="fas fa-expand-arrows-alt"></i> Capacity: <span>${zone.capacity || 0}</span></div>
                        <div class="zone-stat"><i class="fas fa-thermometer-half"></i> <span>${temp}</span></div>
                        <div class="zone-stat"><i class="fas fa-tint"></i> <span>${humidity}</span></div>
                        <div class="zone-stat"><i class="fas fa-wind"></i> CO2: <span>${co2}</span></div>
                        <div class="zone-stat"><i class="fas ${zone.lightType === 'natural' ? 'fa-sun' : 'fa-lightbulb'}"></i> <span>${zone.lightType || '—'}</span></div>
                    </div>
                </div>
            `;
        }).join('')}
    </div>`;
}

function showAddZoneModal() {
    document.getElementById('zoneModalTitle').textContent = 'Add Cultivation Zone';
    document.getElementById('zoneForm').reset();
    document.getElementById('zoneId').value = '';
    showModal('zoneModal');
}

function editZone(id) {
    const zone = allZones.find(z => z._id === id);
    if (!zone) return;

    document.getElementById('zoneModalTitle').textContent = 'Edit Zone';
    document.getElementById('zoneId').value = zone._id;
    document.getElementById('zoneName').value = zone.name;
    document.getElementById('zoneType').value = zone.type;
    document.getElementById('zoneCapacity').value = zone.capacity || '';
    document.getElementById('zoneLightType').value = zone.lightType || 'natural';
    document.getElementById('zoneStatus').value = zone.status || 'active';
    document.getElementById('zoneDimL').value = zone.dimensions?.length || '';
    document.getElementById('zoneDimW').value = zone.dimensions?.width || '';
    document.getElementById('zoneDimH').value = zone.dimensions?.height || '';
    document.getElementById('zoneTempMin').value = zone.environmentThresholds?.temp?.min ?? 21;
    document.getElementById('zoneTempMax').value = zone.environmentThresholds?.temp?.max ?? 29.5;
    document.getElementById('zoneHumMin').value = zone.environmentThresholds?.humidity?.min ?? 45;
    document.getElementById('zoneHumMax').value = zone.environmentThresholds?.humidity?.max ?? 65;

    showModal('zoneModal');
}

async function saveZone(e) {
    e.preventDefault();
    const id = document.getElementById('zoneId').value;
    const data = {
        name: document.getElementById('zoneName').value,
        type: document.getElementById('zoneType').value,
        capacity: parseInt(document.getElementById('zoneCapacity').value) || 0,
        lightType: document.getElementById('zoneLightType').value,
        status: document.getElementById('zoneStatus').value,
        dimensions: {
            length: parseFloat(document.getElementById('zoneDimL').value) || 0,
            width: parseFloat(document.getElementById('zoneDimW').value) || 0,
            height: parseFloat(document.getElementById('zoneDimH').value) || 0
        },
        environmentThresholds: {
            temp: {
                min: parseFloat(document.getElementById('zoneTempMin').value) || 21,
                max: parseFloat(document.getElementById('zoneTempMax').value) || 29.5
            },
            humidity: {
                min: parseFloat(document.getElementById('zoneHumMin').value) || 45,
                max: parseFloat(document.getElementById('zoneHumMax').value) || 65
            }
        }
    };

    try {
        if (id) {
            await cultApiCall(`/zones/${id}`, 'PUT', data);
            showToast('Zone updated', 'success');
        } else {
            await cultApiCall('/zones', 'POST', data);
            showToast('Zone created', 'success');
        }
        hideModal('zoneModal');
        loadZones();
    } catch (error) {
        showToast(error.message || 'Failed to save zone', 'error');
    }
}

async function viewZoneDetail(id) {
    try {
        const res = await cultApiCall(`/zones/${id}`);
        if (!res.success) return;
        const zone = res.zone;

        const detailHtml = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                <div>
                    <h3 style="margin: 0;">${zone.name}</h3>
                    <span class="status-badge ${zone.type}">${zoneTypeLabel(zone.type)}</span>
                    <span class="status-badge ${statusColor(zone.status)}">${zone.status}</span>
                </div>
                <div style="display: flex; gap: 8px;">
                    <button class="cult-btn cult-btn-secondary cult-btn-sm" onclick="editZone('${zone._id}')"><i class="fas fa-edit"></i> Edit</button>
                    <button class="cult-btn cult-btn-secondary cult-btn-sm" onclick="renderZonesList()"><i class="fas fa-arrow-left"></i> Back</button>
                </div>
            </div>

            <div class="gauge-grid">
                ${renderZoneGauges(zone)}
            </div>

            <div style="margin-top: 1rem;">
                <h4 style="font-family: Inter, sans-serif; color: #ccc; font-size: 0.9rem;">Active Batches in this Zone</h4>
                ${zone.activeBatches && zone.activeBatches.length > 0
                    ? zone.activeBatches.map(b => `
                        <div class="batch-card" onclick="window.location.hash='#batches'">
                            <div class="batch-id">${b.batchId}</div>
                            <div class="batch-strain">${b.strain}</div>
                            <div class="batch-meta">
                                <span><i class="fas ${phaseIcon(b.phase)}"></i> ${phaseLabel(b.phase)}</span>
                                <span><i class="fas fa-cannabis"></i> ${b.plantCount} plants</span>
                            </div>
                        </div>
                    `).join('')
                    : '<div class="empty-state"><p>No active batches in this zone</p></div>'
                }
            </div>
        `;

        document.getElementById('zonesContent').innerHTML = detailHtml;
    } catch (error) {
        console.error('Failed to load zone detail:', error);
    }
}

function renderZoneGauges(zone) {
    const readings = zone.latestReadings || [];
    const latest = readings[0];
    const thresholds = zone.environmentThresholds || {};

    if (!latest) {
        return '<div class="empty-state"><i class="fas fa-thermometer-empty"></i><p>No environmental readings yet</p></div>';
    }

    function gaugeSpec(val, min, max) {
        if (val == null) return 'in-spec';
        return (val >= min && val <= max) ? 'in-spec' : 'out-of-spec';
    }

    const tempSpec = gaugeSpec(latest.temperature, thresholds.temp?.min || 21, thresholds.temp?.max || 29.5);
    const humSpec = gaugeSpec(latest.humidity, thresholds.humidity?.min || 45, thresholds.humidity?.max || 65);
    const co2Spec = gaugeSpec(latest.co2, thresholds.co2?.min || 400, thresholds.co2?.max || 1500);

    return `
        <div class="gauge-widget ${tempSpec}">
            <div class="gauge-value">${latest.temperature != null ? latest.temperature.toFixed(1) : '—'}</div>
            <div class="gauge-unit">°C</div>
            <div class="gauge-label">Temperature</div>
            <div class="gauge-range">Spec: ${thresholds.temp?.min || 21}–${thresholds.temp?.max || 29.5}°C</div>
        </div>
        <div class="gauge-widget ${humSpec}">
            <div class="gauge-value">${latest.humidity != null ? latest.humidity.toFixed(0) : '—'}</div>
            <div class="gauge-unit">% RH</div>
            <div class="gauge-label">Humidity</div>
            <div class="gauge-range">Spec: ${thresholds.humidity?.min || 45}–${thresholds.humidity?.max || 65}%</div>
        </div>
        <div class="gauge-widget ${co2Spec}">
            <div class="gauge-value">${latest.co2 != null ? latest.co2 : '—'}</div>
            <div class="gauge-unit">ppm</div>
            <div class="gauge-label">CO2</div>
            <div class="gauge-range">Spec: ${thresholds.co2?.min || 400}–${thresholds.co2?.max || 1500} ppm</div>
        </div>
        <div class="gauge-widget in-spec">
            <div class="gauge-value">${latest.vpd != null ? latest.vpd.toFixed(2) : '—'}</div>
            <div class="gauge-unit">kPa</div>
            <div class="gauge-label">VPD</div>
            <div class="gauge-range">Optimal: 0.8–1.2 kPa</div>
        </div>
    `;
}
