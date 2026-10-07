import pytest
from app.services.scoring_engine import ALL_ASPECTS, SENTIMENT_NUMERIC, compute_teacher_score
from app.db.models import Teacher, Comment, AspectClassification, BatchUpload

def test_scoring_bayes_and_renormalization(db_session):
    # Crear docente de prueba
    teacher = Teacher(normalized_name="juan perez", display_name="Juan Pérez")
    db_session.add(teacher)
    
    batch = BatchUpload(
        filename="test.csv",
        file_size_bytes=100,
        total_rows=5,
        valid_rows=5,
        rejected_rows_count=0
    )
    db_session.add(batch)
    db_session.flush()

    # Agregar comentarios válidos para Metodología (n = 4 >= 3 -> Válido)
    for i in range(4):
        comm = Comment(batch_id=batch.id, teacher_id=teacher.id, raw_text=f"Excelente metodología {i}", row_index=i+1)
        db_session.add(comm)
        db_session.flush()
        
        ac = AspectClassification(
            comment_id=comm.id,
            aspect_name="metodologia",
            sentiment="POSITIVE",
            evidence_span="Excelente metodología",
            confidence_score=1.0,
            requires_review=False,
            status="HUMAN_CONFIRMED",
            engine_version="test_v1"
        )
        db_session.add(ac)

    # Agregar comentarios para Puntualidad (n = 1 < 3 -> Muestra insuficiente)
    comm_p = Comment(batch_id=batch.id, teacher_id=teacher.id, raw_text="Llega tarde", row_index=5)
    db_session.add(comm_p)
    db_session.flush()
    ac_p = AspectClassification(
        comment_id=comm_p.id,
        aspect_name="puntualidad",
        sentiment="NEGATIVE",
        evidence_span="Llega tarde",
        confidence_score=0.9,
        requires_review=False,
        status="AUTOMATIC",
        engine_version="test_v1"
    )
    db_session.add(ac_p)
    db_session.commit()

    global_priors = {asp: 50.0 for asp in ALL_ASPECTS}
    score_resp = compute_teacher_score(db_session, teacher, m=5.0, global_priors=global_priors)

    # Verificar que Puntualidad se marcó con muestra insuficiente
    assert score_resp.aspects["puntualidad"].has_insufficient_sample == True
    # Verificar que Metodología es muestra suficiente (n=4 >= 3)
    assert score_resp.aspects["metodologia"].has_insufficient_sample == False
    
    # Verificar categoría de ranking (n_total = 5 < 10 -> PROVISIONAL_MUESTRA_BAJA)
    assert score_resp.ranking_category == "PROVISIONAL_MUESTRA_BAJA"
