from pydantic_settings import BaseSettings, SettingsConfigDict
import os


class Settings(BaseSettings):
    REDIS_URL: str = "redis://redis:6379/0"
    CELERY_BROKER_URL: str = "redis://redis:6379/0"
    CELERY_RESULT_BACKEND: str = "redis://redis:6379/0"
    UPLOAD_DIR: str = "/data/uploads"
    RESULT_DIR: str = "/data/results"
    MAX_FILE_SIZE: int = 100 * 1024 * 1024

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()

os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
os.makedirs(settings.RESULT_DIR, exist_ok=True)
