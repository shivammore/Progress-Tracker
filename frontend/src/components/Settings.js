import React, { useState, useEffect } from 'react';
import API_BASE_URL from '../api/config';
import callAI from '../api/aiApi';


export default function Settings() {
  const [gatewayUrl, setGatewayUrl] = useState('https://generativelanguage.googleapis.com/v1beta/models');
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('gemini-1.5-flash');
  const [saved, setSaved] = useState(false);
  const [testStatus, setTestStatus] = useState(null); // { loading, error, success }
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light');

  useEffect(() => {
    const url = localStorage.getItem('AI_GATEWAY_URL');
    const key = localStorage.getItem('AI_API_KEY');
    const mdl = localStorage.getItem('AI_MODEL');
    if (url) setGatewayUrl(url);
    if (key) setApiKey(key);
    if (mdl) {
      if (mdl === 'gemini-2.5-flash') {
        setModel('gemini-1.5-flash');
        localStorage.setItem('AI_MODEL', 'gemini-1.5-flash');
      } else {
        setModel(mdl);
      }
    }
  }, []);

  const handleSave = (e) => {
    e.preventDefault();
    if (gatewayUrl.trim()) {
      localStorage.setItem('AI_GATEWAY_URL', gatewayUrl.trim());
    } else {
      localStorage.removeItem('AI_GATEWAY_URL');
    }
    if (apiKey.trim()) {
      localStorage.setItem('AI_API_KEY', apiKey.trim());
    } else {
      localStorage.removeItem('AI_API_KEY');
    }
    if (model.trim()) {
      localStorage.setItem('AI_MODEL', model.trim());
    } else {
      localStorage.removeItem('AI_MODEL');
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleTestApi = async () => {
    setTestStatus({ loading: true, error: null, success: false });
    try {
      const response = await callAI("Respond with exactly the word: 'Success'");
      if (response && response.includes('Success')) {
        setTestStatus({ loading: false, error: null, success: true });
      } else {
        setTestStatus({ loading: false, error: "Unexpected response: " + response.substring(0, 50), success: false });
      }
    } catch (err) {
      setTestStatus({ loading: false, error: err.message, success: false });
    }
  };

  const handleThemeToggle = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  const handleImport = (e) => {
    const file = e.target.files[0];
    if (file) {
      alert(`Import feature coming soon! Selected: ${file.name}`);
      e.target.value = null; // reset
    }
  };

  const handleExport = () => {
    window.location.href = `${API_BASE_URL}/export/csv`;
  };

  return (
    <div className="section-card">
      <h2 className="section-title">⚙️ Settings</h2>
      
      <div className="form-container" style={{ maxWidth: '600px', margin: '0 auto' }}>
        <h3>AI Assistant Configuration</h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
          Configure your AI assistant connection. You can use Gemini, OpenAI, or a custom gateway.<br/>
          All values are stored securely in your browser's local storage and are never sent to our backend servers.
        </p>

        <form onSubmit={handleSave}>
          <div style={{ marginBottom: '1.5rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button type="button" onClick={() => { setGatewayUrl('https://generativelanguage.googleapis.com/v1beta/models'); setModel('gemini-1.5-flash'); }} className="btn btn-secondary" style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}>🔵 Gemini Preset</button>
            <button type="button" onClick={() => { setGatewayUrl('https://api.openai.com/v1'); setModel('gpt-4o-mini'); }} className="btn btn-secondary" style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}>🟢 OpenAI Preset</button>
            <button type="button" onClick={() => { setGatewayUrl('http://localhost:11434/v1'); setModel('llama3'); setApiKey('local'); }} className="btn btn-secondary" style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}>🦙 Ollama (Local) Preset</button>
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.85rem' }}>
              Gateway URL
            </label>
            <input
              type="text"
              className="form-control"
              value={gatewayUrl}
              onChange={(e) => setGatewayUrl(e.target.value)}
              placeholder="https://generativelanguage.googleapis.com/v1beta/models"
              style={{ width: '100%' }}
            />
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.85rem' }}>
              API Key
            </label>
            <input
              type="password"
              className="form-control"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Your API Key..."
              style={{ width: '100%' }}
            />
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.3rem' }}>
              For local LLMs like Ollama, you can just type "local".
            </div>
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.85rem' }}>
              Model Name
            </label>
            <input
              type="text"
              className="form-control"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder="gemini-2.5-flash, gpt-4, etc."
              style={{ width: '100%' }}
            />
          </div>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <button type="submit" className="btn btn-primary">
              💾 Save Settings
            </button>
            <button type="button" className="btn btn-secondary" onClick={handleTestApi} disabled={testStatus?.loading}>
              {testStatus?.loading ? '⏳ Testing...' : '🔌 Test Connection'}
            </button>
            {saved && (
              <span style={{ color: 'var(--success)', fontSize: '0.85rem', fontWeight: 600 }}>
                ✓ Saved successfully!
              </span>
            )}
          </div>
          
          {testStatus?.success && (
            <div style={{ marginTop: '1rem', padding: '0.75rem', background: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)', borderRadius: '8px', border: '1px solid var(--success)', fontSize: '0.85rem' }}>
              ✅ API Connection Successful! Your AI Assistant is ready.
            </div>
          )}
          {testStatus?.error && (
            <div style={{ marginTop: '1rem', padding: '0.75rem', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', borderRadius: '8px', border: '1px solid var(--danger)', fontSize: '0.85rem' }}>
              ❌ Connection Failed: {testStatus.error}
            </div>
          )}
        </form>

        <div style={{ marginTop: '2rem', padding: '1rem', background: 'var(--info-bg)', borderRadius: 'var(--radius-md)', border: '1px solid #bfdbfe' }}>
          <h4 style={{ color: 'var(--info)', marginBottom: '0.5rem', fontSize: '0.9rem' }}>ℹ️ How to get an API Key?</h4>
          <ol style={{ paddingLeft: '1.2rem', color: 'var(--text-secondary)', fontSize: '0.85rem', margin: 0 }}>
            <li>Go to <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" style={{ color: 'var(--info)', textDecoration: 'none' }}>Google AI Studio</a>.</li>
            <li>Sign in with your Google account.</li>
            <li>Click "Create API key" and copy it into the field above.</li>
          </ol>
        </div>
      </div>

      <div className="form-container" style={{ maxWidth: '600px', margin: '2rem auto 0 auto' }}>
        <h3>Appearance</h3>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: 'var(--bg-main)', borderRadius: '8px', border: '1px solid var(--border)' }}>
          <div>
            <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>Color Theme</div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Toggle between light and dark mode.</div>
          </div>
          <button onClick={handleThemeToggle} className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {theme === 'dark' ? '☀️ Light Mode' : '🌙 Dark Mode'}
          </button>
        </div>
      </div>

      <div className="form-container" style={{ maxWidth: '600px', margin: '2rem auto 0 auto' }}>
        <h3>Backup & Data Export</h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
          Download a complete backup of your Progress Tracker database. 
          This compiles and downloads all 9 database tables (study logs, target companies, milestones, daily plans, job applications, offers, mock interviews, reminders, and question bank) as individual CSV spreadsheets packed into a single, light ZIP archive.
        </p>

        <div style={{ display: 'flex', gap: '1rem' }}>
          <button 
            onClick={handleExport} 
            className="btn btn-primary" 
            style={{ 
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', 
              boxShadow: '0 4px 12px rgba(16, 185, 129, 0.25)',
              border: 'none',
              color: 'white',
              padding: '0.6rem 1.2rem',
              fontWeight: 700
            }}
          >
            📥 Export All Data (ZIP)
          </button>
          
          <label className="btn btn-secondary" style={{ cursor: 'pointer', padding: '0.6rem 1.2rem', fontWeight: 700 }}>
            📤 Import Data
            <input type="file" accept=".zip,.csv,.json" style={{ display: 'none' }} onChange={handleImport} />
          </label>
        </div>
      </div>
    </div>
  );
}
