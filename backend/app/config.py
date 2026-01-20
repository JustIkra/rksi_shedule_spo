from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # Database
    postgres_host: str = "postgres"
    postgres_port: int = 5432
    postgres_user: str = "app"
    postgres_password: str = "changeme"
    postgres_db: str = "events_portal"

    # JWT
    secret_key: str = "your-secret-key-change-in-production"
    algorithm: str = "HS256"
    access_token_expire_days: int = 30

    # Upload settings
    upload_dir: str = "/app/uploads"
    max_upload_size_mb: int = 100
    thumbnail_size: tuple[int, int] = (400, 400)
    thumbnail_quality: int = 85

    # Initial passwords (for first run only)
    initial_public_password: str = "public123"
    initial_admin_password: str = "admin123"
    admin_url_token: str = "secret-admin-panel"

    @property
    def database_url(self) -> str:
        return f"postgresql+asyncpg://{self.postgres_user}:{self.postgres_password}@{self.postgres_host}:{self.postgres_port}/{self.postgres_db}"

    @property
    def database_url_sync(self) -> str:
        return f"postgresql://{self.postgres_user}:{self.postgres_password}@{self.postgres_host}:{self.postgres_port}/{self.postgres_db}"

    class Config:
        env_file = ".env"
        extra = "ignore"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
