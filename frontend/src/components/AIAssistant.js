import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { useNavigate } from 'react-router';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import axios from 'axios';
import API_BASE_URL from '../api/config';

const SUGGESTED_CHIPS = [
  "How can I improve my Python confidence? 💡",
  "Generate FAANG mock questions checklist 🎯",
  "Explain dynamic programming analogy 🧠",
  "Create an SQL optimization study plan 📊"
];

export default function AIAssistant() {
  const [apiKey, setApiKey] = useState(null);
  const [messages, setMessages] = useState(() => {
    const saved = localStorage.getItem('AI_CHAT_HISTORY');
    return saved ? JSON.parse(saved) : [
      { role: 'model', text: "Hello! I'm your AI Interview Tutor. I can generate mock questions, evaluate your answers, or explain complex technical concepts. What would you like to study today?" }
    ];
  });
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [includeContext, setIncludeContext] = useState(true);
  
  const messagesEndRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const key = localStorage.getItem('AI_API_KEY');
    setApiKey(key);
  }, []);

  useEffect(() => {
    localStorage.setItem('AI_CHAT_HISTORY', JSON.stringify(messages));
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendPrompt = async (promptText) => {
    if (!promptText.trim() || !apiKey) return;

    const userMessage = { role: 'user', text: promptText.trim() };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const gatewayUrl = localStorage.getItem('AI_GATEWAY_URL') || 'https://generativelanguage.googleapis.com/v1beta/models';
      let modelName = localStorage.getItem('AI_MODEL') || 'gemini-1.5-flash';
      if (modelName === 'gemini-2.5-flash') {
        modelName = 'gemini-1.5-flash';
      }

      let enrichedPrompt = promptText.trim();
      
      if (includeContext) {
        try {
          // Fetch target companies and dashboard stats
          const [summaryRes, targetsRes] = await Promise.all([
            axios.get(`${API_BASE_URL}/analytics/summary`),
            axios.get(`${API_BASE_URL}/targetcompanies/`)
          ]);
          
          const counts = summaryRes.data.counts || {};
          const streak = summaryRes.data.current_streak || 0;
          const targetCompanies = targetsRes.data.map(tc => tc.company).join(', ');

          const systemContext = `[System Context: The user is preparing for technical interviews. Here is their progress tracker state:
- Current Streak: ${streak} days
- Study sessions completed: ${counts.total_plans || 0}
- Finished milestone projects: ${counts.completed_milestones || 0}
- Target companies: ${targetCompanies || 'None recorded'}
- Total job applications: ${counts.total_apps || 0}
Please customize your tutoring responses to align with these facts where helpful.]\n\n`;

          enrichedPrompt = systemContext + enrichedPrompt;
        } catch (ctxErr) {
          console.error("Failed to inject system context into prompt:", ctxErr);
        }
      }

      let text = '';

      if (/generativelanguage\.googleapis\.com/.test(gatewayUrl)) {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({
          model: modelName,
          systemInstruction: "You are an expert technical interviewer and study tutor. Help the user prepare for software engineering and data engineering interviews. Provide concise, accurate, and encouraging responses. When providing code, use markdown code blocks.",
        });

        // Format previous messages for chat history
        const history = messages.slice(1).map(msg => ({
          role: msg.role === 'model' ? 'model' : 'user',
          parts: [{ text: msg.text }],
        }));

        const chat = model.startChat({ history });
        const result = await chat.sendMessage(enrichedPrompt);
        const response = await result.response;
        text = response.text();
      } else {
        // OpenAI-compatible custom gateway integration
        const url = gatewayUrl.endsWith('/v1/chat/completions') ? gatewayUrl : `${gatewayUrl.replace(/\/$/, '')}/v1/chat/completions`;
        const messagesPayload = [
          { 
            role: 'system', 
            content: "You are an expert technical interviewer and study tutor. Help the user prepare for software engineering and data engineering interviews. Provide concise, accurate, and encouraging responses. When providing code, use markdown code blocks." 
          },
          ...messages.slice(1).map(msg => ({
            role: msg.role === 'model' ? 'assistant' : 'user',
            content: msg.text
          })),
          { role: 'user', content: enrichedPrompt }
        ];

        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model: modelName,
            messages: messagesPayload,
            temperature: 0.7
          })
        });

        if (!response.ok) {
          const errText = await response.text();
          throw new Error(`HTTP ${response.status}: ${errText}`);
        }

        const data = await response.json();
        text = data.choices?.[0]?.message?.content || JSON.stringify(data);
      }

      setMessages(prev => [...prev, { role: 'model', text }]);
    } catch (error) {
      console.error("AI API Error:", error);
      let errorMessage = "Sorry, I encountered an error communicating with the AI service. ";
      
      if (error.message?.includes('API key not valid')) {
        errorMessage += "Your API key appears to be invalid.";
      } else {
        errorMessage += error.message || "Please check your network and API key.";
      }
      
      setMessages(prev => [...prev, { role: 'model', text: `❌ **Error**: ${errorMessage}` }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSend = (e) => {
    e.preventDefault();
    handleSendPrompt(input);
  };

  const handleClearHistory = () => {
    if (window.confirm("Clear all AI Tutor conversation logs?")) {
      setMessages([
        { role: 'model', text: "Hello! I'm your AI Interview Tutor. I can generate mock questions, evaluate your answers, or explain complex technical concepts. What would you like to study today?" }
      ]);
    }
  };

  if (!apiKey) {
    return (
      <div className="section-card" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🤖</div>
        <h3 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>AI Tutor Not Configured</h3>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', maxWidth: '400px', margin: '0 auto 2rem' }}>
          Please add your Gemini API Key in the settings to start chatting with the AI Tutor.
        </p>
        <button className="btn btn-primary" onClick={() => navigate('/settings')}>
          ⚙️ Go to Settings
        </button>
      </div>
    );
  }

  return (
    <div className="section-card ai-assistant-card" style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 120px)', padding: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexShrink: 0 }}>
        <h2 className="section-title" style={{ margin: 0 }}>
          <span className="section-title-emoji">🤖</span> AI Tutor
        </h2>
        <button 
          onClick={handleClearHistory} 
          className="btn btn-ghost" 
          style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
          title="Clear Conversation Logs"
        >
          🗑️ Clear History
        </button>
      </div>
      
      <div className="chat-container">
        {messages.map((msg, idx) => (
          <div key={idx} className={`chat-message-wrapper ${msg.role === 'user' ? 'chat-message-right' : 'chat-message-left'}`}>
            {msg.role === 'model' && <div className="chat-avatar model-avatar">🤖</div>}
            <div className={`chat-bubble ${msg.role === 'user' ? 'chat-bubble-user' : 'chat-bubble-model'}`}>
              <div className="markdown-body">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {msg.text}
                </ReactMarkdown>
              </div>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="chat-message-wrapper chat-message-left">
            <div className="chat-avatar model-avatar">🤖</div>
            <div className="chat-bubble chat-bubble-model chat-loading">
              <div className="typing-dot"></div>
              <div className="typing-dot"></div>
              <div className="typing-dot"></div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {/* Suggestion Chips & Context Toggle Toolbar */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
            {SUGGESTED_CHIPS.map((chip, i) => (
              <button
                key={i}
                className="btn btn-ghost"
                onClick={() => handleSendPrompt(chip.replace(/ [💡🎯🧠📊]/, ''))}
                disabled={isLoading}
                style={{ 
                  padding: '0.3rem 0.6rem', 
                  fontSize: '0.78rem', 
                  borderRadius: '2rem',
                  background: 'var(--bg-main)'
                }}
              >
                {chip}
              </button>
            ))}
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
            <input 
              type="checkbox" 
              id="ctx-toggle" 
              checked={includeContext} 
              onChange={(e) => setIncludeContext(e.target.checked)} 
              style={{ cursor: 'pointer', width: '14px', height: '14px' }}
            />
            <label htmlFor="ctx-toggle" style={{ cursor: 'pointer', fontWeight: 600 }}>
              🧬 Include study context (stats & targets)
            </label>
          </div>
        </div>

        <form className="chat-input-area" onSubmit={handleSend}>
          <input
            type="text"
            className="form-control chat-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask me a question or request a mock interview..."
            disabled={isLoading}
          />
          <button type="submit" className="btn btn-primary chat-send-btn" disabled={isLoading || !input.trim()}>
            {isLoading ? '⏳' : 'Send'}
          </button>
        </form>
      </div>
    </div>
  );
}
