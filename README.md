# ResumeForge AI

**Beat the ATS. Impress Recruiters. Get More Interviews.**

ResumeForge AI is an AI-powered resume intelligence platform for students, freshers, and early-career professionals.

## Technology stack

- **Backend:** Python 3.12, FastAPI, SQLAlchemy, PostgreSQL
- **Frontend:** React, TypeScript, Tailwind CSS, shadcn/ui (planned)
- **AI:** Gemini 2.5 Flash (planned)
- **Storage:** Local development storage, AWS S3 later
- **Deployment:** Docker, AWS EC2 later

## Current milestone

The initial Python backend includes:

- FastAPI application
- Health-check endpoint
- Environment-based configuration
- PostgreSQL-ready configuration
- Docker Compose development database
- CORS configuration for the React frontend

## Run locally

### Prerequisites

- Python 3.12+
- Docker Desktop (recommended)

### Setup

```bash
cd backend
python -m venv .venv

# macOS/Linux
source .venv/bin/activate

# Windows PowerShell
.venv\\Scripts\\Activate.ps1

pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload
```

API documentation is available at http://localhost:8000/docs.

### Start PostgreSQL with Docker

```bash
docker compose up -d postgres
```

## API

- `GET /api/v1/health` — application health check
- `GET /docs` — interactive Swagger documentation

## Planned MVP

1. Email/password authentication
2. PDF, DOCX, and TXT resume upload
3. Resume text extraction
4. Job description input
5. Explainable ATS scoring
6. Keyword gap analysis
7. Missing skills detection
8. Gemini-powered recommendations
9. Recruiter simulation
10. Analysis history
11. PDF export
