import React, { useState } from 'react';
import axios from 'axios';
import API_BASE_URL from '../api/config';
import { useToast } from './ToastManager';

const projects = [
  { id: 1, title: 'CLI Chatbot with Memory', level: 'Beginner', desc: 'Build a terminal-based chatbot that remembers conversation context.', icon: '💬' },
  { id: 2, title: 'PDF Q&A RAG App', level: 'Beginner', desc: 'Create an application that answers questions based on uploaded PDF documents.', icon: '📄' },
  { id: 3, title: 'AI-Powered Code Reviewer', level: 'Intermediate', desc: 'Develop a tool that reviews code snippets for bugs and style issues.', icon: '🧑‍💻' },
  { id: 4, title: 'Multi-Source Research Agent', level: 'Intermediate', desc: 'An agent that researches topics across multiple web sources and synthesizes findings.', icon: '🔬' },
  { id: 5, title: 'Text-to-SQL Database Agent', level: 'Intermediate', desc: 'Translate natural language queries into SQL and execute them safely.', icon: '🗄️' },
  { id: 6, title: 'Customer Support Multi-Agent', level: 'Intermediate', desc: 'A system with specialized agents handling different types of customer requests.', icon: '🎧' },
  { id: 7, title: 'Autonomous Data Pipeline Agent', level: 'Advanced', desc: 'Build an agent that dynamically discovers, cleans, and transforms datasets.', icon: '⚙️' },
  { id: 8, title: 'AI Recruiter with Resume Parsing', level: 'Advanced', desc: 'An agentic system to evaluate resumes and conduct initial screenings.', icon: '👔' },
  { id: 9, title: 'Production RAG API with Evaluation', level: 'Production', desc: 'Deploy a robust RAG API with built-in retrieval evaluation metrics.', icon: '📈' },
  { id: 10, title: 'Full-Stack Multi-Agent SaaS', level: 'Production', desc: 'A complete SaaS product utilizing a team of AI agents for complex workflows.', icon: '🌐' }
];

const levelColors = {
  'Beginner': '#10b981',
  'Intermediate': '#3b82f6',
  'Advanced': '#8b5cf6',
  'Production': '#ef4444'
};

export default function AgenticProjectHub() {
  const toast = useToast();
  const [loadingIds, setLoadingIds] = useState({});
  const [loadingSeed, setLoadingSeed] = useState(false);

  const startProject = async (project) => {
    setLoadingIds(prev => ({ ...prev, [project.id]: true }));
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_BASE_URL}/milestones/`, {
        project: project.title,
        milestone: project.desc,
        status: 'Pending'
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success(`Project "${project.title}" added to Milestones!`);
    } catch (error) {
      console.error('Error creating milestone:', error);
      toast.error(`Failed to start project: ${error.response?.data?.detail || error.message}`);
    } finally {
      setLoadingIds(prev => ({ ...prev, [project.id]: false }));
    }
  };

  const seedFlashcards = async () => {
    setLoadingSeed(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_BASE_URL}/questions/seed-agentic-ai`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Successfully loaded 50 Agentic AI flashcards!');
    } catch (error) {
      console.error('Error seeding flashcards:', error);
      toast.error(`Failed to load flashcards: ${error.response?.data?.detail || error.message}`);
    } finally {
      setLoadingSeed(false);
    }
  };

  return (
    <div className="agentic-project-hub" style={{ padding: '2rem' }}>
      <style>{`
        .hub-header {
          text-align: center;
          margin-bottom: 3rem;
        }
        .hub-title {
          font-size: 3rem;
          font-weight: 800;
          background: linear-gradient(135deg, #a855f7 0%, #3b82f6 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          margin-bottom: 1rem;
        }
        .hub-subtitle {
          color: var(--text-secondary);
          font-size: 1.2rem;
          max-width: 600px;
          margin: 0 auto 2rem auto;
        }
        .flashcard-btn-container {
          display: flex;
          justify-content: center;
          margin-bottom: 3rem;
        }
        .flashcard-btn {
          background: linear-gradient(45deg, #ec4899, #8b5cf6);
          border: none;
          padding: 0.8rem 2rem;
          border-radius: 50px;
          color: white;
          font-weight: bold;
          font-size: 1.1rem;
          cursor: pointer;
          transition: transform 0.3s, box-shadow 0.3s;
          box-shadow: 0 4px 15px rgba(236, 72, 153, 0.4);
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        .flashcard-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(236, 72, 153, 0.6);
        }
        .flashcard-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
          transform: none;
        }
        .projects-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: 2rem;
        }
        .project-card {
          background: rgba(255, 255, 255, 0.05);
          backdrop-filter: blur(10px);
          border: 1px solid var(--border);
          border-radius: 16px;
          padding: 1.5rem;
          display: flex;
          flex-direction: column;
          transition: transform 0.3s, box-shadow 0.3s, border-color 0.3s;
          position: relative;
          overflow: hidden;
        }
        .project-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
          border-color: rgba(255, 255, 255, 0.2);
        }
        .project-card::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 4px;
          background: var(--card-accent, #3b82f6);
        }
        .project-header {
          display: flex;
          align-items: center;
          gap: 1rem;
          margin-bottom: 1rem;
        }
        .project-icon {
          font-size: 2.5rem;
        }
        .project-title {
          font-size: 1.25rem;
          font-weight: 700;
          color: var(--text-primary);
          line-height: 1.3;
        }
        .project-badge {
          display: inline-block;
          padding: 0.25rem 0.75rem;
          border-radius: 999px;
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 1rem;
          align-self: flex-start;
        }
        .project-desc {
          color: var(--text-secondary);
          font-size: 0.95rem;
          line-height: 1.5;
          flex-grow: 1;
          margin-bottom: 1.5rem;
        }
        .start-btn {
          width: 100%;
          padding: 0.75rem;
          border-radius: 8px;
          border: none;
          background: var(--bg-main);
          color: var(--text-primary);
          font-weight: 600;
          cursor: pointer;
          transition: background 0.2s, color 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          border: 1px solid var(--border);
        }
        .start-btn:hover:not(:disabled) {
          background: var(--card-accent, #3b82f6);
          color: white;
          border-color: transparent;
        }
        .start-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }
        .spinner {
          animation: spin 1s linear infinite;
          display: inline-block;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        [data-theme='dark'] .project-card {
          background: rgba(30, 41, 59, 0.7);
        }
      `}</style>

      <div className="hub-header">
        <h1 className="hub-title">Agentic AI Project Hub</h1>
        <p className="hub-subtitle">
          Master AI agents through hands-on projects. Progress from basic RAG implementations to full-scale autonomous multi-agent systems.
        </p>
      </div>

      <div className="flashcard-btn-container">
        <button 
          className="flashcard-btn" 
          onClick={seedFlashcards}
          disabled={loadingSeed}
        >
          {loadingSeed ? <span className="spinner">⏳</span> : '📚'}
          {loadingSeed ? 'Loading...' : 'Load 50 Agentic AI Flashcards'}
        </button>
      </div>

      <div className="projects-grid">
        {projects.map((project) => (
          <div 
            key={project.id} 
            className="project-card"
            style={{ '--card-accent': levelColors[project.level] }}
          >
            <div className="project-badge" style={{ 
              backgroundColor: `${levelColors[project.level]}20`,
              color: levelColors[project.level],
              border: `1px solid ${levelColors[project.level]}40`
            }}>
              {project.level}
            </div>
            
            <div className="project-header">
              <div className="project-icon">{project.icon}</div>
              <div className="project-title">{project.title}</div>
            </div>
            
            <div className="project-desc">{project.desc}</div>
            
            <button 
              className="start-btn"
              onClick={() => startProject(project)}
              disabled={loadingIds[project.id]}
            >
              {loadingIds[project.id] ? (
                <><span className="spinner">⚙️</span> Starting...</>
              ) : (
                <>🚀 Start Project</>
              )}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
