from fastapi import APIRouter, Depends, UploadFile, File, Header, HTTPException, status
from sqlalchemy.orm import Session
from app.core.config import settings
from app.core.database import get_db
from app.db.models import BatchUpload, AspectClassification, RejectedRow
from app.db.schemas import BatchSummaryResponse, RejectedRowSchema
from app.services.ingestion import process_and_store_batch
from app.services.nlp_engine import analyze_comment

router = APIRouter()


@router.post("/upload", response_model=BatchSummaryResponse, summary="Cargar y Procesar Archivo CSV/XLSX")
async def upload_file(
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    content = await file.read()
    
    try:
        batch, valid_comments, rejected_rows = process_and_store_batch(
            db=db,
            filename=file.filename,
            content=content
        )
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Error interno durante el procesamiento: {str(e)}")

    # Ejecutar análisis NLP Multi-Aspecto en cada comentario válido
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

    rej_details = [
        RejectedRowSchema(
            row_index=r.row_index,
            raw_content=r.raw_content,
            rejection_reason=r.rejection_reason
        ) for r in rejected_rows
    ]

    return BatchSummaryResponse(
        batch_id=batch.id,
        filename=batch.filename,
        file_size_bytes=batch.file_size_bytes,
        total_rows=batch.total_rows,
        valid_rows=batch.valid_rows,
        rejected_rows_count=batch.rejected_rows_count,
        upload_timestamp=batch.upload_timestamp,
        rejected_details=rej_details
    )

@router.get("/batches/{batch_id}/summary", response_model=BatchSummaryResponse, summary="Obtener Resumen de un Lote Ingerido")
def get_batch_summary(batch_id: str, db: Session = Depends(get_db)):
    batch = db.query(BatchUpload).filter(BatchUpload.id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lote no encontrado.")

    rejected = db.query(RejectedRow).filter(RejectedRow.batch_id == batch_id).all()
    rej_details = [
        RejectedRowSchema(
            row_index=r.row_index,
            raw_content=r.raw_content,
            rejection_reason=r.rejection_reason
        ) for r in rejected
    ]

    return BatchSummaryResponse(
        batch_id=batch.id,
        filename=batch.filename,
        file_size_bytes=batch.file_size_bytes,
        total_rows=batch.total_rows,
        valid_rows=batch.valid_rows,
        rejected_rows_count=batch.rejected_rows_count,
        upload_timestamp=batch.upload_timestamp,
        rejected_details=rej_details
    )
