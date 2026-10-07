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
      <h1 style={{ marginBottom: '20px' }}>Subir Comentarios</h1>
      <div className="panel no-print">
        <p className="sub" style={{ marginBottom: '1.5rem' }}>
          Sube un archivo <strong>CSV</strong> o <strong>XLSX</strong> con las columnas <code>docente</code> y <code>comentario</code>.
        </p>
        
        {error && <ErrorMessage message={error} />}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <label className="drop">
            <input type="file" accept=".csv, .xlsx" onChange={handleFileChange} hidden />
            <b className="dsp" style={{ fontSize: '17px' }}>{file ? file.name : 'Arrastra tu archivo aquí'}</b>
            <br />
            <span style={{ fontSize: '13.5px' }}>{file ? 'Haz clic para cambiar' : 'o haz clic para elegirlo (.csv, .xlsx)'}</span>
          </label>
          <button type="submit" className="btn" disabled={loading} style={{ marginTop: '1rem', padding: '12px' }}>
            {loading ? 'Procesando (puede tomar unos segundos)...' : 'Subir y Procesar'}
          </button>
        </form>
      </div>

      {result && (
        <div className="panel" style={{ marginTop: '20px' }}>
          <h2>Resumen de Validación</h2>
          <div className="kpis" style={{ marginTop: '20px' }}>
            <div className="panel kpi">
              <small>Total Filas Procesadas</small>
              <div className="dsp">{result.total_rows}</div>
            </div>
            <div className="panel kpi">
              <small>Filas Válidas</small>
              <div className="dsp text-ok">{result.valid_rows}</div>
            </div>
            <div className="panel kpi">
              <small>Filas Rechazadas</small>
              <div className="dsp text-ba">{result.rejected_rows_count}</div>
            </div>
          </div>
          
          {result.rejected_details && result.rejected_details.length > 0 && (
            <div style={{ marginTop: '20px' }} className="tw">
              <h3>Detalle de Filas Rechazadas</h3>
              <table style={{ marginTop: '1rem' }}>
                <thead>
                  <tr>
                    <th>Fila</th>
                    <th>Contenido Original</th>
                    <th>Motivo de Rechazo</th>
                  </tr>
                </thead>
                <tbody>
                  {result.rejected_details.map((rej: any, idx: number) => (
                    <tr key={idx}>
                      <td>{rej.row_index}</td>
                      <td style={{ maxWidth: '300px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{rej.raw_content}</td>
                      <td className="text-ba">{rej.rejection_reason}</td>
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
