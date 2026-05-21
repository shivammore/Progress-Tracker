import re
import os

filepath = r"e:\progress_tracker\frontend\src\AppRouter.js"

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Imports
imports_to_add = """
import { Navigate } from 'react-router';
import { AuthContext } from './context/AuthContext';
import Login from './components/Login';
import Register from './components/Register';
"""
if "from './context/AuthContext'" not in content:
    content = content.replace("import API_BASE_URL from './api/config';", "import API_BASE_URL from './api/config';\n" + imports_to_add)

# 2. Modify TopBar
topbar_replacement = """
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
  }, [user]);

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
"""

# Regex replace the TopBar function completely
content = re.sub(r'function TopBar\(\) \{.*?(?=function Sidebar)', topbar_replacement, content, flags=re.DOTALL)


# 3. MainLayout, ProtectedRoute, and AppRouter
app_router_replacement = """
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
"""

content = re.sub(r'export default function AppRouter\(\) \{.*$', app_router_replacement, content, flags=re.DOTALL)


with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print("AppRouter refactored successfully.")
