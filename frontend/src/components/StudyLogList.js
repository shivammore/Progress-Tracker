import React, { useEffect, useState } from 'react';
import { fetchStudyLogs, deleteStudyLog, updateStudyLog } from '../api/studyLogApi';
import StudyLogForm from './StudyLogForm';

function EditRow({ log, onSave, onCancel }) {
  const [form, setForm] = useState({ ...log });
  const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value });
  const handleSubmit = e => {
    e.preventDefault();
    onSave({ ...form, hours: Number(form.hours) });
  };
  return (
    <form onSubmit={handleSubmit} className="form-grid" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
      <input className="form-control" name="date" type="date" value={form.date} onChange={handleChange} required style={{width:130}} />
      <input className="form-control" name="topic" value={form.topic} onChange={handleChange} required style={{width:130}} />
      <input className="form-control" name="hours" type="number" value={form.hours} onChange={handleChange} required style={{width:80}} />
      <button className="btn btn-primary" type="submit">💾 Save</button>
      <button className="btn" type="button" onClick={onCancel} style={{ background: '#e2e8f0' }}>❌ Cancel</button>
    </form>
  );
}

export default function StudyLogList() {
  const [logs, setLogs] = useState([]);
  const [editId, setEditId] = useState(null);

  const params = new URLSearchParams(window.location.search);
  const initialTopic = params.get('topic') || '';
  const initialDate = params.get('date') || '';
  const [searchQuery, setSearchQuery] = useState(initialTopic);

  const loadLogs = () => fetchStudyLogs().then(res => setLogs(res.data));
  useEffect(() => { loadLogs(); }, []);

  const handleDelete = async (id) => {
    if (window.confirm('Delete this study log?')) {
      await deleteStudyLog(id);
      loadLogs();
    }
  };

  const handleEdit = (id) => setEditId(id);
  const handleCancel = () => setEditId(null);
  const handleSave = async (form) => {
    await updateStudyLog(form.id, form);
    setEditId(null);
    loadLogs();
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    window.history.replaceState({}, document.title, window.location.pathname);
  };

  const filteredLogs = logs.filter(log => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (log.topic || '').toLowerCase().includes(q) || (log.subtopic || '').toLowerCase().includes(q);
  });

  return (
    <div>
      <StudyLogForm onSuccess={loadLogs} defaultTopic={initialTopic} defaultDate={initialDate} />

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
            placeholder="Search by topic or subtopic..." 
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
          Showing <strong style={{ color: 'var(--text-primary)' }}>{filteredLogs.length}</strong> of {logs.length} study logs
        </div>
      </div>

      <div className="table-responsive">
        <table className="styled-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Topic</th>
              <th>Subtopic</th>
              <th>Hours</th>
              <th>Confidence</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredLogs.map(log => (
              <tr key={log.id} className={editId === log.id ? 'editing-row' : ''}>
                {editId === log.id ? (
                  <td colSpan="6">
                    <EditRow log={log} onSave={handleSave} onCancel={handleCancel} />
                  </td>
                ) : (
                  <>
                    <td style={{ fontWeight: 600 }}>{log.date}</td>
                    <td>{log.topic}</td>
                    <td>{log.subtopic || '-'}</td>
                    <td>{log.hours}h</td>
                    <td><span className="status-badge status-info">{log.confidence}/5</span></td>
                    <td>
                      <button className="btn btn-edit" onClick={() => handleEdit(log.id)}>✏️ Edit</button>
                      <button className="btn btn-danger" onClick={() => handleDelete(log.id)}>🗑️ Delete</button>
                    </td>
                  </>
                )}
              </tr>
            ))}
            {filteredLogs.length === 0 && (
              <tr>
                <td colSpan="6" style={{ padding: 0 }}>
                  <div className="empty-state" style={{ padding: '3rem 1.5rem' }}>
                    <div className="empty-state-icon">📚</div>
                    <div className="empty-state-text">No study logs found.</div>
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
