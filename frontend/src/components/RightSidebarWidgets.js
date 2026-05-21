import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import axios from 'axios';
import API_BASE_URL from '../api/config';

export default function RightSidebarWidgets({ progressPercent, doneCount, totalHours, totalPlans }) {
  const navigate = useNavigate();
  const [globalStats, setGlobalStats] = useState(null);

  // If local daily plan stats aren't provided, fetch global analytics
  useEffect(() => {
    if (progressPercent === undefined) {
      axios.get(`${API_BASE_URL}/analytics/summary`)
        .then(res => setGlobalStats(res.data))
        .catch(err => console.error("Error fetching global stats for sidebar:", err));
    }
  }, [progressPercent]);

  return (
    <div className="dp-right-col" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* 1. Progress Widget (Local or Global) */}
      <div className="section-card" style={{ padding: '1.5rem' }}>
        <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span>📈</span> {progressPercent !== undefined ? 'Weekly Progress' : 'Global Overview'}
        </h3>
        <div style={{ background: 'var(--bg-main)', padding: '1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
          
          {progressPercent !== undefined ? (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Completion</span>
                <span style={{ fontWeight: 'bold', color: progressPercent >= 100 ? 'var(--success)' : 'var(--text-primary)' }}>{progressPercent}%</span>
              </div>
              <div style={{ width: '100%', height: '8px', background: 'var(--border)', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ width: `${progressPercent}%`, height: '100%', background: progressPercent >= 100 ? 'var(--success)' : 'var(--accent)', transition: 'width 0.5s ease' }}></div>
              </div>
              <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                <span>{doneCount} / {totalPlans} plans completed</span>
                <span>{totalHours}h planned</span>
              </div>
            </>
          ) : globalStats ? (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Job Apps</span>
                <span style={{ fontWeight: 'bold', color: 'var(--accent)' }}>{globalStats.counts?.total_apps || 0}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Upcoming Reminders</span>
                <span style={{ fontWeight: 'bold', color: 'var(--warning)' }}>{globalStats.upcoming_reminders?.length || 0}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Target Companies</span>
                <span style={{ fontWeight: 'bold', color: 'var(--success)' }}>{globalStats.counts?.total_targets || 0}</span>
              </div>
            </>
          ) : (
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center' }}>Loading stats...</div>
          )}

        </div>
      </div>

      {/* 2. AI Tutor Widget */}
      <div className="section-card" style={{ padding: '1.5rem', background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.05), rgba(236, 72, 153, 0.05))', border: '1px solid rgba(99, 102, 241, 0.2)' }}>
        <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-primary)' }}>
          <span>🤖</span> AI Study Buddy
        </h3>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem', lineHeight: 1.5 }}>
          Stuck on a topic? Need a quick refresher? Jump into a quick chat with your AI tutor to clarify any concepts before you tackle your tasks.
        </p>
        <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} onClick={() => navigate('/ai-assistant')}>
          Open AI Tutor
        </button>
      </div>

      {/* 3. Pro Tip Widget */}
      <div className="section-card" style={{ padding: '1.5rem' }}>
        <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-primary)' }}>
          <span>💡</span> Pro Tip
        </h3>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic', lineHeight: 1.5 }}>
          "Break down complex topics into 25-minute Pomodoro sessions. Focus on active recall and testing yourself rather than just re-reading material."
        </p>
      </div>
      
    </div>
  );
}
