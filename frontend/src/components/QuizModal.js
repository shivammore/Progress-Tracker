import React, { useState, useCallback } from 'react';
import { updateDailyPlan } from '../api/dailyPlanApi';
import { createQuestion } from '../api/questionBankApi';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const animationStyles = `
@keyframes quizFadeIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes quizSlideUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
@keyframes quizPulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.05); } }
@keyframes quizSpin { to { transform: rotate(360deg); } }
@keyframes quizConfetti {
  0% { transform: translateY(0) rotate(0deg); opacity: 1; }
  100% { transform: translateY(-60px) rotate(360deg); opacity: 0; }
}
@keyframes quizShimmer {
  0% { background-position: -200% center; }
  100% { background-position: 200% center; }
}
@keyframes quizBounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-6px); }
}
`;

const styles = {
  overlay: {
    position: 'fixed', inset: 0, zIndex: 1000,
    background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    animation: 'quizFadeIn 0.3s ease',
  },
  modal: {
    background: 'var(--bg-card)', backdropFilter: 'blur(20px)',
    borderRadius: 'var(--radius-xl)', border: 'var(--glass-border)',
    width: '95%', maxWidth: '720px', maxHeight: '90vh', overflow: 'auto',
    boxShadow: '0 24px 48px rgba(0,0,0,0.2)', padding: '2rem',
    animation: 'quizSlideUp 0.4s ease',
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

function callAIExplain(prompt) {
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
    body = { model, messages: [{ role: 'system', content: 'You are an expert tutor. Provide clear, detailed explanations.' }, { role: 'user', content: prompt }], temperature: 0.5 };
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

// Load quiz history from localStorage
function loadQuizHistory() {
  try {
    const raw = localStorage.getItem('quiz_history');
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveQuizHistory(entry) {
  const history = loadQuizHistory();
  history.push(entry);
  // Keep last 50 entries max
  if (history.length > 50) history.splice(0, history.length - 50);
  localStorage.setItem('quiz_history', JSON.stringify(history));
}

export default function QuizModal({ plan, onClose, onSaveScores }) {
  const [phase, setPhase] = useState('settings'); // settings, loading, quiz, results
  const [questions, setQuestions] = useState([]);
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState({});
  const [showResult, setShowResult] = useState(false);
  const [error, setError] = useState(null);

  // New settings state
  const [difficulty, setDifficulty] = useState('Medium');
  const [questionCount, setQuestionCount] = useState(5);
  const [quizHistory] = useState(() => loadQuizHistory());
  const [isRetryMode, setIsRetryMode] = useState(false);

  // Explain More state: { [questionIndex]: { loading, text, error } }
  const [explanations, setExplanations] = useState({});

  const generateQuiz = useCallback(async (retryQuestions = null) => {
    setPhase('loading');
    setError(null);
    setExplanations({});

    if (retryQuestions) {
      // Retry mode: re-use the missed questions
      setQuestions(retryQuestions);
      setCurrentQ(0);
      setAnswers({});
      setShowResult(false);
      setIsRetryMode(true);
      setPhase('quiz');
      return;
    }

    try {
      const taskList = plan.tasks ? plan.tasks.split(';').map(t => t.replace(/^\[.\]\s*/, '').trim()).filter(Boolean).join(', ') : plan.focus_area;
      const difficultyGuide = {
        Easy: 'Make all questions simple and straightforward, testing basic recall and fundamental concepts.',
        Medium: 'Make questions progressively harder, mixing recall with application-level questions.',
        Hard: 'Make all questions challenging, testing deep understanding, edge cases, and ability to analyze and apply concepts in novel scenarios.',
      };
      const prompt = `Generate a quiz with exactly ${questionCount} multiple-choice questions to test knowledge on the following topic and tasks.

Topic: ${plan.focus_area}
Tasks: ${taskList}
Difficulty Level: ${difficulty}
${difficultyGuide[difficulty]}

Return ONLY a valid JSON array (no markdown, no code fences) with this exact structure:
[
  {
    "question": "...",
    "options": ["A) ...", "B) ...", "C) ...", "D) ..."],
    "correct": 0,
    "explanation": "Brief explanation of why this is correct"
  }
]

The "correct" field is the 0-based index of the correct option.`;

      const raw = await callAI(prompt);
      let jsonStr = raw.trim();
      const match = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (match) jsonStr = match[1].trim();
      const arrMatch = jsonStr.match(/\[[\s\S]*\]/);
      if (arrMatch) jsonStr = arrMatch[0];

      const parsed = JSON.parse(jsonStr);
      if (!Array.isArray(parsed) || parsed.length === 0) throw new Error('Invalid quiz format');
      setQuestions(parsed);
      setCurrentQ(0);
      setAnswers({});
      setShowResult(false);
      setIsRetryMode(false);
      setPhase('quiz');
    } catch (e) {
      setError('Failed to generate quiz: ' + e.message);
      setPhase('settings');
    }
  }, [plan, difficulty, questionCount]);

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
      setPhase('results');
    }
  };

  const score = questions.reduce((acc, q, i) => acc + (answers[i] === q.correct ? 1 : 0), 0);
  const scorePct = questions.length > 0 ? Math.round((score / questions.length) * 100) : 0;

  const missedQuestions = questions.filter((q, i) => answers[i] !== q.correct);

  const handleRetryMissed = () => {
    if (missedQuestions.length === 0) return;
    generateQuiz(missedQuestions);
  };

  const handleExplainMore = async (questionIndex) => {
    const qq = questions[questionIndex];
    setExplanations(prev => ({ ...prev, [questionIndex]: { loading: true, text: '', error: null } }));

    try {
      const prompt = `Please provide a detailed, thorough explanation for the following quiz question. Include:
1. Why the correct answer is correct
2. Why each wrong answer is incorrect
3. The underlying concept being tested
4. A real-world analogy or example if applicable

Question: ${qq.question}
Options: ${qq.options.join(' | ')}
Correct Answer: ${qq.options[qq.correct]}
Brief Explanation: ${qq.explanation || 'None provided'}

Provide a clear, educational explanation in markdown format.`;

      const text = await callAIExplain(prompt);
      setExplanations(prev => ({ ...prev, [questionIndex]: { loading: false, text, error: null } }));
    } catch (e) {
      setExplanations(prev => ({ ...prev, [questionIndex]: { loading: false, text: '', error: e.message } }));
    }
  };

  const handleSave = async () => {
    const scoreData = {
      date: new Date().toISOString(),
      score: scorePct,
      total: questions.length,
      correct: score,
      topic: plan.focus_area,
    };
    let existingScores = [];
    if (plan.quiz_scores) {
      try { existingScores = JSON.parse(plan.quiz_scores); } catch (e) {}
    }
    existingScores.push(scoreData);
    await updateDailyPlan(plan.id, { ...plan, quiz_scores: JSON.stringify(existingScores), ai_quiz: JSON.stringify(questions) });

    // Save to localStorage quiz_history
    saveQuizHistory({
      topic: plan.focus_area,
      score: score,
      total: questions.length,
      date: new Date().toISOString(),
      difficulty: difficulty,
    });

    // Auto add wrong answers to Question Bank
    const wrongAnswers = questions.filter((q, i) => answers[i] !== q.correct);
    for (const wq of wrongAnswers) {
      try {
        await createQuestion({
          topic: plan.focus_area,
          question: wq.question,
          difficulty: difficulty,
          answer: `Correct Answer: ${wq.options[wq.correct]}\n\nExplanation: ${wq.explanation || 'No explanation provided.'}`,
          confidence: 1,
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

  // Settings panel option components
  const difficultyOptions = ['Easy', 'Medium', 'Hard'];
  const countOptions = [5, 10, 15];
  const difficultyColors = { Easy: '#22c55e', Medium: '#f59e0b', Hard: '#ef4444' };
  const difficultyEmojis = { Easy: '🌱', Medium: '⚡', Hard: '🔥' };

  const recentHistory = quizHistory.slice(-5).reverse();

  return (
    <div style={styles.overlay} onClick={onClose}>
      <style>{animationStyles}</style>
      <div style={styles.modal} onClick={e => e.stopPropagation()}>
        <div style={styles.header}>
          <div style={styles.title}>🧪 AI Quiz — {plan.focus_area}</div>
          <button style={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        {/* ============ SETTINGS PHASE ============ */}
        {phase === 'settings' && (
          <div style={{ animation: 'quizSlideUp 0.4s ease' }}>
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <div style={{ fontSize: '3rem', marginBottom: '0.5rem', animation: 'quizBounce 2s ease infinite' }}>🧠</div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: 1.7 }}>
                Configure your quiz for <span style={{ color: 'var(--accent)', fontWeight: 700 }}>{plan.focus_area}</span>
              </p>
            </div>

            {/* Difficulty Selection */}
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{
                display: 'block', fontSize: '0.75rem', fontWeight: 800,
                textTransform: 'uppercase', letterSpacing: '0.1em',
                color: 'var(--text-muted)', marginBottom: '0.5rem',
              }}>Difficulty Level</label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {difficultyOptions.map(d => (
                  <button key={d} onClick={() => setDifficulty(d)} style={{
                    flex: 1, padding: '0.7rem 0.5rem', borderRadius: '10px',
                    border: difficulty === d ? `2px solid ${difficultyColors[d]}` : '2px solid var(--border)',
                    background: difficulty === d ? `${difficultyColors[d]}15` : 'var(--bg-main)',
                    color: difficulty === d ? difficultyColors[d] : 'var(--text-secondary)',
                    fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer',
                    transition: 'all 0.25s ease', fontFamily: 'inherit',
                    transform: difficulty === d ? 'scale(1.02)' : 'scale(1)',
                  }}>
                    <div style={{ fontSize: '1.2rem', marginBottom: '0.2rem' }}>{difficultyEmojis[d]}</div>
                    {d}
                  </button>
                ))}
              </div>
            </div>

            {/* Question Count Selection */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{
                display: 'block', fontSize: '0.75rem', fontWeight: 800,
                textTransform: 'uppercase', letterSpacing: '0.1em',
                color: 'var(--text-muted)', marginBottom: '0.5rem',
              }}>Number of Questions</label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {countOptions.map(c => (
                  <button key={c} onClick={() => setQuestionCount(c)} style={{
                    flex: 1, padding: '0.75rem', borderRadius: '10px',
                    border: questionCount === c ? '2px solid var(--accent)' : '2px solid var(--border)',
                    background: questionCount === c ? 'var(--accent-glow)' : 'var(--bg-main)',
                    color: questionCount === c ? 'var(--accent)' : 'var(--text-secondary)',
                    fontWeight: 800, fontSize: '1.1rem', cursor: 'pointer',
                    transition: 'all 0.25s ease', fontFamily: 'inherit',
                    transform: questionCount === c ? 'scale(1.02)' : 'scale(1)',
                  }}>
                    {c}
                  </button>
                ))}
              </div>
            </div>

            {/* Generate Button */}
            <button className="btn btn-primary" style={{
              width: '100%', padding: '0.85rem', fontSize: '1rem',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
              background: 'linear-gradient(135deg, #6366f1, #a855f7)',
              borderRadius: '12px', fontWeight: 700,
            }} onClick={() => generateQuiz()}>
              ⚡ Generate {questionCount} {difficulty} Questions
            </button>
            {error && <div style={{ color: 'var(--danger)', marginTop: '1rem', fontSize: '0.9rem', textAlign: 'center' }}>{error}</div>}

            {/* Past Quizzes Section */}
            {recentHistory.length > 0 && (
              <div style={{
                marginTop: '1.5rem', padding: '1rem',
                background: 'var(--bg-main)', borderRadius: '12px',
                border: '1px solid var(--border)',
              }}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '0.4rem',
                  fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase',
                  letterSpacing: '0.1em', color: 'var(--text-muted)', marginBottom: '0.75rem',
                }}>
                  📊 Past Quizzes
                </div>
                {recentHistory.map((h, i) => {
                  const pct = h.total > 0 ? Math.round((h.score / h.total) * 100) : 0;
                  const pctColor = pct >= 80 ? 'var(--success)' : pct >= 50 ? 'var(--warning)' : 'var(--danger)';
                  return (
                    <div key={i} style={{
                      display: 'flex', alignItems: 'center', gap: '0.6rem',
                      padding: '0.5rem 0.6rem', borderRadius: '8px',
                      marginBottom: i < recentHistory.length - 1 ? '0.35rem' : 0,
                      background: 'var(--bg-card)', border: '1px solid var(--border)',
                      animation: `quizSlideUp 0.3s ease ${i * 0.05}s both`,
                    }}>
                      <div style={{
                        width: '32px', height: '32px', borderRadius: '50%',
                        border: `2.5px solid ${pctColor}`, display: 'flex',
                        alignItems: 'center', justifyContent: 'center',
                        fontSize: '0.6rem', fontWeight: 800, color: pctColor, flexShrink: 0,
                      }}>{pct}%</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)',
                          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                        }}>{h.topic}</div>
                        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                          {h.score}/{h.total} • {h.difficulty || 'Medium'} • {new Date(h.date).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ============ LOADING PHASE ============ */}
        {phase === 'loading' && (
          <div style={{ textAlign: 'center', padding: '3rem 0' }}>
            <div style={{ fontSize: '2.5rem', animation: 'quizPulse 1.5s infinite', marginBottom: '1rem' }}>🤖</div>
            <div style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Generating {questionCount} {difficulty.toLowerCase()} questions...</div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.5rem' }}>This may take a few seconds</div>
            {/* Animated progress bar */}
            <div style={{
              width: '200px', height: '4px', background: 'var(--bg-main)',
              borderRadius: '2px', margin: '1.25rem auto 0', overflow: 'hidden',
            }}>
              <div style={{
                width: '40%', height: '100%', borderRadius: '2px',
                background: 'linear-gradient(90deg, #6366f1, #a855f7, #6366f1)',
                backgroundSize: '200% 100%',
                animation: 'quizShimmer 1.5s linear infinite',
              }} />
            </div>
          </div>
        )}

        {/* ============ QUIZ PHASE ============ */}
        {phase === 'quiz' && q && (
          <div style={{ animation: 'quizSlideUp 0.3s ease' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)' }}>
              <span>Question {currentQ + 1} of {questions.length}{isRetryMode ? ' (Retry)' : ''}</span>
              <span>{score}/{currentQ + (showResult ? 1 : 0)} correct</span>
            </div>
            <div style={styles.progressBar}><div style={styles.progressFill(progressPct)} /></div>

            {/* Difficulty badge */}
            <div style={{ marginBottom: '0.75rem' }}>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
                padding: '0.2rem 0.6rem', borderRadius: '6px', fontSize: '0.7rem',
                fontWeight: 700, background: `${difficultyColors[difficulty]}18`,
                color: difficultyColors[difficulty], border: `1px solid ${difficultyColors[difficulty]}30`,
              }}>
                {difficultyEmojis[difficulty]} {difficulty}
              </span>
            </div>

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

        {/* ============ RESULTS PHASE ============ */}
        {phase === 'results' && (
          <div style={{ textAlign: 'center', animation: 'quizSlideUp 0.4s ease' }}>
            {/* Confetti effect for high scores */}
            {scorePct >= 80 && (
              <div style={{ position: 'relative', height: '0', overflow: 'visible' }}>
                {['🎉', '⭐', '🎊', '✨', '🏆'].map((emoji, i) => (
                  <span key={i} style={{
                    position: 'absolute', fontSize: '1.2rem',
                    left: `${15 + i * 17}%`, top: '-10px',
                    animation: `quizConfetti 1.5s ease ${i * 0.2}s forwards`,
                  }}>{emoji}</span>
                ))}
              </div>
            )}

            <div style={styles.scoreCircle(scorePct)}>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: scorePct >= 80 ? 'var(--success)' : scorePct >= 50 ? 'var(--warning)' : 'var(--danger)' }}>
                {scorePct}%
              </div>
              <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Score</div>
            </div>

            {/* Difficulty + count badge */}
            <div style={{ marginBottom: '0.5rem' }}>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
                padding: '0.25rem 0.75rem', borderRadius: '8px', fontSize: '0.75rem',
                fontWeight: 700, background: `${difficultyColors[difficulty]}12`,
                color: difficultyColors[difficulty],
              }}>
                {difficultyEmojis[difficulty]} {difficulty} • {questions.length} questions
              </span>
            </div>

            <div style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.25rem' }}>
              {scorePct >= 80 ? '🎉 Excellent!' : scorePct >= 50 ? '👍 Good effort!' : '📚 Keep studying!'}
            </div>
            <div style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
              You got <strong>{score}</strong> out of <strong>{questions.length}</strong> questions correct
              {isRetryMode && <span style={{ color: 'var(--accent)', fontWeight: 600 }}> (Retry Mode)</span>}
            </div>

            {/* Per-question breakdown with Explain More */}
            <div style={{ textAlign: 'left', marginBottom: '1.5rem' }}>
              {questions.map((qq, i) => {
                const isCorrect = answers[i] === qq.correct;
                const explState = explanations[i];
                return (
                  <div key={i} style={{
                    marginBottom: '0.6rem', borderRadius: 'var(--radius-sm)',
                    overflow: 'hidden', border: `1px solid ${isCorrect ? 'var(--success)' : 'var(--danger)'}`,
                    animation: `quizSlideUp 0.3s ease ${i * 0.05}s both`,
                  }}>
                    <div style={{
                      padding: '0.75rem 1rem',
                      background: isCorrect ? 'var(--success-bg)' : 'var(--danger-bg)',
                    }}>
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                        <span>{isCorrect ? '✅' : '❌'}</span>
                        <div style={{ flex: 1 }}>
                          <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{qq.question}</span>
                          {!isCorrect && (
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
                              Correct: {qq.options[qq.correct]}
                            </div>
                          )}
                        </div>
                        {/* Explain More button */}
                        {!explState?.text && (
                          <button
                            onClick={() => handleExplainMore(i)}
                            disabled={explState?.loading}
                            style={{
                              background: 'var(--bg-card)', border: '1px solid var(--border)',
                              borderRadius: '6px', padding: '0.3rem 0.6rem',
                              fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer',
                              color: 'var(--accent)', whiteSpace: 'nowrap',
                              transition: 'all 0.2s', fontFamily: 'inherit',
                              display: 'flex', alignItems: 'center', gap: '0.25rem',
                              opacity: explState?.loading ? 0.6 : 1,
                            }}
                          >
                            {explState?.loading ? (
                              <>
                                <span style={{
                                  display: 'inline-block', width: '10px', height: '10px',
                                  border: '2px solid var(--accent)', borderTopColor: 'transparent',
                                  borderRadius: '50%', animation: 'quizSpin 0.8s linear infinite',
                                }} /> Loading...
                              </>
                            ) : '💡 Explain'}
                          </button>
                        )}
                      </div>
                    </div>
                    {/* Inline deep explanation */}
                    {explState?.text && (
                      <div style={{
                        padding: '0.75rem 1rem', background: 'var(--bg-main)',
                        borderTop: '1px solid var(--border)',
                        fontSize: '0.85rem', lineHeight: 1.7, color: 'var(--text-secondary)',
                        animation: 'quizSlideUp 0.3s ease',
                      }}>
                        <div style={{
                          display: 'flex', alignItems: 'center', gap: '0.4rem',
                          fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase',
                          letterSpacing: '0.08em', color: 'var(--accent)', marginBottom: '0.5rem',
                        }}>💡 Deep Explanation</div>
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{explState.text}</ReactMarkdown>
                      </div>
                    )}
                    {explState?.error && (
                      <div style={{
                        padding: '0.5rem 1rem', background: 'var(--danger-bg)',
                        fontSize: '0.8rem', color: 'var(--danger)',
                      }}>
                        Error: {explState.error}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Action buttons */}
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              {missedQuestions.length > 0 && (
                <button className="btn btn-ghost" onClick={handleRetryMissed} style={{
                  display: 'flex', alignItems: 'center', gap: '0.35rem',
                  border: '1px solid var(--danger)', color: 'var(--danger)',
                }}>
                  🔄 Retry Missed ({missedQuestions.length})
                </button>
              )}
              <button className="btn btn-ghost" onClick={() => { setPhase('settings'); setQuestions([]); setAnswers({}); setExplanations({}); }}>
                ⚙️ New Quiz
              </button>
              <button className="btn btn-primary" onClick={handleSave}>💾 Save Score & Close</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
