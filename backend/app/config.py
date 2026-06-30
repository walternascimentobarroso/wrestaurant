from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_name: str = "Restaurant API"
    database_url: str = "postgresql://postgres:postgres@db:5432/restaurant"
    cors_origins: list[str] = ["http://localhost:3000"]
    admin_password: str = "admin123"
    secret_key: str = "change-me-in-production"
    access_token_expire_minutes: int = 480


settings = Settings()
