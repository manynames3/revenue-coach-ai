# RevenueCoach AI 🧠📈

**RevenueCoach AI** is a production-ready SaaS platform designed for sales managers and team leads in high-volume industries (Real Estate, Home Services, Contractors) to automate the qualitative auditing of sales calls.

By transforming raw audio or transcripts into quantitative performance scorecards, the platform helps teams identify "revenue leakage" and implement data-driven coaching at scale.

---

## 🏗️ Architectural Overview

This project demonstrates a modern, event-driven approach to AI application development, focusing on security, scalability, and data integrity.

### **The "Direct-to-S3" Audio Pipeline**
To handle large audio files (MP3/M4A/WAV) without bottlenecking the FastAPI backend, I implemented a **Presigned POST** workflow:
1.  **Request:** Frontend requests a time-limited upload URL from the API.
2.  **Upload:** Frontend uploads the file directly to a private **Amazon S3** bucket using standard browser `fetch`.
3.  **Process:** The API triggers an **Amazon Transcribe** job using `boto3`.
4.  **Async Polling:** The frontend utilizes a non-blocking polling mechanism to track transcription status, ensuring a smooth UX for long-running jobs.

### **Why PostgreSQL JSONB?**
While many MVP projects store AI results as raw text, RevenueCoach AI uses **PostgreSQL JSONB** for the `call_analyses` table. 
*   **The Reasoning:** Sales coaching requires multi-dimensional querying. `JSONB` allows the platform to perform complex filtering (e.g., "Show me all reps with discovery scores < 40%") using native GIN indexes, providing the performance of a relational database with the flexibility of a document store.

### **AI Core: GLM 5.1 & Structured Outputs**
The system uses **GLM 5.1** (via Z.AI) to perform deep semantic analysis. 
*   **Deterministic Reasoning:** Prompts are engineered to force strict JSON schemas, allowing the backend to map AI findings directly into typed Python objects (Pydantic) and the database schema.
*   **Coaching Logic:** The AI doesn't just summarize; it identifies specific **Objections**, **Buying Signals**, and generates actionable **Coaching Drills**.

---

## 🚀 Tech Stack

-   **Backend:** FastAPI (Python), SQLAlchemy 2.0, PostgreSQL (JSONB)
-   **Frontend:** Next.js 14, TypeScript, Tailwind CSS
-   **Cloud/Infra:** AWS (S3, Transcribe), Docker Compose
-   **AI Infrastructure:** Z.AI (GLM 5.1), OpenAI-compatible SDK

---

## 📋 Hiring Manager: Key Takeaways

If you are evaluating this repo, here is the "Senior-level" thinking I applied to this project:

1.  **Security & Least Privilege:** The backend never touches raw audio bytes. Direct-to-S3 uploads reduce attack surface and server load.
2.  **Product-Market Fit:** Designed specifically for the "Local Service" niche where sales training is often the biggest bottleneck to growth.
3.  **"Day 2" Readiness:** The schema is optimized for analytics, not just display. It’s built to handle a team of 100 reps as easily as a team of 1.
4.  **Resilient AI Design:** Implemented a robust "Mock AI" fallback system for local development and integration testing, ensuring the UI remains functional without external API dependencies.

---

## 🛠️ Local Setup

### 1. Environment
Copy `.env.example` and fill in your AWS credentials (required for audio features):
```bash
cp .env.example .env
```

### 2. Start with Docker
```bash
docker compose up --build
```

### 3. Access
- **App:** `http://localhost:3000`
- **API Docs:** `http://localhost:8000/docs`

---

## 🗺️ Roadmap
- [x] **Phase 1:** Transcript-only analysis (MVP)
- [x] **Phase 2:** Product UX polish & Executive Dashboard
- [x] **Phase 3:** Full Audio Pipeline (AWS S3 + Transcribe)
- [ ] **Phase 4:** Production Deployment (Terraform + ECS Fargate)
- [ ] **Phase 5:** Rep-specific analytics & historical trend lines
