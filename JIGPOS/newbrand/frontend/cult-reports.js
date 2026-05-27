// cult-reports.js — Reporting + export
// Depends on: cult-core.js

async function generateReport(type) {
    const from = document.getElementById('reportFrom')?.value || '';
    const to = document.getElementById('reportTo')?.value || '';

    let query = `?from=${from}&to=${to}`;

    try {
        const res = await cultApiCall(`/reports/${type}${query}`);
        if (res.success) {
            renderReport(res.report);
        }
    } catch (error) {
        showToast(error.message || 'Failed to generate report', 'error');
    }
}

function renderReport(report) {
    const container = document.getElementById('reportResult');
    if (!container) return;

    let html = `
        <div style="background: #1A1A1A; border: 1px solid #333; border-radius: 12px; padding: 1.5rem;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                <h4 style="margin: 0; font-family: Inter, sans-serif; color: #ccc;">${(report.type || '').replace(/_/g, ' ').toUpperCase()} Report</h4>
                <div style="display: flex; gap: 8px;">
                    <button class="cult-btn cult-btn-secondary cult-btn-sm" onclick="exportReportCSV()"><i class="fas fa-download"></i> CSV</button>
                    <button class="cult-btn cult-btn-primary cult-btn-sm" onclick="exportReportPDF()"><i class="fas fa-file-pdf"></i> PDF</button>
                    <button class="cult-btn cult-btn-secondary cult-btn-sm" onclick="window.print()"><i class="fas fa-print"></i> Print</button>
                </div>
            </div>
            <div style="font-size: 0.8rem; color: #777; margin-bottom: 1rem;">
                Period: ${formatDate(report.period?.from)} — ${formatDate(report.period?.to)}
            </div>
    `;

    switch (report.type) {
        case 'production':
            html += renderProductionReport(report);
            break;
        case 'environmental':
            html += renderEnvironmentalReport(report);
            break;
        case 'yield':
            html += renderYieldReport(report);
            break;
        case 'waste':
            html += renderWasteReport(report);
            break;
    }

    html += '</div>';
    container.innerHTML = html;
}

function renderProductionReport(r) {
    let html = `
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 1rem; margin-bottom: 1.5rem;">
            <div class="kpi-card"><div class="kpi-value">${r.batches?.total || 0}</div><div class="kpi-label">Total Batches</div></div>
            <div class="kpi-card"><div class="kpi-value">${r.harvests?.count || 0}</div><div class="kpi-label">Harvests</div></div>
            <div class="kpi-card"><div class="kpi-value">${formatWeight(r.harvests?.totalDryWeight || 0)}</div><div class="kpi-label">Total Dry Weight</div></div>
            <div class="kpi-card"><div class="kpi-value">${r.harvests?.avgYieldPercent || 0}%</div><div class="kpi-label">Avg Yield %</div></div>
        </div>
    `;

    if (r.batches?.byPhase) {
        html += '<h5 style="color: #999; font-size: 0.8rem; margin-bottom: 8px;">Batches by Phase</h5>';
        html += '<div style="display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 1rem;">';
        for (const [phase, count] of Object.entries(r.batches.byPhase)) {
            html += `<span class="phase-badge ${phase}">${phaseLabel(phase)}: ${count}</span>`;
        }
        html += '</div>';
    }

    if (r.batches?.byStrain) {
        html += '<h5 style="color: #999; font-size: 0.8rem; margin-bottom: 8px;">Batches by Strain</h5>';
        const rows = Object.entries(r.batches.byStrain).map(([strain, count]) => [strain, count]);
        html += buildTable(['Strain', 'Count'], rows);
    }

    return html;
}

function renderEnvironmentalReport(r) {
    let html = `
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 1rem; margin-bottom: 1.5rem;">
            <div class="kpi-card"><div class="kpi-value">${r.totalReadings}</div><div class="kpi-label">Total Readings</div></div>
            <div class="kpi-card"><div class="kpi-value">${r.totalBreaches}</div><div class="kpi-label">Breaches</div></div>
        </div>
    `;

    if (r.byZone) {
        const rows = Object.entries(r.byZone).map(([zone, d]) => [
            zone,
            d.count,
            d.breaches,
            d.avgTemp + '°C',
            d.minTemp + '–' + d.maxTemp + '°C',
            d.avgHumidity + '%'
        ]);
        html += '<h5 style="color: #999; font-size: 0.8rem; margin-bottom: 8px;">By Zone</h5>';
        html += buildTable(['Zone', 'Readings', 'Breaches', 'Avg Temp', 'Temp Range', 'Avg Humidity'], rows);
    }

    return html;
}

function renderYieldReport(r) {
    let html = `
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 1rem; margin-bottom: 1.5rem;">
            <div class="kpi-card"><div class="kpi-value">${r.totalHarvests}</div><div class="kpi-label">Total Harvests</div></div>
            <div class="kpi-card"><div class="kpi-value">${formatWeight(r.totalDryWeight)}</div><div class="kpi-label">Total Dry Weight</div></div>
        </div>
    `;

    if (r.byStrain) {
        const rows = Object.entries(r.byStrain).map(([strain, d]) => [
            strain,
            d.count,
            formatWeight(d.totalWet),
            formatWeight(d.totalDry),
            d.totalWet > 0 ? ((d.totalDry / d.totalWet) * 100).toFixed(1) + '%' : '—'
        ]);
        html += '<h5 style="color: #999; font-size: 0.8rem; margin-bottom: 8px;">By Strain</h5>';
        html += buildTable(['Strain', 'Harvests', 'Wet', 'Dry', 'Yield%'], rows);
    }

    if (r.byZone) {
        const rows = Object.entries(r.byZone).map(([zone, d]) => [zone, d.count, formatWeight(d.totalDry)]);
        html += '<h5 style="color: #999; font-size: 0.8rem; margin-top: 1rem; margin-bottom: 8px;">By Zone</h5>';
        html += buildTable(['Zone', 'Harvests', 'Total Dry'], rows);
    }

    return html;
}

function renderWasteReport(r) {
    return `
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 1rem;">
            <div class="kpi-card"><div class="kpi-value">${formatWeight(r.harvestWaste?.totalWasteWeight || 0)}</div><div class="kpi-label">Harvest Waste</div></div>
            <div class="kpi-card"><div class="kpi-value">${formatWeight(r.harvestWaste?.totalTrimWeight || 0)}</div><div class="kpi-label">Trim Weight</div></div>
            <div class="kpi-card"><div class="kpi-value">${r.disposalRecords || 0}</div><div class="kpi-label">Disposal Records</div></div>
            <div class="kpi-card"><div class="kpi-value">${r.destroyedBatches || 0}</div><div class="kpi-label">Destroyed Batches</div></div>
            <div class="kpi-card"><div class="kpi-value">${r.destroyedPlants || 0}</div><div class="kpi-label">Destroyed Plants</div></div>
        </div>
    `;
}

function exportReportCSV() {
    // Export current report as CSV
    const table = document.querySelector('#reportResult .cult-table');
    if (!table) {
        showToast('No table to export', 'warning');
        return;
    }

    let csv = '';
    const rows = table.querySelectorAll('tr');
    rows.forEach(row => {
        const cells = row.querySelectorAll('th, td');
        const rowData = Array.from(cells).map(c => '"' + c.textContent.replace(/"/g, '""') + '"');
        csv += rowData.join(',') + '\n';
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'cultivation-report.csv';
    a.click();
    URL.revokeObjectURL(url);
}

// ============================================
// PDF REPORT EXPORT
// ============================================

let lastReportData = null;

const _origRenderReport = renderReport;
renderReport = function(report) {
    lastReportData = report;
    _origRenderReport(report);
};

function exportReportPDF() {
    if (!lastReportData) {
        showToast('Generate a report first', 'warning');
        return;
    }

    const reportContent = document.getElementById('reportResult');
    if (!reportContent) return;

    const contentHtml = reportContent.innerHTML;
    const report = lastReportData;

    const printWindow = window.open('', '_blank');
    printWindow.document.write(`<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Cultivation ${(report.type || '').toUpperCase()} Report — Origin by ILCO Farming</title>
<link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
<style>
@page { size: A4; margin: 20mm 15mm; }
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: 'Inter', sans-serif; color: #333; padding: 0; background: #fff; }
.report-header { display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 20px; border-bottom: 3px solid #C9A84C; margin-bottom: 24px; }
.report-header h1 { font-family: 'Cinzel', serif; font-size: 1.6rem; color: #0A0A0A; }
.report-header .subtitle { color: #8B6914; font-size: 0.85rem; margin-top: 4px; }
.report-header .meta { text-align: right; font-size: 0.8rem; color: #666; }
.report-header .meta strong { color: #333; }
.sahpra-badge { display: inline-block; padding: 4px 12px; background: #166534; color: #fff; border-radius: 4px; font-size: 0.7rem; font-weight: 600; letter-spacing: 0.5px; margin-top: 8px; }
.kpi-strip { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 12px; margin-bottom: 20px; }
.kpi-card { background: #f8f8f4; border: 1px solid #e8e0cc; border-radius: 8px; padding: 12px; text-align: center; }
.kpi-value { font-family: 'JetBrains Mono', monospace; font-size: 1.4rem; font-weight: 700; color: #8B6914; }
.kpi-label { font-size: 0.7rem; color: #666; margin-top: 4px; text-transform: uppercase; letter-spacing: 0.3px; }
table { width: 100%; border-collapse: collapse; margin: 12px 0; font-size: 0.8rem; }
th { background: #f8f8f4; color: #8B6914; font-weight: 600; text-align: left; padding: 8px 10px; border-bottom: 2px solid #C9A84C; }
td { padding: 6px 10px; border-bottom: 1px solid #eee; color: #444; }
h5 { color: #8B6914; font-size: 0.85rem; margin: 16px 0 8px; }
.phase-badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 0.7rem; font-weight: 600; }
.phase-badge.propagation { background: #E8D5F5; color: #6B21A8; }
.phase-badge.vegetative { background: #D1FAE5; color: #166534; }
.phase-badge.flowering { background: #FEF3C7; color: #92400E; }
.phase-badge.harvest_ready { background: #FEE2E2; color: #991B1B; }
.phase-badge.harvested { background: #DBEAFE; color: #1E40AF; }
.phase-badge.processing { background: #E0E7FF; color: #3730A3; }
.phase-badge.complete { background: #D1FAE5; color: #166534; }
.status-badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 0.7rem; font-weight: 600; }
.status-badge.green { background: #D1FAE5; color: #166534; }
.status-badge.yellow { background: #FEF3C7; color: #92400E; }
.status-badge.red { background: #FEE2E2; color: #991B1B; }
.report-footer { margin-top: 30px; padding-top: 16px; border-top: 2px solid #C9A84C; display: flex; justify-content: space-between; font-size: 0.7rem; color: #999; }
.empty-state { text-align: center; padding: 20px; color: #999; }
@media print {
    body, .kpi-card, th, .sahpra-badge, .phase-badge, .status-badge { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
}
</style>
</head>
<body>
<div class="report-header">
    <div>
        <h1>${(report.type || '').replace(/_/g, ' ').toUpperCase()} REPORT</h1>
        <div class="subtitle">Origin by ILCO Farming — Cultivation Dashboard</div>
        <div class="sahpra-badge">SAHPRA SECTION 22C COMPLIANT</div>
    </div>
    <div class="meta">
        <strong>Report Period:</strong><br>
        ${formatDate(report.period?.from)} — ${formatDate(report.period?.to)}<br><br>
        <strong>Generated:</strong><br>
        ${new Date().toLocaleDateString('en-ZA', { day: '2-digit', month: 'long', year: 'numeric' })}
    </div>
</div>
${contentHtml}
<div class="report-footer">
    <span>Cultivation Report — Origin by ILCO Farming</span>
    <span>CONFIDENTIAL — For authorized personnel only</span>
</div>
<script>
    document.querySelectorAll('[style]').forEach(el => {
        const s = el.getAttribute('style');
        if (s) el.setAttribute('style', s
            .replace(/background:\\s*#1[aA1][aA0-9]{4}/g, 'background: #f8f8f4')
            .replace(/background:\\s*#141414/g, 'background: #f8f8f4')
            .replace(/color:\\s*#[cC]{3}/g, 'color: #333')
            .replace(/color:\\s*#999/g, 'color: #666')
            .replace(/color:\\s*#777/g, 'color: #555')
            .replace(/border[^;]*#333[^;]*/g, 'border: 1px solid #ddd')
        );
    });
    setTimeout(() => { window.print(); }, 500);
<\/script>
</body>
</html>`);
    printWindow.document.close();
}
