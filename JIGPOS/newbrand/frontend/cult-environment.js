// cult-environment.js — Environmental monitoring (temp/humidity/CO2/light)
// Depends on: cult-core.js, Chart.js

let envChart = null;
let currentEnvZone = '';
let currentEnvPeriod = '24h';

async function loadEnvironment() {
    await loadZoneSelectorForEnv();
    await loadLatestReadings();
}

async function loadZoneSelectorForEnv() {
    try {
        const res = await cultApiCall('/zones');
        if (!res.success) return;

        const selector = document.getElementById('envZoneSelector');
        if (!selector) return;

        selector.innerHTML = '<option value="">All Zones</option>' +
            res.zones.map(z => `<option value="${z._id}">${z.name} (${zoneTypeLabel(z.type)})</option>`).join('');

        if (res.zones.length > 0 && !currentEnvZone) {
            currentEnvZone = res.zones[0]._id;
            selector.value = currentEnvZone;
        }
    } catch (error) {
        console.error('Failed to load zones for env:', error);
    }
}

function onEnvZoneChange(value) {
    currentEnvZone = value;
    loadLatestReadings();
    loadEnvChart();
}

function setEnvPeriod(period) {
    currentEnvPeriod = period;
    document.querySelectorAll('#envTimeToggle button').forEach(b => b.classList.remove('active'));
    event.target.classList.add('active');
    loadEnvChart();
}

async function loadLatestReadings() {
    try {
        const res = await cultApiCall('/environment/latest');
        if (!res.success) return;

        renderEnvGauges(res.readings);
        loadEnvChart();
        loadAlertHistory();
    } catch (error) {
        console.error('Failed to load latest readings:', error);
    }
}

function renderEnvGauges(readings) {
    const container = document.getElementById('envGauges');
    if (!container) return;

    // If a zone is selected, show only that zone's reading
    let targetReadings = readings;
    if (currentEnvZone) {
        targetReadings = readings.filter(r => r.zone._id === currentEnvZone);
    }

    if (targetReadings.length === 0 || !targetReadings[0].reading) {
        container.innerHTML = `<div class="empty-state"><i class="fas fa-thermometer-empty"></i><p>No readings available. Log your first environmental reading.</p></div>`;
        return;
    }

    // Show the first matching zone's reading
    const r = targetReadings[0].reading;
    const zoneName = targetReadings[0].zone.name;

    container.innerHTML = `
        <div class="gauge-widget ${r.isWithinSpec !== false ? 'in-spec' : 'out-of-spec'}">
            <div class="gauge-value">${r.temperature != null ? r.temperature.toFixed(1) : '—'}</div>
            <div class="gauge-unit">°C</div>
            <div class="gauge-label">Temperature</div>
            <div class="gauge-range">SAHPRA Veg: 21–29.5°C | Flower: 22.3–29.5°C</div>
        </div>
        <div class="gauge-widget ${r.humidity != null && r.humidity >= 45 && r.humidity <= 65 ? 'in-spec' : 'out-of-spec'}">
            <div class="gauge-value">${r.humidity != null ? r.humidity.toFixed(0) : '—'}</div>
            <div class="gauge-unit">% RH</div>
            <div class="gauge-label">Humidity</div>
            <div class="gauge-range">SAHPRA Veg: 50–65% | Flower: 45–60%</div>
        </div>
        <div class="gauge-widget in-spec">
            <div class="gauge-value">${r.co2 != null ? r.co2 : '—'}</div>
            <div class="gauge-unit">ppm</div>
            <div class="gauge-label">CO2</div>
            <div class="gauge-range">Optimal: 800–1200 ppm</div>
        </div>
        <div class="gauge-widget in-spec">
            <div class="gauge-value">${r.lightHours != null ? r.lightHours : '—'}</div>
            <div class="gauge-unit">hrs/day</div>
            <div class="gauge-label">Light (PAR)</div>
            <div class="gauge-range">Veg: 18h | Flower: 12h</div>
        </div>
        <div class="gauge-widget in-spec">
            <div class="gauge-value">${r.vpd != null ? r.vpd.toFixed(2) : '—'}</div>
            <div class="gauge-unit">kPa</div>
            <div class="gauge-label">VPD</div>
            <div class="gauge-range">Optimal: 0.8–1.2 kPa (veg) | 1.0–1.5 kPa (flower)</div>
        </div>
    `;
}

async function loadEnvChart() {
    const canvas = document.getElementById('envTrendChart');
    if (!canvas) return;

    const periodHours = { '24h': 24, '7d': 168, '30d': 720 };
    const hours = periodHours[currentEnvPeriod] || 24;
    const from = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

    let query = `?from=${from}&limit=200`;
    if (currentEnvZone) query += `&zone=${currentEnvZone}`;

    try {
        const res = await cultApiCall(`/environment${query}`);
        if (!res.success) return;

        const readings = res.readings.reverse();
        const labels = readings.map(r => {
            const d = new Date(r.timestamp);
            return hours <= 24
                ? d.toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' })
                : d.toLocaleDateString('en-ZA', { day: '2-digit', month: 'short' });
        });

        const tempData = readings.map(r => r.temperature);
        const humData = readings.map(r => r.humidity);

        if (envChart) envChart.destroy();

        envChart = new Chart(canvas, {
            type: 'line',
            data: {
                labels,
                datasets: [
                    {
                        label: 'Temperature (°C)',
                        data: tempData,
                        borderColor: '#EF4444',
                        backgroundColor: 'rgba(239,68,68,0.1)',
                        tension: 0.3,
                        fill: true,
                        yAxisID: 'y'
                    },
                    {
                        label: 'Humidity (%)',
                        data: humData,
                        borderColor: '#3B82F6',
                        backgroundColor: 'rgba(59,130,246,0.1)',
                        tension: 0.3,
                        fill: true,
                        yAxisID: 'y1'
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: { mode: 'index', intersect: false },
                plugins: {
                    legend: { labels: { color: '#999' } },
                    annotation: {
                        annotations: {
                            tempMin: { type: 'line', yMin: 21, yMax: 21, borderColor: 'rgba(239,68,68,0.3)', borderDash: [5,5], yScaleID: 'y' },
                            tempMax: { type: 'line', yMin: 29.5, yMax: 29.5, borderColor: 'rgba(239,68,68,0.3)', borderDash: [5,5], yScaleID: 'y' }
                        }
                    }
                },
                scales: {
                    x: { ticks: { color: '#666', maxTicksLimit: 12 }, grid: { color: '#1A1A1A' } },
                    y: { position: 'left', title: { display: true, text: 'Temp °C', color: '#EF4444' }, ticks: { color: '#999' }, grid: { color: '#1A1A1A' } },
                    y1: { position: 'right', title: { display: true, text: 'Humidity %', color: '#3B82F6' }, ticks: { color: '#999' }, grid: { drawOnChartArea: false } }
                }
            }
        });
    } catch (error) {
        console.error('Failed to load env chart:', error);
    }
}

async function loadAlertHistory() {
    try {
        const res = await cultApiCall('/compliance/logs?type=environmental_breach&limit=10');
        if (!res.success) return;

        const container = document.getElementById('envAlerts');
        if (!container) return;

        if (res.logs.length === 0) {
            container.innerHTML = '<div class="empty-state"><i class="fas fa-check-circle" style="color: var(--cult-green);"></i><p>No environmental breaches</p></div>';
            return;
        }

        const rows = res.logs.map(log => [
            formatDateTime(log.createdAt),
            `<span class="status-badge ${log.severity}">${log.severity}</span>`,
            log.title,
            log.description || '—',
            log.resolvedAt ? `<span class="status-badge green">Resolved</span>` : `<span class="status-badge red">Open</span>`
        ]);

        container.innerHTML = buildTable(['Date', 'Severity', 'Title', 'Details', 'Status'], rows, 'No alerts');
    } catch (error) {
        console.error('Failed to load alerts:', error);
    }
}

function showAddReadingModal() {
    document.getElementById('readingForm').reset();
    // Pre-select current zone
    if (currentEnvZone) {
        document.getElementById('readingZone').value = currentEnvZone;
    }
    showModal('readingModal');
}

async function loadZoneSelectorForReading() {
    try {
        const res = await cultApiCall('/zones');
        if (!res.success) return;
        const sel = document.getElementById('readingZone');
        if (!sel) return;
        sel.innerHTML = res.zones.map(z => `<option value="${z._id}">${z.name}</option>`).join('');
    } catch (e) {}
}

async function saveReading(e) {
    e.preventDefault();

    const data = {
        zoneId: document.getElementById('readingZone').value,
        temperature: parseFloat(document.getElementById('readingTemp').value) || null,
        humidity: parseFloat(document.getElementById('readingHumidity').value) || null,
        co2: parseFloat(document.getElementById('readingCO2').value) || null,
        lightHours: parseFloat(document.getElementById('readingLight').value) || null,
        soilMoisture: parseFloat(document.getElementById('readingSoil').value) || null,
        source: 'manual'
    };

    if (!data.zoneId) {
        showToast('Please select a zone', 'error');
        return;
    }

    try {
        const res = await cultApiCall('/environment', 'POST', data);
        if (res.success) {
            showToast('Reading logged', 'success');
            hideModal('readingModal');
            loadEnvironment();
        }
    } catch (error) {
        showToast(error.message || 'Failed to save reading', 'error');
    }
}
