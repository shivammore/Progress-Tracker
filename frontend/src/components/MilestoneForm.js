import React, { useState } from 'react';
import { createMilestone } from '../api/milestoneApi';

export default function MilestoneForm({ onSuccess }) {
  const [isOpen, setIsOpen] = useState(false);
  const [form, setForm] = useState({
    project: '', milestone: '', owner: '', due_date: '', status: 'Not Started', github_url: '', notes: ''
  });
  const [error, setError] = useState(null);

  const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async e => {
    e.preventDefault();
    try {
      await createMilestone({ ...form });
      setForm({ project: '', milestone: '', owner: '', due_date: '', status: 'Not Started', github_url: '', notes: '' });
      setError(null);
      setIsOpen(false);
      if (onSuccess) onSuccess();
    } catch (err) {
      setError('Failed to add milestone');
    }
  };

  return (
    <div className="form-collapsible">
      <div className="form-collapsible-header" onClick={() => setIsOpen(!isOpen)}>
        <div className="form-collapsible-title">🚩 Add Project Milestone</div>
        <div>{isOpen ? '▲' : '▼'}</div>
      </div>
      {isOpen && (
        <div className="form-collapsible-body">
          <form onSubmit={handleSubmit}>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label required">Project</label>
                <input className="form-control" name="project" placeholder="e.g. Portfolio Website" value={form.project} onChange={handleChange} required />
              </div>
              <div className="form-group">
                <label className="form-label required">Milestone</label>
                <input className="form-control" name="milestone" placeholder="e.g. Finish UI" value={form.milestone} onChange={handleChange} required />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label required">Owner</label>
                <input className="form-control" name="owner" placeholder="e.g. Self" value={form.owner} onChange={handleChange} required />
              </div>
              <div className="form-group">
                <label className="form-label required">Due Date</label>
                <input className="form-control" name="due_date" type="date" value={form.due_date} onChange={handleChange} required />
              </div>
              <div className="form-group">
                <label className="form-label required">Status</label>
                <select className="form-control" name="status" value={form.status} onChange={handleChange} required>
                  <option value="Not Started">Not Started</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Done">Done</option>
                  <option value="Blocked">Blocked</option>
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">GitHub URL</label>
                <input className="form-control" name="github_url" placeholder="https://github.com/..." value={form.github_url} onChange={handleChange} />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Notes</label>
                <textarea className="form-control" name="notes" placeholder="Any details..." value={form.notes} onChange={handleChange} rows={2}></textarea>
              </div>
            </div>

            <div className="form-actions">
              <button className="btn btn-ghost" type="button" onClick={() => setIsOpen(false)}>Cancel</button>
              <button className="btn btn-primary" type="submit">➕ Add Milestone</button>
            </div>
            {error && <div style={{ color: '#e11d48', marginTop: '1rem', fontWeight: 600 }}>{error}</div>}
          </form>
        </div>
      )}
    </div>
  );
}