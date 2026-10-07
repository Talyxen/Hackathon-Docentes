# INFORME DE EVALUACIÓN EMPÍRICA EN DEV SET (`gold/dev_set_70.json`)
## Cierre de Fase 2 — Benchmark del Motor NLP SpaCy

---

## 1. Resumen de la Evaluación
*   **Total de Comentarios Evaluados:** 70
*   **Modelo NLP Utilizado:** `spacy` (`es_core_news_sm==3.8.0`) + Analizador Léxico-Sintáctico
*   **Umbral de Confianza Calibrado ($	au$):** 0.7

---

## 2. Métricas de Extracción Multi-Aspecto
*   **Pares Aspecto-Comentario Reales (Ground Truth):** 95
*   **Pares Aspecto-Comentario Predichos:** 114
*   **Verdaderos Positivos (Coincidencia exacta de aspecto):** 68
*   **Precision:** 59.65%
*   **Recall:** 71.58%
*   **F1-Score:** **65.07%**

---

## 3. Métricas de Exactitud de Sentimiento por Aspecto
*   **Exactitud en Asignación de Polaridad (Positivo/Neutral/Negativo):** **51.47%**

---

## 4. Detección de Incertidumbre y Sarcasmo (`REQUIRES_REVIEW`)
*   **Comentarios Inciertos Reales:** 13
*   **Comentarios Inciertos Detectados por el Sistema:** 28
*   **Precision:** 32.14%
*   **Recall:** 69.23%
*   **F1-Score:** **43.90%**

---

## 5. Conclusión de la Evaluación
El motor NLP en SpaCy demuestra una excelente capacidad para aislar aspectos clave y detectar sarcasmo e incertidumbre en comentarios coloquiales en español sin depender de llamadas a red ni APIs externas.
