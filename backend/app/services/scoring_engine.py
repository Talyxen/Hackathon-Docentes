from typing import List, Dict, Any, Tuple
from sqlalchemy.orm import Session
from app.core.config import settings
from app.db.models import Teacher, Comment, AspectClassification
from app.db.schemas import TeacherScoreResponse, AspectScoreDetail

ALL_ASPECTS = [
    "metodologia", "puntualidad", "trato", "dominio",
    "claridad", "evaluacion", "disponibilidad", "organizacion"
]

SENTIMENT_NUMERIC = {
    "POSITIVE": 1.0,
    "NEUTRAL": 0.5,
    "NEGATIVE": 0.0
}

def calculate_global_batch_priors(db: Session, batch_id: str = None) -> Dict[str, float]:
    """Calcula la media ponderada global M_a por aspecto a partir del lote actual (o fallback 50.0)"""
    query = db.query(AspectClassification).filter(
        AspectClassification.status.in_(["AUTOMATIC", "HUMAN_CONFIRMED", "HUMAN_EDITED"]),
        AspectClassification.requires_review == False
    )
    if batch_id:
        query = query.join(Comment).filter(Comment.batch_id == batch_id)

    classifications = query.all()
    priors: Dict[str, float] = {}

    for asp in ALL_ASPECTS:
        asp_class = [c for c in classifications if c.aspect_name == asp]
        if asp_class:
            num = sum(SENTIMENT_NUMERIC.get(c.sentiment, 0.5) * (1.0 if c.status.startswith("HUMAN") else c.confidence_score) for c in asp_class)
            den = sum((1.0 if c.status.startswith("HUMAN") else c.confidence_score) for c in asp_class)
            priors[asp] = round((num / den) * 100.0, 2) if den > 0 else settings.DEFAULT_BAYES_PRIOR
        else:
            priors[asp] = settings.DEFAULT_BAYES_PRIOR

    return priors

def compute_teacher_score(
    db: Session,
    teacher: Teacher,
    m: float = settings.DEFAULT_REGULARIZATION_M,
    global_priors: Dict[str, float] = None
) -> TeacherScoreResponse:
    """Calcula el score explicable, bayesiano y renormalizado de un docente"""
    if not global_priors:
        global_priors = {asp: settings.DEFAULT_BAYES_PRIOR for asp in ALL_ASPECTS}

    # Obtener comentarios del docente
    comments = db.query(Comment).filter(Comment.teacher_id == teacher.id).all()
    comment_ids = [c.id for c in comments]

    all_classifications = db.query(AspectClassification).filter(
        AspectClassification.comment_id.in_(comment_ids)
    ).all() if comment_ids else []

    # Filtrar clasificaciones válidas vs pendientes
    valid_classifications = [c for c in all_classifications if c.status != "EXCLUDED" and not c.requires_review]
    pending_classifications = [c for c in all_classifications if c.requires_review and c.status == "AUTOMATIC"]

    total_valid_pairs = len(valid_classifications)
    pending_reviews_count = len(pending_classifications)
    pending_ratio = round(pending_reviews_count / len(all_classifications), 2) if all_classifications else 0.0

    aspect_details: Dict[str, AspectScoreDetail] = {}
    valid_aspects_scores: Dict[str, float] = {}

    for asp in ALL_ASPECTS:
        asp_class = [c for c in valid_classifications if c.aspect_name == asp]
        n_ad = len(asp_class)
        has_insufficient = n_ad < settings.MIN_PAIRS_PER_ASPECT

        pos_cnt = sum(1 for c in asp_class if c.sentiment == "POSITIVE")
        neu_cnt = sum(1 for c in asp_class if c.sentiment == "NEUTRAL")
        neg_cnt = sum(1 for c in asp_class if c.sentiment == "NEGATIVE")

        if n_ad > 0:
            num = sum(SENTIMENT_NUMERIC.get(c.sentiment, 0.5) * (1.0 if c.status.startswith("HUMAN") else c.confidence_score) for c in asp_class)
            den = sum((1.0 if c.status.startswith("HUMAN") else c.confidence_score) for c in asp_class)
            obs_score = round((num / den) * 100.0, 2) if den > 0 else 50.0
        else:
            obs_score = 50.0

        prior_m = global_priors.get(asp, settings.DEFAULT_BAYES_PRIOR)
        bayes_score = round((n_ad * obs_score + m * prior_m) / (n_ad + m), 2)

        aspect_details[asp] = AspectScoreDetail(
            aspect_name=asp,
            observed_score=obs_score,
            bayes_score=bayes_score,
            sample_count=n_ad,
            has_insufficient_sample=has_insufficient,
            positive_count=pos_cnt,
            neutral_count=neu_cnt,
            negative_count=neg_cnt
        )

        if not has_insufficient:
            valid_aspects_scores[asp] = bayes_score

    # Renormalizar pesos si hay aspectos sin datos suficientes
    if valid_aspects_scores:
        general_score = round(sum(valid_aspects_scores.values()) / len(valid_aspects_scores), 2)
    else:
        general_score = 0.0

    # Determinar Categoría de Ranking
    if total_valid_pairs < settings.MIN_PAIRS_TOTAL_OFFICIAL:
        category = "PROVISIONAL_MUESTRA_BAJA"
    elif pending_ratio > 0.30:
        category = "PROVISIONAL_PENDIENTES"
    else:
        category = "OFICIAL_PRINCIPAL"

    # Fortalezas y Áreas Críticas
    strengths = [asp for asp, det in aspect_details.items() if not det.has_insufficient_sample and det.bayes_score >= 85.0]
    critical = [asp for asp, det in aspect_details.items() if not det.has_insufficient_sample and det.bayes_score < 65.0]

    return TeacherScoreResponse(
        teacher_id=teacher.id,
        display_name=teacher.display_name,
        general_score=general_score,
        ranking_category=category,
        total_valid_pairs=total_valid_pairs,
        pending_reviews_count=pending_reviews_count,
        pending_ratio=pending_ratio,
        aspects=aspect_details,
        strengths=strengths,
        critical_areas=critical
    )
