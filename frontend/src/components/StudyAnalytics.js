import React, { useEffect, useState, useMemo } from 'react';
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
  const [retentionVisible, setRetentionVisible] = useState(true);


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

      {/* ===== 🧠 Knowledge Retention Section ===== */}
      <RetentionSection logs={logs} retentionVisible={retentionVisible} setRetentionVisible={setRetentionVisible} />
    </div>
  );
}

/* ========================================= */
/*        RETENTION SUB-COMPONENT            */
/* ========================================= */
function RetentionSection({ logs, retentionVisible, setRetentionVisible }) {
  const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const DAY_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  // ── Knowledge Decay: topics not reviewed in 14+ days ──
  const decayAlerts = useMemo(() => {
    const topicLastStudied = {};
    logs.forEach(log => {
      if (!log.topic || !log.date) return;
      const d = new Date(log.date);
      if (!topicLastStudied[log.topic] || d > topicLastStudied[log.topic]) {
        topicLastStudied[log.topic] = d;
      }
    });
    const now = new Date();
    return Object.entries(topicLastStudied)
      .map(([topic, lastDate]) => {
        const daysAgo = Math.floor((now - lastDate) / (1000 * 60 * 60 * 24));
        return { topic, daysAgo, lastDate };
      })
      .filter(t => t.daysAgo >= 14)
      .sort((a, b) => b.daysAgo - a.daysAgo);
  }, [logs]);

  // ── Topic Mastery Grid ──
  const masteryData = useMemo(() => {
    const topicStats = {};
    logs.forEach(log => {
      if (!log.topic) return;
      if (!topicStats[log.topic]) {
        topicStats[log.topic] = { hours: 0, confidenceSum: 0, confidenceCount: 0 };
      }
      topicStats[log.topic].hours += (log.hours || 0);
      if (log.confidence) {
        topicStats[log.topic].confidenceSum += log.confidence;
        topicStats[log.topic].confidenceCount += 1;
      }
    });

    // Read quiz history from localStorage
    let quizHistory = [];
    try {
      quizHistory = JSON.parse(localStorage.getItem('quiz_history') || '[]');
    } catch(e) { /* ignore */ }

    const quizScoresByTopic = {};
    quizHistory.forEach(q => {
      if (!q.topic) return;
      if (!quizScoresByTopic[q.topic]) quizScoresByTopic[q.topic] = { total: 0, count: 0 };
      quizScoresByTopic[q.topic].total += (q.score || 0);
      quizScoresByTopic[q.topic].count += 1;
    });

    const maxHours = Math.max(...Object.values(topicStats).map(s => s.hours), 1);

    return Object.entries(topicStats).map(([topic, stats]) => {
      // Hours factor (0-1): normalized by max hours
      const hoursFactor = Math.min(stats.hours / Math.max(maxHours, 1), 1);
      // Confidence factor (0-1): avg confidence / 5
      const avgConf = stats.confidenceCount > 0 ? stats.confidenceSum / stats.confidenceCount : 0;
      const confFactor = avgConf / 5;
      // Quiz factor (0-1)
      const quizData = quizScoresByTopic[topic];
      const quizFactor = quizData ? Math.min(quizData.total / quizData.count / 100, 1) : 0;

      // Weighted mastery: 40% hours, 35% confidence, 25% quiz
      const hasQuiz = !!quizData;
      let mastery;
      if (hasQuiz) {
        mastery = hoursFactor * 0.4 + confFactor * 0.35 + quizFactor * 0.25;
      } else {
        mastery = hoursFactor * 0.55 + confFactor * 0.45;
      }
      mastery = Math.round(mastery * 100);

      let level, emoji, levelColor;
      if (mastery >= 75) { level = 'Expert'; emoji = '👑'; levelColor = '#f59e0b'; }
      else if (mastery >= 50) { level = 'Proficient'; emoji = '📘'; levelColor = '#3b82f6'; }
      else if (mastery >= 25) { level = 'Competent'; emoji = '📗'; levelColor = '#10b981'; }
      else { level = 'Novice'; emoji = '🌱'; levelColor = '#6b7280'; }

      return { topic, mastery, level, emoji, levelColor, hours: stats.hours, avgConf: avgConf.toFixed(1) };
    }).sort((a, b) => b.mastery - a.mastery);
  }, [logs]);

  // ── Study Hours by Day of Week ──
  const dayOfWeekData = useMemo(() => {
    const dayHours = [0, 0, 0, 0, 0, 0, 0]; // Sun..Sat
    logs.forEach(log => {
      if (!log.date) return;
      const d = new Date(log.date);
      dayHours[d.getDay()] += (log.hours || 0);
    });
    const maxH = Math.max(...dayHours, 1);
    const bestDayIdx = dayHours.indexOf(Math.max(...dayHours));
    return { dayHours, maxH, bestDayIdx };
  }, [logs]);

  // ── Study Consistency Score ──
  const consistencyScore = useMemo(() => {
    const now = new Date();
    const daysWithLogs = new Set();
    logs.forEach(log => {
      if (!log.date) return;
      const d = new Date(log.date);
      const diffDays = Math.floor((now - d) / (1000 * 60 * 60 * 24));
      if (diffDays >= 0 && diffDays < 30) {
        const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
        daysWithLogs.add(key);
      }
    });
    return Math.round((daysWithLogs.size / 30) * 100);
  }, [logs]);

  const consistencyColor = consistencyScore >= 70 ? 'var(--success)' : consistencyScore >= 40 ? '#f59e0b' : 'var(--danger)';
  const circumference = 2 * Math.PI * 54;
  const strokeDash = (consistencyScore / 100) * circumference;

  return (
    <div style={{ marginTop: '2rem' }}>
      <style>{`
        @keyframes retFadeIn {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes retPulseGlow {
          0%, 100% { box-shadow: 0 0 10px rgba(139, 92, 246, 0.1); }
          50% { box-shadow: 0 0 25px rgba(139, 92, 246, 0.25); }
        }
        @keyframes retSlideRight {
          from { width: 0; }
          to { width: var(--target-width); }
        }
        @keyframes retRingFill {
          from { stroke-dashoffset: ${circumference}; }
          to { stroke-dashoffset: ${circumference - strokeDash}; }
        }
        @keyframes retDecayPulse {
          0%, 100% { border-color: rgba(239, 68, 68, 0.3); }
          50% { border-color: rgba(239, 68, 68, 0.7); }
        }
        @keyframes retShimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        .ret-mastery-card:hover {
          transform: translateY(-3px) !important;
          box-shadow: 0 8px 24px rgba(0,0,0,0.3) !important;
        }
        .ret-bar-fill {
          animation: retSlideRight 1s ease-out forwards;
        }
        .ret-decay-card:hover {
          transform: translateX(4px) !important;
        }
      `}</style>

      {/* Section Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1.5rem',
          cursor: 'pointer',
        }}
        onClick={() => setRetentionVisible(!retentionVisible)}
      >
        <div>
          <h3 style={{
            margin: 0,
            fontSize: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            color: 'var(--text-primary)',
          }}>
            <span style={{ fontSize: '1.6rem' }}>🧠</span>
            <span style={{ background: 'linear-gradient(135deg, var(--accent), #a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Knowledge Retention
            </span>
          </h3>
          <p style={{ color: 'var(--text-secondary)', margin: '0.25rem 0 0 0', fontSize: '0.88rem' }}>
            Track mastery, decay, and consistency across your learning journey
          </p>
        </div>
        <span style={{
          color: 'var(--text-muted)',
          fontSize: '1.2rem',
          transition: 'transform 0.3s ease',
          transform: retentionVisible ? 'rotate(0deg)' : 'rotate(-90deg)',
        }}>▼</span>
      </div>

      {retentionVisible && (
        <div style={{ animation: 'retFadeIn 0.4s ease' }}>

          {/* ─── A. Knowledge Decay Alerts ─── */}
          <div className="section-card" style={{ animation: 'retFadeIn 0.4s ease', marginBottom: '1.5rem' }}>
            <h3 className="section-title">
              <span className="section-title-emoji">⚠️</span> Knowledge Decay Alerts
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1rem' }}>
              Topics you haven't revisited in 14+ days — review them before you forget!
            </p>
            {decayAlerts.length === 0 ? (
              <div style={{
                background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.08), rgba(5, 150, 105, 0.05))',
                border: '1px solid var(--success)',
                borderRadius: '10px',
                padding: '1.5rem',
                textAlign: 'center',
              }}>
                <span style={{ fontSize: '1.5rem' }}>✨</span>
                <p style={{ color: 'var(--success)', margin: '0.5rem 0 0 0', fontWeight: 600 }}>All caught up! No decaying topics.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', maxHeight: '320px', overflowY: 'auto' }}>
                {decayAlerts.map((alert, idx) => (
                  <div
                    key={alert.topic}
                    className="ret-decay-card"
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.06), rgba(220, 38, 38, 0.03))',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                      borderRadius: '10px',
                      padding: '0.85rem 1.1rem',
                      animation: `retFadeIn ${0.3 + idx * 0.08}s ease, retDecayPulse 3s ease-in-out infinite`,
                      transition: 'transform 0.2s ease',
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ color: 'var(--danger)', fontWeight: 700 }}>⚠️ {alert.topic}</span>
                        <span style={{
                          background: alert.daysAgo >= 30 ? 'var(--danger)' : 'rgba(239, 68, 68, 0.2)',
                          color: alert.daysAgo >= 30 ? 'white' : 'var(--danger)',
                          padding: '2px 8px',
                          borderRadius: '12px',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                        }}>
                          {alert.daysAgo}d ago
                        </span>
                      </div>
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', margin: '0.2rem 0 0 0' }}>
                        Last studied {alert.lastDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}. Knowledge may be decaying!
                      </p>
                    </div>
                    <button
                      className="btn btn-ghost"
                      onClick={() => window.location.href = '/daily'}
                      style={{ fontSize: '0.78rem', whiteSpace: 'nowrap', padding: '0.4rem 0.8rem' }}
                    >
                      📅 Schedule Review
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ─── B. Topic Mastery Grid ─── */}
          <div className="section-card" style={{ animation: 'retFadeIn 0.5s ease', marginBottom: '1.5rem' }}>
            <h3 className="section-title">
              <span className="section-title-emoji">🎯</span> Topic Mastery Grid
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1rem' }}>
              Your mastery level based on study hours, confidence, and quiz performance
            </p>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
              {[
                { emoji: '🌱', label: 'Novice (0-25%)', color: '#6b7280' },
                { emoji: '📗', label: 'Competent (25-50%)', color: '#10b981' },
                { emoji: '📘', label: 'Proficient (50-75%)', color: '#3b82f6' },
                { emoji: '👑', label: 'Expert (75-100%)', color: '#f59e0b' },
              ].map(l => (
                <span key={l.label} style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                  padding: '0.25rem 0.6rem',
                  borderRadius: '8px',
                  background: `${l.color}15`,
                  border: `1px solid ${l.color}40`,
                  fontSize: '0.75rem',
                  color: l.color,
                  fontWeight: 600,
                }}>
                  {l.emoji} {l.label}
                </span>
              ))}
            </div>
            {masteryData.length === 0 ? (
              <div className="empty-state" style={{ padding: '2rem 1rem' }}>
                <p>No study data available yet.</p>
              </div>
            ) : (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                gap: '0.75rem',
              }}>
                {masteryData.map((item, idx) => (
                  <div
                    key={item.topic}
                    className="ret-mastery-card"
                    style={{
                      background: `linear-gradient(135deg, ${item.levelColor}10, ${item.levelColor}05)`,
                      border: `1px solid ${item.levelColor}40`,
                      borderRadius: '12px',
                      padding: '1rem',
                      transition: 'all 0.25s ease',
                      cursor: 'default',
                      animation: `retFadeIn ${0.3 + idx * 0.06}s ease`,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <span style={{ fontSize: '1.3rem' }}>{item.emoji}</span>
                      <span style={{
                        background: `${item.levelColor}25`,
                        color: item.levelColor,
                        padding: '2px 8px',
                        borderRadius: '10px',
                        fontSize: '0.7rem',
                        fontWeight: 700,
                      }}>{item.mastery}%</span>
                    </div>
                    <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-primary)', marginBottom: '0.3rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.topic}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      {item.hours.toFixed(1)}h · {item.avgConf}/5 conf
                    </div>
                    <div style={{
                      marginTop: '0.5rem',
                      background: 'var(--border)',
                      height: '4px',
                      borderRadius: '2px',
                      overflow: 'hidden',
                    }}>
                      <div className="ret-bar-fill" style={{
                        height: '100%',
                        background: item.levelColor,
                        borderRadius: '2px',
                        '--target-width': `${item.mastery}%`,
                        width: `${item.mastery}%`,
                      }} />
                    </div>
                    <div style={{ fontSize: '0.7rem', color: item.levelColor, fontWeight: 600, marginTop: '0.3rem' }}>
                      {item.level}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Bottom Grid: Study Time + Consistency */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '1.5rem' }}>

            {/* ─── C. Optimal Study Time ─── */}
            <div className="section-card" style={{ animation: 'retFadeIn 0.6s ease', marginBottom: 0 }}>
              <h3 className="section-title">
                <span className="section-title-emoji">📊</span> Optimal Study Time
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
                Your study hours distribution by day of week
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                {DAY_NAMES.map((day, idx) => {
                  const hours = dayOfWeekData.dayHours[idx];
                  const pct = dayOfWeekData.maxH > 0 ? (hours / dayOfWeekData.maxH) * 100 : 0;
                  const isBest = idx === dayOfWeekData.bestDayIdx && hours > 0;
                  return (
                    <div key={day} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                      <span style={{
                        width: '36px',
                        fontSize: '0.82rem',
                        fontWeight: isBest ? 800 : 600,
                        color: isBest ? 'var(--accent)' : 'var(--text-secondary)',
                      }}>{day}</span>
                      <div style={{ flex: 1, background: 'var(--border)', height: '14px', borderRadius: '7px', overflow: 'hidden' }}>
                        <div className="ret-bar-fill" style={{
                          height: '100%',
                          background: isBest
                            ? 'linear-gradient(90deg, var(--accent), #a78bfa)'
                            : 'linear-gradient(90deg, rgba(139, 92, 246, 0.4), rgba(99, 102, 241, 0.3))',
                          borderRadius: '7px',
                          '--target-width': `${pct}%`,
                          width: `${pct}%`,
                          boxShadow: isBest ? '0 0 10px rgba(139, 92, 246, 0.4)' : 'none',
                        }} />
                      </div>
                      <span style={{
                        width: '50px',
                        textAlign: 'right',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        color: isBest ? 'var(--accent)' : 'var(--text-muted)',
                      }}>{hours.toFixed(1)}h</span>
                    </div>
                  );
                })}
              </div>
              {dayOfWeekData.dayHours.some(h => h > 0) && (
                <div style={{
                  marginTop: '1.25rem',
                  padding: '0.85rem 1rem',
                  background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.08), rgba(59, 130, 246, 0.05))',
                  border: '1px solid var(--accent)',
                  borderRadius: '10px',
                  fontSize: '0.85rem',
                  color: 'var(--text-primary)',
                }}>
                  💡 You're most productive on <strong style={{ color: 'var(--accent)' }}>{DAY_FULL[dayOfWeekData.bestDayIdx]}s</strong>. Consider scheduling hard topics then.
                </div>
              )}
            </div>

            {/* ─── D. Study Consistency Score ─── */}
            <div className="section-card" style={{ animation: 'retFadeIn 0.7s ease', marginBottom: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <h3 className="section-title" style={{ alignSelf: 'flex-start', width: '100%' }}>
                <span className="section-title-emoji">🔄</span> Study Consistency
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1.5rem', alignSelf: 'flex-start' }}>
                How regularly you've studied in the last 30 days
              </p>

              {/* Ring Gauge */}
              <div style={{ position: 'relative', width: '140px', height: '140px', marginBottom: '1rem' }}>
                <svg width="140" height="140" viewBox="0 0 140 140" style={{ transform: 'rotate(-90deg)' }}>
                  {/* Background ring */}
                  <circle cx="70" cy="70" r="54" fill="none" stroke="var(--border)" strokeWidth="10" />
                  {/* Progress ring */}
                  <circle
                    cx="70" cy="70" r="54"
                    fill="none"
                    stroke={consistencyColor}
                    strokeWidth="10"
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={circumference - strokeDash}
                    style={{ animation: 'retRingFill 1.5s ease-out forwards', filter: `drop-shadow(0 0 6px ${consistencyColor})` }}
                  />
                </svg>
                <div style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  textAlign: 'center',
                }}>
                  <div style={{ fontSize: '2rem', fontWeight: 800, color: consistencyColor, lineHeight: 1 }}>
                    {consistencyScore}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>/ 100</div>
                </div>
              </div>

              <div style={{
                textAlign: 'center',
                fontSize: '0.9rem',
                fontWeight: 700,
                color: consistencyColor,
                marginBottom: '0.5rem',
              }}>
                {consistencyScore >= 80 ? '🔥 Outstanding!' : consistencyScore >= 60 ? '💪 Great Progress!' : consistencyScore >= 40 ? '📈 Building Momentum' : consistencyScore >= 20 ? '🌱 Getting Started' : '⏰ Time to Study!'}
              </div>

              <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem', textAlign: 'center', maxWidth: '280px' }}>
                You studied on <strong style={{ color: 'var(--text-primary)' }}>{Math.round(consistencyScore * 30 / 100)}</strong> out of the last 30 days.
                {consistencyScore < 60 && ' Try to study a little each day for better retention.'}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
