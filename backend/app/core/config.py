from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    HF_TOKEN: str = ""
    WHISPER_MODEL: str = "large-v3-turbo"
    DEVICE: str = "cuda"
    COMPUTE_TYPE: str = "float16"

    BASE_DIR: Path = Path(__file__).resolve().parent.parent.parent
    UPLOAD_DIR: Path = BASE_DIR / "storage" / "uploads"
    OUTPUT_DIR: Path = BASE_DIR / "storage" / "outputs"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()
settings.UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
settings.OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
