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

### Changed
- Backend dev port to 5001 in templates and README.
- Frontend health check to call the root `/health` endpoint.
- Backend status UI copy to English.
- Alignment migrations to reconcile module, assignment, and submission schemas.
