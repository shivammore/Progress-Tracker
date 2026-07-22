import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, NavLink, useLocation } from 'react-router';
import axios from 'axios';

import Dashboard from './components/Dashboard';
import DailyPlanList from './components/DailyPlanList';
import JobAppList from './components/JobAppList';
import StudyLogList from './components/StudyLogList';
import MockInterviewList from './components/MockInterviewList';
import MilestoneList from './components/MilestoneList';
import GoalList from './components/GoalList';
import QuestionBankList from './components/QuestionBankList';
import OfferList from './components/OfferList';
import ReminderList from './components/ReminderList';
import TargetCompanyList from './components/TargetCompanyList';
import RoadmapPage from './RoadmapPage';
import AIAssistant from './components/AIAssistant';
import Settings from './components/Settings';
import StudyAnalytics from './components/StudyAnalytics';
import GlobalSearch from './components/GlobalSearch';
import API_BASE_URL from './api/config';

import { Navigate } from 'react-router';
import { AuthContext } from './context/AuthContext';
import Login from './components/Login';
import Register from './components/Register';
import CodePlayground from './components/CodePlayground';
import AgenticProjectHub from './components/AgenticProjectHub';
import WeeklyReview from './components/WeeklyReview';


const navSections = [
  {
    label: 'Overview',
    items: [
      { path: '/', icon: '📊', label: 'Dashboard' },
    ],
  },
  {
    label: 'Planning',
    items: [
      { path: '/goals', icon: '🎯', label: 'Long-Term Goals' },
      { path: '/daily', icon: '📅', label: 'Daily Plans' },
      { path: '/roadmap', icon: '🗺️', label: 'Roadmap' },
      { path: '/weekly-review', icon: '📅', label: 'Weekly Review' },
      { path: '/reminders', icon: '🔔', label: 'Reminders' },
    ],
  },
  {
    label: 'Preparation',
    items: [
      { path: '/questions', icon: '💡', label: 'Question Bank' },
      { path: '/study', icon: '📚', label: 'Study Logs' },
      { path: '/analytics', icon: '📈', label: 'Analytics' },
      { path: '/mock', icon: '🎤', label: 'Mock Interviews' },
      { path: '/playground', icon: '💻', label: 'Code Playground' },
      { path: '/agentic-projects', icon: '🛠️', label: 'Agentic Projects' },
      { path: '/milestones', icon: '🚀', label: 'Projects' },
    ],
  },
  {
    label: 'Job Hunt',
    items: [
      { path: '/targets', icon: '🎯', label: 'Target Companies' },
      { path: '/jobs', icon: '🏢', label: 'Applications' },
      { path: '/offers', icon: '💰', label: 'Offers' },
    ],
  },
  {
    label: 'AI & Config',
    items: [
      { path: '/ai-assistant', icon: '🤖', label: 'AI Tutor' },
      { path: '/settings', icon: '⚙️', label: 'Settings' },
    ],
  },
];

const routes = [
  { path: '/', element: <Dashboard /> },
  { path: '/goals', element: <SectionPage title="🎯 Long-Term Goals"><GoalList /></SectionPage> },
  { path: '/daily', element: <SectionPage title="📅 Daily Plans"><DailyPlanList /></SectionPage> },
  { path: '/jobs', element: <SectionPage title="🏢 Job Applications"><JobAppList /></SectionPage> },
  { path: '/study', element: <SectionPage title="📚 Study Logs"><StudyLogList /></SectionPage> },
  { path: '/analytics', element: <SectionPage title="📈 Study Analytics"><StudyAnalytics /></SectionPage> },
  { path: '/mock', element: <SectionPage title="🎤 Mock Interviews"><MockInterviewList /></SectionPage> },
  { path: '/milestones', element: <SectionPage title="🚀 Project Milestones"><MilestoneList /></SectionPage> },
  { path: '/questions', element: <SectionPage title="💡 Question Bank"><QuestionBankList /></SectionPage> },
  { path: '/offers', element: <SectionPage title="💰 Offers"><OfferList /></SectionPage> },
  { path: '/reminders', element: <SectionPage title="🔔 Reminders"><ReminderList /></SectionPage> },
  { path: '/targets', element: <SectionPage title="🎯 Target Companies"><TargetCompanyList /></SectionPage> },
  { path: '/roadmap', element: <SectionPage title="🗺️ 8-Week Roadmap"><RoadmapPage /></SectionPage> },
  { path: '/ai-assistant', element: <AIAssistant /> },
  { path: '/settings', element: <Settings /> },
  { path: '/playground', element: <SectionPage title="💻 Code Playground"><CodePlayground /></SectionPage> },
  { path: '/agentic-projects', element: <AgenticProjectHub /> },
  { path: '/weekly-review', element: <WeeklyReview /> },
  { path: '*', element: <Navigate to="/" replace /> },
];

function SectionPage({ title, children }) {
  return (
    <div className="section-page page-transition">
      <div className="section-card">
        <h2 className="section-title">{title}</h2>
        {children}
      </div>
    </div>
  );
}

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
}


function TopBar() {
  const [isEditing, setIsEditing] = useState(false);
  const { user, logout } = React.useContext(AuthContext);
  const [name, setName] = useState(user ? user.username : 'User');
  const [role, setRole] = useState(localStorage.getItem('userRole') || 'Software Engineer');
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');

  useEffect(() => {
    if (user && user.username !== name) {
        setName(user.username);
    }
  }, [user, name]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const handleSave = () => {
    localStorage.setItem('userRole', role);
    setIsEditing(false);
  };

  const getInitials = (n) => {
    if (!n) return 'U';
    return n.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();
  };

  const triggerSearch = () => {
    const event = new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true });
    window.dispatchEvent(event);
  };

  return (
    <div className="top-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <div 
        className="top-bar-search-trigger" 
        onClick={triggerSearch}
        style={{
          display: 'flex', alignItems: 'center', gap: '0.5rem',
          padding: '0.45rem 0.9rem', background: 'var(--bg-main)',
          border: '1px solid var(--border)', borderRadius: 'var(--radius-md)',
          fontSize: '0.85rem', color: 'var(--text-secondary)',
          cursor: 'pointer', minWidth: '220px', userSelect: 'none',
          transition: 'all var(--transition)'
        }}
      >
        <span>🔍</span>
        <span style={{ flex: 1, textAlign: 'left' }}>Search...</span>
        <kbd style={{
          fontSize: '0.7rem', background: 'var(--border)', 
          padding: '0.1rem 0.35rem', borderRadius: '4px',
          fontWeight: 'bold', color: 'var(--text-muted)',
          fontFamily: 'inherit'
        }}>Ctrl+K</kbd>
      </div>

      <div className="top-bar-user">
        {isEditing ? (
          <div className="user-edit-form">
            <input value={role} onChange={e => setRole(e.target.value)} className="form-control user-edit-input" placeholder="Designation" />
            <button onClick={handleSave} className="btn btn-primary" style={{ padding: '0.4rem 0.8rem' }}>Save</button>
            <button onClick={() => setIsEditing(false)} className="btn btn-secondary" style={{ padding: '0.4rem 0.8rem' }}>Cancel</button>
          </div>
        ) : (
          <>
            <button 
              onClick={toggleTheme} 
              style={{ background: 'transparent', border: 'none', fontSize: '1.2rem', cursor: 'pointer', marginRight: '0.5rem', transition: 'transform 0.2s' }}
              title="Toggle Dark Mode"
            >
              {theme === 'dark' ? '☀️' : '🌙'}
            </button>
            <div className="top-bar-user-info">
              <div className="top-bar-user-name">{name}</div>
              <div className="top-bar-user-role">{role}</div>
            </div>
            <div className="sidebar-avatar cursor-pointer" onClick={() => setIsEditing(true)} title="Edit Profile">
              {getInitials(name)}
            </div>
            <button onClick={logout} className="btn btn-danger" style={{ marginLeft: '1rem', padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}>
              Logout
            </button>
          </>
        )}
      </div>
    </div>
  );
}
function Sidebar({ open, onClose }) {
  const [badges, setBadges] = useState({ reminders: 0, jobs: 0, questions: 0 });

  useEffect(() => {
    axios.get(`${API_BASE_URL}/analytics/summary`)
      .then(res => {
        const data = res.data;
        setBadges({
          reminders: data.upcoming_reminders ? data.upcoming_reminders.length : 0,
          jobs: data.counts ? data.counts.total_apps : 0,
          questions: 0 // Will implement real spaced repetition badge later
        });
      })
      .catch(e => console.error(e));
  }, []);

  return (
    <aside className={`sidebar ${open ? 'open' : ''}`}>
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">🚀</div>
          <div className="sidebar-logo-text">
            Progress Tracker
            <span>Interview Prep</span>
          </div>
        </div>
      </div>
      <nav className="sidebar-nav">
        {navSections.map((section) => (
          <React.Fragment key={section.label}>
            <div className="sidebar-section-label">{section.label}</div>
            {section.items.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/'}
                className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}
                onClick={onClose}
              >
                <span className="nav-link-icon">{item.icon}</span>
                {item.label}
                {item.path === '/reminders' && badges.reminders > 0 && <span className="nav-link-badge" style={{background: 'var(--danger)', color: 'white'}}>{badges.reminders}</span>}
                {item.path === '/questions' && badges.questions > 0 && <span className="nav-link-badge" style={{background: 'var(--warning)', color: 'black'}}>{badges.questions}</span>}
              </NavLink>
            ))}
          </React.Fragment>
        ))}
      </nav>
    </aside>
  );
}


function MainLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <>
      <ScrollToTop />
      <GlobalSearch />
      <button className="mobile-toggle" onClick={() => setSidebarOpen(!sidebarOpen)}>
        {sidebarOpen ? '✕' : '☰'}
      </button>
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="main-content">
        <TopBar />
        <div className="router-content">
          {children}
        </div>
      </div>
    </>
  );
}

function ProtectedRoute({ children }) {
  const { user, loading } = React.useContext(AuthContext);
  
  if (loading) return null; // Or a loading spinner
  if (!user) return <Navigate to="/login" replace />;
  
  return <MainLayout>{children}</MainLayout>;
}

export default function AppRouter() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        {routes.map(r => (
          <Route key={r.path} path={r.path} element={<ProtectedRoute>{r.element}</ProtectedRoute>} />
        ))}
      </Routes>
    </Router>
  );
}
