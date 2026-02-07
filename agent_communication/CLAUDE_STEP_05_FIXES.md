# Step 5 Fixes - Player Load and Checkout Error Handling

Goal: address two UX bugs in Step 5 pages.

Fix 1: CoursePlayerPage should show "not enrolled" cleanly
- File: `frontend/src/pages/CoursePlayerPage.tsx`
- Current: `Promise.all([getCourseContent, getCourseProgress])` fails if progress 403s.
- Change: fetch content first, check `hasFullAccess`, then fetch progress only if allowed.
- If not allowed, show a clear message and a link back to `/course/:courseId`.

Fix 2: CourseDetailPage should detect already-enrolled errors correctly
- File: `frontend/src/pages/CourseDetailPage.tsx`
- Current: uses `err.message` which won't include API error text for Axios.
- Change: read error from `err.response?.data?.error` when available.
- If error text includes "Already enrolled", refresh enrollment state and show CTA.

Notes
- Keep changes minimal and ASCII only.
