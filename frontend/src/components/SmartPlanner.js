import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { fetchStudyLogs } from '../api/studyLogApi';
import { fetchQuestions } from '../api/questionBankApi';
import { fetchDailyPlans, bulkCreateDailyPlans } from '../api/dailyPlanApi';
import callAI from '../api/aiApi';

const STYLE = `
@keyframes sp-fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}
@keyframes sp-slide-up {
  from { opacity: 0; transform: translateY(40px) scale(0.97); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}
@keyframes sp-card-enter {
  from { opacity: 0; transform: translateY(20px) scale(0.95); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}
@keyframes sp-shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}
@keyframes sp-pulse-border {
  0%, 100% { border-color: var(--accent); box-shadow: 0 0 0 0 rgba(99,102,241,0.1); }
  50% { border-color: var(--accent-glow, var(--accent)); box-shadow: 0 0 20px 2px rgba(99,102,241,0.15); }
}
@keyframes sp-spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
@keyframes sp-success-pop {
  0% { transform: scale(0); opacity: 0; }
  50% { transform: scale(1.2); }
  100% { transform: scale(1); opacity: 1; }
}
`;

const DAY_COLORS = [
  { bg: 'rgba(99,102,241,0.08)', border: 'rgba(99,102,241,0.25)', accent: '#6366f1' },
  { bg: 'rgba(6,182,212,0.08)', border: 'rgba(6,182,212,0.25)', accent: '#06b6d4' },
  { bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.25)', accent: '#f59e0b' },
  { bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.25)', accent: '#10b981' },
  { bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.25)', accent: '#ef4444' },
  { bg: 'rgba(168,85,247,0.08)', border: 'rgba(168,85,247,0.25)', accent: '#a855f7' },
  { bg: 'rgba(236,72,153,0.08)', border: 'rgba(236,72,153,0.25)', accent: '#ec4899' },
];

const DAY_ICONS = ['📅', '🔥', '⚡', '🚀', '💪', '🎯', '🏆'];

function SkeletonCard({ index }) {
  return (
    <div style={{
      background: 'var(--bg-card)',
      borderRadius: 12,
      padding: '1.25rem',
      border: '1px solid var(--border)',
      animation: `sp-card-enter 0.4s ease-out ${index * 0.1}s both`,
    }}>
      <div style={{
        height: 18, width: '40%', borderRadius: 6, marginBottom: 12,
        background: 'linear-gradient(90deg, var(--bg-main) 25%, var(--border) 50%, var(--bg-main) 75%)',
        backgroundSize: '200% 100%',
        animation: 'sp-shimmer 1.5s infinite',
      }} />
      <div style={{
        height: 14, width: '75%', borderRadius: 4, marginBottom: 8,
        background: 'linear-gradient(90deg, var(--bg-main) 25%, var(--border) 50%, var(--bg-main) 75%)',
        backgroundSize: '200% 100%',
        animation: 'sp-shimmer 1.5s infinite 0.2s',
      }} />
      <div style={{
        height: 14, width: '90%', borderRadius: 4, marginBottom: 8,
        background: 'linear-gradient(90deg, var(--bg-main) 25%, var(--border) 50%, var(--bg-main) 75%)',
        backgroundSize: '200% 100%',
        animation: 'sp-shimmer 1.5s infinite 0.3s',
      }} />
      <div style={{
        height: 14, width: '55%', borderRadius: 4,
        background: 'linear-gradient(90deg, var(--bg-main) 25%, var(--border) 50%, var(--bg-main) 75%)',
        backgroundSize: '200% 100%',
        animation: 'sp-shimmer 1.5s infinite 0.4s',
      }} />
    </div>
  );
}

function DayCard({ plan, index, editing, onEdit, onUpdate }) {
  const colors = DAY_COLORS[index % DAY_COLORS.length];
  const icon = DAY_ICONS[index % DAY_ICONS.length];

  return (
    <div style={{
      background: editing ? 'var(--bg-card)' : colors.bg,
      borderRadius: 12,
      border: `1.5px solid ${editing ? 'var(--accent)' : colors.border}`,
      padding: '1.25rem',
      animation: `sp-card-enter 0.4s ease-out ${index * 0.08}s both`,
      transition: 'all 0.3s ease',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Day header */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: '0.75rem',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            fontSize: '1.3rem',
            width: 36, height: 36,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: `${colors.accent}18`,
            borderRadius: 8,
          }}>
            {icon}
          </span>
          <div>
            <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              {plan.day}
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 500 }}>
              {plan.hours_planned}h planned
            </div>
          </div>
        </div>
        <button
          className="btn btn-ghost"
          onClick={() => onEdit(index)}
          style={{ padding: '0.25rem 0.5rem', fontSize: '0.7rem' }}
        >
          {editing ? '✖ Close' : '✏️ Tweak'}
        </button>
      </div>

      {editing ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div>
            <label style={fieldLabel}>Focus Area</label>
            <input
              className="form-control"
              value={plan.focus_area}
              onChange={e => onUpdate(index, 'focus_area', e.target.value)}
              style={{ fontSize: '0.85rem', padding: '0.4rem 0.6rem' }}
            />
          </div>
          <div>
            <label style={fieldLabel}>Tasks</label>
            <textarea
              className="form-control"
              value={plan.tasks}
              onChange={e => onUpdate(index, 'tasks', e.target.value)}
              rows={3}
              style={{ fontSize: '0.85rem', padding: '0.4rem 0.6rem', resize: 'vertical' }}
            />
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <div style={{ flex: 1 }}>
              <label style={fieldLabel}>Hours</label>
              <input
                className="form-control"
                type="number"
                min={0}
                step={0.5}
                value={plan.hours_planned}
                onChange={e => onUpdate(index, 'hours_planned', parseFloat(e.target.value) || 0)}
                style={{ fontSize: '0.85rem', padding: '0.4rem 0.6rem' }}
              />
            </div>
            <div style={{ flex: 2 }}>
              <label style={fieldLabel}>Notes</label>
              <input
                className="form-control"
                value={plan.notes || ''}
                onChange={e => onUpdate(index, 'notes', e.target.value)}
                style={{ fontSize: '0.85rem', padding: '0.4rem 0.6rem' }}
              />
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Focus area chip */}
          <div style={{
            display: 'inline-block',
            background: `${colors.accent}18`,
            color: colors.accent,
            padding: '0.2rem 0.6rem',
            borderRadius: 6,
            fontSize: '0.78rem',
            fontWeight: 600,
            marginBottom: '0.5rem',
          }}>
            {plan.focus_area}
          </div>

          {/* Tasks */}
          <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '0.5rem' }}>
            {plan.tasks}
          </div>

          {/* Notes */}
          {plan.notes && (
            <div style={{
              fontSize: '0.72rem', color: 'var(--text-muted)', fontStyle: 'italic',
              borderTop: `1px solid ${colors.border}`,
              paddingTop: '0.4rem', marginTop: '0.25rem',
            }}>
              💡 {plan.notes}
            </div>
          )}
        </>
      )}
    </div>
  );
}

const fieldLabel = {
  display: 'block', fontSize: '0.65rem', fontWeight: 600,
  color: 'var(--text-muted)', textTransform: 'uppercase',
  letterSpacing: '0.05em', marginBottom: 3,
};

export default function SmartPlanner({ onClose }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [plan, setPlan] = useState(null);
  const [editingIndex, setEditingIndex] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [contextSummary, setContextSummary] = useState('');
  const [customStartDate, setCustomStartDate] = useState('');
  const [numDays, setNumDays] = useState(7);
  const [showConfig, setShowConfig] = useState(false);

  const gatherAndGenerate = useCallback(async () => {
    setLoading(true);
    setError(null);
    setPlan(null);
    setSaved(false);
    setEditingIndex(null);

    try {
      // Gather context
      const [logsRes, questionsRes, plansRes] = await Promise.all([
        fetchStudyLogs().catch(() => ({ data: [] })),
        fetchQuestions().catch(() => ({ data: [] })),
        fetchDailyPlans().catch(() => ({ data: [] })),
      ]);

      const logs = logsRes.data || [];
      const questions = questionsRes.data || [];
      const existingPlans = plansRes.data || [];

      // Extract topics with hours and confidence from logs
      const topicMap = {};
      logs.forEach(l => {
        const topic = l.topic || l.focus_area || 'Unknown';
        if (!topicMap[topic]) topicMap[topic] = { hours: 0, confidence: [] };
        topicMap[topic].hours += parseFloat(l.hours) || 0;
        if (l.confidence != null) topicMap[topic].confidence.push(l.confidence);
      });

      const topicSummary = Object.entries(topicMap).map(([topic, data]) => {
        const avgConf = data.confidence.length > 0
          ? (data.confidence.reduce((a, b) => a + b, 0) / data.confidence.length).toFixed(1)
          : 'N/A';
        return `${topic}: ${data.hours.toFixed(1)}h studied, confidence: ${avgConf}/5`;
      }).join('\n');

      // Weak areas
      const weakQuestions = questions
        .filter(q => (q.confidence != null && q.confidence <= 2) || (q.next_review && new Date(q.next_review) <= new Date()))
        .slice(0, 15);
      const weakAreas = weakQuestions.length > 0
        ? weakQuestions.map(q => `"${q.question}" (topic: ${q.topic || 'unknown'}, confidence: ${q.confidence ?? 'N/A'})`).join('\n')
        : 'No clearly weak areas identified.';

      // Current week plans
      const now = new Date();
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - now.getDay());
      const currentWeekPlans = existingPlans
        .filter(p => new Date(p.date) >= weekStart)
        .map(p => `${p.date}: ${p.focus_area} (${p.status})`)
        .join('\n');

      const summary = `${Object.keys(topicMap).length} topics studied, ${questions.length} questions in bank, ${existingPlans.length} existing plans`;
      setContextSummary(summary);

      // Compute start date (custom or next Monday)
      let startDate;
      if (customStartDate) {
        startDate = new Date(customStartDate);
      } else {
        startDate = new Date(now);
        startDate.setDate(now.getDate() + (8 - now.getDay()) % 7 || 7);
      }

      const prompt = `Based on my study data:
TOPICS WITH HOURS AND CONFIDENCE:
${topicSummary || 'No study logs yet.'}

WEAK AREAS (low confidence / overdue SRS):
${weakAreas}

EXISTING PLANS THIS WEEK:
${currentWeekPlans || 'No plans yet.'}

Generate an optimal ${numDays}-day study plan starting ${startDate.toISOString().slice(0, 10)}.
Focus on strengthening weak areas while maintaining progress on strong areas.
Balance study hours across the days (aim for 2-4 hours per day).
Include specific, actionable tasks (semicolon-separated).

Return ONLY valid JSON, no markdown fences, no extra text. The format must be:
[{"day": "Day 1", "focus_area": "...", "tasks": "task1; task2; task3", "hours_planned": 2, "notes": "..."}]

Return exactly ${numDays} objects.`;

      const response = await callAI(prompt);

      // Parse the response
      let parsed;
      try {
        // Try extracting JSON from possible markdown code block
        const jsonMatch = response.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          parsed = JSON.parse(jsonMatch[0]);
        } else {
          parsed = JSON.parse(response);
        }
      } catch (parseErr) {
        throw new Error('AI returned invalid JSON. Please try regenerating.\n\nRaw response:\n' + response.slice(0, 500));
      }

      if (!Array.isArray(parsed) || parsed.length === 0) {
        throw new Error('AI returned an empty or invalid plan.');
      }

      // Assign dates
      const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
      const enriched = parsed.slice(0, numDays).map((item, i) => {
        const date = new Date(startDate);
        date.setDate(startDate.getDate() + i);
        return {
          day: item.day || days[i % 7] || ('Day ' + (i + 1)),
          focus_area: item.focus_area || 'General Study',
          tasks: item.tasks || '',
          hours_planned: parseFloat(item.hours_planned) || 2,
          notes: item.notes || '',
          date: date.toISOString().slice(0, 10),
        };
      });

      setPlan(enriched);
    } catch (err) {
      setError(err.message || 'Failed to generate plan.');
    } finally {
      setLoading(false);
    }
  }, [customStartDate, numDays]);

  useEffect(() => {
    gatherAndGenerate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleUpdateField = useCallback((index, field, value) => {
    setPlan(prev => prev.map((p, i) => i === index ? { ...p, [field]: value } : p));
  }, []);

  const handleAccept = useCallback(async () => {
    if (!plan) return;
    setSaving(true);
    try {
      const payload = plan.map((p, i) => ({
        date: p.date,
        day: i + 1,
        focus_area: p.focus_area,
        tasks: p.tasks,
        hours_planned: p.hours_planned,
        notes: p.notes || '',
        status: 'Not Started',
        week: `Week-${p.date.slice(0, 4)}-${Math.ceil((new Date(p.date).getTime() - new Date(p.date.slice(0, 4) + '-01-01').getTime()) / (7 * 86400000))}`,
      }));
      await bulkCreateDailyPlans(payload);
      setSaved(true);
      setTimeout(() => {
        if (onClose) onClose();
      }, 1500);
    } catch (err) {
      setError('Failed to save plans: ' + (err.message || 'Unknown error'));
    } finally {
      setSaving(false);
    }
  }, [plan, onClose]);

  const totalHours = useMemo(() => {
    if (!plan) return 0;
    return plan.reduce((sum, p) => sum + (p.hours_planned || 0), 0);
  }, [plan]);

  return (
    <>
      <style>{STYLE}</style>
      <div style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,0.7)',
        backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        padding: '2rem',
        overflowY: 'auto',
        animation: 'sp-fade-in 0.3s ease-out',
      }}>
        <div style={{
          width: '100%', maxWidth: 900,
          background: 'var(--bg-card)',
          borderRadius: 16,
          border: '1px solid var(--border)',
          boxShadow: '0 24px 80px rgba(0,0,0,0.4)',
          animation: 'sp-slide-up 0.4s ease-out',
          position: 'relative',
        }}>
          {/* Header */}
          <div style={{
            padding: '1.5rem 2rem',
            borderBottom: '1px solid var(--border)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            background: 'linear-gradient(135deg, rgba(99,102,241,0.05), rgba(168,85,247,0.05))',
            borderRadius: '16px 16px 0 0',
          }}>
            <div>
              <h2 style={{
                margin: 0, fontSize: '1.3rem', fontWeight: 800,
                color: 'var(--text-primary)',
                display: 'flex', alignItems: 'center', gap: 8,
              }}>
                <span style={{ fontSize: '1.5rem' }}>🤖</span>
                AI Smart Weekly Planner
              </h2>
              <p style={{ margin: '0.25rem 0 0', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                {contextSummary ? `Analyzing: ${contextSummary}` : 'Gathering your study data...'}
              </p>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <button
                onClick={() => setShowConfig(!showConfig)}
                style={{
                  background: 'transparent', border: 'none', cursor: 'pointer',
                  fontSize: '1.2rem', color: showConfig ? 'var(--accent)' : 'var(--text-muted)',
                  padding: '0.25rem', borderRadius: 6,
                  transition: 'color 0.2s',
                }}
                title="Configure Plan Settings"
              >
                ⚙️
              </button>
              <button
                onClick={onClose}
                style={{
                  background: 'transparent', border: 'none', cursor: 'pointer',
                  fontSize: '1.4rem', color: 'var(--text-muted)',
                  padding: '0.25rem', borderRadius: 6,
                  transition: 'color 0.2s',
                }}
                onMouseEnter={e => e.target.style.color = 'var(--danger)'}
                onMouseLeave={e => e.target.style.color = 'var(--text-muted)'}
              >
                ✖
              </button>
            </div>
          </div>

          {/* Config panel */}
          {showConfig && (
            <div style={{ padding: '1rem 2rem', borderBottom: '1px solid var(--border)', background: 'var(--bg-main)', display: 'flex', gap: '1.5rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
              <div>
                <label style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '0.25rem' }}>Start Date</label>
                <input type="date" className="form-control" value={customStartDate} onChange={e => setCustomStartDate(e.target.value)} style={{ padding: '0.4rem 0.6rem', fontSize: '0.85rem', width: '160px' }} />
              </div>
              <div>
                <label style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '0.25rem' }}>Duration (days)</label>
                <select className="form-control" value={numDays} onChange={e => setNumDays(parseInt(e.target.value))} style={{ padding: '0.4rem 0.6rem', fontSize: '0.85rem', width: '100px' }}>
                  <option value={3}>3 days</option>
                  <option value={5}>5 days</option>
                  <option value={7}>7 days</option>
                  <option value={10}>10 days</option>
                  <option value={14}>14 days</option>
                </select>
              </div>
              <button className="btn btn-primary" onClick={gatherAndGenerate} style={{ padding: '0.4rem 1rem', fontSize: '0.85rem' }}>Apply &amp; Regenerate</button>
            </div>
          )}

          {/* Body */}
          <div style={{ padding: '1.5rem 2rem' }}>
            {/* Loading state */}
            {loading && (
              <div>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  marginBottom: '1.25rem',
                  padding: '0.75rem 1rem',
                  background: 'rgba(99,102,241,0.06)',
                  borderRadius: 10,
                  border: '1px solid rgba(99,102,241,0.15)',
                  animation: 'sp-pulse-border 2s ease-in-out infinite',
                }}>
                  <div style={{
                    width: 22, height: 22,
                    border: '2.5px solid var(--accent)',
                    borderTopColor: 'transparent',
                    borderRadius: '50%',
                    animation: 'sp-spin 0.8s linear infinite',
                  }} />
                  <span style={{ fontSize: '0.85rem', color: 'var(--accent)', fontWeight: 600 }}>
                    AI is crafting your optimal study plan...
                  </span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '1rem' }}>
                  {Array.from({ length: 7 }, (_, i) => <SkeletonCard key={i} index={i} />)}
                </div>
              </div>
            )}

            {/* Error state */}
            {error && !loading && (
              <div style={{
                padding: '1.5rem',
                background: 'rgba(239,68,68,0.08)',
                border: '1px solid rgba(239,68,68,0.25)',
                borderRadius: 12,
                marginBottom: '1rem',
              }}>
                <div style={{ fontWeight: 700, color: 'var(--danger)', marginBottom: 8, fontSize: '0.9rem' }}>
                  ❌ Generation Failed
                </div>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
                  {error}
                </div>
                <button
                  className="btn btn-primary"
                  onClick={gatherAndGenerate}
                  style={{ marginTop: '1rem', fontSize: '0.85rem' }}
                >
                  🔄 Try Again
                </button>
              </div>
            )}

            {/* Success — saved */}
            {saved && (
              <div style={{
                textAlign: 'center', padding: '3rem 1rem',
                animation: 'sp-success-pop 0.5s ease-out',
              }}>
                <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>🎉</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--success)' }}>
                  Plan saved successfully!
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                  Your 7-day study plan has been added to your daily plans.
                </div>
              </div>
            )}

            {/* Plan cards */}
            {plan && !loading && !saved && (
              <>
                {/* Summary bar */}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '1.5rem',
                  marginBottom: '1.25rem',
                  padding: '0.65rem 1rem',
                  background: 'var(--bg-main)',
                  borderRadius: 10,
                  border: '1px solid var(--border)',
                  fontSize: '0.8rem',
                }}>
                  <span style={{ color: 'var(--text-secondary)' }}>
                    📅 <strong style={{ color: 'var(--text-primary)' }}>7</strong> days
                  </span>
                  <span style={{ color: 'var(--text-secondary)' }}>
                    ⏱️ <strong style={{ color: 'var(--accent)' }}>{totalHours}h</strong> total
                  </span>
                  <span style={{ color: 'var(--text-secondary)' }}>
                    🎯 <strong style={{ color: 'var(--text-primary)' }}>{[...new Set(plan.map(p => p.focus_area))].length}</strong> focus areas
                  </span>
                  <span style={{ color: 'var(--text-secondary)', marginLeft: 'auto', fontSize: '0.72rem' }}>
                    Starting {plan[0]?.date}
                  </span>
                </div>

                {/* Day cards grid */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
                  gap: '1rem',
                  marginBottom: '1.5rem',
                }}>
                  {plan.map((dayPlan, i) => (
                    <DayCard
                      key={i}
                      plan={dayPlan}
                      index={i}
                      editing={editingIndex === i}
                      onEdit={idx => setEditingIndex(editingIndex === idx ? null : idx)}
                      onUpdate={handleUpdateField}
                    />
                  ))}
                </div>

                {/* Action buttons */}
                <div style={{
                  display: 'flex', gap: '0.75rem', justifyContent: 'center',
                  paddingTop: '0.5rem',
                  borderTop: '1px solid var(--border)',
                  paddingBottom: '0.5rem',
                }}>
                  <button
                    className="btn btn-primary"
                    onClick={handleAccept}
                    disabled={saving}
                    style={{
                      padding: '0.6rem 1.5rem',
                      fontSize: '0.9rem',
                      fontWeight: 700,
                      display: 'flex', alignItems: 'center', gap: 6,
                    }}
                  >
                    {saving ? (
                      <>
                        <span style={{
                          width: 16, height: 16,
                          border: '2px solid #fff',
                          borderTopColor: 'transparent',
                          borderRadius: '50%',
                          animation: 'sp-spin 0.8s linear infinite',
                          display: 'inline-block',
                        }} />
                        Saving...
                      </>
                    ) : '✅ Accept Plan'}
                  </button>
                  <button
                    className="btn btn-ghost"
                    onClick={gatherAndGenerate}
                    disabled={saving}
                    style={{ padding: '0.6rem 1.25rem', fontSize: '0.9rem' }}
                  >
                    🔄 Regenerate
                  </button>
                  <button
                    className="btn btn-ghost"
                    onClick={onClose}
                    style={{ padding: '0.6rem 1.25rem', fontSize: '0.9rem' }}
                  >
                    Cancel
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
