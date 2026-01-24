# Step 1 - Audit And Tag Legacy LMS Surfaces

Goal: produce a repo-local audit doc that tags legacy LMS surfaces and identifies gaps vs the
marketplace SRS/SDS. Do not change runtime behavior in this step.

Execution Tasks
1) Create `PIVOT_AUDIT.md` at the repo root (ASCII only).
2) Populate it with these sections:
   - Legacy LMS surfaces to retire/refactor (include file references)
   - Marketplace-ready surfaces (already aligned)
   - Missing features vs SRS/SDS
   - Notes / migration mapping (short)
3) Keep the doc concise and actionable.

Findings To Include (verify quickly if needed)

Legacy LMS Surfaces
- `frontend/src/pages/DashboardPage.tsx` (course creation via credits/tuition, enrollments, payments)
- `frontend/src/pages/AdminFinancialDashboard.tsx` (tuition balances + finance reporting)
- `frontend/src/pages/CoursePage.tsx` (modules, assignments, announcements, gradebook)
- `frontend/src/services/assignments.ts`
- `frontend/src/services/modules.ts`
- `frontend/src/services/announcements.ts`
- `frontend/src/services/payments.ts`
- `frontend/src/types.ts` (legacy course fields + modules/assignments/submissions)
- `backend/src/models/courseModel.ts` (legacy fields + toLegacyFields mapping)
- `backend/src/services/enrollmentService.ts` + `backend/src/models/enrollmentModel.ts`
- `backend/src/controllers/enrollmentController.ts`
- `backend/src/controllers/paymentController.ts` + `backend/src/routes/paymentRoutes.ts`
- `backend/src/services/financeService.ts`
- `backend/src/controllers/financeController.ts` + `backend/src/routes/financeRoutes.ts`
- `backend/src/models/moduleModel.ts` + `backend/src/controllers/moduleController.ts` + `backend/src/routes/moduleRoutes.ts`
- `backend/src/models/assignmentModel.ts` + `backend/src/controllers/assignmentController.ts` + `backend/src/routes/assignmentRoutes.ts`
- `backend/src/models/announcementModel.ts` + `backend/src/controllers/announcementController.ts` + `backend/src/routes/announcementRoutes.ts`
- `backend/src/scripts/seed.ts` (seeded modules/assignments/tuition)
- Migrations: `backend/migrations/002_create_courses.sql`, `003_create_enrollments.sql`,
  `004_create_modules.sql`, `005_create_module_items.sql`, `006_create_assignments.sql`,
  `007_create_submissions.sql`, `008_create_grades.sql`, `009_create_announcements.sql`,
  `010_create_transactions.sql`, `011_create_modules_and_items.sql`,
  `012_create_assignments_and_submissions.sql`, `013_align_module_items.sql`,
  `014_align_assignments.sql`, `015_align_submissions_and_grades.sql`

Marketplace-Ready Surfaces
- `frontend/src/pages/LandingPage.tsx` (public landing + catalog)
- `frontend/src/services/courses.ts`
- `backend/src/controllers/courseController.ts` + `backend/src/routes/courseRoutes.ts`
- `backend/src/models/courseModel.ts` (status + published filter)
- `backend/migrations/016_pivot_marketplace.sql` (marketplace fields + status)
- `backend/src/services/uploadService.ts` + `frontend/src/services/uploads.ts` (media upload base)

Missing vs SRS/SDS
- Instructor course builder UI + lesson/section models
- Admin moderation queue + submit/approve/reject workflow endpoints
- Per-course Stripe Checkout session + webhook to create enrollment
- Student progress tracking (lesson completion, resume)
- Quizzes/assessments tied to the course player
- Public course detail + purchase flow and cart
- Certificates

Constraints
- Do not change application logic.
- Doc-only edits for this step.
