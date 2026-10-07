import json
from datetime import datetime
from fastapi import APIRouter, Depends, Header, HTTPException, status
from sqlalchemy.orm import Session
from app.core.config import settings
from app.core.database import get_db
from app.db.models import AspectClassification, HumanReview, Comment, Teacher
from app.db.schemas import HumanReviewRequest, HumanReviewResponse, CommentDetailSchema, AspectClassificationSchema

router = APIRouter()

def verify_api_key(x_api_key: str = Header(None)):
    if not x_api_key or x_api_key != settings.API_SECRET_KEY:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Autenticación fallida: Encabezado 'X-API-Key' inválido o ausente."
        )

@router.get("/review/pending", summary="Obtener Comentarios Pendientes para Revisión Humana")
def get_pending_reviews(db: Session = Depends(get_db)):
    pending_classifications = db.query(AspectClassification).filter(
        AspectClassification.requires_review == True,
        AspectClassification.status == "AUTOMATIC"
    ).all()

    results = []
    for ac in pending_classifications:
        comm = db.query(Comment).filter(Comment.id == ac.comment_id).first()
        teacher = db.query(Teacher).filter(Teacher.id == comm.teacher_id).first() if comm else None

        results.append({
            "classification_id": ac.id,
            "comment_id": ac.comment_id,
            "teacher_name": teacher.display_name if teacher else "Desconocido",
            "raw_text": comm.raw_text if comm else "",
            "aspect_name": ac.aspect_name,
            "sentiment": ac.sentiment,
            "evidence_span": ac.evidence_span,
            "confidence_score": ac.confidence_score,
            "uncertainty_reason": ac.uncertainty_reason,
            "created_at": ac.created_at
        })

    return results

@router.post("/review/submit", response_model=HumanReviewResponse, summary="Enviar Corrección/Confirmación Humana")
def submit_human_review(
    payload: HumanReviewRequest,
    db: Session = Depends(get_db),
    _: None = Depends(verify_api_key)
):
    classification = db.query(AspectClassification).filter(
        AspectClassification.id == payload.classification_id
    ).first()

    if not classification:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Clasificación no encontrada.")

    original_values = {
        "aspect_name": classification.aspect_name,
        "sentiment": classification.sentiment,
        "status": classification.status,
        "confidence_score": classification.confidence_score,
        "requires_review": classification.requires_review
    }

    if payload.action == "CONFIRM":
        classification.status = "HUMAN_CONFIRMED"
        classification.confidence_score = 1.0
        classification.requires_review = False
        new_values = {**original_values, "status": "HUMAN_CONFIRMED", "confidence_score": 1.0, "requires_review": False}

    elif payload.action == "EDIT":
        if payload.new_aspect:
            classification.aspect_name = payload.new_aspect
        if payload.new_sentiment:
            classification.sentiment = payload.new_sentiment
        classification.status = "HUMAN_EDITED"
        classification.confidence_score = 1.0
        classification.requires_review = False
        new_values = {
            "aspect_name": classification.aspect_name,
            "sentiment": classification.sentiment,
            "status": "HUMAN_EDITED",
            "confidence_score": 1.0,
            "requires_review": False
        }

    elif payload.action == "EXCLUDE":
        classification.status = "EXCLUDED"
        classification.requires_review = False
        new_values = {**original_values, "status": "EXCLUDED", "requires_review": False}

    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Acción inválida. Opciones permitidas: CONFIRM, EDIT, EXCLUDE"
        )

    # Registrar Auditoría Imputable en human_reviews
    review_log = HumanReview(
        classification_id=classification.id,
        reviewer_name=payload.reviewer_name,
        action=payload.action,
        original_values_json=json.dumps(original_values),
        new_values_json=json.dumps(new_values),
        review_reason=payload.review_reason or "Revisión realizada mediante Centro de Revisión Humana"
    )

    db.add(review_log)
    db.commit()

    return HumanReviewResponse(
        success=True,
        review_id=review_log.id,
        classification_id=classification.id,
        action=payload.action,
        reviewer_name=payload.reviewer_name,
        timestamp=review_log.timestamp
    )
