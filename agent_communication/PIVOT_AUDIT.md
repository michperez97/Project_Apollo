# PIVOT AUDIT - Legacy LMS to Course Marketplace

This document audits legacy LMS surfaces, identifies marketplace-ready components,
and maps gaps against the SRS/SDS for the marketplace pivot.

---

## 1. Legacy LMS Surfaces (To Retire/Refactor)

### Frontend Pages
| File | Description | Action |
|------|-------------|--------|
| `frontend/src/pages/DashboardPage.tsx` | Course creation via credits/tuition, enrollments, payment flows | Refactor: replace with marketplace instructor/student dashboards |
| `frontend/src/pages/AdminFinancialDashboard.tsx` | Tuition balances, finance reporting | Retire: replace with marketplace revenue/payout views |
| `frontend/src/pages/CoursePage.tsx` | Modules, assignments, announcements, gradebook | Refactor: replace with course player + progress tracking |

### Frontend Services
| File | Description | Action |
|------|-------------|--------|
| `frontend/src/services/assignments.ts` | Assignment CRUD for LMS grading | Retire |
| `frontend/src/services/modules.ts` | Module/item management | Retire: replace with section/lesson services |
| `frontend/src/services/announcements.ts` | Course announcements | Retire |
| `frontend/src/services/payments.ts` | Tuition-based payment flow | Refactor: replace with per-course checkout |
| `frontend/src/services/enrollments.ts` | Tuition-based enrollments | Refactor: replace with purchase-based enrollment |

### Frontend Types
| File | Description | Action |
|------|-------------|--------|
| `frontend/src/types.ts` | Legacy course fields (code, credits, price_per_credit), modules, assignments, submissions | Refactor: remove legacy fields, add marketplace types |

### Backend Models
| File | Description | Action |
|------|-------------|--------|
| `backend/src/models/courseModel.ts` | Contains legacy fields + toLegacyFields mapping | Refactor: remove legacy mappings |
| `backend/src/models/enrollmentModel.ts` | Tuition-based enrollment model | Refactor: switch to purchase-based enrollment |
| `backend/src/models/moduleModel.ts` | LMS module structure | Retire: replace with section/lesson models |
| `backend/src/models/assignmentModel.ts` | LMS assignments | Retire |
| `backend/src/models/announcementModel.ts` | Course announcements | Retire |
| `backend/src/models/transactionModel.ts` | Tuition payment transactions | Refactor: align with Stripe checkout |

### Backend Services
| File | Description | Action |
|------|-------------|--------|
| `backend/src/services/enrollmentService.ts` | Tuition enrollment logic | Refactor |
| `backend/src/services/financeService.ts` | Tuition finance calculations | Retire |

### Backend Controllers
| File | Description | Action |
|------|-------------|--------|
| `backend/src/controllers/enrollmentController.ts` | Enrollment endpoints | Refactor |
| `backend/src/controllers/paymentController.ts` | Tuition payment endpoints | Refactor: per-course checkout |
| `backend/src/controllers/financeController.ts` | Finance reporting endpoints | Retire |
| `backend/src/controllers/moduleController.ts` | Module CRUD | Retire |
| `backend/src/controllers/assignmentController.ts` | Assignment CRUD | Retire |
| `backend/src/controllers/announcementController.ts` | Announcement CRUD | Retire |

### Backend Routes
| File | Description | Action |
|------|-------------|--------|
| `backend/src/routes/paymentRoutes.ts` | Tuition payment routes | Refactor |
| `backend/src/routes/financeRoutes.ts` | Finance routes | Retire |
| `backend/src/routes/moduleRoutes.ts` | Module routes | Retire |
| `backend/src/routes/assignmentRoutes.ts` | Assignment routes | Retire |
| `backend/src/routes/announcementRoutes.ts` | Announcement routes | Retire |
| `backend/src/routes/enrollmentRoutes.ts` | Enrollment routes | Refactor |

### Database Migrations (Legacy)
| File | Description | Action |
|------|-------------|--------|
| `backend/migrations/002_create_courses.sql` | Legacy course schema | Refactor via new migration |
| `backend/migrations/003_create_enrollments.sql` | Tuition-based enrollments | Refactor via new migration |
| `backend/migrations/004_create_modules.sql` | Modules table | Retire |
| `backend/migrations/005_create_module_items.sql` | Module items table | Retire |
| `backend/migrations/006_create_assignments.sql` | Assignments table | Retire |
| `backend/migrations/007_create_submissions.sql` | Submissions table | Retire |
| `backend/migrations/008_create_grades.sql` | Grades table | Retire |
| `backend/migrations/009_create_announcements.sql` | Announcements table | Retire |
| `backend/migrations/010_create_transactions.sql` | Tuition transactions | Refactor |
| `backend/migrations/011_create_modules_and_items.sql` | Module restructure | Retire |
| `backend/migrations/012_create_assignments_and_submissions.sql` | Assignment restructure | Retire |
| `backend/migrations/013_align_module_items.sql` | Module item alignment | Retire |
| `backend/migrations/014_align_assignments.sql` | Assignment alignment | Retire |
| `backend/migrations/015_align_submissions_and_grades.sql` | Submission/grade alignment | Retire |

### Scripts
| File | Description | Action |
|------|-------------|--------|
| `backend/src/scripts/seed.ts` | Seeds modules, assignments, tuition data | Refactor: seed marketplace data |

---

## 2. Marketplace-Ready Surfaces (Already Aligned)

| File | Description | Status |
|------|-------------|--------|
| `frontend/src/pages/LandingPage.tsx` | Public landing page + course catalog | Ready |
| `frontend/src/services/courses.ts` | Course service (supports marketplace fields) | Ready |
| `backend/src/controllers/courseController.ts` | Course CRUD + public catalog | Ready |
| `backend/src/routes/courseRoutes.ts` | Course API routes | Ready |
| `backend/src/models/courseModel.ts` | Marketplace fields (status, price, category, instructor_id) | Partially ready (remove legacy) |
| `backend/migrations/016_pivot_marketplace.sql` | Marketplace fields + status column | Ready |
| `backend/src/services/uploadService.ts` | Media upload to Cloudinary | Ready |
| `frontend/src/services/uploads.ts` | Frontend upload service | Ready |
| `backend/src/controllers/uploadController.ts` | Upload endpoints | Ready |
| `backend/src/routes/uploadRoutes.ts` | Upload routes | Ready |

---

## 3. Missing Features vs SRS/SDS

| Feature | Description | Priority |
|---------|-------------|----------|
| Instructor Course Builder UI | Section/lesson creation, media uploads, reordering | High |
| Section/Lesson Models | Replace modules with sections + lessons (video, text, quiz) | High |
| Admin Moderation Queue | List pending courses, approve/reject workflow | High |
| Submit/Approve/Reject Endpoints | Course status transitions with admin approval | High |
| Per-Course Stripe Checkout | Create checkout session, handle payment | High |
| Stripe Webhook Handler | Process successful payments, create enrollment | High |
| Student Progress Tracking | Lesson completion, resume position | Medium |
| Course Player Redesign | Video player, lesson navigation, progress indicator | Medium |
| Public Course Detail Page | Course info, instructor bio, purchase CTA | High |
| Shopping Cart / Purchase Flow | Add to cart, checkout, confirmation | High |
| Quizzes/Assessments | Quiz builder, grading tied to course player | Medium |
| Certificates | Generate certificate on course completion | Low |
| Email Notifications | Purchase confirmation, enrollment, course updates | Medium |

---

## 4. Notes / Migration Mapping

### Database Migration Strategy
1. Create new `sections` and `lessons` tables (replace modules/module_items)
2. Create `student_progress` table for tracking
3. Modify `enrollments` to be purchase-based (add stripe_payment_id, remove tuition fields)
4. Drop legacy tables in final cleanup migration (modules, module_items, assignments, submissions, grades, announcements)
5. Remove legacy columns from `courses` table

### Code Migration Order
1. **Phase 1**: Build new models/routes for sections, lessons, progress (additive)
2. **Phase 2**: Build instructor course builder + admin moderation
3. **Phase 3**: Build checkout flow + webhook handling
4. **Phase 4**: Build course player + progress tracking
5. **Phase 5**: Remove legacy LMS code and migrations

### Key Refactoring Notes
- `DashboardPage.tsx`: Split into `InstructorDashboard.tsx` and `StudentDashboard.tsx`
- `CoursePage.tsx`: Split into `CourseBuilderPage.tsx` (instructor) and `CoursePlayerPage.tsx` (student)
- `AdminFinancialDashboard.tsx`: Replace with `AdminModerationPage.tsx` + `AdminRevenueReportPage.tsx`
- Keep auth system (`AuthContext`, `authMiddleware`, `authService`) unchanged

### Stripe Integration Notes
- Current: `stripeService.ts` exists but tied to tuition flow
- Needed: Per-course checkout session creation, webhook for `checkout.session.completed`
- Enrollment creation moves from manual to webhook-triggered

---

## Summary

- **Legacy surfaces**: 40+ files across frontend/backend tied to LMS functionality
- **Marketplace-ready**: Landing page, course catalog, upload infrastructure
- **Critical gaps**: Course builder, moderation, checkout, progress tracking
- **Recommended approach**: Additive development first, then legacy removal

---

*Generated for Project Apollo marketplace pivot audit*
