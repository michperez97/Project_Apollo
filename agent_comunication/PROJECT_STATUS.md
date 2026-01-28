# Project Apollo Pivot Status

Purpose
- Single source of truth for pivot progress and remaining work.
- I will keep this file updated after each step.

Completed Work
1) Step 1 - Audit (complete)
   - Output: `agent_comunication/PIVOT_AUDIT.md`
   - Summary: Tagged legacy LMS surfaces and marketplace-ready areas.

2) Step 2 - Target data model + migration plan (complete)
   - Output: `agent_comunication/PIVOT_DATA_MODEL.md`
   - Summary: Defined marketplace schema, indexes, and migration phases.

3) Step 3 - Instructor builder + admin moderation (complete)
   - Migration: `backend/migrations/017_add_course_moderation.sql`
   - New models/controllers/routes:
     - `backend/src/models/courseReviewModel.ts`
     - `backend/src/controllers/moderationController.ts`
     - `backend/src/routes/moderationRoutes.ts`
     - `backend/src/routes/instructorRoutes.ts`
   - Updates:
     - `backend/src/controllers/courseController.ts`
     - `backend/src/models/courseModel.ts`
     - `backend/src/routes/courseRoutes.ts`
   - Frontend:
     - `frontend/src/pages/InstructorCoursesPage.tsx`
     - `frontend/src/pages/AdminModerationQueue.tsx`
     - `frontend/src/services/courses.ts`
     - `frontend/src/App.tsx`

4) Step 4 - Stripe Checkout + webhook enrollment (complete)
   - Backend:
     - `backend/src/services/stripeService.ts` (Checkout session)
     - `backend/src/models/enrollmentModel.ts` (lookup helper)
     - `backend/src/controllers/paymentController.ts` (checkout + webhook)
     - `backend/src/routes/paymentRoutes.ts`
   - Frontend:
     - `frontend/src/services/payments.ts` (checkout API)
   - Fixes applied:
     - Webhook idempotency ensures enrollment creation
     - Admin checkout uses student email (or none if unavailable)
     - Admin checkout validates student_id exists + role = student

5) Step 5 - Student experience (complete)
   - Migration: `backend/migrations/018_add_course_content.sql`
   - Backend:
     - `backend/src/models/courseSectionModel.ts`
     - `backend/src/models/courseLessonModel.ts`
     - `backend/src/models/studentProgressModel.ts`
     - `backend/src/controllers/courseContentController.ts`
     - `backend/src/controllers/progressController.ts`
     - `backend/src/routes/courseContentRoutes.ts`
     - `backend/src/routes/progressRoutes.ts`
   - Frontend:
     - `frontend/src/services/content.ts`
     - `frontend/src/pages/CourseDetailPage.tsx`
     - `frontend/src/pages/CoursePlayerPage.tsx`
     - `frontend/src/pages/StudentDashboardPage.tsx`
     - `frontend/src/App.tsx` (new routes)
     - `frontend/src/pages/LandingPage.tsx` (course links)
   - `frontend/src/pages/DashboardPage.tsx` (student link)

6) Step 6 - UI refresh to industrial design system (complete)
   - Dashboard shell: `frontend/src/pages/DashboardPage.tsx`
   - Student dashboard: `frontend/src/pages/StudentDashboardPage.tsx`
   - Instructor/admin dashboards:
     - `frontend/src/pages/InstructorCoursesPage.tsx`
     - `frontend/src/pages/AdminModerationQueue.tsx`
     - `frontend/src/pages/AdminFinancialDashboard.tsx`
   - Auth + catalog:
     - `frontend/src/pages/LandingPage.tsx`
     - `frontend/src/pages/LoginPage.tsx`
     - `frontend/src/pages/RegisterPage.tsx`
   - Course views:
     - `frontend/src/pages/CourseDetailPage.tsx`
     - `frontend/src/pages/CoursePlayerPage.tsx`
   - Design tokens: `frontend/src/index.css`, `frontend/tailwind.config.js`
   - Seed update: Data Structures & Algorithms in `backend/src/scripts/seed.ts`

Decisions / Notes
- Admins can create/edit courses, but must provide `instructor_id`.
- Approved courses are the only ones visible in the public catalog.
- Free courses (price = 0) enroll immediately without Stripe checkout.

Current Plan And Remaining Steps
1) Step 1 - Audit (done)
2) Step 2 - Data model + migration path (done)
3) Step 3 - Instructor builder + moderation (done)
4) Step 4 - Stripe checkout + webhook (done)
5) Step 5 - Student experience (done)
   - Instruction file: `agent_comunication/CLAUDE_STEP_05.md`
6) Step 6 - UI refresh to industrial design system (done)
7) Step 7 - Remove legacy LMS modules + cleanup (pending)
   - Retire legacy LMS pages, services, models, routes, and migrations.

Next Actions
- Ensure migrations 016-018 are applied in new environments.
- Start Step 7: legacy LMS cleanup.
- Expand instructor authoring for sections/lessons when ready.

This Week - Assigned Tasks
- Andy Alonso: Instructor course builder UI (sections/lessons, reordering, media upload flow).
- Bryan Cabrera: Backend section/lesson CRUD endpoints (controllers + routes) and connect to existing models.
- Michel Perez: AI assistant integration beyond UI placeholder + email notifications (purchase/enrollment/course updates).
- Angie Quitian Moya: Quizzes/assessments + certificates (data model, API, UI).
- Richard Reyes: Legacy LMS cleanup (remove old pages/services/routes, drop legacy tables/columns, update seeds).
