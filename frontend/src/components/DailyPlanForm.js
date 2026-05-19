import React, { useState } from 'react';
import { createDailyPlan } from '../api/dailyPlanApi';

export default function DailyPlanForm({ onSuccess }) {
  const [isOpen, setIsOpen] = useState(false);
  const [form, setForm] = useState({
    day: '',
    date: '',
    week: '',
    focus_area: '',
    tasks: '',
    hours_planned: '',
    status: 'Not Started',
    hours_actual: '',
    notes: ''
  });
  const [error, setError] = useState(null);

  const handleChange = e => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async e => {
    e.preventDefault();
    try {
      await createDailyPlan({
        ...form,
        day: Number(form.day),
        hours_planned: Number(form.hours_planned),
        hours_actual: form.hours_actual ? Number(form.hours_actual) : null
      });
      setForm({
        day: '', date: '', week: '', focus_area: '', tasks: '', hours_planned: '', status: 'Not Started', hours_actual: '', notes: ''
      });
      setError(null);
      setIsOpen(false);
      if (onSuccess) onSuccess();
    } catch (err) {
      setError('Failed to add daily plan');
    }
  };

  return (
    <div className="form-collapsible">
      <div className="form-collapsible-header" onClick={() => setIsOpen(!isOpen)}>
        <div className="form-collapsible-title">📅 Add Daily Plan</div>
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
                <label className="form-label required">Day (Number)</label>
                <input className="form-control" name="day" type="number" placeholder="e.g. 1" value={form.day} onChange={handleChange} required />
              </div>
              <div className="form-group">
                <label className="form-label required">Week</label>
                <input className="form-control" name="week" placeholder="e.g. Week 1" value={form.week} onChange={handleChange} required />
              </div>
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label className="form-label required">Focus Area</label>
                <input className="form-control" name="focus_area" placeholder="e.g. Data Modeling" value={form.focus_area} onChange={handleChange} required />
              </div>
              <div className="form-group">
                <label className="form-label required">Status</label>
                <select className="form-control" name="status" value={form.status} onChange={handleChange} required>
                  <option value="Not Started">Not Started</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Done">Done</option>
                </select>
              </div>
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label className="form-label required">Tasks</label>
                <textarea className="form-control" name="tasks" placeholder="List tasks (one per line)..." value={form.tasks} onChange={handleChange} required rows={3}></textarea>
              </div>
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label className="form-label required">Hours Planned</label>
                <input className="form-control" name="hours_planned" type="number" step="0.5" placeholder="0.0" value={form.hours_planned} onChange={handleChange} required />
              </div>
              <div className="form-group">
                <label className="form-label">Hours Actual</label>
                <input className="form-control" name="hours_actual" type="number" step="0.5" placeholder="0.0" value={form.hours_actual} onChange={handleChange} />
              </div>
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Notes</label>
                <textarea className="form-control" name="notes" placeholder="Any reflections or notes..." value={form.notes} onChange={handleChange} rows={2}></textarea>
              </div>
            </div>
            
            <div className="form-actions">
              <button className="btn btn-ghost" type="button" onClick={() => setIsOpen(false)}>Cancel</button>
              <button className="btn btn-primary" type="submit">➕ Add Plan</button>
            </div>
            {error && <div style={{ color: '#e11d48', marginTop: '1rem', fontWeight: 600 }}>{error}</div>}
          </form>
        </div>
      )}
    </div>
  );
}
