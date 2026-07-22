import React, { useState, useEffect } from 'react';
import { fetchGoals, createGoal, updateGoal, deleteGoal } from '../api/goalApi';

const CATEGORIES = ['Career', 'Skill', 'Project', 'Personal'];
const SORT_OPTIONS = ['Target Date', 'Progress', 'Category'];

export default function GoalList() {
  const [goals, setGoals] = useState([]);
  const [form, setForm] = useState({ title: '', description: '', target_date: '', status: 'Not Started', progress: 0, notes: JSON.stringify({ category: 'Career', subgoals: [] }) });
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('Target Date');
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => { loadGoals(); }, []);

  const loadGoals = () => {
    setLoading(true);
    fetchGoals().then(res => {
      setGoals(res.data);
      setLoading(false);
    }).catch(err => {
      console.error(err);
      setLoading(false);
    });
  };

  const parseNotes = (notesStr) => {
    try {
      return JSON.parse(notesStr || '{"category": "Career", "subgoals": []}');
    } catch {
      return { category: 'Career', subgoals: [] };
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (form.progress === 100 && (!editingId || goals.find(g => g.id === editingId)?.progress < 100)) {
      triggerConfetti();
    }
    
    if (editingId) {
      updateGoal(editingId, form).then(() => {
        loadGoals();
        resetForm();
      });
    } else {
      createGoal(form).then(() => {
        loadGoals();
        resetForm();
      });
    }
  };

  const resetForm = () => {
    setForm({ title: '', description: '', target_date: '', status: 'Not Started', progress: 0, notes: JSON.stringify({ category: 'Career', subgoals: [] }) });
    setEditingId(null);
  };

  const handleEdit = (g) => {
    setEditingId(g.id);
    setForm({ title: g.title, description: g.description || '', target_date: g.target_date || '', status: g.status, progress: g.progress, notes: g.notes || JSON.stringify({ category: 'Career', subgoals: [] }) });
  };

  const handleDelete = (id) => {
    if (window.confirm("Delete this goal?")) {
      deleteGoal(id).then(() => loadGoals());
    }
  };

  const triggerConfetti = () => {
    setShowConfetti(true);
    setTimeout(() => setShowConfetti(false), 3000);
  };

  const sortedGoals = [...goals].sort((a, b) => {
    if (sortBy === 'Target Date') {
      return new Date(a.target_date || '2099-01-01') - new Date(b.target_date || '2099-01-01');
    } else if (sortBy === 'Progress') {
      return b.progress - a.progress;
    } else if (sortBy === 'Category') {
      const catA = parseNotes(a.notes).category;
      const catB = parseNotes(b.notes).category;
      return catA.localeCompare(catB);
    }
    return 0;
  });

  const handleCategoryChange = (cat) => {
    const parsed = parseNotes(form.notes);
    parsed.category = cat;
    setForm({ ...form, notes: JSON.stringify(parsed) });
  };

  const handleSubgoalAdd = () => {
    const parsed = parseNotes(form.notes);
    parsed.subgoals.push({ text: 'New Subgoal', done: false });
    setForm({ ...form, notes: JSON.stringify(parsed) });
  };

  const handleSubgoalChange = (index, field, value) => {
    const parsed = parseNotes(form.notes);
    parsed.subgoals[index][field] = value;
    
    // Auto-update progress if subgoals change
    if (field === 'done' && parsed.subgoals.length > 0) {
      const completed = parsed.subgoals.filter(s => s.done).length;
      const newProgress = Math.round((completed / parsed.subgoals.length) * 100);
      setForm({ ...form, progress: newProgress, status: newProgress === 100 ? 'Completed' : (newProgress > 0 ? 'In Progress' : 'Not Started'), notes: JSON.stringify(parsed) });
      if (newProgress === 100) triggerConfetti();
      return;
    }
    
    setForm({ ...form, notes: JSON.stringify(parsed) });
  };

  const handleSubgoalDelete = (index) => {
    const parsed = parseNotes(form.notes);
    parsed.subgoals.splice(index, 1);
    setForm({ ...form, notes: JSON.stringify(parsed) });
  };

  if (loading) return <div>Loading goals...</div>;

  return (
    <div>
      {showConfetti && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, pointerEvents: 'none', zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <div style={{ fontSize: '10rem', animation: 'successPop 0.5s ease-out' }}>🎉</div>
          <style>{`@keyframes successPop { 0% { transform: scale(0); opacity: 0; } 50% { transform: scale(1.2); } 100% { transform: scale(1); opacity: 1; } }`}</style>
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ marginBottom: '2rem', padding: '1.5rem', background: 'var(--bg-card)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
          <div style={{ gridColumn: '1 / -1' }}>
            <label className="form-label">Goal Title</label>
            <input className="form-control" value={form.title} onChange={e => setForm({...form, title: e.target.value})} required placeholder="e.g. Master System Design" style={{ width: '100%' }} />
          </div>
          <div>
            <label className="form-label">Category</label>
            <select className="form-control" value={parseNotes(form.notes).category} onChange={e => handleCategoryChange(e.target.value)} style={{ width: '100%' }}>
              {CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="form-label">Target Date</label>
            <input type="date" className="form-control" value={form.target_date} onChange={e => setForm({...form, target_date: e.target.value})} style={{ width: '100%' }} />
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label className="form-label">Description</label>
            <textarea className="form-control" value={form.description} onChange={e => setForm({...form, description: e.target.value})} rows="2" placeholder="Describe the goal..." style={{ width: '100%' }} />
          </div>
          <div style={{ gridColumn: '1 / -1', background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <label className="form-label" style={{ margin: 0 }}>Sub-goals Checklist</label>
              <button type="button" className="btn btn-ghost" onClick={handleSubgoalAdd} style={{ padding: '0.2rem 0.5rem', fontSize: '0.8rem' }}>+ Add Item</button>
            </div>
            {parseNotes(form.notes).subgoals.map((sg, i) => (
              <div key={i} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.5rem' }}>
                <input type="checkbox" checked={sg.done} onChange={e => handleSubgoalChange(i, 'done', e.target.checked)} style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: 'var(--accent)' }} />
                <input className="form-control" value={sg.text} onChange={e => handleSubgoalChange(i, 'text', e.target.value)} style={{ flex: 1, padding: '0.4rem', fontSize: '0.85rem' }} />
                <button type="button" onClick={() => handleSubgoalDelete(i)} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer' }}>✕</button>
              </div>
            ))}
            {parseNotes(form.notes).subgoals.length === 0 && <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>No sub-goals added yet.</div>}
          </div>
          <div>
            <label className="form-label">Status</label>
            <select className="form-control" value={form.status} onChange={e => setForm({...form, status: e.target.value})} style={{ width: '100%' }}>
              <option>Not Started</option>
              <option>In Progress</option>
              <option>Completed</option>
            </select>
          </div>
          <div>
            <label className="form-label">Progress (%) - {form.progress}%</label>
            <input type="range" min="0" max="100" value={form.progress} onChange={e => setForm({...form, progress: parseInt(e.target.value)})} style={{ width: '100%', marginTop: '0.5rem', accentColor: 'var(--accent)' }} />
          </div>
        </div>
        <button type="submit" className="btn btn-primary">{editingId ? 'Update Goal' : 'Add Goal'}</button>
        {editingId && <button type="button" className="btn btn-secondary" style={{ marginLeft: '0.5rem' }} onClick={resetForm}>Cancel</button>}
      </form>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h3 style={{ margin: 0 }}>Your Goals</h3>
        <select className="form-control" value={sortBy} onChange={e => setSortBy(e.target.value)} style={{ width: '150px' }}>
          {SORT_OPTIONS.map(s => <option key={s} value={s}>Sort: {s}</option>)}
        </select>
      </div>

      <div style={{ display: 'grid', gap: '1rem' }}>
        {sortedGoals.map(g => {
          const parsed = parseNotes(g.notes);
          return (
            <div key={g.id} style={{ padding: '1.5rem', background: 'var(--bg-card)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem', background: 'var(--bg-main)', color: 'var(--text-secondary)', borderRadius: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{parsed.category}</span>
                  {g.status === 'Completed' && <span style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem', background: 'rgba(16, 185, 129, 0.2)', color: 'var(--success)', borderRadius: '4px' }}>Completed</span>}
                </div>
                <h3 style={{ margin: '0 0 0.5rem 0' }}>{g.title}</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: '0 0 1rem 0' }}>{g.description}</p>
                
                {parsed.subgoals && parsed.subgoals.length > 0 && (
                  <div style={{ marginBottom: '1rem' }}>
                    {parsed.subgoals.map((sg, i) => (
                      <div key={i} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.25rem', fontSize: '0.85rem', color: sg.done ? 'var(--text-muted)' : 'var(--text-primary)', textDecoration: sg.done ? 'line-through' : 'none' }}>
                        <span style={{ color: sg.done ? 'var(--success)' : 'var(--text-muted)' }}>{sg.done ? '✓' : '○'}</span> {sg.text}
                      </div>
                    ))}
                  </div>
                )}
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', maxWidth: '300px' }}>
                  <div style={{ flex: 1, height: '8px', background: 'var(--bg-main)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ width: `${g.progress}%`, height: '100%', background: 'linear-gradient(90deg, var(--accent-dark), var(--accent))', transition: 'width 0.3s ease' }} />
                  </div>
                  <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>{g.progress}%</span>
                </div>
              </div>
              
              <div style={{ display: 'flex', gap: '0.5rem', marginLeft: '2rem' }}>
                <button className="btn btn-secondary" onClick={() => handleEdit(g)}>Edit</button>
                <button className="btn btn-ghost" onClick={() => handleDelete(g.id)} style={{ color: 'var(--danger)' }}>Delete</button>
              </div>
            </div>
          );
        })}
        {goals.length === 0 && <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '3rem', background: 'var(--bg-card)', borderRadius: '12px', border: '1px dashed var(--border)' }}>No goals yet. Set your first big target!</div>}
      </div>
    </div>
  );
}
