import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { fetchStudyLogs } from '../api/studyLogApi';
import { fetchQuestions } from '../api/questionBankApi';

const STORAGE_KEY = 'daily_goals';
const QUIZ_HISTORY_KEY = 'quiz_history';

const DEFAULT_GOALS = { hoursTarget: 2, cardsTarget: 10, quizzesTarget: 1 };

function getToday() {
  return new Date().toISOString().slice(0, 10);
}

function loadGoals() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...DEFAULT_GOALS, ...JSON.parse(raw) };
  } catch {}
  return { ...DEFAULT_GOALS };
}

function saveGoals(goals) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(goals));
}

// Confetti keyframes + styles injected once
const CONFETTI_STYLE = `
@keyframes dgw-confetti-fall {
  0% { transform: translateY(-100%) rotate(0deg); opacity: 1; }
  100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
}
@keyframes dgw-confetti-sway {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(15px); }
  75% { transform: translateX(-15px); }
}
@keyframes dgw-ring-pulse {
  0%, 100% { filter: drop-shadow(0 0 6px var(--accent)); }
  50% { filter: drop-shadow(0 0 18px var(--accent)); }
}
@keyframes dgw-goal-pop {
  0% { transform: scale(0.8); opacity: 0; }
  60% { transform: scale(1.05); }
  100% { transform: scale(1); opacity: 1; }
}
@keyframes dgw-shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}
@keyframes dgw-streak-glow {
  0%, 100% { text-shadow: 0 0 6px rgba(255,165,0,0.4); }
  50% { text-shadow: 0 0 16px rgba(255,165,0,0.8); }
}
@keyframes dgw-check-bounce {
  0% { transform: scale(0); }
  50% { transform: scale(1.3); }
  100% { transform: scale(1); }
}
`;

const CONFETTI_COLORS = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8', '#FF9FF3', '#54A0FF', '#5F27CD'];

function ConfettiOverlay() {
  const pieces = useMemo(() => {
    return Array.from({ length: 40 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 2,
      duration: 2 + Math.random() * 2,
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      size: 6 + Math.random() * 8,
      shape: Math.random() > 0.5 ? 'circle' : 'rect',
    }));
  }, []);

  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 10, borderRadius: 'inherit' }}>
      {pieces.map(p => (
        <div key={p.id} style={{
          position: 'absolute',
          left: `${p.left}%`,
          top: '-10%',
          width: p.shape === 'circle' ? p.size : p.size * 0.7,
          height: p.size,
          background: p.color,
          borderRadius: p.shape === 'circle' ? '50%' : '2px',
          animation: `dgw-confetti-fall ${p.duration}s ease-in ${p.delay}s infinite, dgw-confetti-sway ${p.duration * 0.7}s ease-in-out ${p.delay}s infinite`,
        }} />
      ))}
    </div>
  );
}

function CircularProgress({ percentage, size = 140, strokeWidth = 10 }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.min(percentage, 100) / 100) * circumference;
  const isComplete = percentage >= 100;

  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} style={{
        transform: 'rotate(-90deg)',
        animation: isComplete ? 'dgw-ring-pulse 2s ease-in-out infinite' : 'none',
      }}>
        {/* Track */}
        <circle cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke="var(--border)" strokeWidth={strokeWidth} opacity={0.3} />
        {/* Gradient definition */}
        <defs>
          <linearGradient id="dgw-ring-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="var(--accent)" />
            <stop offset="100%" stopColor={isComplete ? 'var(--success)' : '#a78bfa'} />
          </linearGradient>
        </defs>
        {/* Progress */}
        <circle cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke="url(#dgw-ring-gradient)" strokeWidth={strokeWidth}
          strokeDasharray={circumference} strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.4, 0, 0.2, 1)' }} />
      </svg>
      {/* Center text */}
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      }}>
        <span style={{
          fontSize: '2rem', fontWeight: 800,
          color: isComplete ? 'var(--success)' : 'var(--text-primary)',
          lineHeight: 1,
        }}>
          {Math.round(percentage)}%
        </span>
        <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 2 }}>
          {isComplete ? '🎉 Complete!' : 'Today'}
        </span>
      </div>
    </div>
  );
}

function MiniProgressBar({ label, icon, current, target, color }) {
  const pct = target > 0 ? Math.min((current / target) * 100, 100) : 0;
  const isComplete = pct >= 100;

  return (
    <div style={{ animation: 'dgw-goal-pop 0.5s ease-out forwards' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 4 }}>
          <span>{icon}</span> {label}
          {isComplete && <span style={{ animation: 'dgw-check-bounce 0.4s ease-out', display: 'inline-block' }}>✅</span>}
        </span>
        <span style={{
          fontSize: '0.75rem', fontWeight: 700,
          color: isComplete ? 'var(--success)' : 'var(--text-primary)',
        }}>
          {current}/{target}
        </span>
      </div>
      <div style={{
        height: 8, borderRadius: 4,
        background: 'var(--bg-main)',
        border: '1px solid var(--border)',
        overflow: 'hidden',
      }}>
        <div style={{
          height: '100%',
          width: `${pct}%`,
          borderRadius: 4,
          background: isComplete
            ? `linear-gradient(90deg, ${color}, var(--success))`
            : `linear-gradient(90deg, ${color}88, ${color})`,
          transition: 'width 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
          boxShadow: isComplete ? `0 0 8px ${color}66` : 'none',
        }} />
      </div>
    </div>
  );
}

function StreakDisplay({ streak }) {
  const milestones = [
    { days: 100, icon: '👑', label: 'Legend', color: '#FFD700' },
    { days: 30, icon: '💎', label: 'Diamond', color: '#B9F2FF' },
    { days: 14, icon: '⚡', label: 'Electrified', color: '#FFEAA7' },
    { days: 7, icon: '🔥', label: 'On Fire', color: '#FF6B6B' },
  ];

  const achieved = milestones.find(m => streak >= m.days);
  const next = milestones.slice().reverse().find(m => streak < m.days);

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem',
      padding: '0.5rem 0.75rem',
      background: achieved ? `${achieved.color}11` : 'transparent',
      borderRadius: 8,
      border: `1px solid ${achieved ? achieved.color + '33' : 'var(--border)'}`,
    }}>
      <div style={{
        fontSize: '1.5rem',
        animation: streak >= 7 ? 'dgw-streak-glow 2s ease-in-out infinite' : 'none',
      }}>
        {achieved ? achieved.icon : '🌱'}
      </div>
      <div>
        <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>
          {streak} day{streak !== 1 ? 's' : ''} streak
        </div>
        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
          {achieved ? achieved.label : 'Getting started'}
          {next && ` · ${next.days - streak} days to ${next.icon}`}
        </div>
      </div>
      {/* Milestone badges row */}
      <div style={{ display: 'flex', gap: 4, marginLeft: 'auto' }}>
        {milestones.slice().reverse().map(m => (
          <span key={m.days} title={`${m.days}-day: ${m.label}`} style={{
            fontSize: '1rem',
            opacity: streak >= m.days ? 1 : 0.2,
            filter: streak >= m.days ? 'none' : 'grayscale(100%)',
            transition: 'all 0.3s',
          }}>
            {m.icon}
          </span>
        ))}
      </div>
    </div>
  );
}

function GoalEditor({ goals, onSave, onCancel }) {
  const [form, setForm] = useState({ ...goals });

  return (
    <div style={{
      padding: '1rem',
      background: 'var(--bg-main)',
      borderRadius: 8,
      border: '1px solid var(--accent)',
      animation: 'dgw-goal-pop 0.3s ease-out',
    }}>
      <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--accent)', marginBottom: '0.75rem' }}>
        ⚙️ Set Daily Goals
      </div>
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.75rem' }}>
        {[
          { key: 'hoursTarget', label: 'Hours', icon: '📖', step: 0.5 },
          { key: 'cardsTarget', label: 'Cards', icon: '🃏', step: 1 },
          { key: 'quizzesTarget', label: 'Quizzes', icon: '🧪', step: 1 },
        ].map(f => (
          <div key={f.key} style={{ flex: 1 }}>
            <label style={{ fontSize: '0.65rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 3 }}>
              {f.icon} {f.label}
            </label>
            <input
              className="form-control"
              type="number"
              min={0}
              step={f.step}
              value={form[f.key]}
              onChange={e => setForm({ ...form, [f.key]: parseFloat(e.target.value) || 0 })}
              style={{ padding: '0.35rem 0.5rem', fontSize: '0.85rem', textAlign: 'center' }}
            />
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <button className="btn btn-primary" onClick={() => onSave(form)} style={{ flex: 1, padding: '0.4rem', fontSize: '0.8rem' }}>
          💾 Save
        </button>
        <button className="btn btn-ghost" onClick={onCancel} style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem' }}>
          Cancel
        </button>
      </div>
    </div>
  );
}

export default function DailyGoalWidget() {
  const [goals, setGoals] = useState(loadGoals);
  const [showEditor, setShowEditor] = useState(false);
  const [studyHoursToday, setStudyHoursToday] = useState(0);
  const [cardsReviewedToday, setCardsReviewedToday] = useState(0);
  const [quizzesToday, setQuizzesToday] = useState(0);
  const [streak, setStreak] = useState(0);
  const [loaded, setLoaded] = useState(false);

  const today = getToday();

  // Compute streak from study log dates
  const computeStreak = useCallback((logs) => {
    const dateSet = new Set(logs.map(l => (l.date || '').slice(0, 10)));
    let count = 0;
    let d = new Date();
    // Check today first
    if (dateSet.has(d.toISOString().slice(0, 10))) {
      count++;
      d.setDate(d.getDate() - 1);
    }
    // Check consecutive previous days
    while (dateSet.has(d.toISOString().slice(0, 10))) {
      count++;
      d.setDate(d.getDate() - 1);
    }
    return count;
  }, []);

  // Load today's progress
  useEffect(() => {
    const load = async () => {
      try {
        // Study hours
        const logsRes = await fetchStudyLogs();
        const logs = logsRes.data || [];
        const todayLogs = logs.filter(l => (l.date || '').slice(0, 10) === today);
        const hours = todayLogs.reduce((sum, l) => sum + (parseFloat(l.hours) || 0), 0);
        setStudyHoursToday(Math.round(hours * 100) / 100);
        setStreak(computeStreak(logs));

        // Cards reviewed today
        try {
          const qRes = await fetchQuestions();
          const questions = qRes.data || [];
          const reviewedToday = questions.filter(q => (q.last_revised || '').slice(0, 10) === today).length;
          setCardsReviewedToday(reviewedToday);
        } catch {
          setCardsReviewedToday(0);
        }

        // Quizzes from localStorage
        try {
          const raw = localStorage.getItem(QUIZ_HISTORY_KEY);
          if (raw) {
            const history = JSON.parse(raw);
            const todayQuizzes = (Array.isArray(history) ? history : []).filter(q =>
              (q.date || q.timestamp || '').slice(0, 10) === today
            ).length;
            setQuizzesToday(todayQuizzes);
          }
        } catch {
          setQuizzesToday(0);
        }
      } catch (err) {
        console.error('DailyGoalWidget load error:', err);
      } finally {
        setLoaded(true);
      }
    };

    load();
    // Refresh every 60s
    const interval = setInterval(load, 60000);
    return () => clearInterval(interval);
  }, [today, computeStreak]);

  const handleSaveGoals = useCallback((newGoals) => {
    setGoals(newGoals);
    saveGoals(newGoals);
    setShowEditor(false);
  }, []);

  const overallPct = useMemo(() => {
    const hoursPct = goals.hoursTarget > 0 ? Math.min(studyHoursToday / goals.hoursTarget, 1) : 1;
    const cardsPct = goals.cardsTarget > 0 ? Math.min(cardsReviewedToday / goals.cardsTarget, 1) : 1;
    const quizPct = goals.quizzesTarget > 0 ? Math.min(quizzesToday / goals.quizzesTarget, 1) : 1;
    return ((hoursPct + cardsPct + quizPct) / 3) * 100;
  }, [studyHoursToday, cardsReviewedToday, quizzesToday, goals]);

  const allGoalsMet = useMemo(() => {
    return (
      studyHoursToday >= goals.hoursTarget &&
      cardsReviewedToday >= goals.cardsTarget &&
      quizzesToday >= goals.quizzesTarget
    );
  }, [studyHoursToday, cardsReviewedToday, quizzesToday, goals]);

  return (
    <>
      <style>{CONFETTI_STYLE}</style>
      <div className="section-card" style={{
        position: 'relative',
        overflow: 'hidden',
        animation: 'dgw-goal-pop 0.5s ease-out',
      }}>
        {/* Confetti when all met */}
        {allGoalsMet && loaded && <ConfettiOverlay />}

        {/* Header */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          marginBottom: '1rem',
        }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
              🎯 Daily Goals
              {allGoalsMet && loaded && <span style={{ fontSize: '0.75rem', background: 'var(--success)', color: '#fff', padding: '2px 8px', borderRadius: 12, fontWeight: 600 }}>ALL MET!</span>}
            </h3>
            <p style={{ margin: 0, fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
            </p>
          </div>
          <button
            className="btn btn-ghost"
            onClick={() => setShowEditor(!showEditor)}
            style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}
          >
            ⚙️ Set Goals
          </button>
        </div>

        {/* Goal Editor */}
        {showEditor && (
          <div style={{ marginBottom: '1rem' }}>
            <GoalEditor goals={goals} onSave={handleSaveGoals} onCancel={() => setShowEditor(false)} />
          </div>
        )}

        {/* Main content */}
        {!loaded ? (
          <div style={{
            display: 'flex', justifyContent: 'center', padding: '2rem',
          }}>
            <div style={{
              width: 140, height: 140, borderRadius: '50%',
              background: 'linear-gradient(90deg, var(--bg-main) 25%, var(--border) 50%, var(--bg-main) 75%)',
              backgroundSize: '200% 100%',
              animation: 'dgw-shimmer 1.5s infinite',
            }} />
          </div>
        ) : (
          <>
            {/* Ring + bars layout */}
            <div style={{
              display: 'flex', gap: '1.5rem', alignItems: 'center',
              marginBottom: '1rem',
            }}>
              {/* Circular Ring */}
              <div style={{ flexShrink: 0 }}>
                <CircularProgress percentage={overallPct} />
              </div>

              {/* Mini progress bars */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <MiniProgressBar
                  label="Study Hours"
                  icon="📖"
                  current={studyHoursToday}
                  target={goals.hoursTarget}
                  color="#6366f1"
                />
                <MiniProgressBar
                  label="Cards Reviewed"
                  icon="🃏"
                  current={cardsReviewedToday}
                  target={goals.cardsTarget}
                  color="#06b6d4"
                />
                <MiniProgressBar
                  label="Quizzes Done"
                  icon="🧪"
                  current={quizzesToday}
                  target={goals.quizzesTarget}
                  color="#f59e0b"
                />
              </div>
            </div>

            {/* Streak display */}
            <StreakDisplay streak={streak} />
          </>
        )}
      </div>
    </>
  );
}
