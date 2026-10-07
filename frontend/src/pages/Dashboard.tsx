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

  const avgScore = teachers.reduce((a, b) => a + b.general_score, 0) / (teachers.length || 1);
  const bestTeacher = [...teachers].sort((a, b) => b.general_score - a.general_score)[0];

  const chartData = teachers.map(t => ({
    name: t.name,
    score: parseFloat(t.general_score.toFixed(2)),
    provisional: t.has_insufficient_sample
  }));

  const sentimentData = stats?.sentiment_distribution ? Object.entries(stats.sentiment_distribution).map(([key, val]) => ({
    name: key,
    value: val
  })) : [];
  const COLORS = { 'POSITIVE': 'var(--ok)', 'NEUTRAL': 'var(--mut)', 'NEGATIVE': 'var(--ba)' };

  return (
    <div>
      <div className="src">
        <span>Fuente: <b>Datos del API</b> · {stats?.processed_comments} comentarios</span>
        <button onClick={() => window.print()} className="btn g no-print" style={{ marginLeft: 'auto', padding: '6px 12px', fontSize: '12px' }}>Imprimir Reporte</button>
      </div>

      <section className="hero">
        <div className="panel big">
          <div className="dsp" style={{ fontSize: '16px', fontWeight: 600, color: '#C9D4FF' }}>Score Promedio</div>
          <div className="num"><span>{avgScore.toFixed(1)}</span></div>
          <p>{bestTeacher ? `${bestTeacher.name} lidera con ${bestTeacher.general_score.toFixed(1)}.` : ''} De {stats?.processed_comments} comentarios analizados, {stats?.valid_comments} fueron válidos y útiles para evaluación.</p>
        </div>
        <div className="ins">
          <div className="panel">
            <span className="dot" style={{ background: 'var(--ok)' }}></span>
            <div>
              <b>Fortaleza Global: {stats?.strengths[0]?.aspect || 'N/A'}</b>
              <small>Score de {stats?.strengths[0]?.score || 0}/100.</small>
            </div>
          </div>
          <div className="panel">
            <span className="dot" style={{ background: 'var(--ba)' }}></span>
            <div>
              <b>Aspecto Crítico: {stats?.critical_aspects[0]?.aspect || 'N/A'}</b>
              <small>Requiere atención inmediata ({stats?.critical_aspects[0]?.score || 0}/100).</small>
            </div>
          </div>
          <div className="panel">
            <span className="dot" style={{ background: 'var(--wa)' }}></span>
            <div>
              <b>{stats?.cases_to_review} casos por revisar</b>
              <small>Comentarios marcados como dudosos o contradictorios por NLP.</small>
            </div>
          </div>
        </div>
      </section>

      <section className="kpis">
        <div className="panel kpi">
          <small>Docentes</small>
          <div className="dsp">{stats?.analyzed_teachers}</div>
          <div className="tr"><i style={{ width: '100%', background: 'var(--ac)' }}></i></div>
        </div>
        <div className="panel kpi">
          <small>Confianza NLP</small>
          <div className="dsp">{(stats?.average_confidence * 100).toFixed(1)}%</div>
          <div className="tr"><i style={{ width: `${stats?.average_confidence * 100}%`, background: 'var(--ac2)' }}></i></div>
        </div>
        <div className="panel kpi">
          <small>Comentarios Válidos</small>
          <div className="dsp">{Math.round((stats?.valid_comments / (stats?.processed_comments || 1)) * 100)}%</div>
          <div className="tr"><i style={{ width: `${(stats?.valid_comments / (stats?.processed_comments || 1)) * 100}%`, background: 'var(--ok)' }}></i></div>
        </div>
        <div className="panel kpi">
          <small>Revisión Pendiente</small>
          <div className="dsp">{stats?.cases_to_review}</div>
          <div className="tr"><i style={{ width: `${(stats?.cases_to_review / (stats?.processed_comments || 1)) * 100}%`, background: 'var(--wa)' }}></i></div>
        </div>
      </section>

      <section className="grid">
        <div className="panel c7">
          <h3>Ranking General</h3>
          <p className="sub">Puntuación global por docente.</p>
          <div style={{ height: 200, width: '100%', marginTop: '1rem' }}>
            <ResponsiveContainer>
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--line)" />
                <XAxis dataKey="name" tick={{ fill: 'var(--mut)', fontSize: 12 }} />
                <YAxis domain={[0, 100]} tick={{ fill: 'var(--mut)', fontSize: 12 }} />
                <Tooltip contentStyle={{ backgroundColor: 'var(--card)', borderColor: 'var(--line)', color: 'var(--ink)' }} />
                <Bar dataKey="score" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.provisional ? 'var(--wa)' : 'var(--ac)'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="panel c5">
          <h3>Sentimiento Global</h3>
          <p className="sub">Distribución de polaridad.</p>
          <div style={{ height: 200, width: '100%' }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie data={sentimentData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={5} dataKey="value">
                  {sentimentData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[entry.name as keyof typeof COLORS] || 'var(--ac)'} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: 'var(--card)', borderColor: 'var(--line)', color: 'var(--ink)' }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="c12">
          <h3 style={{ marginTop: '10px' }}>Desempeño por Docente</h3>
          <div className="grid">
            {teachers.map(teacher => {
              return (
                <div key={teacher.teacher_id} className="panel c4">
                  <h3 style={{ marginBottom: '0.5rem' }}>{teacher.name}</h3>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                    <span style={{ fontSize: '2.5rem', fontFamily: 'Sora', fontWeight: 700, color: teacher.has_insufficient_sample ? 'var(--wa)' : 'var(--ok)' }}>
                      {teacher.general_score.toFixed(1)}
                    </span>
                    <span style={{ color: 'var(--mut)', fontSize: '0.875rem', alignSelf: 'center', textAlign: 'right', lineHeight: 1.2 }}>
                      {teacher.total_comments} comments<br />
                      n={teacher.score_details?.n || 0}
                    </span>
                  </div>

                  <div style={{ fontSize: '13px', marginBottom: '14px', color: 'var(--mut)' }}>
                    Dudosos pendientes: <b style={{ color: 'var(--ink)' }}>{teacher.score_details?.pending_review || 0}</b>
                  </div>

                  {teacher.has_insufficient_sample && (
                    <div style={{ fontSize: '12.5px', background: 'rgba(245,158,11,0.16)', color: '#B7791F', padding: '4px 8px', borderRadius: '4px', marginBottom: '14px', fontWeight: 600 }}>
                      Muestra insuficiente
                    </div>
                  )}
                  
                  <Link to={`/teacher/${teacher.teacher_id}`} className="btn g" style={{ width: '100%', textAlign: 'center', display: 'block' }}>
                    Ver Detalles
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
};
