import React, { useState } from 'react';
import { apiService } from '../services/api';
import { ErrorMessage } from '../components/UI/Basic';

export const Upload: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) setFile(e.target.files[0]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError('Por favor provee el archivo (CSV/XLSX).');
      return;
    }
    try {
      setLoading(true);
      setError(null);
      setResult(null);
      const res = await apiService.uploadCSV(file);
      setResult(res);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <h1>Subir Comentarios</h1>
      <div className="panel no-print">
        <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
          Sube un archivo <strong>CSV</strong> o <strong>XLSX</strong> con las columnas <code>docente</code> y <code>comentario</code>.
        </p>
        
        {error && <ErrorMessage message={error} />}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 700 }}>Archivo CSV / XLSX</label>
            <input type="file" accept=".csv, .xlsx" onChange={handleFileChange} />
          </div>
          <button type="submit" className="btn btn-primary" disabled={loading} style={{ marginTop: '1rem', padding: '0.75rem' }}>
            {loading ? 'Procesando (puede tomar unos segundos)...' : 'Subir y Procesar'}
          </button>
        </form>
      </div>

      {result && (
        <div className="panel">
          <h2>Resumen de Validación</h2>
          <div className="grid md:grid-cols-3" style={{ marginBottom: '1.5rem', gap: '1rem' }}>
            <div style={{ padding: '1rem', backgroundColor: 'var(--bg-color)', borderRadius: '4px' }}>
              <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--primary-color)' }}>{result.total_rows}</div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Total Filas Procesadas</div>
            </div>
            <div style={{ padding: '1rem', backgroundColor: 'var(--bg-color)', borderRadius: '4px' }}>
              <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--success-color)' }}>{result.valid_rows}</div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Filas Válidas</div>
            </div>
            <div style={{ padding: '1rem', backgroundColor: 'var(--bg-color)', borderRadius: '4px' }}>
              <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--error-color)' }}>{result.rejected_rows_count}</div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Filas Rechazadas</div>
            </div>
          </div>
          
          {result.rejected_details && result.rejected_details.length > 0 && (
            <div>
              <h3>Detalle de Filas Rechazadas</h3>
              <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '1rem', fontSize: '0.875rem' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border-color)', textAlign: 'left' }}>
                    <th style={{ padding: '0.5rem' }}>Fila</th>
                    <th style={{ padding: '0.5rem' }}>Contenido Original</th>
                    <th style={{ padding: '0.5rem' }}>Motivo de Rechazo</th>
                  </tr>
                </thead>
                <tbody>
                  {result.rejected_details.map((rej: any, idx: number) => (
                    <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '0.5rem' }}>{rej.row_index}</td>
                      <td style={{ padding: '0.5rem', maxWidth: '300px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{rej.raw_content}</td>
                      <td style={{ padding: '0.5rem', color: 'var(--error-color)' }}>{rej.rejection_reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
