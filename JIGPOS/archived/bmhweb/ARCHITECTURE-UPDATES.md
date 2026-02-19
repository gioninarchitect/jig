# UPDATED: Claude Code Prompt with Proper Architecture

## 🔥 CRITICAL UPDATES MADE

The Claude Code prompt has been **completely updated** with strict architecture requirements to ensure you get a **properly built, production-ready LMS** - not a monolithic mess.

## What Was Added

### 1. **MANDATORY MVC ARCHITECTURE SECTION** 🏗️

Added at the very top of the prompt - impossible to miss:

✅ **Backend MVC Pattern:**
- Models - One file per model (User.js, Course.js, etc.)
- Controllers - Business logic separated
- Routes - Thin route definitions only
- Middleware - Auth, validation, errors separated
- Services - Complex business logic layer

✅ **Frontend Component Architecture:**
- Small, focused components (no 1000-line files)
- Custom hooks separate logic from UI
- Service layer for API calls
- Proper folder organization by feature

✅ **NO HARDCODED DATA:**
- Everything from database
- No sample arrays in components
- No static JSON files
- All stats calculated from real DB queries

### 2. **PROPER PROJECT STRUCTURE** 📁

Completely revised structure showing:
- **backend/** - Properly organized with config, models, controllers, routes, middleware, services, utils, seeds
- **frontend/** - Component-based with Layout, Course, Dashboard, UI folders
- **Hooks folder** - Custom hooks separated
- **Services folder** - API calls organized
- **Context folder** - Global state management

### 3. **MVC CODE EXAMPLES** 💻

Added full working examples showing:

**Backend Flow:**
```
Route (thin) → Controller (logic) → Model (data)
```

**Frontend Flow:**
```
Component (UI) → Custom Hook (logic) → Service (API)
```

Shows exactly HOW to separate concerns with real code.

### 4. **DATABASE REQUIREMENTS** 🗄️

New section specifying:
- MongoDB recommended (or PostgreSQL)
- ZERO hardcoded data allowed
- All courses must come from database
- Proper seeding scripts required
- Full integration examples

### 5. **WHAT NOT TO DO** 🚫

Entire section showing common mistakes:

❌ Monolithic files
❌ Mixing logic in routes
❌ Hardcoded data
❌ 1000-line components
❌ No error handling
❌ Using callbacks
❌ Plain text passwords

✅ With correct examples for each

### 6. **UPDATED SUCCESS CRITERIA** ✅

Now includes architecture checks:
- MVC pattern verified
- No monolithic files
- No hardcoded data
- Database fully integrated
- Code quality standards met

## Why This Matters

### Before (Old Prompt):
Claude Code might build:
```javascript
// ❌ Everything in server.js
const app = express();
app.post('/login', (req, res) => { /* 100 lines */ });
app.get('/courses', (req, res) => { /* 100 lines */ });
// ... 50 more routes
```

### After (New Prompt):
Claude Code will build:
```javascript
// ✅ Clean server.js
const app = require('./app');
const connectDB = require('./config/db');
connectDB();
app.listen(PORT);
```

```javascript
// ✅ Separate controller
exports.getAllCourses = async (req, res) => {
  const courses = await Course.find(filters);
  res.json(courses);
};
```

## Key Additions

### Architecture First
- MVC pattern strictly enforced
- No file over 300 lines
- Clear separation of concerns

### Database Integration
- Choose MongoDB or PostgreSQL
- All data dynamic from DB
- Proper seeding scripts
- No hardcoded arrays

### Code Quality
- ESLint configuration required
- Error handling mandatory
- Input validation on all endpoints
- Async/await (no callbacks)

### Security
- JWT authentication
- Password hashing (bcrypt)
- Input sanitization
- CORS configured
- Rate limiting

## Files Updated

✅ `CLAUDE-CODE-PROMPT.md` - Completely revised with architecture requirements

## How to Use Updated Prompt

1. Open `CLAUDE-CODE-PROMPT.md`
2. Copy the ENTIRE file
3. Paste into Claude Code
4. Add:

```
Build this following STRICT MVC architecture.

CRITICAL REQUIREMENTS:
- Separate models, controllers, routes - NO monolithic files
- All data from MongoDB database - NO hardcoded arrays
- Proper component separation - NO 1000-line components
- Follow ALL the "What NOT to Do" examples

Brand colors: #0B8C7A (teal), #1E3A5F (navy)

Build production-ready code following best practices.
```

## What Claude Code Will Build Now

### Properly Architected Backend:
```
backend/
├── config/          ← DB connection, env variables
├── models/          ← One model per file
├── controllers/     ← Business logic separated
├── routes/          ← Thin route definitions
├── middleware/      ← Auth, validation, errors
├── services/        ← Complex business logic
├── utils/           ← Helper functions
└── seeds/           ← Database seeding
```

### Component-Based Frontend:
```
frontend/src/
├── components/      ← Small, reusable components
│   ├── Layout/
│   ├── Course/
│   ├── Dashboard/
│   └── UI/
├── pages/           ← Page components using composition
├── hooks/           ← Custom hooks (logic separated)
├── services/        ← API calls
└── context/         ← Global state
```

### Database Integration:
- MongoDB with Mongoose models
- Seed script creates 10-15 courses
- All data queried dynamically
- Proper indexing for performance
- Connection via environment variables

## Verification Checklist

After Claude Code builds, verify:

### Architecture ✅
- [ ] Models in separate files (not all in one)
- [ ] Controllers in separate files
- [ ] Routes are thin (< 50 lines each)
- [ ] Frontend components are small (< 200 lines)
- [ ] Custom hooks separate logic

### No Hardcoded Data ✅
- [ ] No course arrays in components
- [ ] No user arrays in components
- [ ] All data fetched from database
- [ ] Stats calculated from real queries

### Database Integration ✅
- [ ] MongoDB/PostgreSQL connected
- [ ] Seed script creates data
- [ ] All CRUD operations work
- [ ] Progress saves to database
- [ ] Certificates stored in database

### Code Quality ✅
- [ ] No ESLint errors
- [ ] Error handling on all endpoints
- [ ] Async/await (no callbacks)
- [ ] Passwords hashed
- [ ] Input validation

## Expected Outcome

You'll get a **professional, production-ready LMS** that:

✅ Follows industry best practices
✅ Properly separated concerns (MVC)
✅ Fully database-driven (no hardcoded data)
✅ Clean, maintainable code
✅ Scalable architecture
✅ Ready to deploy

**Not a prototype. Not a quick hack. Real, production-ready code.**

## Bottom Line

The prompt now **enforces proper architecture** so you get code that's:
- ✅ Maintainable
- ✅ Scalable  
- ✅ Professional
- ✅ Production-ready
- ✅ Follows best practices

No more monolithic files. No more hardcoded data. No more spaghetti code.

**Just clean, properly architected, production-ready code.**
