import React, { useState, useRef, useEffect } from 'react';
import { createMockInterview } from '../api/mockInterviewApi';
import { createDailyPlan } from '../api/dailyPlanApi';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import callAI from '../api/aiApi';

const MAX_QUESTIONS = 5;

const INTERVIEW_TYPES = [
  "Behavioral", "System Design", "Coding (Python)", "Data Engineering", "SQL", "Machine Learning"
];

const styles = {
  overlay: {
    position: 'fixed', inset: 0, zIndex: 1000,
    background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    animation: 'fadeIn 0.3s ease',
  },
  modal: {
    background: 'var(--bg-card)', backdropFilter: 'blur(20px)',
    borderRadius: 'var(--radius-xl)', border: 'var(--glass-border)',
    width: '95%', maxWidth: '800px', height: '90vh', display: 'flex', flexDirection: 'column',
    boxShadow: '0 24px 48px rgba(0,0,0,0.2)', overflow: 'hidden',
  },
  header: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '1.5rem 2rem', borderBottom: '1px solid var(--border)',
    background: 'var(--bg-main)',
  },
  chatArea: {
    flex: 1, overflowY: 'auto', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem',
  },
  inputArea: {
    padding: '1.5rem 2rem', borderTop: '1px solid var(--border)',
    background: 'var(--bg-main)', display: 'flex', gap: '1rem', alignItems: 'flex-start',
  },
  msgUser: {
    alignSelf: 'flex-end', background: 'var(--accent)', color: 'white',
    padding: '1rem 1.25rem', borderRadius: '2rem 2rem 0 2rem', maxWidth: '80%',
    lineHeight: 1.5,
  },
  msgAI: {
    alignSelf: 'flex-start', background: 'var(--bg-main)', color: 'var(--text-primary)',
    border: '1px solid var(--border)', padding: '1.25rem', borderRadius: '2rem 2rem 2rem 0',
    maxWidth: '85%', lineHeight: 1.6,
  },
  textarea: {
    flex: 1, resize: 'none', background: 'var(--bg-card)', border: '1px solid var(--border)',
    borderRadius: '1rem', padding: '1rem', color: 'var(--text-primary)',
    fontFamily: 'inherit', fontSize: '0.95rem', minHeight: '60px',
  },
};



export default function MockInterviewChat({ onClose, onSaveComplete }) {
  const [phase, setPhase] = useState('setup'); // setup, chat, loading, results
  const [type, setType] = useState(INTERVIEW_TYPES[0]);
  const [messages, setMessages] = useState([]); // { role: 'user'|'model', content: '' }
  const [questionCount, setQuestionCount] = useState(0);
  const [inputVal, setInputVal] = useState('');
  const [isAiTyping, setIsAiTyping] = useState(false);
  const [finalReport, setFinalReport] = useState(null);
  
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [isListening, setIsListening] = useState(false);
  
  const chatRef = useRef(null);
  const recognitionRef = useRef(null);

  // Initialize Speech Recognition
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event) => {
        let interimTranscript = '';
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) finalTranscript += transcript + ' ';
          else interimTranscript += transcript;
        }
        if (finalTranscript) {
          setInputVal(prev => prev + finalTranscript);
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }
  }, []);

  const speakText = (text) => {
    if (!voiceEnabled || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    
    // Clean markdown before speaking
    const cleanText = text.replace(/[#_*`\[\]()]/g, '');
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    
    // Try to find a good English voice
    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find(v => v.lang.startsWith('en') && (v.name.includes('Google') || v.name.includes('Natural')));
    if (preferredVoice) utterance.voice = preferredVoice;
    
    window.speechSynthesis.speak(utterance);
  };

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      if (recognitionRef.current) {
        recognitionRef.current.start();
        setIsListening(true);
      } else {
        alert("Speech recognition is not supported in this browser.");
      }
    }
  };

  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [messages, isAiTyping]);

  const startInterview = async () => {
    setPhase('chat');
    setIsAiTyping(true);
    try {
      const prompt = `You are a senior technical interviewer. We are doing a ${type} mock interview. 
Ask me the first question. Wait for my response. 
Keep it realistic, concise, and focused. Ask only ONE question at a time.`;
      const reply = await callAI(prompt, [{ role: 'system', content: `You are an interviewer. Format responses nicely using markdown.` }]);
      setMessages([{ role: 'model', content: reply }]);
      setQuestionCount(1);
      speakText(reply);
    } catch (e) {
      alert("Error: " + e.message);
      setPhase('setup');
    } finally {
      setIsAiTyping(false);
    }
  };

  const handleSend = async () => {
    if (!inputVal.trim() || isAiTyping) return;
    const userMsg = { role: 'user', content: inputVal };
    const newHistory = [...messages, userMsg];
    setMessages(newHistory);
    setInputVal('');
    setIsAiTyping(true);

    try {
      if (questionCount < MAX_QUESTIONS) {
        // Next question
        const prompt = `Here is my answer:\n${userMsg.content}\n\nPlease briefly evaluate my answer out of 10, provide 1-2 sentences of feedback, and then ask the next question (Question ${questionCount + 1} of ${MAX_QUESTIONS}).`;
        const reply = await callAI(prompt, newHistory);
        setMessages([...newHistory, { role: 'model', content: reply }]);
        setQuestionCount(questionCount + 1);
        speakText(reply);
      } else {
        // Final evaluation
        const prompt = `Here is my answer to the final question:\n${userMsg.content}\n\nThis concludes the interview. Please generate a final evaluation report in JSON format ONLY:
{
  "score": 8, // Average score out of 10
  "strengths": "What I did well",
  "weak_areas": "What I need to improve",
  "action_items": "What I should study next",
  "detailed_feedback": "A short summary of the interview performance"
}`;
        const reply = await callAI(prompt, newHistory);
        // Parse JSON
        let jsonStr = reply.trim();
        const match = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (match) jsonStr = match[1].trim();
        const parsed = JSON.parse(jsonStr);
        setFinalReport(parsed);
        setPhase('results');
      }
    } catch (e) {
      setMessages([...newHistory, { role: 'model', content: '❌ Error: ' + e.message }]);
    } finally {
      setIsAiTyping(false);
    }
  };

  const handleSaveRecord = async () => {
    try {
      await createMockInterview({
        date: new Date().toISOString().split('T')[0],
        type: type,
        platform: 'AI In-App',
        score: finalReport?.score || 0,
        strengths: finalReport?.strengths || '',
        weak_areas: finalReport?.weak_areas || '',
        action_items: finalReport?.action_items || ''
      });

      // Feature 7: Auto-create Daily Plan based on Weak Areas
      if (finalReport?.weak_areas) {
        try {
          await createDailyPlan({
            day: 0,
            date: new Date().toISOString().split('T')[0],
            week: 'Interview Review',
            focus_area: `Review: ${type} Weaknesses`,
            tasks: `[ ] Address Weak Areas: ${finalReport.weak_areas.replace(/;/g, ',')}; [ ] Execute Action Items: ${finalReport.action_items.replace(/;/g, ',')}`,
            hours_planned: 2,
            status: 'To Do',
            notes: 'Auto-generated from AI Mock Interview feedback.',
          });
        } catch (e) {
          console.error("Failed to auto-create daily plan", e);
        }
      }

      if (onSaveComplete) onSaveComplete();
      onClose();
    } catch (e) {
      alert("Failed to save: " + e.message);
    }
  };

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <div style={styles.header}>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            🎤 AI Mock Interview {phase === 'chat' && <span style={{ fontSize: '0.8rem', background: 'var(--accent-glow)', color: 'var(--accent)', padding: '0.2rem 0.6rem', borderRadius: '1rem', marginLeft: '0.5rem' }}>Q{questionCount}/{MAX_QUESTIONS}</span>}
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.5rem', color: 'var(--text-muted)', cursor: 'pointer' }}>✕</button>
        </div>

        {/* Setup Phase */}
        {phase === 'setup' && (
          <div style={{ padding: '3rem', textAlign: 'center', flex: 1 }}>
            <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🤖</div>
            <h2 style={{ marginBottom: '0.5rem' }}>Start a Mock Interview</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>AI will ask you {MAX_QUESTIONS} questions, evaluate your answers, and provide a final score.</p>
            
            <div style={{ maxWidth: '400px', margin: '0 auto', textAlign: 'left' }}>
              <label className="form-label">Interview Type</label>
              <select className="form-control" value={type} onChange={e => setType(e.target.value)} style={{ marginBottom: '1.5rem' }}>
                {INTERVIEW_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              
              <div style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: 'var(--radius-md)' }}>
                <input 
                  type="checkbox" 
                  id="voiceToggle" 
                  checked={voiceEnabled} 
                  onChange={e => setVoiceEnabled(e.target.checked)}
                  style={{ width: '1.25rem', height: '1.25rem', cursor: 'pointer' }}
                />
                <label htmlFor="voiceToggle" style={{ cursor: 'pointer', fontWeight: 600, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  🎙️ Enable Voice Mode (Read AI responses aloud)
                </label>
              </div>

              <button className="btn btn-primary" style={{ width: '100%', padding: '1rem' }} onClick={startInterview}>
                ▶ Start Interview
              </button>
            </div>
          </div>
        )}

        {/* Chat Phase */}
        {phase === 'chat' && (
          <>
            <div style={styles.chatArea} ref={chatRef}>
              {messages.map((m, i) => (
                <div key={i} style={m.role === 'user' ? styles.msgUser : styles.msgAI}>
                  <div className="markdown-body" style={{ color: 'inherit' }}>
                    {m.role === 'user' ? m.content : <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown>}
                  </div>
                </div>
              ))}
              {isAiTyping && (
                <div style={styles.msgAI}>
                  <div className="chat-loading"><div className="typing-dot"></div><div className="typing-dot"></div><div className="typing-dot"></div></div>
                </div>
              )}
            </div>
            <div style={styles.inputArea}>
              <button 
                onClick={toggleListening} 
                title={isListening ? "Stop Listening" : "Start Voice Input"}
                style={{ 
                  background: isListening ? 'var(--danger)' : 'var(--bg-card)', 
                  border: isListening ? 'none' : '1px solid var(--border)',
                  color: isListening ? 'white' : 'var(--text-primary)',
                  borderRadius: '50%', width: '3.5rem', height: '3.5rem', 
                  display: 'flex', alignItems: 'center', justifyContent: 'center', 
                  fontSize: '1.5rem', cursor: 'pointer', transition: 'all 0.2s',
                  boxShadow: isListening ? '0 0 15px var(--danger)' : 'none',
                  animation: isListening ? 'pulse 1.5s infinite' : 'none',
                  flexShrink: 0
                }}
              >
                {isListening ? '🛑' : '🎤'}
              </button>

              <textarea 
                style={styles.textarea} 
                value={inputVal} 
                onChange={e => setInputVal(e.target.value)}
                onKeyDown={e => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                placeholder="Type your answer or use the mic... (Enter to send, Shift+Enter for new line)"
                disabled={isAiTyping}
              />
              <button className="btn btn-primary" style={{ padding: '1rem 1.5rem', flexShrink: 0 }} onClick={handleSend} disabled={isAiTyping || !inputVal.trim()}>
                Send ↗
              </button>
            </div>
          </>
        )}

        {/* Results Phase */}
        {phase === 'results' && finalReport && (
          <div style={{ padding: '3rem', flex: 1, overflowY: 'auto' }}>
            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
              <div style={{ width: '120px', height: '120px', borderRadius: '50%', border: `6px solid ${finalReport.score >= 7 ? 'var(--success)' : 'var(--warning)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.5rem', fontWeight: 800, margin: '0 auto 1rem', color: finalReport.score >= 7 ? 'var(--success)' : 'var(--warning)' }}>
                {finalReport.score}/10
              </div>
              <h2>Interview Complete!</h2>
              <p style={{ color: 'var(--text-secondary)' }}>{finalReport.detailed_feedback}</p>
            </div>

            <div style={{ display: 'grid', gap: '1.5rem', gridTemplateColumns: '1fr 1fr' }}>
              <div style={{ background: 'var(--bg-main)', padding: '1.5rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)' }}>
                <h3 style={{ color: 'var(--success)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>🌟 Strengths</h3>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{finalReport.strengths}</p>
              </div>
              <div style={{ background: 'var(--bg-main)', padding: '1.5rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)' }}>
                <h3 style={{ color: 'var(--danger)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>⚠️ Areas to Improve</h3>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{finalReport.weak_areas}</p>
              </div>
            </div>

            <div style={{ background: 'var(--bg-main)', padding: '1.5rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)', marginTop: '1.5rem', marginBottom: '2rem' }}>
              <h3 style={{ color: 'var(--accent)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>🎯 Action Items</h3>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{finalReport.action_items}</p>
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem' }}>
              <button className="btn btn-ghost" onClick={() => { setPhase('setup'); setMessages([]); setQuestionCount(0); setFinalReport(null); }}>🔄 Try Another</button>
              <button className="btn btn-primary" onClick={handleSaveRecord}>💾 Save Record</button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
