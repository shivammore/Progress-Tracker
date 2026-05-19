import React, { useState } from 'react';
import { createMockInterview } from '../api/mockInterviewApi';

export default function MockInterviewForm({ onSuccess }) {
  const [isOpen, setIsOpen] = useState(false);
  const [form, setForm] = useState({
    date: '', type: '', platform: '', score: '', strengths: '', weak_areas: '', action_items: ''
  });
  const [error, setError] = useState(null);

  const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async e => {
    e.preventDefault();
    try {
      await createMockInterview({
        ...form,
        score: Number(form.score)
      });
      setForm({ date: '', type: '', platform: '', score: '', strengths: '', weak_areas: '', action_items: '' });
      setError(null);
      setIsOpen(false);
      if (onSuccess) onSuccess();
    } catch (err) {
      setError('Failed to add mock interview');
    }
  };

  return (
    <div className="form-collapsible">
      <div className="form-collapsible-header" onClick={() => setIsOpen(!isOpen)}>
        <div className="form-collapsible-title">🗣️ Add Mock Interview</div>
        <div>{isOpen ? '▲' : '▼'}</div>
      </div>
      {isOpen && (
        <div className="form-collapsible-body">
          <form onSubmit={handleSubmit}>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label required">Date</label>
                <input className="form-control" name="date" type="date" value={form.date} onChange={handleChange} required />
              </div>
              <div className="form-group">
                <label className="form-label required">Type</label>
                <input className="form-control" name="type" placeholder="e.g. System Design, Behavioral" value={form.type} onChange={handleChange} required />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Platform / Interviewer</label>
                <input className="form-control" name="platform" placeholder="e.g. Pramp, Peer" value={form.platform} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label className="form-label required">Score (1-10)</label>
                <input className="form-control" name="score" type="number" step="0.5" placeholder="e.g. 7.5" value={form.score} onChange={handleChange} required />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Strengths</label>
                <textarea className="form-control" name="strengths" placeholder="What went well..." value={form.strengths} onChange={handleChange} rows={2}></textarea>
              </div>
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Weak Areas</label>
                <textarea className="form-control" name="weak_areas" placeholder="Areas to improve..." value={form.weak_areas} onChange={handleChange} rows={2}></textarea>
              </div>
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Action Items</label>
                <textarea className="form-control" name="action_items" placeholder="Next steps..." value={form.action_items} onChange={handleChange} rows={2}></textarea>
              </div>
            </div>

            <div className="form-actions">
              <button className="btn btn-ghost" type="button" onClick={() => setIsOpen(false)}>Cancel</button>
              <button className="btn btn-primary" type="submit">➕ Add Interview</button>
            </div>
            {error && <div style={{ color: '#e11d48', marginTop: '1rem', fontWeight: 600 }}>{error}</div>}
          </form>
        </div>
      )}
    </div>
  );
}