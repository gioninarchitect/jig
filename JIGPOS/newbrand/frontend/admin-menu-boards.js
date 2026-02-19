// ===== ADMIN MENU BOARDS MODULE =====
let allMenuBoards = [];
let editingMenuBoardId = null;

function openCreateMenuBoardModal() {
    editingMenuBoardId = null;
    const modal = document.getElementById('menuBoardModal');
    if (modal) {
        modal.style.display = 'flex';
        const form = document.getElementById('menuBoardForm');
        if (form) form.reset();
    } else {
        showToast('Menu board creation coming soon', 'info');
    }
}

async function loadMenuBoards() {
    const token = sessionStorage.getItem('adminToken');
    const grid = document.getElementById('menuBoardsGrid');

    if (!grid) return;
    grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--green-light);">Loading menu boards...</div>';

    try {
        const response = await fetch(`${API_URL}/menu-boards`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();

        if (data.success && data.menuBoards?.length > 0) {
            allMenuBoards = data.menuBoards;
            displayMenuBoards(allMenuBoards);
        } else {
            grid.innerHTML = `
                <div style="grid-column: 1/-1; text-align: center; padding: 60px; color: var(--green-light);">
                    <i class="fas fa-tv" style="font-size: 3rem; margin-bottom: 15px; opacity: 0.5;"></i>
                    <p>No menu boards found</p>
                    <p style="font-size: 0.9rem; margin-top: 10px;">Click "Create Menu Board" to add your first digital display</p>
                </div>
            `;
        }
    } catch (error) {
        console.error('Load menu boards error:', error);
        grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 40px; color: #f87171;">Error loading menu boards</div>';
    }
}

function displayMenuBoards(boards) {
    const grid = document.getElementById('menuBoardsGrid');

    grid.innerHTML = boards.map(board => {
        const statusColor = board.isActive ? 'var(--green)' : 'var(--green-light)';
        const branchName = board.branch?.name || 'All Branches';
        const itemCount = board.products?.length || 0;
        const lastUpdated = board.updatedAt ? new Date(board.updatedAt).toLocaleDateString() : 'Never';

        return `
            <div style="background: white; border: 2px solid ${board.isActive ? 'var(--green)' : 'var(--gold)'}; border-radius: 12px; overflow: hidden; transition: all 0.3s;">
                <div style="background: ${board.isActive ? 'var(--green)' : 'var(--gold)'}; color: var(--cream); padding: 15px;">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <h3 style="font-family: 'Oswald', sans-serif; font-size: 1.3rem; margin: 0;">${board.name}</h3>
                        <span style="background: ${board.isActive ? 'var(--gold)' : 'var(--green-light)'}; padding: 4px 10px; border-radius: 12px; font-size: 0.75rem;">
                            ${board.isActive ? 'ACTIVE' : 'INACTIVE'}
                        </span>
                    </div>
                </div>
                <div style="padding: 15px;">
                    <div style="margin-bottom: 10px;">
                        <small style="color: var(--green-light);"><i class="fas fa-store"></i> Branch:</small>
                        <p style="margin: 5px 0; color: var(--green-deep);">${branchName}</p>
                    </div>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 15px;">
                        <div style="background: var(--cream); padding: 10px; border-radius: 8px; text-align: center;">
                            <p style="font-size: 1.5rem; font-weight: bold; color: var(--green-deep);">${itemCount}</p>
                            <small style="color: var(--green-light);">Products</small>
                        </div>
                        <div style="background: var(--cream); padding: 10px; border-radius: 8px; text-align: center;">
                            <p style="font-size: 0.9rem; font-weight: bold; color: var(--green-deep);">${lastUpdated}</p>
                            <small style="color: var(--green-light);">Updated</small>
                        </div>
                    </div>
                    <div style="display: flex; gap: 10px;">
                        <button onclick="editMenuBoard('${board._id}')" style="flex: 1; background: var(--green); color: var(--cream); border: none; padding: 10px; border-radius: 6px; cursor: pointer; transition: all 0.2s;">
                            <i class="fas fa-edit"></i> Edit
                        </button>
                        <button onclick="previewMenuBoard('${board._id}')" style="flex: 1; background: var(--gold); color: var(--green-deep); border: none; padding: 10px; border-radius: 6px; cursor: pointer; transition: all 0.2s;">
                            <i class="fas fa-eye"></i> Preview
                        </button>
                        <button onclick="toggleMenuBoard('${board._id}', ${board.isActive})" style="background: ${board.isActive ? 'var(--red)' : 'var(--green)'}; color: var(--cream); border: none; padding: 10px; border-radius: 6px; cursor: pointer; transition: all 0.2s;">
                            <i class="fas fa-${board.isActive ? 'pause' : 'play'}"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

async function openMenuBoardModal(boardId = null) {
    editingMenuBoardId = boardId;
    const modal = document.getElementById('menuBoardModal');
    const title = document.getElementById('menuBoardModalTitle');
    const form = document.getElementById('menuBoardForm');

    // Reset form
    form.reset();
    document.getElementById('menuBoardProducts').innerHTML = '';

    // Load branches for dropdown
    await loadBranchesForMenuBoard();

    // Load products for selection
    await loadProductsForMenuBoard();

    if (boardId) {
        title.textContent = 'Edit Menu Board';
        const board = allMenuBoards.find(b => b._id === boardId);
        if (board) {
            document.getElementById('menuBoardName').value = board.name;
            document.getElementById('menuBoardBranch').value = board.branch?._id || '';
            document.getElementById('menuBoardLayout').value = board.layout || 'grid';
            document.getElementById('menuBoardTheme').value = board.theme || 'light';
            document.getElementById('menuBoardRotation').value = board.rotationInterval || 30;
            document.getElementById('menuBoardActive').checked = board.isActive;

            // Mark selected products
            if (board.products) {
                board.products.forEach(p => {
                    const checkbox = document.querySelector(`input[name="boardProduct"][value="${p._id || p}"]`);
                    if (checkbox) checkbox.checked = true;
                });
            }
        }
    } else {
        title.textContent = 'Create Menu Board';
        document.getElementById('menuBoardActive').checked = true;
    }

    modal.style.display = 'flex';
}

async function loadBranchesForMenuBoard() {
    const token = sessionStorage.getItem('adminToken');
    const select = document.getElementById('menuBoardBranch');

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

async function loadProductsForMenuBoard() {
    const token = sessionStorage.getItem('adminToken');
    const container = document.getElementById('menuBoardProducts');

    try {
        const response = await fetch(`${API_URL}/products`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();

        if (data.success && data.products) {
            container.innerHTML = data.products.map(product => `
                <label style="display: flex; align-items: center; gap: 10px; padding: 8px; background: var(--cream); border-radius: 6px; cursor: pointer;">
                    <input type="checkbox" name="boardProduct" value="${product._id}" style="width: 18px; height: 18px;">
                    <span style="flex: 1; color: var(--green-deep);">${product.name}</span>
                    <span style="color: var(--gold-dark); font-weight: bold;">R${product.price.toFixed(2)}</span>
                </label>
            `).join('');
        }
    } catch (error) {
        console.error('Load products error:', error);
        container.innerHTML = '<p style="color: #f87171;">Error loading products</p>';
    }
}

function closeMenuBoardModal() {
    document.getElementById('menuBoardModal').style.display = 'none';
    editingMenuBoardId = null;
}

async function saveMenuBoard() {
    const token = sessionStorage.getItem('adminToken');
    const selectedProducts = Array.from(document.querySelectorAll('input[name="boardProduct"]:checked')).map(cb => cb.value);

    const boardData = {
        name: document.getElementById('menuBoardName').value,
        branch: document.getElementById('menuBoardBranch').value || null,
        layout: document.getElementById('menuBoardLayout').value,
        theme: document.getElementById('menuBoardTheme').value,
        rotationInterval: parseInt(document.getElementById('menuBoardRotation').value) || 30,
        isActive: document.getElementById('menuBoardActive').checked,
        products: selectedProducts
    };

    if (!boardData.name) {
        showAdminToast('Validation Error', 'Please enter a board name', 'error');
        return;
    }

    try {
        const url = editingMenuBoardId
            ? `${API_URL}/menu-boards/${editingMenuBoardId}`
            : `${API_URL}/menu-boards`;

        const response = await fetch(url, {
            method: editingMenuBoardId ? 'PUT' : 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(boardData)
        });

        const data = await response.json();

        if (data.success) {
            showAdminToast('Success', `Menu board ${editingMenuBoardId ? 'updated' : 'created'} successfully!`, 'success');
            closeMenuBoardModal();
            loadMenuBoards();
        } else {
            showAdminToast('Error', data.message || 'Failed to save menu board', 'error');
        }
    } catch (error) {
        console.error('Save menu board error:', error);
        showAdminToast('Network Error', 'Please try again', 'error');
    }
}

function editMenuBoard(boardId) {
    openMenuBoardModal(boardId);
}

async function toggleMenuBoard(boardId, currentStatus) {
    const token = sessionStorage.getItem('adminToken');
    const action = currentStatus ? 'deactivate' : 'activate';

    showAdminConfirm(
        `${action.charAt(0).toUpperCase() + action.slice(1)} Menu Board`,
        `Are you sure you want to ${action} this menu board?`,
        async () => {
            try {
                const response = await fetch(`${API_URL}/menu-boards/${boardId}`, {
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ isActive: !currentStatus })
                });

                const data = await response.json();

                if (data.success) {
                    showAdminToast('Success', `Menu board ${action}d successfully!`, 'success');
                    loadMenuBoards();
                } else {
                    showAdminToast('Error', data.message || `Failed to ${action} menu board`, 'error');
                }
            } catch (error) {
                console.error('Toggle menu board error:', error);
                showAdminToast('Network Error', 'Please try again', 'error');
            }
        }
    );
}

function previewMenuBoard(boardId) {
    window.open(`/menu-display.html?board=${boardId}`, '_blank', 'width=1920,height=1080');
}

async function deleteMenuBoard(boardId) {
    const token = sessionStorage.getItem('adminToken');

    showAdminConfirm(
        'Delete Menu Board',
        'Are you sure you want to delete this menu board? This action cannot be undone.',
        async () => {
            try {
                const response = await fetch(`${API_URL}/menu-boards/${boardId}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                const data = await response.json();

                if (data.success) {
                    showAdminToast('Success', 'Menu board deleted successfully!', 'success');
                    loadMenuBoards();
                } else {
                    showAdminToast('Error', data.message || 'Failed to delete menu board', 'error');
                }
            } catch (error) {
                console.error('Delete menu board error:', error);
                showAdminToast('Network Error', 'Please try again', 'error');
            }
        }
    );
}
