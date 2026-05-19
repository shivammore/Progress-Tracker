import React, { useEffect, useState } from 'react';
import { fetchJobApps, deleteJobApp, updateJobApp } from '../api/jobAppApi';
import JobAppForm from './JobAppForm';

function EditRow({ app, onSave, onCancel }) {
  const [form, setForm] = useState({ ...app });
  const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value });
  const handleSubmit = e => {
    e.preventDefault();
    onSave({ ...form });
  };
  return (
    <form onSubmit={handleSubmit} className="form-grid" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
      <input className="form-control" name="company" value={form.company} onChange={handleChange} required style={{width:120}} />
      <input className="form-control" name="role" value={form.role} onChange={handleChange} required style={{width:120}} />
      <input className="form-control" name="status" value={form.status} onChange={handleChange} required style={{width:100}} />
      <button className="btn btn-primary" type="submit">💾 Save</button>
      <button className="btn" type="button" onClick={onCancel} style={{ background: '#e2e8f0' }}>❌ Cancel</button>
    </form>
  );
}

const getStatusBadgeClass = (status) => {
  const s = (status || '').toLowerCase();
  if (s.includes('offer')) return 'status-badge status-success';
  if (s.includes('reject')) return 'status-badge status-danger';
  if (s.includes('interview')) return 'status-badge status-info';
  if (s.includes('contacted') || s.includes('applied')) return 'status-badge status-neutral';
  return 'status-badge status-neutral';
};

export default function JobAppList() {
  const [apps, setApps] = useState([]);
  const [editId, setEditId] = useState(null);
  
  const params = new URLSearchParams(window.location.search);
  const initialCompany = params.get('company') || '';
  const [searchQuery, setSearchQuery] = useState(initialCompany);

  const loadApps = () => fetchJobApps().then(res => setApps(res.data));
  useEffect(() => { loadApps(); }, []);

  const handleDelete = async (id) => {
    if (window.confirm('Delete this job application?')) {
      await deleteJobApp(id);
      loadApps();
    }
  };

  const handleEdit = (id) => setEditId(id);
  const handleCancel = () => setEditId(null);
  const handleSave = async (form) => {
    await updateJobApp(form.id, form);
    setEditId(null);
    loadApps();
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    window.history.replaceState({}, document.title, window.location.pathname);
  };

  const filteredApps = apps.filter(app => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (app.company || '').toLowerCase().includes(q) || (app.role || '').toLowerCase().includes(q);
  });

  return (
    <div>
      <JobAppForm onSuccess={loadApps} defaultCompany={initialCompany} />

      {/* Filter and Search Bar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.25rem',
        padding: '0.75rem 1rem', background: 'var(--bg-main)', borderRadius: 'var(--radius-md)',
        border: '1px solid var(--border)', flexWrap: 'wrap'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, minWidth: '200px' }}>
          <span style={{ fontSize: '1rem' }}>🔍</span>
          <input 
            className="form-control" 
            placeholder="Search by company or role..." 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{ padding: '0.4rem 0.6rem', border: '1px solid var(--border)', flex: 1 }}
          />
          {searchQuery && (
            <button className="btn btn-ghost" onClick={handleClearSearch} style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}>
              Clear
            </button>
          )}
        </div>
        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
          Showing <strong style={{ color: 'var(--text-primary)' }}>{filteredApps.length}</strong> of {apps.length} applications
        </div>
      </div>

      <div className="table-responsive">
        <table className="styled-table">
          <thead>
            <tr>
              <th>Company</th>
              <th>Role</th>
              <th>Location</th>
              <th>Referral</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredApps.map(app => (
              <tr key={app.id} className={editId === app.id ? 'editing-row' : ''}>
                {editId === app.id ? (
                  <td colSpan="6">
                    <EditRow app={app} onSave={handleSave} onCancel={handleCancel} />
                  </td>
                ) : (
                  <>
                    <td style={{ fontWeight: 600 }}>{app.company}</td>
                    <td>{app.role}</td>
                    <td>{app.location || '-'}</td>
                    <td>{app.referral || '-'}</td>
                    <td>
                      <span className={getStatusBadgeClass(app.status)}>{app.status}</span>
                    </td>
                    <td>
                      <button className="btn btn-edit" onClick={() => handleEdit(app.id)}>✏️ Edit</button>
                      <button className="btn btn-danger" onClick={() => handleDelete(app.id)}>🗑️ Delete</button>
                    </td>
                  </>
                )}
              </tr>
            ))}
            {filteredApps.length === 0 && (
              <tr>
                <td colSpan="6" style={{ padding: 0 }}>
                  <div className="empty-state" style={{ padding: '3rem 1.5rem' }}>
                    <div className="empty-state-icon">🏢</div>
                    <div className="empty-state-text">No job applications found.</div>
                    {searchQuery && <div className="empty-state-sub" style={{ marginTop: '0.5rem' }}>Try clearing your search query.</div>}
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
