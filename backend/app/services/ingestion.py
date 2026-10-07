import io
import unicodedata
import pandas as pd
from typing import Tuple, List, Dict, Any
from sqlalchemy.orm import Session
from app.core.config import settings
from app.db.models import BatchUpload, Teacher, Comment, RejectedRow

def normalize_teacher_name(raw_name: str) -> str:
    """Normaliza el nombre del docente (trim, lowercase, elimina acentos NFKD)"""
    if not raw_name:
        return ""
    text = str(raw_name).strip().lower()
    text = unicodedata.normalize('NFKD', text)
    text = ''.join([c for c in text if not unicodedata.combining(c)])
    return text

def validate_file_metadata(filename: str, content: bytes) -> Tuple[bool, str]:
    """Valida tamaño, extensión y firma de bytes (magic bytes)"""
    file_size_mb = len(content) / (1024 * 1024)
    if file_size_mb > settings.MAX_FILE_SIZE_MB:
        return False, f"El archivo excede el límite de {settings.MAX_FILE_SIZE_MB} MB (Tamaño: {file_size_mb:.2f} MB)"

    ext = "." + filename.split(".")[-1].lower() if "." in filename else ""
    if ext not in settings.ALLOWED_EXTENSIONS:
        return False, f"Extensión de archivo '{ext}' no permitida. Formatos aceptados: .csv, .xlsx"

    # Verificación de Magic Bytes para XLSX (ZIP PK header)
    if ext == ".xlsx" and not content.startswith(b"PK\x03\x04"):
        return False, "Firma de archivo inválida: el archivo .xlsx está corrupto o fue renombrado falsamente."

    return True, "OK"

def process_and_store_batch(
    db: Session,
    filename: str,
    content: bytes
) -> Tuple[BatchUpload, List[Comment], List[RejectedRow]]:
    """Ingesta y valida el archivo CSV o XLSX almacenando registros válidos y rechazados"""
    
    is_valid, error_msg = validate_file_metadata(filename, content)
    if not is_valid:
        raise ValueError(error_msg)

    ext = "." + filename.split(".")[-1].lower()
    
    try:
        if ext == ".csv":
            # Intentar decodificación utf-8, fallback a latin-1
            try:
                df = pd.read_csv(io.BytesIO(content), encoding="utf-8")
            except UnicodeDecodeError:
                df = pd.read_csv(io.BytesIO(content), encoding="latin-1")
        else:
            df = pd.read_excel(io.BytesIO(content))
    except Exception as e:
        raise ValueError(f"Error al parsear la estructura del archivo {ext}: {str(e)}")

    if len(df) > settings.MAX_ROWS:
        raise ValueError(f"El archivo contiene {len(df)} filas, superando el máximo de {settings.MAX_ROWS} filas por lote.")

    # Normalizar nombres de columnas (lowercase, strip)
    df.columns = [str(c).strip().lower() for c in df.columns]
    
    # Identificar columna docente y comentario
    teacher_col = None
    comment_col = None
    
    for c in df.columns:
        if any(term in c for term in ["docente", "profesor", "maestro", "teacher"]):
            teacher_col = c
            break
            
    for c in df.columns:
        if any(term in c for term in ["comentario", "texto", "opinion", "feedback", "comment"]):
            comment_col = c
            break

    if not teacher_col or not comment_col:
        raise ValueError(f"Columnas no reconocidas. Se requiere una columna de docente ('docente') y de comentario ('comentario'). Encontradas: {list(df.columns)}")

    # Crear registro del Lote
    batch = BatchUpload(
        filename=filename,
        file_size_bytes=len(content),
        total_rows=len(df),
        valid_rows=0,
        rejected_rows_count=0
    )
    db.add(batch)
    db.flush()

    valid_comments: List[Comment] = []
    rejected_rows: List[RejectedRow] = []

    teacher_cache: Dict[str, Teacher] = {}

    for idx, row in df.iterrows():
        row_num = idx + 2  # Número de fila contando encabezado
        raw_teacher = str(row[teacher_col]).strip() if pd.notna(row[teacher_col]) else ""
        raw_comment = str(row[comment_col]).strip() if pd.notna(row[comment_col]) else ""
        raw_full_content = f"Docente: '{raw_teacher}' | Comentario: '{raw_comment}'"

        # Criterios de rechazo
        rejection_reason = None
        if not raw_teacher or raw_teacher.lower() in ["nan", "null", "none", "n/a"]:
            rejection_reason = "Nombre de docente nulo o vacío."
        elif not raw_comment or raw_comment.lower() in ["nan", "null", "none", "n/a"]:
            rejection_reason = "Comentario nulo o vacío."
        elif len(raw_comment) < 3:
            rejection_reason = f"Comentario demasiado corto ({len(raw_comment)} caracteres, mínimo 3)."

        if rejection_reason:
            rej = RejectedRow(
                batch_id=batch.id,
                row_index=row_num,
                raw_content=raw_full_content,
                rejection_reason=rejection_reason
            )
            rejected_rows.append(rej)
            db.add(rej)
        else:
            norm_name = normalize_teacher_name(raw_teacher)
            if norm_name not in teacher_cache:
                teacher = db.query(Teacher).filter(Teacher.normalized_name == norm_name).first()
                if not teacher:
                    teacher = Teacher(
                        normalized_name=norm_name,
                        display_name=raw_teacher
                    )
                    db.add(teacher)
                    db.flush()
                teacher_cache[norm_name] = teacher

            teacher = teacher_cache[norm_name]

            comm = Comment(
                batch_id=batch.id,
                teacher_id=teacher.id,
                raw_text=raw_comment,
                row_index=row_num
            )
            valid_comments.append(comm)
            db.add(comm)

    batch.valid_rows = len(valid_comments)
    batch.rejected_rows_count = len(rejected_rows)
    db.commit()

    return batch, valid_comments, rejected_rows
