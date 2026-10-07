import re
import spacy
from typing import List, Dict, Any, Tuple
from app.core.config import settings

# Cargar modelo SpaCy en español
try:
    nlp = spacy.load("es_core_news_sm")
except Exception:
    import es_core_news_sm
    nlp = es_core_news_sm.load()

# Dictionarios Léxicos y Lemas por Aspecto
ASPECT_LEXICON = {
    "metodologia": [
        "metodologia", "metodo", "taller", "ejercicio", "practico", "practica", "dinamica", "diapositiva",
        "proyecto", "laboratorio", "herramienta", "ensenanza", "pedagogia", "pedagogico", "clase", "diapositivas",
        "video", "actividad", "ejemplo", "ejemplos"
    ],
    "puntualidad": [
        "puntual", "puntualidad", "llegar", "llega", "tiempo", "temprano", "tarde", "hora", "minutos",
        "retraso", "asistencia", "reloj", "salida", "iniciar", "empezar", "cumplir"
    ],
    "trato": [
        "trato", "amable", "respeto", "respetuoso", "grosero", "empatia", "atencion", "educado", "persona",
        "grito", "gritar", "burla", "burlar", "humano", "paciente", "paciencia", "frio", "distante", "amor"
    ],
    "dominio": [
        "dominio", "domina", "dominando", "conocer", "conoce", "sabe", "saber", "conocimiento", "tema",
        "materia", "experiencia", "brillante", "profesional", "experto", "asignatura", "ingenieria", "pasion"
    ],
    "claridad": [
        "claridad", "claro", "explicar", "explica", "explicacion", "entender", "entiende", "confuso",
        "abstracto", "duda", "dudas", "resolucion", "resolver", "comprension", "tablero", "enredado", "voz"
    ],
    "evaluacion": [
        "evaluacion", "evaluar", "examen", "parcial", "parciales", "nota", "notas", "calificar", "califica",
        "calificacion", "rubrica", "criterio", "criterios", "retroalimentacion", "corregir", "entrega"
    ],
    "disponibilidad": [
        "disponibilidad", "disponible", "asesoria", "oficina", "correo", "correos", "tutoria", "tutorias",
        "mensaje", "teams", "atender", "consulta", "horario", "responder", "fines de semana"
    ],
    "organizacion": [
        "organizacion", "organizado", "syllabus", "cronograma", "orden", "ordenado", "planificacion",
        "preparacion", "preparar", "fecha", "fechas", "desorden", "desorganizacion", "programa", "aviso"
    ]
}

# Palabras de polaridad
POSITIVE_WORDS = {
    "excelente", "bueno", "buena", "buenos", "buenas", "gran", "magnifico", "impresionante", "extraordinario",
    "impecable", "transparente", "paciente", "amable", "respetuoso", "util", "completo", "justo", "justos",
    "puntual", "claro", "clarisimo", "brillante", "actualizado", "dinamico", "entretenido", "saber", "facil"
}

NEGATIVE_WORDS = {
    "pesimo", "malo", "mala", "malos", "malas", "tarde", "grosero", "desposta", "injusto", "dificil", "injustos",
    "desorganizado", "confuso", "abstracto", "cero", "nunca", "falsos", "ilegible", "aburrido", "frio", "distante",
    "inadecuado", "desproporcionado", "retraso", "burla", "gritar", "desvia", "titubea", "falta", "no"
}

SARCOSM_PATTERNS = [
    r"s[íi],\s*claro",
    r"qué\s*['\"]?(gran|buen|excelente|maravillosa|eficiencia|ejemplo|agradable|profesionalismo|comprensivo)['\"]?",
    r"['\"](profesionalismo|gran|maravilla|eficiencia|ejemplo|comprensivo|rapido|puntualisimo|agradable)['\"]",
    r"\.\.\.\s*(como|pasaron|te|nunca|llega|se)"
]

def detect_sarcasm(text: str) -> bool:
    """Detecta heurísticas de sarcasmo e ironía"""
    text_lower = text.lower()
    for pattern in SARCOSM_PATTERNS:
        if re.search(pattern, text_lower):
            return True
    return False

def analyze_comment(text: str) -> List[Dict[str, Any]]:
    """
    Segmenta el comentario y extrae clasificaciones multi-aspecto con su sentimiento,
    frase evidencia, nivel de confianza y marcadores de incertidumbre.
    """
    doc = nlp(text)
    
    # 1. Segmentación sintáctica por conectores de contraste y puntuación
    clauses = re.split(r'(?i)\b(pero|sin embargo|aunque|no obstante|mientras que)\b|[\.\;\!\?]', text)
    clauses = [c.strip() for c in clauses if c and len(c.strip()) > 2]
    if not clauses:
        clauses = [text]

    extracted_aspects: List[Dict[str, Any]] = []
    is_sarcastic = detect_sarcasm(text)

    # Rastrear aspectos encontrados para detectar contradicciones en el mismo aspecto
    aspect_sentiments_tracker: Dict[str, List[str]] = {}

    for clause in clauses:
        clause_doc = nlp(clause)
        clause_lemmas = [token.lemma_.lower() for token in clause_doc if not token.is_stop]
        clause_text_lower = clause.lower()

        for aspect_name, keywords in ASPECT_LEXICON.items():
            matches = [kw for kw in keywords if kw in clause_text_lower or kw in clause_lemmas]
            if matches:
                # Determinar polaridad
                pos_count = sum(1 for w in POSITIVE_WORDS if w in clause_text_lower)
                neg_count = sum(1 for w in NEGATIVE_WORDS if w in clause_text_lower or "no " in clause_text_lower or "ni " in clause_text_lower)
                
                # Manejar sarcasmo
                if is_sarcastic:
                    sentiment = "NEGATIVE"
                elif pos_count > neg_count and neg_count == 0:
                    sentiment = "POSITIVE"
                elif neg_count > pos_count:
                    sentiment = "NEGATIVE"
                elif pos_count > 0 and neg_count > 0:
                    sentiment = "NEUTRAL"
                else:
                    sentiment = "POSITIVE" if "excelente" in clause_text_lower or "muy" in clause_text_lower else "NEUTRAL"

                # Calcular confianza (c_i,a)
                s_lex = min(1.0, len(matches) * 0.5)
                s_syn = 0.8  # Coincidencia sintáctica dentro de la cláusula
                s_pol = 0.9 if sentiment in ["POSITIVE", "NEGATIVE"] else 0.6
                p_sarcasm = 0.35 if is_sarcastic else 0.0

                confidence = max(0.40, round(0.4 * s_lex + 0.3 * s_syn + 0.3 * s_pol - p_sarcasm, 2))

                # Registrar evidencia span
                evidence_span = clause

                extracted_aspects.append({
                    "aspect_name": aspect_name,
                    "sentiment": sentiment,
                    "evidence_span": evidence_span,
                    "confidence_score": confidence,
                    "requires_review": False,
                    "uncertainty_reason": None
                })

                if aspect_name not in aspect_sentiments_tracker:
                    aspect_sentiments_tracker[aspect_name] = []
                aspect_sentiments_tracker[aspect_name].append(sentiment)

    # Consolidar duplicados por aspecto en el mismo comentario
    consolidated: Dict[str, Dict[str, Any]] = {}
    for item in extracted_aspects:
        asp = item["aspect_name"]
        if asp not in consolidated:
            consolidated[asp] = item
        else:
            existing = consolidated[asp]
            if existing["sentiment"] != item["sentiment"]:
                existing["sentiment"] = "NEUTRAL"
            existing["evidence_span"] += f" | {item['evidence_span']}"
            existing["confidence_score"] = min(existing["confidence_score"], item["confidence_score"])

    final_results = list(consolidated.values())

    # Evaluación de Incertidumbre y Sarcasmo
    for item in final_results:
        asp = item["aspect_name"]
        reasons = []

        if is_sarcastic:
            reasons.append("SARCOSM_IRONY")

        # Contradicción en el mismo aspecto
        if asp in aspect_sentiments_tracker:
            sents = aspect_sentiments_tracker[asp]
            if "POSITIVE" in sents and "NEGATIVE" in sents:
                reasons.append("SAME_ASPECT_CONTRADICTION")

        # Confianza menor al umbral
        if item["confidence_score"] < settings.DEFAULT_CONFIDENCE_THRESHOLD:
            reasons.append("LOW_CONFIDENCE")

        if reasons:
            item["requires_review"] = True
            item["uncertainty_reason"] = ", ".join(reasons)

    return final_results
