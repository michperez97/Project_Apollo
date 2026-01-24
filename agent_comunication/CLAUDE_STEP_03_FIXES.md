# Step 3 Fixes - Ownership, Admin Course Creation, Published Timestamp

Goal: address the findings from the Step 3 review without changing overall behavior.

Required Fixes
1) Enforce instructor ownership on update.
   - File: `backend/src/controllers/courseController.ts`
   - In `updateCourseHandler`, fetch the course and:
     - If user is instructor: reject if `course.instructor_id !== req.user.sub`
     - If user is admin: allow
   - Keep existing 404 behavior if course not found.

2) Allow admin to create/edit courses with a chosen instructor.
   - File: `frontend/src/pages/InstructorCoursesPage.tsx`
     - If `user.role === 'admin'`, show an `Instructor ID` numeric input in the create/edit form.
     - When admin creates/updates, pass `instructor_id` if provided.
     - If blank, show a validation error and block submit (admin must select instructor).
   - File: `backend/src/controllers/courseController.ts`
     - In `createCourseHandler`, if admin is creating and `instructor_id` is missing, return 400.
     - In `updateCourseHandler`, allow admin to change `instructor_id`.

3) Ensure published_at clears on reject.
   - File: `backend/src/models/courseModel.ts`
     - Update `updateCourseStatus` to accept an explicit publishedAt value, and set it
       directly rather than `COALESCE`.
   - File: `backend/src/controllers/moderationController.ts`
     - On reject, call `updateCourseStatus(courseId, 'rejected', null)`.

4) Validate instructorId query param
   - File: `backend/src/controllers/courseController.ts`
     - In `getInstructorCourses`, if admin passes `?instructorId` and it's not a valid number,
       return 400.

Optional UX Fixes (nice to have)
5) Price display
   - File: `frontend/src/pages/InstructorCoursesPage.tsx`
   - File: `frontend/src/pages/AdminModerationQueue.tsx`
   - Render "Free" when `price` is null/undefined or `price === 0`.

Notes
- Keep everything ASCII.
- Limit changes to the files above.
