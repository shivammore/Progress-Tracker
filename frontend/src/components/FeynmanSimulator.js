import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import callAI from '../api/aiApi';

export default function FeynmanSimulator({ concept, onClose }) {
  const [phase, setPhase] = useState('input'); // input, evaluating, results
  const [topic, setTopic] = useState(concept || '');
  const [explanation, setExplanation] = useState('');
  const [feedback, setFeedback] = useState(null);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef(null);

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
    } catch (err) {
      console.error(err);
      alert("Failed to evaluate: " + err.message);
      setPhase('input');
    }
  };

  const styles = {
    overlay: {
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    },
    modal: {
      background: 'var(--bg-card)', padding: '2.5rem', borderRadius: 'var(--radius-xl)',
      width: '90%', maxWidth: '700px', maxHeight: '90vh', overflowY: 'auto',
      border: '1px solid var(--border)', boxShadow: '0 24px 48px rgba(0,0,0,0.2)'
    }
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '1.8rem' }}>🧠</span> Feynman Simulator
          </h2>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--text-secondary)' }}>✕</button>
        </div>

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

        {phase === 'evaluating' && (
          <div style={{ textAlign: 'center', padding: '3rem 0' }}>
            <div style={{ fontSize: '3rem', animation: 'fc-pulse 1.5s infinite' }}>🤔</div>
            <h3 style={{ marginTop: '1.5rem' }}>The AI is evaluating your explanation...</h3>
            <p style={{ color: 'var(--text-secondary)' }}>Checking for simplicity, accuracy, and gaps.</p>
          </div>
        )}

        {phase === 'results' && feedback && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1.5rem', marginBottom: '2rem', padding: '1.5rem', background: 'var(--bg-main)', borderRadius: 'var(--radius-lg)' }}>
              <div style={{ fontSize: '3.5rem', fontWeight: 800, color: feedback.score >= 80 ? 'var(--success)' : feedback.score >= 60 ? 'var(--warning)' : 'var(--danger)' }}>
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

            <button className="btn btn-secondary" style={{ width: '100%', padding: '1rem', marginTop: '1rem' }} onClick={() => { setPhase('input'); setExplanation(''); }}>
              🔄 Try Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
