import os
from sqlalchemy.orm import Session
from app.db.models import Teacher, AspectClassification
from app.services.ingestion import process_and_store_batch
from app.services.nlp_engine import analyze_comment
from app.core.config import settings

def seed_demo_data_if_empty(db: Session):
    try:
        count = db.query(Teacher).count()
        if count > 0:
            return
        
        seed_path = os.path.join(os.path.dirname(__file__), "..", "seed_data.csv")
        if not os.path.exists(seed_path):
            return

        with open(seed_path, "rb") as f:
            content = f.read()

        batch, valid_comments, rejected_rows = process_and_store_batch(
            db=db,
            filename="ejemplo_evaluacion_docentes.csv",
            content=content
        )

        for comm in valid_comments:
            extracted = analyze_comment(comm.raw_text)
            for item in extracted:
                ac = AspectClassification(
                    comment_id=comm.id,
                    aspect_name=item["aspect_name"],
                    sentiment=item["sentiment"],
                    evidence_span=item["evidence_span"],
                    confidence_score=item["confidence_score"],
                    requires_review=item["requires_review"],
                    uncertainty_reason=item["uncertainty_reason"],
                    status="AUTOMATIC",
                    engine_version=settings.ENGINE_VERSION
                )
                db.add(ac)

        db.commit()
    except Exception as e:
        db.rollback()
        print(f"[SEED ERROR] Failed to seed demo data: {e}")
