# Mynder Healthcare — Backend API

An enterprise-grade REST and real-time backend platform designed for mental health therapy services, telehealth scheduling, provider credentialing, and secure billing management.

---

## Overview

**Mynder Healthcare** provides the core infrastructure for connecting clients with licensed mental health professionals. The system handles multi-step onboarding pipelines, availability management, automated calendar slot generation, Stripe-backed appointment bookings, real-time messaging with delivery receipts, confidential SOAP clinical documentation, and automated provider payout processing.

Built on Node.js and TypeScript, the platform enforces strict type safety, modular domain boundaries, unified error propagation, and role-based access control.

---

## Architectural Principles

The application implements a strict **6-Layer Modular Domain Architecture**, isolating concerns across every subsystem:

```
src/app/modules/<domain>/
├── <domain>.interface.ts    # Domain interfaces, document typings, payload contracts
├── <domain>.model.ts        # Mongoose schema, compound indexes, hooks, static methods
├── <domain>.validation.ts   # Zod request validation schemas (body, query, params)
├── <domain>.service.ts      # Domain business logic, database queries, integrations
├── <domain>.controller.ts   # Request extraction, catchAsync wrapper, sendResponse
└── <domain>.route.ts        # Express routing, RBAC guards, multipart upload handlers
```

### Key Design Highlights

* **Unified API Response Standard**: Every endpoint returns a predictable contract `{ statusCode, success, message, meta?, data? }`.
* **Centralized Error Handling**: Custom `ApiError` class mapped to HTTP status codes, coupled with automatic handling for Zod validation errors, Mongoose CastErrors, and duplicate key conflicts.
* **QueryBuilder Abstraction**: Reusable query pipeline providing regex full-text search, field filtering, date ranges (`weekly`, `monthly`, `yearly`), multi-field sorting, and pagination with metadata.
* **Dual-Channel Notification System**: Notifications are persistently committed to MongoDB and immediately dispatched through Socket.IO if the target user has an active connection.
* **Resilient Webhook Processing**: Idempotent Stripe webhook handling operating directly on raw request payloads before JSON parsing.

---

## Technology Stack

| Layer | Technology | Purpose |
|---|---|---|
| **Runtime & Language** | Node.js, TypeScript 5.9 | Type-safe server execution with strict compiler options |
| **Web Framework** | Express 5.2 | HTTP routing, custom middleware pipelines |
| **Database & ODM** | MongoDB, Mongoose 9.2 | Document database with relational references, indexes, and schemas |
| **Real-Time Communication** | Socket.IO 4.8 | Low-latency bi-directional messaging, room management, delivery events |
| **Payments & Billing** | Stripe 20.4 | Hosted Checkout sessions, webhooks, fee distribution, automated invoicing |
| **Validation** | Zod 4.3 | Runtime schema validation for requests and payload contracts |
| **Authentication & RBAC** | JWT, bcrypt, Passport Google OAuth 2.0 | Token-based auth, password hashing, federated identity |
| **Task Scheduling** | Node-cron 4.2 | Minute-interval automated appointment reminder service |
| **Logging & Diagnostics** | Winston 3.19, Daily Rotate File, Morgan | Structured JSON logging with daily log rotation |
| **File Storage** | Multer 2.0 | Multipart file handling with folder routing, size limits, and MIME filters |

---

## Core System Modules

The backend is partitioned into 20 domain modules:

```
src/app/modules/
├── appointment/          # Booking initiation, cancellation fees, reschedule, session summary
├── auth/                 # Local credentials, Google OAuth 2.0, OTP verification, password recovery
├── availability/         # Provider weekly working schedules, time blocks, recurring rules
├── blog/                 # Articles, wellness publications, image uploads, public reading
├── client-profile/       # 4-stage client intake (personal, emergency, insurance, assessment)
├── clinical-note/        # Confidential provider SOAP notes (Subjective, Objective, Assessment, Plan)
├── conversation/         # 1-to-1 client-provider message channels, unread tracking
├── faq/                  # Categorized FAQs, administrative content management
├── form-library/         # Standard clinical document templates and consent forms
├── intake-form-field/    # Dynamic, administrator-configurable intake form specifications
├── invoice/              # Billing statements, processing fee accounting, payment receipts
├── message/              # Chat messaging, file attachments, read receipts, delivery ticks
├── notification/         # In-app notification center, read status, badge tracking
├── provider-payout/      # Provider earnings, platform fee calculations, payout request approval
├── provider-profile/     # 4-stage provider onboarding, CV/license uploads, admin approval
├── review/               # Client star ratings and testimonials, aggregate provider score updates
├── session-type/         # Session offerings (duration, pricing, consultation formats)
├── slot/                 # Calendar slot generation from availability rules, booking locks
├── stripe/               # Checkout webhook processing (checkout completed, refunds)
└── user/                 # Core identity, roles (CLIENT, PROVIDER, ADMIN), account states
```

---

## Domain Workflows

### 1. Appointment Booking & Payment Pipeline

```
Client selects Slot
       │
       ▼
POST /api/v1/appointments/checkout-session
       │
       ├─► Calculates Session Fee + Processing Fee + Platform Commission
       ├─► Generates Stripe Checkout Session with metadata (slotId, clientId)
       └─► Returns Stripe checkout URL
       │
Client completes checkout on Stripe
       │
       ▼
POST /api/v1/stripe/webhook (Raw Body)
       │
       ├─► Verifies Stripe cryptographic signature
       ├─► Locks Slot (isBooked = true, bookedBy = clientId)
       ├─► Creates Appointment (scheduledAt converted to UTC via slot timezone)
       ├─► Generates Invoice (paymentStatus = COMPLETED)
       └─► Dispatches real-time notification to Provider via Socket.IO
```

### 2. Real-Time Chat & Message Lifecycle

* **Connection**: Authenticated via JWT bearer token passed in query parameters or handshake auth headers.
* **Active Presence**: User IDs are mapped to socket identifiers in memory to identify online state.
* **Message Dispatch (`message:send`)**:
  * Message content validated and persisted to MongoDB.
  * Message broadcast to the conversation room (`message:new`).
  * If receiver is online: emits `message:delivered` (`✓✓`) to sender.
  * If receiver is offline: emits `message:saved` (`✓`) to sender and triggers a persistent in-app notification.
* **Read Receipts (`message:read`)**: Updates `isRead = true` and updates partner socket.

### 3. Automated Reminder Engine

A Node-cron background service runs every minute (`* * * * *` UTC):
1. Queries appointments with `status = 'upcoming'` scheduled 29 to 31 minutes ahead with `reminderSent = false`.
2. Gathers participant names, session format, meeting details, and localized timezone.
3. Simultaneously emails customized HTML templates to both the client and provider via Nodemailer.
4. Marks `reminderSent = true` in an idempotent update.

---

## Database Architecture

```
                 ┌──────────────────┐
                 │       User       │
                 │  (Client/Provider│
                 │      /Admin)     │
                 └────────┬─────────┘
                          │ 1:1
            ┌─────────────┴─────────────┐
            ▼                           ▼
  ┌───────────────────┐       ┌───────────────────┐
  │   ClientProfile   │       │  ProviderProfile  │
  │ (4-step intake)   │       │ (Credentials & CV)│
  └─────────┬─────────┘       └─────────┬─────────┘
            │                           │
            │                           ▼
            │                 ┌───────────────────┐
            │                 │   Availability    │
            │                 └─────────┬─────────┘
            │                           ▼
            │                 ┌───────────────────┐
            ├────────────────►│       Slot        │
            │                 └─────────┬─────────┘
            ▼                           ▼
  ┌───────────────────────────────────────────────┐
  │                  Appointment                  │
  └─────────────┬───────────────────┬─────────────┘
                ▼                   ▼
      ┌───────────────────┐ ┌───────────────┐
      │      Invoice      │ │ ClinicalNote  │
      └───────────────────┘ └───────────────┘
```

---

## Getting Started

### Prerequisites

* **Node.js**: v20.x or v22.x LTS recommended
* **npm**: v10.x or higher
* **MongoDB**: v6.x or higher (Local instance or MongoDB Atlas)
* **Stripe Account**: For payment integration and webhook testing

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/lokmansarkar99/mynder-backend.git
   cd mynder-backend
   ```

2. **Install project dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   Copy the example environment template and configure your local credentials:
   ```bash
   cp .env.example .env
   ```

4. **Verify Type Safety**:
   ```bash
   npx tsc --noEmit
   ```

5. **Start Development Server**:
   ```bash
   npm run dev
   ```

   The server will start on `http://localhost:5000` with Socket.IO initialized on the same port.

---

## Environment Variables

| Variable | Description | Example |
|---|---|---|
| `PORT` | HTTP server listening port | `5000` |
| `NODE_ENV` | Application environment mode | `development` / `production` |
| `CLIENT_URL` | Frontend client origin for CORS | `http://localhost:3000` |
| `DATABASE_URL` | MongoDB connection URI | `mongodb://127.0.0.1:27017/mynder` |
| `BCRYPT_SALT_ROUNDS` | Password hashing salt rounds | `12` |
| `JWT_SECRET` | Secret key for signing access tokens | `your-access-secret` |
| `JWT_EXPIRE_IN` | Access token lifespan | `15m` |
| `JWT_REFRESH_SECRET` | Secret key for refresh tokens | `your-refresh-secret` |
| `JWT_REFRESH_EXPIRE_IN`| Refresh token lifespan | `7d` |
| `ADMIN_EMAIL` | Superadmin email for initial auto-seed | `admin@example.com` |
| `ADMIN_PASSWORD` | Superadmin password for initial auto-seed | `AdminSecret123!` |
| `STRIPE_SECRET_KEY` | Stripe secret API key | `sk_test_...` |
| `STRIPE_WEBHOOK_SECRET`| Stripe webhook signing secret | `whsec_...` |
| `EMAIL_HOST` | SMTP server host | `smtp.gmail.com` |
| `EMAIL_PORT` | SMTP port | `465` |
| `EMAIL_USER` | SMTP username | `noreply@example.com` |
| `EMAIL_PASS` | SMTP application password | `app-specific-password` |
| `PROCESSING_FEE` | Fixed processing fee added to bookings | `0` |
| `PLATFORM_FEE_PERCENT` | Platform percentage deducted from provider fee| `10` |

---

## API Endpoints Reference

All routes are mounted under `/api/v1`.

### Authentication (`/auth`)
* `POST /auth/register` — Register a client or provider account
* `POST /auth/login` — Authenticate and receive access + refresh tokens
* `POST /auth/refresh-token` — Renew expired access token
* `POST /auth/change-password` — Change password (Authenticated)
* `POST /auth/forgot-password` — Request password reset OTP
* `POST /auth/reset-password` — Reset password using OTP
* `POST /auth/verify-otp` — Verify email OTP
* `GET  /auth/google` — Google OAuth 2.0 authentication entrypoint
* `GET  /auth/google/callback` — Google OAuth 2.0 redirection handler

### Users & Profiles (`/user`, `/client-profile`, `/provider`)
* `GET   /user/my-profile` — Fetch current user profile
* `PATCH /user/my-profile` — Update user profile & avatar
* `GET   /user/providers` — Browse verified providers
* `GET   /user/stats` — Admin dashboard summary metrics
* `POST  /client-profile/intake/step` — Submit Client intake steps (1 through 4)
* `GET   /client-profile/me` — Fetch Client profile & medical history
* `POST  /provider/intake/step` — Submit Provider intake steps (1 through 4)
* `GET   /provider/all` — Public directory of approved healthcare providers
* `PATCH /provider/:id/status` — Admin approval or rejection of provider applications

### Scheduling & Appointments (`/availability`, `/slot`, `/appointments`)
* `POST  /availability` — Save recurring weekly schedule blocks
* `POST  /slot/generate` — Generate bookable slots from availability
* `GET   /slot` — Filterable open slot calendar
* `POST  /appointments/checkout-session` — Initialize Stripe booking checkout
* `GET   /appointments/my` — Fetch user appointments with status filters
* `PATCH /appointments/:id/cancel` — Cancel appointment with policy enforcement
* `PATCH /appointments/:id/reschedule` — Reschedule session to new slot
* `PATCH /appointments/:id/summary` — Submit SOAP session summary notes

### Communications & Billing (`/conversation`, `/message`, `/notification`, `/payouts`, `/invoice`)
* `POST  /conversation` — Open or retrieve direct conversation
* `POST  /message` — Send message with optional file attachment
* `GET   /message/:conversationId` — Retrieve paginated chat history
* `GET   /notification/my` — Retrieve in-app notifications
* `POST  /payouts/request` — Provider withdrawal request
* `GET   /payouts/balance` — Provider balance calculation
* `GET   /invoice/my` — Retrieve billing statements and receipts

---

## NPM Scripts

```bash
# Start development server with live reload
npm run dev

# Compile TypeScript to production JavaScript (dist/)
npm run build

# Start production server
npm start

# Format code with Prettier
npm run format
```

---

## Security & Best Practices

* **Rate Limiting**: Configured with `express-rate-limit` to prevent brute-force attacks.
* **Helmet**: Configured to secure HTTP response headers against common vulnerabilities.
* **CORS Protection**: Restricted to authorized web clients with credential support.
* **Strict Role Guards**: Every endpoint is guarded using the `checkAuth` middleware enforcing RBAC (`ADMIN`, `PROVIDER`, `CLIENT`).
* **Safe Upload Handling**: Explicit file extension whitelist, MIME inspection, and file size limits per upload category.

---

## Author

Developed by **Lokman Sarkar**.  
Licensed under the [ISC License](LICENSE).
