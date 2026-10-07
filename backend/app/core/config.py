import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "Plataforma de Inteligencia Académica"
    VERSION: str = "1.0.0"
    ENGINE_VERSION: str = "spacy_es_v3.8"
    
    # Seguridad y Autenticación
    API_SECRET_KEY: str = os.getenv("API_SECRET_KEY", "hackathon_secret_key_2026_dev")
    
    # Base de Datos
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./academic_intelligence.db")
    
    # Ingesta de Archivos
    MAX_FILE_SIZE_MB: int = 10
    MAX_ROWS: int = 1000
    ALLOWED_EXTENSIONS: set = {".csv", ".xlsx"}
    ALLOWED_MIME_TYPES: set = {
        "text/csv",
        "text/plain",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    }

    # NLP & Scoring Parameters
    DEFAULT_CONFIDENCE_THRESHOLD: float = 0.70  # Calibrado dinámicamente en dev_set
    DEFAULT_BAYES_PRIOR: float = 50.0            # Baseline global si no hay prior de lote
    DEFAULT_REGULARIZATION_M: float = 5.0        # Sensibilidad m
    MIN_PAIRS_PER_ASPECT: int = 3                # n_min por aspecto
    MIN_PAIRS_TOTAL_OFFICIAL: int = 10           # n_total mínimo para ranking oficial

    class Config:
        case_sensitive = True

settings = Settings()
