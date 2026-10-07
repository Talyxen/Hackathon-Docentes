import React, { useEffect, useState } from 'react';
import { apiService, type ComparativeResponse } from '../services/api';
import { Loader, ErrorMessage } from '../components/UI/Basic';

export const Comparative: React.FC = () => {
  const [data, setData] = useState<ComparativeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadComparative = async () => {
      try {
        const res = await apiService.getComparative();
        setData(res);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    loadComparative();
  }, []);

  if (loading) return <Loader />;
  if (error) return <ErrorMessage message={error} />;
  if (!data || data.teachers.length === 0) return <p>No hay docentes analizados para comparar.</p>;

  return (
    <div>
      <h1>Comparador de Docentes</h1>
      <p className="no-print" style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
        El score mostrado aplica el suavizado Bayesiano (Shrinkage) basado en una media global de {data.global_batch_priors.M_a} 
        y un parámetro de sensibilidad m = {data.sensitivity_m}.
      </p>

      <div className="panel">
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid var(--border-color)' }}>
              <th style={{ padding: '1rem' }}>Docente</th>
              <th style={{ padding: '1rem' }}>Score Ajustado</th>
              <th style={{ padding: '1rem' }}>Comentarios Válidos (n)</th>
              <th style={{ padding: '1rem' }}>Aspecto Más Fuerte</th>
              <th style={{ padding: '1rem' }}>Revisión</th>
            </tr>
          </thead>
          <tbody>
            {data.teachers.map((t, idx) => {
              const bestAspect = t.aspects.length > 0 ? t.aspects.reduce((prev, curr) => (prev.score > curr.score) ? prev : curr) : null;
              
              return (
                <tr key={t.teacher_id} style={{ borderBottom: '1px solid var(--border-color)', backgroundColor: idx % 2 === 0 ? 'var(--surface-color)' : 'var(--bg-color)' }}>
                  <td style={{ padding: '1rem', fontWeight: 700 }}>
                    {t.name}
                    {t.has_insufficient_sample && <span style={{ color: 'var(--warning-color)', fontSize: '0.75rem', display: 'block' }}>(Provisional)</span>}
                  </td>
                  <td style={{ padding: '1rem', fontSize: '1.25rem', color: t.has_insufficient_sample ? 'var(--warning-color)' : 'var(--success-color)', fontWeight: 700 }}>
                    {t.general_score.toFixed(1)}
                  </td>
                  <td style={{ padding: '1rem' }}>{t.score_details?.n || 0} n</td>
                  <td style={{ padding: '1rem' }}>{bestAspect ? `${bestAspect.name} (${bestAspect.score.toFixed(1)})` : 'N/A'}</td>
                  <td style={{ padding: '1rem' }}>
                    {t.score_details?.pending_review > 0 ? (
                      <span style={{ color: 'var(--warning-color)', fontWeight: 700 }}>{t.score_details.pending_review} dudosos pendientes</span>
                    ) : (
                      <span style={{ color: 'var(--success-color)' }}>0 dudosos pendientes</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
