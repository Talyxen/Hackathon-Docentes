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
      <h1>Centro de Revisión y Explorador</h1>
      <div className="panel">
        <div className="grid md:grid-cols-2">
          <div>
            <label style={{ display: 'block', fontWeight: 700, marginBottom: '0.5rem' }}>Nombre del Revisor</label>
            <input type="text" value={reviewerName} onChange={e => setReviewerName(e.target.value)} placeholder="Tu nombre" />
          </div>
          <div>
            <label style={{ display: 'block', fontWeight: 700, marginBottom: '0.5rem' }}>Filtro de Revisión</label>
            <select onChange={e => setFilters({ ...filters, requires_review: e.target.value === 'true' })}>
              <option value="true">Pendientes de Revisión (Dudosos / Sarcasmo)</option>
              <option value="false">Ya revisados o Seguros</option>
            </select>
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
                <span style={{ color: 'var(--text-muted)' }}>Status: {c.status}</span>
              </div>
              <p style={{ fontStyle: 'italic', marginBottom: '1rem' }}>"{c.raw_text}"</p>
              
              <div style={{ backgroundColor: 'var(--bg-color)', padding: '1rem', borderRadius: '4px', marginBottom: '1rem' }}>
                <p><strong>Aspecto Detectado:</strong> {c.aspect}</p>
                <p><strong>Sentimiento:</strong> {c.sentiment}</p>
                <p><strong>Evidencia:</strong> {c.evidence}</p>
                <p><strong>Confianza NLP:</strong> {(c.confidence * 100).toFixed(1)}%</p>
                {c.requires_review && (
                  <p style={{ color: 'var(--warning-color)', fontWeight: 700 }}>Motivo de duda: {c.uncertainty_reason}</p>
                )}
              </div>

              {c.requires_review && (
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button className="btn btn-primary" onClick={() => handleReview(c.id, 'CONFIRM')}>Confirmar (Correcto)</button>
                  <button className="btn" style={{ backgroundColor: 'var(--warning-color)', color: 'white' }} onClick={() => handleReview(c.id, 'EXCLUDE')}>Excluir / Rechazar</button>
                  {/* For correcting, we would add inputs for the corrected aspect/sentiment */}
                </div>
              )}
            </div>
          ))}
          {comments.length === 0 && <p>No hay comentarios para los filtros seleccionados.</p>}
        </div>
      )}
    </div>
  );
};
