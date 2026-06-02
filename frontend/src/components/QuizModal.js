import React, { useState, useCallback } from 'react';
import { updateDailyPlan } from '../api/dailyPlanApi';
import { createQuestion } from '../api/questionBankApi';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const styles = {
  overlay: {
    position: 'fixed', inset: 0, zIndex: 1000,
    background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    animation: 'fadeIn 0.3s ease',
  },
  modal: {
    background: 'var(--bg-card)', backdropFilter: 'blur(20px)',
    borderRadius: 'var(--radius-xl)', border: 'var(--glass-border)',
    width: '95%', maxWidth: '720px', maxHeight: '90vh', overflow: 'auto',
    boxShadow: '0 24px 48px rgba(0,0,0,0.2)', padding: '2rem',
  },
  header: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid var(--border)',
  },
  title: { fontSize: '1.4rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem' },
  closeBtn: {
    background: 'transparent', border: 'none', cursor: 'pointer',
    fontSize: '1.5rem', color: 'var(--text-muted)', transition: 'color 0.2s',
  },
  questionCard: {
    background: 'var(--bg-main)', borderRadius: 'var(--radius-lg)',
    padding: '1.5rem', marginBottom: '1.5rem', border: '1px solid var(--border)',
  },
  questionNum: {
    fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase',
    letterSpacing: '0.1em', color: 'var(--accent)', marginBottom: '0.75rem',
  },
  questionText: { fontSize: '1.05rem', fontWeight: 600, lineHeight: 1.6, color: 'var(--text-primary)' },
  optionBtn: (selected, correct, showResult) => {
    let bg = 'var(--bg-card)';
    let border = '1px solid var(--border)';
    let color = 'var(--text-primary)';
    if (showResult && selected && correct) { bg = 'var(--success-bg)'; border = '2px solid var(--success)'; color = 'var(--success)'; }
    else if (showResult && selected && !correct) { bg = 'var(--danger-bg)'; border = '2px solid var(--danger)'; color = 'var(--danger)'; }
    else if (showResult && correct) { bg = 'var(--success-bg)'; border = '2px solid var(--success)'; color = 'var(--success)'; }
    else if (selected) { bg = 'var(--accent-glow)'; border = '2px solid var(--accent)'; color = 'var(--accent)'; }
    return {
      display: 'block', width: '100%', textAlign: 'left', cursor: showResult ? 'default' : 'pointer',
      padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)',
      background: bg, border, color, fontWeight: 600, fontSize: '0.9rem',
      marginBottom: '0.5rem', transition: 'all 0.2s', fontFamily: 'inherit',
    };
  },
  progressBar: {
    height: '6px', background: 'var(--bg-main)', borderRadius: '3px',
    overflow: 'hidden', marginBottom: '1.5rem',
  },
  progressFill: (pct) => ({
    height: '100%', width: `${pct}%`, borderRadius: '3px',
    background: 'linear-gradient(90deg, #6366f1, #a855f7)',
    transition: 'width 0.5s ease',
  }),
  scoreCircle: (score) => {
    const color = score >= 80 ? 'var(--success)' : score >= 50 ? 'var(--warning)' : 'var(--danger)';
    return {
      width: '120px', height: '120px', borderRadius: '50%',
      border: `6px solid ${color}`, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem',
      background: 'var(--bg-main)',
    };
  },
  explanation: {
    marginTop: '0.75rem', padding: '0.75rem 1rem', borderRadius: 'var(--radius-sm)',
    background: 'var(--info-bg)', fontSize: '0.85rem', color: 'var(--text-secondary)',
    lineHeight: 1.6, border: '1px solid rgba(59, 130, 246, 0.15)',
  },
};

function callAI(prompt) {
  const gatewayUrl = localStorage.getItem('AI_GATEWAY_URL') || '';
  const apiKey = localStorage.getItem('AI_API_KEY');
  let model = localStorage.getItem('AI_MODEL') || 'gemini-1.5-flash';
  if (model === 'gemini-2.5-flash') model = 'gemini-1.5-flash';
  if (!apiKey) throw new Error('API Key not set. Go to Settings.');

  let url, headers, body;
  if (/generativelanguage\.googleapis\.com/.test(gatewayUrl)) {
    url = `${gatewayUrl.replace(/\/$/, '')}/${model}:generateContent?key=${apiKey}`;
    headers = { 'Content-Type': 'application/json' };
    body = { contents: [{ parts: [{ text: prompt }] }] };
  } else {
    url = gatewayUrl.endsWith('/v1/chat/completions') ? gatewayUrl : `${gatewayUrl.replace(/\/$/, '')}/v1/chat/completions`;
    headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` };
    body = { model, messages: [{ role: 'system', content: 'You are a quiz generator. Respond ONLY with valid JSON.' }, { role: 'user', content: prompt }], temperature: 0.7 };
  }

  return fetch(url, { method: 'POST', headers, body: JSON.stringify(body) })
    .then(r => { if (!r.ok) return r.text().then(t => { throw new Error(`HTTP ${r.status}: ${t}`); }); return r.json(); })
    .then(data => {
      let text = '';
      if (data.choices?.[0]?.message?.content) text = data.choices[0].message.content;
      else if (data.candidates?.[0]?.content?.parts) text = data.candidates[0].content.parts.map(p => p.text).join('\n');
      else text = JSON.stringify(data);
      return text;
    });
}

export default function QuizModal({ plan, onClose, onSaveScores }) {
  const [phase, setPhase] = useState('idle'); // idle, loading, quiz, results
  const [questions, setQuestions] = useState([]);
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState({});
  const [showResult, setShowResult] = useState(false);
  const [error, setError] = useState(null);

  const generateQuiz = useCallback(async () => {
    setPhase('loading');
    setError(null);
    try {
      const taskList = plan.tasks ? plan.tasks.split(';').map(t => t.replace(/^\[.\]\s*/, '').trim()).filter(Boolean).join(', ') : plan.focus_area;
      const prompt = `Generate a quiz with exactly 5 multiple-choice questions to test knowledge on the following topic and tasks.

Topic: ${plan.focus_area}
Tasks: ${taskList}

Return ONLY a valid JSON array (no markdown, no code fences) with this exact structure:
[
  {
    "question": "...",
    "options": ["A) ...", "B) ...", "C) ...", "D) ..."],
    "correct": 0,
    "explanation": "Brief explanation of why this is correct"
  }
]

Make questions progressively harder. The "correct" field is the 0-based index of the correct option.`;

      const raw = await callAI(prompt);
      // Extract JSON from response (handle markdown code fences)
      let jsonStr = raw.trim();
      const match = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (match) jsonStr = match[1].trim();
      // Try to find array
      const arrMatch = jsonStr.match(/\[[\s\S]*\]/);
      if (arrMatch) jsonStr = arrMatch[0];

      const parsed = JSON.parse(jsonStr);
      if (!Array.isArray(parsed) || parsed.length === 0) throw new Error('Invalid quiz format');
      setQuestions(parsed);
      setCurrentQ(0);
      setAnswers({});
      setShowResult(false);
      setPhase('quiz');
    } catch (e) {
      setError('Failed to generate quiz: ' + e.message);
      setPhase('idle');
    }
  }, [plan]);

  const handleAnswer = (optionIndex) => {
    if (showResult) return;
    setAnswers(prev => ({ ...prev, [currentQ]: optionIndex }));
  };

  const handleSubmitAnswer = () => {
    setShowResult(true);
  };

  const handleNext = () => {
    setShowResult(false);
    if (currentQ < questions.length - 1) {
      setCurrentQ(currentQ + 1);
    } else {
      // Calculate results
      setPhase('results');
    }
  };

  const score = questions.reduce((acc, q, i) => acc + (answers[i] === q.correct ? 1 : 0), 0);
  const scorePct = questions.length > 0 ? Math.round((score / questions.length) * 100) : 0;

  const handleSave = async () => {
    const scoreData = {
      date: new Date().toISOString(),
      score: scorePct,
      total: questions.length,
      correct: score,
      topic: plan.focus_area,
    };
    // Merge with existing scores
    let existingScores = [];
    if (plan.quiz_scores) {
      try { existingScores = JSON.parse(plan.quiz_scores); } catch (e) {}
    }
    existingScores.push(scoreData);
    await updateDailyPlan(plan.id, { ...plan, quiz_scores: JSON.stringify(existingScores), ai_quiz: JSON.stringify(questions) });

    // Feature 7: Cross-Feature Linking - Auto add wrong answers to Question Bank
    const wrongAnswers = questions.filter((q, i) => answers[i] !== q.correct);
    for (const wq of wrongAnswers) {
      try {
        await createQuestion({
          topic: plan.focus_area,
          question: wq.question,
          difficulty: 'Medium',
          answer: `Correct Answer: ${wq.options[wq.correct]}\n\nExplanation: ${wq.explanation || 'No explanation provided.'}`,
          confidence: 1, // Start low since they got it wrong
          last_revised: new Date().toISOString().split('T')[0]
        });
      } catch (e) {
        console.error('Failed to auto-add wrong answer to question bank', e);
      }
    }

    if (onSaveScores) onSaveScores();
    onClose();
  };

  const q = questions[currentQ];
  const progressPct = questions.length > 0 ? ((currentQ + (showResult ? 1 : 0)) / questions.length) * 100 : 0;

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={e => e.stopPropagation()}>
        <div style={styles.header}>
          <div style={styles.title}>🧪 AI Quiz — {plan.focus_area}</div>
          <button style={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        {phase === 'idle' && (
          <div style={{ textAlign: 'center', padding: '2rem 0' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🧠</div>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '1rem', lineHeight: 1.7 }}>
              AI will generate <strong>5 multiple-choice questions</strong> based on<br />
              <span style={{ color: 'var(--accent)', fontWeight: 700 }}>{plan.focus_area}</span><br />
              to test your understanding. Ready?
            </p>
            <button className="btn btn-primary" style={{ padding: '0.75rem 2rem', fontSize: '1rem' }} onClick={generateQuiz}>
              ⚡ Generate Quiz
            </button>
            {error && <div style={{ color: 'var(--danger)', marginTop: '1rem', fontSize: '0.9rem' }}>{error}</div>}
          </div>
        )}

        {phase === 'loading' && (
          <div style={{ textAlign: 'center', padding: '3rem 0' }}>
            <div style={{ fontSize: '2.5rem', animation: 'pulse 1.5s infinite', marginBottom: '1rem' }}>🤖</div>
            <div style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Generating quiz questions...</div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.5rem' }}>This may take a few seconds</div>
          </div>
        )}

        {phase === 'quiz' && q && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)' }}>
              <span>Question {currentQ + 1} of {questions.length}</span>
              <span>{score}/{currentQ + (showResult ? 1 : 0)} correct</span>
            </div>
            <div style={styles.progressBar}><div style={styles.progressFill(progressPct)} /></div>

            <div style={styles.questionCard}>
              <div style={styles.questionNum}>Question {currentQ + 1}</div>
              <div style={styles.questionText}>{q.question}</div>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              {q.options.map((opt, i) => (
                <button key={i} style={styles.optionBtn(answers[currentQ] === i, i === q.correct, showResult)}
                  onClick={() => handleAnswer(i)} disabled={showResult}>
                  {opt}
                </button>
              ))}
            </div>

            {showResult && q.explanation && (
              <div style={styles.explanation}>
                <strong>💡 Explanation:</strong> {q.explanation}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
              {!showResult ? (
                <button className="btn btn-primary" disabled={answers[currentQ] === undefined} onClick={handleSubmitAnswer}>
                  Check Answer
                </button>
              ) : (
                <button className="btn btn-primary" onClick={handleNext}>
                  {currentQ < questions.length - 1 ? 'Next Question →' : '📊 See Results'}
                </button>
              )}
            </div>
          </div>
        )}

        {phase === 'results' && (
          <div style={{ textAlign: 'center' }}>
            <div style={styles.scoreCircle(scorePct)}>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: scorePct >= 80 ? 'var(--success)' : scorePct >= 50 ? 'var(--warning)' : 'var(--danger)' }}>
                {scorePct}%
              </div>
              <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Score</div>
            </div>
            <div style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.25rem' }}>
              {scorePct >= 80 ? '🎉 Excellent!' : scorePct >= 50 ? '👍 Good effort!' : '📚 Keep studying!'}
            </div>
            <div style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
              You got <strong>{score}</strong> out of <strong>{questions.length}</strong> questions correct
            </div>

            {/* Per-question breakdown */}
            <div style={{ textAlign: 'left', marginBottom: '1.5rem' }}>
              {questions.map((qq, i) => (
                <div key={i} style={{ padding: '0.75rem 1rem', borderRadius: 'var(--radius-sm)', marginBottom: '0.5rem',
                  background: answers[i] === qq.correct ? 'var(--success-bg)' : 'var(--danger-bg)',
                  border: `1px solid ${answers[i] === qq.correct ? 'var(--success)' : 'var(--danger)'}`,
                }}>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <span>{answers[i] === qq.correct ? '✅' : '❌'}</span>
                    <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{qq.question}</span>
                  </div>
                  {answers[i] !== qq.correct && (
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.35rem', paddingLeft: '1.5rem' }}>
                      Correct: {qq.options[qq.correct]}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
              <button className="btn btn-ghost" onClick={() => { setPhase('idle'); setQuestions([]); setAnswers({}); }}>🔄 Retake</button>
              <button className="btn btn-primary" onClick={handleSave}>💾 Save Score & Close</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
