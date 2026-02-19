// ===== ADMIN PAYROLL MODULE =====
let payrollData = [];

function initPayroll() {
    // Set default date range (current month)
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    document.getElementById('payrollStartDate').value = firstDay.toISOString().split('T')[0];
    document.getElementById('payrollEndDate').value = lastDay.toISOString().split('T')[0];

    // Load branches for filter
    loadPayrollBranches();
}

async function loadPayrollBranches() {
    const token = sessionStorage.getItem('adminToken');
    const select = document.getElementById('payrollBranchFilter');

    try {
        const response = await fetch(`${API_URL}/branches`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();

        select.innerHTML = '<option value="">All Branches</option>';
        if (data.success && data.branches) {
            data.branches.forEach(branch => {
                select.innerHTML += `<option value="${branch._id}">${branch.name} (${branch.code})</option>`;
            });
        }
    } catch (error) {
        console.error('Load branches error:', error);
    }
}

async function loadPayrollData() {
    const token = sessionStorage.getItem('adminToken');
    const startDate = document.getElementById('payrollStartDate').value;
    const endDate = document.getElementById('payrollEndDate').value;
    const branch = document.getElementById('payrollBranchFilter').value;
    const tbody = document.getElementById('payrollList');

    if (!startDate || !endDate) {
        showAdminToast('Missing Dates', 'Please select start and end dates', 'error');
        return;
    }

    tbody.innerHTML = '<tr><td colspan="10" style="text-align: center; padding: 40px; color: var(--green-light);">Loading payroll data...</td></tr>';

    try {
        let url = `${API_URL}/staff-shifts/payroll?startDate=${startDate}&endDate=${endDate}`;
        if (branch) url += `&branch=${branch}`;

        const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();

        if (data.success && data.data?.length > 0) {
            payrollData = data.data;
            displayPayrollData(payrollData);
            updatePayrollSummary(payrollData);
        } else {
            tbody.innerHTML = '<tr><td colspan="10" style="text-align: center; padding: 40px; color: var(--green-light);">No payroll data for selected period</td></tr>';
            resetPayrollSummary();
        }
    } catch (error) {
        console.error('Load payroll error:', error);
        tbody.innerHTML = '<tr><td colspan="10" style="text-align: center; padding: 40px; color: #f87171;">Error loading payroll data</td></tr>';
    }
}

function displayPayrollData(data) {
    const tbody = document.getElementById('payrollList');

    tbody.innerHTML = data.map(p => `
        <tr>
            <td>
                <strong>${p.staff?.name || 'Unknown'}</strong><br>
                <small style="color: var(--green-light);">${p.staff?.email || ''}</small>
            </td>
            <td>${p.totalShifts}</td>
            <td>${p.regularHours.toFixed(1)}h</td>
            <td style="color: ${p.overtimeHours > 0 ? 'var(--gold-dark)' : 'inherit'};">${p.overtimeHours.toFixed(1)}h</td>
            <td>R${p.basePay.toFixed(2)}</td>
            <td style="color: var(--gold-dark);">R${p.overtimePay.toFixed(2)}</td>
            <td style="color: var(--green);">R${p.commission.toFixed(2)}</td>
            <td>R${(p.tips || 0).toFixed(2)}</td>
            <td><strong style="color: var(--green-deep);">R${p.totalPay.toFixed(2)}</strong></td>
            <td>
                <button class="action-btn view-btn" onclick="viewStaffShifts('${p.staff?._id}')" style="padding:6px 14px;font-size:0.82rem;white-space:nowrap;">
                    <i class="fas fa-eye"></i> Shifts
                </button>
            </td>
        </tr>
    `).join('');
}

function updatePayrollSummary(data) {
    const totals = data.reduce((acc, p) => ({
        hours: acc.hours + p.regularHours + p.overtimeHours,
        pay: acc.pay + p.totalPay,
        commission: acc.commission + p.commission,
        ot: acc.ot + p.overtimePay
    }), { hours: 0, pay: 0, commission: 0, ot: 0 });

    document.getElementById('payrollTotalHours').textContent = totals.hours.toFixed(1);
    document.getElementById('payrollTotalPay').textContent = `R${totals.pay.toFixed(0)}`;
    document.getElementById('payrollCommission').textContent = `R${totals.commission.toFixed(0)}`;
    document.getElementById('payrollOT').textContent = `R${totals.ot.toFixed(0)}`;
}

function resetPayrollSummary() {
    document.getElementById('payrollTotalHours').textContent = '0';
    document.getElementById('payrollTotalPay').textContent = 'R0';
    document.getElementById('payrollCommission').textContent = 'R0';
    document.getElementById('payrollOT').textContent = 'R0';
}

function viewStaffShifts(staffId) {
    const startDate = document.getElementById('payrollStartDate').value;
    const endDate = document.getElementById('payrollEndDate').value;
    showAdminToast('Coming Soon', `View shift details for ${startDate} to ${endDate}`, 'info');
}

function exportPayroll() {
    if (!payrollData || payrollData.length === 0) {
        showAdminToast('No Data', 'Generate a report first before exporting', 'warning');
        return;
    }

    const startDate = document.getElementById('payrollStartDate').value;
    const endDate = document.getElementById('payrollEndDate').value;

    // Create CSV content
    const headers = ['Staff Name', 'Email', 'Shifts', 'Regular Hours', 'OT Hours', 'Base Pay', 'OT Pay', 'Commission', 'Tips', 'Total Pay'];
    const rows = payrollData.map(p => [
        p.staff?.name || 'Unknown',
        p.staff?.email || '',
        p.totalShifts,
        p.regularHours.toFixed(2),
        p.overtimeHours.toFixed(2),
        p.basePay.toFixed(2),
        p.overtimePay.toFixed(2),
        p.commission.toFixed(2),
        (p.tips || 0).toFixed(2),
        p.totalPay.toFixed(2)
    ]);

    // Add totals row
    const totals = payrollData.reduce((acc, p) => ({
        shifts: acc.shifts + p.totalShifts,
        regular: acc.regular + p.regularHours,
        ot: acc.ot + p.overtimeHours,
        base: acc.base + p.basePay,
        otPay: acc.otPay + p.overtimePay,
        commission: acc.commission + p.commission,
        tips: acc.tips + (p.tips || 0),
        total: acc.total + p.totalPay
    }), { shifts: 0, regular: 0, ot: 0, base: 0, otPay: 0, commission: 0, tips: 0, total: 0 });

    rows.push([
        'TOTALS', '',
        totals.shifts,
        totals.regular.toFixed(2),
        totals.ot.toFixed(2),
        totals.base.toFixed(2),
        totals.otPay.toFixed(2),
        totals.commission.toFixed(2),
        totals.tips.toFixed(2),
        totals.total.toFixed(2)
    ]);

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');

    // Download
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payroll-report-${startDate}-to-${endDate}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    showAdminToast('Exported', 'Payroll report downloaded successfully', 'success');
}
