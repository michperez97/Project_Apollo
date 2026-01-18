# Project_Apollo
A unified educational platform for small institutions combining LMS, school administration, and financial management.

## Team Members
* Andy Alonso
* Bryan Cabrera
* Michel Perez
* Angie Quitian Moya
* Richard Reyes

## Tech Stack
- **Frontend**: React 18 + Vite + TypeScript + Tailwind CSS
- **Backend**: Node.js + Express + TypeScript + JWT
- **Database**: PostgreSQL 14+
- **Payments**: Stripe
- **File Storage**: Cloudinary

## Project Structure
```
Project_Apollo/
├── backend/          # Express API server
├── frontend/         # React application
└── shared/           # Shared TypeScript types
```

## Getting Started

### Prerequisites
- Node.js 18+ and npm
- PostgreSQL 14+
- Cloudinary account (for uploads)
- Git

### Installation

1. **Clone the repository** (if not already done):
```bash
git clone <repository-url>
cd Project_Apollo
```

2. **Install dependencies**:
```bash
npm install
npm run install:all
```

3. **Set up environment variables**:

Backend:
```bash
cd backend
cp .env.example .env
# Edit .env with your database credentials and API keys
```

Frontend:
```bash
cd frontend
cp .env.example .env
# Edit .env with your API configuration
```

4. **Set up the database**:
```bash
# Create PostgreSQL database
createdb project_apollo

# Run migrations
cd backend
npm run migrate:up
```

5. **Start the development servers**:

Option 1 - Start both together (from root):
```bash
npm run dev
```

Option 2 - Start separately:
```bash
# Terminal 1: Backend
cd backend
npm run dev

# Terminal 2: Frontend
cd frontend
npm run dev
```

6. **Access the application**:
- Frontend: http://localhost:5173
- Backend API: http://localhost:5001
- Health check: http://localhost:5001/health

## Team Onboarding (Quick Start)
1. Clone and install:
   ```bash
   git clone <repository-url>
   cd Project_Apollo
   npm install
   npm run install:all
   ```
2. Configure env files:
   ```bash
   cp backend/.env.example backend/.env
   cp frontend/.env.example frontend/.env
   ```
   - Set `DATABASE_URL`, `JWT_SECRET`, and `FRONTEND_URL` at minimum.
   - Add Cloudinary keys to enable uploads.
   - Add Stripe test keys to enable payments.
3. Initialize the database:
   ```bash
   createdb project_apollo
   cd backend
   npm run migrate:up
   npm run seed
   ```
4. Run:
   ```bash
   cd ..
   npm run dev
   ```

### Stripe payments (development)
1. Set `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, and `STRIPE_CURRENCY` in `backend/.env`. Add `VITE_STRIPE_PUBLISHABLE_KEY` to `frontend/.env`.
   - Use test keys from the same Stripe account and restart dev servers after updates.
2. Run the Stripe CLI webhook forwarder:
   ```bash
   stripe listen --forward-to http://localhost:5001/api/payments/webhook
   ```
3. Sign in as a student and use the Dashboard “Pay tuition” button. The backend creates a PaymentIntent from the enrollment tuition and webhook updates payment status.

## Development

### Backend Commands
```bash
cd backend
npm run dev           # Start development server
npm run build         # Build for production
npm run start         # Start production server
npm run migrate:up    # Run database migrations
npm run migrate:down  # Rollback last migration
npm run migrate:create <name>  # Create new migration
npm run seed          # Seed sample data
```

### Frontend Commands
```bash
cd frontend
npm run dev           # Start development server
npm run build         # Build for production
npm run preview       # Preview production build
```

## Learning Management Overview (Phase 2)
- Modules & items: create/list modules per course; items support text, links, files (via Cloudinary).
- Assignments: teachers/admins create; students submit URL/text or uploaded file.
- Grading: staff grades submissions; students see grades/feedback; gradebook CSV available.
- Uploads: backend issues Cloudinary signatures at `/uploads/sign`; frontend uploads directly then stores the returned URL.

## Financial Management Overview (Phase 3)
- Stripe payments: students can pay tuition from enrollments; backend creates PaymentIntents and records transactions.
- Webhooks: Stripe events update transaction status and enrollment payment state.

## Database Migrations

The project uses `node-pg-migrate` for database migrations. Migration files are located in `backend/migrations/`.

To create a new migration:
```bash
cd backend
npm run migrate:create add_new_feature
```

## Seeding (Optional)

Seed sample users, course content, and submissions:
```bash
cd backend
npm run seed
```

Defaults (override via env if needed):
- Admin: `admin@apollo.local`
- Teacher: `teacher@apollo.local`
- Student: `student@apollo.local`
- Password: `Password123!`

Override options for `npm run seed`:
- `SEED_ADMIN_EMAIL`
- `SEED_TEACHER_EMAIL`
- `SEED_STUDENT_EMAIL`
- `SEED_PASSWORD`

## Environment Variables

### Backend (.env)
- `NODE_ENV` - Environment (development/production)
- `PORT` - Server port (default: 5000 if not set; this repo uses 5001 in `.env`)
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - Secret key for JWT tokens
- `JWT_EXPIRES_IN` - JWT expiration (e.g., `7d`)
- `STRIPE_SECRET_KEY` - Stripe secret key
- `STRIPE_WEBHOOK_SECRET` - Stripe webhook secret
- `STRIPE_CURRENCY` - Currency code for payments (e.g., `usd`)
- `FRONTEND_URL` - Frontend URL for CORS
- `CLOUDINARY_CLOUD_NAME` - Cloudinary cloud name
- `CLOUDINARY_API_KEY` - Cloudinary API key
- `CLOUDINARY_API_SECRET` - Cloudinary API secret
- `SEED_ADMIN_EMAIL` - Optional seed email for the admin user
- `SEED_TEACHER_EMAIL` - Optional seed email for the teacher user
- `SEED_STUDENT_EMAIL` - Optional seed email for the student user
- `SEED_PASSWORD` - Optional seed password for all seeded users

### Frontend (.env)
- `VITE_API_URL` - Backend API URL
- `VITE_STRIPE_PUBLISHABLE_KEY` - Stripe publishable key

## Features (Planned)

### Phase 1: Core Platform
- [x] Project setup with monorepo structure
- [x] User authentication (JWT)
- [x] Role-based access control (Admin, Teacher, Student)
- [x] Course management
- [x] Student enrollment with automatic tuition calculation

### Phase 2: Learning Management
- [x] Module and content organization (modules + items)
- [x] Assignment creation and submission
- [x] File uploads (Cloudinary-signed)
- [x] Grading system
- [x] Gradebook with CSV export

### Phase 3: Financial Management
- [x] Stripe payment integration
- [ ] Balance tracking
- [ ] Transaction history
- [x] Webhook handling
- [ ] Admin financial dashboard

### Phase 4: Communication & Polish
- [ ] Announcements
- [ ] Responsive design
- [ ] Loading states and error handling
- [ ] Deployment to production

## Contributing

1. Create a feature branch: `git checkout -b feature/your-feature`
2. Make your changes
3. Test thoroughly
4. Commit: `git commit -m "feat: add your feature"`
5. Push: `git push origin feature/your-feature`
6. Create a Pull Request

## License
MIT
