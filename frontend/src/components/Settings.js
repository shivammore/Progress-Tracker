import React, { useState, useEffect } from 'react';
import API_BASE_URL from '../api/config';


export default function Settings() {
  const [gatewayUrl, setGatewayUrl] = useState('https://generativelanguage.googleapis.com/v1beta/models');
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('gemini-2.5-flash');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const url = localStorage.getItem('AI_GATEWAY_URL');
    const key = localStorage.getItem('AI_API_KEY');
    const mdl = localStorage.getItem('AI_MODEL');
    if (url) setGatewayUrl(url);
    if (key) setApiKey(key);
    if (mdl) setModel(mdl);
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
          <button type="submit" className="btn btn-primary">
            💾 Save Settings
          </button>
          {saved && (
            <span style={{ marginLeft: '1rem', color: 'var(--success)', fontSize: '0.85rem', fontWeight: 600 }}>
              ✓ Saved successfully!
            </span>
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
        <h3>Backup & Data Export</h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
          Download a complete backup of your Progress Tracker database. 
          This compiles and downloads all 9 database tables (study logs, target companies, milestones, daily plans, job applications, offers, mock interviews, reminders, and question bank) as individual CSV spreadsheets packed into a single, light ZIP archive.
        </p>

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
      </div>
    </div>
  );
}
