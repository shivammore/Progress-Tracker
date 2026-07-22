import React, { useState, useEffect, useCallback, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import callAI from '../api/aiApi';
import { fetchStudyLogs } from '../api/studyLogApi';
import { createQuestion } from '../api/questionBankApi';

const TRENDING_TOPICS = [
  "AI Agents & Tool Use", "WebAssembly (WASM)", "Edge Computing",
  "Rust for Backend", "Vector Databases", "LLM Fine-Tuning",
  "Zero Trust Security", "Serverless at Scale", "Bun.js Runtime",
  "htmx & Hypermedia", "Kubernetes Operators", "OpenTelemetry"
];

const STYLE_TAG_ID = 'tech-snacks-animations';

function injectStyles() {
  if (document.getElementById(STYLE_TAG_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_TAG_ID;
  style.textContent = `
    @keyframes ts-fadeSlideIn {
      from { opacity: 0; transform: translateY(18px) scale(0.97); }
      to   { opacity: 1; transform: translateY(0) scale(1); }
    }
    @keyframes ts-shimmer {
      0%   { background-position: -200% 0; }
      100% { background-position: 200% 0; }
    }
    @keyframes ts-popIn {
      0%   { transform: scale(0.7); opacity: 0; }
      60%  { transform: scale(1.08); opacity: 1; }
      100% { transform: scale(1); }
    }
    @keyframes ts-savedPulse {
      0%   { box-shadow: 0 0 0 0 rgba(16,185,129,0.5); }
      70%  { box-shadow: 0 0 0 12px rgba(16,185,129,0); }
      100% { box-shadow: 0 0 0 0 rgba(16,185,129,0); }
    }
    @keyframes ts-gradientShift {
      0%   { background-position: 0% 50%; }
      50%  { background-position: 100% 50%; }
      100% { background-position: 0% 50%; }
    }
    @keyframes ts-dotPulse {
      0%, 80%, 100% { transform: scale(0.6); opacity: 0.3; }
      40% { transform: scale(1); opacity: 1; }
    }
    .ts-pill {
      padding: 0.35rem 0.85rem;
      border-radius: 999px;
      border: 1px solid var(--border);
      background: var(--bg-main);
      color: var(--text-secondary);
      cursor: pointer;
      font-size: 0.78rem;
      font-weight: 600;
      transition: all 0.25s ease;
      white-space: nowrap;
    }
    .ts-pill:hover {
      border-color: var(--accent);
      color: var(--accent);
      transform: translateY(-1px);
    }
    .ts-pill.active {
      background: var(--accent);
      color: white;
      border-color: var(--accent);
      box-shadow: 0 2px 12px rgba(99,102,241,0.35);
    }
    .ts-save-btn {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      padding: 0.35rem 0.75rem;
      border-radius: 999px;
      border: 1px solid var(--border);
      background: var(--bg-main);
      color: var(--text-secondary);
      cursor: pointer;
      font-size: 0.78rem;
      font-weight: 600;
      transition: all 0.3s ease;
    }
    .ts-save-btn:hover {
      border-color: var(--success, #10b981);
      color: var(--success, #10b981);
      background: rgba(16,185,129,0.08);
      transform: translateY(-1px);
    }
    .ts-save-btn.saved {
      border-color: var(--success, #10b981);
      color: var(--success, #10b981);
      animation: ts-savedPulse 0.6s ease;
    }
    .ts-topic-tag {
      display: inline-block;
      padding: 0.15rem 0.5rem;
      border-radius: 999px;
      font-size: 0.68rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
  `;
  document.head.appendChild(style);
}

export default function TechSnacks() {
  const [snack, setSnack] = useState(null);
  const [snackTitle, setSnackTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [filter, setFilter] = useState('all'); // 'all' | 'my' | 'trending'
  const [myTopics, setMyTopics] = useState([]);
  const [currentCategory, setCurrentCategory] = useState('trending');
  const [animKey, setAnimKey] = useState(0);
  const [snackHistory, setSnackHistory] = useState(() => {
    try { return JSON.parse(localStorage.getItem('TECH_SNACK_HISTORY') || '[]'); } catch { return []; }
  });
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => { injectStyles(); }, []);

  // Fetch user study logs on mount to extract topics
  useEffect(() => {
    (async () => {
      try {
        const res = await fetchStudyLogs();
        const logs = res.data || [];
        // Extract unique topics + subtopics, prioritize low-confidence ones
        const topicMap = {};
        logs.forEach(log => {
          const key = log.subtopic ? `${log.topic}: ${log.subtopic}` : log.topic;
          if (key) {
            if (!topicMap[key]) topicMap[key] = { name: key, confidence: log.confidence ?? 5 };
            else topicMap[key].confidence = Math.min(topicMap[key].confidence, log.confidence ?? 5);
          }
        });
        // Sort by lowest confidence first
        const sorted = Object.values(topicMap).sort((a, b) => a.confidence - b.confidence);
        setMyTopics(sorted.map(t => t.name));
      } catch (err) {
        console.warn('Could not fetch study logs for personalization:', err);
        setMyTopics([]);
      }
    })();
  }, []);

  // Build the combined topic list: 70% user low-confidence, 30% trending
  const topicPool = useMemo(() => {
    if (filter === 'my') return myTopics.length > 0 ? myTopics : TRENDING_TOPICS;
    if (filter === 'trending') return TRENDING_TOPICS;
    // 'all' — weighted mix
    if (myTopics.length === 0) return TRENDING_TOPICS;
    const myCount = Math.max(1, Math.ceil(myTopics.length * 0.7));
    const trendCount = Math.max(1, Math.ceil(TRENDING_TOPICS.length * 0.3));
    const mySlice = myTopics.slice(0, myCount);
    const trendSlice = TRENDING_TOPICS.slice(0, trendCount);
    return [...mySlice, ...trendSlice];
  }, [filter, myTopics]);

  const generateSnack = useCallback(async () => {
    setLoading(true);
    setSaved(false);
    const pool = topicPool.length > 0 ? topicPool : TRENDING_TOPICS;
    const randomTopic = pool[Math.floor(Math.random() * pool.length)];
    const isMyTopic = myTopics.includes(randomTopic);
    setCurrentCategory(isMyTopic ? 'my' : 'trending');

    const prompt = `Generate a very brief, high-impact "Tech Snack" (microlearning byte) about: "${randomTopic}".
Format it with:
1. A catchy title with an emoji.
2. A 2-3 sentence 'TL;DR' or ELI5.
3. 2 key bullet points on 'Why it matters'.
Keep the total output under 150 words.`;

    try {
      const result = await callAI(prompt);
      setSnack(result);
      // Extract title from first line
      const firstLine = result.split('\n').find(l => l.trim().length > 0) || '';
      const title = firstLine.replace(/^#+\s*/, '').replace(/\*+/g, '').trim();
      setSnackTitle(title);
      setAnimKey(k => k + 1);
      // Cache to history
      const entry = { title, content: result, category: isMyTopic ? 'my' : 'trending', date: new Date().toISOString() };
      setSnackHistory(prev => {
        const updated = [entry, ...prev].slice(0, 20);
        localStorage.setItem('TECH_SNACK_HISTORY', JSON.stringify(updated));
        return updated;
      });
    } catch (err) {
      console.error(err);
      setSnack("Failed to load Tech Snack. Take a break! ☕");
      setSnackTitle('');
    } finally {
      setLoading(false);
    }
  }, [topicPool, myTopics]);

  useEffect(() => {
    generateSnack();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSaveSnack = async () => {
    if (!snack || saving || saved) return;
    setSaving(true);
    try {
      await createQuestion({
        topic: 'Tech Snack',
        question: snackTitle || 'Tech Snack',
        answer: snack,
        difficulty: 'Easy',
        confidence: 0,
      });
      setSaved(true);
    } catch (err) {
      console.error('Failed to save snack:', err);
      alert('Failed to save snack to Question Bank.');
    } finally {
      setSaving(false);
    }
  };

  const categoryColors = {
    my: { bg: 'rgba(99,102,241,0.12)', color: 'var(--accent)', label: 'My Topic' },
    trending: { bg: 'rgba(245,158,11,0.12)', color: '#f59e0b', label: 'Trending' },
  };

  const catStyle = categoryColors[currentCategory] || categoryColors.trending;

  return (
    <div className="section-card" style={{
      marginBottom: '1.5rem',
      background: 'linear-gradient(135deg, var(--bg-card) 0%, rgba(99,102,241,0.04) 50%, var(--bg-main) 100%)',
      backgroundSize: '200% 200%',
      animation: 'ts-gradientShift 8s ease infinite',
      border: '1px solid var(--border)',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Decorative background emoji */}
      <div style={{ position: 'absolute', top: '-1.5rem', right: '-1.5rem', fontSize: '7rem', opacity: 0.04, transform: 'rotate(15deg)', pointerEvents: 'none' }}>🍿</div>
      <div style={{ position: 'absolute', bottom: '-2rem', left: '-1rem', fontSize: '4rem', opacity: 0.03, transform: 'rotate(-20deg)', pointerEvents: 'none' }}>✨</div>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
        <h3 style={{ fontSize: '1.1rem', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent)' }}>
          🍿 Personalized Tech Snack
        </h3>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          {!loading && snack && (
            <button
              className={`ts-save-btn${saved ? ' saved' : ''}`}
              onClick={handleSaveSnack}
              disabled={saving || saved}
            >
              {saved ? '✅ Saved' : saving ? '⏳ Saving...' : '📌 Save Snack'}
            </button>
          )}
          <button className="btn btn-ghost" onClick={generateSnack} disabled={loading} style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem' }}>
            {loading ? 'Popping...' : 'Next Snack'}
          </button>
          <button className="btn btn-ghost" onClick={() => setShowHistory(!showHistory)} style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem' }}>
            {showHistory ? 'Hide History' : 'History (' + snackHistory.length + ')'}
          </button>
        </div>
      </div>

      {/* Filter pills */}
      <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        {[
          { key: 'all', label: '✨ All', count: null },
          { key: 'my', label: '📚 My Topics', count: myTopics.length },
          { key: 'trending', label: '🔥 Trending', count: TRENDING_TOPICS.length },
        ].map(f => (
          <button
            key={f.key}
            className={`ts-pill${filter === f.key ? ' active' : ''}`}
            onClick={() => setFilter(f.key)}
          >
            {f.label}{f.count !== null ? ` (${f.count})` : ''}
          </button>
        ))}
      </div>

      {/* Snack content */}
      <div style={{ minHeight: '130px', position: 'relative' }}>
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '130px', gap: '6px' }}>
            {[0, 1, 2].map(i => (
              <div key={i} style={{
                width: '10px', height: '10px', borderRadius: '50%',
                background: 'var(--accent)',
                animation: `ts-dotPulse 1.2s ease-in-out ${i * 0.15}s infinite`,
              }} />
            ))}
          </div>
        ) : (
          <div key={animKey} style={{ animation: 'ts-fadeSlideIn 0.5s ease-out' }}>
            {/* Category tag */}
            {!loading && snack && (
              <div style={{ marginBottom: '0.6rem' }}>
                <span className="ts-topic-tag" style={{ background: catStyle.bg, color: catStyle.color }}>
                  {catStyle.label}
                </span>
              </div>
            )}
            <div className="markdown-body" style={{ fontSize: '0.9rem', lineHeight: 1.6 }}>
              <ReactMarkdown>{snack}</ReactMarkdown>
            </div>
          </div>
        )}
      </div>

      {/* Snack History */}
      {showHistory && snackHistory.length > 0 && (
        <div style={{ marginTop: '1rem', borderTop: '1px solid var(--border)', paddingTop: '1rem', maxHeight: '300px', overflowY: 'auto' }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Past Snacks</div>
          {snackHistory.map((h, i) => (
            <div key={i} onClick={() => { setSnack(h.content); setSnackTitle(h.title); setCurrentCategory(h.category || 'trending'); setAnimKey(k => k + 1); setShowHistory(false); }}
              style={{ padding: '0.5rem 0.75rem', borderBottom: '1px solid var(--border)', cursor: 'pointer', transition: 'background 0.2s' }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-main)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>{h.title || 'Untitled'}</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{new Date(h.date).toLocaleDateString()}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
