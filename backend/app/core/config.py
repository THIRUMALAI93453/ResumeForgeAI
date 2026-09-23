from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "ResumeForge AI"
    environment: str = "development"
    database_url: str = "postgresql+psycopg://resumeforge:resumeforge@localhost:5432/resumeforge"
    frontend_url: str = "http://localhost:5173"
    max_upload_size_mb: int = 5
    upload_dir: str = "uploads"
    jwt_secret: str = "change-this-development-secret"
    jwt_expire_minutes: int = 60 * 24
    gemini_api_key: str | None = None

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")


settings = Settings()
