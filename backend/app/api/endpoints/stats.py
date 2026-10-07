from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, case
from app.core.database import get_db
from app.db.models import Teacher, Comment, AspectClassification, BatchUpload

router = APIRouter()

@router.get("/stats", summary="Estadísticas Globales para Dashboard")
def get_global_stats(db: Session = Depends(get_db)):
    teachers_count = db.query(Teacher).count()
    
    # Batch stats
    batches = db.query(
        func.sum(BatchUpload.total_rows),
        func.sum(BatchUpload.valid_rows),
        func.sum(BatchUpload.rejected_rows_count)
    ).first()
    
    total_processed = batches[0] or 0
    total_valid = batches[1] or 0
    total_rejected = batches[2] or 0
    
    # Aspects stats
    avg_conf = db.query(func.avg(AspectClassification.confidence_score)).scalar() or 0.0
    cases_to_review = db.query(AspectClassification).filter(
        AspectClassification.requires_review == True,
        AspectClassification.status != 'REVIEWED'
    ).count()
    
    sentiments = db.query(AspectClassification.sentiment, func.count(AspectClassification.id)).group_by(AspectClassification.sentiment).all()
    sentiment_dist = {s[0]: s[1] for s in sentiments}
    
    aspects_perf = db.query(
        AspectClassification.aspect_name,
        func.avg(
            case(
                (AspectClassification.sentiment == "POSITIVE", 100),
                (AspectClassification.sentiment == "NEUTRAL", 50),
                (AspectClassification.sentiment == "NEGATIVE", 0),
                else_=50
            )
        ).label('score')
    ).group_by(AspectClassification.aspect_name).all()
    
    aspects_perf.sort(key=lambda x: x.score, reverse=True)
    
    strengths = aspects_perf[:3] if aspects_perf else []
    critical = aspects_perf[-3:] if len(aspects_perf) > 3 else []
    
    return {
        "analyzed_teachers": teachers_count,
        "processed_comments": total_processed,
        "valid_comments": total_valid,
        "rejected_comments": total_rejected,
        "average_confidence": round(avg_conf, 4),
        "cases_to_review": cases_to_review,
        "sentiment_distribution": sentiment_dist,
        "performance_by_aspect": [{"aspect": a[0], "score": round(a[1], 2)} for a in aspects_perf],
        "strengths": [{"aspect": a[0], "score": round(a[1], 2)} for a in strengths],
        "critical_aspects": [{"aspect": a[0], "score": round(a[1], 2)} for a in critical]
    }
