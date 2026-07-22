import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import API_BASE_URL from '../api/config';

export default function Register() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  
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

  const getPasswordStrength = (pwd) => {
    let score = 0;
    if (pwd.length >= 8) score += 1;
    if (pwd.length >= 12) score += 1;
    if (/[A-Z]/.test(pwd)) score += 1;
    if (/[0-9]/.test(pwd)) score += 1;
    if (/[^A-Za-z0-9]/.test(pwd)) score += 1;
    return Math.min(score, 4);
  };

  const validateEmail = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!validateEmail(username)) {
      setError("Please enter a valid email address");
      return;
    }
    
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (getPasswordStrength(password) < 2) {
      setError("Password is too weak. Please use a stronger password.");
      return;
    }
    
    setLoading(true);
    try {
      await axios.post(`${API_BASE_URL}/auth/register`, {
        username,
        password
      });
      navigate('/login');
    } catch (err) {
      setError(err.response?.data?.detail || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      minHeight: '100vh', 
      background: 'radial-gradient(circle at top right, #0f172a, #1e1b4b)',
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
        background: 'radial-gradient(circle, rgba(99,102,241,0.15) 0%, rgba(99,102,241,0) 70%)',
        borderRadius: '50%',
        pointerEvents: 'none',
        transition: 'top 0.4s ease-out, left 0.4s ease-out',
        zIndex: 0
      }} />

      {/* Glassmorphism Card */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.03)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        padding: '3.5rem 3rem', borderRadius: '24px',
        boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.4)',
        width: '100%', maxWidth: '420px', 
        border: '1px solid rgba(255, 255, 255, 0.08)',
        zIndex: 1,
        animation: 'fadeInUp 0.8s ease-out forwards'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <div style={{
            width: '64px', height: '64px', margin: '0 auto 1.5rem',
            background: 'linear-gradient(135deg, #6366f1, #a855f7)',
            borderRadius: '16px', display: 'flex', alignItems: 'center',
            justifyContent: 'center', fontSize: '2rem', boxShadow: '0 8px 24px rgba(99,102,241,0.4)'
          }}>
            🌟
          </div>
          <h1 style={{ fontSize: '2rem', fontWeight: 700, margin: '0 0 0.5rem', letterSpacing: '-0.02em', background: 'linear-gradient(to right, #fff, #e2e8f0)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Create Account
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.95rem' }}>Join to start tracking your progress</p>
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

        <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ position: 'relative' }}>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'rgba(255,255,255,0.7)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Username</label>
            <input 
              type="text" 
              value={username} 
              onChange={e => setUsername(e.target.value)} 
              required 
              style={{ 
                width: '100%', padding: '0.9rem 1.25rem',
                background: 'rgba(0, 0, 0, 0.2)', border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '12px', color: '#fff', fontSize: '1rem',
                outline: 'none', transition: 'all 0.3s ease',
                boxSizing: 'border-box'
              }}
              onFocus={(e) => e.target.style.border = '1px solid #6366f1'}
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
                width: '100%', padding: '0.9rem 1.25rem',
                background: 'rgba(0, 0, 0, 0.2)', border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '12px', color: '#fff', fontSize: '1rem',
                outline: 'none', transition: 'all 0.3s ease',
                boxSizing: 'border-box'
              }}
              onFocus={(e) => e.target.style.border = '1px solid #6366f1'}
              onBlur={(e) => e.target.style.border = '1px solid rgba(255, 255, 255, 0.1)'}
            />
            {/* Password Strength Meter */}
            {password.length > 0 && (
              <div style={{ marginTop: '0.5rem', display: 'flex', gap: '4px', height: '4px' }}>
                {[1, 2, 3, 4].map(level => {
                  const strength = getPasswordStrength(password);
                  let bgColor = 'rgba(255,255,255,0.1)';
                  if (level <= strength) {
                    if (strength <= 1) bgColor = '#ef4444'; // Red
                    else if (strength === 2) bgColor = '#f59e0b'; // Yellow
                    else if (strength === 3) bgColor = '#10b981'; // Green
                    else bgColor = '#8b5cf6'; // Purple (Very strong)
                  }
                  return (
                    <div key={level} style={{ flex: 1, borderRadius: '2px', background: bgColor, transition: 'background 0.3s' }} />
                  );
                })}
              </div>
            )}
            {password.length > 0 && (
              <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)', marginTop: '0.25rem', textAlign: 'right' }}>
                {['Weak', 'Fair', 'Good', 'Strong'][Math.max(0, getPasswordStrength(password) - 1)] || 'Too Short'}
              </div>
            )}
          </div>
          <div style={{ position: 'relative' }}>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'rgba(255,255,255,0.7)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Confirm Password</label>
            <input 
              type="password" 
              value={confirmPassword} 
              onChange={e => setConfirmPassword(e.target.value)} 
              required 
              style={{ 
                width: '100%', padding: '0.9rem 1.25rem',
                background: 'rgba(0, 0, 0, 0.2)', border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '12px', color: '#fff', fontSize: '1rem',
                outline: 'none', transition: 'all 0.3s ease',
                boxSizing: 'border-box'
              }}
              onFocus={(e) => e.target.style.border = '1px solid #6366f1'}
              onBlur={(e) => e.target.style.border = '1px solid rgba(255, 255, 255, 0.1)'}
            />
          </div>
          <button 
            type="submit" 
            style={{ 
              width: '100%', marginTop: '1rem', padding: '1.1rem', fontSize: '1.05rem', 
              fontWeight: 600, background: 'linear-gradient(135deg, #6366f1, #a855f7)', 
              color: '#fff', border: 'none', borderRadius: '12px', cursor: 'pointer',
              boxShadow: '0 8px 24px rgba(99,102,241,0.3)',
              transition: 'transform 0.2s ease, boxShadow 0.2s ease',
              opacity: loading ? 0.7 : 1, pointerEvents: loading ? 'none' : 'auto'
            }}
            onMouseOver={(e) => {
              e.target.style.transform = 'translateY(-2px)';
              e.target.style.boxShadow = '0 12px 32px rgba(99,102,241,0.4)';
            }}
            onMouseOut={(e) => {
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = '0 8px 24px rgba(99,102,241,0.3)';
            }}
          >
            {loading ? 'Creating Account...' : 'Sign Up'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '2rem', fontSize: '0.95rem', color: 'rgba(255,255,255,0.6)' }}>
          Already have an account? <Link to="/login" style={{ color: '#a855f7', fontWeight: 600, textDecoration: 'none', transition: 'color 0.2s ease' }}>Log in here</Link>
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
