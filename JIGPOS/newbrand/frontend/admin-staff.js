// ===== ADMIN STAFF MODULE =====

        let allStaff = [];

        // Load all staff members
        async function loadStaff() {
            try {
                const token = sessionStorage.getItem('adminToken');
                if (!token) {
                    showAdminToast('Authentication Required', 'Please login first', 'error');
                    return;
                }

                const response = await fetch(`${API_URL}/staff`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                const data = await response.json();

                if (data.success) {
                    allStaff = data.staff;
                    displayStaff(allStaff);
                } else {
                    console.error('Failed to load staff:', data.message);
                }
            } catch (error) {
                console.error('Load staff error:', error);
            }
        }

        // Display staff in table
        function displayStaff(staff) {
            const tbody = document.getElementById('staffList');

            if (!staff || staff.length === 0) {
                tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 40px; color: var(--green-light);">No staff members found</td></tr>';
                return;
            }

            let html = '';
            staff.forEach(member => {
                const roleLabel = member.role === 'branch_manager' ? 'Store Manager' : 'Shop Assistant';
                const statusBadge = member.isActive
                    ? '<span style="background: var(--green); color: var(--cream); padding: 4px 12px; border-radius: 12px; font-size: 0.85em;">Active</span>'
                    : '<span style="background: var(--green-light); color: var(--cream); padding: 4px 12px; border-radius: 12px; font-size: 0.85em;">Inactive</span>';

                const hireDate = member.staffInfo?.hireDate ? new Date(member.staffInfo.hireDate).toLocaleDateString() : 'N/A';

                html += `
                    <tr>
                        <td>${member.staffInfo?.employeeId || 'N/A'}</td>
                        <td>${member.firstName} ${member.lastName}</td>
                        <td>${member.email}</td>
                        <td>${roleLabel}</td>
                        <td>${member.staffInfo?.department || 'General'}</td>
                        <td>${hireDate}</td>
                        <td>${statusBadge}</td>
                        <td>
                            <div style="display:flex;gap:6px;align-items:center;">
                                <button class="action-btn view-btn" onclick="editStaff('${member._id}')" style="padding:6px 14px;font-size:0.82rem;white-space:nowrap;">
                                    <i class="fas fa-pen"></i> Edit
                                </button>
                                <button class="action-btn ${member.isActive ? 'reject' : 'approve'}-btn" onclick="toggleStaffStatus('${member._id}', ${member.isActive})" style="padding:6px 14px;font-size:0.82rem;white-space:nowrap;">
                                    <i class="fas ${member.isActive ? 'fa-ban' : 'fa-check'}"></i> ${member.isActive ? 'Suspend' : 'Activate'}
                                </button>
                            </div>
                        </td>
                    </tr>
                `;
            });

            tbody.innerHTML = html;
        }

        // Filter staff
        function filterStaff() {
            const searchTerm = document.getElementById('staffSearch').value.toLowerCase();
            const roleFilter = document.getElementById('staffRoleFilter').value;
            const statusFilter = document.getElementById('staffStatusFilter').value;

            let filtered = allStaff.filter(member => {
                const matchesSearch = member.firstName.toLowerCase().includes(searchTerm) ||
                    member.lastName.toLowerCase().includes(searchTerm) ||
                    member.email.toLowerCase().includes(searchTerm) ||
                    (member.staffInfo?.employeeId || '').toLowerCase().includes(searchTerm);

                const matchesRole = roleFilter === 'all' || member.role === roleFilter;

                const matchesStatus = statusFilter === 'all' ||
                    (statusFilter === 'active' && member.isActive) ||
                    (statusFilter === 'inactive' && !member.isActive);

                return matchesSearch && matchesRole && matchesStatus;
            });

            displayStaff(filtered);
        }

        // Open Add Staff Modal
        function openAddStaffModal() {
            document.getElementById('staffModalTitle').textContent = 'Add Staff Member';
            document.getElementById('staffForm').reset();
            document.getElementById('staffId').value = '';
            document.getElementById('passwordField').style.display = 'block';
            document.getElementById('staffPassword').required = true;
            document.getElementById('staffModal').style.display = 'flex';
        }

        // Edit Staff
        async function editStaff(staffId) {
            try {
                const token = sessionStorage.getItem('adminToken');
                const response = await fetch(`${API_URL}/staff/${staffId}`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                const data = await response.json();

                if (data.success) {
                    const staff = data.staff;

                    document.getElementById('staffModalTitle').textContent = 'Edit Staff Member';
                    document.getElementById('staffId').value = staff._id;
                    document.getElementById('staffFirstName').value = staff.firstName;
                    document.getElementById('staffLastName').value = staff.lastName;
                    document.getElementById('staffEmail').value = staff.email;
                    document.getElementById('staffPhone').value = staff.profile?.phone || '';
                    document.getElementById('staffRole').value = staff.role;
                    document.getElementById('staffDepartment').value = staff.staffInfo?.department || '';
                    document.getElementById('staffWorkSchedule').value = staff.staffInfo?.workSchedule || 'full-time';

                    // Hide password field for editing
                    document.getElementById('passwordField').style.display = 'none';
                    document.getElementById('staffPassword').required = false;

                    document.getElementById('staffModal').style.display = 'flex';
                } else {
                    showAdminToast('Error', 'Error loading staff member', 'error');
                }
            } catch (error) {
                console.error('Edit staff error:', error);
                showAdminToast('Error', 'Error loading staff member', 'error');
            }
        }

        // Close Staff Modal
        function closeStaffModal() {
            document.getElementById('staffModal').style.display = 'none';
            document.getElementById('staffForm').reset();
        }

        // Save Staff (Create or Update)
        async function saveStaff(event) {
            event.preventDefault();

            const staffId = document.getElementById('staffId').value;
            const firstName = document.getElementById('staffFirstName').value;
            const lastName = document.getElementById('staffLastName').value;
            const email = document.getElementById('staffEmail').value;
            const password = document.getElementById('staffPassword').value;
            const phone = document.getElementById('staffPhone').value;
            const role = document.getElementById('staffRole').value;
            const department = document.getElementById('staffDepartment').value;
            const workSchedule = document.getElementById('staffWorkSchedule').value;

            const token = sessionStorage.getItem('adminToken');

            try {
                let url = `${API_URL}/staff`;
                let method = 'POST';
                let body = {
                    firstName,
                    lastName,
                    email,
                    phone,
                    role,
                    department,
                    workSchedule
                };

                if (staffId) {
                    // Update existing staff
                    url = `${API_URL}/staff/${staffId}`;
                    method = 'PUT';
                } else {
                    // Create new staff - password required
                    body.password = password;
                }

                const response = await fetch(url, {
                    method,
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify(body)
                });

                const data = await response.json();

                if (data.success) {
                    showAdminToast('Success', staffId ? 'Staff member updated successfully!' : 'Staff member created successfully!', 'success');
                    closeStaffModal();
                    loadStaff();
                } else {
                    showAdminToast('Error', data.message || 'Error saving staff member', 'error');
                }
            } catch (error) {
                console.error('Save staff error:', error);
                showAdminToast('Network Error', 'Please try again', 'error');
            }
        }

        // Toggle Staff Status (Activate/Deactivate)
        async function toggleStaffStatus(staffId, currentStatus) {
            const action = currentStatus ? 'deactivate' : 'activate';
            showAdminConfirm(
                `${action.charAt(0).toUpperCase() + action.slice(1)} Staff`,
                `Are you sure you want to ${action} this staff member?`,
                async () => {
                    try {
                        const token = sessionStorage.getItem('adminToken');
                        const response = await fetch(`${API_URL}/staff/${staffId}?permanent=false`, {
                            method: 'DELETE',
                            headers: {
                                'Authorization': `Bearer ${token}`
                            }
                        });

                        const data = await response.json();

                        if (data.success) {
                            showAdminToast('Success', `Staff member ${action}d successfully!`, 'success');
                            loadStaff();
                        } else {
                            showAdminToast('Error', data.message || `Error ${action}ing staff member`, 'error');
                        }
                    } catch (error) {
                        console.error('Toggle staff status error:', error);
                        showAdminToast('Network Error', 'Please try again', 'error');
                    }
                }
            );
        }
