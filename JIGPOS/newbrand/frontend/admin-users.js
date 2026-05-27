// ===== ADMIN USERS MODULE =====

        // User Management Functions
        async function loadUsers() {
            const tbody = document.getElementById('usersList');
            tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 40px;">Loading users...</td></tr>';

            try {
                const token = sessionStorage.getItem('adminToken');
                const response = await fetch(`${API_URL}/users`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (!response.ok) {
                    throw new Error('Failed to load users');
                }

                const data = await response.json();
                displayUsers(data.users || []);
            } catch (error) {
                console.error('Load users error:', error);
                tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 40px; color: var(--green-light);">Failed to load users</td></tr>';
            }
        }

        let allUsersData = [];

        function displayUsers(users) {
            allUsersData = users;
            const tbody = document.getElementById('usersList');

            if (users.length === 0) {
                tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: var(--green-light);">No users found</td></tr>';
                return;
            }

            let html = '';
            users.forEach((user) => {
                const roleDisplay = {
                    'user': 'Customer',
                    'admin': 'Admin',
                    'owner': 'Owner',
                    'branch_manager': 'Store Manager',
                    'branch_assistant': 'Assistant',
                    'inventory_manager': 'Inventory Mgr',
                    'packer': 'Packer',
                    'dispatch_manager': 'Dispatch Mgr'
                };

                // Section 21 status display
                const section21Status = user.section21Status || user.kyc?.section21?.status || 'none';
                let section21Badge = '';
                if (section21Status === 'approved' || user.kyc?.section21?.verified) {
                    section21Badge = '<span class="status-badge status-approved">MT Approved</span>';
                } else if (section21Status === 'pending') {
                    section21Badge = '<span class="status-badge status-pending">MT Pending</span>';
                } else if (section21Status === 'rejected') {
                    section21Badge = '<span class="status-badge status-rejected">MT Rejected</span>';
                } else {
                    section21Badge = '<span style="color: var(--pg-grey-2); font-size: 0.8rem;">-</span>';
                }

                // Account status
                const accountStatus = user.status || 'active';
                const statusBadge = accountStatus === 'active'
                    ? '<span class="status-badge status-approved">Active</span>'
                    : '<span class="status-badge status-rejected">Suspended</span>';

                html += `
                    <tr data-user-id="${user._id}" data-status="${accountStatus}" data-role="${user.role}" data-section21="${section21Status}">
                        <td>
                            <div>
                                <div style="font-weight: bold;">${user.firstName || ''} ${user.lastName || ''}</div>
                                <div style="color: var(--green-light); font-size: 0.85rem;">${roleDisplay[user.role] || user.role}</div>
                            </div>
                        </td>
                        <td>${user.email}</td>
                        <td>${user.profile?.phone || user.phone || 'N/A'}</td>
                        <td>${section21Badge}</td>
                        <td>${statusBadge}</td>
                        <td>R${(user.loyalty?.totalSpent || 0).toFixed(2)}</td>
                        <td>
                            <div style="display:flex;gap:6px;align-items:center;">
                                <button class="action-btn view-btn" onclick="editUser('${user._id}')" title="Edit" style="padding:6px 14px;font-size:0.82rem;white-space:nowrap;">
                                    <i class="fas fa-pen"></i> Edit
                                </button>
                                <button class="action-btn ${accountStatus === 'active' ? 'reject-btn' : 'approve-btn'}"
                                    onclick="toggleUserStatus('${user._id}', '${accountStatus}')"
                                    title="${accountStatus === 'active' ? 'Suspend' : 'Activate'}" style="padding:6px 14px;font-size:0.82rem;white-space:nowrap;">
                                    <i class="fas ${accountStatus === 'active' ? 'fa-ban' : 'fa-check'}"></i> ${accountStatus === 'active' ? 'Suspend' : 'Activate'}
                                </button>
                                <button class="action-btn reject-btn"
                                    onclick="deleteUser('${user._id}', '${user.email}')" title="Delete" style="padding:6px 14px;font-size:0.82rem;white-space:nowrap;">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
                        </td>
                    </tr>
                `;
            });

            tbody.innerHTML = html;
        }

        async function viewUserDetails(userId) {
            try {
                const token = sessionStorage.getItem('adminToken');
                const response = await fetch(`${API_URL}/users/${userId}`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (!response.ok) {
                    throw new Error('Failed to load user details');
                }

                const data = await response.json();
                const user = data.user;

                const details = `
User Details:
Name: ${user.firstName} ${user.lastName}
Email: ${user.email}
Phone: ${user.profile?.phone || 'N/A'}
Role: ${user.role}
Joined: ${new Date(user.createdAt).toLocaleString()}
Lifestyle Member: ${user.isLifestyleMember ? 'Yes' : 'No'}
Section 21 Status: ${user.kyc?.section21?.verified ? 'Verified Patient' : 'Not Verified'}
LD Coins: ${user.loyalty?.ldCoins || 0}
Total Spent: R${user.loyalty?.totalSpent || 0}
                `;

                showAdminToast('Details', details, 'info');
            } catch (error) {
                console.error('View user details error:', error);
                showAdminToast('Error', 'Failed to load user details', 'error');
            }
        }

        async function upgradeToLifestyle(userId) {
            showAdminConfirm(
                'Upgrade User',
                'Upgrade this user to Lifestyle Member? They will receive member benefits immediately.',
                async () => {
                    try {
                        const token = sessionStorage.getItem('adminToken');
                        const response = await fetch(`${API_URL}/users/${userId}`, {
                            method: 'PUT',
                            headers: {
                                'Authorization': `Bearer ${token}`,
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({
                                isLifestyleMember: true,
                                memberSince: new Date().toISOString(),
                                membershipSource: 'Admin Upgrade'
                            })
                        });

                        if (!response.ok) {
                            throw new Error('Failed to upgrade user');
                        }

                        showAdminToast('Success', 'User upgraded to Lifestyle Member successfully!', 'success');
                        loadUsers();
                    } catch (error) {
                        console.error('Upgrade user error:', error);
                        showAdminToast('Error', 'Failed to upgrade user', 'error');
                    }
                }
            );
        }

        function filterUsers() {
            const search = document.getElementById('userSearch').value.toLowerCase();
            const statusFilter = document.getElementById('userStatusFilter').value;
            const roleFilter = document.getElementById('userRoleFilter')?.value || 'all';
            const section21Filter = document.getElementById('userSection21Filter')?.value || 'all';
            const rows = document.querySelectorAll('#usersList tr');

            rows.forEach(row => {
                const text = row.textContent.toLowerCase();
                const matchesSearch = text.includes(search);

                const rowStatus = row.dataset.status || 'active';
                const rowRole = row.dataset.role || 'user';
                const rowSection21 = row.dataset.section21 || 'none';

                let matchesStatus = statusFilter === 'all' || rowStatus === statusFilter;
                let matchesRole = roleFilter === 'all' || rowRole === roleFilter;
                let matchesSection21 = section21Filter === 'all' || rowSection21 === section21Filter;

                row.style.display = (matchesSearch && matchesStatus && matchesRole && matchesSection21) ? '' : 'none';
            });
        }

        // ===== USER CRUD FUNCTIONS =====

        async function editUser(userId) {
            try {
                const token = sessionStorage.getItem('adminToken');
                const response = await fetch(`${API_URL}/users/${userId}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                if (!response.ok) throw new Error('Failed to load user');

                const data = await response.json();
                const user = data.user;

                // Populate the edit modal - Basic Info
                document.getElementById('editUserId').value = user._id;
                document.getElementById('editUserFirstName').value = user.firstName || '';
                document.getElementById('editUserLastName').value = user.lastName || '';
                document.getElementById('editUserEmail').value = user.email || '';
                document.getElementById('editUserPhone').value = user.profile?.phone || user.phone || '';
                document.getElementById('editUserStatus').value = user.status || 'active';
                document.getElementById('editUserRole').value = user.role || 'user';

                // Profile Summary Header
                const firstName = user.firstName || '';
                const lastName = user.lastName || '';
                const initials = (firstName.charAt(0) + lastName.charAt(0)).toUpperCase() || '??';
                document.getElementById('userInitials').textContent = initials;
                document.getElementById('userFullName').textContent = `${firstName} ${lastName}`.trim() || 'Unknown User';
                document.getElementById('userEmailDisplay').textContent = user.email || '-';

                // Role Badge
                const roleLabels = {
                    'user': 'Customer', 'admin': 'Admin', 'owner': 'Owner',
                    'branch_manager': 'Manager', 'branch_assistant': 'Assistant',
                    'inventory_manager': 'Inventory Mgr'
                };
                document.getElementById('userRoleBadge').textContent = roleLabels[user.role] || user.role;

                // Status Badge
                const statusBadge = document.getElementById('userStatusBadge');
                const accountStatus = user.status || 'active';
                statusBadge.textContent = accountStatus === 'active' ? 'Active' : 'Suspended';
                statusBadge.style.background = accountStatus === 'active' ? '#10b981' : '#ef4444';
                statusBadge.style.color = 'white';

                // Stats
                document.getElementById('userTotalSpent').textContent = `R${(user.loyalty?.totalSpent || 0).toFixed(2)}`;
                document.getElementById('userOrderCount').textContent = user.orderCount || user.loyalty?.orderCount || '0';
                document.getElementById('userWellnessPoints').textContent = user.loyalty?.ldCoins || user.loyalty?.wellnessPoints || '0';

                // Dates
                document.getElementById('userCreatedAt').textContent = user.createdAt
                    ? new Date(user.createdAt).toLocaleDateString('en-ZA', { year: 'numeric', month: 'short', day: 'numeric' })
                    : '-';
                document.getElementById('userLastLogin').textContent = user.lastLogin
                    ? new Date(user.lastLogin).toLocaleDateString('en-ZA', { year: 'numeric', month: 'short', day: 'numeric' })
                    : 'Never';

                // Section 21 / Medical Track Details
                const section21Status = user.section21Status || user.kyc?.section21?.status || 'none';
                document.getElementById('editUserSection21').value = section21Status;

                const section21Panel = document.getElementById('section21Panel');
                const s21Details = user.section21Details || user.kyc?.section21 || {};

                if (section21Status === 'approved' || s21Details.verified) {
                    section21Panel.style.display = 'block';
                    document.getElementById('s21AuthNumber').textContent = s21Details.authorizationNumber || '-';
                    document.getElementById('s21DoctorName').textContent = s21Details.doctorName || '-';
                    document.getElementById('s21PracticeNumber').textContent = s21Details.practiceNumber || '-';
                    document.getElementById('s21ExpiryDate').textContent = s21Details.expiryDate
                        ? new Date(s21Details.expiryDate).toLocaleDateString('en-ZA')
                        : '-';
                    document.getElementById('s21Conditions').textContent =
                        Array.isArray(s21Details.conditions) ? s21Details.conditions.join(', ') : (s21Details.conditions || '-');
                } else {
                    section21Panel.style.display = 'none';
                }

                // Show modal
                document.getElementById('userEditModal').style.display = 'flex';
            } catch (error) {
                console.error('Edit user error:', error);
                showAdminToast('Error', 'Failed to load user details', 'error');
            }
        }

        function closeUserEditModal() {
            document.getElementById('userEditModal').style.display = 'none';
        }

        async function saveUserChanges() {
            const userId = document.getElementById('editUserId').value;
            const updateData = {
                firstName: document.getElementById('editUserFirstName').value,
                lastName: document.getElementById('editUserLastName').value,
                email: document.getElementById('editUserEmail').value,
                phone: document.getElementById('editUserPhone').value,
                status: document.getElementById('editUserStatus').value,
                role: document.getElementById('editUserRole').value,
                section21Status: document.getElementById('editUserSection21').value
            };

            try {
                const token = sessionStorage.getItem('adminToken');
                const response = await fetch(`${API_URL}/users/${userId}`, {
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(updateData)
                });

                if (!response.ok) {
                    const err = await response.json();
                    throw new Error(err.message || 'Failed to update user');
                }

                showAdminToast('Success', 'User updated successfully', 'success');
                closeUserEditModal();
                loadUsers();
            } catch (error) {
                console.error('Save user error:', error);
                showAdminToast('Error', error.message || 'Failed to update user', 'error');
            }
        }

        async function toggleUserStatus(userId, currentStatus) {
            const newStatus = currentStatus === 'active' ? 'suspended' : 'active';
            const action = newStatus === 'suspended' ? 'suspend' : 'activate';

            showAdminConfirm(
                `${action.charAt(0).toUpperCase() + action.slice(1)} User`,
                `Are you sure you want to ${action} this user account?`,
                async () => {
                    try {
                        const token = sessionStorage.getItem('adminToken');
                        const response = await fetch(`${API_URL}/users/${userId}`, {
                            method: 'PUT',
                            headers: {
                                'Authorization': `Bearer ${token}`,
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({ status: newStatus })
                        });

                        if (!response.ok) throw new Error(`Failed to ${action} user`);

                        showAdminToast('Success', `User ${action}d successfully`, 'success');
                        loadUsers();
                    } catch (error) {
                        console.error(`${action} user error:`, error);
                        showAdminToast('Error', `Failed to ${action} user`, 'error');
                    }
                }
            );
        }

        async function deleteUser(userId, userEmail) {
            showAdminConfirm(
                'Delete User',
                `Are you sure you want to permanently delete ${userEmail}? This action cannot be undone.`,
                async () => {
                    try {
                        const token = sessionStorage.getItem('adminToken');
                        const response = await fetch(`${API_URL}/users/${userId}`, {
                            method: 'DELETE',
                            headers: { 'Authorization': `Bearer ${token}` }
                        });

                        if (!response.ok) throw new Error('Failed to delete user');

                        showAdminToast('Success', 'User deleted successfully', 'success');
                        loadUsers();
                    } catch (error) {
                        console.error('Delete user error:', error);
                        showAdminToast('Error', 'Failed to delete user', 'error');
                    }
                }
            );
        }
