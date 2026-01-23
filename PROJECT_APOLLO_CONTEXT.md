# Project Apollo - Context Document

## Overview
Project Apollo is pivoting from a school-focused LMS into a course marketplace where instructors publish courses and students discover, purchase, and learn on demand. This document captures the current state and the near-term roadmap.

---

## Current Technical Stack
- **Frontend:** React 18 + Vite + TypeScript + Tailwind CSS
- **Backend:** Node.js + Express + TypeScript
- **Database:** PostgreSQL 14+
- **Payments:** Stripe integration (legacy tuition flow)
- **File Uploads:** Cloudinary integration
- **Authentication:** JWT-based with role-based access control

---

## Current State of Development

### Built and Working
**Authentication (100%)**
- User registration with email/password
- Login with JWT tokens
- Roles: admin, instructor, student
- Role-based route protection

**Course Management (In Transition)**
- Marketplace fields added (title, category, price, status, instructor_id)
- Legacy LMS fields still present (code, credits, price per credit)
- Public catalog endpoint returns approved courses only

**Public Landing Page (New)**
- Landing page accessible without login
- Catalog section lists approved courses

**Legacy LMS Modules (Existing)**
- Modules/items, assignments, grades, announcements, tuition-based enrollments
- These remain while the marketplace architecture replaces them

### Missing or Planned
- Instructor course builder with media uploads
- Admin moderation workflow
- Student progress tracking and certificates
- Course detail + learning player redesign
- Course checkout flow aligned with Stripe
- Email notifications

---

## Product Direction (Decided)

- **Product Type:** Online course marketplace (Teachable/Thinkific-style)
- **Roles:** Admin, Instructor, Student
- **Public Catalog:** Yes (public landing + catalog)
- **Pricing Model:** Per-course (free or paid)
- **Target Audience:** Independent instructors and small training organizations

---

## Database Schema (Current + Transition)

```
users
├── id, email, password_hash, first_name, last_name, role
├── created_at, updated_at

courses
├── id, title, description, category, price, status, instructor_id
├── legacy: code, name, credit_hours, price_per_credit, teacher_id
├── created_at, updated_at

enrollments
├── id, student_id (FK), course_id (FK)
├── tuition_amount, payment_status, enrolled_at

modules / module_items
├── legacy LMS content (to be refactored into sections/lessons)

assignments / submissions / grades
├── legacy LMS grading flow (to be replaced)

announcements
├── legacy course announcements (to be replaced)

transactions
├── Stripe payment records (legacy tuition-based)
```

---

## Pivot Plan (Near-Term)
1. Replace LMS course model with marketplace course schema
2. Build instructor course builder + lesson upload flow
3. Implement moderation queue for admin approvals
4. Replace tuition payments with per-course checkout
5. Add student progress tracking

---

## Architecture Improvements Needed
1. Multi-screen navigation and shared layout
2. Break monolithic pages into focused views
3. Course sub-navigation for builder/player
4. Responsive refinements across new pages

---

## File Locations (for reference)

**Frontend:**
- `/frontend/src/App.tsx` - Route definitions
- `/frontend/src/pages/` - Page components
- `/frontend/src/components/` - Reusable components
- `/frontend/src/services/` - API service layer
- `/frontend/src/contexts/AuthContext.tsx` - Auth state

**Backend:**
- `/backend/src/routes/` - API routes
- `/backend/src/controllers/` - Request handlers
- `/backend/src/models/` - Database queries
- `/backend/src/services/` - Business logic
- `/backend/migrations/` - Database schema

---

## Summary
Apollo now targets a modern course marketplace with a public landing page and instructor-driven course creation. Legacy LMS features remain temporarily while marketplace functionality replaces the old flows.
