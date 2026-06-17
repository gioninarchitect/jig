# TnT-ZA Academy — Build Plan & Migration

**Decision:** native TnT-ZA LMS module (React 18 + TS + Vite, Express + TS, Prisma + PostgreSQL, JWT-OTP auth, RLS multi-tenant). **Do not fork** a udemy-clone (all GitHub ones are wrong stack/license). Study the **Lattice Academy MVP** (`training-academy.html`) for the proven course→lesson→quiz→certificate pattern; build native here.

**Why native:** the payoff is *training → assessment → unlocks the role competency / SOP-training gate* (the activation hook from `role-activation-gap-analysis`). That only works if the LMS shares our **users, roles, tenants, RBAC, notifications, S3**. A fork is a second disconnected system (own Mongo, own auth, no tenants) — more work, can't do the one thing that matters.

This is a **multi-day build** — planned in phases, not rushed.

---

## 1. Prisma schema (new migration)

All models follow TnT-ZA conventions: `id` uuid, `tenantId` FK (multi-tenant isolation), `createdById`, `createdAt`/`updatedAt`, soft-delete via `deletedAt`.

```prisma
model Course {
  id            String   @id @default(uuid())
  title         String
  slug          String
  description   String?
  targetRole    String?     // learning-path role (see §2); null = general
  level         String   @default("FOUNDATION") // FOUNDATION | ROLE | ADVANCED
  coverImageUrl String?
  estimatedMin  Int      @default(0)
  published     Boolean  @default(false)
  sections      CourseSection[]
  quizzes       Quiz[]
  enrollments   Enrollment[]
  tenantId      String
  createdById   String
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  deletedAt     DateTime?
  @@index([tenantId]) @@index([targetRole])
}

model CourseSection {
  id       String  @id @default(uuid())
  courseId String
  course   Course  @relation(fields: [courseId], references: [id])
  title    String
  order    Int     @default(0)
  lessons  Lesson[]
  tenantId String
}

model Lesson {
  id          String  @id @default(uuid())
  sectionId   String
  section     CourseSection @relation(fields: [sectionId], references: [id])
  title       String
  type        String  @default("VIDEO")  // VIDEO | TEXT | PDF | INTERACTIVE
  contentUrl  String?    // S3 key for video/pdf
  contentBody String?    // markdown for TEXT; walkthrough JSON for INTERACTIVE
  durationSec Int     @default(0)
  order       Int     @default(0)
  progress    LessonProgress[]
  tenantId    String
}

model Quiz {
  id        String @id @default(uuid())
  courseId  String
  course    Course @relation(fields: [courseId], references: [id])
  title     String
  passMark  Int    @default(80)   // %
  questions QuizQuestion[]
  attempts  QuizAttempt[]
  tenantId  String
}

model QuizQuestion {
  id      String @id @default(uuid())
  quizId  String
  quiz    Quiz   @relation(fields: [quizId], references: [id])
  prompt  String
  type    String @default("SINGLE") // SINGLE | MULTI | BOOLEAN
  options Json                       // string[]
  correct Json                       // index[] of correct options
  order   Int    @default(0)
}

model Enrollment {
  id          String   @id @default(uuid())
  userId      String
  courseId    String
  course      Course   @relation(fields: [courseId], references: [id])
  status      String   @default("ENROLLED") // ENROLLED | IN_PROGRESS | COMPLETED
  progressPct Int      @default(0)
  enrolledAt  DateTime @default(now())
  completedAt DateTime?
  lessonProgress LessonProgress[]
  quizAttempts   QuizAttempt[]
  certificate    Certificate?
  tenantId    String
  @@unique([userId, courseId])
}

model LessonProgress {
  id           String  @id @default(uuid())
  enrollmentId String
  enrollment   Enrollment @relation(fields: [enrollmentId], references: [id])
  lessonId     String
  lesson       Lesson  @relation(fields: [lessonId], references: [id])
  completed    Boolean @default(false)
  secondsWatched Int   @default(0)
  completedAt  DateTime?
  @@unique([enrollmentId, lessonId])
}

model QuizAttempt {
  id           String   @id @default(uuid())
  enrollmentId String
  enrollment   Enrollment @relation(fields: [enrollmentId], references: [id])
  quizId       String
  quiz         Quiz     @relation(fields: [quizId], references: [id])
  score        Int
  passed       Boolean
  answers      Json
  attemptedAt  DateTime @default(now())
}

model Certificate {
  id           String   @id @default(uuid())
  enrollmentId String   @unique
  enrollment   Enrollment @relation(fields: [enrollmentId], references: [id])
  userId       String
  courseId     String
  serial       String   @unique   // ORIGIN-ACAD-YYYY-NNNN
  pdfUrl       String?
  issuedAt     DateTime @default(now())
  tenantId     String
}
```

---

## 2. Role learning-paths (the 7 dashboard roles)

Each role has a required path of courses; completing the path + passing quizzes sets that role's **training-gate flag**. (Head-of-Cultivation = **GroOS**, a separate app — excluded.)

| Role | Path (example courses) |
|---|---|
| **Facility Manager** | Platform intro · Facility 360 · QMS & deviations · Harvest approval · Dispatch · Anomaly response |
| **Nursery Manager** | Plant register · Mothers & cloning · Bay grid · Feeding plans · Daily checks · Team allocation |
| **Nursery Staff** | Plant scan · Daily checks · Feeding records · Mortality logging · Photo evidence SOP |
| **Cultivation Manager / Head Grower** | All nursery + IPM scouting · Phase transitions · Harvest request · Env monitoring |
| **Processing (Mgr + Trimmer)** | Trim sessions & weights · Containers & handovers · Lab submission · Packaging · QA hand-off |
| **QA / Compliance** | QA sign-off · GMP audit · Deviations/CAPA · Audit trail · Batch quarantine |
| **Responsible Pharmacist** | Section 21 dispensing · Schedule-6 register · Cold-chain · PIL · COA review |

---

## 3. Backend (Express + Prisma)

Routes under `/api/academy` (reuse `authenticateToken` + RBAC):
- `GET /courses` (filter by targetRole/published) · `GET /courses/:id` (sections+lessons+quizzes)
- `POST /courses` `PATCH /courses/:id` — **authoring, level ≥ 3** (FM/admin)
- `POST /enroll` · `GET /me` (my enrollments + progress) · `GET /me/path` (required path for my role)
- `POST /lessons/:id/complete` (updates LessonProgress + recomputes Enrollment.progressPct)
- `POST /quizzes/:id/attempt` (grades, records QuizAttempt, marks pass)
- `POST /courses/:id/complete` → issues Certificate + **fires the gate hook (§4)**
- Reuse: **multer/S3** for lesson media, **notification.service** for enrol/completion emails.

---

## 4. Completion → role gate hook (the payoff)

On a role's required path completing (all courses COMPLETED + quizzes passed):
1. Write a `TrainingRecord` / set `user.trainingCompleted[role] = true`.
2. The **SOP-training prerequisite check** (gap analysis: blocks plant ops / dispensing until trained) reads this flag.
3. Feeds the **competency logbook** (W4 #27) and, where relevant, gates role activation.

---

## 5. Frontend (React + TS, TanStack Query)

- `AcademyPage` — catalogue + "My Learning" (required path, progress rings).
- `CourseDetailPage` — curriculum, enroll, resume.
- `LessonPlayer` — video/text/PDF + inline quiz; marks progress.
- `CertificatePage` — view/print certificate.
- **Authoring** (admin) — course/section/lesson/quiz builder.
- **Dashboard embed** — a "My Training" card on each role dashboard (required path + % + "Continue"), and a **"Show me how"** launcher for `INTERACTIVE` lessons (guided walkthrough on the real screens — tour lib e.g. Shepherd.js driven by the lesson's walkthrough JSON).

---

## 6. Companion module — in-dashboard bug/idea assistant → owner backlog + kanban

Separate but related (own spec): every dashboard gets a small AI assistant to log a bug/enhancement in plain language (auto-tags role + page + severity) → owner-only **backlog + draggable kanban** (New → Triaged → In progress → Done). Builds on the existing `tickets`/`kanban` pages in TnT-ZA.

---

## 7. Phasing (multi-day)

1. **Schema + core API** — migration; course/lesson/enrollment/progress endpoints.
2. **Consume UI** — AcademyPage + LessonPlayer + quiz + progress.
3. **Authoring + media** — admin builder + S3 uploads + seed the 7 role paths.
4. **Gate integration** — completion → training flag → SOP gate; certificates.
5. **Dashboard embed** — "My Training" cards on the 7 role dashboards.
6. **Interactive walkthroughs** (Shepherd) + the bug/idea assistant module.

## 8. Reuse / non-goals
Reuse: auth (JWT-OTP), RBAC, tenants/RLS, S3, notifications, existing tickets/kanban, gamification. **Non-goals:** payments/marketplace, public catalogue — this is internal staff + network-pharmacy training, not a storefront.

---
*Reference only (do not fork): `OtchereDev/Udemy_Nextjs` (most complete React example), `koushil-mankali/udemy-clone-{frontend,backend}` (clean course/lesson/enrollment API split). Check each LICENSE before borrowing any snippet.*
