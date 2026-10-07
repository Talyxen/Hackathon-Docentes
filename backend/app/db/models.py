import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, Float, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.core.database import Base

def generate_uuid():
    return str(uuid.uuid4())

class Teacher(Base):
    __tablename__ = "teachers"

    id = Column(String, primary_key=True, default=generate_uuid)
    normalized_name = Column(String, unique=True, index=True, nullable=False)
    display_name = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    comments = relationship("Comment", back_populates="teacher", cascade="all, delete-orphan")

class BatchUpload(Base):
    __tablename__ = "batch_uploads"

    id = Column(String, primary_key=True, default=generate_uuid)
    filename = Column(String, nullable=False)
    file_size_bytes = Column(Integer, nullable=False)
    total_rows = Column(Integer, nullable=False)
    valid_rows = Column(Integer, nullable=False)
    rejected_rows_count = Column(Integer, nullable=False)
    upload_timestamp = Column(DateTime, default=datetime.utcnow)

    comments = relationship("Comment", back_populates="batch", cascade="all, delete-orphan")
    rejected_rows = relationship("RejectedRow", back_populates="batch", cascade="all, delete-orphan")

class RejectedRow(Base):
    __tablename__ = "rejected_rows"

    id = Column(String, primary_key=True, default=generate_uuid)
    batch_id = Column(String, ForeignKey("batch_uploads.id", ondelete="CASCADE"), nullable=False, index=True)
    row_index = Column(Integer, nullable=False)
    raw_content = Column(Text, nullable=True)
    rejection_reason = Column(String, nullable=False)

    batch = relationship("BatchUpload", back_populates="rejected_rows")

class Comment(Base):
    __tablename__ = "comments"

    id = Column(String, primary_key=True, default=generate_uuid)
    batch_id = Column(String, ForeignKey("batch_uploads.id", ondelete="CASCADE"), nullable=False, index=True)
    teacher_id = Column(String, ForeignKey("teachers.id", ondelete="CASCADE"), nullable=False, index=True)
    raw_text = Column(Text, nullable=False)
    row_index = Column(Integer, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    batch = relationship("BatchUpload", back_populates="comments")
    teacher = relationship("Teacher", back_populates="comments")
    classifications = relationship("AspectClassification", back_populates="comment", cascade="all, delete-orphan")

class AspectClassification(Base):
    __tablename__ = "aspect_classifications"

    id = Column(String, primary_key=True, default=generate_uuid)
    comment_id = Column(String, ForeignKey("comments.id", ondelete="CASCADE"), nullable=False, index=True)
    aspect_name = Column(String, nullable=False, index=True)  # metodologia, puntualidad, trato, dominio, claridad, evaluacion, disponibilidad, organizacion
    sentiment = Column(String, nullable=False)                # POSITIVE, NEUTRAL, NEGATIVE
    evidence_span = Column(Text, nullable=False)
    confidence_score = Column(Float, nullable=False)
    requires_review = Column(Boolean, default=False, index=True)
    uncertainty_reason = Column(String, nullable=True)
    status = Column(String, default="AUTOMATIC", index=True)  # AUTOMATIC, HUMAN_CONFIRMED, HUMAN_EDITED, EXCLUDED
    engine_version = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    comment = relationship("Comment", back_populates="classifications")
    reviews = relationship("HumanReview", back_populates="classification", cascade="all, delete-orphan")

class HumanReview(Base):
    __tablename__ = "human_reviews"

    id = Column(String, primary_key=True, default=generate_uuid)
    classification_id = Column(String, ForeignKey("aspect_classifications.id", ondelete="CASCADE"), nullable=False, index=True)
    reviewer_name = Column(String, nullable=False)
    action = Column(String, nullable=False)  # CONFIRM, EDIT, EXCLUDE
    original_values_json = Column(Text, nullable=False)
    new_values_json = Column(Text, nullable=False)
    review_reason = Column(String, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow)

    classification = relationship("AspectClassification", back_populates="reviews")
