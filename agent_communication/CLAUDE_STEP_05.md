# Step 5 - Student Experience: Course Detail, Player, Progress, Quizzes

Goal: deliver the student learning experience with a public course detail page,
an enrolled-only course player, progress tracking, and basic quiz rendering.

Scope
- Public course detail page with curriculum preview + enrollment CTA.
- Enrolled-only course player with video/text/quiz lessons.
- Progress tracking (resume position, completion).
- Student dashboard with enrolled courses + progress percent.

Non-Goals (later steps)
- Remove legacy LMS pages (Step 6).
- Advanced quizzes, grading, certificates (later).

Backend Tasks
1) Migration: create content + progress tables.
   - New migration: `backend/migrations/018_add_course_content.sql`
   - Create tables:
     - `course_sections` (id, course_id, title, position, created_at, updated_at)
     - `course_lessons` (id, course_id, section_id, title, lesson_type, position,
        video_url, content, duration_seconds, is_preview, created_at, updated_at)
     - `student_progress` (id, student_id, lesson_id, status, last_position_seconds,
        completed_at, updated_at)
   - Add indexes for course_id/section_id/lesson_id + unique (student_id, lesson_id).

2) Models
   - `backend/src/models/courseSectionModel.ts`
     - `listSectionsByCourse(courseId)`
     - `createSection(courseId, data)`
   - `backend/src/models/courseLessonModel.ts`
     - `listLessonsByCourse(courseId)`
     - `getLessonById(lessonId)`
     - `createLesson(courseId, sectionId, data)`
   - `backend/src/models/studentProgressModel.ts`
     - `listProgressByStudentAndCourse(studentId, courseId)`
     - `upsertProgress({ student_id, lesson_id, status, last_position_seconds, completed_at })`

3) Controllers
   - `backend/src/controllers/courseContentController.ts`
     - `getCourseContentHandler`:
       - For approved courses: public can see sections + lessons but **only**
         preview lessons include `video_url`/`content`.
       - Enrolled students, course owner, or admin get full lesson content.
       - Return `{ course, sections }` where sections include lessons.
   - `backend/src/controllers/progressController.ts`
     - `getCourseProgressHandler` (student only): returns progress list for a course.
     - `updateLessonProgressHandler` (student only): upsert progress.

4) Routes
   - New route file: `backend/src/routes/courseContentRoutes.ts`
     - `GET /courses/:courseId/content` (optional auth)
     - `GET /courses/:courseId/progress` (auth student)
   - New route file: `backend/src/routes/progressRoutes.ts`
     - `POST /lessons/:lessonId/progress` (auth student)
   - Register both in `backend/src/routes/index.ts`

5) Access rules
   - For full content: user must be enrolled OR instructor owner OR admin.
   - For preview: only return lessons with `is_preview = true` and redact `video_url`/`content`
     for non-preview lessons.

Frontend Tasks
1) Services
   - Add `frontend/src/services/content.ts`:
     - `getCourseContent(courseId)`
     - `getCourseProgress(courseId)`
     - `updateLessonProgress(lessonId, payload)`
   - Reuse existing `createCheckoutSession` from `payments.ts`.

2) Pages
   - `frontend/src/pages/CourseDetailPage.tsx` (public)
     - Show title, description, price, instructor_id, status badge.
     - Show curriculum preview using `getCourseContent`.
     - CTA:
       - If logged in & enrolled -> "Continue Learning" (link to player).
       - If logged in & not enrolled -> "Enroll" -> call checkout, redirect to URL.
       - If not logged in -> "Sign in to enroll".
   - `frontend/src/pages/CoursePlayerPage.tsx` (protected)
     - Fetch full content + progress.
     - Sidebar with sections/lessons.
     - Lesson renderer:
       - video: HTML5 video; update progress on timeupdate (throttle) + ended.
       - text: render content.
       - quiz: parse JSON in content; render MCQ/true-false with immediate feedback.
     - Progress bar: % lessons completed.
   - `frontend/src/pages/StudentDashboardPage.tsx` (protected, student only)
     - List enrollments + course titles.
     - Progress percent per course (based on lesson count vs completed progress).
     - "Continue" link to player.

3) Routing + links
   - Update `frontend/src/App.tsx`:
     - Add `/course/:courseId` -> CourseDetailPage (public)
     - Add `/learn/:courseId` -> CoursePlayerPage (protected)
     - Add `/student/dashboard` -> StudentDashboardPage (protected)
   - Update `frontend/src/pages/LandingPage.tsx`:
     - "View course" links to `/course/:courseId`
   - Update `frontend/src/pages/DashboardPage.tsx`:
     - For students, add link to `/student/dashboard`.

4) Optional seed (for testing)
   - Add a small seed block in `backend/src/scripts/seed.ts` to insert
     one section + 2 lessons (video/text) for the sample course.

Acceptance Criteria
- Public can view course details and preview lessons.
- Logged-in student can purchase via checkout and then access the player.
- Player updates progress and resumes from last position.
- Student dashboard shows enrolled courses + progress.

Notes
- Keep legacy LMS pages intact; do not remove.
- ASCII only.
