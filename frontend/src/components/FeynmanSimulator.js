import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import callAI from '../api/aiApi';

const HISTORY_KEY = 'feynman_history';
const STYLE_TAG_ID = 'feynman-sim-animations';

function injectStyles() {
  if (document.getElementById(STYLE_TAG_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_TAG_ID;
  style.textContent = `
    @keyframes fc-pulse {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.15); }
    }
    @keyframes fm-slideIn {
      from { opacity: 0; transform: translateX(30px); }
      to   { opacity: 1; transform: translateX(0); }
    }
    @keyframes fm-slideOut {
      from { opacity: 1; transform: translateX(0); }
      to   { opacity: 0; transform: translateX(30px); }
    }
    @keyframes fm-fadeUp {
      from { opacity: 0; transform: translateY(12px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    @keyframes fm-scorePop {
      0%   { transform: scale(0); opacity: 0; }
      60%  { transform: scale(1.15); }
      100% { transform: scale(1); opacity: 1; }
    }
    @keyframes fm-shimmer {
      0%   { background-position: -200% 0; }
      100% { background-position: 200% 0; }
    }
    @keyframes fm-dotGrow {
      from { transform: scale(0); }
      to   { transform: scale(1); }
    }
    .fm-history-item {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 0.85rem 1rem;
      background: var(--bg-main);
      border-radius: var(--radius-md, 8px);
      border: 1px solid var(--border);
      transition: all 0.25s ease;
      cursor: default;
    }
    .fm-history-item:hover {
      border-color: var(--accent);
      transform: translateY(-1px);
      box-shadow: 0 4px 16px rgba(0,0,0,0.1);
    }
    .fm-score-badge {
      min-width: 48px;
      height: 48px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 800;
      font-size: 0.85rem;
      flex-shrink: 0;
      animation: fm-scorePop 0.4s ease;
    }
    .fm-tab-btn {
      padding: 0.4rem 0.9rem;
      border-radius: 999px;
      border: 1px solid var(--border);
      background: transparent;
      color: var(--text-secondary);
      cursor: pointer;
      font-size: 0.8rem;
      font-weight: 600;
      transition: all 0.25s ease;
    }
    .fm-tab-btn:hover {
      border-color: var(--accent);
      color: var(--accent);
    }
    .fm-tab-btn.active {
      background: var(--accent);
      color: white;
      border-color: var(--accent);
      box-shadow: 0 2px 10px rgba(99,102,241,0.3);
    }
    .fm-sparkline-dot {
      width: 7px; height: 7px;
      border-radius: 50%;
      display: inline-block;
      transition: all 0.2s;
    }
  `;
  document.head.appendChild(style);
}

function getScoreColor(score) {
  if (score >= 75) return { bg: 'rgba(16,185,129,0.15)', color: '#10b981' };
  if (score >= 50) return { bg: 'rgba(245,158,11,0.15)', color: '#f59e0b' };
  return { bg: 'rgba(239,68,68,0.15)', color: '#ef4444' };
}

function loadHistory() {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
  } catch { return []; }
}

function saveHistory(history) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
}

function SparklineDots({ scores }) {
  if (!scores || scores.length < 2) return null;
  const last6 = scores.slice(-6);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '3px', marginTop: '4px' }} title={`Trend: ${last6.join(' → ')}`}>
      {last6.map((s, i) => {
        const c = getScoreColor(s);
        return (
          <div key={i} className="fm-sparkline-dot" style={{
            background: c.color,
            opacity: 0.4 + (i / last6.length) * 0.6,
            animation: `fm-dotGrow 0.3s ease ${i * 0.06}s both`,
          }} />
        );
      })}
      {last6.length >= 2 && (
        <span style={{ fontSize: '0.65rem', color: last6[last6.length-1] >= last6[last6.length-2] ? '#10b981' : '#ef4444', marginLeft: '3px', fontWeight: 700 }}>
          {last6[last6.length-1] >= last6[last6.length-2] ? '↑' : '↓'}
        </span>
      )}
    </div>
  );
}

export default function FeynmanSimulator({ concept, onClose }) {
  const [phase, setPhase] = useState('input'); // input, evaluating, results
  const [topic, setTopic] = useState(concept || '');
  const [explanation, setExplanation] = useState('');
  const [feedback, setFeedback] = useState(null);
  const [isListening, setIsListening] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState(loadHistory);
  const recognitionRef = useRef(null);

  useEffect(() => { injectStyles(); }, []);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) finalTranscript += event.results[i][0].transcript + ' ';
        }
        if (finalTranscript) {
          setExplanation(prev => prev + finalTranscript);
        }
      };

      recognition.onend = () => setIsListening(false);
      recognitionRef.current = recognition;
    }
    return () => {
      if (recognitionRef.current) recognitionRef.current.stop();
    };
  }, []);

  const toggleListen = () => {
    if (!recognitionRef.current) return alert("Speech recognition not supported in this browser.");
    if (isListening) {
      recognitionRef.current.stop();
    } else {
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  const saveToHistory = useCallback((topicName, result) => {
    const entry = {
      topic: topicName,
      score: result.score ?? 0,
      simplicity: result.simplicityFeedback || '',
      accuracy: result.accuracyFeedback || '',
      completeness: (result.missingGaps || []).join('; '),
      date: new Date().toISOString(),
      feedback: result.overallSummary || '',
    };
    setHistory(prev => {
      const updated = [...prev, entry];
      saveHistory(updated);
      return updated;
    });
  }, []);

  const handleSubmit = async () => {
    if (!topic.trim() || !explanation.trim()) return alert("Please enter both a topic and an explanation.");
    if (isListening && recognitionRef.current) recognitionRef.current.stop();

    setPhase('evaluating');

    const prompt = `You are a strict but encouraging teacher evaluating a student using the Feynman Technique.
The student is trying to explain the concept of: "${topic}".
Here is their explanation:
"${explanation}"

Evaluate their explanation based on:
1. Simplicity (Did they use jargon without explaining it? Could a 12-year-old understand it?)
2. Accuracy (Are there any factual errors?)
3. Missing Gaps (What critical parts of the concept did they leave out?)

Provide a JSON response strictly in this format:
{
  "score": 85,
  "simplicityFeedback": "...",
  "accuracyFeedback": "...",
  "missingGaps": ["gap 1", "gap 2"],
  "overallSummary": "..."
}`;

    try {
      const responseText = await callAI(prompt);
      let jsonStr = responseText.trim();
      const match = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (match) jsonStr = match[1].trim();
      const result = JSON.parse(jsonStr);
      setFeedback(result);
      setPhase('results');
      saveToHistory(topic, result);
    } catch (err) {
      console.error(err);
      alert("Failed to evaluate: " + err.message);
      setPhase('input');
    }
  };

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem(HISTORY_KEY);
  };

  // Group history by topic for sparkline dots
  const topicScores = useMemo(() => {
    const map = {};
    history.forEach(h => {
      if (!map[h.topic]) map[h.topic] = [];
      map[h.topic].push(h.score);
    });
    return map;
  }, [history]);

  const styles = {
    overlay: {
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    },
    modal: {
      background: 'var(--bg-card)', padding: '2.5rem', borderRadius: 'var(--radius-xl)',
      width: '90%', maxWidth: '700px', maxHeight: '90vh', overflowY: 'auto',
      border: '1px solid var(--border)', boxShadow: '0 24px 48px rgba(0,0,0,0.2)',
    }
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '1.8rem' }}>🧠</span> Feynman Simulator
          </h2>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <button
              className={`fm-tab-btn${showHistory ? ' active' : ''}`}
              onClick={() => setShowHistory(h => !h)}
            >
              📊 History {history.length > 0 && `(${history.length})`}
            </button>
            <button onClick={onClose} style={{ background: 'transparent', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--text-secondary)' }}>✕</button>
          </div>
        </div>

        {/* History View */}
        {showHistory && (
          <div style={{
            animation: 'fm-slideIn 0.35s ease',
            marginBottom: '1.5rem',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0, fontSize: '1rem', color: 'var(--text-primary)' }}>📈 Attempt History</h3>
              {history.length > 0 && (
                <button className="btn btn-ghost" onClick={clearHistory} style={{ fontSize: '0.75rem', padding: '0.25rem 0.6rem', color: 'var(--danger, #ef4444)' }}>
                  🗑️ Clear History
                </button>
              )}
            </div>

            {history.length === 0 ? (
              <div style={{
                textAlign: 'center', padding: '2.5rem 1rem',
                background: 'var(--bg-main)', borderRadius: 'var(--radius-md, 8px)',
                border: '1px dashed var(--border)',
              }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>📭</div>
                <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.9rem' }}>
                  No history yet. Complete an evaluation to see your progress here!
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '340px', overflowY: 'auto', paddingRight: '4px' }}>
                {[...history].reverse().map((h, i) => {
                  const sc = getScoreColor(h.score);
                  const dateStr = new Date(h.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
                  const scores = topicScores[h.topic] || [];
                  return (
                    <div
                      key={i}
                      className="fm-history-item"
                      style={{ animation: `fm-fadeUp 0.3s ease ${i * 0.05}s both` }}
                    >
                      <div className="fm-score-badge" style={{ background: sc.bg, color: sc.color }}>
                        {h.score}%
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {h.topic}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                          {dateStr}
                        </div>
                        {scores.length >= 2 && <SparklineDots scores={scores} />}
                      </div>
                      {h.feedback && (
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', maxWidth: '180px', lineHeight: 1.4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={h.feedback}>
                          {h.feedback}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Divider */}
            <div style={{ height: '1px', background: 'var(--border)', margin: '1.2rem 0' }} />
          </div>
        )}

        {/* Input Phase */}
        {phase === 'input' && (
          <div>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', lineHeight: 1.6 }}>
              The best way to learn a concept is to explain it as simply as possible. Pick a topic and explain it out loud (or type it).
            </p>
            <div style={{ marginBottom: '1.5rem' }}>
              <label className="form-label">Concept to explain:</label>
              <input className="form-control" placeholder="e.g. Docker Containers, React Hooks..." value={topic} onChange={e => setTopic(e.target.value)} />
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                Your Explanation:
                <button
                  onClick={toggleListen}
                  style={{ background: isListening ? '#ef4444' : 'var(--bg-main)', color: isListening ? 'white' : 'var(--text-primary)', border: '1px solid var(--border)', borderRadius: '1rem', padding: '0.2rem 0.8rem', cursor: 'pointer', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                >
                  {isListening ? '🛑 Stop Recording' : '🎤 Use Microphone'}
                </button>
              </label>
              <textarea
                className="form-control"
                rows="8"
                placeholder="Start explaining here..."
                value={explanation}
                onChange={e => setExplanation(e.target.value)}
                style={{ fontSize: '1.05rem', lineHeight: 1.6 }}
              />
            </div>

            <button className="btn btn-primary" style={{ width: '100%', fontSize: '1.1rem', padding: '1rem' }} onClick={handleSubmit}>
              ✨ Evaluate My Explanation
            </button>
          </div>
        )}

        {/* Evaluating Phase */}
        {phase === 'evaluating' && (
          <div style={{ textAlign: 'center', padding: '3rem 0' }}>
            <div style={{ fontSize: '3rem', animation: 'fc-pulse 1.5s infinite' }}>🤔</div>
            <h3 style={{ marginTop: '1.5rem' }}>The AI is evaluating your explanation...</h3>
            <p style={{ color: 'var(--text-secondary)' }}>Checking for simplicity, accuracy, and gaps.</p>
          </div>
        )}

        {/* Results Phase */}
        {phase === 'results' && feedback && (
          <div style={{ animation: 'fm-fadeUp 0.4s ease' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1.5rem', marginBottom: '2rem', padding: '1.5rem', background: 'var(--bg-main)', borderRadius: 'var(--radius-lg)' }}>
              <div style={{
                fontSize: '3.5rem', fontWeight: 800,
                color: feedback.score >= 80 ? 'var(--success)' : feedback.score >= 60 ? 'var(--warning, #f59e0b)' : 'var(--danger)',
                animation: 'fm-scorePop 0.5s ease',
              }}>
                {feedback.score}%
              </div>
              <div>
                <h3 style={{ margin: '0 0 0.5rem 0' }}>Feynman Score</h3>
                <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
                  {feedback.score >= 90 ? "Mastery! You explained it perfectly." : feedback.score >= 70 ? "Good job, but there's room to simplify." : "Keep practicing! You have some gaps to fill."}
                </p>
              </div>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent)' }}>🧸 Simplicity</h4>
              <p style={{ background: 'rgba(99,102,241,0.1)', padding: '1rem', borderRadius: 'var(--radius-md)', margin: 0, lineHeight: 1.6 }}>{feedback.simplicityFeedback}</p>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#10b981' }}>🎯 Accuracy</h4>
              <p style={{ background: 'rgba(16,185,129,0.1)', padding: '1rem', borderRadius: 'var(--radius-md)', margin: 0, lineHeight: 1.6 }}>{feedback.accuracyFeedback}</p>
            </div>

            {feedback.missingGaps && feedback.missingGaps.length > 0 && (
              <div style={{ marginBottom: '1.5rem' }}>
                <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#f59e0b' }}>⚠️ Missing Gaps</h4>
                <ul style={{ background: 'rgba(245,158,11,0.1)', padding: '1rem 1rem 1rem 2.5rem', borderRadius: 'var(--radius-md)', margin: 0 }}>
                  {feedback.missingGaps.map((gap, i) => <li key={i} style={{ marginBottom: '0.5rem', lineHeight: 1.5 }}>{gap}</li>)}
                </ul>
              </div>
            )}

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button className="btn btn-secondary" style={{ flex: 1, padding: '1rem' }} onClick={() => { setPhase('input'); setExplanation(''); }}>
                Start Fresh
              </button>
              <button className="btn btn-primary" style={{ flex: 1, padding: '1rem' }} onClick={() => { setPhase('input'); }}>
                Retry (Keep Text)
              </button>
              <button className="btn btn-ghost" style={{ flex: 1, padding: '1rem', border: '1px solid var(--border)' }} onClick={() => {
                const text = 'Feynman Evaluation: ' + topic + '\nScore: ' + feedback.score + '%\n\nSimplicity: ' + feedback.simplicityFeedback + '\n\nAccuracy: ' + feedback.accuracyFeedback + '\n\nMissing Gaps: ' + (feedback.missingGaps || []).join(', ') + '\n\nSummary: ' + feedback.overallSummary;
                const blob = new Blob([text], { type: 'text/plain' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'Feynman_' + topic.replace(/ /g, '_') + '.txt';
                a.click();
                URL.revokeObjectURL(url);
              }}>
                Export
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
