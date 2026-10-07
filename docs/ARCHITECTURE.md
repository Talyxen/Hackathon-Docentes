# ARQUITECTURA TÉCNICA Y ESPECIFICACIÓN DEL SISTEMA
## Plataforma de Inteligencia Académica — Reto S-1 "Los datos no hablan solos"

---

## 1. Visión General de la Arquitectura

La Plataforma de Inteligencia Académica está diseñada como una solución web desacoplada de alto rendimiento, determinista, explicable e insensible a fallos de red. Sigue los principios de **Clean Architecture** y **Diseño Orientado al Dominio (DDD)**.

```mermaid
graph TD
    subgraph Frontend [Cliente Web React + Vite]
        UI[Interfaz de Usuario - TailwindCSS]
        Comp[Comparador & Dashboard]
        RevCenter[Centro de Revisión Humana]
        Uploader[Validador de Archivos]
    end

    subgraph Backend [FastAPI Service - Python 3.12]
        API[API Router REST & Healthcheck]
        Validator[Ingestion & Magic-Byte Validator]
        NLP Engine[Motor NLP SpaCy Multi-Aspecto]
        Scoring Engine[Motor de Scoring Bayesiano & Renormalización]
        Uncertainty Filter[Filtro de Sarcasmo & Incertidumbre]
        Recommender[Generador de Recomendaciones Data-Driven]
    end

    subgraph Data [Persistencia SQLite Nivel Lote]
        DB[(SQLite DB / SQLAlchemy)]
    end

    UI --> API
    Uploader --> Validator --> API
    API --> NLP Engine
    NLP Engine --> Uncertainty Filter
    Uncertainty Filter --> RevCenter
    RevCenter -->|c = 1.0| Scoring Engine
    NLP Engine -->|Confianza c_i,a| Scoring Engine
    Scoring Engine --> Recommender
    API --> DB
```

---

## 2. Comparativa de Estrategias NLP (Hipótesis a Validar en Benchmark)

Todas las métricas de latencia y desempeño representan **hipótesis de trabajo que se validarán empíricamente** contra el Conjunto de Oro (`gold/test_set_50.json`) al finalizar la Fase 2.

| Estrategia NLP | Precisión Multi-Aspecto (Hipótesis) | Latencia Estimada por Comentario | Tiempo de Desarrollo | Costo | Reproducibilidad | Disponibilidad en Demo | Privacidad de Datos | Facilidad de Despliegue |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Reglas Léxicas Rígidas** | Por medir | $< 5\text{ ms}$ | Rápido | $0 USD | 100% Determinista | Offline Nativo | Total (Local) | Alta |
| **Modelo Local Supervisado**| Por medir | $< 25\text{ ms}$ | Alto | $0 USD | Determinista | Offline Nativo | Total (Local) | Media |
| **Modelo Pre-entrenado Local (Transformer/RoBERTa)** | Por medir | $\approx 150 - 300\text{ ms}$ | Medio-Alto | $0 USD | Determinista | Offline (Requiere GPU) | Total (Local) | Media-Baja |
| **LLM por API REST (OpenAI/Gemini)** | Por medir | $\approx 800 - 2500\text{ ms}$ | Rápido | Variable ($/token) | No Determinista | Riesgo de Red / API Key | Nula (Salen datos) | Requiere Secrets |
| **Híbrida Propuesta (SpaCy es_core_news_sm + Sintaxis)** | **Por validar en dev set** | **$< 15\text{ ms}$** | **Medio** | **$0 USD** | **100% Determinista** | **Offline Nativo** | **Total (Local)** | **Alta** |

---

## 3. Especificación del Motor NLP y Métricas de Incertidumbre

### 3.1. Señales y Cálculo de Confianza ($c_{i,a}$)
La confianza atribuida a la asignación de un aspecto $a$ y su sentimiento en el comentario $i$ se calcula como una combinación lineal ponderada de cuatro señales sintáctico-semánticas:

$$c_{i,a} = w_{lex} \cdot S_{lex} + w_{syn} \cdot S_{syn} + w_{pol} \cdot S_{pol} - P_{sarcasm}$$

Donde:
*   $S_{lex} \in [0, 1]$: Coincidencia del lema y términos clave del aspecto en SpaCy.
*   $S_{syn} \in [0, 1]$: Proximidad en el árbol de dependencias sintácticas entre el sujeto/aspecto y el núcleo adjetival/verbal.
*   $S_{pol} \in [0, 1]$: Nitidez de polaridad (ausencia de modificadores neutros o ambiguos).
*   $P_{sarcasm} \in [0, 0.4]$: Penalización por presencia de patrones irónicos o signos de puntuación anómalos.
*   **Pesos por defecto:** $w_{lex} = 0.4$, $w_{syn} = 0.3$, $w_{pol} = 0.3$.
*   **Regla de Oro:** Para todo comentario **confirmado o editado por un revisor humano**, la confianza se fija inequívocamente en $c_{i,a} = 1.0$.

### 3.2. Criterios de Marcado de Incertidumbre (`REQUIRES_REVIEW = True`)
Un comentario se deriva automáticamente al **Centro de Revisión Humana** si:
1.  **Baja Confianza:** $c_{i,a} < \tau$ (donde el umbral $\tau$ se determinará por calibración en la Fase 2).
2.  **Sarcasmo / Ironía:** Presencia de conectores de contraste con polaridad inversa, uso de comillas irónicas (ej. *su "gran" puntualidad*), o elipsis sospechosa.
3.  **Contradicción en el Mismo Aspecto:** Mención de aspectos idénticos con sentimientos opuestos dentro de la misma cláusula (ej. *"Explica claro al inicio pero su claridad es pésima al final"*).
    *   *Nota:* Comentarios con aspectos distintos y polaridades opuestas (ej. *"Explica bien [Metodología (+)], pero llega tarde [Puntualidad (-)]"*) son **multi-aspecto legítimos** y **NO se marcan como inciertos**.

### 3.3. Calibración del Umbral ($\tau$) y Curva Cobertura vs. Exactitud
El objetivo de la calibración sobre `gold/dev_set_70.json` es encontrar el valor óptimo de $\tau$ que maximice el $F1$-Score global mientras mantiene una tasa razonable de **Cobertura (Coverage)**:

$$\text{Coverage} = \frac{\text{Comentarios Clasificados Automáticamente con } c_{i,a} \ge \tau}{\text{Total de Comentarios del Lote}}$$

Se trazará la curva de **Cobertura vs. Exactitud** con intervalos de confianza de Wilson ($\alpha = 0.05$) para justificar la elección de $\tau$ ante los evaluadores.

---

## 4. Sistema de Scoring Bayesiano, Renormalización y Rankings

### 4.1. Fórmula del Score Observado y Bayesiano
Para un docente $d$ y un aspecto $a$:

$$Score_{Obs}(a, d) = \frac{\sum_{i=1}^{n_{a,d}} (S_{i,a} \cdot c_{i,a})}{\sum_{i=1}^{n_{a,d}} c_{i,a}} \times 100$$

Donde $S_{i,a} \in \{1.0 \text{ (Positivo)}, 0.5 \text{ (Neutral)}, 0.0 \text{ (Negativo)}\}$.

El **Score Bayesiano Ajustado** regula la varianza según la muestra:

$$Score_{Bayes}(a, d) = \frac{n_{a,d} \cdot Score_{Obs}(a, d) + m \cdot M_a}{n_{a,d} + m}$$

*   $n_{a,d}$: Número de **pares válidos comentario-aspecto** (excluyendo dudosos sin revisar).
*   $M_a$: Prior global del lote subido. Si el lote carece de suficientes datos, se utiliza la baseline documentada $M_a = 50.0$.
*   $m$: Parámetro de sensibilidad. Se analizará en el rango $m \in \{1, 3, 5\}$ (fijado en $m = 5$ por defecto).

### 4.2. Exclusión de Aspectos "Sin Datos" y Renormalización
Si $n_{a,d} < n_{min,a}$ (donde $n_{min,a} = 3$ pares por aspecto):
*   El aspecto $a$ se marca como **`"Muestra insuficiente"`** y se **excluye** de la suma ponderada del score general.
*   Los pesos teóricos $w_a = 0.125$ de los aspectos válidos ($A_{val,d}$) se renormalizan:

$$w'_{a,d} = \frac{w_a}{\sum_{k \in A_{val,d}} w_k}$$

$$Score_{General}(d) = \sum_{a \in A_{val,d}} w'_{a,d} \cdot Score_{Bayes}(a, d)$$

### 4.3. Separación de Rankings y Control de Pendientes de Revisión
*   **Ranking Oficial Principal:** Docentes con $N_{total,d} \ge 10$ pares válidos y una proporción de comentarios pendientes $\frac{n_{pendientes,d}}{N_{total,d}} \le 0.30$.
*   **Ranking Provisional:** Se asignan a esta categoría:
    1. Docentes con baja muestra total ($N_{total,d} < 10$).
    2. Docentes con alta proporción de comentarios pendientes ($\frac{n_{pendientes,d}}{N_{total,d}} > 0.30$).

---

## 5. Estrategia de Recomendaciones Automáticas Data-Driven

Las recomendaciones **NO son frases genéricas**; se generan algorítmicamente combinando evidencia estadística y plantillas estructuradas cuando $n_{a,d} \ge 3$:

| Regla de Rendimiento | Condición Numérica | Plantilla de Recomendación Generada |
| :--- | :--- | :--- |
| **Oportunidad Crítica** | $Score_{Bayes}(a,d) < 65.0$ | *"Se recomienda fortalecer el aspecto de **{aspecto}** (Score: {score:.1f}), debido a una concentración del {pct_neg:.0f}% de comentarios negativos en {n_neg} de {n_total} menciones analizadas."* |
| **Fortaleza Destacada** | $Score_{Bayes}(a,d) \ge 85.0$ | *"Se destaca la dimensión de **{aspecto}** (Score: {score:.1f}) como una fortaleza institucional consolidada, respaldada por un {pct_pos:.0f}% de valoraciones positivas en {n_pos} menciones."* |
| **Desempeño Neutro / Estable** | $65.0 \le Score_{Bayes}(a,d) < 85.0$ | *"El aspecto **{aspecto}** mantiene un desempeño estable (Score: {score:.1f}). Se sugiere mantener el seguimiento de las sugerencias estudiantiles."* |

---

## 6. Modelo de Datos Relacional (SQLite)

El score de los docentes se **calcula dinámicamente bajo demanda** a partir de las clasificadores válidos y revisiones humanas para mantener coherencia absoluta en tiempo real.

```sql
-- 1. Docentes Normalizados
CREATE TABLE IF NOT EXISTS teachers (
    id TEXT PRIMARY KEY,
    normalized_name TEXT NOT NULL UNIQUE, -- Trim, lowercase, sin acentos (NFKD)
    display_name TEXT NOT NULL,           -- Nombre legible original
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_teachers_normalized ON teachers(normalized_name);

-- 2. Lotes de Carga
CREATE TABLE IF NOT EXISTS batch_uploads (
    id TEXT PRIMARY KEY,
    filename TEXT NOT NULL,
    file_size_bytes INTEGER NOT NULL,
    total_rows INTEGER NOT NULL,
    valid_rows INTEGER NOT NULL,
    rejected_rows_count INTEGER NOT NULL,
    upload_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Registros Rechazados (Para Reporte Visual de Ingesta)
CREATE TABLE IF NOT EXISTS rejected_rows (
    id TEXT PRIMARY KEY,
    batch_id TEXT NOT NULL,
    row_index INTEGER NOT NULL,
    raw_content TEXT,
    rejection_reason TEXT NOT NULL,
    FOREIGN KEY (batch_id) REFERENCES batch_uploads(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_rejected_batch ON rejected_rows(batch_id);

-- 4. Comentarios Ingeridos Válidos
CREATE TABLE IF NOT EXISTS comments (
    id TEXT PRIMARY KEY,
    batch_id TEXT NOT NULL,
    teacher_id TEXT NOT NULL,
    raw_text TEXT NOT NULL,
    row_index INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (batch_id) REFERENCES batch_uploads(id) ON DELETE CASCADE,
    FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_comments_teacher ON comments(teacher_id);
CREATE INDEX IF NOT EXISTS idx_comments_batch ON comments(batch_id);

-- 5. Clasificaciones Multi-Aspecto
CREATE TABLE IF NOT EXISTS aspect_classifications (
    id TEXT PRIMARY KEY,
    comment_id TEXT NOT NULL,
    aspect_name TEXT NOT NULL,
    sentiment TEXT NOT NULL,               -- POSITIVE, NEUTRAL, NEGATIVE
    evidence_span TEXT NOT NULL,           -- Frase exacta extraída
    confidence_score REAL NOT NULL,
    requires_review BOOLEAN DEFAULT FALSE,
    uncertainty_reason TEXT,
    status TEXT DEFAULT 'AUTOMATIC',       -- AUTOMATIC, HUMAN_CONFIRMED, HUMAN_EDITED, EXCLUDED
    engine_version TEXT NOT NULL,          -- Versión del motor NLP (ej. spacy_es_v3.8)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (comment_id) REFERENCES comments(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_aspect_comment ON aspect_classifications(comment_id);
CREATE INDEX IF NOT EXISTS idx_aspect_review ON aspect_classifications(requires_review);
CREATE INDEX IF NOT EXISTS idx_aspect_name ON aspect_classifications(aspect_name);
CREATE INDEX IF NOT EXISTS idx_aspect_status ON aspect_classifications(status);

-- 6. Auditoría de Revisiones Humanas
CREATE TABLE IF NOT EXISTS human_reviews (
    id TEXT PRIMARY KEY,
    classification_id TEXT NOT NULL,
    reviewer_name TEXT NOT NULL,
    action TEXT NOT NULL,                  -- CONFIRM, EDIT, EXCLUDE
    original_values_json TEXT NOT NULL,
    new_values_json TEXT NOT NULL,
    review_reason TEXT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (classification_id) REFERENCES aspect_classifications(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_reviews_classification ON human_reviews(classification_id);
```

---

## 7. Catálogo Completo de Endpoints REST API

| Método | Endpoint | Descripción | Autenticación Requerida |
| :--- | :--- | :--- | :--- |
| `GET` | `/health` | Estado del servicio backend y conectividad a base de datos | No |
| `POST` | `/api/upload` | Ingesta y validación estricta de archivos (CSV/XLSX) | **Sí (`X-API-Key`)** |
| `GET` | `/api/batches/{id}/summary` | Resumen de registros procesados y rechazados de un lote | No |
| `GET` | `/api/comments` | Explorador paginado de comentarios con filtros multi-criterio | No |
| `GET` | `/api/review/pending` | Lista de comentarios marcados para revisión humana | No |
| `POST` | `/api/review/submit` | Aplicar corrección/confirmación/exclusión humana con log | **Sí (`X-API-Key`)** |
| `GET` | `/api/teachers` | Listado de docentes con scores dinámicos (Oficial vs Provisional)| No |
| `GET` | `/api/teachers/{id}` | Desglose completo de aspectos, evidencia y score de un docente | No |
| `GET` | `/api/comparative` | Matriz de comparación directa entre múltiples docentes | No |
| `GET` | `/api/recommendations/{id}` | Recomendaciones automáticas data-driven para un docente | No |
| `GET` | `/api/report` | Informe ejecutivo global estructurado (listo para vista de impresión) | No |

---

## 8. Seguridad, Claves de Entorno y Control de Tasa

*   **Clave Secreta de Producción:** Se especifica formalmente que la variable `API_SECRET_KEY` de producción **DEBE SER OBLIGATORIAMENTE DIFERENTE** a la proporcionada en el archivo de plantilla `.env.example`.
*   **Encabezado HTTP:** Las operaciones mutables (`/api/upload` y `/api/review/submit`) requieren la cabecera `X-API-Key: <API_SECRET_KEY>`.
*   **Auditoría Imputable:** El campo `reviewer_name` es obligatorio en todas las llamadas a `/api/review/submit` y se guarda en la tabla `human_reviews`.

---

## 9. Criterios de Accesibilidad y Pruebas (E2E & Integración)

1.  **Accesibilidad (WCAG 2.1 AA):**
    *   Navegación por teclado completa (`tabindex`, `focus-visible`).
    *   Ratio de contraste de texto mínimo $4.5:1$ en modo oscuro/claro.
    *   Etiquetas semánticas HTML5 (`<main>`, `<nav>`, `<section>`, `<article>`) y atributos `aria-label` en tablas y gráficos.
2.  **Pruebas Estratégicas:**
    *   **Unitarias:** Cobertura con `pytest` para motor de scoring, renormalización, validación de MIME/Magic-bytes y heurísticas de incertidumbre.
    *   **Integración:** Flujo API FastAPI completando ingesta de archivo, cambio de estado en BD y actualización de score.
    *   **E2E (End-to-End):** Script ejecutable de prueba E2E que simula la carga de un lote CSV, consulta la lista de dudosos, aplica una revisión humana y verifica la actualización dinámica del ranking.
