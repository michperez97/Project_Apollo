# Step 4 - Per-Course Stripe Checkout + Webhook Enrollment

Goal: replace the tuition PaymentIntent flow with a per-course Stripe Checkout flow
for marketplace purchases. Keep legacy endpoints intact (do not remove them yet).

Scope
- Add a new checkout endpoint: `POST /api/payments/checkout`
- Handle Stripe webhook event `checkout.session.completed`
- Create enrollment + transaction on successful checkout
- Prevent duplicate purchases (already enrolled)
- Support free courses (price 0) with immediate enrollment

Non-Goals (later steps)
- Student course detail + purchase UI (Step 5)
- Removing legacy PaymentIntent endpoints (Step 6)

Backend Tasks
1) Stripe service
   - File: `backend/src/services/stripeService.ts`
   - Add `createCheckoutSession(params)`:
     - params: amountCents, courseId, courseTitle, studentId, customerEmail, successUrl, cancelUrl
     - Use `stripe.checkout.sessions.create` with:
       - mode: 'payment'
       - line_items with price_data (currency from STRIPE_CURRENCY, unit_amount = amountCents)
       - metadata: course_id, student_id
       - success_url / cancel_url
   - Return session (id + url)

2) Enrollment model helper
   - File: `backend/src/models/enrollmentModel.ts`
   - Add `getEnrollmentByStudentAndCourse(studentId, courseId)`

3) Payment controller
   - File: `backend/src/controllers/paymentController.ts`
   - Add `createCheckoutSessionHandler`:
     - Auth required; allow student + admin
     - Accept `courseId` (and optional `student_id` when admin)
     - Validate course exists AND status is approved
     - If already enrolled => 409
     - If price is 0 or null:
       - create enrollment immediately (payment_status = 'paid', tuition_amount = 0)
       - return `{ enrollment, checkout: null }`
     - Else:
       - create Stripe Checkout session
       - return `{ checkout: { id, url } }`
   - Extend webhook handler:
     - Handle `checkout.session.completed`
     - Extract `session.metadata.course_id` + `session.metadata.student_id`
     - Use `session.payment_intent` as the Stripe payment id
     - Idempotency:
       - If enrollment already exists, exit early
       - If transaction exists by `stripe_payment_id`, skip creating duplicate
     - Create transaction (type = 'payment', status = 'completed')
     - Create enrollment with `tuition_amount = course.price` and `payment_status = 'paid'`
   - Keep existing PaymentIntent handlers untouched.

4) Routes
   - File: `backend/src/routes/paymentRoutes.ts`
   - Add `POST /checkout` -> createCheckoutSessionHandler

5) Frontend service
   - File: `frontend/src/services/payments.ts`
   - Add `createCheckoutSession(courseId, studentId?)` that hits `/payments/checkout`
   - Return shape: `{ checkout?: { id, url }, enrollment?: Enrollment }`

6) Environment vars
   - Add optional:
     - `STRIPE_CHECKOUT_SUCCESS_URL`
     - `STRIPE_CHECKOUT_CANCEL_URL`
   - Fallbacks: `${FRONTEND_URL}/dashboard?checkout=success` and `${FRONTEND_URL}/dashboard?checkout=cancel`

Acceptance Criteria
- Checkout endpoint returns a Stripe session URL for paid courses.
- Webhook creates transaction + enrollment exactly once.
- Free courses immediately enroll without Stripe checkout.
- No regression to existing PaymentIntent routes.

Notes
- Use existing `enrollments.tuition_amount` as the paid price for now.
- Use `stripe_payment_id` in transactions for PaymentIntent id from checkout.
- Keep changes ASCII-only.
