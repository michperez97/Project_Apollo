# Project_Apollo
A unified educational platform for small institutions combining LMS, school administration, and financial management.

## 🎓 Complete Feature Set

**Learning Management System:**
- Course creation and management with semesters, credits, and pricing
- Module-based content organization (text, links, files via Cloudinary)
- Assignment creation, submission, and grading system
- Gradebook with CSV export for academic records
- Real-time announcements for course communications

**Financial Management:**
- Stripe payment integration for tuition processing
- Automated balance tracking per student
- Complete transaction history (payments, refunds, adjustments)
- Admin financial dashboard with revenue analytics and CSV export
- Secure webhook handling for payment status updates

**User Management:**
- Role-based access control (Admin, Teacher, Student)
- JWT authentication with secure session management
- Automatic enrollment with tuition calculation
- Student-specific dashboards and views

**User Experience:**
- Fully responsive design (mobile, tablet, desktop)
- Loading states and error handling throughout
- Empty state guidance for new users
- Touch-optimized for mobile devices

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
- Balance tracking: students see their own balance summary; admins can query any student.
- Transaction history: full audit trail of all payments, refunds, and adjustments.
- Admin dashboard: comprehensive financial overview with revenue totals, outstanding balances, student payment status, and CSV export.

## Communication Features (Phase 4)
- Announcements: teachers and admins can post course-specific announcements visible to all enrolled students.
- Recent announcements display on dashboard for quick updates.
- Full announcement management on course pages with create/delete capabilities.
- Responsive design: fully optimized for mobile phones and tablets with touch-friendly interfaces, collapsible layouts, and adaptive typography.
- Loading states: spinner components, skeleton screens, and loading cards for all async operations with disabled button states.
- Error handling: consistent alert components (error/success/info/warning), error fallbacks with retry, and user-friendly error messages.
- Empty states: helpful empty state cards with icons and action prompts throughout the app for better UX.

## Deployment

### Production Considerations

**Security Checklist:**
- ✅ Use strong `JWT_SECRET` (32+ characters, cryptographically random)
- ✅ Enable HTTPS/TLS for all production traffic
- ✅ Set `NODE_ENV=production` in backend
- ✅ Use production Stripe keys and webhook secrets
- ✅ Enable CORS only for your production frontend domain
- ✅ Use secure PostgreSQL credentials
- ✅ Never commit `.env` files to version control
- ✅ Enable rate limiting on authentication endpoints (recommended)
- ✅ Set secure cookie flags if using cookies
- ✅ Keep dependencies updated regularly

**Database Setup:**
1. Create production PostgreSQL database (PostgreSQL 14+)
2. Run migrations: `npm run migrate:up` in backend
3. Optionally seed initial admin user: `npm run seed`

**Build for Production:**
```bash
# Backend
cd backend
npm run build

# Frontend
cd frontend
npm run build
```

### Deployment Options

#### Option 1: Vercel (Frontend) + Railway/Render (Backend + Database)

**Backend on Railway/Render:**
1. Create new project and connect GitHub repo
2. Set root directory to `backend`
3. Configure environment variables (all from `backend/.env.example`)
4. Add PostgreSQL database addon
5. Set build command: `npm run build`
6. Set start command: `npm start`
7. Deploy and note the backend URL

**Frontend on Vercel:**
1. Import project from GitHub
2. Set root directory to `frontend`
3. Framework preset: Vite
4. Add environment variables:
   - `VITE_API_URL` = your backend URL + `/api`
   - `VITE_STRIPE_PUBLISHABLE_KEY` = production Stripe key
5. Deploy

**Stripe Webhooks (Production):**
1. Go to Stripe Dashboard → Webhooks
2. Add endpoint: `https://your-backend-url.com/api/payments/webhook`
3. Select events: `payment_intent.succeeded`, `payment_intent.payment_failed`, `charge.refunded`
4. Copy webhook signing secret to backend `STRIPE_WEBHOOK_SECRET`

#### Option 2: Docker + Any Cloud Provider

**Create `Dockerfile` in backend:**
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 5001
CMD ["npm", "start"]
```

**Create `Dockerfile` in frontend:**
```dockerfile
FROM node:18-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

**Frontend `nginx.conf`:**
```nginx
server {
    listen 80;
    location / {
        root /usr/share/nginx/html;
        try_files $uri $uri/ /index.html;
    }
}
```

**Deploy with Docker Compose:**
```yaml
version: '3.8'
services:
  postgres:
    image: postgres:14-alpine
    environment:
      POSTGRES_DB: project_apollo
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    
  backend:
    build: ./backend
    ports:
      - "5001:5001"
    environment:
      NODE_ENV: production
      DATABASE_URL: postgres://postgres:${DB_PASSWORD}@postgres:5432/project_apollo
      JWT_SECRET: ${JWT_SECRET}
      # ... other env vars
    depends_on:
      - postgres
    
  frontend:
    build: ./frontend
    ports:
      - "80:80"
    depends_on:
      - backend

volumes:
  postgres_data:
```

#### Option 3: Traditional VPS (DigitalOcean, AWS EC2, etc.)

1. **Set up server:**
   - Ubuntu 22.04+ recommended
   - Install Node.js 18+, PostgreSQL 14+, nginx

2. **Deploy backend:**
   ```bash
   cd /var/www/apollo-backend
   git clone <repo-url> .
   cd backend
   npm install
   npm run build
   # Use PM2 for process management
   npm install -g pm2
   pm2 start dist/index.js --name apollo-backend
   pm2 startup
   pm2 save
   ```

3. **Configure nginx reverse proxy:**
   ```nginx
   server {
       listen 80;
       server_name api.yourdomain.com;
       
       location / {
           proxy_pass http://localhost:5001;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

4. **Deploy frontend:**
   ```bash
   cd /var/www/apollo-frontend
   git clone <repo-url> .
   cd frontend
   npm install
   npm run build
   # Serve with nginx
   ```

5. **Configure nginx for frontend:**
   ```nginx
   server {
       listen 80;
       server_name yourdomain.com;
       root /var/www/apollo-frontend/frontend/dist;
       
       location / {
           try_files $uri $uri/ /index.html;
       }
   }
   ```

6. **Enable SSL with Let's Encrypt:**
   ```bash
   sudo apt install certbot python3-certbot-nginx
   sudo certbot --nginx -d yourdomain.com -d api.yourdomain.com
   ```

### Post-Deployment

**Health Checks:**
- Backend: `https://your-backend/health`
- Test authentication, course creation, payments, file uploads
- Verify Stripe webhooks are receiving events (check Stripe Dashboard)

**Monitoring (Recommended):**
- Set up error tracking (Sentry, Rollbar)
- Monitor database performance
- Set up uptime monitoring (UptimeRobot, Pingdom)
- Configure backup strategy for PostgreSQL

**Cloudinary Setup:**
- Production Cloudinary account with appropriate upload limits
- Configure upload presets if needed
- Set up asset transformations

### Environment Variables (Production)

Ensure ALL environment variables from `.env.example` files are set in production:
- Use secrets management (Railway Secrets, Render Environment Groups, AWS Secrets Manager, etc.)
- Never expose secrets in frontend builds
- Rotate secrets periodically (JWT_SECRET, database passwords)

### Scaling Considerations

**When to scale:**
- Database: Add read replicas for >1000 concurrent users
- Backend: Horizontal scaling with load balancer for >500 req/s
- File uploads: Consider CDN for Cloudinary assets
- Caching: Add Redis for session management at scale

**Cost Optimization:**
- Start with smallest instances
- Monitor actual usage before scaling
- Use serverless options for predictable spiky traffic
- Optimize database queries and indexes

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
- [x] Balance tracking
- [x] Transaction history
- [x] Webhook handling
- [x] Admin financial dashboard

### Phase 4: Communication & Polish
- [x] Announcements
- [x] Responsive design
- [x] Loading states and error handling
- [x] Deployment to production

## Contributing

1. Create a feature branch: `git checkout -b feature/your-feature`
2. Make your changes
3. Test thoroughly
4. Commit: `git commit -m "feat: add your feature"`
5. Push: `git push origin feature/your-feature`
6. Create a Pull Request

## License
MIT
