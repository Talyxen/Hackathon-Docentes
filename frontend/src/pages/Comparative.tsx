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
  if (!data || data.teachers.length === 0) return <p style={{ padding: '40px', textAlign: 'center', color: 'var(--mut)' }}>No hay docentes analizados para comparar.</p>;

  const avgPrior = Object.values(data.global_batch_priors || {}).reduce((a, b) => a + b, 0) / (Object.keys(data.global_batch_priors || {}).length || 1);

  return (
    <div>
      <h1 style={{ marginBottom: '20px' }}>Comparador de Docentes</h1>
      <p className="sub no-print" style={{ marginBottom: '1.5rem' }}>
        El score mostrado aplica el suavizado Bayesiano (Shrinkage) basado en priors de lote ({avgPrior ? avgPrior.toFixed(1) : 50.0}) 
        y un parámetro de sensibilidad m = {data.sensitivity_m}.
      </p>

      <div className="panel tw">
        <table>
          <thead>
            <tr>
              <th>Docente</th>
              <th>Score Ajustado</th>
              <th>Evaluaciones (n)</th>
              <th>Aspecto Más Fuerte</th>
              <th>Estado de Revisión</th>
            </tr>
          </thead>
          <tbody>
            {data.teachers.map((t) => {
              const name = t.display_name || t.name || 'Docente';
              const initials = name.split(' ').slice(0, 2).map(x => x[0]).join('') || 'D';
              const bestAspect = t.aspects && t.aspects.length > 0 
                ? t.aspects.reduce((prev, curr) => (prev.score > curr.score) ? prev : curr) 
                : null;

              return (
                <tr key={t.teacher_id}>
                  <td>
                    <span className="av" style={{ marginRight: '12px' }}>{initials}</span>
                    <strong style={{ verticalAlign: 'middle' }}>{name}</strong>
                    {t.has_insufficient_sample && <span className="bd s1" style={{ marginLeft: '10px' }}>Provisional</span>}
                  </td>
                  <td>
                    <b className={t.has_insufficient_sample ? 'text-wa' : 'text-ok'} style={{ fontSize: '16px' }}>
                      {t.general_score.toFixed(1)}
                    </b>
                  </td>
                  <td>{t.total_valid_pairs} n</td>
                  <td style={{ textTransform: 'capitalize' }}>
                    {bestAspect ? `${bestAspect.name} (${bestAspect.score.toFixed(1)})` : 'N/A'}
                  </td>
                  <td>
                    {t.pending_reviews_count > 0 ? (
                      <span className="bd s1">{t.pending_reviews_count} dudosos pendientes</span>
                    ) : (
                      <span className="bd s0">0 dudosos pendientes</span>
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
