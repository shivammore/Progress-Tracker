import React, { useEffect, useState } from 'react';
import { fetchMockInterviews, deleteMockInterview, updateMockInterview } from '../api/mockInterviewApi';
import MockInterviewForm from './MockInterviewForm';
import MockInterviewChat from './MockInterviewChat';
import RightSidebarWidgets from './RightSidebarWidgets';

function EditRow({ interview, onSave, onCancel }) {
  const [form, setForm] = useState({ ...interview });
  const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value });
  const handleSubmit = e => {
    e.preventDefault();
    onSave({ ...form, score: Number(form.score) });
  };
  return (
    <form onSubmit={handleSubmit} className="form-grid" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
      <input className="form-control" name="date" type="date" value={form.date} onChange={handleChange} required style={{width:130}} />
      <input className="form-control" name="type" value={form.type} onChange={handleChange} required style={{width:130}} />
      <input className="form-control" name="score" type="number" value={form.score} onChange={handleChange} required style={{width:80}} />
      <button className="btn btn-primary" type="submit">💾 Save</button>
      <button className="btn" type="button" onClick={onCancel} style={{ background: '#e2e8f0' }}>❌ Cancel</button>
    </form>
  );
}

export default function MockInterviewList() {
  const [interviews, setInterviews] = useState([]);
  const [editId, setEditId] = useState(null);
  const [showAIInterview, setShowAIInterview] = useState(false);
  const loadInterviews = () => fetchMockInterviews().then(res => setInterviews(res.data));
  useEffect(() => { loadInterviews(); }, []);
  const handleDelete = async (id) => {
    if (window.confirm('Delete this mock interview?')) {
      await deleteMockInterview(id);
      loadInterviews();
    }
  };
  const handleEdit = (id) => setEditId(id);
  const handleCancel = () => setEditId(null);
  const handleSave = async (form) => {
    await updateMockInterview(form.id, form);
    setEditId(null);
    loadInterviews();
  };
  return (
    <div className="dashboard-grid">
      <div className="dp-left-col">
      {/* AI Mock Interview Launch Button */}
      <div
        style={{
          background: 'linear-gradient(135deg, rgba(99,102,241,0.12) 0%, rgba(168,85,247,0.12) 100%)',
          border: '1px solid rgba(99,102,241,0.3)',
          borderRadius: '1rem',
          padding: '1.25rem 1.5rem',
          marginBottom: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
          flexWrap: 'wrap',
        }}
      >
        <div>
          <div style={{ fontWeight: 700, fontSize: '1.05rem', marginBottom: '0.25rem' }}>
            🎤 AI Mock Interview
          </div>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            Practice with an AI interviewer — get scored and receive instant feedback
          </div>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => setShowAIInterview(true)}
          style={{
            background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
            padding: '0.7rem 1.5rem',
            borderRadius: '0.75rem',
            fontWeight: 700,
            fontSize: '0.95rem',
            whiteSpace: 'nowrap',
            boxShadow: '0 4px 15px rgba(99, 102, 241, 0.3)',
          }}
        >
          🚀 Start AI Interview
        </button>
      </div>

      <MockInterviewForm onSuccess={loadInterviews} />
      <div className="table-responsive">
        <table className="styled-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Type</th>
              <th>Platform</th>
              <th>Score</th>
              <th>Strengths / Weak Areas</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {interviews.map(interview => (
              <tr key={interview.id} className={editId === interview.id ? 'editing-row' : ''}>
                {editId === interview.id ? (
                  <td colSpan="6">
                    <EditRow interview={interview} onSave={handleSave} onCancel={handleCancel} />
                  </td>
                ) : (
                  <>
                    <td style={{ fontWeight: 600 }}>{interview.date}</td>
                    <td>{interview.type}</td>
                    <td>{interview.platform || '-'}</td>
                    <td><span className="status-badge status-info">{interview.score}/10</span></td>
                    <td>
                      <div style={{ fontSize: '0.85rem' }}>
                        <div><strong style={{color:'#16a34a'}}>+</strong> {interview.strengths || '-'}</div>
                        <div><strong style={{color:'#e11d48'}}>-</strong> {interview.weak_areas || '-'}</div>
                      </div>
                    </td>
                    <td>
                      <button className="btn btn-edit" onClick={() => handleEdit(interview.id)}>✏️ Edit</button>
                      <button className="btn btn-danger" onClick={() => handleDelete(interview.id)}>🗑️ Delete</button>
                    </td>
                  </>
                )}
              </tr>
            ))}
            {interviews.length === 0 && (
              <tr>
                <td colSpan="6" style={{ padding: 0 }}>
                  <div className="empty-state">
                    <div className="empty-state-icon">🎤</div>
                    <div className="empty-state-text">No mock interviews recorded.</div>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>

      <RightSidebarWidgets />

      {/* AI Mock Interview Modal */}
      {showAIInterview && (
        <MockInterviewChat
          onClose={() => setShowAIInterview(false)}
          onSaveComplete={loadInterviews}
        />
      )}

    </div>
  );
}