# GUÍA FORMAL DE ANOTACIÓN Y PROTOCOLO DE CONJUNTO DE ORO (`gold/`)
## Plataforma de Inteligencia Académica — Reto S-1

---

## 1. Objetivo y Principios de Anotación

Esta guía establece las reglas estándar de etiquetado manual (*Ground Truth*) para construir y validar el **Conjunto de Oro (`gold/`)**.
El conjunto de oro sirve para medir empíricamente la exactitud, *Precision*, *Recall* y $F1$-score del motor NLP SpaCy, así como para calibrar empíricamente el umbral de confianza $\tau$.

---

## 2. Esquema JSON de Registros Etiquetados

Cada registro en `gold/dev_set_70.json` y `gold/test_set_50.json` sigue estrictamente la siguiente estructura:

```json
{
  "comment_id": "GOLD-DEV-001",
  "raw_text": "Explica la materia con mucha claridad, pero desafortunadamente llega 20 minutos tarde a casi todas las clases.",
  "aspects": [
    {
      "aspect": "claridad",
      "sentiment": "POSITIVE",
      "evidence_span": "Explica la materia con mucha claridad"
    },
    {
      "aspect": "puntualidad",
      "sentiment": "NEGATIVE",
      "evidence_span": "llega 20 minutos tarde a casi todas las clases"
    }
  ],
  "requires_review": false,
  "review_reasons": []
}
```

### Campos Obligatorios:
*   `comment_id`: Identificador único (`GOLD-DEV-XXX` o `GOLD-TEST-XXX`).
*   `raw_text`: Texto exacto del comentario tal como lo escribió el estudiante.
*   `aspects`: Lista de objetos con los aspectos identificados:
    *   `aspect`: Identificador del aspecto (taxonomía de 8 aspectos).
    *   `sentiment`: `POSITIVE` (+1.0), `NEUTRAL` (+0.5), o `NEGATIVE` (0.0).
    *   `evidence_span`: Subcadena exacta extraída del comentario que justifica la clasificación.
*   `requires_review`: booleano (`true` o `false`).
*   `review_reasons`: Lista de motivos si `requires_review` es `true` (`"SARCOSM_IRONY"`, `"SAME_ASPECT_CONTRADICTION"`, `"LOW_CONFIDENCE"`).

---

## 3. Taxonomía de Aspectos (8 Aspectos Oficiales)

1.  `metodologia`: Estructura pedagógica, talleres, casos prácticos, proyectos, uso de plataformas, dinámicas de grupo.
2.  `puntualidad`: Cumplimiento estricto del horario de inicio y finalización de las clases.
3.  `trato`: Empatía, respeto, educación, amabilidad y actitud hacia el estudiante.
4.  `dominio`: Conocimiento técnico profundo, solvencia temática, dominio de la materia.
5.  `claridad`: Transmisión comprensible de conceptos, explicación sencilla de temas complejos, articulación y resolución de dudas.
6.  `evaluacion`: Criterios de calificación, justicia en exámenes, retroalimentación de notas, entrega oportuna de talleres.
7.  `disponibilidad`: Atención fuera de clase, horarios de consulta, respuesta a correos/mensajes.
8.  `organizacion`: Cumplimiento del syllabus/cronograma, orden en el material, planificación de sesiones.

---

## 4. Frontera Conceptual Crítica: `metodologia` vs. `claridad`

Para evitar ambigüedad entre anotadores:

| Aspecto | Criterio Distintivo | Ejemplo Positivo | Ejemplo Negativo |
| :--- | :--- | :--- | :--- |
| **`metodologia`** | **¿Cómo enseña y qué actividades realiza?** Enfoque en herramientas, guías, talleres, laboratorios y dinámicas del curso. | *"Utiliza ejercicios prácticos y plataformas dinámicas."* | *"Solo se dedica a leer diapositivas sin hacer talleres."* |
| **`claridad`** | **¿Se le entiende la explicación al hablar?** Enfoque en la facilidad de comprensión, tono y resolución clara de preguntas. | *"Explica temas complejos con ejemplos super entendibles."* | *"Habla muy enredado y no se le entiende lo que explica."* |

---

## 5. Regla de Oro sobre Comentarios Multi-Aspecto con Polaridades Opuestas

> **REGLA FUNDAMENTAL:**  
> Un comentario que menciona **aspectos DISTINTOS con polaridades OPUESTAS** es un **comentario multi-aspecto legítimo** y **NO se debe marcar como incierto (`requires_review = false`)**.

### Ejemplo de Multi-Aspecto Legítimo (`requires_review = false`):
*   *Texto:* *"El profesor domina perfectamente el tema, pero su trato con los estudiantes es muy déspota."*
*   *Clasificación:*
    *   `dominio` $\rightarrow$ `POSITIVE` (*"domina perfectamente el tema"*)
    *   `trato` $\rightarrow$ `NEGATIVE` (*"su trato con los estudiantes es muy déspota"*)
*   `requires_review`: `false` (Las polaridades corresponden a aspectos diferentes).

---

## 6. Cuándo Marcar Incertidumbre (`requires_review = true`)

Se debe marcar `requires_review = true` **ÚNICAMENTE** en los siguientes casos:

1.  **Sarcasmo / Ironía (`SARCOSM_IRONY`):** El texto dice algo pretendidamente positivo pero el contexto demuestra mofa o crítica evidente.
    *   *Ejemplo:* *"Sí, claro, llega super puntual... como media hora después."*
2.  **Contradicción en el MISMO Aspecto (`SAME_ASPECT_CONTRADICTION`):** Se afirma algo positivo y negativo sobre la **MISMA** dimensión dentro de la misma oración.
    *   *Ejemplo:* *"Explica super claro al principio, pero su claridad es pésima durante el resto de la clase."*
3.  **Ambigüedad / Expresiones Inciertas (`LOW_CONFIDENCE`):** Uso de modismos indescifrables, sarcasmo velado o lenguaje excesivamente ambiguo.

---

## 7. Acuerdo Inter-Anotador (Inter-Annotator Agreement)

Para garantizar la validez científica del Conjunto de Oro:
*   Una muestra aleatoria de 30 comentarios del conjunto de desarrollo será anotada de forma independiente por un segundo anotador humano.
*   Se calculará el índice **Cohen's Kappa ($\kappa$)** sobre la clasificación de aspectos y sentimientos. Se requiere un acuerdo $\kappa \ge 0.75$ para considerar validado el dataset.
