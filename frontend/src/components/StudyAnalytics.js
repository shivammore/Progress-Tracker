import React, { useEffect, useState } from 'react';
import { fetchStudyLogs } from '../api/studyLogApi';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const getHeatmapDays = () => {
  const days = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // Go back exactly 26 weeks (182 days)
  const startDate = new Date(today);
  startDate.setDate(today.getDate() - 182);
  
  // Align start date to the beginning of the week (Sunday)
  const startDay = startDate.getDay();
  startDate.setDate(startDate.getDate() - startDay);
  
  // Align end date to the end of the current week (Saturday)
  const endDate = new Date(today);
  const endDay = endDate.getDay();
  endDate.setDate(endDate.getDate() + (6 - endDay));
  
  const current = new Date(startDate);
  while (current <= endDate) {
    days.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }
  return days;
};

const formatDateKey = (dateObj) => {
  const y = dateObj.getFullYear();
  const m = String(dateObj.getMonth() + 1).padStart(2, '0');
  const d = String(dateObj.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const getMonthLabels = (days) => {
  const labels = [];
  let prevMonth = -1;
  
  // Check Sundays (start of columns) for month transitions
  for (let i = 0; i < days.length; i += 7) {
    const day = days[i];
    const month = day.getMonth();
    if (month !== prevMonth) {
      const monthName = day.toLocaleString('default', { month: 'short' });
      labels.push({ colIndex: i / 7, name: monthName });
      prevMonth = month;
    }
  }
  return labels;
};

export default function StudyAnalytics() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hoveredDay, setHoveredDay] = useState(null);
  const [aiReview, setAiReview] = useState(null);
  const [loadingAiReview, setLoadingAiReview] = useState(false);


  useEffect(() => {
    fetchStudyLogs()
      .then(res => {
        setLogs(res.data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to load study logs for analytics:', err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="empty-state" style={{ padding: '5rem 2rem' }}>
        <div className="typing-dot" style={{ display: 'inline-block', margin: '0 0.2rem' }}></div>
        <div className="typing-dot" style={{ display: 'inline-block', margin: '0 0.2rem' }}></div>
        <div className="typing-dot" style={{ display: 'inline-block', margin: '0 0.2rem' }}></div>
        <p style={{ marginTop: '1rem', color: 'var(--text-secondary)' }}>Loading study analytics...</p>
      </div>
    );
  }

  // 1. Calculations & Aggregations
  const totalHours = logs.reduce((sum, log) => sum + (log.hours || 0), 0);
  const totalSessions = logs.length;
  
  // Topic Distribution
  const topicHours = logs.reduce((acc, log) => {
    if (log.topic) {
      acc[log.topic] = (acc[log.topic] || 0) + (log.hours || 0);
    }
    return acc;
  }, {});

  const sortedTopics = Object.entries(topicHours)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8); // Top 8 topics

  const maxTopicHours = sortedTopics.length > 0 ? sortedTopics[0][1] : 1;

  // Topic Confidence Averaging
  const topicConfidence = logs.reduce((acc, log) => {
    if (log.topic && log.confidence) {
      if (!acc[log.topic]) {
        acc[log.topic] = { total: 0, count: 0 };
      }
      acc[log.topic].total += log.confidence;
      acc[log.topic].count += 1;
    }
    return acc;
  }, {});

  const avgConfidence = Object.entries(topicConfidence).map(([topic, data]) => ({
    topic,
    avg: (data.total / data.count).toFixed(1)
  })).sort((a, b) => b.avg - a.avg);

  // Heatmap Aggregation
  const studyHoursByDate = logs.reduce((acc, log) => {
    if (log.date) {
      const dKey = typeof log.date === 'string' ? log.date.split('T')[0] : formatDateKey(new Date(log.date));
      acc[dKey] = (acc[dKey] || 0) + (log.hours || 0);
    }
    return acc;
  }, {});

  // Generate heatmap days
  const heatmapDays = getHeatmapDays();
  const weeks = [];
  for (let i = 0; i < heatmapDays.length; i += 7) {
    weeks.push(heatmapDays.slice(i, i + 7));
  }
  const monthLabels = getMonthLabels(heatmapDays);

  // Dynamic Streak Calculation
  const getStreak = () => {
    const todayStr = formatDateKey(new Date());
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = formatDateKey(yesterday);

    let checkDate = new Date();
    // Start streak checking from today if studied, otherwise check from yesterday
    if (!studyHoursByDate[todayStr] && !studyHoursByDate[yesterdayStr]) {
      return 0;
    }
    if (!studyHoursByDate[todayStr] && studyHoursByDate[yesterdayStr]) {
      checkDate = yesterday;
    }

    let streak = 0;
    while (true) {
      const key = formatDateKey(checkDate);
      if (studyHoursByDate[key] && studyHoursByDate[key] > 0) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }
    return streak;
  };

  const currentStreak = getStreak();

  const getHeatmapCellClass = (hours) => {
    if (!hours || hours === 0) return 'heatmap-cell level-0';
    if (hours <= 1.5) return 'heatmap-cell level-1';
    if (hours <= 3) return 'heatmap-cell level-2';
    if (hours <= 5) return 'heatmap-cell level-3';
    return 'heatmap-cell level-4';
  };

  const generateWeeklyReview = async () => {
    setLoadingAiReview(true);
    try {
      const gatewayUrl = localStorage.getItem('AI_GATEWAY_URL') || '';
      const apiKey = localStorage.getItem('AI_API_KEY');
      let model = localStorage.getItem('AI_MODEL') || 'gemini-1.5-flash';
      if (model === 'gemini-2.5-flash') model = 'gemini-1.5-flash';
      if (!apiKey) { alert('API Key not set.'); return; }

      const last7DaysLogs = logs.filter(l => new Date(l.date) >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));
      const hours = last7DaysLogs.reduce((s, l) => s + (l.hours || 0), 0);
      const topics = [...new Set(last7DaysLogs.map(l => l.topic))].join(', ');
      
      const prompt = `As an AI tutor, generate a brief Weekly Review (2-3 short paragraphs) for the user's study progress.
In the last 7 days, they studied ${hours} hours across topics: ${topics}.
Give encouraging feedback and one actionable tip for next week.`;

      let url, headers, body;
      if (/generativelanguage\.googleapis\.com/.test(gatewayUrl)) {
        url = `${gatewayUrl.replace(/\/$/, '')}/${model}:generateContent?key=${apiKey}`;
        headers = { 'Content-Type': 'application/json' };
        body = { contents: [{ parts: [{ text: prompt }] }] };
      } else {
        url = gatewayUrl.endsWith('/v1/chat/completions') ? gatewayUrl : `${gatewayUrl.replace(/\/$/, '')}/v1/chat/completions`;
        headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` };
        body = { model, messages: [{ role: 'user', content: prompt }], temperature: 0.7 };
      }

      const response = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
      const data = await response.json();
      let text = '';
      if (data.choices?.[0]?.message?.content) text = data.choices[0].message.content;
      else if (data.candidates?.[0]?.content?.parts) text = data.candidates[0].content.parts.map(p => p.text).join('\n');
      setAiReview(text);
    } catch (e) {
      console.error(e);
      alert('Failed to generate review');
    } finally {
      setLoadingAiReview(false);
    }
  };

  return (
    <div className="section-page">
      {/* Overview Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon purple">⏱️</div>
          <div className="stat-info">
            <div className="stat-value">{totalHours.toFixed(1)}h</div>
            <div className="stat-label">Total Studied</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon blue">📚</div>
          <div className="stat-info">
            <div className="stat-value">{totalSessions}</div>
            <div className="stat-label">Study Sessions</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon green">🔥</div>
          <div className="stat-info">
            <div className="stat-value">{currentStreak} Days</div>
            <div className="stat-label">Current Streak</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon orange">🎯</div>
          <div className="stat-info">
            <div className="stat-value">
              {logs.length > 0 
                ? (logs.reduce((sum, l) => sum + (l.confidence || 0), 0) / logs.filter(l => l.confidence).length || 0).toFixed(1) 
                : '0.0'}/5
            </div>
            <div className="stat-label">Avg Confidence</div>
          </div>
        </div>
      </div>

      {/* GitHub Heatmap Calendar */}
      <div className="section-card" style={{ overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div>
            <h3 className="section-title" style={{ marginBottom: 0 }}>
              <span className="section-title-emoji">📅</span> 6-Month Study Calendar
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
              Visualizing your daily study efforts. Darker cells represent more hours studied.
            </p>
          </div>
          <button className="btn btn-primary" onClick={generateWeeklyReview} disabled={loadingAiReview}>
            {loadingAiReview ? '⏳ Generating...' : '🤖 Generate AI Weekly Review'}
          </button>
        </div>

        {aiReview && (
          <div style={{ background: 'var(--bg-main)', border: '1px solid var(--accent)', borderRadius: 'var(--radius-md)', padding: '1.5rem', marginBottom: '1.5rem' }}>
            <h4 style={{ color: 'var(--accent)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>✨ AI Weekly Review</h4>
            <div className="markdown-body" style={{ fontSize: '0.9rem' }}>
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{aiReview}</ReactMarkdown>
            </div>
          </div>
        )}

        <div className="heatmap-wrapper">
          {/* Months header labels */}
          <div className="heatmap-months-labels">
            {monthLabels.map((lbl, idx) => (
              <div 
                key={idx} 
                className="heatmap-month" 
                style={{ gridColumnStart: lbl.colIndex + 1 }}
              >
                {lbl.name}
              </div>
            ))}
          </div>

          <div className="heatmap-container">
            {/* Days labels */}
            <div className="heatmap-days-labels">
              <span>Sun</span>
              <span>Mon</span>
              <span>Tue</span>
              <span>Wed</span>
              <span>Thu</span>
              <span>Fri</span>
              <span>Sat</span>
            </div>

            {/* Heatmap grid columns */}
            <div className="heatmap-grid">
              {weeks.map((week, colIdx) => (
                <div key={colIdx} className="heatmap-column-cells">
                  {week.map((day, rowIdx) => {
                    const key = formatDateKey(day);
                    const hours = studyHoursByDate[key] || 0;
                    const isToday = key === formatDateKey(new Date());
                    
                    return (
                      <div
                        key={rowIdx}
                        className={`${getHeatmapCellClass(hours)} ${isToday ? 'heatmap-cell-today' : ''}`}
                        onMouseEnter={() => setHoveredDay({ date: day, hours })}
                        onMouseLeave={() => setHoveredDay(null)}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>

          {/* Heatmap Legend */}
          <div className="heatmap-footer">
            {hoveredDay ? (
              <div className="heatmap-tooltip">
                <strong>{hoveredDay.hours.toFixed(1)} hrs</strong> on {hoveredDay.date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
              </div>
            ) : (
              <div className="heatmap-tooltip-placeholder">Hover over a square to view details.</div>
            )}
            <div className="heatmap-legend">
              <span>Less</span>
              <div className="heatmap-cell level-0" />
              <div className="heatmap-cell level-1" />
              <div className="heatmap-cell level-2" />
              <div className="heatmap-cell level-3" />
              <div className="heatmap-cell level-4" />
              <span>More</span>
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '2rem' }}>
        {/* Topic Distribution Chart */}
        <div className="section-card" style={{ marginBottom: 0 }}>
          <h3 className="section-title">
            <span className="section-title-emoji">📊</span> Hours by Topic
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
            {sortedTopics.map(([topic, hours]) => {
              const percentage = (hours / maxTopicHours) * 100;
              return (
                <div key={topic} style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', fontWeight: 600 }}>
                    <span>{topic}</span>
                    <span style={{ color: 'var(--accent)' }}>{hours.toFixed(1)} hrs</span>
                  </div>
                  <div style={{ background: 'var(--border)', height: '10px', borderRadius: '5px', overflow: 'hidden' }}>
                    <div 
                      style={{ 
                        background: 'linear-gradient(90deg, var(--accent) 0%, #a78bfa 100%)', 
                        height: '100%', 
                        width: `${percentage}%`,
                        borderRadius: '5px',
                        transition: 'width 0.8s ease-out'
                      }} 
                    />
                  </div>
                </div>
              );
            })}
            {sortedTopics.length === 0 && (
              <div className="empty-state" style={{ padding: '2rem 1rem' }}>
                <p>No study logs recorded yet.</p>
              </div>
            )}
          </div>
        </div>

        {/* Confidence Progression / Level */}
        <div className="section-card" style={{ marginBottom: 0 }}>
          <h3 className="section-title">
            <span className="section-title-emoji">💡</span> Topic Confidence
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
            {avgConfidence.slice(0, 8).map(({ topic, avg }) => {
              const avgNum = parseFloat(avg);
              const percentage = (avgNum / 5) * 100;
              let barColor = 'var(--danger)';
              if (avgNum >= 4.0) barColor = 'var(--success)';
              else if (avgNum >= 3.0) barColor = 'var(--warning)';

              return (
                <div key={topic} style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', fontWeight: 600 }}>
                    <span>{topic}</span>
                    <span style={{ color: barColor }}>{avg}/5.0</span>
                  </div>
                  <div style={{ background: 'var(--border)', height: '8px', borderRadius: '4px', overflow: 'hidden' }}>
                    <div 
                      style={{ 
                        background: barColor, 
                        height: '100%', 
                        width: `${percentage}%`,
                        borderRadius: '4px',
                        transition: 'width 0.8s ease-out'
                      }} 
                    />
                  </div>
                </div>
              );
            })}
            {avgConfidence.length === 0 && (
              <div className="empty-state" style={{ padding: '2rem 1rem' }}>
                <p>No confidence ratings recorded yet.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
