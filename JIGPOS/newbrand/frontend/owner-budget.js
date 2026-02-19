// owner-budget.js — Budget tracking for owner dashboard
// Depends on: owner-auth.js (token), config.js (API_URL), dbc-utils.js (showToast)

// ===== BUDGET FUNCTIONS =====

async function loadBudgetData() {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const branchId = document.getElementById('budgetBranchSelect')?.value || 'all';

    // Update month display
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    document.getElementById('budgetMonth').textContent = `${monthNames[month - 1]} ${year}`;

    // Calculate days left in month
    const lastDay = new Date(year, month, 0).getDate();
    const daysLeft = lastDay - now.getDate();
    document.getElementById('revenueDaysLeft').textContent = `${daysLeft} days left`;

    try {
        // Fetch budget data
        let url = `${API_URL}/budgets/${year}/${month}`;
        if (branchId !== 'all') url += `?branch=${branchId}`;

        const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            const data = await response.json();
            const budget = data.budget || data.data;

            if (budget) {
                updateBudgetUI(budget);
            } else {
                // No budget set - show defaults
                showNoBudgetState();
            }
        } else {
            showNoBudgetState();
        }

        // Also fetch actual sales data for comparison
        await loadActualSalesData(year, month, branchId);

    } catch (error) {
        console.error('Error loading budget:', error);
        showNoBudgetState();
    }
}

async function loadActualSalesData(year, month, branchId) {
    try {
        const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
        const endDate = `${year}-${String(month).padStart(2, '0')}-31`;

        let url = `${API_URL}/dashboard/sales-summary?startDate=${startDate}&endDate=${endDate}`;
        if (branchId !== 'all') url += `&branch=${branchId}`;

        const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            const data = await response.json();
            const actualRevenue = data.totalRevenue || data.total || 0;

            // Update revenue progress with actual data
            const revenueTarget = parseFloat(document.getElementById('revenueProgress').dataset.target || 100000);
            const revenuePercent = Math.min(100, (actualRevenue / revenueTarget) * 100);

            document.getElementById('revenueProgress').textContent = `R${actualRevenue.toLocaleString()} / R${revenueTarget.toLocaleString()}`;
            document.getElementById('revenueBar').style.width = `${revenuePercent}%`;
            document.getElementById('revenuePercent').textContent = `${revenuePercent.toFixed(1)}%`;
        }
    } catch (error) {
        console.error('Error loading actual sales:', error);
    }
}

function updateBudgetUI(budget) {
    const revenueTarget = budget.revenueTarget || 100000;
    const expensesBudget = budget.totalExpensesBudget || 50000;
    const profitTarget = budget.profitTarget || (revenueTarget - expensesBudget);

    // Store targets
    document.getElementById('revenueProgress').dataset.target = revenueTarget;

    // Expenses
    const actualExpenses = budget.actualExpenses || 0;
    const expensesPercent = Math.min(100, (actualExpenses / expensesBudget) * 100);

    document.getElementById('expensesProgress').textContent = `R${actualExpenses.toLocaleString()} / R${expensesBudget.toLocaleString()}`;
    document.getElementById('expensesBar').style.width = `${expensesPercent}%`;
    document.getElementById('expensesPercent').textContent = `${expensesPercent.toFixed(1)}%`;
    document.getElementById('expensesStatus').textContent = expensesPercent > 80 ? 'Over budget!' : 'On track';
    document.getElementById('expensesBar').style.background = expensesPercent > 80 ? 'var(--red)' : 'linear-gradient(90deg, var(--green), var(--green-light))';

    // Profit
    const actualProfit = budget.actualProfit || 0;
    const profitPercent = profitTarget > 0 ? Math.min(100, (actualProfit / profitTarget) * 100) : 0;

    document.getElementById('profitProgress').textContent = `R${actualProfit.toLocaleString()} / R${profitTarget.toLocaleString()}`;
    document.getElementById('profitBar').style.width = `${profitPercent}%`;
    document.getElementById('profitPercent').textContent = `${profitPercent.toFixed(1)}%`;

    // Calculate margin
    const margin = budget.actualRevenue > 0 ? ((actualProfit / budget.actualRevenue) * 100).toFixed(1) : 0;
    document.getElementById('profitMargin').textContent = `${margin}% margin`;

    // Expense categories
    updateExpenseCategories(budget.categories || []);
}

function showNoBudgetState() {
    document.getElementById('revenueProgress').textContent = 'No budget set';
    document.getElementById('expensesProgress').textContent = 'No budget set';
    document.getElementById('profitProgress').textContent = 'No budget set';
    document.getElementById('expenseCategories').innerHTML = `
        <div style="text-align: center; padding: 1.5rem; grid-column: 1/-1;">
            <i class="fas fa-chart-pie" style="font-size: 2rem; color: var(--gray-300); margin-bottom: 0.5rem;"></i>
            <p style="color: var(--gray-500);">No budget configured for this month</p>
            <button onclick="openBudgetModal()" style="margin-top: 0.5rem; padding: 0.5rem 1rem; background: var(--gold); color: var(--green-deep); border: none; border-radius: 6px; cursor: pointer;">
                <i class="fas fa-plus"></i> Set Budget
            </button>
        </div>
    `;
}

function updateExpenseCategories(categories) {
    const container = document.getElementById('expenseCategories');
    const defaultCategories = [
        { name: 'Salaries', icon: 'fa-users', budgeted: 0, actual: 0 },
        { name: 'Rent', icon: 'fa-building', budgeted: 0, actual: 0 },
        { name: 'Utilities', icon: 'fa-bolt', budgeted: 0, actual: 0 },
        { name: 'Stock', icon: 'fa-boxes', budgeted: 0, actual: 0 },
        { name: 'Marketing', icon: 'fa-bullhorn', budgeted: 0, actual: 0 },
        { name: 'Other', icon: 'fa-ellipsis-h', budgeted: 0, actual: 0 }
    ];

    const displayCategories = categories.length > 0 ? categories : defaultCategories;

    container.innerHTML = displayCategories.map(cat => {
        const percent = cat.budgeted > 0 ? Math.min(100, (cat.actual / cat.budgeted) * 100) : 0;
        const isOver = percent > 100;

        return `
            <div style="text-align: center; padding: 1rem; background: var(--gray-50); border-radius: 8px; border: 1px solid ${isOver ? 'var(--red)' : 'var(--gray-200)'};">
                <i class="fas ${cat.icon || 'fa-folder'}" style="font-size: 1.25rem; color: ${isOver ? 'var(--red)' : 'var(--green)'}; margin-bottom: 0.5rem;"></i>
                <p style="font-weight: 600; font-size: 0.85rem; color: var(--green-deep); margin-bottom: 0.25rem;">${cat.name}</p>
                <p style="font-size: 0.75rem; color: var(--gray-500);">R${(cat.actual || 0).toLocaleString()} / R${(cat.budgeted || 0).toLocaleString()}</p>
                <div style="background: var(--gray-200); border-radius: 4px; height: 4px; margin-top: 0.5rem; overflow: hidden;">
                    <div style="background: ${isOver ? 'var(--red)' : 'var(--green)'}; height: 100%; width: ${Math.min(percent, 100)}%;"></div>
                </div>
            </div>
        `;
    }).join('');
}

function openBudgetModal() {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    const existing = document.getElementById('budgetEditorModal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'budgetEditorModal';
    modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:1200;display:flex;align-items:center;justify-content:center;animation:fadeIn 0.2s;';
    modal.innerHTML = `
        <div style="background:var(--white);border-radius:16px;width:90%;max-width:560px;max-height:90vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,0.3);">
            <div style="background:linear-gradient(135deg,var(--green) 0%,var(--green-dark) 100%);padding:1rem 1.25rem;display:flex;align-items:center;gap:0.75rem;border-radius:16px 16px 0 0;">
                <i class="fas fa-wallet" style="color:var(--gold);font-size:1.2rem;"></i>
                <h3 style="color:var(--cream);margin:0;font-family:'Oswald', sans-serif;font-size:1.2rem;">Set Monthly Budget - ${monthNames[month - 1]} ${year}</h3>
            </div>
            <div style="padding:1.25rem;">
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-bottom:1.25rem;">
                    <div>
                        <label style="display:block;font-weight:600;color:var(--green-dark);margin-bottom:0.35rem;font-size:0.85rem;">Revenue Target (R)</label>
                        <input type="number" id="budgetRevenueTarget" value="100000" min="0" step="1000" style="width:100%;padding:0.6rem;border:2px solid var(--gray-200);border-radius:8px;font-size:0.95rem;">
                    </div>
                    <div>
                        <label style="display:block;font-weight:600;color:var(--green-dark);margin-bottom:0.35rem;font-size:0.85rem;">Profit Target (R)</label>
                        <input type="number" id="budgetProfitTarget" value="30000" min="0" step="1000" style="width:100%;padding:0.6rem;border:2px solid var(--gray-200);border-radius:8px;font-size:0.95rem;">
                    </div>
                </div>
                <h4 style="color:var(--green);font-size:1rem;margin-bottom:0.75rem;"><i class="fas fa-chart-pie"></i> Expense Categories</h4>
                <div id="budgetCategoryInputs" style="display:flex;flex-direction:column;gap:0.6rem;">
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.5rem;">
                        <div><label style="font-size:0.8rem;color:var(--gray-500);">Salaries (R)</label><input type="number" class="budget-cat" data-name="Salaries" data-icon="fa-users" value="25000" min="0" step="500" style="width:100%;padding:0.5rem;border:1px solid var(--gray-200);border-radius:6px;"></div>
                        <div><label style="font-size:0.8rem;color:var(--gray-500);">Rent (R)</label><input type="number" class="budget-cat" data-name="Rent" data-icon="fa-building" value="8000" min="0" step="500" style="width:100%;padding:0.5rem;border:1px solid var(--gray-200);border-radius:6px;"></div>
                    </div>
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.5rem;">
                        <div><label style="font-size:0.8rem;color:var(--gray-500);">Utilities (R)</label><input type="number" class="budget-cat" data-name="Utilities" data-icon="fa-bolt" value="3000" min="0" step="500" style="width:100%;padding:0.5rem;border:1px solid var(--gray-200);border-radius:6px;"></div>
                        <div><label style="font-size:0.8rem;color:var(--gray-500);">Stock (R)</label><input type="number" class="budget-cat" data-name="Stock" data-icon="fa-boxes" value="15000" min="0" step="500" style="width:100%;padding:0.5rem;border:1px solid var(--gray-200);border-radius:6px;"></div>
                    </div>
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.5rem;">
                        <div><label style="font-size:0.8rem;color:var(--gray-500);">Marketing (R)</label><input type="number" class="budget-cat" data-name="Marketing" data-icon="fa-bullhorn" value="2000" min="0" step="500" style="width:100%;padding:0.5rem;border:1px solid var(--gray-200);border-radius:6px;"></div>
                        <div><label style="font-size:0.8rem;color:var(--gray-500);">Other (R)</label><input type="number" class="budget-cat" data-name="Other" data-icon="fa-ellipsis-h" value="2000" min="0" step="500" style="width:100%;padding:0.5rem;border:1px solid var(--gray-200);border-radius:6px;"></div>
                    </div>
                </div>
                <div id="budgetTotalExpenses" style="text-align:right;margin-top:0.75rem;font-weight:700;color:var(--green-dark);font-size:0.95rem;">Total Expenses: R55,000</div>
                <div style="display:flex;gap:0.75rem;margin-top:1.25rem;">
                    <button id="saveBudgetBtn" style="flex:1;padding:0.75rem;background:var(--gold);color:var(--green-deep);border:none;border-radius:8px;cursor:pointer;font-weight:700;font-size:0.95rem;">
                        <i class="fas fa-save"></i> Save Budget
                    </button>
                    <button id="cancelBudgetBtn" style="flex:1;padding:0.75rem;background:var(--gray-200);color:var(--gray-700);border:none;border-radius:8px;cursor:pointer;font-weight:600;font-size:0.95rem;">
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // Calculate total expenses on input change
    const updateTotal = () => {
        let total = 0;
        document.querySelectorAll('.budget-cat').forEach(input => {
            total += parseFloat(input.value) || 0;
        });
        document.getElementById('budgetTotalExpenses').textContent = `Total Expenses: R${total.toLocaleString()}`;
    };
    document.querySelectorAll('.budget-cat').forEach(input => input.addEventListener('input', updateTotal));

    const cleanup = () => modal.remove();

    document.getElementById('saveBudgetBtn').addEventListener('click', async () => {
        const categories = [];
        document.querySelectorAll('.budget-cat').forEach(input => {
            categories.push({
                name: input.dataset.name,
                icon: input.dataset.icon,
                budgeted: parseFloat(input.value) || 0,
                actual: 0
            });
        });

        const totalExpenses = categories.reduce((sum, c) => sum + c.budgeted, 0);
        const budgetData = {
            year,
            month,
            revenueTarget: parseFloat(document.getElementById('budgetRevenueTarget').value) || 0,
            profitTarget: parseFloat(document.getElementById('budgetProfitTarget').value) || 0,
            totalExpensesBudget: totalExpenses,
            categories,
            branch: document.getElementById('budgetBranchSelect')?.value || 'all'
        };

        try {
            const res = await fetch(`${API_URL}/budgets`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(budgetData)
            });

            if (res.ok) {
                showToast('Budget saved successfully', 'success');
                cleanup();
                loadBudgetData();
            } else {
                throw new Error('Failed to save');
            }
        } catch (error) {
            console.error('Error saving budget:', error);
            showToast('Failed to save budget', 'error');
        }
    });

    document.getElementById('cancelBudgetBtn').addEventListener('click', cleanup);
    modal.addEventListener('click', (e) => { if (e.target === modal) cleanup(); });
}

async function viewBudgetHistory() {
    const existing = document.getElementById('budgetHistoryModal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'budgetHistoryModal';
    modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:1200;display:flex;align-items:center;justify-content:center;animation:fadeIn 0.2s;';

    modal.innerHTML = `
        <div style="background:var(--white);border-radius:16px;width:90%;max-width:640px;max-height:85vh;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,0.3);display:flex;flex-direction:column;">
            <div style="background:linear-gradient(135deg,var(--green) 0%,var(--green-dark) 100%);padding:1rem 1.25rem;display:flex;align-items:center;gap:0.75rem;">
                <i class="fas fa-history" style="color:var(--gold);font-size:1.2rem;"></i>
                <h3 style="color:var(--cream);margin:0;font-family:'Oswald', sans-serif;font-size:1.2rem;">Budget History</h3>
            </div>
            <div style="padding:1.25rem;overflow-y:auto;flex:1;" id="budgetHistoryContent">
                <div style="text-align:center;padding:2rem;color:var(--gray-500);">
                    <i class="fas fa-spinner fa-spin" style="font-size:2rem;margin-bottom:1rem;"></i>
                    <p>Loading budget history...</p>
                </div>
            </div>
            <div style="padding:0.75rem 1.25rem;border-top:1px solid var(--gray-200);text-align:right;">
                <button id="closeBudgetHistory" style="padding:0.5rem 1.25rem;background:var(--gray-200);color:var(--gray-700);border:none;border-radius:6px;cursor:pointer;font-weight:600;">Close</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    const cleanup = () => modal.remove();
    document.getElementById('closeBudgetHistory').addEventListener('click', cleanup);
    modal.addEventListener('click', (e) => { if (e.target === modal) cleanup(); });

    try {
        const year = new Date().getFullYear();
        const res = await fetch(`${API_URL}/budgets?year=${year}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const content = document.getElementById('budgetHistoryContent');
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

        if (res.ok) {
            const data = await res.json();
            const budgets = data.budgets || data.data || [];

            if (budgets.length === 0) {
                content.innerHTML = `
                    <div style="text-align:center;padding:2rem;color:var(--gray-500);">
                        <i class="fas fa-chart-bar" style="font-size:2rem;color:var(--gray-300);margin-bottom:1rem;"></i>
                        <p>No budget history found for ${year}</p>
                        <button onclick="document.getElementById('budgetHistoryModal').remove(); openBudgetModal();" style="margin-top:0.5rem;padding:0.5rem 1rem;background:var(--gold);color:var(--green-deep);border:none;border-radius:6px;cursor:pointer;">
                            <i class="fas fa-plus"></i> Set This Month's Budget
                        </button>
                    </div>
                `;
            } else {
                content.innerHTML = budgets.map(b => {
                    const revenuePercent = b.revenueTarget > 0 ? Math.min(100, ((b.actualRevenue || 0) / b.revenueTarget) * 100) : 0;
                    const expensePercent = b.totalExpensesBudget > 0 ? Math.min(100, ((b.actualExpenses || 0) / b.totalExpensesBudget) * 100) : 0;
                    const isOverBudget = expensePercent > 100;

                    return `
                        <div style="background:var(--gray-50);border-radius:12px;padding:1rem;margin-bottom:0.75rem;border:1px solid var(--gray-200);">
                            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.5rem;">
                                <strong style="color:var(--green-dark);">${monthNames[(b.month || 1) - 1]} ${b.year || year}</strong>
                                <span style="background:${isOverBudget ? 'var(--red)' : 'var(--green)'};color:white;padding:0.2rem 0.6rem;border-radius:12px;font-size:0.75rem;">
                                    ${isOverBudget ? 'Over Budget' : 'On Track'}
                                </span>
                            </div>
                            <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:0.5rem;font-size:0.85rem;">
                                <div><small style="color:var(--gray-500);">Revenue</small><div>R${(b.actualRevenue || 0).toLocaleString()} / R${(b.revenueTarget || 0).toLocaleString()}</div></div>
                                <div><small style="color:var(--gray-500);">Expenses</small><div style="color:${isOverBudget ? 'var(--red)' : 'inherit'};">R${(b.actualExpenses || 0).toLocaleString()} / R${(b.totalExpensesBudget || 0).toLocaleString()}</div></div>
                                <div><small style="color:var(--gray-500);">Profit</small><div>R${(b.actualProfit || 0).toLocaleString()} / R${(b.profitTarget || 0).toLocaleString()}</div></div>
                            </div>
                        </div>
                    `;
                }).join('');
            }
        } else {
            content.innerHTML = `
                <div style="text-align:center;padding:2rem;color:var(--gray-500);">
                    <i class="fas fa-exclamation-triangle" style="font-size:2rem;color:var(--gold);margin-bottom:1rem;"></i>
                    <p>Budget history not available yet</p>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error loading budget history:', error);
        document.getElementById('budgetHistoryContent').innerHTML = `
            <div style="text-align:center;padding:2rem;color:var(--gray-500);">
                <i class="fas fa-exclamation-circle" style="font-size:2rem;color:var(--red);margin-bottom:1rem;"></i>
                <p>Failed to load budget history</p>
            </div>
        `;
    }
}
