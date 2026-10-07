import React, { useEffect, useState } from 'react';
import { apiService, type TeacherScoreResponse } from '../services/api';
import { Loader, ErrorMessage, EmptyState } from '../components/UI/Basic';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell, PieChart, Pie, Legend } from 'recharts';
import { Link } from 'react-router-dom';

const MIN_N = 10;

function getNivel(score: number | null) {
  if (score == null || isNaN(score) || score === 0) return { cls: 'nd', txt: 'Sin puntaje' };
  if (score >= 80) return { cls: 'ex', txt: 'Excelente' };
  if (score >= 60) return { cls: 'bu', txt: 'Bueno' };
  if (score >= 40) return { cls: 're', txt: 'Regular' };
  return { cls: 'ba', txt: 'Bajo' };
}

export const Dashboard: React.FC = () => {
  const [teachers, setTeachers] = useState<TeacherScoreResponse[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'score' | 'dudosos' | 'n' | 'name'>('score');

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

  const sortedTeachers = [...teachers].sort((a, b) => {
    if (sortBy === 'name') return (a.display_name || a.name).localeCompare(b.display_name || b.name);
    if (sortBy === 'dudosos') return (b.pending_reviews_count || 0) - (a.pending_reviews_count || 0);
    if (sortBy === 'n') return (b.total_valid_pairs || 0) - (a.total_valid_pairs || 0);
    return (b.general_score || 0) - (a.general_score || 0);
  });

  const provCount = teachers.filter(t => (t.total_valid_pairs || 0) < MIN_N || t.ranking_category !== 'OFICIAL_PRINCIPAL').length;
  const totalDudosos = teachers.reduce((acc, t) => acc + (t.pending_reviews_count || 0), 0);

  const chartData = teachers.map(t => ({
    name: t.display_name || t.name,
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
        <span>Fuente: <b>Datos del API</b> · {stats?.processed_comments || 0} comentarios</span>
        <button onClick={() => window.print()} className="btn g no-print" style={{ marginLeft: 'auto', padding: '6px 12px', fontSize: '12px' }}>Imprimir Reporte</button>
      </div>

      <section className="hero">
        <div className="panel big">
          <div className="dsp" style={{ fontSize: '16px', fontWeight: 600, color: '#C9D4FF' }}>Score Promedio</div>
          <div className="num"><span>{avgScore.toFixed(1)}</span></div>
          <p>{bestTeacher ? `${bestTeacher.display_name || bestTeacher.name} lidera con ${bestTeacher.general_score.toFixed(1)}.` : ''} De {stats?.processed_comments || 0} comentarios analizados, {stats?.valid_comments || 0} fueron válidos y útiles para evaluación.</p>
        </div>
        <div className="ins">
          <div className="panel">
            <span className="dot" style={{ background: 'var(--ok)' }}></span>
            <div>
              <b>Fortaleza Global: {stats?.strengths?.[0]?.aspect || 'N/A'}</b>
              <small>Score de {stats?.strengths?.[0]?.score || 0}/100.</small>
            </div>
          </div>
          <div className="panel">
            <span className="dot" style={{ background: 'var(--ba)' }}></span>
            <div>
              <b>Aspecto Crítico: {stats?.critical_aspects?.[0]?.aspect || 'N/A'}</b>
              <small>Requiere atención inmediata ({stats?.critical_aspects?.[0]?.score || 0}/100).</small>
            </div>
          </div>
          <div className="panel">
            <span className="dot" style={{ background: 'var(--wa)' }}></span>
            <div>
              <b>{stats?.cases_to_review || 0} casos por revisar</b>
              <small>Comentarios marcados como dudosos o contradictorios por NLP.</small>
            </div>
          </div>
        </div>
      </section>

      <section className="kpis">
        <div className="panel kpi">
          <small>Docentes</small>
          <div className="dsp">{stats?.analyzed_teachers || teachers.length}</div>
          <div className="tr"><i style={{ width: '100%', background: 'var(--ac)' }}></i></div>
        </div>
        <div className="panel kpi">
          <small>Confianza NLP</small>
          <div className="dsp">{((stats?.average_confidence || 0.85) * 100).toFixed(1)}%</div>
          <div className="tr"><i style={{ width: `${(stats?.average_confidence || 0.85) * 100}%`, background: 'var(--ac2)' }}></i></div>
        </div>
        <div className="panel kpi">
          <small>Comentarios Válidos</small>
          <div className="dsp">{Math.round(((stats?.valid_comments || 0) / (stats?.processed_comments || 1)) * 100)}%</div>
          <div className="tr"><i style={{ width: `${((stats?.valid_comments || 0) / (stats?.processed_comments || 1)) * 100}%`, background: 'var(--ok)' }}></i></div>
        </div>
        <div className="panel kpi">
          <small>Revisión Pendiente</small>
          <div className="dsp">{stats?.cases_to_review || 0}</div>
          <div className="tr"><i style={{ width: `${((stats?.cases_to_review || 0) / (stats?.processed_comments || 1)) * 100}%`, background: 'var(--wa)' }}></i></div>
        </div>
      </section>

      <section className="grid" style={{ marginBottom: '32px' }}>
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
      </section>

      {/* SECCIÓN TARJETAS DE DOCENTES CON EL NUEVO DISEÑO */}
      <section>
        <div className="dc-head">
          <div>
            <h2>Desempeño por docente</h2>
            <p>{teachers.length} docentes · {provCount} con puntaje provisional · {totalDudosos} dudosos por revisar</p>
          </div>
          <select value={sortBy} onChange={e => setSortBy(e.target.value as any)} aria-label="Ordenar docentes">
            <option value="score">Ordenar por puntaje</option>
            <option value="dudosos">Más dudosos pendientes</option>
            <option value="n">Más evaluaciones</option>
            <option value="name">Nombre (A–Z)</option>
          </select>
        </div>

        <div className="dc-legend">
          <span><i style={{ background: 'var(--ex)' }}></i>Excelente (80–100)</span>
          <span><i style={{ background: 'var(--bu)' }}></i>Bueno (60–79)</span>
          <span><i style={{ background: 'var(--re)' }}></i>Regular (40–59)</span>
          <span><i style={{ background: 'var(--ba)' }}></i>Bajo (0–39)</span>
          <span><i style={{ background: 'var(--nd)' }}></i>Sin puntaje</span>
        </div>

        <div className="dc-grid">
          {sortedTeachers.map(teacher => {
            const fullName = teacher.display_name || teacher.name || 'Docente';
            const m = fullName.match(/^(Dr\.|Dra\.|Prof\.|Ing\.|Lic\.|Mg\.)\s+/i);
            const titulo = m ? m[1] : '';
            const limpio = fullName.replace(/^(Dr\.|Dra\.|Prof\.|Ing\.|Lic\.|Mg\.)\s+/i, '');
            const ini = limpio.split(' ').slice(0, 2).map(x => x[0]).join('').toUpperCase() || 'D';
            const score = teacher.general_score > 0 ? teacher.general_score : null;
            const lv = getNivel(score);
            const n = teacher.total_valid_pairs || 0;
            const dudosos = teacher.pending_reviews_count || 0;
            const prov = n < MIN_N || teacher.ranking_category !== 'OFICIAL_PRINCIPAL';
            const faltan = Math.max(0, MIN_N - n);
            const pct = Math.min(100, (n / MIN_N) * 100);

            return (
              <article key={teacher.teacher_id} className={`dc-card ${lv.cls}`}>
                <div className="dc-top">
                  <div className="dc-av">{ini}</div>
                  <div>
                    <div className="dc-name">{limpio}</div>
                    <div className="dc-role">{titulo || 'Docente'}</div>
                  </div>
                  <span className={`dc-badge ${prov ? 'pv' : 'ok'}`}>{prov ? 'Provisional' : 'Confiable'}</span>
                </div>

                <div>
                  <div className="dc-score">
                    <b>{score == null ? '—' : score.toFixed(1)}</b><small>/ 100</small>
                    <span className="dc-level">{lv.txt}</span>
                  </div>
                  <div className="dc-bar" role="img" aria-label={`Puntaje ${score ?? 'sin dato'} de 100`}>
                    <i style={{ width: `${score ?? 0}%` }}></i>
                    <u style={{ left: '40%' }}></u>
                    <u style={{ left: '60%' }}></u>
                    <u style={{ left: '80%' }}></u>
                  </div>
                </div>

                <div className="dc-stats">
                  <div className="dc-stat"><span>Evaluaciones</span><b>{n}</b></div>
                  <div className={`dc-stat ${dudosos > 0 ? 'warn' : ''}`}><span>Dudosos pendientes</span><b>{dudosos}</b></div>
                </div>

                <div className={`dc-conf ${prov ? '' : 'full'}`}>
                  {prov ? (
                    <>Faltan <b style={{ color: 'var(--ink)' }}>{faltan}</b> evaluaciones para que el puntaje sea confiable.</>
                  ) : (
                    <>Muestra suficiente para un puntaje confiable.</>
                  )}
                  <div className="t"><i style={{ width: `${pct}%` }}></i></div>
                  {n} de {MIN_N} evaluaciones mínimas
                </div>

                {teacher.aspects && teacher.aspects.length > 0 && (
                  <div className="dc-crit">
                    {teacher.aspects.slice(0, 3).map(c => (
                      <div key={c.name}>
                        <span style={{ textTransform: 'capitalize', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</span>
                        <span className="t"><i style={{ width: `${Math.min(100, Math.max(0, c.score))}%` }}></i></span>
                        <b>{Math.round(c.score)}</b>
                      </div>
                    ))}
                  </div>
                )}

                <div className="dc-actions">
                  {dudosos > 0 && (
                    <Link to="/explorer" className="dc-btn w">Revisar {dudosos} dudoso{dudosos > 1 ? 's' : ''}</Link>
                  )}
                  <Link to={`/teacher/${teacher.teacher_id}`} className="dc-btn p">Ver detalles</Link>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
};
