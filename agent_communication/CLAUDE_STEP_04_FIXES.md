# Step 4 Fixes - Webhook Idempotency + Admin Checkout Email

Goal: fix two issues in the checkout/webhook flow.

Fix 1: Webhook idempotency should still ensure enrollment exists
- File: `backend/src/controllers/paymentController.ts`
- In `checkout.session.completed`:
  - If a transaction already exists, do NOT return early.
  - Instead: if enrollment does not exist, create it; then return.
  - This ensures retries or partial failures still grant access.

Fix 2: Admin checkout should not use admin email for student receipt
- File: `backend/src/controllers/paymentController.ts`
- In `createCheckoutSessionHandler`:
  - If admin is purchasing for a student and you cannot fetch the student's email,
    omit `customer_email` when creating the checkout session.
  - Optionally: fetch student email via user model if available and pass that instead.

Notes
- Keep legacy PaymentIntent flow intact.
- Limit changes to `backend/src/controllers/paymentController.ts` unless you need a
  simple user lookup helper to fetch student email.
