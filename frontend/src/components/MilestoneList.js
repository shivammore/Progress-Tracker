import React, { useEffect, useState } from 'react';
import { fetchMilestones, deleteMilestone, updateMilestone } from '../api/milestoneApi';
import MilestoneForm from './MilestoneForm';
import RightSidebarWidgets from './RightSidebarWidgets';

function EditMilestoneInline({ milestone, onSave, onCancel }) {
  const [form, setForm] = useState({ ...milestone });
  const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value });
  const handleSubmit = e => {
    e.preventDefault();
    onSave({ ...form });
  };
  return (
    <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '1rem', padding: '1rem', background: 'var(--bg-main)', borderRadius: 'var(--radius-md)' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <div>
          <label className="form-label">Project</label>
          <input className="form-control" name="project" value={form.project} onChange={handleChange} required />
        </div>
        <div>
          <label className="form-label">Milestone</label>
          <input className="form-control" name="milestone" value={form.milestone} onChange={handleChange} required />
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
        <div>
          <label className="form-label">Due Date</label>
          <input className="form-control" name="due_date" type="date" value={form.due_date || ''} onChange={handleChange} />
        </div>
        <div>
          <label className="form-label">Owner</label>
          <input className="form-control" name="owner" value={form.owner || ''} onChange={handleChange} />
        </div>
        <div>
          <label className="form-label">Status</label>
          <select className="form-control" name="status" value={form.status} onChange={handleChange}>
            <option value="Not Started">Not Started</option>
            <option value="In Progress">In Progress</option>
            <option value="Blocked">Blocked</option>
            <option value="Done">Done</option>
          </select>
        </div>
      </div>
      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
        <button className="btn btn-primary" type="submit">💾 Save Changes</button>
        <button className="btn btn-ghost" type="button" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}

const getMilestoneStatusBadge = (status) => {
  const s = (status || '').toLowerCase();
  if (s.includes('done') || s.includes('complete')) return 'status-badge status-success';
  if (s.includes('progress') || s.includes('doing')) return 'status-badge status-info';
  if (s.includes('block')) return 'status-badge status-danger';
  return 'status-badge status-neutral';
};

const getStatusIcon = (status) => {
  const s = (status || '').toLowerCase();
  if (s.includes('done') || s.includes('complete')) return '✅';
  if (s.includes('progress') || s.includes('doing')) return '🔄';
  if (s.includes('block')) return '⛔';
  return '⬜';
};

export default function MilestoneList() {
  const [milestones, setMilestones] = useState([]);
  const [editId, setEditId] = useState(null);
  const [filterProject, setFilterProject] = useState('all');

  const loadMilestones = () => fetchMilestones().then(res => setMilestones(res.data));
  useEffect(() => { loadMilestones(); }, []);

  const handleDelete = async (id) => {
    if (window.confirm('Delete this milestone?')) {
      await deleteMilestone(id);
      loadMilestones();
    }
  };
  const handleSave = async (form) => {
    await updateMilestone(form.id, form);
    setEditId(null);
    loadMilestones();
  };

  const markDone = async (m) => {
    await updateMilestone(m.id, { ...m, status: 'Done' });
    loadMilestones();
  };

  const projects = [...new Set(milestones.map(m => m.project))].sort();

  let filtered = milestones;
  if (filterProject !== 'all') filtered = filtered.filter(m => m.project === filterProject);

  // Group by project
  const grouped = {};
  filtered.forEach(m => {
    if (!grouped[m.project]) grouped[m.project] = [];
    grouped[m.project].push(m);
  });

  return (
    <div className="dashboard-grid">
      <div className="dp-left-col">
      <MilestoneForm onSuccess={loadMilestones} />

      {/* Filters Bar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.25rem',
        flexWrap: 'wrap', padding: '0.75rem 1rem',
        background: 'var(--bg-main)', borderRadius: 'var(--radius-md)',
        border: '1px solid var(--border)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Project:</span>
          <select className="form-control" value={filterProject} onChange={e => setFilterProject(e.target.value)}
            style={{ minWidth: '150px', padding: '0.4rem 0.6rem' }}>
            <option value="all">All Projects</option>
            {projects.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <div style={{ marginLeft: 'auto', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
          Showing <strong style={{ color: 'var(--text-primary)' }}>{filtered.length}</strong> milestones
        </div>
      </div>

      <style>{`
        .form-label { display: block; font-size: 0.72rem; font-weight: 600; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.3rem; }
        .project-group { margin-bottom: 2rem; }
        .project-header { font-size: 1.25rem; font-weight: 800; color: var(--text-primary); margin-bottom: 1rem; padding-bottom: 0.5rem; border-bottom: 2px solid var(--accent-light); display: flex; align-items: center; gap: 0.5rem; }
        .m-list { display: flex; flex-direction: column; gap: 0.75rem; }
        .m-card { background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius-lg); padding: 1.25rem; transition: all var(--transition); box-shadow: var(--shadow-sm); display: flex; flex-direction: column; gap: 1rem; border-left: 4px solid var(--accent); }
        .m-card.done { border-left-color: var(--success); opacity: 0.8; }
        .m-card.blocked { border-left-color: var(--danger); }
        .m-card:hover { box-shadow: var(--shadow-md); }
        .m-header { display: flex; justify-content: space-between; align-items: flex-start; }
        .m-title { font-size: 1.05rem; font-weight: 600; color: var(--text-primary); }
        .m-card.done .m-title { text-decoration: line-through; color: var(--text-muted); }
        .m-body { display: flex; gap: 1.5rem; flex-wrap: wrap; }
        .m-meta { display: flex; align-items: center; gap: 0.4rem; font-size: 0.85rem; color: var(--text-secondary); }
      `}</style>

      {/* Grouped List of Milestones */}
      <div>
        {Object.keys(grouped).sort().map(project => (
          <div key={project} className="project-group">
            <div className="project-header">
              <span style={{ color: 'var(--accent)' }}>🚀</span> {project}
            </div>
            <div className="m-list">
              {grouped[project].map(m => {
                const isDone = (m.status || '').toLowerCase().includes('done');
                const isBlocked = (m.status || '').toLowerCase().includes('block');
                const cardClass = `m-card ${isDone ? 'done' : isBlocked ? 'blocked' : ''}`;
                
                return (
                  <div key={m.id} className={cardClass} style={editId === m.id ? { borderColor: 'var(--accent)', boxShadow: 'var(--shadow-md)' } : {}}>
                    {editId === m.id ? (
                      <EditMilestoneInline milestone={m} onSave={handleSave} onCancel={() => setEditId(null)} />
                    ) : (
                      <>
                        <div className="m-header">
                          <div className="m-title">{m.milestone}</div>
                          <span className={getMilestoneStatusBadge(m.status)}>{getStatusIcon(m.status)} {m.status}</span>
                        </div>
                        
                        <div className="m-body">
                          <div className="m-meta">
                            <span>📅</span> 
                            <span style={{ fontWeight: 500, color: m.due_date ? 'var(--text-primary)' : 'inherit' }}>
                              {m.due_date ? `Due: ${m.due_date}` : 'No due date'}
                            </span>
                          </div>
                          <div className="m-meta">
                            <span>👤</span> 
                            <span>{m.owner || 'Unassigned'}</span>
                          </div>
                        </div>

                        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                          <button className="btn btn-edit" onClick={() => setEditId(m.id)}>✏️ Edit</button>
                          <button className="btn btn-danger" onClick={() => handleDelete(m.id)}>🗑️ Delete</button>
                          {!isDone && (
                            <button className="btn btn-primary" onClick={() => markDone(m)}>✅ Mark Done</button>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="empty-state">
          <div className="empty-state-icon">🚀</div>
          <div className="empty-state-text">No project milestones match your filters.</div>
        </div>
      )}
    </div>

      <RightSidebarWidgets />

    </div>
  );
}