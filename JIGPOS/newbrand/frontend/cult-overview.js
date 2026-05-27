// cult-overview.js — Facility overview KPIs + zone cards grid
// Depends on: cult-core.js, cult-auth.js

async function loadOverview() {
    try {
        const [overviewRes, zonesRes] = await Promise.all([
            cultApiCall('/overview'),
            cultApiCall('/zones')
        ]);

        if (overviewRes.success) renderKPIs(overviewRes.overview);
        if (zonesRes.success) renderZoneCards(zonesRes.zones);
    } catch (error) {
        console.error('Failed to load overview:', error);
    }
}

function renderKPIs(data) {
    const strip = document.getElementById('kpiStrip');
    if (!strip) return;

    const complianceClass = `compliance-${data.complianceStatus || 'green'}`;

    strip.innerHTML = `
        <div class="kpi-card">
            <div class="kpi-value">${data.activeBatches || 0}</div>
            <div class="kpi-label">Active Batches</div>
        </div>
        <div class="kpi-card">
            <div class="kpi-value">${(data.plantsInCultivation || 0).toLocaleString()}</div>
            <div class="kpi-label">Plants in Cultivation</div>
        </div>
        <div class="kpi-card">
            <div class="kpi-value">${data.avgYieldKg || 0}</div>
            <div class="kpi-label">Avg Yield (kg)</div>
        </div>
        <div class="kpi-card ${complianceClass}">
            <div class="kpi-value">${data.complianceScore || 0}%</div>
            <div class="kpi-label">Compliance Score</div>
        </div>
        <div class="kpi-card">
            <div class="kpi-value">${data.daysToNextHarvest != null ? data.daysToNextHarvest : '—'}</div>
            <div class="kpi-label">Days to Next Harvest</div>
        </div>
    `;
}

function renderZoneCards(zones) {
    const grid = document.getElementById('overviewZoneGrid');
    if (!grid) return;

    if (!zones || zones.length === 0) {
        grid.innerHTML = `<div class="empty-state">
            <i class="fas fa-warehouse"></i>
            <p>No zones configured yet</p>
            <button class="cult-btn cult-btn-primary" onclick="window.location.hash='#zones'">
                <i class="fas fa-plus"></i> Add Zone
            </button>
        </div>`;
        return;
    }

    grid.innerHTML = zones.map(zone => {
        const typeClass = zone.type === 'tunnel' ? 'tunnel' : 'indoor';
        const icon = zoneTypeIcon(zone.type);
        const reading = zone.latestReading;
        const temp = reading?.temperature != null ? reading.temperature.toFixed(1) + '°C' : '—';
        const humidity = reading?.humidity != null ? reading.humidity.toFixed(0) + '%' : '—';
        const statusClass = zone.status === 'active' ? 'green' : zone.status === 'maintenance' ? 'yellow' : 'red';

        return `
            <div class="zone-card type-${zone.type}" onclick="window.location.hash='#zones'; setTimeout(() => viewZoneDetail('${zone._id}'), 200);">
                <div class="zone-header">
                    <div class="zone-name">${zone.name}</div>
                    <div class="zone-type-icon ${typeClass}">
                        <i class="fas ${icon}"></i>
                    </div>
                </div>
                <span class="status-badge ${statusClass}">${zone.status}</span>
                <div class="zone-stats">
                    <div class="zone-stat"><i class="fas fa-cannabis"></i> Batches: <span>${zone.activeBatchCount || 0}</span></div>
                    <div class="zone-stat"><i class="fas fa-thermometer-half"></i> <span>${temp}</span></div>
                    <div class="zone-stat"><i class="fas fa-tint"></i> <span>${humidity}</span></div>
                    <div class="zone-stat"><i class="fas fa-expand-arrows-alt"></i> Cap: <span>${zone.capacity || 0}</span></div>
                </div>
            </div>
        `;
    }).join('');
}
