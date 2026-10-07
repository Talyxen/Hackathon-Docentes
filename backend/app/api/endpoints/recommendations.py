from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.db.models import Teacher
from app.db.schemas import TeacherRecommendationResponse
from app.services.scoring_engine import compute_teacher_score, calculate_global_batch_priors
from app.services.recommendation_engine import generate_teacher_recommendations

router = APIRouter()

@router.get("/recommendations/{teacher_id}", response_model=TeacherRecommendationResponse, summary="Obtener Recomendaciones Automáticas por Aspecto")
def get_recommendations_by_teacher(teacher_id: str, db: Session = Depends(get_db)):
    teacher = db.query(Teacher).filter(Teacher.id == teacher_id).first()
    if not teacher:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Docente no encontrado.")

    global_priors = calculate_global_batch_priors(db)
    score_response = compute_teacher_score(db, teacher, global_priors=global_priors)
    return generate_teacher_recommendations(score_response)
