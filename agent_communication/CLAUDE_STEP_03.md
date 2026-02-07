# Step 3 - Instructor Course Builder + Admin Moderation

Goal: implement the marketplace-facing course builder (metadata + thumbnail upload) for instructors,
and an admin moderation queue with approve/reject flows. Wire everything to the course status lifecycle.

Scope
- Instructor creates/edits course metadata (title, description, category, price, thumbnail).
- Instructor submits course for review (status: draft -> pending).
- Admin views pending courses and approves or rejects with feedback.
- Approved courses appear in public catalog (already filtered by status = approved).

Non-Goals (later steps)
- Sections/lessons builder, student player, progress tracking.
- Checkout / Stripe enrollment flow.
- Removal of legacy LMS pages (will be step 6).

Backend Tasks
1) Migration: add moderation audit + published timestamp.
   - Create `backend/migrations/017_add_course_moderation.sql`.
   - Add `published_at TIMESTAMP` to `courses` (if missing).
   - Create `course_reviews` table:
     - id SERIAL PK
     - course_id INT FK courses(id) ON DELETE CASCADE
     - admin_id INT FK users(id) ON DELETE CASCADE
     - action VARCHAR(20) CHECK (approved,rejected)
     - feedback TEXT NULL
     - created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
   - Add indexes: course_id, admin_id.

2) Model updates
   - `backend/src/models/courseModel.ts`
     - add `listCoursesByInstructor(instructorId)`
     - add `listPendingCourses()`
     - add `updateCourseStatus(courseId, status, publishedAt?)`
   - new `backend/src/models/courseReviewModel.ts`
     - `createCourseReview({ course_id, admin_id, action, feedback })`

3) Controller updates
   - `backend/src/controllers/courseController.ts`
     - add `getInstructorCourses` (instructor gets own courses; admin can pass ?instructorId)
     - add `submitCourseHandler` (instructor only; enforce ownership; set status pending)
   - new `backend/src/controllers/moderationController.ts`
     - `listPendingCoursesHandler` (admin only)
     - `approveCourseHandler` (admin only; set status approved + published_at; write course_reviews)
     - `rejectCourseHandler` (admin only; set status rejected; feedback required; write course_reviews)

4) Routes
   - `backend/src/routes/courseRoutes.ts`
     - add `POST /courses/:id/submit` for instructors
   - new `backend/src/routes/instructorRoutes.ts`
     - `GET /instructor/courses` (auth, instructor/admin)
   - new `backend/src/routes/moderationRoutes.ts`
     - `GET /admin/courses/pending`
     - `POST /admin/courses/:id/approve`
     - `POST /admin/courses/:id/reject`
   - register new routes in `backend/src/routes/index.ts`

Frontend Tasks
1) Services
   - Update `frontend/src/services/courses.ts`:
     - `getInstructorCourses()`
     - `submitCourse(courseId)`
     - `getPendingCourses()`
     - `approveCourse(courseId, feedback?)`
     - `rejectCourse(courseId, feedback)`

2) New pages
   - `frontend/src/pages/InstructorCoursesPage.tsx`
     - list instructor courses with status badges.
     - create course form (title, description, category, price, thumbnail upload).
     - edit existing course metadata (inline or modal ok).
     - submit for review button (draft/rejected only).
     - use `uploadFile` from `frontend/src/services/uploads.ts` for thumbnail.
   - `frontend/src/pages/AdminModerationQueue.tsx`
     - list pending courses (title, instructor, price, created_at).
     - approve and reject actions; require feedback on reject.
     - update list in place after action.

3) Routing + access guard
   - Update `frontend/src/App.tsx`:
     - add `/instructor/courses` -> InstructorCoursesPage
     - add `/admin/moderation` -> AdminModerationQueue
   - Add role checks inside pages (redirect to `/dashboard` or `/` if unauthorized).
   - Optional: add links/buttons from `DashboardPage` to new pages (keep legacy views for now).

Acceptance Criteria
- Instructor can create/edit course metadata and upload a thumbnail.
- Instructor can submit a course and status becomes `pending`.
- Admin can see pending courses and approve/reject them.
- Approved courses appear in landing page catalog (already filtered).
- Reject requires feedback and stores a review record.

Notes
- Use existing `courses.status` enum (draft, pending, approved, rejected).
- Keep changes minimal and avoid touching student/player flows.
- Keep file edits ASCII only.
