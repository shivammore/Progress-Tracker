import React, { useState } from 'react';
import { createReminder } from '../api/reminderApi';

export default function ReminderForm({ onSuccess }) {
  const [isOpen, setIsOpen] = useState(false);
  const [form, setForm] = useState({
    title: '', due_date: '', completed: false, notes: ''
  });
  const [error, setError] = useState(null);

  const handleChange = e => {
    const { name, value, type, checked } = e.target;
    setForm({ ...form, [name]: type === 'checkbox' ? checked : value });
  };

  const handleSubmit = async e => {
    e.preventDefault();
    try {
      await createReminder({ ...form });
      setForm({ title: '', due_date: '', completed: false, notes: '' });
      setError(null);
      setIsOpen(false);
      if (onSuccess) onSuccess();
    } catch (err) {
      setError('Failed to add reminder');
    }
  };

  return (
    <div className="form-collapsible">
      <div className="form-collapsible-header" onClick={() => setIsOpen(!isOpen)}>
        <div className="form-collapsible-title">⏰ Add Reminder</div>
        <div>{isOpen ? '▲' : '▼'}</div>
      </div>
      {isOpen && (
        <div className="form-collapsible-body">
          <form onSubmit={handleSubmit}>
            <div className="form-row">
              <div className="form-group" style={{ flex: 2 }}>
                <label className="form-label required">Title</label>
                <input className="form-control" name="title" placeholder="What to remember..." value={form.title} onChange={handleChange} required />
              </div>
              <div className="form-group">
                <label className="form-label required">Due Date</label>
                <input className="form-control" name="due_date" type="date" value={form.due_date} onChange={handleChange} required />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Notes</label>
                <textarea className="form-control" name="notes" placeholder="Additional details..." value={form.notes} onChange={handleChange} rows={2}></textarea>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, cursor: 'pointer' }}>
                  <input name="completed" type="checkbox" checked={form.completed} onChange={handleChange} style={{ width: '1.2rem', height: '1.2rem' }} /> 
                  Mark as Completed
                </label>
              </div>
            </div>

            <div className="form-actions">
              <button className="btn btn-ghost" type="button" onClick={() => setIsOpen(false)}>Cancel</button>
              <button className="btn btn-primary" type="submit">➕ Add Reminder</button>
            </div>
            {error && <div style={{ color: '#e11d48', marginTop: '1rem', fontWeight: 600 }}>{error}</div>}
          </form>
        </div>
      )}
    </div>
  );
}