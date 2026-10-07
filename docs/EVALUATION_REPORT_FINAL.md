# INFORME DE EVALUACIÓN FINAL EN TEST SET (`test_set_50.json`)
## Cierre de Fase 2 — Benchmark del Motor NLP SpaCy

**NOTA DE AUDITORÍA**: Esta evaluación se ha ejecutado UNA SOLA VEZ sobre el test set cerrado.
**HASH DEL ARCHIVO**: `c4da25e6c3d2a78d93f68bc37f6b9bc018f758e4eea3ea31f9951d95266c7307`

---

## 1. Resumen de la Evaluación
*   **Total de Comentarios Evaluados:** 50
*   **Modelo NLP Utilizado:** `spacy` (`es_core_news_sm==3.8.0`) + Analizador Léxico-Sintáctico
*   **Umbral de Confianza Calibrado ($\tau$):** 0.7

---

## 2. Métricas de Extracción Multi-Aspecto
*   **Pares Aspecto-Comentario Reales (Ground Truth):** 56
*   **Pares Aspecto-Comentario Predichos:** 71
*   **Verdaderos Positivos (Coincidencia exacta de aspecto):** 26
*   **Precision:** 36.62%
*   **Recall:** 46.43%
*   **F1-Score:** **40.94%**

---

## 3. Métricas de Exactitud de Sentimiento por Aspecto
*   **Exactitud en Asignación de Polaridad (Positivo/Neutral/Negativo):** **57.69%**

---

## 4. Detección de Incertidumbre y Sarcasmo (`REQUIRES_REVIEW`)
*   **Comentarios Inciertos Reales:** 6
*   **Comentarios Inciertos Detectados por el Sistema:** 35
*   **Precision:** 11.43%
*   **Recall:** 66.67%
*   **F1-Score:** **19.51%**
