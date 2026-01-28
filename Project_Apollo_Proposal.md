% Project Apollo - Project Proposal
% Project Apollo Team
% January 28, 2026

# Project Proposal

Project Apollo is a web-based course marketplace system. Instructors publish structured learning experiences and students discover, purchase, and complete courses on demand. The platform provides a public catalog of approved courses, secure checkout, and a guided learning experience with progress tracking. Courses are managed through role-based dashboards for Admin, Instructor, and Student. Stripe powers payments and enrollment creation, while Cloudinary supports media storage for course assets.

The system uses a simplified, marketplace-first workflow so instructors can publish courses and students can purchase and learn without needing enterprise LMS tools. It is designed to be lightweight, modern, and easy to operate for independent instructors and small training organizations. Users can browse the public catalog, purchase courses, access learning content in a course player, and track lesson completion. Admins govern course approval and platform policies.

The system will remain web-first and responsive for mobile use. It supports secure authentication, role-based access control, and a complete purchase-to-learning lifecycle. The architecture is centered on a React frontend and a Node/Express backend with PostgreSQL as the primary data store. Given that the system is web driven, it utilizes a SaaS architecture model.

## Development Team

- Andy Alonso
- Bryan Cabrera
- Michel Perez
- Angie Quitian Moya
- Richard Reyes

## Technology Stack

Frontend: React 18, Vite, TypeScript, Tailwind CSS
Backend: Node.js, Express, TypeScript
Database: PostgreSQL 14+
Payments: Stripe
File Storage: Cloudinary
Server/OS: Linux-based deployment
