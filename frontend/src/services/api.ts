const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

export interface AspectScore {
  name: string;
  score: number;
  n: number;
  has_insufficient_sample: boolean;
}

export interface Recommendation {
  action: string;
  reason: string;
}

export interface TeacherScoreResponse {
  teacher_id: string;
  name: string;
  general_score: number;
  total_comments: number;
  aspects: AspectScore[];
  recommendations: Recommendation[];
  has_insufficient_sample: boolean;
  score_details: Record<string, any>;
}

export interface ComparativeResponse {
  teachers: TeacherScoreResponse[];
  global_batch_priors: Record<string, number>;
  sensitivity_m: number;
}

export const apiService = {
  async getTeachers(m: number = 5): Promise<TeacherScoreResponse[]> {
    const res = await fetch(`${API_BASE_URL}/teachers?m=${m}`);
    if (!res.ok) throw new Error('Error al obtener los docentes');
    return res.json();
  },

  async getTeacher(id: string, m: number = 5): Promise<TeacherScoreResponse> {
    const res = await fetch(`${API_BASE_URL}/teachers/${id}?m=${m}`);
    if (!res.ok) throw new Error('Error al obtener el docente');
    return res.json();
  },

  async getComparative(): Promise<ComparativeResponse> {
    const res = await fetch(`${API_BASE_URL}/comparative`);
    if (!res.ok) throw new Error('Error al obtener la comparativa');
    return res.json();
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

  async reviewComment(id: string, payload: any): Promise<any> {
    const res = await fetch(`${API_BASE_URL}/comments/${id}/review`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('Error al guardar revisión');
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
