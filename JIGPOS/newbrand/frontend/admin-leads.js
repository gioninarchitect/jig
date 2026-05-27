// ===== ADMIN LEADS MODULE =====

// Lead Management Functions
let allLeads = [];
let allStaffMembers = [];

async function loadLeads() {
    const token = sessionStorage.getItem('adminToken');

    try {
        const response = await fetch(`${API_URL}/leads`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();

        if (data.success) {
            allLeads = data.leads;
            displayLeads(allLeads);
            updateLeadStats(data.stats);

            // Load staff for assignment dropdown
            await loadStaffForLeads();
        } else {
            console.error('Error loading leads:', data.message);
        }
    } catch (error) {
        console.error('Load leads error:', error);
    }
}

async function loadStaffForLeads() {
    const token = sessionStorage.getItem('adminToken');

    try {
        const response = await fetch(`${API_URL}/staff`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();

        if (data.success) {
            allStaffMembers = data.staff;

            // Populate staff filter dropdown
            const filterSelect = document.getElementById('leadAssignedFilter');
            const modalSelect = document.getElementById('leadAssignedTo');

            allStaffMembers.forEach(staff => {
                const option1 = document.createElement('option');
                option1.value = staff._id;
                option1.textContent = `${staff.firstName} ${staff.lastName} (${staff.role === 'branch_manager' ? 'Manager' : 'Assistant'})`;
                filterSelect.appendChild(option1);

                const option2 = document.createElement('option');
                option2.value = staff._id;
                option2.textContent = `${staff.firstName} ${staff.lastName}`;
                modalSelect.appendChild(option2);
            });
        }
    } catch (error) {
        console.error('Load staff error:', error);
    }
}

function updateLeadStats(stats) {
    document.getElementById('newLeadsCount').textContent = stats.statusCounts.new || 0;
    document.getElementById('convertedLeadsCount').textContent = stats.statusCounts.converted || 0;
    document.getElementById('totalLeadsCount').textContent = stats.total || 0;
}

function displayLeads(leads) {
    const leadsList = document.getElementById('leadsList');

    if (leads.length === 0) {
        leadsList.innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 40px; color: #666;">No leads found</td></tr>';
        return;
    }

    leadsList.innerHTML = leads.map(lead => {
        const statusColors = {
            new: 'var(--red)',
            contacted: 'var(--gold)',
            qualified: 'var(--gold-dark)',
            converted: 'var(--green)',
            rejected: 'var(--green-light)'
        };

        const typeLabels = {
            'waiting-list': 'Waiting List',
            'franchise-application': 'Franchise',
            'contact-form': 'Contact'
        };

        const createdDate = new Date(lead.createdAt).toLocaleDateString();
        const assignedName = lead.assignedTo ? `${lead.assignedTo.firstName} ${lead.assignedTo.lastName}` : 'Unassigned';

        return `
            <tr>
                <td>${lead.name}</td>
                <td>${lead.email}</td>
                <td>${lead.mobile}</td>
                <td><span class="status-badge" style="background: var(--green-light); color: var(--cream); padding: 4px 12px; border-radius: 12px; font-size: 0.85rem;">${typeLabels[lead.type]}</span></td>
                <td><span class="status-badge" style="background: ${statusColors[lead.status]}; color: var(--cream); padding: 4px 12px; border-radius: 12px; font-size: 0.85rem;">${lead.status.charAt(0).toUpperCase() + lead.status.slice(1)}</span></td>
                <td>${assignedName}</td>
                <td>${createdDate}</td>
                <td>
                    <button class="action-btn view-btn" style="padding:6px 14px;font-size:0.82rem;white-space:nowrap;" onclick="viewLead('${lead._id}')"><i class="fas fa-eye"></i> View</button>
                </td>
            </tr>
        `;
    }).join('');
}

function filterLeads() {
    const searchTerm = document.getElementById('leadSearch').value.toLowerCase();
    const statusFilter = document.getElementById('leadStatusFilter').value;
    const typeFilter = document.getElementById('leadTypeFilter').value;
    const assignedFilter = document.getElementById('leadAssignedFilter').value;

    let filtered = allLeads.filter(lead => {
        const matchesSearch = lead.name.toLowerCase().includes(searchTerm) ||
            lead.email.toLowerCase().includes(searchTerm) ||
            lead.mobile.includes(searchTerm);

        const matchesStatus = statusFilter === 'all' || lead.status === statusFilter;
        const matchesType = typeFilter === 'all' || lead.type === typeFilter;

        let matchesAssigned = true;
        if (assignedFilter === 'unassigned') {
            matchesAssigned = !lead.assignedTo;
        } else if (assignedFilter !== 'all') {
            matchesAssigned = lead.assignedTo && lead.assignedTo._id === assignedFilter;
        }

        return matchesSearch && matchesStatus && matchesType && matchesAssigned;
    });

    displayLeads(filtered);
}

async function viewLead(leadId) {
    const token = sessionStorage.getItem('adminToken');

    try {
        const response = await fetch(`${API_URL}/leads/${leadId}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();

        if (data.success) {
            const lead = data.lead;

            // Populate modal
            document.getElementById('leadId').value = lead._id;
            document.getElementById('leadStatus').value = lead.status;
            document.getElementById('leadAssignedTo').value = lead.assignedTo?._id || '';
            document.getElementById('leadNotes').value = lead.notes || '';

            // Set mailto and tel links
            document.getElementById('leadEmail').href = `mailto:${lead.email}`;
            document.getElementById('leadPhone').href = `tel:${lead.mobile}`;

            // Display lead details
            const typeLabels = {
                'waiting-list': 'Waiting List',
                'franchise-application': 'Franchise Application',
                'contact-form': 'Contact Form'
            };

            let detailsHTML = `
                <div style="background: var(--or-white); padding: 15px; border-radius: 10px;">
                    <p style="margin: 8px 0; color: var(--green-deep);"><strong>Name:</strong> ${lead.name}</p>
                    <p style="margin: 8px 0; color: var(--green-deep);"><strong>Email:</strong> ${lead.email}</p>
                    <p style="margin: 8px 0; color: var(--green-deep);"><strong>Mobile:</strong> ${lead.mobile}</p>
                    <p style="margin: 8px 0; color: var(--green-deep);"><strong>Type:</strong> ${typeLabels[lead.type]}</p>
                    <p style="margin: 8px 0; color: var(--green-deep);"><strong>Submitted:</strong> ${new Date(lead.createdAt).toLocaleString()}</p>
            `;

            if (lead.location) {
                detailsHTML += `<p style="margin: 8px 0; color: var(--green-deep);"><strong>Location:</strong> ${lead.location}</p>`;
            }

            if (lead.investment) {
                detailsHTML += `<p style="margin: 8px 0; color: var(--green-deep);"><strong>Investment:</strong> ${lead.investment}</p>`;
            }

            detailsHTML += `</div>`;

            document.getElementById('leadDetails').innerHTML = detailsHTML;

            // Show modal
            document.getElementById('leadModal').style.display = 'block';
        } else {
            showAdminToast('Error', data.message || 'Error loading lead details', 'error');
        }
    } catch (error) {
        console.error('View lead error:', error);
        showAdminToast('Network Error', 'Please try again', 'error');
    }
}

function closeLeadModal() {
    document.getElementById('leadModal').style.display = 'none';
}

async function updateLead(event) {
    event.preventDefault();

    const leadId = document.getElementById('leadId').value;
    const status = document.getElementById('leadStatus').value;
    const assignedTo = document.getElementById('leadAssignedTo').value || null;
    const notes = document.getElementById('leadNotes').value;

    const token = sessionStorage.getItem('adminToken');

    try {
        const response = await fetch(`${API_URL}/leads/${leadId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                status,
                assignedTo,
                notes
            })
        });

        const data = await response.json();

        if (data.success) {
            showAdminToast('Success', 'Lead updated successfully!', 'success');
            closeLeadModal();
            loadLeads();
        } else {
            showAdminToast('Error', data.message || 'Error updating lead', 'error');
        }
    } catch (error) {
        console.error('Update lead error:', error);
        showAdminToast('Network Error', 'Please try again', 'error');
    }
}
