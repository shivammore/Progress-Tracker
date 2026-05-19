import React, { useState, useEffect } from 'react';
import { createStudyLog } from '../api/studyLogApi';

export default function StudyLogForm({ onSuccess, defaultTopic, defaultDate }) {
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
      if (onSuccess) onSuccess();
    } catch (err) {
      setError('Failed to add study log');
    }
  };

  return (
    <div className="form-container">
      <h3 style={{ marginTop: 0, marginBottom: '1rem', color: '#4f46e5' }}>Add Study Log</h3>
      <form onSubmit={handleSubmit}>
        <div className="form-grid">
          <input className="form-control" name="date" type="date" value={form.date} onChange={handleChange} required />
          <input className="form-control" name="topic" placeholder="Topic" value={form.topic} onChange={handleChange} required />
          <input className="form-control" name="subtopic" placeholder="Subtopic" value={form.subtopic} onChange={handleChange} />
          <input className="form-control" name="hours" placeholder="Hours" value={form.hours} onChange={handleChange} required />
          <input className="form-control" name="confidence" placeholder="Confidence (1-5)" value={form.confidence} onChange={handleChange} required />
          <input className="form-control" name="sql_solved" placeholder="SQL Solved" value={form.sql_solved} onChange={handleChange} />
          <input className="form-control" name="pyspark_solved" placeholder="PySpark Solved" value={form.pyspark_solved} onChange={handleChange} />
          <input className="form-control" name="resources" placeholder="Resources" value={form.resources} onChange={handleChange} />
          <input className="form-control" name="notes" placeholder="Notes" value={form.notes} onChange={handleChange} />
          <button className="btn btn-primary" type="submit">➕ Add</button>
        </div>
        {error && <div style={{ color: '#e11d48', marginTop: '1rem', fontWeight: 600 }}>{error}</div>}
      </form>
    </div>
  );
}