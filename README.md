# StayFlow

A full-stack reservation and management platform for guesthouses, built as my bachelor's thesis at Universitatea Politehnica Timișoara. It started from a real problem — my family's guesthouse in Maramureș was still tracking bookings on paper — and grew into a production system with a public booking site, an admin dashboard, and four AI-powered modules.

![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-Express-339933?logo=node.js&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?logo=postgresql&logoColor=white)
![AWS](https://img.shields.io/badge/AWS-Amplify%20%7C%20EB%20%7C%20RDS%20%7C%20S3-FF9900?logo=amazonaws&logoColor=white)

---

## Overview

StayFlow covers the full lifecycle of a small hospitality business: guests browse rooms, check live availability, book with add-ons, and pay online; administrators manage rooms, pricing, reservations, reviews, and guest check-in from a single dashboard. On top of the core CRUD system, it integrates AI for pricing, guest support, review analysis, and document processing.

## Key Features

### Guest side

- **Room browsing & live availability** — an interactive calendar (react-day-picker) showing which rooms are free for the selected dates.
- **Booking flow with add-ons** — meals, extra beds, and other extras, with the total recomputed live as options and nights change.
- **Online payments** — secure checkout through Stripe, with webhook-driven booking confirmation.
- **Guest chatbot** — an AI assistant that answers questions about the property and the booking process.
- **Bilingual experience** — the site and all transactional emails are available in two languages.

### Admin side

- **Dashboard with live stats** — occupancy, revenue, and demand indicators pulled from real data (no hardcoded values).
- **Room & pricing management** — activate/deactivate rooms and adjust rates.
- **Smart Pricing** — a dynamic-pricing engine that applies a demand-based multiplier on top of each room's base price.
- **Reservation management** — view, confirm, and manage every booking.
- **Review moderation** — publish, hide, or remove guest reviews.
- **AI check-in** — scan a guest's ID document and auto-fill the check-in form.

## AI Modules

| Module               | Provider      | What it does                                                                                                                    |
| -------------------- | ------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Guest chatbot        | Azure OpenAI  | Answers guest questions about the property and bookings                                                                         |
| Smart Pricing        | Azure OpenAI  | Recommends demand-based price adjustments across rooms                                                                          |
| Sentiment analysis   | Azure OpenAI  | Summarizes review sentiment and highlights strengths / areas to improve                                                         |
| ID document scanning | Google Gemini | Extracts identity fields from a scanned document into a universal check-in form, with automatic country/nationality translation |

## Tech Stack

**Frontend:** React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui
**Backend:** Node.js, Express, PostgreSQL
**AI:** Azure OpenAI, Google Gemini
**Payments:** Stripe
**Auth:** Google OAuth
**Cloud (AWS):** Amplify (frontend hosting), Elastic Beanstalk (backend), RDS (PostgreSQL), S3 (object storage)
**Quality & CI/CD:** SonarCloud

## Architecture

The system is a classic three-tier setup with external services on the side:

- The **React frontend** (hosted on AWS Amplify) talks to the backend over a REST API using HTTPS.
- The **Node.js / Express backend** (on AWS Elastic Beanstalk) holds the business logic, handles authentication, and orchestrates the AI modules.
- **PostgreSQL** (AWS RDS) stores reservations, rooms, users, and reviews; **Amazon S3** stores objects such as room photos and generated PDFs.
- The backend integrates with **Azure OpenAI** and **Google Gemini** for the AI features, **Stripe** for payments, and **Google OAuth** for authentication.

## Getting Started

> **Note:** the commands and environment variables below are typical defaults. Check them against the actual scripts in your `package.json` and adjust the variable names to match your code.

### Prerequisites

- Node.js 18+ and npm
- A PostgreSQL database (local or RDS)
- API keys for Azure OpenAI, Google Gemini, and Stripe
- Google OAuth credentials

### 1. Clone the repository

```bash
git clone https://github.com/Valentin222259/Licenta.git
cd Licenta
```

### 2. Backend

```bash
cd backend
npm install
# create a backend/.env file with the values below
npm run dev            # or: npm start
```

Example backend `.env`:

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/stayflow

# Auth
JWT_SECRET=your_jwt_secret
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# Azure OpenAI
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com/
AZURE_OPENAI_API_KEY=your_azure_openai_key

# Google Gemini
GEMINI_API_KEY=your_gemini_key

# Stripe
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret

# AWS S3
AWS_ACCESS_KEY_ID=your_aws_key
AWS_SECRET_ACCESS_KEY=your_aws_secret
AWS_REGION=eu-central-1
S3_BUCKET_NAME=your_bucket
```

### 3. Frontend (repository root)

The frontend lives at the **root** of the repository; the backend is the `backend/` subfolder.

```bash
# from the repository root (the Licenta folder)
npm install
# create a .env file in the root with the values below
npm run dev
```

Example frontend `.env`:

```env
VITE_API_URL=http://localhost:3000
VITE_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
VITE_GOOGLE_CLIENT_ID=your_google_client_id
```

The frontend runs on Vite's dev server (default `http://localhost:5173`) and the backend on `http://localhost:3000` (adjust to your setup).

## Deployment

The production build was deployed on AWS:

- **Frontend** → AWS Amplify
- **Backend** → AWS Elastic Beanstalk (load-balanced, HTTPS via ACM)
- **Database** → AWS RDS (PostgreSQL)
- **Storage** → Amazon S3

> **Note:** the production environment has been decommissioned to avoid ongoing cloud costs. The application can be redeployed from this repository at any time.

## Screenshots

You can add a few screenshots here (booking flow, Smart Pricing, AI ID scan, analytics dashboard):

```markdown
![Booking](docs/booking.png)
![Smart Pricing](docs/smart-pricing.png)
![AI ID Scan](docs/id-scan.png)
![Analytics](docs/analytics.png)
```

## About

Built as a bachelor's thesis in Systems Engineering at Universitatea Politehnica Timișoara (2026), for a real family business — Maramureș Belvedere.

---

_This repository is part of an academic project. Feel free to open an issue if you have questions about the build._
