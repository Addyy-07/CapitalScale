# CapitalScale — AI-Powered SME Loan Underwriting Platform

A production-ready **monorepo** for an AI-powered SME (Small & Medium Enterprise) loan underwriting platform. It automates the traditionally manual process of evaluating loan applications using OCR, LLM parameter extraction, RAG-based policy Q&A, and AI credit underwriting — all orchestrated across a three-tier microservices architecture.

---

## 📁 Project Structure

```
CapitalScale/
├── frontend/             # React 18 + Vite + Tailwind CSS + shadcn/ui
├── backend/              # Node.js + Express.js (JWT Auth, Notifications, Business Logic)
├── ai-services-python/   # Python FastAPI (PaddleOCR, RAG, LLM, pgvector)
├── docker-compose.yml    # Full stack orchestration (Redis + Backend + AI + Frontend)
├── render.yaml           # Render.com deployment config
└── package.json          # npm workspaces root
```

---

## 🚀 Quick Start

### Prerequisites
- Node.js ≥ 18
- Python 3.11+
- Docker + Docker Compose
- RabbitMQ (or a CloudAMQP URL — configured via `.env`)
- Redis instance (local or managed)

### 1. Clone & Install
```bash
git clone <repo-url>
cd CapitalScale
npm install   # installs all workspace packages
```

### 2. Configure Environment
```bash
# Backend
cp .env.example backend/.env
# Edit: SUPABASE_URL, JWT_SECRET, JWT_REFRESH_SECRET, JWT_MFA_SECRET,
#       RABBITMQ_URL, REDIS_URL, SMTP_HOST/USER/PASS, CLOUDINARY_*, AI_SERVICE_URL

# AI Services
cp .env.example ai-services-python/.env
# Edit: DATABASE_URL, GEMINI_API_KEY, BACKEND_URL, RERANKER_ENABLED

# Frontend
cp .env.example frontend/.env
# Edit: VITE_API_BASE_URL
```

### 3. Run with Docker
```bash
docker-compose up --build
# Note: RabbitMQ is disabled in docker-compose (uses CloudAMQP externally).
# Ensure RABBITMQ_URL in backend/.env points to your CloudAMQP instance.
```

### 4. Run Locally (Dev)
```bash
# Terminal 1 — Backend (starts Express + RabbitMQ workers + SSE manager)
cd backend && npm run dev

# Terminal 2 — AI Services
cd ai-services-python && uvicorn main:app --reload --port 5001

# Terminal 3 — Frontend
cd frontend && npm run dev
```

---

## 🏗️ Architecture

### Backend (`/backend`)

| Layer | Purpose |
|---|---|
| `controllers/` | Thin HTTP handlers — delegate to services |
| `routes/v1/` | Versioned route definitions (10 route groups) |
| `middleware/` | Auth (JWT + RBAC + `requireInternalSecret`), rate limiting, error handling |
| `services/` | Business logic (auth, loan, OCR, extraction, underwriting, email) |
| `notifications/` | Full event-driven notification system (RabbitMQ + SSE + email templates) |
| `db/queries/` | Supabase/PostgreSQL data access (9 query modules) |
| `config/` | Redis, RabbitMQ, Cloudinary, Zod environment validation |
| `utils/` | ApiError, ApiResponse, asyncHandler, Winston logger |
| `validators/` | Zod request validation schemas |
| `infrastructure/` | AI service HTTP client (internal `x-internal-secret` guarded) |

### AI Services (`/ai-services-python`)

| Layer | Purpose |
|---|---|
| `services/ocr/` | PaddleOCR + pdfplumber document loading and extraction |
| `services/rag/chunking/` | Domain-specific chunking strategies (Finance, Policy, Identity, etc.) |
| `services/rag/retrieval_service.py` | Multi-question batch retrieval with query embedding cache |
| `services/vectordb/` | pgvector storage, cosine similarity search, CrossEncoder reranker |
| `services/extraction/` | LLM-powered financial parameter extraction (30+ fields) |
| `services/underwriting/` | AI risk scoring and policy evaluation engine |
| `services/llm/` | LLM Facade (Gemini primary, OpenAI fallback) + shared rate limiter |
| `services/processing_queue.py` | Sequential, priority-based async job queue |
| `routers/` | FastAPI route handlers (ocr, extraction, underwriting, chat, embed, queue) |

### Frontend (`/frontend`)

| Layer | Purpose |
|---|---|
| `pages/` | 10 route-level page components (SME & Bank Admin dashboards) |
| `components/notifications/` | NotificationBell + NotificationDropdown UI |
| `components/` | OtpVerificationForm, PasswordStrengthMeter, ProtectedRoute |
| `context/` | AuthContext (boot refresh + MFA flow) + NotificationContext (SSE + polling) |
| `api/` | Axios API client with auto-refresh interceptor (8 API modules) |
| `hooks/` | useIdleTimeout, useNotifications, useApi, useRequireAuth |
| `store/` | Zustand auth store (access token in-memory, user in localStorage) |

---

## 🔐 Authentication

CapitalScale implements a **Hybrid Authentication Model** — stateless JWT tokens combined with stateful Redis session validation.

**Flow:**
1. **Credentials submitted** → Argon2 password verification
2. **OTP dispatched** via RabbitMQ → `otp_queue` → `otpWorker` → SMTP email
3. **MFA Temp Token** (JWT, `JWT_MFA_SECRET`, 5m expiry) returned to client
4. **OTP verified** with Redis distributed lock (prevents race-condition brute force)
5. **OTP stored as HMAC-SHA256 hash** — never plaintext in DB
6. **Session created**: UUID JTI → Redis session + Access Token (2h) + Refresh Token (30d HttpOnly cookie)
7. **Token rotation**: Refresh tokens are single-use; old JTI blacklisted on rotation

**Security Hardening:**
- `JWT_SECRET`, `JWT_REFRESH_SECRET`, `JWT_MFA_SECRET` — three distinct secrets with audience claims (`capitalscale:access`, `capitalscale:refresh`, `capitalscale:mfa`) preventing cross-token attacks
- Redis fail-safe: when Redis is down, `isTokenBlacklisted()` returns `true` (deny by default)
- OTP distributed lock: `acquireOtpLock()` via Redis SET NX prevents concurrent verification race conditions
- Idle timeout: `useIdleTimeout` hook (15-minute inactivity auto-logout)

**Roles:** `sme` | `bank_admin` | `super_admin`

---

## 🔔 Notification System

A fully event-driven, multi-channel notification system with end-to-end resiliency.

### Architecture

```
Business Service (e.g. loan.service.js)
        │
        ▼
  publishEvent()  ──────────────────────────────────────────────────────────────┐
  notificationPublisher.js                                                       │
        │  (RabbitMQ topic exchange: capitalscale.notifications)                 │
        ├─── routing key "otp.#"  ──────► otp_queue (priority 10) ─► otpWorker  │
        └─── routing key "loan.#" ──────► notification_queue (priority 5) ─► emailWorker
                                                                               │
                                                                    ┌──────────┘
                                                                    ▼
                                                           inAppNotification.service.js
                                                                    │
                                                    ┌───────────────┴─────────────────┐
                                                    ▼                                 ▼
                                            Persist to DB               publishSSEEvent()
                                           (notifications table)                     │
                                                                         Redis Pub/Sub (sse:user:<id>)
                                                                                     │
                                                                         All active server instances
                                                                                     │
                                                                         Client EventSource (SSE)
```

### Components

| Component | File | Purpose |
|---|---|---|
| **Publisher** | `notifications/publisher/notificationPublisher.js` | Publishes events to RabbitMQ exchange with UUID correlation ID |
| **OTP Worker** | `notifications/workers/otpWorker.js` | Consumes `otp_queue`, renders OTP template, sends SMTP email |
| **Email Worker** | `notifications/workers/emailWorker.js` | Consumes `notification_queue`, handles in-app + email for loan events |
| **DLQ Processor** | `notifications/dlq/dlqProcessor.js` | Monitors dead letter queue, records failed messages to `email_jobs` DB table |
| **SSE Manager** | `notifications/sse/sseManager.js` | Manages `EventSource` connections, Redis Pub/Sub subscription for multi-instance sync |
| **In-App Service** | `notifications/services/inAppNotification.service.js` | Persists notifications to DB + pushes via SSE |
| **Rate Limiter** | `notifications/services/rateLimiter.service.js` | Redis sliding window: `OTP_RATE_RESERVE` slots reserved for OTP, remaining for general emails |
| **Events** | `notifications/events/notificationEvents.js` | Canonical event type constants (e.g., `AUTH_OTP_SEND`, `LOAN_APPROVED`) |
| **Templates** | `notifications/templates/` | 5 HTML email templates: OTP, loanApproved, loanRejected, missingInfo, missingInfoCompleted |

---

## 🤖 RAG Pipeline (Retrieval-Augmented Generation)

The RAG pipeline powers both the loan document chat and the AI underwriting extraction.

**Pipeline stages:**
1. **Document Loading** — `pdfplumber` for native PDFs (extracts tables as Markdown), falls back to `PaddleOCR` for scanned docs (detected by `avg_chars_per_page < 50`)
2. **Domain-Aware Chunking** — `ChunkingStrategyFactory` selects from 7+ strategies by document type:
   - `BankPolicySemanticStrategy`: 0 overlap, exception-gluing, chapter hierarchy parsing
   - `FinancialTableStrategy`: Preserves table rows using pipe/tab/double-space heuristics
   - `IdentityImageStrategy`: Small 250-token target for high-density fact extraction
3. **Embedding** — Google Gemini `text-embedding-004` (768-dim), routed through shared rate limiter
4. **Storage** — PostgreSQL `pgvector` with HNSW index (`m=16`, `ef_construction=64`)
5. **Retrieval** — Batch retrieval for 6 underwriting question categories, with pre-cached query embeddings; contiguous chunks are merged before LLM input
6. **Re-ranking** — `CrossEncoder` (`sentence-transformers`) re-ranks top candidates using `asyncio.to_thread()` to avoid blocking the async event loop
7. **LLM Synthesis** — Gemini 1.5 Pro for extraction/underwriting; GPT-4o-mini as fallback

---

## 🐳 Services & Ports

| Service | Port | Notes |
|---|---|---|
| Frontend | 3000 | Vite dev server |
| Backend API | 5000 | Express.js |
| AI Services | 5001 | Python FastAPI |
| PostgreSQL | 5432 | Supabase-hosted |
| Redis | 6379 | Session, blacklist, Pub/Sub, rate limiting |
| RabbitMQ | 5672 / 15672 | Managed externally via CloudAMQP (`RABBITMQ_URL`) |

---

## 🛠️ Tooling

- **ESLint / Prettier** — Code style enforcement
- **Winston + Morgan** — Structured JSON logging with daily rotation
- **Zod** — Runtime environment & request schema validation (fails fast on startup)
- **Helmet** — HTTP security headers (CSP, HSTS, X-Frame-Options)
- **express-rate-limit** — API rate limiting (global: 100/15min, auth: 10/15min, OTP: 5/5min)
- **Loguru** — Python structured logging with rotation

---

## 📦 Tech Stack

| Component | Technology |
|---|---|
| Frontend | React 18, Vite, Tailwind CSS, shadcn/ui (Radix), Zustand |
| Backend | Node.js, Express.js 4.x |
| Database | PostgreSQL via Supabase (asyncpg on AI side) |
| Vector DB | pgvector (HNSW index, cosine similarity) |
| Message Broker | RabbitMQ via CloudAMQP (`amqplib`) |
| Real-time | Server-Sent Events (SSE) + Redis Pub/Sub |
| Session & Cache | Redis (`ioredis`) |
| OCR | PaddleOCR v4 (images/scanned), pdfplumber (native PDFs) |
| Chunking | Custom domain-specific Strategy Factory |
| LLM | Google Gemini (`gemini-1.5-pro`, `gemini-2.5-flash`, `text-embedding-004`) |
| LLM Fallback | OpenAI `gpt-4o-mini` |
| Re-ranker | CrossEncoder `ms-marco-MiniLM-L-6-v2` (`sentence-transformers`) |
| Auth | Hybrid JWT (3-secret, audience-scoped) + Redis sessions |
| Password Hashing | Argon2id (memory-hard) |
| File Storage | Cloudinary |
| Container | Docker + Docker Compose |
| Deployment | Vercel (Frontend) + Render.com (Backend + AI) |
