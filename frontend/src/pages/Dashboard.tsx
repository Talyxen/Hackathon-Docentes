import React, { useEffect, useState } from 'react';
import { apiService, type TeacherScoreResponse } from '../services/api';
import { Loader, ErrorMessage, EmptyState } from '../components/UI/Basic';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell, PieChart, Pie, Legend } from 'recharts';
import { Link } from 'react-router-dom';

export const Dashboard: React.FC = () => {
  const [teachers, setTeachers] = useState<TeacherScoreResponse[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [data, statsData] = await Promise.all([
          apiService.getTeachers(),
          apiService.getStats()
        ]);
        setTeachers(data);
        setStats(statsData);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  if (loading) return <Loader />;
  if (error) return <ErrorMessage message={error} />;
  if (teachers.length === 0) return <EmptyState title="No hay datos" description="Sube un archivo CSV/XLSX para empezar a analizar." />;

  const chartData = teachers.map(t => ({
    name: t.name,
    score: parseFloat(t.general_score.toFixed(2)),
    provisional: t.has_insufficient_sample
  }));

  const sentimentData = stats?.sentiment_distribution ? Object.entries(stats.sentiment_distribution).map(([key, val]) => ({
    name: key,
    value: val
  })) : [];
  const COLORS = { 'POSITIVE': 'var(--success-color)', 'NEUTRAL': 'var(--text-muted)', 'NEGATIVE': 'var(--error-color)' };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1>Dashboard Principal</h1>
        <button onClick={() => window.print()} className="btn btn-primary no-print">Imprimir Reporte</button>
      </div>

      {stats && (
        <div className="grid md:grid-cols-4" style={{ marginBottom: '1.5rem' }}>
          <div className="panel">
            <h3 style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Comentarios Procesados / Válidos</h3>
            <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{stats.processed_comments} / <span style={{ color: 'var(--success-color)' }}>{stats.valid_comments}</span></div>
            <div style={{ fontSize: '0.875rem', color: 'var(--error-color)' }}>Rechazados: {stats.rejected_comments}</div>
          </div>
          <div className="panel">
            <h3 style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Docentes Analizados</h3>
            <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{stats.analyzed_teachers}</div>
          </div>
          <div className="panel">
            <h3 style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Confianza Promedio (NLP)</h3>
            <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{(stats.average_confidence * 100).toFixed(1)}%</div>
          </div>
          <div className="panel">
            <h3 style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Casos por Revisar</h3>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: stats.cases_to_review > 0 ? 'var(--warning-color)' : 'var(--success-color)' }}>
              {stats.cases_to_review}
            </div>
            <Link to="/explorer" style={{ fontSize: '0.875rem' }}>Ir a Centro de Revisión</Link>
          </div>
        </div>
      )}

      {stats && (
        <div className="grid md:grid-cols-2" style={{ marginBottom: '1.5rem' }}>
          <div className="panel">
            <h2>Fortalezas Globales</h2>
            <ul style={{ paddingLeft: '1.5rem' }}>
              {stats.strengths.map((s: any, i: number) => (
                <li key={i}><strong>{s.aspect}</strong>: {s.score}/100</li>
              ))}
            </ul>
          </div>
          <div className="panel">
            <h2>Aspectos Críticos</h2>
            <ul style={{ paddingLeft: '1.5rem' }}>
              {stats.critical_aspects.map((s: any, i: number) => (
                <li key={i}><strong>{s.aspect}</strong>: {s.score}/100</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-2" style={{ marginBottom: '1.5rem' }}>
        <div className="panel">
          <h2>Ranking General</h2>
          <div style={{ height: 300, width: '100%', marginTop: '1rem' }}>
            <ResponsiveContainer>
              <BarChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                <XAxis dataKey="name" tick={{ fill: 'var(--text-muted)' }} />
                <YAxis domain={[0, 100]} tick={{ fill: 'var(--text-muted)' }} />
                <Tooltip />
                <Bar dataKey="score" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.provisional ? 'var(--warning-color)' : 'var(--primary-color)'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        {stats && (
          <div className="panel">
            <h2>Distribución de Sentimiento Global</h2>
            <div style={{ height: 300, width: '100%', marginTop: '1rem' }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={sentimentData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value">
                    {sentimentData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[entry.name as keyof typeof COLORS] || 'var(--primary-color)'} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>

      <h2>Desempeño por Docente</h2>
      <div className="grid md:grid-cols-2 lg:grid-cols-3">
        {teachers.map(teacher => (
          <div key={teacher.teacher_id} className="panel">
            <h3 style={{ marginBottom: '0.5rem' }}>{teacher.name}</h3>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <span style={{ fontSize: '2rem', fontWeight: 700, color: teacher.has_insufficient_sample ? 'var(--warning-color)' : 'var(--success-color)' }}>
                {teacher.general_score.toFixed(1)}
              </span>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem', alignSelf: 'flex-end', textAlign: 'right' }}>
                {teacher.total_comments} comentarios<br/>
                {teacher.score_details?.n || 0} n
              </span>
            </div>
            
            <div style={{ fontSize: '0.875rem', marginBottom: '1rem' }}>
              Dudosos pendientes: <strong>{teacher.score_details?.pending_review || 0}</strong>
            </div>

            {teacher.has_insufficient_sample && (
              <div style={{ fontSize: '0.875rem', color: 'var(--warning-color)', marginBottom: '1rem', fontWeight: 'bold' }}>
                * Muestra Insuficiente (Provisional)
              </div>
            )}
            <Link to={`/teacher/${teacher.teacher_id}`} className="btn btn-primary" style={{ width: '100%' }}>
              Ver Detalles
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
};
