from pydantic import BaseSettings

class Settings(BaseSettings):
    ENV: str = "development"
    PORT: int = 8000
    ACS_CONNECTION_STRING: str | None = None

    class Config:
        env_file = ".env"

settings = Settings()