// P17 — Role hierarchy, permission map, and post-login redirect table.
// Levels determine implicit access: a higher-level role can access
// everything a lower-level role can.

export const ROLE_HIERARCHY = {
  super_admin:       { level: 100, label: 'Super Admin' },
  owner:             { level: 90,  label: 'Owner' },
  admin:             { level: 80,  label: 'Admin' },
  branch_manager:    { level: 60,  label: 'Branch Manager' },
  inventory_manager: { level: 50,  label: 'Inventory Manager' },
  branch_assistant:   { level: 20,  label: 'Staff Assistant' },
  packer:            { level: 15,  label: 'Packer' },
  dispatch_manager:  { level: 15,  label: 'Dispatch Manager' },
  supplier:          { level: 10,  label: 'Supplier' },
  user:              { level: 10,  label: 'Customer' },
};

// Explicit permission sets per role
export const ROLE_PERMISSIONS = {
  super_admin:       ['*'],
  owner:             ['*'],
  admin:             ['manage_inventory', 'manage_staff', 'view_reports', 'pos', 'manage_orders', 'manage_vouchers', 'manage_users', 'manage_suppliers'],
  branch_manager:    ['manage_branch_inventory', 'manage_branch_staff', 'pos', 'view_reports', 'manage_orders'],
  inventory_manager: ['manage_inventory', 'manage_batches', 'manage_suppliers', 'manage_purchase_orders', 'stocktake'],
  branch_assistant:   ['pos', 'clock_in_out'],
  packer:            ['pack_orders'],
  dispatch_manager:  ['dispatch_orders'],
  supplier:          ['manage_own_products', 'upload_docs'],
  user:              ['browse', 'order', 'view_own_data'],
};

// Where each role lands after login — matches vanilla redirectByRole()
// P35: Paths are relative to BrowserRouter basename="/app"
export const ROLE_REDIRECTS = {
  owner:             '/owner',
  super_admin:       '/config',
  admin:             '/admin',
  branch_manager:    '/admin',
  inventory_manager: '/inventory',
  branch_assistant:   '/pos',
  packer:            '/packer',
  dispatch_manager:  '/dispatch',
  supplier:          '/supplier',
  user:              '/my-account',
};

// Roles that can see ALL branches (no branch scoping)
export const GLOBAL_ROLES = ['owner', 'super_admin'];

// Check if a role has a specific permission
export function hasPermission(role, permission) {
  const perms = ROLE_PERMISSIONS[role];
  if (!perms) return false;
  if (perms.includes('*')) return true;
  return perms.includes(permission);
}

// Check if roleA level >= roleB level
export function hasMinLevel(role, minLevel) {
  return (ROLE_HIERARCHY[role]?.level || 0) >= minLevel;
}

// Get human-readable label
export function getRoleLabel(role) {
  return ROLE_HIERARCHY[role]?.label || role;
}
