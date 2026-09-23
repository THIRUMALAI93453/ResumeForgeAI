# ResumeForge AI API

The API now includes a deterministic ATS baseline that works without an external AI key.

## Endpoints

- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `GET /api/v1/auth/me`
- `POST /api/v1/resumes/upload`
- `POST /api/v1/analysis/analyze`
- `GET /api/v1/health`

The analysis endpoint requires a bearer token and accepts `resume_text` and `job_description`. Gemini integration can be enabled later by adding `GEMINI_API_KEY` to `backend/.env`; the key must never be committed to GitHub.
