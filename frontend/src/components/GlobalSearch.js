import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import { fetchJobApps } from '../api/jobAppApi';
import { fetchTargetCompanies } from '../api/targetCompanyApi';
import { fetchStudyLogs } from '../api/studyLogApi';
import { fetchQuestions } from '../api/questionBankApi';
import { fetchMilestones } from '../api/milestoneApi';

const NAVIGATION_ITEMS = [
  { label: '📊 Go to Dashboard', path: '/', category: 'Navigation' },
  { label: '📅 Go to Daily Plans', path: '/daily', category: 'Navigation' },
  { label: '🗺️ Go to 8-Week Roadmap', path: '/roadmap', category: 'Navigation' },
  { label: '🔔 Go to Reminders', path: '/reminders', category: 'Navigation' },
  { label: '💡 Go to Question Bank', path: '/questions', category: 'Navigation' },
  { label: '📚 Go to Study Logs', path: '/study', category: 'Navigation' },
  { label: '📈 Go to Study Analytics', path: '/analytics', category: 'Navigation' },
  { label: '🎤 Go to Mock Interviews', path: '/mock', category: 'Navigation' },
  { label: '🚀 Go to Projects & Milestones', path: '/milestones', category: 'Navigation' },
  { label: '🎯 Go to Target Companies', path: '/targets', category: 'Navigation' },
  { label: '🏢 Go to Job Applications', path: '/jobs', category: 'Navigation' },
  { label: '🤖 Go to AI Tutor', path: '/ai-assistant', category: 'Navigation' },
  { label: '⚙️ Go to Settings', path: '/settings', category: 'Navigation' },
];

const ACTION_COMMANDS = [
  { label: '⏱️ Start Pomodoro Timer', action: 'START_TIMER', category: 'Actions' },
  { label: '📝 Log Study Session', path: '/study', category: 'Actions' },
  { label: '🎲 Generate Challenge', path: '/ai-assistant', category: 'Actions' },
];

// Simple cache for API results
const dataCache = {
  jobApps: null,
  targets: null,
  studyLogs: null,
  questions: null,
  milestones: null,
  lastFetch: 0,
};

export default function GlobalSearch({ onStartTimer }) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [results, setResults] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [recentSearches, setRecentSearches] = useState(() => {
    try { return JSON.parse(localStorage.getItem('recent_global_searches')) || []; } catch { return []; }
  });
  
  // Data indices
  const [jobApps, setJobApps] = useState([]);
  const [targets, setTargets] = useState([]);
  const [studyLogs, setStudyLogs] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [milestones, setMilestones] = useState([]);

  const navigate = useNavigate();
  const modalRef = useRef(null);
  const inputRef = useRef(null);

  // 1. Listen for global Ctrl+K trigger
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // 2. Fetch all indexable data when command palette is toggled open
  useEffect(() => {
    if (!isOpen) return;

    // Reset state
    setQuery('');
    setDebouncedQuery('');
    setSelectedIndex(0);

    // Focus input
    setTimeout(() => {
      if (inputRef.current) inputRef.current.focus();
    }, 100);

    // Fetch asynchronously (with 5 min cache)
    const now = Date.now();
    if (now - dataCache.lastFetch > 5 * 60 * 1000) {
      Promise.allSettled([
        fetchJobApps().then((res) => { setJobApps(res.data); dataCache.jobApps = res.data; }),
        fetchTargetCompanies().then((res) => { setTargets(res.data); dataCache.targets = res.data; }),
        fetchStudyLogs().then((res) => { setStudyLogs(res.data); dataCache.studyLogs = res.data; }),
        fetchQuestions().then((res) => { setQuestions(res.data); dataCache.questions = res.data; }),
        fetchMilestones().then((res) => { setMilestones(res.data); dataCache.milestones = res.data; }),
      ]).then(() => {
        dataCache.lastFetch = now;
      });
    } else {
      setJobApps(dataCache.jobApps || []);
      setTargets(dataCache.targets || []);
      setStudyLogs(dataCache.studyLogs || []);
      setQuestions(dataCache.questions || []);
      setMilestones(dataCache.milestones || []);
    }
  }, [isOpen]);

  // Debounce query
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 150);
    return () => clearTimeout(timer);
  }, [query]);

  // 3. Perform search matching when debounced query changes
  useEffect(() => {
    if (!isOpen) return;
    const q = debouncedQuery.toLowerCase().trim();

    // Default: Show recent searches + navigation items
    if (!q) {
      const defaultItems = [
        ...recentSearches.map(r => ({ ...r, category: 'Recent' })),
        ...ACTION_COMMANDS,
        ...NAVIGATION_ITEMS
      ];
      // Filter out duplicates based on label
      const seen = new Set();
      const unique = defaultItems.filter(item => {
        if (seen.has(item.label)) return false;
        seen.add(item.label);
        return true;
      });
      setResults(unique.slice(0, 15));
      setSelectedIndex(0);
      return;
    }

    const filtered = [];

    // Search Actions
    ACTION_COMMANDS.forEach((item) => {
      if (item.label.toLowerCase().includes(q)) filtered.push(item);
    });

    // Search Routes / Navigation
    NAVIGATION_ITEMS.forEach((item) => {
      if (item.label.toLowerCase().includes(q)) {
        filtered.push(item);
      }
    });

    // Search Job Applications
    jobApps.forEach((app) => {
      if (
        (app.company || '').toLowerCase().includes(q) ||
        (app.role || '').toLowerCase().includes(q) ||
        (app.location || '').toLowerCase().includes(q)
      ) {
        filtered.push({
          label: `🏢 Application: ${app.role} at ${app.company}`,
          path: `/jobs?company=${encodeURIComponent(app.company)}`,
          category: 'Applications',
        });
      }
    });

    // Search Target Companies
    targets.forEach((tc) => {
      if ((tc.company || '').toLowerCase().includes(q) || (tc.role || '').toLowerCase().includes(q)) {
        filtered.push({
          label: `🎯 Target: ${tc.company} (Tier ${tc.tier || 'N/A'})`,
          path: `/targets`,
          category: 'Target Companies',
        });
      }
    });

    // Search Study Logs
    studyLogs.forEach((log) => {
      if ((log.topic || '').toLowerCase().includes(q) || (log.subtopic || '').toLowerCase().includes(q)) {
        filtered.push({
          label: `📚 Study Log: ${log.topic} - ${log.subtopic || 'General'} (${log.hours}h)`,
          path: `/study`,
          category: 'Study Logs',
        });
      }
    });

    // Search Question Bank
    questions.forEach((qb) => {
      if ((qb.question || '').toLowerCase().includes(q) || (qb.topic || '').toLowerCase().includes(q)) {
        filtered.push({
          label: `💡 Question: [${qb.topic}] ${qb.question.length > 50 ? `${qb.question.substring(0, 50)}...` : qb.question}`,
          path: `/questions`,
          category: 'Questions',
        });
      }
    });

    // Search Milestones
    milestones.forEach((m) => {
      if ((m.project || '').toLowerCase().includes(q) || (m.milestone || '').toLowerCase().includes(q)) {
        filtered.push({
          label: `🚀 Milestone: [${m.project}] ${m.milestone}`,
          path: `/milestones`,
          category: 'Projects',
        });
      }
    });

    setResults(filtered.slice(0, 15)); // Cap at 15 items to keep it clean
    setSelectedIndex(0);
  }, [debouncedQuery, isOpen, jobApps, targets, studyLogs, questions, milestones, recentSearches]);

  // 4. Handle Arrow Key Navigation
  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % results.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + results.length) % results.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (results[selectedIndex]) {
        handleSelect(results[selectedIndex]);
      }
    }
  };

  const handleSelect = (item) => {
    // Add to recents
    const updatedRecents = [item, ...recentSearches.filter(r => r.label !== item.label)].slice(0, 3);
    setRecentSearches(updatedRecents);
    localStorage.setItem('recent_global_searches', JSON.stringify(updatedRecents));
    
    setIsOpen(false);
    
    if (item.action === 'START_TIMER') {
      if (onStartTimer) onStartTimer();
    } else if (item.path) {
      navigate(item.path);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="search-overlay" onClick={() => setIsOpen(false)}>
      <div 
        className="search-modal" 
        onClick={(e) => e.stopPropagation()}
        ref={modalRef}
      >
        <div className="search-header">
          <span className="search-input-icon">🔍</span>
          <input
            ref={inputRef}
            type="text"
            className="search-input"
            placeholder="Type to search dashboard, companies, questions, logs, pages..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <span className="search-badge">ESC</span>
        </div>

        <div className="search-results-list">
          {results.map((item, idx) => {
            const isSelected = idx === selectedIndex;
            return (
              <div
                key={idx}
                className={`search-result-item ${isSelected ? 'selected' : ''}`}
                onClick={() => handleSelect(item)}
                onMouseEnter={() => setSelectedIndex(idx)}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                  <span className="search-result-label">{item.label}</span>
                  <span className="search-result-category">{item.category}</span>
                </div>
              </div>
            );
          })}

          {results.length === 0 && (
            <div className="search-empty-state">
              <span style={{ fontSize: '1.5rem', marginBottom: '0.5rem', display: 'block' }}>🔍</span>
              No results found for "<strong>{query}</strong>"
            </div>
          )}
        </div>

        <div className="search-footer-legend">
          <span>🎯 Select: <strong>Enter</strong></span>
          <span>🧭 Navigate: <strong>↑ ↓</strong></span>
          <span>🚪 Close: <strong>Esc</strong></span>
        </div>
      </div>
    </div>
  );
}
