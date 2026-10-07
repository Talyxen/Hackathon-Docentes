from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime

class RejectedRowSchema(BaseModel):
    row_index: int
    raw_content: Optional[str] = None
    rejection_reason: str

class BatchSummaryResponse(BaseModel):
    batch_id: str
    filename: str
    file_size_bytes: int
    total_rows: int
    valid_rows: int
    rejected_rows_count: int
    upload_timestamp: datetime
    rejected_details: List[RejectedRowSchema] = []

class AspectClassificationSchema(BaseModel):
    id: str
    aspect_name: str
    sentiment: str
    evidence_span: str
    confidence_score: float
    requires_review: bool
    uncertainty_reason: Optional[str] = None
    status: str
    engine_version: str

class CommentDetailSchema(BaseModel):
    id: str
    batch_id: str
    teacher_id: str
    teacher_name: str
    raw_text: str
    row_index: int
    created_at: datetime
    classifications: List[AspectClassificationSchema]

class CommentExplorerResponse(BaseModel):
    total_comments: int
    page: int
    page_size: int
    comments: List[CommentDetailSchema]

class HumanReviewRequest(BaseModel):
    classification_id: str
    reviewer_name: str = Field(..., min_length=2, description="Nombre del revisor humano")
    action: str = Field(..., description="CONFIRM, EDIT, EXCLUDE")
    new_aspect: Optional[str] = None
    new_sentiment: Optional[str] = None  # POSITIVE, NEUTRAL, NEGATIVE
    review_reason: Optional[str] = None

class HumanReviewResponse(BaseModel):
    success: bool
    review_id: str
    classification_id: str
    action: str
    reviewer_name: str
    timestamp: datetime

class AspectScoreDetail(BaseModel):
    aspect_name: str
    observed_score: float
    bayes_score: float
    sample_count: int
    has_insufficient_sample: bool
    positive_count: int
    neutral_count: int
    negative_count: int

class TeacherScoreResponse(BaseModel):
    teacher_id: str
    display_name: str
    general_score: float
    ranking_category: str  # OFICIAL_PRINCIPAL, PROVISIONAL_MUESTRA_BAJA, PROVISIONAL_PENDIENTES
    total_valid_pairs: int
    pending_reviews_count: int
    pending_ratio: float
    aspects: Dict[str, AspectScoreDetail]
    strengths: List[str]
    critical_areas: List[str]

class ComparativeResponse(BaseModel):
    teachers: List[TeacherScoreResponse]
    global_batch_priors: Dict[str, float]
    sensitivity_m: float

class RecommendationItem(BaseModel):
    aspect_name: str
    score: float
    category: str  # CRITICAL_OPPORTUNITY, STRENGTH_HIGHLIGHT, NEUTRAL_STABLE
    recommendation_text: str
    sample_evidence: Dict[str, Any]

class TeacherRecommendationResponse(BaseModel):
    teacher_id: str
    display_name: str
    general_score: float
    recommendations: List[RecommendationItem]

class ExecutiveReportResponse(BaseModel):
    generated_at: datetime
    total_batch_uploads: int
    total_teachers: int
    total_processed_comments: int
    total_valid_aspect_pairs: int
    total_pending_reviews: int
    global_average_score: float
    official_ranking: List[TeacherScoreResponse]
    provisional_ranking: List[TeacherScoreResponse]
    global_aspect_summary: Dict[str, float]
