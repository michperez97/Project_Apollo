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

## Database Migrations

The project uses `node-pg-migrate` for database migrations. Migration files are located in `backend/migrations/`.

To create a new migration:
```bash
cd backend
npm run migrate:create add_new_feature
```

## Environment Variables

### Backend (.env)
- `NODE_ENV` - Environment (development/production)
- `PORT` - Server port (default: 5000 if not set; this repo uses 5001 in `.env`)
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - Secret key for JWT tokens
- `JWT_EXPIRES_IN` - JWT expiration (e.g., `7d`)
- `STRIPE_SECRET_KEY` - Stripe secret key
- `STRIPE_WEBHOOK_SECRET` - Stripe webhook secret
- `FRONTEND_URL` - Frontend URL for CORS
- `CLOUDINARY_CLOUD_NAME` - Cloudinary cloud name
- `CLOUDINARY_API_KEY` - Cloudinary API key
- `CLOUDINARY_API_SECRET` - Cloudinary API secret

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
- [ ] Stripe payment integration
- [ ] Balance tracking
- [ ] Transaction history
- [ ] Webhook handling
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
