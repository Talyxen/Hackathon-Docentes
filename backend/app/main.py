from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.database import Base, engine
from app.api.endpoints import health, upload, comments, review, teachers, recommendations, report, stats

# Crear tablas en SQLite al iniciar y sembrar datos iniciales si está vacía
Base.metadata.create_all(bind=engine)

from app.core.database import SessionLocal
from app.services.seed import seed_demo_data_if_empty
try:
    with SessionLocal() as db:
        seed_demo_data_if_empty(db)
except Exception as e:
    print(f"Startup seed notice: {e}")


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Plataforma de Inteligencia Académica para Análisis Multi-Aspecto de Comentarios sobre Docentes (Reto S-1)",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Configurar CORS permisivo para desarrollo y frontend React
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Incluir Routers
app.include_router(health.router, tags=["Healthcheck"])
app.include_router(upload.router, prefix="/api", tags=["Ingesta y Validación de Archivos"])
app.include_router(comments.router, prefix="/api", tags=["Explorador de Comentarios"])
app.include_router(review.router, prefix="/api", tags=["Centro de Revisión Humana"])
app.include_router(teachers.router, prefix="/api", tags=["Docentes y Scoring"])
app.include_router(recommendations.router, prefix="/api", tags=["Recomendaciones Automáticas"])
app.include_router(report.router, prefix="/api", tags=["Reporte Ejecutivo Imprimible"])
app.include_router(stats.router, prefix="/api", tags=["Estadísticas del Dashboard"])

@app.get("/", summary="Endpoint raíz de bienvenida")
def root():
    return {
        "message": "Bienvenido a la API de la Plataforma de Inteligencia Académica",
        "docs": "/docs",
        "health": "/health"
    }
