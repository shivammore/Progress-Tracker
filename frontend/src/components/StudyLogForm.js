import React, { useState, useEffect } from 'react';
import { createStudyLog } from '../api/studyLogApi';

export default function StudyLogForm({ onSuccess, defaultTopic, defaultDate }) {
  const [isOpen, setIsOpen] = useState(false);
  const [form, setForm] = useState({
    date: defaultDate || '', topic: defaultTopic || '', subtopic: '', hours: '', confidence: '', sql_solved: '', pyspark_solved: '', resources: '', notes: ''
  });
  const [error, setError] = useState(null);

  useEffect(() => {
    if (defaultTopic || defaultDate) {
      setForm(prev => ({
        ...prev,
        topic: defaultTopic || prev.topic,
        date: defaultDate || prev.date
      }));
    }
  }, [defaultTopic, defaultDate]);

  const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async e => {
    e.preventDefault();
    try {
      await createStudyLog({
        ...form,
        hours: Number(form.hours),
        confidence: Number(form.confidence),
        sql_solved: form.sql_solved ? Number(form.sql_solved) : 0,
        pyspark_solved: form.pyspark_solved ? Number(form.pyspark_solved) : 0
      });
      setForm({ date: '', topic: '', subtopic: '', hours: '', confidence: '', sql_solved: '', pyspark_solved: '', resources: '', notes: '' });
      setError(null);
      setIsOpen(false);
      if (onSuccess) onSuccess();
    } catch (err) {
      setError('Failed to add study log');
    }
  };

  return (
    <div className="form-collapsible">
      <div className="form-collapsible-header" onClick={() => setIsOpen(!isOpen)}>
        <div className="form-collapsible-title">📚 Add Study Log</div>
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
                <label className="form-label required">Topic</label>
                <input className="form-control" name="topic" placeholder="e.g. System Design" value={form.topic} onChange={handleChange} required />
              </div>
              <div className="form-group">
                <label className="form-label">Subtopic</label>
                <input className="form-control" name="subtopic" placeholder="e.g. Load Balancing" value={form.subtopic} onChange={handleChange} />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label required">Hours</label>
                <input className="form-control" name="hours" type="number" step="0.5" placeholder="e.g. 2.5" value={form.hours} onChange={handleChange} required />
              </div>
              <div className="form-group">
                <label className="form-label required">Confidence</label>
                <select className="form-control" name="confidence" value={form.confidence} onChange={handleChange} required>
                  <option value="">Select (1-5)...</option>
                  <option value="1">1 - Needs Review</option>
                  <option value="2">2 - Basic Understanding</option>
                  <option value="3">3 - Comfortable</option>
                  <option value="4">4 - Very Confident</option>
                  <option value="5">5 - Expert</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">SQL Problems Solved</label>
                <input className="form-control" name="sql_solved" type="number" placeholder="0" value={form.sql_solved} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label className="form-label">PySpark Solved</label>
                <input className="form-control" name="pyspark_solved" type="number" placeholder="0" value={form.pyspark_solved} onChange={handleChange} />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Resources Used</label>
                <input className="form-control" name="resources" placeholder="Links or book names..." value={form.resources} onChange={handleChange} />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Notes</label>
                <textarea className="form-control" name="notes" placeholder="Key takeaways..." value={form.notes} onChange={handleChange} rows={2}></textarea>
              </div>
            </div>

            <div className="form-actions">
              <button className="btn btn-ghost" type="button" onClick={() => setIsOpen(false)}>Cancel</button>
              <button className="btn btn-primary" type="submit">➕ Add Log</button>
            </div>
            {error && <div style={{ color: '#e11d48', marginTop: '1rem', fontWeight: 600 }}>{error}</div>}
          </form>
        </div>
      )}
    </div>
  );
}