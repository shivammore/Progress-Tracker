import React, { useState, useEffect } from 'react';
import { fetchGoals, createGoal, updateGoal, deleteGoal } from '../api/goalApi';

export default function GoalList() {
  const [goals, setGoals] = useState([]);
  const [form, setForm] = useState({ title: '', description: '', target_date: '', status: 'In Progress', progress: 0 });
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);

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

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingId) {
      updateGoal(editingId, form).then(() => {
        loadGoals();
        setForm({ title: '', description: '', target_date: '', status: 'In Progress', progress: 0 });
        setEditingId(null);
      });
    } else {
      createGoal(form).then(() => {
        loadGoals();
        setForm({ title: '', description: '', target_date: '', status: 'In Progress', progress: 0 });
      });
    }
  };

  const handleEdit = (g) => {
    setEditingId(g.id);
    setForm({ title: g.title, description: g.description || '', target_date: g.target_date || '', status: g.status, progress: g.progress });
  };

  const handleDelete = (id) => {
    if (window.confirm("Delete this goal?")) {
      deleteGoal(id).then(() => loadGoals());
    }
  };

  if (loading) return <div>Loading goals...</div>;

  return (
    <div>
      <form onSubmit={handleSubmit} style={{ marginBottom: '2rem', padding: '1.5rem', background: 'var(--bg-card)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
          <div>
            <label className="form-label">Goal Title</label>
            <input className="form-control" value={form.title} onChange={e => setForm({...form, title: e.target.value})} required placeholder="e.g. Pass Google SWE Interview" />
          </div>
          <div>
            <label className="form-label">Target Date</label>
            <input type="date" className="form-control" value={form.target_date} onChange={e => setForm({...form, target_date: e.target.value})} />
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label className="form-label">Description / Milestones</label>
            <textarea className="form-control" value={form.description} onChange={e => setForm({...form, description: e.target.value})} rows="2" placeholder="List out what you need to do..." />
          </div>
          <div>
            <label className="form-label">Status</label>
            <select className="form-control" value={form.status} onChange={e => setForm({...form, status: e.target.value})}>
              <option>Not Started</option>
              <option>In Progress</option>
              <option>Completed</option>
            </select>
          </div>
          <div>
            <label className="form-label">Progress (%) - {form.progress}%</label>
            <input type="range" min="0" max="100" value={form.progress} onChange={e => setForm({...form, progress: parseInt(e.target.value)})} style={{ width: '100%', marginTop: '0.5rem' }} />
          </div>
        </div>
        <button type="submit" className="btn btn-primary">{editingId ? 'Update Goal' : 'Add Goal'}</button>
        {editingId && <button type="button" className="btn btn-secondary" style={{ marginLeft: '0.5rem' }} onClick={() => { setEditingId(null); setForm({ title: '', description: '', target_date: '', status: 'In Progress', progress: 0 }); }}>Cancel</button>}
      </form>

      <div style={{ display: 'grid', gap: '1rem' }}>
        {goals.map(g => (
          <div key={g.id} style={{ padding: '1.5rem', background: 'var(--bg-card)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ flex: 1 }}>
              <h3 style={{ margin: '0 0 0.5rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {g.title}
                {g.status === 'Completed' && <span style={{ fontSize: '0.8rem', padding: '0.2rem 0.5rem', background: 'rgba(16, 185, 129, 0.2)', color: 'var(--success)', borderRadius: '1rem' }}>Completed</span>}
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: '0 0 1rem 0' }}>{g.description}</p>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ flex: 1, height: '8px', background: 'var(--bg-main)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ width: `${g.progress}%`, height: '100%', background: 'linear-gradient(90deg, var(--accent-dark), var(--accent))' }} />
                </div>
                <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>{g.progress}%</span>
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: '0.5rem', marginLeft: '2rem' }}>
              <button className="btn btn-secondary" onClick={() => handleEdit(g)}>Edit</button>
              <button className="btn btn-danger" onClick={() => handleDelete(g.id)}>Delete</button>
            </div>
          </div>
        ))}
        {goals.length === 0 && <p style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>No goals yet. Set your first big target!</p>}
      </div>
    </div>
  );
}
