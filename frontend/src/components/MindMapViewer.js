import React, { useState, useEffect, useRef } from 'react';
import mermaid from 'mermaid';
import callAI from '../api/aiApi';

mermaid.initialize({
  startOnLoad: false,
  theme: 'dark',
  securityLevel: 'loose',
  fontFamily: 'Inter, sans-serif'
});

export default function MindMapViewer({ topic, onClose }) {
  const [loading, setLoading] = useState(true);
  const [mermaidCode, setMermaidCode] = useState('');
  const [error, setError] = useState(null);
  const containerRef = useRef(null);

  useEffect(() => {
    const generateMap = async () => {
      setLoading(true);
      setError(null);
      const prompt = `You are an expert technical architect.
Generate a comprehensive, visually appealing Mind Map or Flowchart using Mermaid.js syntax for the topic: "${topic}".
Make sure to include core concepts, how they relate, and best practices.
Use "graph TD" or "mindmap" syntax. Keep it concise but deeply informative.
Respond ONLY with the raw Mermaid.js code block, without any markdown formatting like \`\`\`mermaid or \`\`\`. Do NOT include any HTML tags.`;
      
      try {
        let code = await callAI(prompt);
        code = code.replace(/```mermaid\n?/g, '').replace(/```\n?/g, '').trim();
        setMermaidCode(code);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    if (topic) generateMap();
  }, [topic]);

  useEffect(() => {
    if (mermaidCode && containerRef.current) {
      containerRef.current.innerHTML = '';
      mermaid.render(`mermaid-${Date.now()}`, mermaidCode).then(({ svg }) => {
        containerRef.current.innerHTML = svg;
      }).catch(err => {
        console.error(err);
        setError("Failed to render the diagram. The AI generated invalid Mermaid syntax.");
      });
    }
  }, [mermaidCode]);

  const styles = {
    overlay: {
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    },
    modal: {
      background: 'var(--bg-main)', padding: '2rem', borderRadius: 'var(--radius-xl)',
      width: '95%', maxWidth: '1200px', height: '90vh', display: 'flex', flexDirection: 'column',
      border: '1px solid var(--border)', boxShadow: '0 24px 48px rgba(0,0,0,0.3)'
    }
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '1.8rem' }}>🗺️</span> AI Mind Map: {topic}
          </h2>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--text-secondary)' }}>✕</button>
        </div>

        <div style={{ flex: 1, background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', padding: '1rem', overflow: 'auto', border: '1px solid var(--border)', position: 'relative' }}>
          {loading && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-card)' }}>
              <div style={{ fontSize: '3rem', animation: 'spin 2s linear infinite' }}>⚙️</div>
              <p style={{ marginTop: '1rem', color: 'var(--text-secondary)' }}>Architecting the mind map...</p>
            </div>
          )}
          {error && (
            <div style={{ color: 'var(--danger)', padding: '2rem', textAlign: 'center' }}>
              <p>{error}</p>
              <button className="btn btn-secondary" onClick={() => setMermaidCode('')}>Retry</button>
            </div>
          )}
          <div ref={containerRef} style={{ width: '100%', height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }} />
        </div>
      </div>
    </div>
  );
}
