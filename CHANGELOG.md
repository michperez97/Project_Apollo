# Changelog
This file tracks notable changes to the project. Add new entries under
"Unreleased" and move them to a dated section when you cut a release.

## Unreleased
### Added
- Backend and frontend app scaffolding, configs, and migrations.
- JS-based Vite config to avoid TS config bundling issues.
- Backend auth, course, and enrollment routes with models/services.
- Frontend auth flow, protected routes, and dashboard pages.
- Learning management APIs (modules, assignments, submissions, grading, gradebook CSV).
- Course page UI for modules, assignments, submissions, grading, and uploads.
- Cloudinary upload signing on the backend plus frontend upload helper.
- Seed script for sample users, course content, and submissions.
- Stripe payments API (PaymentIntents, webhooks, transactions, enrollment payment status).
- Stripe Elements payment form on the student dashboard.

### Changed
- Backend dev port to 5001 in templates and README.
- Frontend health check to call the root `/health` endpoint.
- Backend status UI copy to English.
- Alignment migrations to reconcile module, assignment, and submission schemas.
- JWT token handling types and delete helpers to satisfy TypeScript strictness.
- README seed docs and seed env overrides.
- Env examples refreshed for Stripe and seed defaults.
- README updates for Stripe payments and Phase 3 status.
