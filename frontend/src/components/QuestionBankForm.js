import React, { useState } from 'react';
import { createQuestion } from '../api/questionBankApi';

export default function QuestionBankForm({ onSuccess }) {
  const [isOpen, setIsOpen] = useState(false);
  const [form, setForm] = useState({
    topic: '', question: '', difficulty: '', answer: '', confidence: '', last_revised: ''
  });
  const [error, setError] = useState(null);

  const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async e => {
    e.preventDefault();
    try {
      await createQuestion({
        ...form,
        confidence: Number(form.confidence)
      });
      setForm({ topic: '', question: '', difficulty: '', answer: '', confidence: '', last_revised: '' });
      setError(null);
      setIsOpen(false);
      if (onSuccess) onSuccess();
    } catch (err) {
      setError('Failed to add question');
    }
  };

  return (
    <div className="form-collapsible">
      <div className="form-collapsible-header" onClick={() => setIsOpen(!isOpen)}>
        <div className="form-collapsible-title">💡 Add Question</div>
        <div>{isOpen ? '▲' : '▼'}</div>
      </div>
      {isOpen && (
        <div className="form-collapsible-body">
          <form onSubmit={handleSubmit}>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label required">Topic</label>
                <input className="form-control" name="topic" placeholder="e.g. Data Structures" value={form.topic} onChange={handleChange} required />
              </div>
              <div className="form-group">
                <label className="form-label required">Difficulty</label>
                <select className="form-control" name="difficulty" value={form.difficulty} onChange={handleChange} required>
                  <option value="">Select Difficulty...</option>
                  <option value="Easy">Easy</option>
                  <option value="Medium">Medium</option>
                  <option value="Hard">Hard</option>
                </select>
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
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label required">Question</label>
                <textarea className="form-control" name="question" placeholder="The interview question..." value={form.question} onChange={handleChange} required rows={2}></textarea>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Answer / Key Points</label>
                <textarea className="form-control" name="answer" placeholder="How to solve it..." value={form.answer} onChange={handleChange} rows={3}></textarea>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Last Revised</label>
                <input className="form-control" name="last_revised" type="date" value={form.last_revised} onChange={handleChange} />
              </div>
            </div>

            <div className="form-actions">
              <button className="btn btn-ghost" type="button" onClick={() => setIsOpen(false)}>Cancel</button>
              <button className="btn btn-primary" type="submit">➕ Add Question</button>
            </div>
            {error && <div style={{ color: '#e11d48', marginTop: '1rem', fontWeight: 600 }}>{error}</div>}
          </form>
        </div>
      )}
    </div>
  );
}