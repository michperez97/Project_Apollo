# Step 4 Fixes (2) - Validate Admin Student ID

Goal: prevent admin checkout from proceeding with a nonexistent student_id.

Required Fix
- File: `backend/src/controllers/paymentController.ts`
- In `createCheckoutSessionHandler`:
  - After `findUserById(studentId)` for admin purchases, if no user is found:
    - return 400 with `Invalid student_id`
  - Optional (recommended): ensure the user role is `student` and reject otherwise.

Notes
- Keep the rest of the checkout flow unchanged.
