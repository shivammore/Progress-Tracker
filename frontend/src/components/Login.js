import React, { useState, useContext, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import API_BASE_URL from '../api/config';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  useEffect(() => {
    const handleMouseMove = (e) => {
      setMousePosition({
        x: e.clientX,
        y: e.clientY
      });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const formData = new URLSearchParams();
      formData.append('username', username);
      formData.append('password', password);
      
      const res = await axios.post(`${API_BASE_URL}/auth/login`, formData, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      });
      
      login(username, res.data.access_token);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.detail || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      minHeight: '100vh', 
      background: 'radial-gradient(circle at top left, #2a0845, #6441A5)',
      position: 'relative', overflow: 'hidden', color: '#fff',
      fontFamily: "'Inter', sans-serif"
    }}>
      {/* Dynamic Background Glow */}
      <div style={{
        position: 'absolute',
        top: mousePosition.y - 300,
        left: mousePosition.x - 300,
        width: 600,
        height: 600,
        background: 'radial-gradient(circle, rgba(168,85,247,0.15) 0%, rgba(168,85,247,0) 70%)',
        borderRadius: '50%',
        pointerEvents: 'none',
        transition: 'top 0.4s ease-out, left 0.4s ease-out',
        zIndex: 0
      }} />

      {/* Glassmorphism Card */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.05)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        padding: '3.5rem 3rem', borderRadius: '24px',
        boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.3)',
        width: '100%', maxWidth: '420px', 
        border: '1px solid rgba(255, 255, 255, 0.1)',
        zIndex: 1,
        animation: 'fadeInUp 0.8s ease-out forwards'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <div style={{
            width: '64px', height: '64px', margin: '0 auto 1.5rem',
            background: 'linear-gradient(135deg, #a855f7, #ec4899)',
            borderRadius: '16px', display: 'flex', alignItems: 'center',
            justifyContent: 'center', fontSize: '2rem', boxShadow: '0 8px 24px rgba(168,85,247,0.4)'
          }}>
            🚀
          </div>
          <h1 style={{ fontSize: '2rem', fontWeight: 700, margin: '0 0 0.5rem', letterSpacing: '-0.02em', background: 'linear-gradient(to right, #fff, #cbd5e1)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Welcome Back
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.95rem' }}>Log in to track your progress</p>
        </div>

        {error && (
          <div style={{ 
            background: 'rgba(239, 68, 68, 0.1)', color: '#fca5a5', 
            padding: '1rem', borderRadius: '12px', marginBottom: '2rem', 
            fontSize: '0.9rem', textAlign: 'center', border: '1px solid rgba(239, 68, 68, 0.2)' 
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ position: 'relative' }}>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'rgba(255,255,255,0.7)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Username</label>
            <input 
              type="text" 
              value={username} 
              onChange={e => setUsername(e.target.value)} 
              required 
              style={{ 
                width: '100%', padding: '1rem 1.25rem',
                background: 'rgba(0, 0, 0, 0.2)', border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '12px', color: '#fff', fontSize: '1rem',
                outline: 'none', transition: 'all 0.3s ease',
                boxSizing: 'border-box'
              }}
              onFocus={(e) => e.target.style.border = '1px solid #a855f7'}
              onBlur={(e) => e.target.style.border = '1px solid rgba(255, 255, 255, 0.1)'}
            />
          </div>
          <div style={{ position: 'relative' }}>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'rgba(255,255,255,0.7)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Password</label>
            <input 
              type="password" 
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              required 
              style={{ 
                width: '100%', padding: '1rem 1.25rem',
                background: 'rgba(0, 0, 0, 0.2)', border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '12px', color: '#fff', fontSize: '1rem',
                outline: 'none', transition: 'all 0.3s ease',
                boxSizing: 'border-box'
              }}
              onFocus={(e) => e.target.style.border = '1px solid #a855f7'}
              onBlur={(e) => e.target.style.border = '1px solid rgba(255, 255, 255, 0.1)'}
            />
          </div>
          <button 
            type="submit" 
            style={{ 
              width: '100%', marginTop: '1rem', padding: '1.1rem', fontSize: '1.05rem', 
              fontWeight: 600, background: 'linear-gradient(135deg, #a855f7, #ec4899)', 
              color: '#fff', border: 'none', borderRadius: '12px', cursor: 'pointer',
              boxShadow: '0 8px 24px rgba(168,85,247,0.3)',
              transition: 'transform 0.2s ease, boxShadow 0.2s ease',
              opacity: loading ? 0.7 : 1, pointerEvents: loading ? 'none' : 'auto'
            }}
            onMouseOver={(e) => {
              e.target.style.transform = 'translateY(-2px)';
              e.target.style.boxShadow = '0 12px 32px rgba(168,85,247,0.4)';
            }}
            onMouseOut={(e) => {
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = '0 8px 24px rgba(168,85,247,0.3)';
            }}
          >
            {loading ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '2rem', fontSize: '0.95rem', color: 'rgba(255,255,255,0.6)' }}>
          Don't have an account? <Link to="/register" style={{ color: '#ec4899', fontWeight: 600, textDecoration: 'none', transition: 'color 0.2s ease' }}>Create one</Link>
        </div>
      </div>
      
      <style>
        {`
          @keyframes fadeInUp {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
          }
        `}
      </style>
    </div>
  );
}
