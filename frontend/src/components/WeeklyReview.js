import React, { useState, useEffect } from 'react';
import callAI from '../api/aiApi';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const WeeklyReview = () => {
  const [weeklyUpdateText, setWeeklyUpdateText] = useState('');
  const [reviews, setReviews] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const stored = localStorage.getItem('agentic_weekly_reviews');
    if (stored) {
      try {
        setReviews(JSON.parse(stored));
      } catch (e) {
        console.error('Error parsing reviews', e);
      }
    }
  }, []);

  const saveReviews = (newReviews) => {
    setReviews(newReviews);
    localStorage.setItem('agentic_weekly_reviews', JSON.stringify(newReviews));
  };

  const handleRunRetrospective = async () => {
    if (!weeklyUpdateText.trim()) return;
    
    setIsLoading(true);
    setError(null);
    try {
      const prompt = `You are an Agentic AI career coach. Based on this weekly update:\n${weeklyUpdateText}\n\nGive me:\n1) What went well\n2) Improvements\n3) Next week priorities.\n\nUse clear headings, bullet points, and an encouraging tone. Keep it actionable and concise.`;
      const response = await callAI(prompt);
      
      const newReview = {
        id: Date.now(),
        date: new Date().toISOString(),
        updateText: weeklyUpdateText,
        aiResponse: response
      };
      
      saveReviews([newReview, ...reviews]);
      setWeeklyUpdateText('');
    } catch (err) {
      setError(err.message || 'Failed to generate review.');
    } finally {
      setIsLoading(false);
    }
  };

  const deleteReview = (id) => {
    if(window.confirm('Are you sure you want to delete this review?')) {
      const newReviews = reviews.filter(r => r.id !== id);
      saveReviews(newReviews);
    }
  };

  // 12-week progress logic
  // A standard phase might be 12 weeks. Cap the visual progress at 12 or use modulo if it exceeds.
  const weeksCompleted = reviews.length;
  const progressPercent = Math.min(100, (weeksCompleted / 12) * 100);
  const currentWeekDisplay = (weeksCompleted % 12) === 0 && weeksCompleted > 0 ? 12 : (weeksCompleted % 12);
  const cycleCount = Math.floor(weeksCompleted / 12) + 1;

  return (
    <div style={{ padding: '20px', maxWidth: '1000px', margin: '0 auto', animation: 'fadeIn 0.5s ease-in' }}>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .review-card { background: var(--bg-card); border: 1px solid var(--border); border-radius: 12px; padding: 25px; margin-bottom: 25px; box-shadow: 0 4px 15px rgba(0,0,0,0.1); }
        .review-textarea { width: 100%; min-height: 140px; background: var(--bg-main); color: var(--text-primary); border: 1px solid var(--border); border-radius: 8px; padding: 15px; font-family: inherit; font-size: 1rem; resize: vertical; margin-bottom: 15px; }
        .review-textarea:focus { outline: none; border-color: var(--accent); box-shadow: 0 0 0 2px var(--accent-glow); }
        .progress-container { width: 100%; height: 16px; background: var(--bg-main); border-radius: 8px; overflow: hidden; border: 1px solid var(--border); margin: 10px 0 25px; position: relative; }
        .progress-bar { height: 100%; background: linear-gradient(90deg, var(--accent), #8a2be2); transition: width 0.8s cubic-bezier(0.4, 0, 0.2, 1); border-radius: 8px; }
        
        .markdown-body h1, .markdown-body h2, .markdown-body h3 { margin-top: 15px; margin-bottom: 8px; color: var(--text-primary); }
        .markdown-body h1 { font-size: 1.5em; }
        .markdown-body h2 { font-size: 1.25em; border-bottom: 1px solid var(--border); padding-bottom: 4px; }
        .markdown-body h3 { font-size: 1.1em; }
        .markdown-body ul, .markdown-body ol { padding-left: 20px; margin-bottom: 15px; }
        .markdown-body li { margin-bottom: 4px; color: var(--text-secondary); }
        .markdown-body p { margin-bottom: 15px; color: var(--text-secondary); line-height: 1.6; }
        .markdown-body strong { color: var(--text-primary); }
        
        .review-grid { display: grid; grid-template-columns: 1fr; gap: 20px; }
        @media (min-width: 768px) {
          .review-grid { grid-template-columns: 1fr 1.5fr; }
        }
      `}</style>

      <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '10px' }}>
        <i className="fas fa-calendar-check" style={{ fontSize: '2rem', color: 'var(--accent)' }}></i>
        <h1 style={{ color: 'var(--text-primary)', margin: 0 }}>Weekly Sprint Review</h1>
      </div>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '25px', fontSize: '1.1rem' }}>
        Reflect on your accomplishments and get AI feedback to plan an effective upcoming week.
      </p>

      <div className="section-card review-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '8px' }}>
          <div>
            <strong style={{ color: 'var(--text-primary)', fontSize: '1.1rem' }}>12-Week Mastery Cycle</strong>
            <span style={{ color: 'var(--text-muted)', marginLeft: '10px', fontSize: '0.9rem' }}>(Cycle {cycleCount})</span>
          </div>
          <div style={{ background: 'var(--accent-glow)', color: 'var(--accent)', padding: '4px 10px', borderRadius: '12px', fontSize: '0.85rem', fontWeight: 'bold' }}>
            Week {currentWeekDisplay} / 12
          </div>
        </div>
        <div className="progress-container">
          <div className="progress-bar" style={{ width: `${progressPercent}%` }}></div>
        </div>

        <label className="form-label" style={{ display: 'block', marginBottom: '10px', fontSize: '1.05rem', fontWeight: 'bold' }}>
          What did you accomplish this week?
        </label>
        <textarea
          className="review-textarea"
          placeholder="Paste your daily logs, GitHub commits, key learning milestones, or write a quick summary here..."
          value={weeklyUpdateText}
          onChange={(e) => setWeeklyUpdateText(e.target.value)}
          disabled={isLoading}
        ></textarea>

        {error && (
          <div style={{ background: 'rgba(255, 69, 58, 0.1)', color: 'var(--danger)', padding: '12px', borderRadius: '8px', marginBottom: '15px', border: '1px solid rgba(255, 69, 58, 0.2)' }}>
            <i className="fas fa-exclamation-triangle" style={{ marginRight: '8px' }}></i> {error}
          </div>
        )}

        <button 
          className="btn btn-primary" 
          onClick={handleRunRetrospective}
          disabled={isLoading || !weeklyUpdateText.trim()}
          style={{ width: '100%', padding: '14px', fontSize: '1.1rem', fontWeight: 'bold', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px', borderRadius: '8px' }}
        >
          {isLoading ? (
             <>
               <i className="fas fa-spinner fa-spin"></i> Generating AI Insights...
             </>
          ) : (
            <>
              <i className="fas fa-magic"></i> Run AI Retrospective
            </>
          )}
        </button>
      </div>

      <h2 style={{ color: 'var(--text-primary)', marginTop: '40px', marginBottom: '20px', borderBottom: '1px solid var(--border)', paddingBottom: '10px' }}>
        Review History
      </h2>
      
      {reviews.length === 0 ? (
        <div className="section-card" style={{ textAlign: 'center', padding: '50px 20px', color: 'var(--text-muted)' }}>
          <i className="fas fa-history" style={{ fontSize: '3rem', marginBottom: '20px', opacity: 0.3 }}></i>
          <h3>No Reviews Yet</h3>
          <p>Complete your first weekly sprint review to see it here.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
          {reviews.map(review => (
            <div key={review.id} className="section-card review-card" style={{ animation: 'fadeIn 0.5s ease-in' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '15px', marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ background: 'var(--bg-main)', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border)' }}>
                    <i className="far fa-calendar-alt" style={{ color: 'var(--accent)', marginRight: '8px' }}></i>
                    <strong style={{ color: 'var(--text-primary)' }}>
                      {new Date(review.date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                    </strong>
                  </div>
                </div>
                <button 
                  onClick={() => deleteReview(review.id)}
                  className="btn btn-ghost" 
                  style={{ color: 'var(--danger)', padding: '6px 10px' }}
                  title="Delete Review"
                >
                  <i className="fas fa-trash-alt"></i>
                </button>
              </div>
              
              <div className="review-grid">
                <div style={{ background: 'var(--bg-main)', padding: '20px', borderRadius: '10px', border: '1px solid var(--border)' }}>
                  <h4 style={{ color: 'var(--text-primary)', margin: '0 0 15px 0', fontSize: '0.95rem', textTransform: 'uppercase', letterSpacing: '1px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <i className="fas fa-pen-nib"></i> Your Update
                  </h4>
                  <div style={{ color: 'var(--text-secondary)', whiteSpace: 'pre-wrap', fontSize: '1rem', lineHeight: '1.6' }}>
                    {review.updateText}
                  </div>
                </div>
                
                <div style={{ background: 'rgba(138, 43, 226, 0.05)', padding: '20px', borderRadius: '10px', border: '1px solid rgba(138, 43, 226, 0.2)' }}>
                  <h4 style={{ color: 'var(--accent)', margin: '0 0 15px 0', fontSize: '0.95rem', textTransform: 'uppercase', letterSpacing: '1px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <i className="fas fa-robot"></i> AI Feedback
                  </h4>
                  <div className="markdown-body" style={{ fontSize: '1rem' }}>
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{review.aiResponse}</ReactMarkdown>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default WeeklyReview;
