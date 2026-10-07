import React, { useEffect, useState, useCallback } from 'react';
import { apiService } from '../services/api';
import { Loader, ErrorMessage } from '../components/UI/Basic';

export const Explorer: React.FC = () => {
  const [comments, setComments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reviewerName, setReviewerName] = useState('');
  const [filters, setFilters] = useState({ requires_review: true });

  const loadComments = useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiService.getComments(filters);
      setComments(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadComments();
  }, [loadComments]);

  const handleReview = async (id: string, action: string) => {
    if (!reviewerName) {
      alert("Debes ingresar tu nombre como revisor.");
      return;
    }
    try {
      await apiService.reviewComment(id, { reviewer_name: reviewerName, action });
      loadComments();
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div>
      <h1 style={{ marginBottom: '20px' }}>Centro de Revisión Humana</h1>
      <div className="panel" style={{ marginBottom: '20px' }}>
        <div className="sel">
          <input type="text" value={reviewerName} onChange={e => setReviewerName(e.target.value)} placeholder="Nombre del Revisor" style={{ minWidth: '260px' }} />
          <div className="chips">
            <button className={`chip ${filters.requires_review ? 'on' : ''}`} onClick={() => setFilters({ requires_review: true })}>Dudosos pendientes</button>
            <button className={`chip ${!filters.requires_review ? 'on' : ''}`} onClick={() => setFilters({ requires_review: false })}>Ya revisados</button>
          </div>
        </div>
      </div>

      {loading && <Loader />}
      {error && <ErrorMessage message={error} />}

      {!loading && !error && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {comments.map(c => (
            <div key={c.id} className="panel">
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <strong>Docente: {c.teacher_name}</strong>
                <span className={`bd ${c.status === 'REVIEWED' ? 's0' : 's1'}`}>Status: {c.status}</span>
              </div>
              <p style={{ fontStyle: 'italic', marginBottom: '1rem', fontSize: '15px' }}>"{c.raw_text}"</p>
              
              <div className="code" style={{ marginBottom: '1rem' }}>
                <p><strong>Aspecto:</strong> {c.aspect}</p>
                <p><strong>Sentimiento:</strong> <span className={c.sentiment === 'POSITIVE' ? 'text-ok' : c.sentiment === 'NEGATIVE' ? 'text-ba' : 'text-mut'}>{c.sentiment}</span></p>
                <p><strong>Evidencia NLP:</strong> {c.evidence}</p>
                <p><strong>Confianza:</strong> {(c.confidence * 100).toFixed(1)}%</p>
                {c.requires_review && (
                  <p className="text-ba" style={{ fontWeight: 700, marginTop: '10px' }}>Motivo de duda: {c.uncertainty_reason}</p>
                )}
              </div>

              {c.requires_review && (
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button className="btn" style={{ background: 'var(--ok)', color: 'white' }} onClick={() => handleReview(c.id, 'CONFIRM')}>Confirmar</button>
                  <button className="btn" style={{ background: 'var(--ba)', color: 'white' }} onClick={() => handleReview(c.id, 'EXCLUDE')}>Excluir / Rechazar</button>
                </div>
              )}
            </div>
          ))}
          {comments.length === 0 && <p style={{ color: 'var(--mut)', textAlign: 'center', padding: '40px' }}>No hay comentarios para los filtros seleccionados.</p>}
        </div>
      )}
    </div>
  );
};
