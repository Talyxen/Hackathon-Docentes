import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { apiService, type TeacherScoreResponse } from '../services/api';
import { Loader, ErrorMessage } from '../components/UI/Basic';

export const TeacherDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [teacher, setTeacher] = useState<TeacherScoreResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async (teacherId: string) => {
      try {
        setLoading(true);
        const data = await apiService.getTeacher(teacherId);
        setTeacher(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      loadData(id);
    }
  }, [id]);

  if (loading) return <Loader />;
  if (error) return <ErrorMessage message={error} />;
  if (!teacher) return <ErrorMessage message="No se encontró el docente." />;

  return (
    <div>
      <Link to="/" style={{ display: 'inline-block', marginBottom: '1rem', color: 'var(--text-muted)' }}>
        &larr; Volver al Dashboard
      </Link>
      
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ marginBottom: '0.25rem' }}>{teacher.name}</h1>
          <div style={{ color: 'var(--text-muted)' }}>
            Basado en {teacher.total_comments} comentarios procesados
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '3rem', fontWeight: 700, color: teacher.has_insufficient_sample ? 'var(--warning-color)' : 'var(--success-color)', lineHeight: 1 }}>
            {teacher.general_score.toFixed(1)}
          </div>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            Score Global {teacher.has_insufficient_sample && '(Provisional)'}
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2">
        <div className="panel">
          <h2 style={{ fontSize: '1.25rem' }}>Desglose por Aspectos</h2>
          <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {teacher.aspects.map(aspect => (
              <div key={aspect.name}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                  <span style={{ fontWeight: 500 }}>{aspect.name}</span>
                  <span>{aspect.score.toFixed(1)}/100</span>
                </div>
                <div style={{ width: '100%', height: '8px', backgroundColor: 'var(--border-color)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ 
                    width: `${aspect.score}%`, 
                    height: '100%', 
                    backgroundColor: aspect.has_insufficient_sample ? 'var(--warning-color)' : 'var(--primary-color)',
                    transition: 'width 0.5s ease'
                  }}></div>
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                  Muestra: {aspect.n} evaluaciones {aspect.has_insufficient_sample && ' (Insuficiente)'}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="panel">
          <h2 style={{ fontSize: '1.25rem' }}>Recomendaciones Automáticas</h2>
          {teacher.recommendations.length > 0 ? (
            <ul style={{ marginTop: '1.5rem', paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {teacher.recommendations.map((rec, idx) => (
                <li key={idx} style={{ color: 'var(--text-main)' }}>
                  <strong>{rec.action}</strong>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.25rem' }}>{rec.reason}</p>
                </li>
              ))}
            </ul>
          ) : (
            <div style={{ marginTop: '1.5rem', color: 'var(--text-muted)' }}>
              No hay recomendaciones específicas basadas en la muestra actual.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
