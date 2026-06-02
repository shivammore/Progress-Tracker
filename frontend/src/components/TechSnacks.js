import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import callAI from '../api/aiApi';

export default function TechSnacks() {
  const [snack, setSnack] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const generateSnack = async () => {
    setLoading(true);
    const topics = [
      "Microservices vs Monolithic Architecture", "Docker vs Kubernetes", "Eventual Consistency", 
      "Database Sharding", "Redis caching strategies", "OAuth 2.0 flow", "GraphQL vs REST", 
      "Kafka message queues", "React Server Components", "WebSockets"
    ];
    const randomTopic = topics[Math.floor(Math.random() * topics.length)];
    const prompt = `Generate a very brief, high-impact "Tech Snack" (microlearning byte) about: "${randomTopic}".
Format it with:
1. A catchy title with an emoji.
2. A 2-3 sentence 'TL;DR' or ELI5.
3. 2 key bullet points on 'Why it matters'.
Keep the total output under 150 words.`;

    try {
      const result = await callAI(prompt);
      setSnack(result);
    } catch (err) {
      console.error(err);
      setSnack("Failed to load Tech Snack. Take a break!");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    generateSnack();
  }, []);

  return (
    <div className="section-card" style={{ marginBottom: '1.5rem', background: 'linear-gradient(135deg, var(--bg-card), var(--bg-main))', border: '1px solid var(--border)', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: '-1rem', right: '-1rem', fontSize: '6rem', opacity: 0.05, transform: 'rotate(15deg)' }}>🍿</div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h3 style={{ fontSize: '1.1rem', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent)' }}>
          🍿 Daily Tech Snack
        </h3>
        <button className="btn btn-ghost" onClick={generateSnack} disabled={loading} style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem' }}>
          {loading ? '🍿 Popcorn popping...' : '🔄 Next Snack'}
        </button>
      </div>
      
      <div style={{ minHeight: '120px' }}>
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)' }}>
            <div className="typing-dot" style={{ background: 'var(--accent)' }}></div>
            <div className="typing-dot" style={{ background: 'var(--accent)' }}></div>
            <div className="typing-dot" style={{ background: 'var(--accent)' }}></div>
          </div>
        ) : (
          <div className="markdown-body" style={{ fontSize: '0.9rem', lineHeight: 1.5 }}>
            <ReactMarkdown>{snack}</ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}
