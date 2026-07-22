import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { fetchQuestions } from '../api/questionBankApi';

const STYLE_TAG_ID = 'srs-widget-styles';

function injectStyles() {
  if (document.getElementById(STYLE_TAG_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_TAG_ID;
  style.textContent = `
    @keyframes srs-pulse {
      0% { transform: scale(1); }
      50% { transform: scale(1.05); }
      100% { transform: scale(1); }
    }
    .srs-bubble {
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      width: 70px; height: 70px; border-radius: 50%;
      font-weight: 700; font-size: 1.2rem;
      position: relative; overflow: hidden;
    }
    .srs-bubble-label {
      font-size: 0.6rem; text-transform: uppercase; letter-spacing: 0.5px;
      margin-top: 4px; opacity: 0.8;
    }
    .srs-dot {
      width: 6px; height: 6px; border-radius: 50%; display: inline-block;
    }
    .srs-calendar-day {
      display: flex; flex-direction: column; align-items: center; gap: 4px;
      font-size: 0.7rem; color: var(--text-secondary);
    }
  `;
  document.head.appendChild(style);
}

export default function SRSWidget() {
  const [stats, setStats] = useState({ dueToday: 0, dueWeek: 0, mastered: 0, total: 0 });
  const [calendar, setCalendar] = useState([]);
  const navigate = useNavigate();

  useEffect(() => { injectStyles(); }, []);

  useEffect(() => {
    fetchQuestions().then(res => {
      const q = res.data || [];
      const now = new Date();
      now.setHours(0,0,0,0);
      
      let dueToday = 0;
      let dueWeek = 0;
      let mastered = 0;
      const daysCount = [0,0,0,0,0,0,0];

      q.forEach(card => {
        if (card.interval > 21) mastered++;
        
        let due = new Date();
        if (card.next_review_date) due = new Date(card.next_review_date);
        due.setHours(0,0,0,0);
        
        const diffDays = Math.ceil((due - now) / (1000 * 60 * 60 * 24));
        
        if (diffDays <= 0) dueToday++;
        if (diffDays > 0 && diffDays <= 7) {
          dueWeek++;
          if (diffDays - 1 < 7) {
            daysCount[diffDays - 1]++;
          }
        }
      });

      setStats({ dueToday, dueWeek, mastered, total: q.length });

      // Build calendar strip
      const cal = [];
      const dayNames = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
      for (let i = 1; i <= 7; i++) {
        const d = new Date(now);
        d.setDate(d.getDate() + i);
        cal.push({
          day: dayNames[d.getDay()],
          count: daysCount[i-1]
        });
      }
      setCalendar(cal);
    }).catch(console.error);
  }, []);

  const progress = stats.total > 0 ? Math.round((stats.mastered / stats.total) * 100) : 0;

  return (
    <div className="section-card" style={{
      background: 'linear-gradient(135deg, rgba(239,68,68,0.03) 0%, rgba(245,158,11,0.03) 50%, rgba(16,185,129,0.03) 100%)',
      border: '1px solid var(--border)',
      position: 'relative', overflow: 'hidden'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-primary)' }}>🧠 SRS Reviews</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: 'var(--success)', fontWeight: 600 }}>
          <span>🏆 {progress}% Mastered</span>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-around', marginBottom: '1.5rem' }}>
        <div className="srs-bubble" style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', animation: stats.dueToday > 0 ? 'srs-pulse 2s infinite' : 'none' }}>
          {stats.dueToday}
          <div className="srs-bubble-label">Today</div>
        </div>
        <div className="srs-bubble" style={{ background: 'rgba(245,158,11,0.1)', color: '#f59e0b' }}>
          {stats.dueWeek}
          <div className="srs-bubble-label">7 Days</div>
        </div>
        <div className="srs-bubble" style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981' }}>
          {stats.mastered}
          <div className="srs-bubble-label">Mastered</div>
        </div>
      </div>

      <div style={{ background: 'var(--bg-main)', borderRadius: 'var(--radius-md)', padding: '0.75rem', marginBottom: '1.5rem' }}>
        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'center' }}>Next 7 Days</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 10px' }}>
          {calendar.map((c, i) => (
            <div key={i} className="srs-calendar-day">
              <span>{c.day}</span>
              <div style={{ display: 'flex', gap: '2px', height: '6px' }}>
                {c.count === 0 ? <div className="srs-dot" style={{ background: 'var(--border)' }} /> : null}
                {Array.from({length: Math.min(3, c.count)}).map((_, j) => (
                  <div key={j} className="srs-dot" style={{ background: '#f59e0b' }} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <button className="btn btn-primary" style={{ width: '100%', display: 'flex', justifyContent: 'center', gap: '0.5rem' }} onClick={() => navigate('/questions?mode=practice')}>
        <span>🎴</span> Start Review Session
      </button>
    </div>
  );
}
