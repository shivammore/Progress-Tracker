import React, { useEffect, useState } from 'react';
import { fetchQuestions, deleteQuestion, updateQuestion } from '../api/questionBankApi';
import QuestionBankForm from './QuestionBankForm';

function EditCardInline({ q, onSave, onCancel }) {
  const [form, setForm] = useState({ ...q });
  const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value });
  const handleSubmit = e => {
    e.preventDefault();
    onSave({ ...form });
  };
  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <div>
        <label className="form-label">Topic</label>
        <input className="form-control" name="topic" value={form.topic} onChange={handleChange} required />
      </div>
      <div>
        <label className="form-label">Question</label>
        <textarea className="form-control" name="question" value={form.question} onChange={handleChange} required rows={3} />
      </div>
      <div style={{ display: 'flex', gap: '0.75rem' }}>
        <div style={{ flex: 1 }}>
          <label className="form-label">Difficulty</label>
          <select className="form-control" name="difficulty" value={form.difficulty} onChange={handleChange} required>
            <option value="Easy">Easy</option>
            <option value="Medium">Medium</option>
            <option value="Hard">Hard</option>
          </select>
        </div>
        <div style={{ flex: 1 }}>
          <label className="form-label">Confidence (1-5)</label>
          <input className="form-control" type="number" name="confidence" value={form.confidence} onChange={handleChange} min="1" max="5" required />
        </div>
      </div>
      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
        <button className="btn btn-primary" type="submit" style={{ flex: 1 }}>💾 Save</button>
        <button className="btn btn-ghost" type="button" onClick={onCancel} style={{ flex: 1 }}>Cancel</button>
      </div>
    </form>
  );
}

const getDiffBadge = (diff) => {
  const d = (diff || '').toLowerCase();
  if (d === 'easy') return 'status-badge diff-easy';
  if (d === 'medium') return 'status-badge diff-medium';
  if (d === 'hard') return 'status-badge diff-hard';
  return 'status-badge status-neutral';
};

export default function QuestionBankList() {
  const [questions, setQuestions] = useState([]);
  const [editId, setEditId] = useState(null);
  const [filterTopic, setFilterTopic] = useState('all');
  const [filterDiff, setFilterDiff] = useState('all');

  const loadQuestions = () => fetchQuestions().then(res => setQuestions(res.data));
  useEffect(() => { loadQuestions(); }, []);

  const handleDelete = async (id) => {
    if (window.confirm('Delete this question?')) {
      await deleteQuestion(id);
      loadQuestions();
    }
  };
  const handleSave = async (form) => {
    await updateQuestion(form.id, form);
    setEditId(null);
    loadQuestions();
  };

  const topics = [...new Set(questions.map(q => q.topic))].sort();

  let filtered = questions;
  if (filterTopic !== 'all') filtered = filtered.filter(q => q.topic === filterTopic);
  if (filterDiff !== 'all') filtered = filtered.filter(q => (q.difficulty || '').toLowerCase() === filterDiff.toLowerCase());

  return (
    <div>
      <QuestionBankForm onSuccess={loadQuestions} />

      {/* Filters Bar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.25rem',
        flexWrap: 'wrap', padding: '0.75rem 1rem',
        background: 'var(--bg-main)', borderRadius: 'var(--radius-md)',
        border: '1px solid var(--border)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Topic:</span>
          <select className="form-control" value={filterTopic} onChange={e => setFilterTopic(e.target.value)}
            style={{ minWidth: '120px', padding: '0.4rem 0.6rem' }}>
            <option value="all">All Topics</option>
            {topics.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Difficulty:</span>
          <select className="form-control" value={filterDiff} onChange={e => setFilterDiff(e.target.value)}
            style={{ minWidth: '100px', padding: '0.4rem 0.6rem' }}>
            <option value="all">All</option>
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
        </div>
        <div style={{ marginLeft: 'auto', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
          Showing <strong style={{ color: 'var(--text-primary)' }}>{filtered.length}</strong> questions
        </div>
      </div>

      <style>{`
        .form-label { display: block; font-size: 0.72rem; font-weight: 600; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.3rem; }
        .question-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 1rem; }
        .q-card { background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius-lg); padding: 1.25rem; display: flex; flex-direction: column; transition: all var(--transition); box-shadow: var(--shadow-sm); position: relative; }
        .q-card:hover { box-shadow: var(--shadow-md); transform: translateY(-2px); border-color: var(--accent-light); }
        .q-card-actions { position: absolute; top: 1rem; right: 1rem; display: flex; gap: 0.25rem; opacity: 0; transition: opacity 0.2s; }
        .q-card:hover .q-card-actions { opacity: 1; }
        .q-card-btn { background: var(--bg-main); border: 1px solid var(--border); border-radius: 4px; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; cursor: pointer; color: var(--text-secondary); font-size: 0.8rem; }
        .q-card-btn:hover { background: var(--bg-card-hover); color: var(--text-primary); }
        .q-card-btn.danger:hover { color: var(--danger); border-color: var(--danger); background: var(--danger-bg); }
        .conf-bar { height: 6px; background: var(--bg-main); border-radius: 3px; overflow: hidden; margin-top: 0.5rem; }
        .conf-fill { height: 100%; transition: width 0.3s; }
      `}</style>

      {/* Grid of Flashcards */}
      <div className="question-grid">
        {filtered.map(q => (
          <div key={q.id} className="q-card" style={editId === q.id ? { borderColor: 'var(--accent)', boxShadow: 'var(--shadow-md)' } : {}}>
            {editId === q.id ? (
              <EditCardInline q={q} onSave={handleSave} onCancel={() => setEditId(null)} />
            ) : (
              <>
                <div className="q-card-actions">
                  <button className="q-card-btn" onClick={() => setEditId(q.id)} title="Edit">✏️</button>
                  <button className="q-card-btn danger" onClick={() => handleDelete(q.id)} title="Delete">🗑️</button>
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                  <span className={getDiffBadge(q.difficulty)}>{q.difficulty}</span>
                  <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {q.topic}
                  </span>
                </div>
                
                <div style={{ fontSize: '0.95rem', fontWeight: 500, color: 'var(--text-primary)', marginBottom: '1.25rem', flex: 1, lineHeight: 1.5 }}>
                  {q.question}
                </div>
                
                <div style={{ marginTop: 'auto', borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                    <span>Confidence</span>
                    <span>{q.confidence || 0} / 5</span>
                  </div>
                  <div className="conf-bar">
                    <div className="conf-fill" style={{ 
                      width: `${((q.confidence || 0) / 5) * 100}%`,
                      background: (q.confidence || 0) >= 4 ? 'var(--success)' : (q.confidence || 0) >= 3 ? 'var(--warning)' : 'var(--danger)'
                    }} />
                  </div>
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="empty-state">
          <div className="empty-state-icon">💡</div>
          <div className="empty-state-text">No questions match your filters.</div>
        </div>
      )}
    </div>
  );
}
