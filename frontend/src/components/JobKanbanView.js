import React, { useState } from 'react';
import { updateJobApp } from '../api/jobAppApi';

const KANBAN_STATUSES = [
  { key: 'Wishlist', label: '🎯 Wishlist', color: '#64748b', bg: '#f1f5f9' },
  { key: 'Applied', label: '📄 Applied', color: '#3b82f6', bg: '#eff6ff', wipLimit: 20 },
  { key: 'Phone Screen', label: '📞 Phone Screen', color: '#8b5cf6', bg: '#f5f3ff', wipLimit: 5 },
  { key: 'Interviewing', label: '🎤 Interviewing', color: '#f59e0b', bg: '#fffbeb', wipLimit: 5 },
  { key: 'Offer', label: '💰 Offer', color: '#10b981', bg: '#ecfdf5' },
  { key: 'Rejected', label: '❌ Rejected', color: '#ef4444', bg: '#fef2f2' }
];

const getDaysSinceApplied = (dateStr) => {
  if (!dateStr) return null;
  const appliedDate = new Date(dateStr);
  const today = new Date();
  appliedDate.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  const diffTime = today - appliedDate;
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  return diffDays < 0 ? 0 : diffDays;
};

function KanbanEditCard({ app, onSave, onCancel }) {
  const [form, setForm] = useState({ ...app });
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(form);
  };

  return (
    <form onSubmit={handleSubmit} className="kanban-card editing-card">
      <div className="form-group" style={{ marginBottom: '0.5rem' }}>
        <label className="form-label" style={{ fontSize: '0.7rem' }}>Role</label>
        <input 
          className="form-control" 
          name="role" 
          value={form.role} 
          onChange={handleChange} 
          required 
          style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem' }}
        />
      </div>
      <div className="form-group" style={{ marginBottom: '0.5rem' }}>
        <label className="form-label" style={{ fontSize: '0.7rem' }}>Company</label>
        <input 
          className="form-control" 
          name="company" 
          value={form.company} 
          onChange={handleChange} 
          required 
          style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem' }}
        />
      </div>
      <div className="form-group" style={{ marginBottom: '0.5rem' }}>
        <label className="form-label" style={{ fontSize: '0.7rem' }}>Location</label>
        <input 
          className="form-control" 
          name="location" 
          value={form.location || ''} 
          onChange={handleChange} 
          style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem' }}
        />
      </div>
      <div className="form-group" style={{ marginBottom: '0.5rem' }}>
        <label className="form-label" style={{ fontSize: '0.7rem' }}>Referral</label>
        <input 
          className="form-control" 
          name="referral" 
          value={form.referral || ''} 
          onChange={handleChange} 
          style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem' }}
        />
      </div>
      <div className="form-group" style={{ marginBottom: '0.75rem' }}>
        <label className="form-label" style={{ fontSize: '0.7rem' }}>Status</label>
        <select 
          className="form-control" 
          name="status" 
          value={form.status} 
          onChange={handleChange}
          style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem' }}
        >
          {KANBAN_STATUSES.map(s => (
            <option key={s.key} value={s.key}>{s.label}</option>
          ))}
        </select>
      </div>
      <div style={{ display: 'flex', gap: '0.25rem' }}>
        <button className="btn btn-primary" type="submit" style={{ flex: 1, padding: '0.3rem', fontSize: '0.75rem' }}>
          💾 Save
        </button>
        <button className="btn" type="button" onClick={onCancel} style={{ flex: 1, padding: '0.3rem', fontSize: '0.75rem', background: '#e2e8f0' }}>
          ❌ Cancel
        </button>
      </div>
    </form>
  );
}

export default function JobKanbanView({ apps, onAppUpdated, onDeleteApp, onEditApp, editId, onSaveEdit, onCancelEdit }) {
  const [collapsedColumns, setCollapsedColumns] = useState(new Set());
  
  const handleDragStart = (e, appId) => {
    e.dataTransfer.setData('text/plain', appId.toString());
    e.currentTarget.classList.add('dragging');
  };

  const handleDragEnd = (e) => {
    e.currentTarget.classList.remove('dragging');
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = async (e, targetStatus) => {
    e.preventDefault();
    const appId = parseInt(e.dataTransfer.getData('text/plain'), 10);
    if (!appId) return;

    const appToUpdate = apps.find(a => a.id === appId);
    if (!appToUpdate || appToUpdate.status === targetStatus) return;

    try {
      await updateJobApp(appId, {
        ...appToUpdate,
        status: targetStatus
      });
      onAppUpdated();
    } catch (err) {
      console.error('Failed to update job application status:', err);
    }
  };

  const toggleColumn = (key) => {
    const next = new Set(collapsedColumns);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setCollapsedColumns(next);
  };

  // Group applications by status key
  const groupedApps = KANBAN_STATUSES.reduce((acc, status) => {
    acc[status.key] = apps.filter(app => {
      const s = (app.status || '').toLowerCase().trim();
      const k = status.key.toLowerCase().trim();
      
      if (k === 'wishlist' && (s.includes('wishlist') || s.includes('contacted'))) return true;
      if (k === 'interviewing' && s.includes('interview')) return true;
      if (k === 'phone screen' && (s.includes('phone') || s.includes('screen'))) return true;
      return s === k;
    });
    return acc;
  }, {});

  return (
    <div className="kanban-board">
      {KANBAN_STATUSES.map(status => {
        const columnApps = groupedApps[status.key] || [];
        const isCollapsed = collapsedColumns.has(status.key);
        const overLimit = status.wipLimit && columnApps.length > status.wipLimit;
        
        if (isCollapsed) {
          return (
            <div key={status.key} className="kanban-column" style={{ width: '60px', flex: 'none', background: 'var(--bg-main)', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '1rem 0' }} onClick={() => toggleColumn(status.key)}>
              <span style={{ writingMode: 'vertical-rl', textOrientation: 'mixed', fontWeight: 700, color: 'var(--text-secondary)' }}>{status.label}</span>
              <span className="kanban-column-count" style={{ marginTop: '1rem' }}>{columnApps.length}</span>
            </div>
          );
        }

        return (
          <div 
            key={status.key}
            className="kanban-column"
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, status.key)}
          >
            <div className="kanban-column-header" style={{ borderTop: `4px solid ${status.color}`, background: overLimit ? 'rgba(239, 68, 68, 0.1)' : 'transparent' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, minWidth: 0, cursor: 'pointer' }} onClick={() => toggleColumn(status.key)}>
                <span className="kanban-column-title" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{status.label}</span>
                <span className="kanban-column-count" style={{ background: overLimit ? 'var(--danger)' : 'var(--bg-main)', color: overLimit ? 'white' : 'inherit' }}>
                  {columnApps.length} {status.wipLimit ? `/ ${status.wipLimit}` : ''}
                </span>
              </div>
            </div>
            
            <div className="kanban-cards-container">
              {columnApps.map(app => {
                if (editId === app.id) {
                  return (
                    <KanbanEditCard 
                      key={app.id} 
                      app={app} 
                      onSave={onSaveEdit} 
                      onCancel={onCancelEdit} 
                    />
                  );
                }

                const days = getDaysSinceApplied(app.date_applied);
                return (
                  <div
                    key={app.id}
                    className="kanban-card"
                    draggable="true"
                    onDragStart={(e) => handleDragStart(e, app.id)}
                    onDragEnd={handleDragEnd}
                  >
                    <div className="kanban-card-body">
                      <div className="kanban-card-role">{app.role}</div>
                      <div className="kanban-card-company">{app.company}</div>
                      
                      <div className="kanban-card-meta">
                        {app.location && (
                          <div className="kanban-card-meta-item">
                            📍 {app.location}
                          </div>
                        )}
                        {app.referral && (
                          <div className="kanban-card-meta-item text-success" style={{ fontWeight: 500 }}>
                            🤝 Referral
                          </div>
                        )}
                      </div>

                      {app.notes && (
                        <p className="kanban-card-notes">
                          {app.notes.length > 60 ? `${app.notes.substring(0, 60)}...` : app.notes}
                        </p>
                      )}
                    </div>
                    
                    <div className="kanban-card-footer">
                      {days !== null && (
                        <span className={`days-badge ${days > 14 ? 'days-old' : 'days-fresh'}`}>
                          {days === 0 ? 'Applied today' : `${days}d ago`}
                        </span>
                      )}
                      <div className="kanban-card-actions">
                        <button 
                          className="btn-kanban-action" 
                          onClick={() => onEditApp(app.id)}
                          title="Edit"
                        >
                          ✏️
                        </button>
                        <button 
                          className="btn-kanban-action danger" 
                          onClick={() => onDeleteApp(app.id)}
                          title="Delete"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
              {columnApps.length === 0 && (
                <div className="kanban-empty-column">
                  Drop cards here
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
