# New Branded App Conversion - Session Start Prompt

Copy everything below this line and paste into a new Claude Code session:

---

## PROJECT CONVERSION REQUEST

I need to convert an existing e-commerce platform into a new branded application.

### Source Project
- **From:** [SOURCE PROJECT NAME]
- **Location:** [SOURCE PATH]

### Target Project
- **To:** [NEW BRAND NAME]
- **New Location:** [TARGET PATH]
- **Domain:** [DOMAIN NAME]

### Brand Assets Ready
- [ ] Logo files (logo-w.png for dark bg, logo-d.png for light bg)
- [ ] Brand colors (primary, secondary, accent)
- [ ] Typography choices (heading font, body font)
- [ ] Favicon

---

## CRITICAL RULES FROM PREVIOUS PROJECTS

### 1. Environment-Aware API URLs (MANDATORY)
Every HTML file MUST use this pattern - NO hardcoded localhost:
```javascript
const API_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:[PORT]/api/v1'
    : `${window.location.protocol}//${window.location.host}/api/v1`;
```

### 2. Tarball Creation (MANDATORY EXCLUSIONS)
ALWAYS use these exclusions when creating deployment tarballs:
```bash
tar --exclude='._*' --exclude='.DS_Store' --exclude='node_modules' --exclude='.git' -czf <tarball>.tar.gz <files>
```

### 3. No Emojis Ever
Use Font Awesome icons only. Add to every HTML file:
```html
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css">
```

### 4. Authentication Token Storage
- **Admin panel:** `sessionStorage.getItem('adminToken')`
- **User dashboard:** `sessionStorage.getItem('token')` or `localStorage.getItem('token')`
- Be consistent - document the choice in CLAUDE.md

### 5. Null-Safe Coding
Always use optional chaining:
```javascript
// WRONG
const name = user.profile.firstName;

// RIGHT
const name = user?.profile?.firstName || 'Unknown';
```

### 6. Inventory Checks
Use the correct field path:
```javascript
const stock = product.inventory?.quantity || 0;
// NOT: product.quantity
```

---

## DEPLOYMENT WORKFLOW

### Claude's Responsibilities
1. Create deployment tarball locally (with exclusions)
2. Verify tarball contents: `tar -tzf <tarball>`
3. Run pre-deployment audit: `grep -r "localhost:" *.html`
4. Provide ONE single-line server command

### User's Responsibilities
1. Run SCP to upload tarball
2. SSH into server
3. Run the provided command

### Standard Server Command Template
```bash
cd /var/www/<APP> && tar -czf backups/backup-$(date +%Y%m%d-%H%M%S).tar.gz <current-files> && tar -xzf /tmp/<TARBALL>.tar.gz && pm2 restart <APP-NAME> && rm /tmp/<TARBALL>.tar.gz && pm2 status
```

---

## PROJECT STRUCTURE TO CREATE

```
project/
├── backend/
│   ├── server.js
│   ├── routes/
│   ├── modules/
│   │   └── database/
│   │       └── models/
│   ├── services/
│   └── scripts/
│       └── seed-all.js          # Single seed script
├── frontend/
│   └── js/
│       └── config.js            # Centralized API_URL
├── css/
├── images/
│   ├── logo-w.png               # White logo for dark backgrounds
│   ├── logo-d.png               # Dark logo for light backgrounds
│   └── weedicons/               # Product placeholder icons
├── *.html                       # Frontend pages
├── CLAUDE.md                    # Project rules (CRITICAL)
├── NEXT_SESSION.md              # Session handoff
├── .env.example                 # Environment template
└── package.json
```

---

## FIRST STEPS FOR NEW PROJECT

1. **Read existing CLAUDE.md** (if exists) or create one
2. **Create NEXT_SESSION.md** template
3. **Set up centralized config.js** with API_URL
4. **Verify brand assets** are in place
5. **Create seed-all.js** script
6. **Document server details** (IP, paths, PM2 app name)

---

## SERVER INFORMATION (FILL IN)

| Item | Value |
|------|-------|
| Server IP | |
| App Directory | |
| PM2 App Name | |
| Database Name | |
| UAT URL | |
| Production URL | |

### Other Apps on Server (DO NOT TOUCH)
- List other PM2 apps here

---

## QUALITY GATES

### Before Any Commit
- [ ] No hardcoded URLs (`grep -r "localhost:" *.html`)
- [ ] No emojis in code/UI
- [ ] Null checks on all object access
- [ ] Consistent auth token storage

### Before Any Deploy
- [ ] Tarball excludes ._* files
- [ ] Tarball contents verified
- [ ] Backup command included
- [ ] PM2 app name correct

### After Any Deploy
- [ ] `pm2 status` shows online
- [ ] Health endpoint responds
- [ ] Browser test passed
- [ ] `pm2 logs <app> --lines 50` shows no errors

---

## BEGIN CONVERSION

Please start by:
1. Reading the source project structure
2. Identifying all files that need branding changes
3. Creating a conversion checklist
4. Setting up the CLAUDE.md for this project

Let's begin.
