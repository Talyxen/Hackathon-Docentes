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

  const displayName = teacher.display_name || teacher.name || 'Docente';
  const initials = displayName.split(' ').slice(0, 2).map(x => x[0]).join('') || 'D';

  return (
    <div>
      <Link to="/" style={{ display: 'inline-block', marginBottom: '1.5rem', color: 'var(--ac)', textDecoration: 'none', fontWeight: 600 }}>
        &larr; Volver al Dashboard
      </Link>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span className="av" style={{ width: '48px', height: '48px', fontSize: '20px' }}>{initials}</span>
            {displayName}
          </h1>
          <div className="sub" style={{ marginLeft: '58px' }}>
            Basado en {teacher.total_valid_pairs || teacher.total_comments || 0} evaluaciones válidas. Categoría: {teacher.ranking_category}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '3rem', fontFamily: 'Sora', fontWeight: 700, color: teacher.has_insufficient_sample ? 'var(--wa)' : 'var(--ok)', lineHeight: 1 }}>
            {teacher.general_score.toFixed(1)}
          </div>
          <div style={{ color: 'var(--mut)', fontSize: '0.875rem', marginTop: '4px' }}>
            Score Global {teacher.has_insufficient_sample && <span className="bd s1">Provisional</span>}
          </div>
        </div>
      </div>

      <div className="grid">
        <div className="panel c6">
          <h3>Desglose por Aspectos</h3>
          <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {teacher.aspects && teacher.aspects.length > 0 ? (
              teacher.aspects.map(aspect => (
                <div key={aspect.name}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <span style={{ fontWeight: 600, fontSize: '15px', textTransform: 'capitalize' }}>{aspect.name}</span>
                    <span style={{ fontWeight: 600 }}>{aspect.score.toFixed(1)}/100</span>
                  </div>
                  <div className="tr" style={{ marginBottom: '4px' }}>
                    <i style={{
                      width: `${Math.min(100, Math.max(0, aspect.score))}%`,
                      backgroundColor: aspect.has_insufficient_sample ? 'var(--wa)' : 'var(--ac)',
                    }}></i>
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--mut)', display: 'flex', justifyContent: 'space-between' }}>
                    <span>Muestra: {aspect.n} evaluaciones {aspect.has_insufficient_sample && <span style={{ color: 'var(--wa)' }}>(Insuficiente)</span>}</span>
                    <span>(+{aspect.positive_count} / ={aspect.neutral_count} / -{aspect.negative_count})</span>
                  </div>
                </div>
              ))
            ) : (
              <p style={{ color: 'var(--mut)' }}>No hay desglose de aspectos disponible.</p>
            )}
          </div>
        </div>

        <div className="panel c6">
          <h3>Recomendaciones Automáticas</h3>
          {teacher.recommendations && teacher.recommendations.length > 0 ? (
            <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {teacher.recommendations.map((rec, idx) => (
                <div key={idx} style={{ padding: '14px', background: 'var(--bg)', borderRadius: '10px', borderLeft: '4px solid var(--ac)' }}>
                  <strong style={{ display: 'block', marginBottom: '4px', fontSize: '15px' }}>{rec.action}</strong>
                  <p style={{ color: 'var(--mut)', fontSize: '14px', lineHeight: 1.4, margin: 0 }}>{rec.reason}</p>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ marginTop: '1.5rem', color: 'var(--mut)', textAlign: 'center', padding: '20px' }}>
              No hay recomendaciones críticas requeridas. El desempeño se encuentra dentro de parámetros normales.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
