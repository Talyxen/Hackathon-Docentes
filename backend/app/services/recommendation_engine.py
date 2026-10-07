from typing import List
from app.db.schemas import TeacherScoreResponse, RecommendationItem, TeacherRecommendationResponse

RECOMMENDATION_TEMPLATES = {
    "puntualidad": {
        "critical": "Se recomienda fortalecer el cumplimiento estricto del horario de inicio y finalización de las clases (Score: {score:.1f}), debido a que un {pct_neg:.0f}% de las observaciones ({n_neg} de {n_total}) reportan impuntualidad o retrasos.",
        "strength": "Se destaca la puntualidad impecable como una fortaleza consolidada (Score: {score:.1f}), respaldada por un {pct_pos:.0f}% de comentarios altamente positivos ({n_pos} menciones).",
        "neutral": "El aspecto de puntualidad se mantiene estable (Score: {score:.1f}). Se sugiere mantener la constancia en los horarios."
    },
    "metodologia": {
        "critical": "Se sugiere diversificar las estrategias pedagógicas e incorporar talleres o ejercicios prácticos (Score: {score:.1f}), dado que el {pct_neg:.0f}% de los estudiantes señala clases excesivamente teóricas.",
        "strength": "Se reconoce la metodología dinámica y práctica como pilar diferenciador del docente (Score: {score:.1f}), elogiada en el {pct_pos:.0f}% de las retroalimentaciones.",
        "neutral": "La metodología pedagógica cumple con los estándares institucionales (Score: {score:.1f})."
    },
    "trato": {
        "critical": "Se recomienda promover un clima de aula más empático y respetuoso (Score: {score:.1f}), debido a un {pct_neg:.0f}% de valoraciones negativas referentes a interacciones rígidas o descuidadas.",
        "strength": "Se resalta el trato humano, empático y respetuoso como una cualidad sobresaliente (Score: {score:.1f}), respaldada por {n_pos} valoraciones positivas.",
        "neutral": "El trato hacia el estudiantado mantiene una apreciación respetuosa y adecuada (Score: {score:.1f})."
    },
    "dominio": {
        "critical": "Se sugiere reforzar la actualización técnica y preparación previa de los contenidos (Score: {score:.1f}), ya que un {pct_neg:.0f}% de comentarios refleja dudas sobre el dominio temático.",
        "strength": "Se destaca el dominio del tema extraordinario y la solvencia técnica del docente (Score: {score:.1f}) con un {pct_pos:.0f}% de reconocimiento positivo.",
        "neutral": "El dominio temático demuestra solvencia adecuada dentro de la asignatura (Score: {score:.1f})."
    },
    "claridad": {
        "critical": "Se recomienda simplificar la explicación de conceptos complejos y utilizar más ejemplos aplicados (Score: {score:.1f}), concentrando un {pct_neg:.0f}% de inconformidades en la claridad verbal.",
        "strength": "Se elogia la claridad expositiva y la excelente facilidad para transmitir conocimientos (Score: {score:.1f}) en {n_pos} comentarios observados.",
        "neutral": "La claridad explicativa se percibe comprensible y en rango aceptable (Score: {score:.1f})."
    },
    "evaluacion": {
        "critical": "Se recomienda transparentar los criterios de evaluación y entregar retroalimentación oportuna de los parciales (Score: {score:.1f}), dado un {pct_neg:.0f}% de desacuerdos reportados.",
        "strength": "Se reconoce la objetividad, transparencia y justicia en las evaluaciones (Score: {score:.1f}), apreciadas positivamente en el {pct_pos:.0f}% de las respuestas.",
        "neutral": "El sistema de evaluación y calificaciones se mantiene constante (Score: {score:.1f})."
    },
    "disponibilidad": {
        "critical": "Se recomienda ampliar los canales de consulta e instaurar horarios de atención extra-clase (Score: {score:.1f}), respondiendo al {pct_neg:.0f}% de solicitudes desatendidas.",
        "strength": "Se destaca la alta disponibilidad y la pronta atención de dudas fuera del salón (Score: {score:.1f}) con un {pct_pos:.0f}% de satisfacción.",
        "neutral": "La disponibilidad para resolver dudas cumple los requerimientos de la asignatura (Score: {score:.1f})."
    },
    "organizacion": {
        "critical": "Se sugiere estructurar rigurosamente el cronograma de entregas y el syllabus (Score: {score:.1f}), reduciendo el {pct_neg:.0f}% de inconformidades por cambios imprevistos.",
        "strength": "Se felicita la impecable organización del curso y el cumplimiento riguroso de la planificación (Score: {score:.1f}) en {n_pos} valoraciones.",
        "neutral": "La planificación y organización de la asignatura se desarrollan sin desviaciones significativas (Score: {score:.1f})."
    }
}

def generate_teacher_recommendations(score_response: TeacherScoreResponse) -> TeacherRecommendationResponse:
    """Genera recomendaciones automáticas vinculadas estrictamente a las evidencias estadísticas"""
    recommendations: List[RecommendationItem] = []

    for asp_name, det in score_response.aspects.items():
        if det.has_insufficient_sample:
            continue

        n_total = det.sample_count
        pct_pos = (det.positive_count / n_total) * 100.0 if n_total > 0 else 0
        pct_neg = (det.negative_count / n_total) * 100.0 if n_total > 0 else 0

        templates = RECOMMENDATION_TEMPLATES.get(asp_name, RECOMMENDATION_TEMPLATES["metodologia"])

        if det.bayes_score < 65.0:
            category = "CRITICAL_OPPORTUNITY"
            fmt_text = templates["critical"].format(
                score=det.bayes_score,
                pct_neg=pct_neg,
                n_neg=det.negative_count,
                n_total=n_total
            )
        elif det.bayes_score >= 85.0:
            category = "STRENGTH_HIGHLIGHT"
            fmt_text = templates["strength"].format(
                score=det.bayes_score,
                pct_pos=pct_pos,
                n_pos=det.positive_count,
                n_total=n_total
            )
        else:
            category = "NEUTRAL_STABLE"
            fmt_text = templates["neutral"].format(score=det.bayes_score)

        recommendations.append(RecommendationItem(
            aspect_name=asp_name,
            score=det.bayes_score,
            category=category,
            recommendation_text=fmt_text,
            sample_evidence={
                "sample_count": n_total,
                "positive_count": det.positive_count,
                "negative_count": det.negative_count,
                "neutral_count": det.neutral_count
            }
        ))

    return TeacherRecommendationResponse(
        teacher_id=score_response.teacher_id,
        display_name=score_response.display_name,
        general_score=score_response.general_score,
        recommendations=recommendations
    )
