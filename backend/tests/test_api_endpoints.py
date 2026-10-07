import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.core.database import get_db

client = TestClient(app)

def test_healthcheck(db_session):
    app.dependency_overrides[get_db] = lambda: db_session
    response = client.get("/health")
    assert response.status_code == 200

def test_full_phase3_flow(db_session):
    app.dependency_overrides[get_db] = lambda: db_session
    
    # 1. Test CSV Upload (Multi-aspecto, sarcasmo)
    csv_data = b'docente,comentario\nProfeA,"Excelente clase de metodologia."\nProfeA,"Tiene buen dominio, pero sus examenes son imposibles."\nProfeA,"Claro, llega super puntual... como media hora despues."\nProfeA,"El trato es muy bueno."\nProfeA,"Muy organizado el syllabus."\nProfeA,"Siempre disponible."\nProfeA,"Explica muy bien."\nProfeA,"Me encanto el curso."\nProfeA,"Buen profe."\nProfeA,"Justo en las notas."\nProfeB,"No me gusto."'
    resp_csv = client.post("/api/upload", files={"file": ("test.csv", csv_data, "text/csv")})
    assert resp_csv.status_code == 200
    
    # 2. Test XLSX Upload with rejected row (too short)
    import io
    import pandas as pd
    df = pd.DataFrame({"docente": ["ProfeC", "", "ProfeC"], "comentario": ["Bien", "X", "Solo evalua con memorizacion, no hay analisis"]})
    excel_io = io.BytesIO()
    with pd.ExcelWriter(excel_io, engine='openpyxl') as writer:
        df.to_excel(writer, index=False)
    excel_io.seek(0)
    
    resp_xlsx = client.post("/api/upload", files={"file": ("test.xlsx", excel_io.read(), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")})
    assert resp_xlsx.status_code == 200
    xlsx_json = resp_xlsx.json()
    assert xlsx_json["rejected_rows_count"] > 0
    
    # 3. Test /stats
    resp_stats = client.get("/api/stats")
    assert resp_stats.status_code == 200
    
    # 4. Test Comments filtering (Explorer)
    resp_comments = client.get("/api/comments")
    assert resp_comments.status_code == 200
    resp_json = resp_comments.json()
    comments = resp_json["comments"]
    assert len(comments) > 0
    
    # 5. Human Review Flow
    # Extract classification_id from the first comment's classifications
    target_comment = next(c for c in comments if any(cls["requires_review"] for cls in c["classifications"]))
    target_class = next(cls for cls in target_comment["classifications"] if cls["requires_review"])
    target_id = target_class["id"]
    
    resp_review = client.post(f"/api/comments/{target_id}/review", json={
        "reviewer_name": "Auditor Principal",
        "action": "CORRECT",
        "review_reason": "Correccion manual",
        "corrected_sentiment": "NEGATIVE"
    })
    assert resp_review.status_code == 200
    
    # 6. Comparative / Ranking (Docente provisional y aspecto sin datos)
    resp_comp = client.get("/api/comparative")
    assert resp_comp.status_code == 200
    comp_data = resp_comp.json()
    assert "global_batch_priors" in comp_data
    # ProfeB only has 1 comment, should be provisional
    profeb = next(t for t in comp_data["teachers"] if t["display_name"] == "ProfeB")
    assert profeb is not None
