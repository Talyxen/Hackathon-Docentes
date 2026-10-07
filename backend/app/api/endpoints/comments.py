from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional
from app.core.database import get_db
from app.db.models import Comment, Teacher, AspectClassification
from app.db.schemas import CommentExplorerResponse, CommentDetailSchema, AspectClassificationSchema

router = APIRouter()

@router.get("/comments", response_model=CommentExplorerResponse, summary="Explorador Paginado de Comentarios")
def get_comments(
    teacher_id: Optional[str] = None,
    aspect_name: Optional[str] = None,
    sentiment: Optional[str] = None,
    requires_review: Optional[bool] = None,
    search_text: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db)
):
    query = db.query(Comment).join(Teacher)

    if teacher_id:
        query = query.filter(Comment.teacher_id == teacher_id)
    if search_text:
        query = query.filter(Comment.raw_text.ilike(f"%{search_text}%"))

    if aspect_name or sentiment or requires_review is not None:
        query = query.join(AspectClassification)
        if aspect_name:
            query = query.filter(AspectClassification.aspect_name == aspect_name)
        if sentiment:
            query = query.filter(AspectClassification.sentiment == sentiment)
        if requires_review is not None:
            query = query.filter(AspectClassification.requires_review == requires_review)

    total = query.distinct().count()
    comments = query.distinct().offset((page - 1) * page_size).limit(page_size).all()

    result_items = []
    for c in comments:
        classifications = db.query(AspectClassification).filter(AspectClassification.comment_id == c.id).all()
        class_schemas = [
            AspectClassificationSchema(
                id=ac.id,
                aspect_name=ac.aspect_name,
                sentiment=ac.sentiment,
                evidence_span=ac.evidence_span,
                confidence_score=ac.confidence_score,
                requires_review=ac.requires_review,
                uncertainty_reason=ac.uncertainty_reason,
                status=ac.status,
                engine_version=ac.engine_version
            ) for ac in classifications
        ]

        result_items.append(CommentDetailSchema(
            id=c.id,
            batch_id=c.batch_id,
            teacher_id=c.teacher_id,
            teacher_name=c.teacher.display_name,
            raw_text=c.raw_text,
            row_index=c.row_index,
            created_at=c.created_at,
            classifications=class_schemas
        ))

    return CommentExplorerResponse(
        total_comments=total,
        page=page,
        page_size=page_size,
        comments=result_items
    )

from pydantic import BaseModel
from fastapi import HTTPException

class ReviewRequest(BaseModel):
    reviewer_name: str
    action: str  # CONFIRM, CORRECT, EXCLUDE
    corrected_sentiment: Optional[str] = None
    corrected_aspect: Optional[str] = None

@router.post("/comments/{classification_id}/review", summary="Centro de Revisión Humana")
def review_comment(classification_id: str, req: ReviewRequest, db: Session = Depends(get_db)):
    ac = db.query(AspectClassification).filter(AspectClassification.id == classification_id).first()
    if not ac:
        raise HTTPException(status_code=404, detail="Classification not found")
        
    if req.action == "CONFIRM":
        ac.status = "REVIEWED"
        ac.requires_review = False
    elif req.action == "CORRECT":
        ac.status = "REVIEWED"
        ac.requires_review = False
        if req.corrected_sentiment:
            ac.sentiment = req.corrected_sentiment
        if req.corrected_aspect:
            ac.aspect_name = req.corrected_aspect
    elif req.action == "EXCLUDE":
        ac.status = "EXCLUDED"
    else:
        raise HTTPException(status_code=400, detail="Invalid action")
        
    ac.reviewer_name = req.reviewer_name
    db.commit()
    return {"message": "Review saved"}
