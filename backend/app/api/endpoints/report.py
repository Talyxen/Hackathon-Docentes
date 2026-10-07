from datetime import datetime
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.db.models import Teacher, BatchUpload, Comment, AspectClassification
from app.db.schemas import ExecutiveReportResponse
from app.services.scoring_engine import compute_teacher_score, calculate_global_batch_priors, ALL_ASPECTS

router = APIRouter()

@router.get("/report", response_model=ExecutiveReportResponse, summary="Generar Informe Ejecutivo Global (Listo para Impresión)")
def get_executive_report(db: Session = Depends(get_db)):
    batch_count = db.query(BatchUpload).count()
    teacher_count = db.query(Teacher).count()
    comment_count = db.query(Comment).count()

    valid_pairs_count = db.query(AspectClassification).filter(
        AspectClassification.status != "EXCLUDED",
        AspectClassification.requires_review == False
    ).count()

    pending_count = db.query(AspectClassification).filter(
        AspectClassification.requires_review == True,
        AspectClassification.status == "AUTOMATIC"
    ).count()

    global_priors = calculate_global_batch_priors(db)
    teachers = db.query(Teacher).all()

    all_scores = [compute_teacher_score(db, t, global_priors=global_priors) for t in teachers]

    official_ranking = [s for s in all_scores if s.ranking_category == "OFICIAL_PRINCIPAL"]
    official_ranking.sort(key=lambda x: x.general_score, reverse=True)

    provisional_ranking = [s for s in all_scores if s.ranking_category != "OFICIAL_PRINCIPAL"]
    provisional_ranking.sort(key=lambda x: x.general_score, reverse=True)

    avg_score = round(sum(s.general_score for s in official_ranking) / len(official_ranking), 2) if official_ranking else 0.0

    return ExecutiveReportResponse(
        generated_at=datetime.utcnow(),
        total_batch_uploads=batch_count,
        total_teachers=teacher_count,
        total_processed_comments=comment_count,
        total_valid_aspect_pairs=valid_pairs_count,
        total_pending_reviews=pending_count,
        global_average_score=avg_score,
        official_ranking=official_ranking,
        provisional_ranking=provisional_ranking,
        global_aspect_summary=global_priors
    )
