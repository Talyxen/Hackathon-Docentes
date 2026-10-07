import React, { useEffect, useState, useCallback } from 'react';
import { apiService } from '../services/api';
import { Loader, ErrorMessage } from '../components/UI/Basic';

export const Explorer: React.FC = () => {
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reviewerName, setReviewerName] = useState('');
  const [filterMode, setFilterMode] = useState<'pending' | 'all'>('pending');

  const loadPending = useCallback(async () => {
    try {
      setLoading(true);
      if (filterMode === 'pending') {
        const data = await apiService.getPendingReviews();
        setReviews(data);
      } else {
        const res = await apiService.getComments({ limit: 50 });
        setReviews(res.comments || []);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [filterMode]);

  useEffect(() => {
    loadPending();
  }, [loadPending]);

  const handleReview = async (classificationId: string, action: string) => {
    if (!reviewerName.trim()) {
      alert("Debes ingresar tu nombre como revisor para registrar la auditoría.");
      return;
    }
    try {
      await apiService.reviewComment({
        classification_id: classificationId,
        reviewer_name: reviewerName.trim(),
        action: action
      });
      loadPending();
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div>
      <h1 style={{ marginBottom: '20px' }}>Centro de Revisión Humana</h1>
      <div className="panel" style={{ marginBottom: '20px' }}>
        <div className="sel" style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <input 
            type="text" 
            value={reviewerName} 
            onChange={e => setReviewerName(e.target.value)} 
            placeholder="Ingresa tu Nombre de Revisor Humano *" 
            style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--line)', minWidth: '280px' }} 
          />
          <div className="chips" style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
            <button className={`btn ${filterMode === 'pending' ? '' : 'g'}`} onClick={() => setFilterMode('pending')}>
              Dudosos Pendientes
            </button>
            <button className={`btn ${filterMode === 'all' ? '' : 'g'}`} onClick={() => setFilterMode('all')}>
              Todos los Comentarios
            </button>
          </div>
        </div>
      </div>

      {loading && <Loader />}
      {error && <ErrorMessage message={error} />}

      {!loading && !error && filterMode === 'pending' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {reviews.map(item => (
            <div key={item.classification_id} className="panel">
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <strong>Docente: {item.teacher_name}</strong>
                <span className="bd s1">Requiere Revisión</span>
              </div>
              <p style={{ fontStyle: 'italic', marginBottom: '1rem', fontSize: '15px' }}>"{item.raw_text}"</p>

              <div style={{ background: 'var(--bg)', padding: '12px', borderRadius: '8px', marginBottom: '1rem', fontSize: '14px' }}>
                <p style={{ margin: '0 0 4px' }}><strong>Aspecto Identificado:</strong> <span style={{ textTransform: 'capitalize' }}>{item.aspect_name}</span></p>
                <p style={{ margin: '0 0 4px' }}>
                  <strong>Sentimiento:</strong> <span className={item.sentiment === 'POSITIVE' ? 'text-ok' : item.sentiment === 'NEGATIVE' ? 'text-ba' : 'text-mut'}>{item.sentiment}</span>
                </p>
                <p style={{ margin: '0 0 4px' }}><strong>Evidencia Extraída:</strong> "{item.evidence_span}"</p>
                <p style={{ margin: '0 0 4px' }}><strong>Confianza NLP:</strong> {(item.confidence_score * 100).toFixed(1)}%</p>
                {item.uncertainty_reason && (
                  <p className="text-ba" style={{ fontWeight: 600, margin: '8px 0 0' }}>Motivo de duda: {item.uncertainty_reason}</p>
                )}
              </div>

              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button className="btn" style={{ background: 'var(--ok)', color: 'white' }} onClick={() => handleReview(item.classification_id, 'CONFIRM')}>
                  ✓ Confirmar
                </button>
                <button className="btn" style={{ background: 'var(--ba)', color: 'white' }} onClick={() => handleReview(item.classification_id, 'EXCLUDE')}>
                  ✕ Excluir / Rechazar
                </button>
              </div>
            </div>
          ))}
          {reviews.length === 0 && (
            <p style={{ color: 'var(--mut)', textAlign: 'center', padding: '40px' }}>
              ✓ No hay comentarios pendientes de revisión en este momento.
            </p>
          )}
        </div>
      )}

      {!loading && !error && filterMode === 'all' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {reviews.map(c => (
            <div key={c.id} className="panel">
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <strong>Docente: {c.teacher_name}</strong>
                <span className="sub">Fila #{c.row_index}</span>
              </div>
              <p style={{ fontStyle: 'italic', marginBottom: '1rem', fontSize: '15px' }}>"{c.raw_text}"</p>
              
              {c.classifications && c.classifications.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {c.classifications.map((ac: any) => (
                    <div key={ac.id} style={{ background: 'var(--bg)', padding: '10px 14px', borderRadius: '8px', fontSize: '13.5px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <b style={{ textTransform: 'capitalize' }}>{ac.aspect_name}</b>: <span className={ac.sentiment === 'POSITIVE' ? 'text-ok' : ac.sentiment === 'NEGATIVE' ? 'text-ba' : 'text-mut'}>{ac.sentiment}</span> ({ac.evidence_span})
                      </div>
                      <span className={`bd ${ac.status === 'HUMAN_CONFIRMED' ? 's0' : ac.status === 'EXCLUDED' ? 's1' : 's0'}`}>
                        {ac.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
