// cult-compliance.js — SAHPRA 22C compliance tracking
// Depends on: cult-core.js

let complianceScore = null;
let complianceLogs = [];

async function loadCompliance() {
    try {
        const [scoreRes, logsRes] = await Promise.all([
            cultApiCall('/compliance/score'),
            cultApiCall('/compliance/logs?limit=30')
        ]);

        if (scoreRes.success) {
            complianceScore = scoreRes.score;
            renderComplianceDashboard();
        }
        if (logsRes.success) {
            complianceLogs = logsRes.logs;
            renderComplianceLogs();
        }
    } catch (error) {
        console.error('Failed to load compliance:', error);
    }
}

function renderComplianceDashboard() {
    const container = document.getElementById('complianceScoreArea');
    if (!container || !complianceScore) return;

    const { overall, status, categories, stats } = complianceScore;

    container.innerHTML = `
        <div style="text-align: center; margin-bottom: 2rem;">
            <div style="font-size: 4rem; font-weight: 700; font-family: 'JetBrains Mono', monospace; color: var(--traffic-${status});">${overall}%</div>
            <div style="font-size: 0.85rem; color: #777;">Overall Compliance Score</div>
            <span class="status-badge ${status}" style="margin-top: 8px; font-size: 0.8rem; padding: 6px 16px;">
                ${status === 'green' ? 'Compliant' : status === 'yellow' ? 'Needs Attention' : 'Non-Compliant'}
            </span>
        </div>

        <div class="compliance-grid">
            <div class="compliance-card">
                <div class="compliance-light ${categories.environmentalRecords || 'yellow'}"></div>
                <div>
                    <div class="compliance-title">Environmental Records</div>
                    <div class="compliance-desc">All zones logging within spec?</div>
                </div>
            </div>
            <div class="compliance-card">
                <div class="compliance-light ${categories.batchDocumentation || 'yellow'}"></div>
                <div>
                    <div class="compliance-title">Batch Documentation</div>
                    <div class="compliance-desc">All active batches have complete records?</div>
                </div>
            </div>
            <div class="compliance-card">
                <div class="compliance-light ${categories.harvestRecords || 'yellow'}"></div>
                <div>
                    <div class="compliance-title">Harvest Records</div>
                    <div class="compliance-desc">All harvests documented with weights?</div>
                </div>
            </div>
            <div class="compliance-card">
                <div class="compliance-light ${categories.environmentalBreaches || 'yellow'}"></div>
                <div>
                    <div class="compliance-title">Environmental Compliance</div>
                    <div class="compliance-desc">No unresolved breaches?</div>
                </div>
            </div>
            <div class="compliance-card">
                <div class="compliance-light ${categories.unresolvedIssues || 'yellow'}"></div>
                <div>
                    <div class="compliance-title">Open Issues</div>
                    <div class="compliance-desc">${stats.unresolvedLogs || 0} unresolved issue(s)</div>
                </div>
            </div>
        </div>

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 1rem; margin-top: 1.5rem;">
            <div class="kpi-card">
                <div class="kpi-value">${stats.activeZones || 0}</div>
                <div class="kpi-label">Active Zones</div>
            </div>
            <div class="kpi-card">
                <div class="kpi-value">${stats.activeBatches || 0}</div>
                <div class="kpi-label">Active Batches</div>
            </div>
            <div class="kpi-card">
                <div class="kpi-value">${stats.recentReadings || 0}</div>
                <div class="kpi-label">Readings (30d)</div>
            </div>
            <div class="kpi-card">
                <div class="kpi-value">${stats.recentBreaches || 0}</div>
                <div class="kpi-label">Breaches (30d)</div>
            </div>
        </div>
    `;
}

function renderComplianceLogs() {
    const container = document.getElementById('complianceLogsTable');
    if (!container) return;

    if (complianceLogs.length === 0) {
        container.innerHTML = '<div class="empty-state"><i class="fas fa-shield-alt"></i><p>No compliance events logged</p></div>';
        return;
    }

    const rows = complianceLogs.map(log => [
        formatDateTime(log.createdAt),
        `<span class="status-badge ${log.severity}">${log.severity}</span>`,
        log.type.replace(/_/g, ' '),
        log.title,
        log.zoneId?.name || '—',
        log.resolvedAt ? `<span class="status-badge green">Resolved</span>` : `<span class="status-badge red">Open</span>`
    ]);

    container.innerHTML = buildTable(
        ['Date', 'Severity', 'Type', 'Title', 'Zone', 'Status'],
        rows,
        'No logs'
    );
}

function showAddComplianceLogModal() {
    document.getElementById('complianceLogForm').reset();
    showModal('complianceLogModal');
}

async function saveComplianceLog(e) {
    e.preventDefault();

    const data = {
        type: document.getElementById('logType').value,
        severity: document.getElementById('logSeverity').value,
        title: document.getElementById('logTitle').value,
        description: document.getElementById('logDescription').value
    };

    if (!data.title) {
        showToast('Title is required', 'error');
        return;
    }

    try {
        await cultApiCall('/compliance/logs', 'POST', data);
        showToast('Compliance event logged', 'success');
        hideModal('complianceLogModal');
        loadCompliance();
    } catch (error) {
        showToast(error.message || 'Failed to log event', 'error');
    }
}

function showAuditPackageModal() {
    const now = new Date();
    const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);
    document.getElementById('auditFrom').value = thirtyDaysAgo.toISOString().slice(0, 10);
    document.getElementById('auditTo').value = now.toISOString().slice(0, 10);
    showModal('auditModal');
}

async function generateAuditPackage(e) {
    e.preventDefault();
    const from = document.getElementById('auditFrom').value;
    const to = document.getElementById('auditTo').value;

    if (!from || !to) {
        showToast('Please select date range', 'error');
        return;
    }

    const btn = e.target.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating...';

    try {
        const res = await cultApiCall('/compliance/audit-package', 'POST', { from, to });
        if (res.success) {
            renderAuditPackage(res.auditPackage);
            showToast('Audit package generated', 'success');
        }
    } catch (error) {
        showToast(error.message || 'Failed to generate audit package', 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-file-pdf"></i> Generate';
    }
}

function renderAuditPackage(pkg) {
    const container = document.getElementById('auditResult');
    if (!container) return;

    container.innerHTML = `
        <div style="background: #1A1A1A; border: 1px solid #333; border-radius: 12px; padding: 1.5rem; margin-top: 1rem;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                <h4 style="margin: 0; font-family: Inter, sans-serif; color: #ccc;">SAHPRA Audit Package</h4>
                <button class="cult-btn cult-btn-primary cult-btn-sm" onclick="exportAuditPDF()"><i class="fas fa-file-pdf"></i> PDF</button>
                <button class="cult-btn cult-btn-secondary cult-btn-sm" onclick="window.print()"><i class="fas fa-print"></i> Print</button>
            </div>
            <div style="font-size: 0.8rem; color: #777; margin-bottom: 1rem;">
                Period: ${formatDate(pkg.period.from)} — ${formatDate(pkg.period.to)} | Generated: ${formatDateTime(pkg.generatedAt)}
            </div>

            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 1rem;">
                <div class="kpi-card"><div class="kpi-value">${pkg.facility.totalZones}</div><div class="kpi-label">Total Zones</div></div>
                <div class="kpi-card"><div class="kpi-value">${pkg.batches.total}</div><div class="kpi-label">Batches</div></div>
                <div class="kpi-card"><div class="kpi-value">${pkg.environment.totalReadings}</div><div class="kpi-label">Env Readings</div></div>
                <div class="kpi-card"><div class="kpi-value">${pkg.environment.breaches}</div><div class="kpi-label">Breaches</div></div>
                <div class="kpi-card"><div class="kpi-value">${pkg.harvests.total}</div><div class="kpi-label">Harvests</div></div>
                <div class="kpi-card"><div class="kpi-value">${formatWeight(pkg.harvests.totalDryWeight)}</div><div class="kpi-label">Total Dry Weight</div></div>
            </div>

            <div style="font-size: 0.8rem; color: #999;">
                <p><strong>Waste:</strong> ${formatWeight(pkg.harvests.totalWasteWeight)} waste recorded</p>
                <p><strong>Avg Yield:</strong> ${pkg.harvests.avgYieldPercent}%</p>
                <p><strong>Compliance Events:</strong> ${pkg.compliance.totalEvents} (${pkg.compliance.unresolved} unresolved)</p>
            </div>
        </div>
    `;

    hideModal('auditModal');
}

// ============================================
// AUDIT PACKAGE PDF EXPORT
// ============================================

function exportAuditPDF() {
    const auditContent = document.getElementById('auditResult');
    if (!auditContent || !auditContent.innerHTML.trim()) {
        showToast('Generate an audit package first', 'warning');
        return;
    }

    const contentHtml = auditContent.innerHTML;
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>SAHPRA Audit Package — Origin by ILCO Farming</title>
<link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
<style>
@page { size: A4; margin: 20mm 15mm; }
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: 'Inter', sans-serif; color: #333; background: #fff; }
.report-header { display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 20px; border-bottom: 3px solid #C9A84C; margin-bottom: 24px; }
.report-header h1 { font-family: 'Cinzel', serif; font-size: 1.6rem; color: #0A0A0A; }
.report-header .subtitle { color: #8B6914; font-size: 0.85rem; margin-top: 4px; }
.sahpra-badge { display: inline-block; padding: 4px 12px; background: #166534; color: #fff; border-radius: 4px; font-size: 0.7rem; font-weight: 600; letter-spacing: 0.5px; margin-top: 8px; }
.report-header .meta { text-align: right; font-size: 0.8rem; color: #666; }
.report-header .meta strong { color: #333; }
.kpi-card { background: #f8f8f4; border: 1px solid #e8e0cc; border-radius: 8px; padding: 12px; text-align: center; }
.kpi-value { font-family: 'JetBrains Mono', monospace; font-size: 1.4rem; font-weight: 700; color: #8B6914; }
.kpi-label { font-size: 0.7rem; color: #666; margin-top: 4px; text-transform: uppercase; }
table { width: 100%; border-collapse: collapse; margin: 12px 0; font-size: 0.8rem; }
th { background: #f8f8f4; color: #8B6914; font-weight: 600; text-align: left; padding: 8px 10px; border-bottom: 2px solid #C9A84C; }
td { padding: 6px 10px; border-bottom: 1px solid #eee; color: #444; }
.status-badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 0.7rem; font-weight: 600; }
.status-badge.green { background: #D1FAE5; color: #166534; }
.status-badge.yellow { background: #FEF3C7; color: #92400E; }
.status-badge.red { background: #FEE2E2; color: #991B1B; }
.report-footer { margin-top: 30px; padding-top: 16px; border-top: 2px solid #C9A84C; display: flex; justify-content: space-between; font-size: 0.7rem; color: #999; }
@media print { body, .kpi-card, th, .sahpra-badge, .status-badge { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; } }
</style>
</head>
<body>
<div class="report-header">
    <div>
        <h1>SAHPRA AUDIT PACKAGE</h1>
        <div class="subtitle">Origin by ILCO Farming — Cultivation Compliance</div>
        <div class="sahpra-badge">SECTION 22C AUDIT DOCUMENTATION</div>
    </div>
    <div class="meta">
        <strong>Generated:</strong><br>
        ${new Date().toLocaleDateString('en-ZA', { day: '2-digit', month: 'long', year: 'numeric' })}<br>
        ${new Date().toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' })}
    </div>
</div>
${contentHtml}
<div class="report-footer">
    <span>SAHPRA Audit Package — Origin by ILCO Farming</span>
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
    // Remove buttons from print view
    document.querySelectorAll('button, .cult-btn').forEach(b => b.remove());
    setTimeout(() => { window.print(); }, 500);
<\/script>
</body>
</html>`);
    printWindow.document.close();
}
