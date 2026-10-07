const API_BASE_URL = (import.meta.env.VITE_API_URL && import.meta.env.VITE_API_URL !== '/api') 
  ? import.meta.env.VITE_API_URL 
  : 'https://hackaton-backend-gamma.vercel.app/api';


export interface AspectScore {
  name: string;
  score: number;
  observed_score: number;
  bayes_score: number;
  n: number;
  has_insufficient_sample: boolean;
  positive_count: number;
  neutral_count: number;
  negative_count: number;
}

export interface Recommendation {
  action: string;
  reason: string;
  aspect_name?: string;
  category?: string;
}

export interface TeacherScoreResponse {
  teacher_id: string;
  display_name: string;
  name: string; // compatibility alias
  general_score: number;
  ranking_category: string;
  total_valid_pairs: number;
  total_comments: number; // compatibility alias
  pending_reviews_count: number;
  pending_ratio: number;
  has_insufficient_sample: boolean;
  score_details: {
    n: number;
    pending_review: number;
    ranking_category: string;
  };
  aspects: AspectScore[];
  aspectsDict: Record<string, AspectScore>;
  strengths: string[];
  critical_areas: string[];
  recommendations: Recommendation[];
}

export interface ComparativeResponse {
  teachers: TeacherScoreResponse[];
  global_batch_priors: Record<string, number>;
  sensitivity_m: number;
}

export function normalizeTeacher(raw: any): TeacherScoreResponse {
  const teacher_id = raw.teacher_id || raw.id || '';
  const display_name = raw.display_name || raw.name || 'Docente Sin Nombre';
  const general_score = typeof raw.general_score === 'number' ? raw.general_score : 0;
  const ranking_category = raw.ranking_category || 'PROVISIONAL_MUESTRA_BAJA';
  const total_valid_pairs = typeof raw.total_valid_pairs === 'number' ? raw.total_valid_pairs : (raw.total_comments || 0);
  const pending_reviews_count = typeof raw.pending_reviews_count === 'number' ? raw.pending_reviews_count : (raw.score_details?.pending_review || 0);
  const pending_ratio = typeof raw.pending_ratio === 'number' ? raw.pending_ratio : 0;
  const has_insufficient_sample = ranking_category !== 'OFICIAL_PRINCIPAL' || Boolean(raw.has_insufficient_sample);

  const aspectsList: AspectScore[] = [];
  const aspectsDict: Record<string, AspectScore> = {};

  if (raw.aspects) {
    if (Array.isArray(raw.aspects)) {
      raw.aspects.forEach((a: any) => {
        const item: AspectScore = {
          name: a.name || a.aspect_name || '',
          score: typeof a.bayes_score === 'number' ? a.bayes_score : (a.score || 0),
          observed_score: typeof a.observed_score === 'number' ? a.observed_score : 0,
          bayes_score: typeof a.bayes_score === 'number' ? a.bayes_score : 0,
          n: typeof a.sample_count === 'number' ? a.sample_count : (a.n || 0),
          has_insufficient_sample: Boolean(a.has_insufficient_sample),
          positive_count: a.positive_count || 0,
          neutral_count: a.neutral_count || 0,
          negative_count: a.negative_count || 0
        };
        aspectsList.push(item);
        aspectsDict[item.name] = item;
      });
    } else if (typeof raw.aspects === 'object') {
      Object.entries(raw.aspects).forEach(([k, v]: [string, any]) => {
        const item: AspectScore = {
          name: v.aspect_name || k,
          score: typeof v.bayes_score === 'number' ? v.bayes_score : (v.score || 0),
          observed_score: typeof v.observed_score === 'number' ? v.observed_score : 0,
          bayes_score: typeof v.bayes_score === 'number' ? v.bayes_score : 0,
          n: typeof v.sample_count === 'number' ? v.sample_count : (v.n || 0),
          has_insufficient_sample: Boolean(v.has_insufficient_sample),
          positive_count: v.positive_count || 0,
          neutral_count: v.neutral_count || 0,
          negative_count: v.negative_count || 0
        };
        aspectsList.push(item);
        aspectsDict[item.name] = item;
      });
    }
  }

  const recommendationsList: Recommendation[] = [];
  if (raw.recommendations && Array.isArray(raw.recommendations)) {
    raw.recommendations.forEach((r: any) => {
      recommendationsList.push({
        action: r.action || r.recommendation_text || 'Recomendación',
        reason: r.reason || r.recommendation_text || '',
        aspect_name: r.aspect_name,
        category: r.category
      });
    });
  }

  return {
    teacher_id,
    display_name,
    name: display_name,
    general_score,
    ranking_category,
    total_valid_pairs,
    total_comments: total_valid_pairs,
    pending_reviews_count,
    pending_ratio,
    has_insufficient_sample,
    score_details: {
      n: total_valid_pairs,
      pending_review: pending_reviews_count,
      ranking_category
    },
    aspects: aspectsList,
    aspectsDict,
    strengths: raw.strengths || [],
    critical_areas: raw.critical_areas || [],
    recommendations: recommendationsList
  };
}

export const apiService = {
  async getTeachers(m: number = 5): Promise<TeacherScoreResponse[]> {
    const res = await fetch(`${API_BASE_URL}/teachers?m=${m}`);
    if (!res.ok) throw new Error('Error al obtener los docentes');
    const data = await res.json();
    return Array.isArray(data) ? data.map(normalizeTeacher) : [];
  },

  async getTeacher(id: string, m: number = 5): Promise<TeacherScoreResponse> {
    const res = await fetch(`${API_BASE_URL}/teachers/${id}?m=${m}`);
    if (!res.ok) throw new Error('Error al obtener el docente');
    const data = await res.json();

    try {
      const recRes = await fetch(`${API_BASE_URL}/recommendations/${id}`);
      if (recRes.ok) {
        const recData = await recRes.json();
        if (recData && Array.isArray(recData.recommendations)) {
          data.recommendations = recData.recommendations.map((r: any) => ({
            action: r.aspect_name ? `Aspecto ${r.aspect_name} (${r.category || 'Atención'})` : (r.action || 'Acción sugerida'),
            reason: r.recommendation_text || r.reason || '',
            aspect_name: r.aspect_name,
            category: r.category
          }));
        }
      }
    } catch (e) {
      // Recommendations optional
    }

    return normalizeTeacher(data);
  },

  async getComparative(): Promise<ComparativeResponse> {
    const res = await fetch(`${API_BASE_URL}/comparative`);
    if (!res.ok) throw new Error('Error al obtener la comparativa');
    const data = await res.json();
    return {
      teachers: Array.isArray(data.teachers) ? data.teachers.map(normalizeTeacher) : [],
      global_batch_priors: data.global_batch_priors || {},
      sensitivity_m: data.sensitivity_m || 5.0
    };
  },

  async getStats(): Promise<any> {
    const res = await fetch(`${API_BASE_URL}/stats`);
    if (!res.ok) throw new Error('Error al obtener estadísticas');
    return res.json();
  },

  async getComments(params: Record<string, any> = {}): Promise<any> {
    const qs = new URLSearchParams(params).toString();
    const res = await fetch(`${API_BASE_URL}/comments?${qs}`);
    if (!res.ok) throw new Error('Error al obtener comentarios');
    return res.json();
  },

  async getPendingReviews(): Promise<any[]> {
    const apiKey = sessionStorage.getItem('api_key') || 'hackathon_secret_key_2026_dev';
    const res = await fetch(`${API_BASE_URL}/review/pending`, {
      headers: { 'X-API-Key': apiKey }
    });
    if (!res.ok) throw new Error('Error al obtener revisiones pendientes');
    return res.json();
  },

  async reviewComment(payload: { classification_id: string; reviewer_name: string; action: string; new_aspect?: string; new_sentiment?: string; review_reason?: string }): Promise<any> {
    const apiKey = sessionStorage.getItem('api_key') || 'hackathon_secret_key_2026_dev';
    const res = await fetch(`${API_BASE_URL}/review/submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey
      },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => null);
      throw new Error(errData?.detail || 'Error al guardar revisión');
    }
    return res.json();
  },

  async uploadCSV(file: File): Promise<any> {
    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch(`${API_BASE_URL}/upload`, {
      method: 'POST',
      body: formData,
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => null);
      throw new Error(errorData?.detail || 'Error en la subida del archivo');
    }
    return res.json();
  }
};
