from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from app.core.config import settings
from app.core.database import get_db
from app.db.models import Teacher
from app.db.schemas import TeacherScoreResponse, ComparativeResponse
from app.services.scoring_engine import compute_teacher_score, calculate_global_batch_priors

router = APIRouter()

@router.get("/teachers", response_model=List[TeacherScoreResponse], summary="Obtener Todos los Docentes con Score Calculado Dinámicamente")
def get_teachers(
    m: float = Query(settings.DEFAULT_REGULARIZATION_M, description="Parámetro de sensibilidad m"),
    batch_id: Optional[str] = None,
    db: Session = Depends(get_db)
):
    global_priors = calculate_global_batch_priors(db, batch_id)
    teachers = db.query(Teacher).all()

    scores = []
    for t in teachers:
        s = compute_teacher_score(db, t, m=m, global_priors=global_priors)
        scores.append(s)

    # Ordenar por score descendente
    scores.sort(key=lambda x: x.general_score, reverse=True)
    return scores

@router.get("/teachers/{teacher_id}", response_model=TeacherScoreResponse, summary="Obtener Desglose Completo de un Docente")
def get_teacher_by_id(
    teacher_id: str,
    m: float = Query(settings.DEFAULT_REGULARIZATION_M),
    db: Session = Depends(get_db)
):
    teacher = db.query(Teacher).filter(Teacher.id == teacher_id).first()
    if not teacher:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Docente no encontrado.")

    global_priors = calculate_global_batch_priors(db)
    return compute_teacher_score(db, teacher, m=m, global_priors=global_priors)

@router.get("/comparative", response_model=ComparativeResponse, summary="Matriz de Comparación Directa entre Docentes")
def get_teacher_comparative(
    teacher_ids: Optional[List[str]] = Query(None, description="Lista de IDs de docentes a comparar"),
    m: float = Query(settings.DEFAULT_REGULARIZATION_M),
    db: Session = Depends(get_db)
):
    global_priors = calculate_global_batch_priors(db)
    
    if teacher_ids:
        teachers = db.query(Teacher).filter(Teacher.id.in_(teacher_ids)).all()
    else:
        teachers = db.query(Teacher).all()

    scores = [compute_teacher_score(db, t, m=m, global_priors=global_priors) for t in teachers]
    scores.sort(key=lambda x: x.general_score, reverse=True)

    return ComparativeResponse(
        teachers=scores,
        global_batch_priors=global_priors,
        sensitivity_m=m
    )
