# CLAUDE CODE PROMPT: Complete Basotho Medical Herbs LMS

Build a complete, production-ready Learning Management System for Basotho Medical Herbs with ALL pages working, dark mode functional, and full integration with the marketing site.

## 🚨 CRITICAL ARCHITECTURE REQUIREMENTS

### MANDATORY: PROPER MVC ARCHITECTURE
**NO MONOLITHIC FILES!** Every component must be properly separated:

✅ **Backend Must Follow MVC Pattern:**
- **Models** - Separate file for each model (User.js, Course.js, Lesson.js, etc.)
- **Controllers** - Business logic in dedicated controller files
- **Routes** - Clean route definitions that call controllers
- **Middleware** - Authentication, validation in separate middleware files
- **Services** - Reusable business logic in service layer
- **Utils/Helpers** - Helper functions separated

✅ **Frontend Must Be Component-Based:**
- **Small, reusable components** - No 1000-line files
- **Separate logic from presentation** - Use custom hooks
- **Component folder structure** - Group by feature/domain
- **Shared components** - Button, Card, Modal, etc. in UI folder
- **Page components** - Use composition, not monoliths

✅ **NO HARDCODED DATA - EVERYTHING DYNAMIC:**
- All courses from database
- All users from database  
- All progress from database
- All stats calculated from real data
- NO sample arrays in components
- NO static JSON files for data

✅ **FULL-STACK DATABASE INTEGRATION:**
- Choose **MongoDB** (recommended) or PostgreSQL
- All CRUD operations through database
- Proper database indexing
- Database migrations/seeds separate from code
- Environment variables for DB connection

✅ **CODING BEST PRACTICES:**
- DRY (Don't Repeat Yourself)
- Single Responsibility Principle
- Proper error handling everywhere
- Input validation on all endpoints
- Async/await (not callbacks)
- ESLint configuration included
- Consistent naming conventions
- Comments for complex logic only

## PROJECT CONTEXT

**Company**: Basotho Medical Herbs (Lesotho cannabis education institution)
**Website**: basothomedicalherbs.ls
**LMS Goal**: Udemy-style platform for cannabis training courses

## BRAND ASSETS

**Logo**: Use the BMH logo image provided
**Colors** (from logo):
- Primary Teal: `#0B8C7A` (icon, leaves, "MEDICAL HERBS" text)
- Navy Blue: `#1E3A5F` ("BASOTHO" text)  
- Teal Hover: `#097563` (interactive states)

## PROJECT STRUCTURE

Create a properly architected full-stack application with clean separation of concerns.

```
bmh-lms/
├── backend/
│   ├── server.js                    # Entry point only - minimal code
│   ├── app.js                       # Express app configuration
│   ├── config/
│   │   ├── db.js                    # Database connection
│   │   ├── env.js                   # Environment variables
│   │   └── constants.js             # App constants
│   ├── models/                      # Database models (ONE per file)
│   │   ├── User.js
│   │   ├── Course.js
│   │   ├── Lesson.js
│   │   ├── Progress.js
│   │   ├── Certificate.js
│   │   ├── Assignment.js
│   │   └── Review.js
│   ├── controllers/                 # Business logic (ONE per domain)
│   │   ├── authController.js        # Login, register, logout
│   │   ├── courseController.js      # Course CRUD operations
│   │   ├── userController.js        # User profile, settings
│   │   ├── progressController.js    # Progress tracking
│   │   ├── certificateController.js # Certificate generation
│   │   └── assignmentController.js  # Assignment management
│   ├── routes/                      # Route definitions (thin, call controllers)
│   │   ├── auth.js                  # Auth routes
│   │   ├── courses.js               # Course routes
│   │   ├── users.js                 # User routes
│   │   ├── progress.js              # Progress routes
│   │   ├── certificates.js          # Certificate routes
│   │   ├── assignments.js           # Assignment routes
│   │   └── index.js                 # Route aggregator
│   ├── middleware/                  # Reusable middleware
│   │   ├── auth.js                  # JWT verification
│   │   ├── validation.js            # Input validation
│   │   ├── errorHandler.js          # Error handling
│   │   ├── upload.js                # File upload
│   │   └── logger.js                # Request logging
│   ├── services/                    # Business logic layer
│   │   ├── emailService.js          # Email sending
│   │   ├── pdfService.js            # PDF generation
│   │   ├── videoService.js          # Video processing
│   │   └── analyticsService.js      # Analytics calculations
│   ├── utils/                       # Helper functions
│   │   ├── generateToken.js
│   │   ├── hashPassword.js
│   │   └── validators.js
│   └── seeds/                       # Database seeding
│       ├── seedUsers.js
│       ├── seedCourses.js
│       └── index.js
├── frontend/
│   ├── public/
│   │   └── images/
│   │       └── bmh-logo.png
│   ├── src/
│   │   ├── components/              # Organized by feature
│   │   │   ├── Layout/
│   │   │   │   ├── Navbar/
│   │   │   │   │   ├── Navbar.jsx
│   │   │   │   │   ├── Navbar.css
│   │   │   │   │   └── index.js
│   │   │   │   ├── Sidebar/
│   │   │   │   │   ├── Sidebar.jsx
│   │   │   │   │   ├── SidebarLink.jsx
│   │   │   │   │   └── index.js
│   │   │   │   └── Footer/
│   │   │   ├── Course/
│   │   │   │   ├── CourseCard.jsx       # Single course card
│   │   │   │   ├── CourseGrid.jsx       # Grid layout
│   │   │   │   ├── CourseFilters.jsx    # Filter sidebar
│   │   │   │   ├── VideoPlayer.jsx      # Video component
│   │   │   │   ├── Curriculum.jsx       # Lesson list
│   │   │   │   └── index.js
│   │   │   ├── Dashboard/
│   │   │   │   ├── StatsCard.jsx
│   │   │   │   ├── ProgressChart.jsx
│   │   │   │   ├── ActivityFeed.jsx
│   │   │   │   └── index.js
│   │   │   └── UI/                      # Shared components
│   │   │       ├── Button.jsx
│   │   │       ├── Card.jsx
│   │   │       ├── Modal.jsx
│   │   │       ├── Input.jsx
│   │   │       ├── ThemeToggle.jsx
│   │   │       └── index.js
│   │   ├── pages/                       # Page components (use composition)
│   │   │   ├── Dashboard/
│   │   │   │   ├── Dashboard.jsx        # Main component
│   │   │   │   └── useDashboard.js      # Custom hook for logic
│   │   │   ├── MyCourses/
│   │   │   │   ├── MyCourses.jsx
│   │   │   │   └── useMyCourses.js
│   │   │   ├── BrowseCourses/
│   │   │   ├── CourseDetail/
│   │   │   ├── CoursePlayer/
│   │   │   ├── Profile/
│   │   │   ├── Auth/
│   │   │   │   ├── Login.jsx
│   │   │   │   └── Register.jsx
│   │   │   └── index.js
│   │   ├── context/                     # Global state
│   │   │   ├── AuthContext.jsx
│   │   │   ├── ThemeContext.jsx
│   │   │   └── CourseContext.jsx
│   │   ├── hooks/                       # Custom hooks
│   │   │   ├── useAuth.js
│   │   │   ├── useCourses.js
│   │   │   ├── useTheme.js
│   │   │   └── useProgress.js
│   │   ├── services/                    # API calls
│   │   │   ├── api.js                   # Axios instance
│   │   │   ├── authService.js
│   │   │   ├── courseService.js
│   │   │   ├── userService.js
│   │   │   └── progressService.js
│   │   ├── utils/                       # Helper functions
│   │   │   ├── formatDate.js
│   │   │   ├── calculateProgress.js
│   │   │   └── validators.js
│   │   ├── constants/
│   │   │   └── index.js                 # App constants
│   │   ├── styles/
│   │   │   ├── globals.css
│   │   │   └── variables.css            # CSS variables
│   │   ├── App.jsx
│   │   └── index.jsx
│   └── package.json
├── .env.example
├── .eslintrc.json
├── .gitignore
├── package.json
└── README.md
```

## CRITICAL REQUIREMENTS

### 1. DARK MODE (MUST WORK!)
- Toggle button in top navigation (moon 🌙 / sun ☀️ icon)
- Use React Context or localStorage to persist theme
- Smooth transitions (0.3s)
- All components must respect theme
- CSS variables for colors that change with theme

### 2. COMPLETE NAVIGATION
Every link in the sidebar MUST go to an actual page:

**Main Menu:**
- Dashboard → Full stats, progress, recent activity
- My Courses → Grid of enrolled courses with progress
- Browse Courses → Full catalog with search/filter
- Schedule → Calendar view of upcoming classes/deadlines
- Assignments → List of assignments with due dates

**Progress:**
- Achievements → Badges and milestones earned
- Certificates → Downloadable certificates
- Analytics → Charts showing learning progress

**Settings:**
- Profile → Edit user info, photo
- Settings → Preferences, notifications
- Help → FAQ and support

### 3. COURSE PLAYER PAGE
Full video course player with:
- Video player (use react-player or similar)
- Sidebar with course curriculum/lessons
- Progress tracking (mark lessons complete)
- Next/Previous buttons
- Notes section
- Resources/downloads tab
- Q&A/discussion tab

### 4. DASHBOARD (Landing Page)
- 4 stat cards: Enrolled Courses, Learning Hours, Completed, Certificates
- "Continue Learning" section with progress bars
- "Recommended Courses" grid
- Recent activity feed
- Upcoming deadlines widget

### 5. MY COURSES PAGE
- Tabs: All / In Progress / Completed / Wishlist
- Course cards with:
  - Thumbnail
  - Title & instructor
  - Progress bar with percentage
  - "Continue" or "Start" button
  - Last accessed date

### 6. BROWSE COURSES PAGE
- Search bar (working search)
- Filter sidebar:
  - Categories (Short Courses, Skills Programmes)
  - Level (Beginner, Intermediate, Advanced)
  - Duration
  - Rating
- Course grid with:
  - Thumbnail
  - Title, instructor
  - Rating & reviews count
  - Price (if applicable)
  - "Enroll" button
  - Course duration

### 7. COURSE DETAIL PAGE
- Course hero with thumbnail/video preview
- Title, instructor, rating
- "Enroll Now" button
- Course description
- What you'll learn (bullet points)
- Course curriculum (expandable sections)
- Instructor bio
- Student reviews
- Related courses

### 8. AUTHENTICATION
- Login page (email + password)
- Register page (name, email, password)
- JWT authentication
- Protected routes (redirect to login if not authenticated)
- "Forgot Password" flow

### 9. PROFILE PAGE
- User avatar/photo upload
- Edit: name, email, bio, location
- Change password
- Course completion stats
- Learning streak tracker

### 10. CERTIFICATES PAGE
- Grid of earned certificates
- Download as PDF button
- Share to LinkedIn button
- Certificate preview modal

### 11. ASSIGNMENTS PAGE
- List of all assignments
- Filter: All / Pending / Submitted / Graded
- Due date countdown
- Submit assignment button
- View feedback after grading

### 12. SCHEDULE/CALENDAR PAGE
- Calendar view of:
  - Live classes
  - Assignment due dates
  - Exam dates
  - Course milestones
- Agenda view (list)
- Add to personal calendar export

### 13. ANALYTICS PAGE
Charts showing:
- Learning hours per week (line chart)
- Course completion rate (donut chart)
- Most active day/time (bar chart)
- Category breakdown (pie chart)
- Learning streak (calendar heatmap)

## DATABASE REQUIREMENTS

### Choose: MongoDB (Recommended) or PostgreSQL

**MongoDB Recommended Because:**
- Flexible schema for course content
- Easy nested data (lessons, reviews)
- Fast for read-heavy LMS operations
- Simple aggregation for analytics
- Good for MVP and scaling

**If PostgreSQL:**
- Use proper relationships (foreign keys)
- Create junction tables for many-to-many
- Use JSON columns sparingly

### CRITICAL: NO HARDCODED DATA

❌ **NEVER DO THIS:**
```javascript
// DON'T hardcode courses in component
const courses = [
  { id: 1, title: "Cannabis 101" },
  { id: 2, title: "Cannabis Law" }
];
```

✅ **ALWAYS DO THIS:**
```javascript
// Fetch from database via API
const [courses, setCourses] = useState([]);

useEffect(() => {
  const fetchCourses = async () => {
    const data = await courseService.getAllCourses();
    setCourses(data);
  };
  fetchCourses();
}, []);
```

### Database Must Be Fully Integrated

- ✅ All courses from DB
- ✅ All users from DB
- ✅ All progress from DB
- ✅ All stats calculated from DB data
- ✅ All search/filter queries to DB
- ✅ All enrollments saved to DB
- ✅ All certificates stored in DB
- ✅ All assignments in DB

### Seeding Data

Create realistic seed data script:
```javascript
// seeds/seedCourses.js
const Course = require('../models/Course');
const Lesson = require('../models/Lesson');

const seedCourses = async () => {
  // Clear existing
  await Course.deleteMany({});
  await Lesson.deleteMany({});
  
  // Create 10-15 realistic courses
  const courses = [];
  
  // Course 1: Cannabis Sector Management
  const lessons1 = await Lesson.insertMany([
    {
      title: "Introduction to Cannabis Industry",
      videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
      duration: 15,
      order: 1
    },
    // ... more lessons
  ]);
  
  courses.push({
    title: "Cannabis Sector Management Fundamentals",
    description: "Complete course on managing cannabis operations...",
    instructor: {
      name: "Dr. Mpho Mokoena",
      bio: "20+ years in cannabis research...",
      avatar: "/images/instructors/mpho.jpg"
    },
    category: "Short Courses",
    level: "Beginner",
    duration: 8,
    lessons: lessons1.map(l => l._id),
    rating: 4.8,
    reviewsCount: 342,
    studentsEnrolled: 1234,
    // ... more fields
  });
  
  // Create 9-14 more courses...
  
  await Course.insertMany(courses);
  console.log('✅ Seeded courses successfully');
};

module.exports = seedCourses;
```

## DATABASE MODELS

### User
```javascript
{
  _id: ObjectId,
  name: String,
  email: String (unique),
  password: String (hashed),
  avatar: String (URL),
  bio: String,
  location: String,
  enrolledCourses: [CourseId],
  completedCourses: [CourseId],
  certificates: [CertificateId],
  createdAt: Date,
  updatedAt: Date
}
```

### Course
```javascript
{
  _id: ObjectId,
  title: String,
  description: String,
  instructor: {
    name: String,
    bio: String,
    avatar: String
  },
  thumbnail: String (URL),
  category: String,
  level: String (Beginner/Intermediate/Advanced),
  duration: Number (hours),
  rating: Number,
  reviewsCount: Number,
  studentsEnrolled: Number,
  lessons: [LessonId],
  whatYouLearn: [String],
  requirements: [String],
  price: Number,
  isFree: Boolean,
  createdAt: Date,
  updatedAt: Date
}
```

### Lesson
```javascript
{
  _id: ObjectId,
  courseId: ObjectId,
  title: String,
  description: String,
  videoUrl: String,
  duration: Number (minutes),
  order: Number,
  resources: [{
    title: String,
    url: String,
    type: String
  }],
  quiz: {
    questions: [QuestionObject]
  }
}
```

### Progress
```javascript
{
  _id: ObjectId,
  userId: ObjectId,
  courseId: ObjectId,
  completedLessons: [LessonId],
  lastAccessedLesson: LessonId,
  percentComplete: Number,
  timeSpent: Number (minutes),
  startedAt: Date,
  lastAccessedAt: Date
}
```

### Certificate
```javascript
{
  _id: ObjectId,
  userId: ObjectId,
  courseId: ObjectId,
  issuedAt: Date,
  certificateNumber: String (unique),
  pdfUrl: String
}
```

## API ENDPOINTS

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/logout` - Logout user
- `GET /api/auth/me` - Get current user

### Courses
- `GET /api/courses` - Get all courses (with filters)
- `GET /api/courses/:id` - Get course details
- `GET /api/courses/:id/curriculum` - Get course lessons
- `POST /api/courses/:id/enroll` - Enroll in course

### User Courses
- `GET /api/users/me/courses` - Get user's enrolled courses
- `GET /api/users/me/progress/:courseId` - Get course progress

### Progress
- `POST /api/progress/lesson-complete` - Mark lesson complete
- `PUT /api/progress/update` - Update time spent

### Certificates
- `GET /api/certificates/me` - Get user's certificates
- `POST /api/certificates/generate` - Generate certificate

## MVC PATTERN EXAMPLES

### Backend Example: Course Routes → Controller → Model

**routes/courses.js** (THIN - just route definitions)
```javascript
const express = require('express');
const router = express.Router();
const courseController = require('../controllers/courseController');
const auth = require('../middleware/auth');

// GET /api/courses
router.get('/', courseController.getAllCourses);

// GET /api/courses/:id
router.get('/:id', courseController.getCourseById);

// POST /api/courses/:id/enroll (protected)
router.post('/:id/enroll', auth, courseController.enrollInCourse);

module.exports = router;
```

**controllers/courseController.js** (business logic)
```javascript
const Course = require('../models/Course');
const User = require('../models/User');
const Progress = require('../models/Progress');

exports.getAllCourses = async (req, res) => {
  try {
    const { category, level, search } = req.query;
    
    // Build filter object
    const filter = {};
    if (category) filter.category = category;
    if (level) filter.level = level;
    if (search) filter.title = { $regex: search, $options: 'i' };
    
    const courses = await Course.find(filter)
      .select('-lessons') // Don't send full lesson data
      .sort({ createdAt: -1 });
    
    res.json({ success: true, data: courses });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getCourseById = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id)
      .populate('lessons');
    
    if (!course) {
      return res.status(404).json({ 
        success: false, 
        error: 'Course not found' 
      });
    }
    
    res.json({ success: true, data: course });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.enrollInCourse = async (req, res) => {
  try {
    const userId = req.user.id; // From auth middleware
    const courseId = req.params.id;
    
    // Check if already enrolled
    const user = await User.findById(userId);
    if (user.enrolledCourses.includes(courseId)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Already enrolled' 
      });
    }
    
    // Enroll user
    user.enrolledCourses.push(courseId);
    await user.save();
    
    // Create progress record
    await Progress.create({
      userId,
      courseId,
      completedLessons: [],
      percentComplete: 0,
      startedAt: new Date()
    });
    
    res.json({ success: true, message: 'Enrolled successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
```

**models/Course.js** (data layer only)
```javascript
const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  instructor: {
    name: String,
    bio: String,
    avatar: String
  },
  thumbnail: String,
  category: {
    type: String,
    enum: ['Short Courses', 'Skills Programmes'],
    required: true
  },
  level: {
    type: String,
    enum: ['Beginner', 'Intermediate', 'Advanced'],
    default: 'Beginner'
  },
  duration: Number, // in hours
  rating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  reviewsCount: {
    type: Number,
    default: 0
  },
  studentsEnrolled: {
    type: Number,
    default: 0
  },
  lessons: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Lesson'
  }],
  whatYouLearn: [String],
  requirements: [String],
  price: {
    type: Number,
    default: 0
  },
  isFree: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Index for search
courseSchema.index({ title: 'text', description: 'text' });

module.exports = mongoose.model('Course', courseSchema);
```

### Frontend Example: Component → Custom Hook → Service

**pages/MyCourses/MyCourses.jsx** (presentation only)
```jsx
import React from 'react';
import CourseGrid from '../../components/Course/CourseGrid';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import useMyCourses from './useMyCourses';

const MyCourses = () => {
  const { 
    courses, 
    loading, 
    error, 
    activeTab, 
    setActiveTab 
  } = useMyCourses();

  if (loading) return <LoadingSpinner />;
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="my-courses-page">
      <h1>My Courses</h1>
      
      <div className="tabs">
        <button 
          className={activeTab === 'all' ? 'active' : ''}
          onClick={() => setActiveTab('all')}
        >
          All Courses
        </button>
        <button 
          className={activeTab === 'in-progress' ? 'active' : ''}
          onClick={() => setActiveTab('in-progress')}
        >
          In Progress
        </button>
        <button 
          className={activeTab === 'completed' ? 'active' : ''}
          onClick={() => setActiveTab('completed')}
        >
          Completed
        </button>
      </div>

      <CourseGrid courses={courses} showProgress={true} />
    </div>
  );
};

export default MyCourses;
```

**pages/MyCourses/useMyCourses.js** (logic separated)
```javascript
import { useState, useEffect } from 'react';
import courseService from '../../services/courseService';

const useMyCourses = () => {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('all');

  useEffect(() => {
    fetchMyCourses();
  }, [activeTab]);

  const fetchMyCourses = async () => {
    try {
      setLoading(true);
      const data = await courseService.getMyCourses(activeTab);
      setCourses(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return {
    courses,
    loading,
    error,
    activeTab,
    setActiveTab
  };
};

export default useMyCourses;
```

**services/courseService.js** (API layer)
```javascript
import api from './api';

const courseService = {
  getAllCourses: async (filters = {}) => {
    const { data } = await api.get('/courses', { params: filters });
    return data.data;
  },

  getCourseById: async (id) => {
    const { data } = await api.get(`/courses/${id}`);
    return data.data;
  },

  getMyCourses: async (filter = 'all') => {
    const { data } = await api.get('/users/me/courses', {
      params: { filter }
    });
    return data.data;
  },

  enrollInCourse: async (courseId) => {
    const { data } = await api.post(`/courses/${courseId}/enroll`);
    return data;
  }
};

export default courseService;
```

**services/api.js** (axios instance)
```javascript
import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle errors globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
```

## FEATURES TO IMPLEMENT

### Video Player
- Play/pause, volume, fullscreen
- Speed control (0.5x, 1x, 1.25x, 1.5x, 2x)
- Progress bar with chapters
- Auto-play next lesson
- Resume from last position
- Picture-in-picture mode
- Keyboard shortcuts

### Progress Tracking
- Auto-save progress every 30 seconds
- Mark lesson as complete checkbox
- Overall course progress percentage
- Time spent tracking

### Search
- Real-time search in Browse Courses
- Search by: title, instructor, keywords
- Debounced search (300ms)

### Filters
- Multiple filters can be applied
- Show count of courses per filter
- Clear all filters button

### Notifications
- Assignment due soon
- New course available
- Certificate earned
- Course completed

## INTEGRATION WITH MARKETING SITE

### Navigation Link
Add "Go to LMS" button in marketing site header:
```html
<a href="/lms" class="btn btn-primary">Student Portal</a>
```

### Shared Components
- Same logo
- Same color scheme
- Same fonts (Inter, Playfair Display)
- Consistent footer

### Course Previews
On marketing site "Courses" page:
- Show 3-4 featured courses
- "View All Courses" → Links to LMS browse page
- "Enroll Now" → Links to LMS course detail

## SAMPLE DATA TO SEED

Create 10-15 sample courses:
1. Cannabis Sector Management Fundamentals
2. Legal Framework of Cannabis Industry in Lesotho
3. Cannabis Horticulture & Cultivation Techniques
4. Business Administration for Cannabis Sector
5. Cannabis Product Development & Quality Control
6. Medical Cannabis: Therapeutic Applications
7. Cannabis Compliance & Regulatory Affairs
8. Cannabis Extraction & Processing Methods
9. Cannabis Quality Assurance & Testing
10. Sustainable Cannabis Agriculture

Each course should have:
- 6-12 lessons
- Mix of video lengths (5-20 minutes)
- Sample instructor (Dr. Mpho Mokoena, Adv. Thabo Letsie, etc.)
- Realistic ratings (4.5-4.9)
- Student counts (100-2000)

## TECH STACK RECOMMENDATIONS

**Backend:**
- Node.js + Express
- MongoDB + Mongoose
- JWT for auth
- Bcrypt for passwords
- Multer for file uploads
- PDFKit for certificates

**Frontend:**
- React 18
- React Router v6
- Context API for state
- Axios for API calls
- React Player for videos
- Recharts for analytics
- Tailwind CSS for styling

**Optional:**
- Next.js (if you want SSR)
- Redux (if Context gets too complex)
- Socket.io (for real-time notifications)

## DEVELOPMENT CHECKLIST

- [ ] Setup project structure (proper MVC folders)
- [ ] Database models with proper schemas
- [ ] Seed realistic data (10-15 courses)
- [ ] Authentication system (JWT)
- [ ] All API endpoints working
- [ ] All controllers separated from routes
- [ ] All 13+ pages created and linked
- [ ] Dark mode toggle working
- [ ] Video player fully functional
- [ ] Progress tracking working (saves to DB)
- [ ] Search & filters working (query DB)
- [ ] Certificate generation (save to DB)
- [ ] Responsive design (mobile-ready)
- [ ] Integration with marketing site
- [ ] ESLint configured
- [ ] No hardcoded data anywhere
- [ ] README with setup instructions
- [ ] Environment variables documented

## 🚫 WHAT NOT TO DO - COMMON MISTAKES

### ❌ DON'T: Create Monolithic Files
```javascript
// ❌ BAD: 1000-line server.js with everything
const express = require('express');
const app = express();

app.post('/api/login', (req, res) => { /* auth logic */ });
app.get('/api/courses', (req, res) => { /* course logic */ });
app.post('/api/enroll', (req, res) => { /* enrollment logic */ });
// ... 50 more routes in one file
```

### ✅ DO: Separate Concerns
```javascript
// ✅ GOOD: server.js - minimal entry point
const app = require('./app');
const connectDB = require('./config/db');

connectDB();
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server on port ${PORT}`));
```

```javascript
// ✅ GOOD: app.js - Express config
const express = require('express');
const routes = require('./routes');
const errorHandler = require('./middleware/errorHandler');

const app = express();
app.use(express.json());
app.use('/api', routes);
app.use(errorHandler);

module.exports = app;
```

### ❌ DON'T: Mix Business Logic in Routes
```javascript
// ❌ BAD: All logic in route file
router.post('/enroll/:courseId', async (req, res) => {
  const user = await User.findById(req.user.id);
  const course = await Course.findById(req.params.courseId);
  
  if (user.enrolledCourses.includes(course._id)) {
    return res.status(400).json({ error: 'Already enrolled' });
  }
  
  user.enrolledCourses.push(course._id);
  await user.save();
  // ... 50 more lines of logic
});
```

### ✅ DO: Use Controllers
```javascript
// ✅ GOOD: Thin route
router.post('/enroll/:courseId', auth, courseController.enrollInCourse);

// ✅ GOOD: Logic in controller
exports.enrollInCourse = async (req, res) => {
  // Business logic here
};
```

### ❌ DON'T: Hardcode Data
```javascript
// ❌ BAD: Hardcoded courses
const Dashboard = () => {
  const courses = [
    { id: 1, title: 'Course 1', progress: 50 },
    { id: 2, title: 'Course 2', progress: 75 }
  ];
  
  return <CourseList courses={courses} />;
};
```

### ✅ DO: Fetch from Database
```javascript
// ✅ GOOD: Dynamic from API
const Dashboard = () => {
  const { courses, loading } = useMyCourses(); // Fetches from DB
  
  if (loading) return <Spinner />;
  return <CourseList courses={courses} />;
};
```

### ❌ DON'T: Create 1000-Line Components
```javascript
// ❌ BAD: Everything in one component
const CoursePage = () => {
  // 100 lines of state
  // 200 lines of functions
  // 700 lines of JSX
  return <div>{/* massive component */}</div>;
};
```

### ✅ DO: Compose Small Components
```javascript
// ✅ GOOD: Small, focused components
const CoursePage = () => {
  const { course } = useCourse();
  
  return (
    <div className="course-page">
      <CourseHeader course={course} />
      <CourseTabs />
      <CourseContent course={course} />
      <CourseSidebar course={course} />
    </div>
  );
};
```

### ❌ DON'T: Skip Error Handling
```javascript
// ❌ BAD: No error handling
const getCourse = async (id) => {
  const course = await Course.findById(id);
  return course;
};
```

### ✅ DO: Handle Errors Properly
```javascript
// ✅ GOOD: Proper error handling
const getCourse = async (id) => {
  try {
    const course = await Course.findById(id);
    if (!course) {
      throw new Error('Course not found');
    }
    return course;
  } catch (error) {
    throw new Error(`Error fetching course: ${error.message}`);
  }
};
```

### ❌ DON'T: Use Callbacks
```javascript
// ❌ BAD: Callback hell
Course.findById(id, (err, course) => {
  if (err) return res.status(500).json({ error: err });
  User.findById(userId, (err, user) => {
    if (err) return res.status(500).json({ error: err });
    // ... nested callbacks
  });
});
```

### ✅ DO: Use Async/Await
```javascript
// ✅ GOOD: Clean async/await
const enrollInCourse = async (userId, courseId) => {
  const course = await Course.findById(courseId);
  const user = await User.findById(userId);
  // Clean, readable code
};
```

### ❌ DON'T: Store Passwords in Plain Text
```javascript
// ❌ BAD: Plain text passwords
const user = await User.create({
  email: req.body.email,
  password: req.body.password // NEVER!
});
```

### ✅ DO: Hash Passwords
```javascript
// ✅ GOOD: Hashed passwords
const bcrypt = require('bcryptjs');

const hashedPassword = await bcrypt.hash(req.body.password, 10);
const user = await User.create({
  email: req.body.email,
  password: hashedPassword
});
```

## CRITICAL: DARK MODE IMPLEMENTATION

```jsx
// ThemeContext.jsx
import { createContext, useState, useEffect } from 'react';

export const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState('light');

  useEffect(() => {
    const saved = localStorage.getItem('bmh-theme');
    if (saved) setTheme(saved);
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('bmh-theme', newTheme);
    document.body.classList.toggle('dark-mode', newTheme === 'dark');
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

// ThemeToggle.jsx
import { useContext } from 'react';
import { ThemeContext } from '../context/ThemeContext';

export const ThemeToggle = () => {
  const { theme, toggleTheme } = useContext(ThemeContext);
  
  return (
    <button onClick={toggleTheme} className="theme-toggle">
      {theme === 'light' ? '🌙' : '☀️'}
    </button>
  );
};
```

## EXPECTED DELIVERABLES

1. **Properly Architected Codebase**
   - MVC pattern strictly followed
   - No monolithic files
   - Clear separation of concerns
   - Services layer for business logic
   - Middleware properly organized

2. **Complete Backend**
   - All models in separate files
   - All controllers in separate files
   - All routes in separate files
   - Middleware for auth, validation, errors
   - Database fully integrated (MongoDB or PostgreSQL)
   - Seed scripts for development data

3. **Complete Frontend**
   - Component-based architecture
   - Custom hooks for logic
   - Services for API calls
   - Context for global state
   - No hardcoded data anywhere
   - All data from API

4. **README.md** with:
   - Architecture overview
   - Project structure explanation
   - Setup instructions
   - Environment variables needed
   - How to run (npm install, npm start)
   - Database seeding instructions
   - API documentation
   - Testing instructions

5. **Configuration Files**
   - .env.example with all variables
   - .eslintrc.json with rules
   - .gitignore properly configured
   - package.json with all dependencies

6. **Working Application** with:
   - All pages functional
   - All navigation working
   - Dark mode working and persisting
   - Video player working
   - Authentication working
   - Database operations working
   - Search and filters working
   - Mobile responsive

7. **Code Quality**
   - No ESLint errors
   - No console.logs in production code
   - Proper error handling everywhere
   - Input validation on all forms
   - Loading states for async operations
   - Error messages for failures

## SUCCESS CRITERIA

### Architecture & Code Quality ✅
- [ ] MVC pattern followed (models, controllers, routes separated)
- [ ] No monolithic files (all files under 300 lines)
- [ ] Services layer for complex business logic
- [ ] Middleware properly organized
- [ ] Custom hooks separate logic from presentation
- [ ] No ESLint errors or warnings
- [ ] No hardcoded data anywhere
- [ ] All data fetched from database via API

### Backend Functionality ✅
- [ ] User can register and login (JWT auth)
- [ ] All API endpoints work and return proper responses
- [ ] Database properly connected (MongoDB or PostgreSQL)
- [ ] All models have proper schemas/migrations
- [ ] Seed data creates 10-15 realistic courses
- [ ] Error handling on all endpoints
- [ ] Input validation on all endpoints
- [ ] Passwords properly hashed (bcrypt)

### Frontend Functionality ✅
- [ ] User can browse and search courses (queries database)
- [ ] User can enroll in a course (saves to database)
- [ ] User can watch video lessons (react-player)
- [ ] User can mark lessons complete (saves progress to DB)
- [ ] User can earn and download certificates (generates PDF from DB data)
- [ ] All stats calculated from real database data
- [ ] Search and filters query the database
- [ ] Loading states for all async operations

### UI/UX ✅
- [ ] Dark mode toggle works and persists (localStorage)
- [ ] All sidebar links go to real pages (no placeholders)
- [ ] Mobile responsive on all pages
- [ ] No broken links or "coming soon" pages
- [ ] Smooth transitions and animations
- [ ] Error messages display properly
- [ ] Forms have proper validation feedback

### Integration ✅
- [ ] Frontend and backend properly connected
- [ ] API base URL configurable via environment variables
- [ ] Auth token passed with protected requests
- [ ] Unauthorized requests redirect to login
- [ ] CORS configured correctly

## IMPORTANT NOTES

### Architecture First
- Follow MVC pattern strictly - no exceptions
- Every file should have a single responsibility
- No file over 300 lines (split if larger)
- Controllers handle logic, routes just define endpoints
- Models handle data, nothing else
- Use services layer for complex business logic

### Data Must Be Dynamic
- **ZERO hardcoded data** in components or controllers
- All data from database via API
- Stats calculated from real database queries
- Seed data is only for development/testing
- Production uses real data only

### Code Quality
- Use ESLint and fix all warnings
- Write self-documenting code
- Add comments only for complex logic
- Use meaningful variable names
- Follow consistent naming conventions:
  - camelCase for variables/functions
  - PascalCase for components/classes
  - UPPER_CASE for constants

### Database Integration
- Choose MongoDB or PostgreSQL (recommend MongoDB)
- All CRUD through database - no file storage
- Proper indexing for performance
- Use environment variables for connection
- Include database backup strategy in README

### Testing (Optional but Recommended)
- Unit tests for critical functions
- Integration tests for API endpoints
- E2E tests for auth flow
- Use Jest + Supertest (backend)
- Use React Testing Library (frontend)

### Security
- JWT tokens for authentication
- Bcrypt for password hashing (10+ rounds)
- Input validation on all endpoints
- SQL injection prevention (parameterized queries)
- XSS prevention (sanitize input)
- CORS properly configured
- Rate limiting on auth endpoints
- Environment variables for secrets

### Performance
- Database indexing on frequently queried fields
- Pagination for large datasets
- Lazy loading for images
- Code splitting for React
- Compress API responses
- Cache static assets

Build this as a COMPLETE, WORKING LMS that follows best practices - not a prototype or quick hack. Every component properly separated, every piece of data from the database, every feature fully functional.

**This should be production-ready code you'd be proud to deploy.**
