from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes.auth import router as auth_router
from app.api.routes.health import router as health_router
from app.api.routes.resumes import router as resumes_router
from app.core.config import settings
from app.core.database import Base, engine
from app.models import user  # noqa: F401 - registers models with SQLAlchemy


app = FastAPI(
    title=settings.app_name,
    description="Resume intelligence and ATS analysis API",
    version="0.2.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health_router, prefix="/api/v1")
app.include_router(auth_router, prefix="/api/v1")
app.include_router(resumes_router, prefix="/api/v1")


@app.on_event("startup")
def create_tables() -> None:
    Base.metadata.create_all(bind=engine)


@app.get("/")
def root() -> dict[str, str]:
    return {"name": settings.app_name, "message": "API is running"}
