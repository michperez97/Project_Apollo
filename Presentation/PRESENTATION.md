---
marp: true
theme: default
paginate: true
backgroundColor: #fff
style: |
  section {
    font-size: 28px;
  }
  h1 {
    font-size: 48px;
  }
  h2 {
    font-size: 36px;
  }
---

# Project Apollo

### Online Course Marketplace Platform

January 2026

---

# What is Apollo?

An **online course marketplace** that connects instructors and learners

- **Instructors** publish and sell courses
- **Students** discover, purchase, and track progress
- **Admins** review content and ensure quality

---

# The Problem

**For Instructors:**
- Reaching an audience is expensive
- Building a platform takes time and capital

**For Students:**
- Quality is hard to judge before purchase
- Progress is fragmented across tools

---

# Our Solution

- Launch-ready marketplace for instructors
- Built-in Stripe checkout and payouts
- Progress tracking and completion insights
- Admin moderation and quality controls

---

# How It Works

**Create** -> **Review** -> **Learn**

**Instructor** creates course -> **Admin** approves -> **Student** enrolls and learns

---

# Key Features

- Public catalog with search and filters
- Secure payments via Stripe
- Course progress and completion tracking
- Role-based dashboards for students, instructors, and admins
- Content review and moderation tools

---

# User Roles

| Role | Can Do |
|------|--------|
| **Student** | Browse, purchase, learn, track progress |
| **Instructor** | Create courses, manage content, view sales |
| **Admin** | Approve courses, manage users, ensure quality |

---

# Demo: Landing Page

![placeholder](01-landing.png)

---

# Demo: Course Detail

![placeholder](02-course-detail.png)

---

# Demo: Login

![placeholder](03-login.png)

---

# Demo: Register

![placeholder](04-register.png)

---

# Demo: Student Dashboard

![placeholder](05-student-dashboard.png)

---

# Demo: Course Curriculum

![placeholder](06-course-curriculum.png)

---

# Demo: Instructor Overview

![placeholder](07-instructor-overview.png)

---

# Demo: Instructor – Create Course

![placeholder](08-instructor-create-course.png)

---

# Demo: Admin Overview

![placeholder](09-admin-overview.png)

---

# Demo: Course Player

![placeholder](10-course-player.png)

---

# Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React + TypeScript |
| Backend | Node.js + Express |
| Database | PostgreSQL |
| Payments | Stripe |

---

# Architecture

```
  Frontend  ◄──►  Backend
                     │
         ┌───────────┼───────────┐
         ▼           ▼           ▼
     PostgreSQL   Stripe    Cloudinary
```

---

# Progress

| Feature | Status |
|---------|--------|
| Authentication | Complete |
| Course Management | Complete |
| Payments | Complete |
| Learning Experience | Complete |
| Admin Tools | Complete |

---

# What's Next

**Short Term:**
- Video uploads
- Quizzes and assessments

**Long Term:**
- Certificates
- Mobile app

---

# Summary

**Apollo** enables:

- Instructors to monetize knowledge with a ready marketplace
- Students to learn effectively with guided progress
- Admins to maintain quality and trust at scale

---

# Questions?

## Thank You!

**Project Apollo**

---

# Test Accounts

| Role | Email |
|------|-------|
| Admin | admin@apollo.local |
| Instructor | instructor@apollo.local |
| Student | student@apollo.local |

**Password:** `Password123!`
