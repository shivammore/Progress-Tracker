import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { fetchDailyPlans, deleteDailyPlan, updateDailyPlan } from '../api/dailyPlanApi';
import DailyPlanForm from './DailyPlanForm';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const getDailyPlanStatusBadge = (status) => {
  const s = (status || '').toLowerCase();
  if (s.includes('done') || s.includes('complete')) return 'status-badge status-success';
  if (s.includes('progress')) return 'status-badge status-info';
  if (s.includes('skip') || s.includes('fail')) return 'status-badge status-danger';
  return 'status-badge status-neutral';
};

const getStatusIcon = (status) => {
  const s = (status || '').toLowerCase();
  if (s.includes('done') || s.includes('complete')) return '✅';
  if (s.includes('progress')) return '🔄';
  if (s.includes('skip')) return '⏭️';
  return '⬜';
};

// Parse semicolon-separated tasks into a checklist with interactive checkboxes



function TaskChecklist({ plan, onToggleTask, reloadPlans }) {
  const tasks = plan.tasks;
  const [showOutput, setShowOutput] = React.useState({}); // {index: bool}
  const [loadingOutput, setLoadingOutput] = React.useState({}); // {index: bool}

  // Always derive outputs from plan.ai_guide (source of truth)
  let aiOutputs = {};
  if (plan.ai_guide) {
    try {
      const parsed = JSON.parse(plan.ai_guide);
      if (typeof parsed === 'object' && parsed !== null) aiOutputs = parsed;
    } catch (e) {}
  }


  // Generate AI output for a single task using Gemini
  const generateTaskGuide = async (task, index) => {
    setLoadingOutput(prev => ({ ...prev, [index]: true }));
    try {
      const gatewayUrl = localStorage.getItem('AI_GATEWAY_URL') || '';
      const apiKey = localStorage.getItem('AI_API_KEY');
      const model = localStorage.getItem('AI_MODEL') || '';
      if (!apiKey) {
        // Save error to backend as well
        const newOutputs = { ...aiOutputs, [index]: '❌ API Key not set in Settings.' };
        const updatedPlan = { ...plan, ai_guide: JSON.stringify(newOutputs) };
        await updateDailyPlan(plan.id, updatedPlan);
        setLoadingOutput(prev => ({ ...prev, [index]: false }));
        return;
      }
      const prompt = `I am preparing for software/data engineering interviews.\nMy focus area for today is '${plan.focus_area}'.\nToday's task: ${task}\n\nPlease act as an expert technical tutor. Provide a comprehensive, high-quality study guide for this specific task.\nYou MUST provide the actual answers, solutions, and detailed explanations for any concepts, questions, or topics mentioned in the task. Do not just tell me what to study; actually teach it to me and provide the material directly in your response.\nFormat your response cleanly in Markdown, using headings, bullet points, tables, and code blocks where appropriate to make the UI look premium. Keep it highly actionable.`;

      // Only use Gemini logic if the URL is clearly a Google Gemini endpoint
      let url = '';
      let headers = {};
      let body = {};
      if (/generativelanguage\.googleapis\.com/.test(gatewayUrl)) {
        // Gemini-compatible (Google)
        url = `${gatewayUrl.replace(/\/$/, '')}/${model}:generateContent?key=${apiKey}`;
        headers = { 'Content-Type': 'application/json' };
        body = { contents: [{ parts: [{ text: prompt }] }] };
      } else {
        // Default to OpenAI-compatible
        url = gatewayUrl.endsWith('/v1/chat/completions') ? gatewayUrl : `${gatewayUrl.replace(/\/$/, '')}/v1/chat/completions`;
        headers = {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        };
        body = {
          model,
          messages: [
            { role: 'system', content: 'You are a helpful technical tutor.' },
            { role: 'user', content: prompt }
          ],
          temperature: 0.7
        };
      }

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body)
      });
      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errText}`);
      }
      const data = await response.json();
      let text = '';
      if (data.choices && data.choices[0]?.message?.content) {
        // OpenAI
        text = data.choices[0].message.content;
      } else if (data.candidates && data.candidates[0]?.content?.parts) {
        // Gemini
        text = data.candidates[0].content.parts.map(p => p.text).join('\n');
      } else {
        text = JSON.stringify(data);
      }
      // Save to backend (merge with previous outputs)
      const newOutputs = { ...aiOutputs, [index]: text };
      const updatedPlan = { ...plan, ai_guide: JSON.stringify(newOutputs) };
      await updateDailyPlan(plan.id, updatedPlan);
      if (typeof reloadPlans === 'function') await reloadPlans();
    } catch (error) {
      const newOutputs = { ...aiOutputs, [index]: '❌ Error: ' + error.message };
      const updatedPlan = { ...plan, ai_guide: JSON.stringify(newOutputs) };
      await updateDailyPlan(plan.id, updatedPlan);
      if (typeof reloadPlans === 'function') await reloadPlans();
    } finally {
      setLoadingOutput(prev => ({ ...prev, [index]: false }));
    }
  };

  if (!tasks) return <span style={{ color: 'var(--text-muted)' }}>No tasks defined</span>;

  const items = tasks.split(';').map(t => {
    let text = t.trim();
    if (!text) return null;
    let done = false;
    if (text.startsWith('[x] ') || text.startsWith('[X] ')) { done = true; text = text.substring(4); }
    else if (text.startsWith('[ ] ')) { done = false; text = text.substring(4); }
    return { text, done, original: t.trim() };
  }).filter(Boolean);

  const doneCount = items.filter(i => i.done).length;
  const progressPct = items.length > 0 ? Math.round((doneCount / items.length) * 100) : 0;

  const handleToggle = (index) => {
    const newItems = [...items];
    newItems[index].done = !newItems[index].done;
    const newTasksString = newItems.map(item => `[${item.done ? 'x' : ' '}] ${item.text}`).join('; ');
    onToggleTask(plan, newTasksString);
  };

  const renderTaskText = (text) => {
    const parts = [];
    const regex = /\[(.*?)\]\((.*?)\)/g;
    let lastIndex = 0; let match;
    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIndex) parts.push(<span key={lastIndex}>{text.slice(lastIndex, match.index)}</span>);
      parts.push(<a key={match.index} href={match[2]} target="_blank" rel="noreferrer" style={{ color: 'var(--accent)', textDecoration: 'underline', fontWeight: 500 }} onClick={e => e.stopPropagation()}>{match[1]}</a>);
      lastIndex = regex.lastIndex;
    }
    if (lastIndex < text.length) parts.push(<span key={lastIndex}>{text.slice(lastIndex)}</span>);
    return parts.length > 0 ? parts : text;
  };

  const handleToggleOutput = (index, task) => {
    setShowOutput(prev => {
      const next = { ...prev, [index]: !prev[index] };
      if (next[index] && !loadingOutput[index] && (!aiOutputs || !aiOutputs[index])) generateTaskGuide(task, index);
      return next;
    });
  };

  return (
    <div>
      {/* Progress bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
        <div className="dp-progress-bar" style={{ marginBottom: 0, flex: 1 }}>
          <div className="dp-progress-fill" style={{ width: `${progressPct}%` }} />
        </div>
        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: progressPct === 100 ? 'var(--success)' : 'var(--accent)', whiteSpace: 'nowrap' }}>
          {doneCount}/{items.length} · {progressPct}%
        </span>
      </div>
      {/* Task items */}
      <div>
        {items.map((item, i) => (
          <div key={i} className={`dp-task-item ${item.done ? 'dp-task-done' : ''}`}>
            <div className="dp-task-row">
              <span className="dp-task-number">{i + 1}</span>
              <div className={`dp-checkbox ${item.done ? 'checked' : ''}`} onClick={(e) => { e.stopPropagation(); handleToggle(i); }}>{item.done && '✓'}</div>
              <div className="dp-task-text">{renderTaskText(item.text)}</div>
              <div className="dp-task-actions">
                <button className={`dp-task-btn ${showOutput[i] ? 'active' : ''}`} onClick={e => { e.stopPropagation(); handleToggleOutput(i, item.text); }} disabled={loadingOutput[i]}>
                  {loadingOutput[i] ? '⏳' : showOutput[i] ? '▲ Hide' : '▼ AI Guide'}
                </button>
                {showOutput[i] && aiOutputs[i] && (
                  <button className="dp-task-btn" onClick={e => { e.stopPropagation(); generateTaskGuide(item.text, i); }} disabled={loadingOutput[i]} title="Regenerate">🔄</button>
                )}
              </div>
            </div>
            {showOutput[i] && (
              <div className="ai-guide-box" style={{ margin: '0.5rem 0 0.25rem 2.5rem', padding: '1rem' }}>
                {loadingOutput[i] ? (
                  <div className="chat-loading" style={{ padding: '0.5rem 0' }}><div className="typing-dot"></div><div className="typing-dot"></div><div className="typing-dot"></div></div>
                ) : aiOutputs[i] ? (
                  <div className="markdown-body"><ReactMarkdown remarkPlugins={[remarkGfm]}>{aiOutputs[i]}</ReactMarkdown></div>
                ) : (
                  <span style={{ color: 'var(--text-muted)' }}>No output yet.</span>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// Inline edit form for a single plan
function EditPlanInline({ plan, onSave, onCancel }) {
  const [form, setForm] = useState({ ...plan });
  const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value });
  const handleSubmit = e => {
    e.preventDefault();
    onSave({
      ...form,
      day: Number(form.day),
      hours_planned: Number(form.hours_planned),
      hours_actual: form.hours_actual ? Number(form.hours_actual) : null
    });
  };

  return (
    <form onSubmit={handleSubmit} style={{
      background: 'var(--bg-main)', borderRadius: 'var(--radius-md)',
      padding: '1.25rem', border: '2px solid var(--accent-light)',
    }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
        <div>
          <label style={labelStyle}>Date</label>
          <input className="form-control" name="date" type="date" value={form.date} onChange={handleChange} required />
        </div>
        <div>
          <label style={labelStyle}>Focus Area</label>
          <input className="form-control" name="focus_area" value={form.focus_area} onChange={handleChange} required />
        </div>
        <div>
          <label style={labelStyle}>Week</label>
          <input className="form-control" name="week" value={form.week} onChange={handleChange} required />
        </div>
      </div>
      <div style={{ marginBottom: '0.75rem' }}>
        <label style={labelStyle}>Tasks (semicolon-separated)</label>
        <textarea className="form-control" name="tasks" value={form.tasks} onChange={handleChange} rows={3}
          style={{ width: '100%', minWidth: '100%' }} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
        <div>
          <label style={labelStyle}>Hours Planned</label>
          <input className="form-control" name="hours_planned" type="number" value={form.hours_planned} onChange={handleChange} />
        </div>
        <div>
          <label style={labelStyle}>Hours Actual</label>
          <input className="form-control" name="hours_actual" type="number" value={form.hours_actual || ''} onChange={handleChange} />
        </div>
        <div>
          <label style={labelStyle}>Status</label>
          <select className="form-control" name="status" value={form.status} onChange={handleChange}>
            <option value="Not Started">Not Started</option>
            <option value="In Progress">In Progress</option>
            <option value="Done">Done</option>
            <option value="Skipped">Skipped</option>
          </select>
        </div>
        <div>
          <label style={labelStyle}>Day #</label>
          <input className="form-control" name="day" type="number" value={form.day} onChange={handleChange} />
        </div>
      </div>
      <div style={{ marginBottom: '1rem' }}>
        <label style={labelStyle}>Notes</label>
        <input className="form-control" name="notes" value={form.notes || ''} onChange={handleChange} placeholder="Any notes..." style={{ width: '100%' }} />
      </div>
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <button className="btn btn-primary" type="submit">💾 Save Changes</button>
        <button className="btn btn-ghost" type="button" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}

const labelStyle = {
  display: 'block', fontSize: '0.72rem', fontWeight: 600,
  color: 'var(--text-secondary)', textTransform: 'uppercase',
  letterSpacing: '0.05em', marginBottom: '0.3rem'
};

export default function DailyPlanList() {
  const navigate = useNavigate();
  const [plans, setPlans] = useState([]);
  const [editId, setEditId] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [filterWeek, setFilterWeek] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  // AI Guide State
  const [aiGuides, setAiGuides] = useState({});
  const [aiLoading, setAiLoading] = useState({});
  const [showAiGuide, setShowAiGuide] = useState({});

  const loadPlans = () => fetchDailyPlans().then(res => setPlans(res.data));
  useEffect(() => { loadPlans(); }, []);

  const handleDelete = async (id) => {
    if (window.confirm('Delete this daily plan?')) {
      await deleteDailyPlan(id);
      loadPlans();
    }
  };
  const handleSave = async (form) => {
    await updateDailyPlan(form.id, form);
    setEditId(null);
    loadPlans();
  };

  const handleToggleTask = async (plan, newTasksString) => {
    // Optimistic update
    setPlans(plans.map(p => p.id === plan.id ? { ...p, tasks: newTasksString } : p));
    await updateDailyPlan(plan.id, { ...plan, tasks: newTasksString });
    loadPlans();
  };

  const generateGuide = async (plan) => {
    const apiKey = localStorage.getItem('GEMINI_API_KEY') || localStorage.getItem('AI_API_KEY');
    if (!apiKey) {
      alert("Please configure your AI API Key in the Settings page first.");
      return;
    }

    setAiLoading(prev => ({ ...prev, [plan.id]: true }));
    setAiGuides(prev => ({ ...prev, [plan.id]: null })); // clear previous

    try {
      const gatewayUrl = localStorage.getItem('AI_GATEWAY_URL') || '';
      const model = localStorage.getItem('AI_MODEL') || 'gemini-2.5-flash';
      
      const prompt = `I am preparing for software/data engineering interviews. 
My focus area for today is '${plan.focus_area}' and my tasks are: 
${plan.tasks}

Please act as an expert technical tutor. Provide a comprehensive, high-quality study guide for these specific tasks. 
CRITICAL: You MUST provide the actual answers, solutions, and detailed explanations for any concepts, questions, or topics mentioned in the tasks. Do not just tell me what to study; actually teach it to me and provide the material directly in your response.
Format your response cleanly in Markdown, using headings, bullet points, tables, and code blocks where appropriate to make the UI look premium. Keep it highly actionable.`;

      let text = '';
      if (/generativelanguage\.googleapis\.com/.test(gatewayUrl)) {
        const url = `${gatewayUrl.replace(/\/$/, '')}/${model}:generateContent?key=${apiKey}`;
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}: ${await response.text()}`);
        const data = await response.json();
        text = data.candidates?.[0]?.content?.parts?.map(p => p.text).join('\n') || JSON.stringify(data);
      } else {
        const url = gatewayUrl.endsWith('/v1/chat/completions') ? gatewayUrl : `${gatewayUrl.replace(/\/$/, '')}/v1/chat/completions`;
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model,
            messages: [
              { role: 'system', content: 'You are a helpful technical tutor.' },
              { role: 'user', content: prompt }
            ],
            temperature: 0.7
          })
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}: ${await response.text()}`);
        const data = await response.json();
        text = data.choices?.[0]?.message?.content || JSON.stringify(data);
      }
      
      setAiGuides(prev => ({ ...prev, [plan.id]: text }));
      
      // Save to backend
      await updateDailyPlan(plan.id, { ...plan, ai_guide: text });
      loadPlans();
    } catch (error) {
      console.error(error);
      setAiGuides(prev => ({ ...prev, [plan.id]: "❌ **Error generating guide:** " + error.message }));
    } finally {
      setAiLoading(prev => ({ ...prev, [plan.id]: false }));
    }
  };

  // Get unique weeks for filter
  const weeks = [...new Set(plans.map(p => p.week))].sort();

  // Apply filters
  let filtered = plans;
  if (filterWeek !== 'all') filtered = filtered.filter(p => p.week === filterWeek);
  if (filterStatus !== 'all') {
    filtered = filtered.filter(p => {
      const s = (p.status || '').toLowerCase();
      if (filterStatus === 'done') return s.includes('done') || s.includes('complete');
      if (filterStatus === 'pending') return !s.includes('done') && !s.includes('complete');
      return true;
    });
  }

  // Stats
  const totalHours = filtered.reduce((sum, p) => sum + (p.hours_planned || 0), 0);
  const doneCount = filtered.filter(p => {
    const s = (p.status || '').toLowerCase();
    return s.includes('done') || s.includes('complete');
  }).length;

  return (
    <div>
      <DailyPlanForm onSuccess={loadPlans} />
      {/* Filters & Summary Bar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.25rem',
        flexWrap: 'wrap', padding: '0.75rem 1rem',
        background: 'var(--bg-main)', borderRadius: 'var(--radius-md)',
        border: '1px solid var(--border)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Week:</span>
          <select className="form-control" value={filterWeek} onChange={e => setFilterWeek(e.target.value)}
            style={{ minWidth: '80px', flex: 'none', padding: '0.4rem 0.6rem' }}>
            <option value="all">All</option>
            {weeks.map(w => <option key={w} value={w}>{w}</option>)}
          </select>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Status:</span>
          <select className="form-control" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
            style={{ minWidth: '100px', flex: 'none', padding: '0.4rem 0.6rem' }}>
            <option value="all">All</option>
            <option value="done">Done</option>
            <option value="pending">Pending</option>
          </select>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '1.5rem', fontSize: '0.8rem' }}>
          <span style={{ color: 'var(--text-secondary)' }}>
            <strong style={{ color: 'var(--text-primary)' }}>{filtered.length}</strong> days
          </span>
          <span style={{ color: 'var(--text-secondary)' }}>
            <strong style={{ color: 'var(--success)' }}>{doneCount}</strong> done
          </span>
          <span style={{ color: 'var(--text-secondary)' }}>
            <strong style={{ color: 'var(--accent)' }}>{totalHours}h</strong> planned
          </span>
        </div>
      </div>

      {/* Plan Cards */}
      <div className="cards-grid">
        {filtered.map(plan => {
          const isExpanded = expandedId === plan.id;
          const isEditing = editId === plan.id;
          const taskItems = plan.tasks ? plan.tasks.split(';').filter(t => t.trim()) : [];
          const taskCount = taskItems.length;
          const doneTaskCount = taskItems.filter(t => t.trim().startsWith('[x] ') || t.trim().startsWith('[X] ')).length;

          return (
            <div key={plan.id} className={`dp-card ${isExpanded ? 'dp-expanded' : ''}`}>
              {/* Header Row */}
              <div className="dp-header" onClick={() => !isEditing && setExpandedId(isExpanded ? null : plan.id)} style={{ cursor: isEditing ? 'default' : 'pointer' }}>
                <div className="dp-day-circle">{plan.day}</div>
                <div style={{ minWidth: 0 }}>
                  <div className="dp-info-primary">
                    <span className="dp-focus-area">{plan.focus_area}</span>
                    <span className={getDailyPlanStatusBadge(plan.status)} style={{ fontSize: '0.65rem' }}>{getStatusIcon(plan.status)} {plan.status}</span>
                    <span className="dp-stat-pill">{plan.week}</span>
                  </div>
                  <div className="dp-meta">
                    <span className="dp-meta-item">📅 {plan.date}</span>
                    <span className="dp-meta-item">⏱️ {plan.hours_planned}h{plan.hours_actual ? ` · ${plan.hours_actual}h actual` : ''}</span>
                    <span className="dp-meta-item">📋 {doneTaskCount}/{taskCount} tasks</span>
                  </div>
                </div>
                <div className="dp-stats-row">
                  <span className="dp-stat-pill accent">⏱ {plan.hours_planned}h</span>
                  {taskCount > 0 && <span className={`dp-stat-pill ${doneTaskCount === taskCount ? 'success' : ''}`}>{doneTaskCount}/{taskCount} ✓</span>}
                </div>
                <div className="dp-chevron">▾</div>
              </div>

              {/* Expanded Detail */}
              {isExpanded && !isEditing && (
                <div className="dp-body">
                  {/* Task Checklist */}
                  <div className="dp-section-label">📋 Tasks <span className="dp-section-count">{taskCount}</span></div>
                  <TaskChecklist plan={plan} onToggleTask={handleToggleTask} reloadPlans={loadPlans} />

                  {/* Details Grid */}
                  <div className="dp-details-grid">
                    <div className="dp-detail-item">
                      <div className="dp-detail-value" style={{ color: 'var(--accent)' }}>{plan.hours_planned}h</div>
                      <div className="dp-detail-label">Planned</div>
                    </div>
                    <div className="dp-detail-item">
                      <div className="dp-detail-value" style={{ color: plan.hours_actual ? 'var(--success)' : 'var(--text-muted)' }}>{plan.hours_actual ? `${plan.hours_actual}h` : '—'}</div>
                      <div className="dp-detail-label">Actual</div>
                    </div>
                    <div className="dp-detail-item">
                      <div className="dp-detail-value" style={{ color: 'var(--text-primary)' }}>{plan.week}</div>
                      <div className="dp-detail-label">Week</div>
                    </div>
                    <div className="dp-detail-item">
                      <div className="dp-detail-value" style={{ fontSize: '0.85rem', color: plan.notes ? 'var(--text-primary)' : 'var(--text-muted)' }}>{plan.notes || 'No notes'}</div>
                      <div className="dp-detail-label">Notes</div>
                    </div>
                  </div>

                  {/* AI Guide Section */}
                  {showAiGuide[plan.id] && (aiLoading[plan.id] || aiGuides[plan.id] || plan.ai_guide) && (
                    <div className="ai-guide-box" style={{ position: 'relative' }}>
                      <button onClick={(e) => { e.stopPropagation(); setShowAiGuide(prev => ({ ...prev, [plan.id]: false })); }} style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '1.2rem', color: 'var(--text-muted)' }} title="Hide Guide">✖</button>
                      <div className="ai-guide-header"><span style={{ fontSize: '1.2rem' }}>🤖</span> <span style={{ fontWeight: 700, color: 'var(--accent)' }}>AI Study Guide</span></div>
                      <div className="ai-guide-content">
                        {aiLoading[plan.id] ? (
                          <div className="chat-loading" style={{ padding: '0.5rem 0' }}><div className="typing-dot"></div><div className="typing-dot"></div><div className="typing-dot"></div></div>
                        ) : (
                          <div className="markdown-body"><ReactMarkdown remarkPlugins={[remarkGfm]}>{aiGuides[plan.id] || plan.ai_guide}</ReactMarkdown></div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="dp-actions">
                    <button className="btn btn-edit" onClick={(e) => { e.stopPropagation(); setEditId(plan.id); }}>✏️ Edit</button>
                    <button className="btn btn-danger" onClick={(e) => { e.stopPropagation(); handleDelete(plan.id); }}>🗑️ Delete</button>
                    {!(plan.status || '').toLowerCase().includes('done') && (
                      <button className="btn btn-primary" onClick={async (e) => { e.stopPropagation(); await updateDailyPlan(plan.id, { ...plan, status: 'Done' }); loadPlans(); }}>✅ Mark Done</button>
                    )}
                    <button className="btn btn-ghost" onClick={(e) => { e.stopPropagation(); navigate(`/study?topic=${encodeURIComponent(plan.focus_area)}&date=${encodeURIComponent(plan.date)}`); }}>📚 Log Study</button>
                    {plan.ai_guide || aiGuides[plan.id] ? (
                      <>
                        <button className="btn btn-ghost" onClick={(e) => { e.stopPropagation(); setShowAiGuide(prev => ({ ...prev, [plan.id]: !prev[plan.id] })); }}>🤖 {showAiGuide[plan.id] ? 'Hide Guide' : 'Show Guide'}</button>
                        <button className="btn btn-ghost" onClick={(e) => { e.stopPropagation(); generateGuide(plan); setShowAiGuide(prev => ({ ...prev, [plan.id]: true })); }} disabled={aiLoading[plan.id]}>🔄 Regenerate</button>
                      </>
                    ) : (
                      <button className="btn btn-ghost" onClick={(e) => { e.stopPropagation(); generateGuide(plan); setShowAiGuide(prev => ({ ...prev, [plan.id]: true })); }} disabled={aiLoading[plan.id]}>🤖 Generate Study Guide</button>
                    )}
                  </div>
                </div>
              )}

              {/* Editing Mode */}
              {isEditing && (
                <div style={{ padding: '1rem', borderTop: '1px solid var(--border)' }}>
                  <EditPlanInline plan={plan} onSave={handleSave} onCancel={() => setEditId(null)} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="empty-state">
          <div className="empty-state-icon">📅</div>
          <div className="empty-state-text">No daily plans match your filters.</div>
          <div className="empty-state-sub">Try adjusting the week or status filter above.</div>
        </div>
      )}
    </div>
  );
}
