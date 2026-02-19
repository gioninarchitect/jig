# How to Use the Claude Code Prompt

## What You Have

1. **Updated Marketing Website** - `basotho-website-final.html`
   - Correct logo colors (#0B8C7A teal, #1E3A5F navy)
   - Working dark mode
   - Ready to deploy

2. **Comprehensive Claude Code Prompt** - `CLAUDE-CODE-PROMPT.md`
   - Complete specification for full LMS
   - All pages defined
   - Database models included
   - Tech stack recommendations

## How to Use Claude Code

### Step 1: Open Claude Code
In your terminal:
```bash
# If you don't have Claude Code installed:
npm install -g @anthropic-ai/claude-code

# Start Claude Code
claude-code
```

### Step 2: Copy the Entire Prompt
Open `CLAUDE-CODE-PROMPT.md` and copy ALL of it.

### Step 3: Give it to Claude Code
Paste the entire prompt into Claude Code and say:

```
Build this complete LMS following every specification in this prompt. 
Create all files, implement all features, and make sure everything works.

Use the BMH logo from the marketing site at basothomedicalherbs.ls
Brand colors: #0B8C7A (teal) and #1E3A5F (navy)

Important: 
- Dark mode MUST work with a toggle button
- Every sidebar link MUST go to a real page
- Build the COMPLETE application, not a prototype
- Include seed data for 10-15 sample courses
```

### Step 4: Let Claude Code Build
Claude Code will:
- Create the entire project structure
- Build all backend routes and models
- Create all frontend pages and components
- Implement authentication
- Set up the database
- Create seed data
- Make everything work together

### Step 5: Test Everything
After Claude Code finishes:

```bash
# Install dependencies
cd bmh-lms
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your settings

# Seed the database
npm run seed

# Start the development server
npm run dev
```

### Step 6: Verify Features
Check that everything works:
- [ ] Dark mode toggle (moon/sun icon)
- [ ] Login and registration
- [ ] Dashboard with stats
- [ ] Browse courses with search
- [ ] Course detail pages
- [ ] Video player in course
- [ ] Progress tracking
- [ ] All sidebar links work
- [ ] Mobile responsive

## What Claude Code Will Build

### Complete File Structure:
```
bmh-lms/
├── backend/         (Express server, API, database)
├── frontend/        (React app with all pages)
├── database/        (Seed data)
├── .env.example     (Environment variables template)
├── package.json     (Dependencies)
└── README.md        (Setup instructions)
```

### All Pages (13+):
1. Dashboard - Stats and overview
2. My Courses - Enrolled courses with progress
3. Browse Courses - Full catalog with search/filters
4. Course Detail - Course info and enroll
5. Course Player - Video player with curriculum
6. Profile - User settings and info
7. Certificates - Earned certificates
8. Assignments - Assignment list and submission
9. Schedule - Calendar of deadlines
10. Analytics - Charts and progress
11. Achievements - Badges and milestones
12. Settings - Preferences
13. Help - FAQ and support
14. Login - Authentication
15. Register - New user signup

### All Features:
- ✅ Working dark mode
- ✅ User authentication (JWT)
- ✅ Course enrollment
- ✅ Video player with progress
- ✅ Certificate generation
- ✅ Search and filters
- ✅ Progress tracking
- ✅ Responsive design
- ✅ Complete navigation

## Tips for Best Results

### Be Specific
If Claude Code asks questions, be clear about:
- Database choice (MongoDB recommended)
- Hosting preference
- Video storage (YouTube embeds for demo)
- Payment integration (skip for now)

### Iterate
If something doesn't work:
```
The dark mode isn't persisting after page reload. 
Fix the ThemeContext to save to localStorage.
```

### Test Thoroughly
After Claude Code finishes, test:
1. Every link in the sidebar
2. Dark mode on every page
3. Login/logout flow
4. Course enrollment
5. Video playback
6. Mobile responsiveness

## Troubleshooting

### If Dark Mode Doesn't Work:
```
The dark mode toggle button exists but clicking it doesn't 
switch themes. Make sure:
1. ThemeContext is wrapping the entire app
2. localStorage is being saved/loaded
3. CSS has .dark-mode classes
4. body tag gets the dark-mode class
```

### If Pages Are Missing:
```
The sidebar links to "Schedule" but that page doesn't exist. 
Create the Schedule page with a calendar view showing 
upcoming classes and assignment deadlines.
```

### If Video Player Isn't Working:
```
The video player component exists but videos don't play.
Make sure react-player is installed and configured correctly
with YouTube URL support.
```

## Expected Timeline

Claude Code should build the complete LMS in:
- **Basic structure**: 10-15 minutes
- **All pages with routing**: 20-30 minutes
- **Backend API**: 15-20 minutes
- **Database models**: 10 minutes
- **Polish and testing**: 10-20 minutes

**Total**: ~1-2 hours for a complete, working LMS

## After Claude Code Finishes

You'll have a production-ready LMS that you can:
1. Deploy to a server
2. Add real course content
3. Upload actual videos
4. Customize further
5. Integrate with payment system
6. Add more features

## Integration with Marketing Site

The LMS will be separate from the marketing site but:
- Uses same logo and colors
- Can be linked from marketing site header
- Shares branding and design language
- Can display featured courses on marketing site

Add this to your marketing site header:
```html
<a href="https://lms.basothomedicalherbs.ls" class="btn btn-primary">
  Student Portal
</a>
```

## Support

If you run into issues:
1. Check Claude Code's README.md for setup instructions
2. Verify all environment variables are set
3. Make sure database is running
4. Check console for errors
5. Ask Claude Code to fix specific issues

---

**This prompt will give you a COMPLETE, WORKING LMS - not a prototype!**
