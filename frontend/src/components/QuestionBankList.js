import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { fetchQuestions, deleteQuestion, updateQuestion, createQuestion, reviewQuestion } from '../api/questionBankApi';
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
      <div>
        <label className="form-label">Answer / Key Points</label>
        <textarea className="form-control" name="answer" value={form.answer || ''} onChange={handleChange} rows={3} placeholder="How to solve it..." />
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

/* ================================================================
   FLASHCARD PRACTICE MODE COMPONENT
   ================================================================ */
function FlashcardPractice({ questions, onExit, onUpdateQuestion }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [sessionComplete, setSessionComplete] = useState(false);
  const [ratings, setRatings] = useState([]);
  const [slideDir, setSlideDir] = useState(null);
  const [xpPopups, setXpPopups] = React.useState([]);

  const handleSpeak = (text) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text.replace(/[#_*`[\]()]/g, ''));
      window.speechSynthesis.speak(utterance);
    }
  };

  // SRS Sort: review due first
  const practiceQueue = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return [...questions].filter(q => !q.next_review_date || q.next_review_date <= today).sort((a, b) => {
      // Prioritize cards that are more overdue, or lower confidence if tie
      const dateA = a.next_review_date ? new Date(a.next_review_date) : new Date(0);
      const dateB = b.next_review_date ? new Date(b.next_review_date) : new Date(0);
      if (dateA.getTime() !== dateB.getTime()) return dateA - dateB;
      const confA = a.confidence || 0;
      const confB = b.confidence || 0;
      return confA - confB;
    });
  }, [questions]);

  const currentCard = practiceQueue[currentIndex];
  const totalCards = practiceQueue.length;
  const progress = totalCards > 0 ? ((currentIndex + (sessionComplete ? 1 : 0)) / totalCards) * 100 : 0;

  const handleFlip = () => {
    if (!isAnimating && !sessionComplete) {
      setIsFlipped(!isFlipped);
    }
  };

  const handleRate = async (confidenceValue, e) => {
    if (isAnimating) return;
    setIsAnimating(true);
    setRatings(prev => [...prev, confidenceValue]);

    if (e) {
      const rect = e.target.getBoundingClientRect();
      const newPopup = { id: Date.now(), x: rect.left + 20, y: rect.top - 20 };
      setXpPopups(prev => [...prev, newPopup]);
      setTimeout(() => setXpPopups(prev => prev.filter(p => p.id !== newPopup.id)), 1200);
    }

    // Update question via API
    try {
      await reviewQuestion(currentCard.id, confidenceValue);
    } catch (err) {
      console.error('Failed to review question:', err);
    }

    // Animate card out
    setSlideDir('left');
    setTimeout(() => {
      if (currentIndex + 1 >= totalCards) {
        setSessionComplete(true);
      } else {
        setCurrentIndex(prev => prev + 1);
      }
      setIsFlipped(false);
      setSlideDir('enter');
      setTimeout(() => {
        setSlideDir(null);
        setIsAnimating(false);
      }, 350);
    }, 300);
  };

  const avgConfidence = ratings.length > 0
    ? (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1)
    : 0;

  const ratingButtons = [
    { label: '😵 Again', value: 1, color: '#ef4444' },
    { label: '😓 Hard', value: 2, color: '#f59e0b' },
    { label: '🙂 Good', value: 3, color: '#10b981' },
    { label: '🤩 Easy', value: 4, color: '#6366f1' },
  ];

  if (totalCards === 0) {
    return (
      <div style={practiceStyles.overlay}>
        <div style={practiceStyles.emptyState}>
          <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>📭</div>
          <h2 style={{ color: 'var(--text-primary)', marginBottom: '0.5rem' }}>No Cards to Practice</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>Add some questions first, then come back to practice!</p>
          <button onClick={onExit} style={practiceStyles.exitBtn}>← Back to Questions</button>
        </div>
      </div>
    );
  }

  return (
    <div style={practiceStyles.overlay}>
      <style>{`
        @keyframes fc-slideOutLeft {
          from { transform: translateX(0) scale(1); opacity: 1; }
          to { transform: translateX(-120px) scale(0.9); opacity: 0; }
        }
        @keyframes fc-slideInRight {
          from { transform: translateX(120px) scale(0.9); opacity: 0; }
          to { transform: translateX(0) scale(1); opacity: 1; }
        }
        @keyframes fc-fadeInUp {
          from { transform: translateY(30px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes fc-pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
        @keyframes fc-confetti {
          0% { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(-200px) rotate(720deg); opacity: 0; }
        }
        .fc-card-inner {
          position: relative;
          width: 100%;
          height: 100%;
          transition: transform 0.6s cubic-bezier(0.16, 1, 0.3, 1);
          transform-style: preserve-3d;
        }
        .fc-card-inner.flipped {
          transform: rotateY(180deg);
        }
        .fc-card-face {
          position: absolute;
          width: 100%;
          height: 100%;
          backface-visibility: hidden;
          -webkit-backface-visibility: hidden;
          border-radius: 1.5rem;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 2.5rem;
          overflow: auto;
        }
        .fc-card-front {
          background: var(--bg-card);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid var(--border);
          box-shadow: 0 24px 48px -12px rgba(0,0,0,0.15), 0 0 0 1px rgba(255,255,255,0.05);
        }
        .fc-card-back {
          background: linear-gradient(135deg, rgba(99,102,241,0.08) 0%, rgba(168,85,247,0.08) 100%);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid rgba(99,102,241,0.2);
          box-shadow: 0 24px 48px -12px rgba(99,102,241,0.15), 0 0 0 1px rgba(99,102,241,0.1);
          transform: rotateY(180deg);
        }
        .fc-rating-btn {
          flex: 1;
          padding: 0.85rem 1rem;
          border-radius: 0.75rem;
          border: 2px solid var(--border);
          background: var(--bg-card);
          backdrop-filter: blur(12px);
          color: var(--text-primary);
          font-size: 0.9rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
          font-family: inherit;
          min-width: 100px;
        }
        .fc-rating-btn:hover {
          transform: translateY(-3px);
          box-shadow: 0 8px 24px rgba(0,0,0,0.1);
        }
        .fc-rating-btn:active {
          transform: translateY(-1px);
        }
      `}</style>

      {xpPopups.map(p => (
        <div key={p.id} className="xp-popup" style={{ left: p.x, top: p.y }}>+10 XP</div>
      ))}

      {/* Header */}
      <div style={practiceStyles.header}>
        <button onClick={onExit} style={practiceStyles.exitBtn}>
          ✕ Exit Practice
        </button>
        <div style={practiceStyles.progressInfo}>
          Card <strong>{Math.min(currentIndex + 1, totalCards)}</strong> of <strong>{totalCards}</strong>
        </div>
        <div style={{ width: '130px' }} />
      </div>

      {/* Progress Bar */}
      <div style={practiceStyles.progressBarContainer}>
        <div style={{
          ...practiceStyles.progressBarFill,
          width: `${progress}%`,
        }} />
      </div>

      {/* Main Content */}
      <div style={practiceStyles.content}>
        {sessionComplete ? (
          /* Session Summary */
          <div style={{
            ...practiceStyles.summaryCard,
            animation: 'fc-fadeInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards',
          }}>
            <div style={{ fontSize: '4rem', marginBottom: '1rem', animation: 'fc-pulse 2s infinite' }}>🎉</div>
            <h1 style={{
              fontSize: '2rem',
              fontWeight: 800,
              background: 'linear-gradient(135deg, #6366f1, #a855f7)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              marginBottom: '0.5rem',
              letterSpacing: '-0.02em',
            }}>Session Complete!</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', marginBottom: '2rem' }}>
              Great work on your practice session!
            </p>

            <div style={practiceStyles.summaryGrid}>
              <div style={practiceStyles.summaryItem}>
                <div style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--accent)' }}>{totalCards}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.05em' }}>Cards Reviewed</div>
              </div>
              <div style={practiceStyles.summaryItem}>
                <div style={{ fontSize: '2.5rem', fontWeight: 800, color: '#10b981' }}>{avgConfidence}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.05em' }}>Avg Confidence</div>
              </div>
              <div style={practiceStyles.summaryItem}>
                <div style={{ fontSize: '2.5rem', fontWeight: 800, color: '#f59e0b' }}>
                  {ratings.filter(r => r >= 3).length}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.05em' }}>Good or Better</div>
              </div>
            </div>

            {/* Rating breakdown */}
            <div style={{ marginTop: '1.5rem', width: '100%', maxWidth: '400px' }}>
              {ratingButtons.map(rb => {
                const count = ratings.filter(r => r === rb.value).length;
                const pct = totalCards > 0 ? (count / totalCards) * 100 : 0;
                return (
                  <div key={rb.value} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: '0.85rem', minWidth: '80px', textAlign: 'right' }}>{rb.label}</span>
                    <div style={{ flex: 1, height: '8px', background: 'var(--bg-main)', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{ width: `${pct}%`, height: '100%', background: rb.color, borderRadius: '4px', transition: 'width 0.5s ease' }} />
                    </div>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', minWidth: '30px' }}>{count}</span>
                  </div>
                );
              })}
            </div>

            <button onClick={onExit} style={{
              ...practiceStyles.exitBtn,
              marginTop: '2rem',
              padding: '0.85rem 2rem',
              fontSize: '1rem',
              background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
              color: '#fff',
              border: 'none',
            }}>
              ← Back to Questions
            </button>
          </div>
        ) : (
          /* Flashcard */
          <>
            {/* Topic & Difficulty badge */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem',
              animation: slideDir === 'enter' ? 'fc-slideInRight 0.35s ease forwards' : undefined,
            }}>
              <span className={getDiffBadge(currentCard.difficulty)}>{currentCard.difficulty}</span>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {currentCard.topic}
              </span>
            </div>

            {/* Card Container */}
            <div
              onClick={handleFlip}
              style={{
                ...practiceStyles.cardContainer,
                perspective: '1200px',
                cursor: 'pointer',
                animation: slideDir === 'left' ? 'fc-slideOutLeft 0.3s ease forwards'
                         : slideDir === 'enter' ? 'fc-slideInRight 0.35s ease forwards'
                         : undefined,
              }}
            >
              <div className={`fc-card-inner ${isFlipped ? 'flipped' : ''}`}>
                {/* Front */}
                <div className="fc-card-face fc-card-front">
                  <div style={{
                    fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)',
                    textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '1.5rem',
                  }}>Question</div>
                  <div style={{
                    fontSize: '1.3rem', fontWeight: 600, color: 'var(--text-primary)',
                    textAlign: 'center', lineHeight: 1.6, maxWidth: '100%',
                    wordBreak: 'break-word',
                  }}>
                    {currentCard.question}
                  </div>
                  <div style={{
                    marginTop: 'auto', paddingTop: '1.5rem',
                    fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.5rem',
                  }}>
                    <span style={{ fontSize: '1rem' }}>👆</span> Tap to reveal answer
                  </div>
                </div>

                {/* Back */}
                <div className="fc-card-face fc-card-back">
                  <div style={{
                    fontSize: '0.7rem', fontWeight: 700, color: 'var(--accent)',
                    textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '1.5rem',
                    display: 'flex', justifyContent: 'space-between', width: '100%'
                  }}>
                    <span>Answer</span>
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleSpeak(currentCard.answer || ''); }} 
                      style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem' }}
                      title="Listen"
                    >
                      🎧
                    </button>
                  </div>
                  <div style={{
                    fontSize: '1.15rem', fontWeight: 500, color: 'var(--text-primary)',
                    textAlign: 'center', lineHeight: 1.7, maxWidth: '100%',
                    wordBreak: 'break-word', whiteSpace: 'pre-wrap',
                  }}>
                    {currentCard.answer || 'No answer provided for this question.'}
                  </div>
                  <div style={{
                    marginTop: 'auto', paddingTop: '1.5rem',
                    fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.5rem',
                  }}>
                    <span style={{ fontSize: '1rem' }}>👇</span> Rate your confidence below
                  </div>
                </div>
              </div>
            </div>

            {/* Rating Buttons */}
            <div style={{
              display: 'flex', gap: '0.75rem', marginTop: '1.5rem', width: '100%', maxWidth: '560px',
              opacity: isFlipped ? 1 : 0.3,
              pointerEvents: isFlipped ? 'auto' : 'none',
              transition: 'opacity 0.3s ease',
            }}>
              {ratingButtons.map(rb => (
                <button
                  key={rb.value}
                  className="fc-rating-btn"
                  onClick={(e) => { e.stopPropagation(); handleRate(rb.value, e); }}
                  style={{ borderColor: rb.color + '40' }}
                  onMouseEnter={e => { e.target.style.borderColor = rb.color; e.target.style.background = rb.color + '18'; }}
                  onMouseLeave={e => { e.target.style.borderColor = rb.color + '40'; e.target.style.background = 'var(--bg-card)'; }}
                >
                  {rb.label}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const practiceStyles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999,
    background: 'var(--bg-main)',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '1rem 2rem',
    borderBottom: '1px solid var(--border)',
    background: 'var(--bg-card)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
  },
  exitBtn: {
    background: 'var(--bg-main)',
    border: '1px solid var(--border)',
    borderRadius: '0.75rem',
    padding: '0.55rem 1.25rem',
    color: 'var(--text-primary)',
    fontWeight: 600,
    fontSize: '0.85rem',
    cursor: 'pointer',
    fontFamily: 'inherit',
    transition: 'all 0.2s ease',
  },
  progressInfo: {
    fontSize: '0.9rem',
    color: 'var(--text-secondary)',
    fontWeight: 500,
  },
  progressBarContainer: {
    width: '100%',
    height: '4px',
    background: 'var(--bg-main)',
  },
  progressBarFill: {
    height: '100%',
    background: 'linear-gradient(90deg, #6366f1, #a855f7)',
    transition: 'width 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
    borderRadius: '0 2px 2px 0',
  },
  content: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '2rem',
    overflow: 'auto',
  },
  cardContainer: {
    width: '100%',
    maxWidth: '560px',
    height: '360px',
    position: 'relative',
  },
  summaryCard: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '3rem 2rem',
    background: 'var(--bg-card)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    borderRadius: '1.5rem',
    border: '1px solid var(--border)',
    boxShadow: '0 24px 48px -12px rgba(0,0,0,0.12)',
    maxWidth: '560px',
    width: '100%',
  },
  summaryGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '1.5rem',
    width: '100%',
    maxWidth: '400px',
    textAlign: 'center',
  },
  summaryItem: {
    padding: '1rem',
    background: 'var(--bg-main)',
    borderRadius: '1rem',
    border: '1px solid var(--border)',
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    textAlign: 'center',
  },
};


/* ================================================================
   MAIN QUESTION BANK LIST COMPONENT
   ================================================================ */
export default function QuestionBankList() {
  const [questions, setQuestions] = useState([]);
  const [editId, setEditId] = useState(null);
  const [filterTopic, setFilterTopic] = useState('all');
  const [filterDiff, setFilterDiff] = useState('all');
  const [expandedAnswers, setExpandedAnswers] = useState({});
  const [practiceMode, setPracticeMode] = useState(false);
  const [showParseModal, setShowParseModal] = useState(false);
  const [notesText, setNotesText] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());

  const toggleSelection = (id) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const bulkDifficultyUpdate = async (diff) => {
    for (const id of selectedIds) {
      const q = questions.find(x => x.id === id);
      if (q) await updateQuestion(id, { ...q, difficulty: diff });
    }
    setSelectedIds(new Set());
    loadQuestions();
  };

  const bulkDelete = async () => {
    if (window.confirm(`Delete ${selectedIds.size} questions?`)) {
      for (const id of selectedIds) {
        await deleteQuestion(id);
      }
      setSelectedIds(new Set());
      loadQuestions();
    }
  };

  const loadQuestions = useCallback(() => fetchQuestions().then(res => setQuestions(res.data)), []);
  useEffect(() => { loadQuestions(); }, [loadQuestions]);

  const handleDelete = async (id) => {
    if (window.confirm('Delete this question?')) {
      await deleteQuestion(id);
      loadQuestions();
    }
  };

  const handleParseNotes = async () => {
    if (!notesText.trim()) return;
    setIsParsing(true);
    try {
      const { default: callAI } = await import('../api/aiApi');
      const prompt = `Here are my study notes:\n${notesText}\n\nPlease generate 3-5 high-quality flashcards/questions from these notes. Return the result strictly in JSON format ONLY:
[
  {
    "topic": "Topic Name",
    "question": "The question?",
    "difficulty": "Medium",
    "answer": "The answer."
  }
]`;
      const reply = await callAI(prompt);
      let jsonStr = reply.trim();
      const match = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (match) jsonStr = match[1].trim();
      
      const parsed = JSON.parse(jsonStr);
      // Bulk create questions
      for (const q of parsed) {
        await createQuestion({ ...q, confidence: 0, last_revised: null });
      }
      setShowParseModal(false);
      setNotesText('');
      loadQuestions();
    } catch (e) {
      alert("Failed to parse notes: " + e.message);
    } finally {
      setIsParsing(false);
    }
  };

  const handleSave = async (form) => {
    await updateQuestion(form.id, form);
    setEditId(null);
    loadQuestions();
  };

  const handleUpdateQuestion = async (id, data) => {
    await updateQuestion(id, data);
    loadQuestions();
  };

  const toggleAnswer = (id) => {
    setExpandedAnswers(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const topics = [...new Set(questions.map(q => q.topic))].sort();

  let filtered = questions;
  if (filterTopic !== 'all') filtered = filtered.filter(q => q.topic === filterTopic);
  if (filterDiff !== 'all') filtered = filtered.filter(q => (q.difficulty || '').toLowerCase() === filterDiff.toLowerCase());

  // Practice Mode
  if (practiceMode) {
    return (
      <FlashcardPractice
        questions={filtered.length > 0 ? filtered : questions}
        onExit={() => { setPracticeMode(false); loadQuestions(); }}
        onUpdateQuestion={handleUpdateQuestion}
      />
    );
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return null;
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="dashboard-grid">
      <div className="dp-left-col">
      <QuestionBankForm onSuccess={loadQuestions} />

      {/* Practice Mode Button + Filters Bar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.25rem',
        flexWrap: 'wrap', padding: '0.75rem 1rem',
        background: 'var(--bg-main)', borderRadius: 'var(--radius-md)',
        border: '1px solid var(--border)'
      }}>
        <button
          onClick={() => setPracticeMode(true)}
          style={{
            background: 'linear-gradient(135deg, var(--accent), var(--accent-dark))',
            color: 'white', border: 'none', padding: '0.6rem 1.25rem',
            borderRadius: 'var(--radius-md)', fontWeight: 600, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            boxShadow: '0 4px 12px rgba(99,102,241,0.25)',
          }}
        >
          <span style={{ fontSize: '1.1rem' }}>🃏</span> Start Practice Mode
        </button>

        <button
          onClick={() => setShowParseModal(true)}
          style={{
            background: 'linear-gradient(135deg, #10b981, #059669)',
            color: 'white', border: 'none', padding: '0.6rem 1.25rem',
            borderRadius: 'var(--radius-md)', fontWeight: 600, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            boxShadow: '0 4px 12px rgba(16,185,129,0.25)',
          }}
        >
          <span style={{ fontSize: '1.1rem' }}>📄</span> AI Parse Notes
        </button>

        <div style={{ flex: 1 }} />

        {selectedIds.size > 0 ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(99, 102, 241, 0.1)', padding: '0.4rem 0.8rem', borderRadius: '20px' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--accent)', marginRight: '0.5rem' }}>
              {selectedIds.size} selected
            </span>
            <button className="btn btn-ghost" style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem', height: 'auto' }} onClick={() => bulkDifficultyUpdate('Easy')}>Easy</button>
            <button className="btn btn-ghost" style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem', height: 'auto' }} onClick={() => bulkDifficultyUpdate('Medium')}>Medium</button>
            <button className="btn btn-ghost" style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem', height: 'auto' }} onClick={() => bulkDifficultyUpdate('Hard')}>Hard</button>
            <button className="btn btn-danger" style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem', height: 'auto' }} onClick={bulkDelete}>🗑️ Delete</button>
          </div>
        ) : (
          <>
            <div style={{ width: '1px', height: '24px', background: 'var(--border)' }} />
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
          </>
        )}

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.8rem' }}>
          <span style={{ color: 'var(--text-secondary)' }}>
            <strong style={{ color: 'var(--text-primary)' }}>{filtered.length}</strong> questions
          </span>
          <div style={{ position: 'relative', width: '40px', height: '40px' }} title="SRS Progress: Items with confidence >= 4">
            <svg viewBox="0 0 36 36" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
              <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="var(--border)" strokeWidth="4" />
              <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="var(--success)" strokeWidth="4" strokeDasharray={`${filtered.length ? Math.round((filtered.filter(q => q.confidence >= 4).length / filtered.length) * 100) : 0}, 100`} />
            </svg>
            <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              {filtered.length ? Math.round((filtered.filter(q => q.confidence >= 4).length / filtered.length) * 100) : 0}%
            </div>
          </div>
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
        .q-answer-toggle { display: flex; align-items: center; gap: 0.4rem; background: none; border: none; color: var(--accent); font-size: 0.78rem; font-weight: 600; cursor: pointer; padding: 0.3rem 0; font-family: inherit; transition: all 0.2s; }
        .q-answer-toggle:hover { color: var(--accent-hover); }
        .q-answer-body { margin-top: 0.5rem; padding: 0.75rem; background: var(--bg-main); border-radius: var(--radius-sm); border: 1px solid var(--border); font-size: 0.88rem; line-height: 1.6; color: var(--text-secondary); white-space: pre-wrap; animation: fc-fadeInUp 0.25s ease forwards; }
      `}</style>

      {/* Main List */}
      <div className="dp-cards-container">
        {filtered.map(q => (
          <div key={q.id} className="q-card" style={editId === q.id ? { borderColor: 'var(--accent)', boxShadow: 'var(--shadow-md)' } : (selectedIds.has(q.id) ? { borderColor: 'var(--accent-light)', background: 'var(--bg-main)' } : {})}>
            {editId === q.id ? (
              <EditCardInline q={q} onSave={handleSave} onCancel={() => setEditId(null)} />
            ) : (
              <>
                <div style={{ position: 'absolute', top: '1rem', left: '1rem', zIndex: 2 }}>
                  <input type="checkbox" checked={selectedIds.has(q.id)} onChange={() => toggleSelection(q.id)} style={{ cursor: 'pointer', transform: 'scale(1.2)' }} />
                </div>
                <div className="q-card-actions">
                  <button className="q-card-btn" onClick={() => setEditId(q.id)} title="Edit">✏️</button>
                  <button className="q-card-btn danger" onClick={() => handleDelete(q.id)} title="Delete">🗑️</button>
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', paddingLeft: '2rem' }}>
                  <span className={getDiffBadge(q.difficulty)}>{q.difficulty}</span>
                  <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {q.topic}
                  </span>
                </div>
                
                <div style={{ fontSize: '0.95rem', fontWeight: 500, color: 'var(--text-primary)', marginBottom: '0.75rem', flex: 1, lineHeight: 1.5 }}>
                  {q.question}
                </div>

                {/* Answer Section (expandable) */}
                {q.answer && (
                  <div style={{ marginBottom: '0.75rem' }}>
                    <button className="q-answer-toggle" onClick={() => toggleAnswer(q.id)}>
                      <span style={{ transition: 'transform 0.2s', display: 'inline-block', transform: expandedAnswers[q.id] ? 'rotate(90deg)' : 'rotate(0deg)' }}>▶</span>
                      {expandedAnswers[q.id] ? 'Hide Answer' : 'Show Answer'}
                    </button>
                    {expandedAnswers[q.id] && (
                      <div className="q-answer-body">
                        {q.answer}
                      </div>
                    )}
                  </div>
                )}

                {/* Last Revised */}
                {q.last_revised && (
                  <div style={{
                    fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '0.5rem',
                    display: 'flex', alignItems: 'center', gap: '0.35rem',
                  }}>
                    <span>🕐</span> Last revised: {formatDate(q.last_revised)}
                  </div>
                )}
                
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

      {filtered.length === 0 && <div className="empty-state">No questions found. Add some or generate from notes!</div>}
      </div>
      <div className="dp-right-col" style={{ display: 'none' }}></div>
      
      {/* Parse Modal */}
      {showParseModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div style={{
            background: 'var(--bg-card)', padding: '2rem', borderRadius: 'var(--radius-lg)',
            width: '90%', maxWidth: '600px', border: '1px solid var(--border)',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)'
          }}>
            <h3 style={{ margin: '0 0 1rem 0' }}>📄 Generate Flashcards from Notes</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>Paste your study notes, document text, or bullet points below. The AI will automatically extract key concepts and generate flashcards.</p>
            
            <textarea
              className="form-control"
              value={notesText}
              onChange={e => setNotesText(e.target.value)}
              rows={8}
              placeholder="Paste your notes here..."
              disabled={isParsing}
              style={{ marginBottom: '1.5rem', width: '100%' }}
            />
            
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setShowParseModal(false)} disabled={isParsing}>Cancel</button>
              <button className="btn btn-primary" onClick={handleParseNotes} disabled={isParsing || !notesText.trim()}>
                {isParsing ? '⏳ Generating...' : '✨ Generate Flashcards'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}