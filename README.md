# Apollo Course Platform
Apollo is a course marketplace where instructors publish structured learning experiences and students discover, purchase, and complete courses.

## Status
Pivot in progress. Marketplace foundations, moderation, and student learning flows are in place. The UI has been refreshed to the industrial design system, while legacy LMS features remain during the transition.

## Key Capabilities (Current)
- Public landing page and catalog (approved courses only)
- Authentication with roles: admin, instructor, student
- Course CRUD with marketplace fields (title, category, price, status) + moderation
- Stripe checkout for one-time course purchase + monthly all-access subscription
- Student learning: course detail, course player, lesson progress tracking
- Unified industrial UI across student/instructor/admin dashboards and auth screens
- Seeded sample course: Data Structures & Algorithms

## Planned (SDS/SRS)
- Instructor course builder for sections/lessons + video uploads
- Expanded quizzes/certificates
- AI assistant integration (currently UI-only)
- Legacy LMS cleanup

## Documents
- `Project Documents /Apollo_SRS_v1.0.docx` (note: directory name includes a trailing space)
- `Project Documents /Apollo_SDS_v1.0.docx` (note: directory name includes a trailing space)

## Tech Stack
- **Frontend**: React 18 + Vite + TypeScript + Tailwind CSS
- **Backend**: Node.js + Express + TypeScript + JWT
- **Database**: PostgreSQL 14+
- **Payments**: Stripe (integration in progress)
- **File Storage**: Cloudinary

## Project Structure
```
Project_Apollo/
├── backend/          # Express API server
├── frontend/         # React application
├── agent_comunication/ # Pivot plans + project status
├── Project Documents /  # SRS/SDS docs (directory has trailing space)
└── PROJECT_APOLLO_CONTEXT.md
```

## Getting Started

### Prerequisites
- Node.js 18+ and npm
- PostgreSQL 14+
- Cloudinary account (for uploads)

### Installation

1. Install dependencies:
```bash
npm install
npm run install:all
```

2. Set up environment variables:
```bash
cd backend
cp .env.example .env

cd ../frontend
cp .env.example .env
```

3. Set up the database:
```bash
createdb project_apollo
cd backend
npm run migrate:up
npm run seed
```

4. Start the development servers:
```bash
cd ..
npm run dev
```

5. Access the app:
- Landing page: http://localhost:5173/
- Dashboard (auth required): http://localhost:5173/dashboard
- Backend API: http://localhost:5001/health (override with `PORT` in `backend/.env`)

Note: if port 5001 is in use, set `PORT` in `backend/.env` and update `VITE_API_URL` in `frontend/.env`.

## Seeded Accounts
Defaults (override via env if needed):
- Admin: `admin@apollo.local`
- Instructor: `instructor@apollo.local`
- Student: `student@apollo.local`
- Password: `Password123!`

Override options for `npm run seed`:
- `SEED_ADMIN_EMAIL`
- `SEED_INSTRUCTOR_EMAIL`
- `SEED_STUDENT_EMAIL`
- `SEED_PASSWORD`

## Environment Variables

### Backend (.env)
- `NODE_ENV` - Environment (development/production)
- `PORT` - Server port (default: 5001)
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - Secret key for JWT tokens
- `JWT_EXPIRES_IN` - JWT expiration (e.g., `7d`)
- `STRIPE_SECRET_KEY` - Stripe secret key
- `STRIPE_WEBHOOK_SECRET` - Stripe webhook secret
- `STRIPE_CURRENCY` - Currency code (e.g., `usd`)
- `SUBSCRIPTION_PRICE_ID` - Stripe Price ID for the monthly all-access plan
- `FRONTEND_URL` - Frontend URL for CORS
- `CLOUDINARY_CLOUD_NAME` (optional: only needed for server-signed uploads)
- `CLOUDINARY_API_KEY` (optional: only needed for server-signed uploads)
- `CLOUDINARY_API_SECRET` (optional: only needed for server-signed uploads)
- `EMAIL_PROVIDER` - Email provider (`sendgrid`, `log`, or `disabled`)
- `EMAIL_FROM` - Default sender address (e.g., `no-reply@apollo.local`)
- `EMAIL_REPLY_TO` - Optional reply-to address
- `SENDGRID_API_KEY` - SendGrid API key (required if `EMAIL_PROVIDER=sendgrid`)
- `LLM_PROVIDER` - LLM provider (`openai_compatible` or `disabled`)
- `LLM_BASE_URL` - Base URL for chat completions (e.g., `http://localhost:11434/v1`)
- `LLM_MODEL` - Model name to use for assistant responses
- `LLM_API_KEY` - API key for hosted LLMs (optional for local)
- `LLM_TIMEOUT_MS` - LLM request timeout in milliseconds
- `ASSISTANT_MAX_COURSES` - Max courses to return in assistant results
- `SEED_ADMIN_EMAIL`
- `SEED_INSTRUCTOR_EMAIL`
- `SEED_STUDENT_EMAIL`
- `SEED_PASSWORD`

### Frontend (.env)
- `VITE_API_URL` - Backend API URL
- `VITE_STRIPE_PUBLISHABLE_KEY`
- `VITE_SUBSCRIPTION_MONTHLY_PRICE` - Placeholder monthly price shown in UI
- `VITE_CLOUDINARY_CLOUD_NAME` - Cloudinary cloud name for direct unsigned uploads
- `VITE_CLOUDINARY_UPLOAD_PRESET` - Unsigned upload preset name
- `VITE_CLOUDINARY_DEFAULT_FOLDER` - Optional default folder for uploads

### Cloudinary Uploads (Unsigned)
The app supports direct frontend uploads to Cloudinary using an unsigned preset.

1. In Cloudinary dashboard, create an unsigned upload preset (example: `apollo_unsigned`).
2. Set `VITE_CLOUDINARY_CLOUD_NAME` and `VITE_CLOUDINARY_UPLOAD_PRESET` in `frontend/.env`.
3. Restart the frontend dev server after env changes.

Uploaded files stay stored in Cloudinary and their `secure_url` is saved in Postgres (profile avatar + course thumbnail fields).

## Legacy Modules (Being Replaced)
These exist while the pivot is underway and will be refactored or removed:
- Tuition-based enrollment and finance dashboards
- Assignments and grading flows
- Course modules/items built for LMS semantics

## Contributing
1. Create a feature branch: `git checkout -b feature/your-feature`
2. Make your changes
3. Test thoroughly
4. Commit: `git commit -m "feat: add your feature"`
5. Push: `git push origin feature/your-feature`
6. Create a Pull Request

## License
MIT
