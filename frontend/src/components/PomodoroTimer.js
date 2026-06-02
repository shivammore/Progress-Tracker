import React, { useState, useEffect, useRef, useCallback } from 'react';

const PRESETS = {
  pomodoro: { work: 25, break: 5, label: 'Pomodoro' },
  deep: { work: 50, break: 10, label: 'Deep Work' },
  quick: { work: 15, break: 3, label: 'Quick Sprint' },
};

const styles = {
  container: {
    position: 'fixed', bottom: '2rem', right: '2rem', zIndex: 500,
    minWidth: '300px', borderRadius: 'var(--radius-xl)',
    background: 'var(--bg-card)', backdropFilter: 'blur(20px)',
    border: 'var(--glass-border)', boxShadow: '0 24px 48px rgba(0,0,0,0.15)',
    overflow: 'hidden', transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
  },
  header: {
    padding: '1rem 1.25rem 0.75rem', display: 'flex', justifyContent: 'space-between',
    alignItems: 'center', borderBottom: '1px solid var(--border)',
  },
  title: { fontWeight: 800, fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '0.5rem' },
  closeBtn: {
    background: 'transparent', border: 'none', cursor: 'pointer',
    fontSize: '1rem', color: 'var(--text-muted)',
  },
  body: { padding: '1.5rem 1.25rem', textAlign: 'center' },
  timerDisplay: {
    fontSize: '3.5rem', fontWeight: 800, fontVariantNumeric: 'tabular-nums',
    letterSpacing: '-0.02em', margin: '0.5rem 0',
  },
  ring: (pct, isBreak) => ({
    width: '180px', height: '180px', borderRadius: '50%', margin: '0 auto 1rem',
    background: `conic-gradient(${isBreak ? 'var(--success)' : '#6366f1'} ${pct * 360}deg, var(--bg-main) 0)`,
    display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative',
  }),
  ringInner: {
    width: '160px', height: '160px', borderRadius: '50%',
    background: 'var(--bg-card)', display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
  },
  phaseLabel: (isBreak) => ({
    fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em',
    color: isBreak ? 'var(--success)' : 'var(--accent)',
  }),
  presetBtn: (active) => ({
    padding: '0.4rem 0.8rem', borderRadius: '2rem', fontSize: '0.75rem',
    fontWeight: 700, cursor: 'pointer', border: 'none', fontFamily: 'inherit',
    background: active ? 'var(--accent)' : 'var(--bg-main)',
    color: active ? 'white' : 'var(--text-secondary)',
    transition: 'all 0.2s',
  }),
  actionBtn: (variant) => ({
    padding: '0.6rem 1.25rem', borderRadius: 'var(--radius-md)',
    fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', border: 'none',
    fontFamily: 'inherit', transition: 'all 0.2s',
    background: variant === 'primary' ? 'linear-gradient(135deg, #6366f1, #a855f7)' : 'var(--bg-main)',
    color: variant === 'primary' ? 'white' : 'var(--text-primary)',
    boxShadow: variant === 'primary' ? '0 4px 12px var(--accent-glow)' : 'none',
  }),
  topicBadge: {
    display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
    padding: '0.35rem 0.75rem', borderRadius: '2rem', fontSize: '0.75rem',
    fontWeight: 700, background: 'var(--accent-glow)', color: 'var(--accent)',
    marginBottom: '1rem',
  },
  minimizedBar: {
    position: 'fixed', bottom: '2rem', right: '2rem', zIndex: 500,
    padding: '0.75rem 1.25rem', borderRadius: '2rem',
    background: 'var(--bg-card)', backdropFilter: 'blur(20px)',
    border: 'var(--glass-border)', boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
    display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer',
    transition: 'all 0.3s',
  },
};

export default function PomodoroTimer({ topic, onSessionComplete, onClose }) {
  const [preset, setPreset] = useState('pomodoro');
  const [phase, setPhase] = useState('idle'); // idle, work, break, done
  const [timeLeft, setTimeLeft] = useState(PRESETS.pomodoro.work * 60);
  const [totalWorkSeconds, setTotalWorkSeconds] = useState(0);
  const [sessionsCompleted, setSessionsCompleted] = useState(0);
  const [minimized, setMinimized] = useState(false);
  const intervalRef = useRef(null);
  const startTimeRef = useRef(null);

  const currentPreset = PRESETS[preset];
  const totalTime = phase === 'break' ? currentPreset.break * 60 : currentPreset.work * 60;
  const progress = totalTime > 0 ? (totalTime - timeLeft) / totalTime : 0;

  const formatTime = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  const tick = useCallback(() => {
    setTimeLeft(prev => {
      if (prev <= 1) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
        if (phase === 'work') {
          // Work session complete
          const elapsed = currentPreset.work * 60;
          setTotalWorkSeconds(p => p + elapsed);
          setSessionsCompleted(p => p + 1);
          // Auto-start break
          setPhase('break');
          return currentPreset.break * 60;
        } else if (phase === 'break') {
          setPhase('done');
          return 0;
        }
        return 0;
      }
      return prev - 1;
    });
  }, [phase, currentPreset]);

  useEffect(() => {
    if ((phase === 'work' || phase === 'break') && !intervalRef.current) {
      intervalRef.current = setInterval(tick, 1000);
    }
    return () => { if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; } };
  }, [phase, tick]);

  const startWork = () => {
    setPhase('work');
    setTimeLeft(currentPreset.work * 60);
    startTimeRef.current = Date.now();
  };

  const pauseResume = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    } else {
      intervalRef.current = setInterval(tick, 1000);
    }
  };

  const reset = () => {
    clearInterval(intervalRef.current);
    intervalRef.current = null;
    setPhase('idle');
    setTimeLeft(currentPreset.work * 60);
  };

  const finishSession = () => {
    const hours = Math.round((totalWorkSeconds / 3600) * 100) / 100;
    if (onSessionComplete) onSessionComplete(hours);
    onClose();
  };

  const changePreset = (key) => {
    if (phase !== 'idle') return;
    setPreset(key);
    setTimeLeft(PRESETS[key].work * 60);
  };

  // Minimized floating pill
  if (minimized && (phase === 'work' || phase === 'break')) {
    return (
      <div style={styles.minimizedBar} onClick={() => setMinimized(false)}>
        <span style={{ fontSize: '1.1rem' }}>{phase === 'work' ? '🔥' : '☕'}</span>
        <span style={{ fontWeight: 800, fontVariantNumeric: 'tabular-nums', fontSize: '1.1rem' }}>
          {formatTime(timeLeft)}
        </span>
        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>
          {phase === 'work' ? 'Focus' : 'Break'}
        </span>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.title}>⏱️ Study Timer</div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {(phase === 'work' || phase === 'break') && (
            <button style={styles.closeBtn} onClick={() => setMinimized(true)} title="Minimize">⬇</button>
          )}
          <button style={styles.closeBtn} onClick={onClose} title="Close">✕</button>
        </div>
      </div>

      <div style={styles.body}>
        {topic && <div style={styles.topicBadge}>📚 {topic}</div>}

        {phase === 'idle' && (
          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', marginBottom: '1.5rem' }}>
            {Object.entries(PRESETS).map(([key, val]) => (
              <button key={key} style={styles.presetBtn(preset === key)} onClick={() => changePreset(key)}>
                {val.label} ({val.work}m)
              </button>
            ))}
          </div>
        )}

        <div style={styles.ring(progress, phase === 'break')}>
          <div style={styles.ringInner}>
            <div style={styles.phaseLabel(phase === 'break')}>
              {phase === 'idle' ? 'Ready' : phase === 'work' ? '🔥 Focus' : phase === 'break' ? '☕ Break' : '✅ Done'}
            </div>
            <div style={styles.timerDisplay}>{formatTime(timeLeft)}</div>
          </div>
        </div>

        {sessionsCompleted > 0 && (
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
            {sessionsCompleted} session{sessionsCompleted > 1 ? 's' : ''} · {Math.round(totalWorkSeconds / 60)}m total
          </div>
        )}

        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
          {phase === 'idle' && (
            <button style={styles.actionBtn('primary')} onClick={startWork}>▶ Start Focus</button>
          )}
          {(phase === 'work' || phase === 'break') && (
            <>
              <button style={styles.actionBtn('ghost')} onClick={pauseResume}>
                {intervalRef.current ? '⏸ Pause' : '▶ Resume'}
              </button>
              <button style={styles.actionBtn('ghost')} onClick={reset}>⟲ Reset</button>
            </>
          )}
          {phase === 'done' && (
            <>
              <button style={styles.actionBtn('ghost')} onClick={() => { setPhase('idle'); setTimeLeft(currentPreset.work * 60); }}>
                🔄 Another Round
              </button>
              <button style={styles.actionBtn('primary')} onClick={finishSession}>
                💾 Log {Math.round(totalWorkSeconds / 60)}m & Close
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
