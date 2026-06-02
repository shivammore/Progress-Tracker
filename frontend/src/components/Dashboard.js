import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import axios from 'axios';
import API_BASE_URL from '../api/config';
import FeynmanSimulator from './FeynmanSimulator';
import TechSnacks from './TechSnacks';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(null);
  const [showFeynman, setShowFeynman] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    axios.get(`${API_BASE_URL}/analytics/summary`)
      .then(res => {
        setStats(res.data);
        setError(null);
      })
      .catch((err) => {
        console.error('Dashboard fetch error:', err);
        setError('Could not connect to the backend. Make sure the API server is running.');
      });
  }, []);

  if (error) {
    return (
      <div className="section-page">
        <div className="section-card" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>⚠️</div>
          <div style={{ color: 'var(--danger)', fontWeight: 600, fontSize: '1.1rem', marginBottom: '0.5rem' }}>
            Connection Error
          </div>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', maxWidth: '400px', margin: '0 auto' }}>
            {error}
          </div>
          <button
            className="btn btn-primary"
            style={{ marginTop: '1.5rem' }}
            onClick={() => { setError(null); setStats(null); window.location.reload(); }}
          >
            🔄 Retry
          </button>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="section-page">
        <div className="section-card" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
          <div style={{ fontSize: '2rem', marginBottom: '1rem', animation: 'pulse 1.5s infinite' }}>⏳</div>
          <div style={{ color: 'var(--text-secondary)' }}>Loading dashboard...</div>
        </div>
      </div>
    );
  }

  const { counts, upcoming_plans, questions_by_topic, upcoming_reminders, recent_activity, current_streak, study_recommendations, gamification } = stats;

  const totalPlans = counts.total_plans || 0;
  const dailyDone = counts.completed_plans || 0;
  const progressPct = totalPlans > 0 ? Math.round((dailyDone / totalPlans) * 100) : 0;

  const cards = [
    {
      icon: '📅', iconClass: 'purple', value: totalPlans,
      label: 'Daily Plans', trend: `${dailyDone} completed`, trendClass: dailyDone > 0 ? 'up' : 'neutral',
      path: '/daily'
    },
    {
      icon: '💡', iconClass: 'blue', value: counts.total_questions || 0,
      label: 'Questions', trend: `${questions_by_topic.length} topics`, trendClass: 'neutral',
      path: '/questions'
    },
    {
      icon: '🚀', iconClass: 'green', value: counts.total_milestones || 0,
      label: 'Milestones', trend: `${counts.completed_milestones || 0} done`, trendClass: counts.completed_milestones > 0 ? 'up' : 'neutral',
      path: '/milestones'
    },
    {
      icon: '🎯', iconClass: 'orange', value: counts.total_targets || 0,
      label: 'Target Companies', trend: 'Tracking', trendClass: 'neutral',
      path: '/targets'
    },
    {
      icon: '🏢', iconClass: 'pink', value: counts.total_apps || 0,
      label: 'Applications', trend: 'Submitted', trendClass: 'neutral',
      path: '/jobs'
    },
    {
      icon: '🎤', iconClass: 'cyan', value: counts.total_mocks || 0,
      label: 'Mock Interviews', trend: 'Completed', trendClass: 'neutral',
      path: '/mock'
    },
  ];

  // Helper to determine greeting
  const hour = new Date().getHours();
  let greeting = 'Good evening';
  if (hour < 12) greeting = 'Good morning';
  else if (hour < 18) greeting = 'Good afternoon';

  return (
    <div className="section-page">
      <div className="welcome-banner" style={{
        background: 'linear-gradient(135deg, var(--accent-dark), var(--accent))',
        color: 'white', padding: '2rem', borderRadius: 'var(--radius-lg)', marginBottom: '1.5rem',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: 'var(--shadow-md)', flexWrap: 'wrap', gap: '1rem'
      }}>
        <div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 700, margin: '0 0 0.5rem 0' }}>{greeting}, Engineer 👋</h2>
          <p style={{ margin: 0, opacity: 0.9, fontSize: '0.95rem' }}>Here's your interview prep status at a glance.</p>
        </div>
        
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          {/* Level Progress */}
          {gamification && (
            <div style={{ background: 'rgba(255,255,255,0.15)', padding: '0.75rem 1.5rem', borderRadius: 'var(--radius-md)', display: 'flex', flexDirection: 'column', minWidth: '200px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}>Level {gamification.level} 🏆</span>
                <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>{gamification.total_xp} XP</span>
              </div>
              <div style={{ height: '6px', background: 'rgba(0,0,0,0.3)', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{ 
                  width: `${Math.max(0, Math.min(100, ((gamification.total_xp - gamification.current_level_xp) / (gamification.next_level_xp - gamification.current_level_xp)) * 100))}%`, 
                  height: '100%', background: 'white', borderRadius: '3px' 
                }} />
              </div>
              <div style={{ fontSize: '0.7rem', opacity: 0.8, marginTop: '0.4rem', textAlign: 'right' }}>
                {gamification.next_level_xp - gamification.total_xp} XP to Level {gamification.level + 1}
              </div>
            </div>
          )}

          {/* Streak */}
          <div style={{ textAlign: 'center', background: 'rgba(255,255,255,0.2)', padding: '0.75rem 1.5rem', borderRadius: 'var(--radius-md)' }}>
            <div style={{ fontSize: '2rem', fontWeight: 800 }}>{current_streak} 🔥</div>
            <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}>Day Streak</div>
          </div>
          
          <button 
            className="btn btn-primary" 
            style={{ background: 'white', color: 'var(--accent)', fontWeight: 800, padding: '1rem 1.5rem', border: 'none', boxShadow: 'var(--shadow-sm)' }}
            onClick={() => setShowFeynman(true)}
          >
            🧠 Feynman Simulator
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid">
        {cards.map(card => (
          <div key={card.label} className="stat-card" onClick={() => navigate(card.path)}>
            <div className={`stat-icon ${card.iconClass}`}>{card.icon}</div>
            <div className="stat-info">
              <div className="stat-value">{card.value}</div>
              <div className="stat-label">{card.label}</div>
              <span className={`stat-trend ${card.trendClass}`}>{card.trend}</span>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
        
        {/* Left Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Progress Bar */}
          <div className="section-card" style={{ marginBottom: 0 }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--text-primary)' }}>
              📈 Overall Daily Plan Progress
            </h3>
            <div style={{
              background: 'var(--bg-main)', borderRadius: '2rem', height: '1.5rem', overflow: 'hidden',
              border: '1px solid var(--border)'
            }}>
              <div style={{
                width: `${progressPct}%`, height: '100%',
                background: progressPct > 50 ? 'linear-gradient(90deg, #10b981, #34d399)' : 'linear-gradient(90deg, #6366f1, #818cf8)',
                borderRadius: '2rem', transition: 'width 1s ease',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.7rem', fontWeight: 700, color: 'white',
                minWidth: progressPct > 0 ? '2.5rem' : 0
              }}>
                {progressPct > 0 && `${progressPct}%`}
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              <span>{dailyDone} / {totalPlans} days completed</span>
              <span>{totalPlans - dailyDone} remaining</span>
            </div>
          </div>

          {/* Smart Study Recommendations */}
          {study_recommendations && study_recommendations.length > 0 && (
            <div className="section-card" style={{ marginBottom: 0, border: '2px solid var(--accent)' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                🧠 What to Study Next
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {study_recommendations.map((rec, i) => (
                  <div key={i} style={{ 
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
                    padding: '0.75rem 1rem', background: 'var(--bg-main)', 
                    borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' 
                  }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>{rec.topic}</span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Low confidence</span>
                    </div>
                    <button className="btn btn-primary" style={{ padding: '0.4rem 0.75rem', fontSize: '0.75rem' }}
                      onClick={() => navigate(`/questions?topic=${encodeURIComponent(rec.topic)}`)}>
                      Practice
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Activity Feed */}
          <div className="section-card" style={{ marginBottom: 0, flex: 1 }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--text-primary)' }}>
              ⚡ Recent Activity
            </h3>
            {recent_activity && recent_activity.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {recent_activity.map((act, i) => (
                  <div key={i} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                    <div style={{ background: 'var(--accent-glow)', color: 'var(--accent)', padding: '0.5rem', borderRadius: '50%', fontSize: '1rem' }}>📚</div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>{act.title}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{act.desc} • {act.date}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <div className="empty-state-text">No recent activity. Log some study hours!</div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          <TechSnacks />
          {/* Upcoming Reminders */}
          <div className="section-card" style={{ marginBottom: 0 }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--text-primary)' }}>
              ⏰ Upcoming Reminders
            </h3>
            {upcoming_reminders && upcoming_reminders.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                {upcoming_reminders.slice(0, 5).map(r => (
                  <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.6rem 0.75rem', background: 'var(--bg-main)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>{r.title}</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--danger)', fontWeight: 600 }}>{r.due_date}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state" style={{ padding: '1.5rem' }}>
                <div className="empty-state-text">No pending reminders!</div>
              </div>
            )}
          </div>

          {/* Upcoming Tasks */}
          <div className="section-card" style={{ marginBottom: 0, flex: 1 }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--text-primary)' }}>
              ⏳ Next Daily Plans
            </h3>
            {upcoming_plans && upcoming_plans.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                {upcoming_plans.map((p, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.6rem 0.75rem', background: 'var(--bg-main)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--accent)', fontWeight: 700, minWidth: '5rem' }}>{p.date}</span>
                    <span style={{ flex: 1, fontSize: '0.85rem', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.focus_area}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state" style={{ padding: '1.5rem' }}>
                <div className="empty-state-icon">✅</div>
                <div className="empty-state-text">All caught up!</div>
              </div>
            )}
          </div>
        </div>

      </div>
      {showFeynman && <FeynmanSimulator onClose={() => setShowFeynman(false)} />}
    </div>
  );
}
