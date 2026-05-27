# DBC System - Refactoring Plan

**Generated**: 5 February 2026
**Priority**: HIGH = Do first | MEDIUM = When time allows | LOW = Nice to have

---

## Executive Summary

The codebase is functional but has accumulated technical debt. Key issues:
1. **Monolithic HTML files** - admin.html (9,677 lines) needs splitting
2. **Duplicated JavaScript** - Same functions repeated across files
3. **No build system** - Raw HTML/JS without bundling
4. **Inconsistent patterns** - Some files use modules, others inline scripts

---

## PHASE 1: Critical Refactors (HIGH PRIORITY)

### 1.1 Split admin.html (9,677 lines)
**Current State**: Single file contains ALL admin functionality
**Target**: Modular components

```
admin/
  index.html           # Shell/layout only
  js/
    admin-core.js      # Auth, navigation, common utils
    admin-pos.js       # POS management
    admin-inventory.js # Inventory management
    admin-orders.js    # Order management
    admin-users.js     # User management
    admin-reports.js   # Reports
    admin-cashup.js    # Daily cashup wizard
  css/
    admin.css          # Admin-specific styles
```

**Effort**: 2-3 days
**Risk**: Low (no functionality change)

### 1.2 Split pos.html (4,241 lines)
**Current State**: Everything in one file
**Target**: Separate concerns

```
pos/
  index.html
  js/
    pos-core.js        # Cart, checkout, payments
    pos-till.js        # Till session management
    pos-shift.js       # Staff shift/breaks
    pos-products.js    # Product loading/search
  css/
    pos.css
```

**Effort**: 1-2 days
**Risk**: Low

### 1.3 Create Shared JavaScript Library
**Current State**: Functions copy-pasted across files
**Target**: Single source of truth

```javascript
// frontend/js/dbc-core.js
const DBC = {
  // API utilities
  api: {
    get: async (endpoint) => {...},
    post: async (endpoint, data) => {...},
    put: async (endpoint, data) => {...},
    delete: async (endpoint) => {...}
  },

  // Authentication
  auth: {
    getToken: () => {...},
    setToken: (token) => {...},
    logout: () => {...},
    isAuthenticated: () => {...}
  },

  // UI utilities
  ui: {
    showModal: (id) => {...},
    closeModal: (id) => {...},
    showToast: (title, message, type) => {...},
    formatCurrency: (amount) => {...},
    formatDate: (date) => {...}
  }
};
```

**Effort**: 3-4 days
**Risk**: Medium (must update all files)

---

## PHASE 2: Architecture Improvements (MEDIUM PRIORITY)

### 2.1 Introduce Build System
**Current State**: Raw files served directly
**Target**: Vite or esbuild for bundling

**Benefits**:
- Code splitting
- Minification
- Tree shaking
- Hot module replacement for dev

**Suggested Stack**:
```
vite.config.js
src/
  admin/
  pos/
  dashboard/
  shared/
dist/           # Built output
```

**Effort**: 1 week
**Risk**: Medium (deployment changes)

### 2.2 Extract CSS to Component Files
**Current State**: Inline `<style>` blocks in HTML
**Target**: Separate CSS files with BEM naming

```
css/
  base/
    reset.css
    typography.css
    variables.css
  components/
    buttons.css
    cards.css
    modals.css
    tables.css
    forms.css
  layouts/
    sidebar.css
    header.css
    grid.css
  pages/
    admin.css
    pos.css
    dashboard.css
```

**Effort**: 3-4 days
**Risk**: Low

### 2.3 Backend Route Consolidation
**Current State**: 35 route files, some overlapping
**Target**: Logical groupings

```
routes/
  auth/
    otp.js
    sessions.js
  inventory/
    products.js
    branches.js
    transfers.js
    stocktake.js
  sales/
    pos.js
    orders.js
    wholesale.js
  users/
    staff.js
    customers.js
    affiliates.js
  operations/
    cashup.js
    shifts.js
    drive-through.js
```

**Effort**: 2-3 days
**Risk**: Medium (import paths change)

---

## PHASE 3: Code Quality (MEDIUM PRIORITY)

### 3.1 Add TypeScript (Optional)
**Current State**: Plain JavaScript
**Target**: TypeScript for type safety

**Files to Convert First**:
1. `backend/modules/database/models/*.js` → TypeScript interfaces
2. `backend/routes/*.js` → Request/response typing
3. `frontend/js/dbc-core.js` → Core library

**Effort**: 1-2 weeks
**Risk**: High (major refactor)

### 3.2 Add JSDoc Comments
**Alternative to TypeScript**: Document existing JS

```javascript
/**
 * Opens a till session for the current user
 * @param {number} openingFloat - Starting cash amount in Rands
 * @param {string} notes - Optional opening notes
 * @returns {Promise<{success: boolean, session: TillSession}>}
 */
async function openTillSession(openingFloat, notes) {...}
```

**Effort**: 1 week (ongoing)
**Risk**: None

### 3.3 Add Error Boundaries
**Current State**: Errors can crash entire page
**Target**: Graceful error handling

```javascript
window.onerror = function(msg, url, line, col, error) {
  DBC.ui.showToast('Error', 'Something went wrong. Please refresh.', 'error');
  console.error({msg, url, line, col, error});
  // Send to error tracking service
  return true;
};
```

**Effort**: 1-2 days
**Risk**: None

---

## PHASE 4: Infrastructure (LOW PRIORITY)

### 4.1 Add Automated Testing
**Current State**: No frontend tests
**Target**: Jest + Testing Library

**Priority Test Files**:
1. `dbc-core.js` - Core library functions
2. `pos-till.js` - Till calculations
3. `admin-cashup.js` - Cashup variance calculations

**Effort**: 1 week setup + ongoing
**Risk**: None

### 4.2 Add Linting/Formatting
**Current State**: Inconsistent code style
**Target**: ESLint + Prettier

```json
// .eslintrc.json
{
  "env": {"browser": true, "node": true, "es2021": true},
  "extends": ["eslint:recommended"],
  "rules": {
    "no-unused-vars": "warn",
    "no-console": ["warn", {"allow": ["error"]}],
    "semi": ["error", "always"]
  }
}
```

**Effort**: 1 day setup
**Risk**: None

### 4.3 Add CI/CD Pipeline
**Current State**: Manual deployment
**Target**: GitHub Actions

```yaml
# .github/workflows/deploy.yml
name: Deploy to Production
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npm ci
      - run: npm test
      - run: npm run build
      - run: ./deploy.sh
```

**Effort**: 2-3 days
**Risk**: Low

---

## Recommended Order of Execution

| Week | Tasks | Effort |
|------|-------|--------|
| 1 | Split admin.html, Create DBC core library | 5-6 days |
| 2 | Split pos.html, Extract CSS | 3-4 days |
| 3 | Add build system (Vite) | 4-5 days |
| 4 | Backend route consolidation | 2-3 days |
| 5 | Add JSDoc, Error boundaries | 3-4 days |
| 6+ | Testing, Linting, CI/CD | Ongoing |

---

## Quick Wins (Can Do Now)

These require minimal effort but improve code quality:

1. **Extract API_URL to config.js** (30 min)
   ```javascript
   // config.js
   export const API_URL = window.location.hostname === 'localhost'
     ? 'http://localhost:3001/api/v1'
     : `${window.location.protocol}//${window.location.host}/api/v1`;
   ```

2. **Extract showToast to shared.js** (1 hour)
   - Currently duplicated in 5+ files

3. **Extract formatCurrency to shared.js** (30 min)
   - Currently duplicated across files

4. **Add .editorconfig** (10 min)
   ```
   root = true
   [*]
   indent_style = space
   indent_size = 2
   end_of_line = lf
   charset = utf-8
   trim_trailing_whitespace = true
   insert_final_newline = true
   ```

---

## Files NOT to Refactor (Stable)

These files are working well and shouldn't be touched unless necessary:

- `backend/modules/database/models/*` - Clean Mongoose models
- `backend/server.js` - Well-organized entry point
- `backend/middleware/auth.js` - Working auth middleware
- `css/styles.css` - Main stylesheet (stable)

---

## Risk Assessment

| Refactor | Risk | Mitigation |
|----------|------|------------|
| Split HTML files | Low | Keep old files as backup |
| Create shared library | Medium | Test each import |
| Add build system | Medium | Run parallel to existing |
| TypeScript conversion | High | Do incrementally |
| Route consolidation | Medium | Update imports carefully |

---

## Success Metrics

After refactoring:
- [ ] No file over 2,000 lines
- [ ] Zero duplicated functions
- [ ] Build time under 30 seconds
- [ ] 80%+ test coverage on critical paths
- [ ] ESLint passes with 0 errors

---

**END OF REFACTORING PLAN**
