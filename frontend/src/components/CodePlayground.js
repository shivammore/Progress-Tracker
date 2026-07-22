import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import callAI from '../api/aiApi';

const LANGUAGES = [
  { id: 'javascript', label: 'JavaScript', icon: '⚡' },
  { id: 'python', label: 'Python', icon: '🐍' },
  { id: 'sql', label: 'SQL', icon: '🗃️' },
];

const EXAMPLE_SNIPPETS = {
  javascript: `// 🌟 JavaScript Example: Fibonacci Sequence
function fibonacci(n) {
  if (n <= 1) return n;
  let a = 0, b = 1;
  for (let i = 2; i <= n; i++) {
    [a, b] = [b, a + b];
  }
  return b;
}

// Print first 10 Fibonacci numbers
for (let i = 0; i < 10; i++) {
  console.log(\`fib(\${i}) = \${fibonacci(i)}\`);
}`,
  python: `# 🐍 Python Example: List Comprehension & Sorting
numbers = [34, 12, 89, 7, 56, 23, 45]

# Filter even numbers and sort
evens = sorted([n for n in numbers if n % 2 == 0])
print(f"Original: {numbers}")
print(f"Sorted evens: {evens}")

# Dictionary comprehension
squares = {n: n**2 for n in range(1, 6)}
print(f"Squares: {squares}")`,
  sql: `-- 🗃️ SQL Example: Employee Analytics
SELECT 
    department,
    COUNT(*) as employee_count,
    ROUND(AVG(salary), 2) as avg_salary,
    MAX(salary) as max_salary
FROM employees
WHERE hire_date >= '2024-01-01'
GROUP BY department
HAVING COUNT(*) > 5
ORDER BY avg_salary DESC;`,
};

const CHALLENGE_TOPICS = {
  javascript: ['Array manipulation', 'String processing', 'Object/Map usage', 'Recursion', 'Async/Promises', 'DOM concepts', 'Closures', 'ES6+ features'],
  python: ['List comprehensions', 'Dictionary operations', 'String formatting', 'Classes & OOP', 'File I/O', 'Lambda functions', 'Decorators', 'Error handling'],
  sql: ['JOIN operations', 'Subqueries', 'Window functions', 'Aggregation', 'CASE statements', 'CTEs', 'Date functions', 'String functions'],
};

export default function CodePlayground() {
  const [language, setLanguage] = useState('javascript');
  const [code, setCode] = useState(EXAMPLE_SNIPPETS.javascript);
  const [output, setOutput] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [challenge, setChallenge] = useState(null);
  const [isGeneratingChallenge, setIsGeneratingChallenge] = useState(false);
  const [isCheckingSolution, setIsCheckingSolution] = useState(false);
  const [solutionFeedback, setSolutionFeedback] = useState(null);
  const [challengesSolved, setChallengesSolved] = useState(0);
  const [challengeTopic, setChallengeTopic] = useState('');
  const [challengeDifficulty, setChallengeDifficulty] = useState('Medium');
  const [editorFocused, setEditorFocused] = useState(false);
  const [codeHistory, setCodeHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const textareaRef = useRef(null);
  const lineNumberRef = useRef(null);

  // Load solved count and history from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('code_challenges_solved');
    if (saved) setChallengesSolved(parseInt(saved, 10) || 0);
    const savedHistory = localStorage.getItem('code_playground_history');
    if (savedHistory) setCodeHistory(JSON.parse(savedHistory));
  }, []);

  // Sync scroll between line numbers and textarea
  const handleEditorScroll = useCallback(() => {
    if (lineNumberRef.current && textareaRef.current) {
      lineNumberRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  }, []);

  const lineCount = useMemo(() => code.split('\n').length, [code]);

  const handleLanguageChange = useCallback((langId) => {
    setLanguage(langId);
    setCode(EXAMPLE_SNIPPETS[langId]);
    setOutput('');
    setChallenge(null);
    setSolutionFeedback(null);
  }, []);

  // Execute code
  const runCode = useCallback(async () => {
    setIsRunning(true);
    setOutput('');
    setSolutionFeedback(null);
    
    // Save to history
    setCodeHistory(prev => {
      const newHistory = [{ code, timestamp: new Date().toISOString() }, ...prev].slice(0, 10);
      localStorage.setItem('code_playground_history', JSON.stringify(newHistory));
      return newHistory;
    });

    try {
      if (language === 'javascript') {
        // Capture console.log output
        const logs = [];
        const originalLog = console.log;
        const originalError = console.error;
        const originalWarn = console.warn;
        
        console.log = (...args) => logs.push(args.map(a => {
          if (typeof a === 'object') return JSON.stringify(a, null, 2);
          return String(a);
        }).join(' '));
        console.error = (...args) => logs.push('❌ ' + args.map(String).join(' '));
        console.warn = (...args) => logs.push('⚠️ ' + args.map(String).join(' '));

        try {
          // eslint-disable-next-line no-eval
          const result = eval(`(function() { ${code} })()`);
          if (result !== undefined && logs.length === 0) {
            logs.push('→ ' + (typeof result === 'object' ? JSON.stringify(result, null, 2) : String(result)));
          } else if (result !== undefined) {
            logs.push('→ Return: ' + (typeof result === 'object' ? JSON.stringify(result, null, 2) : String(result)));
          }
          setOutput(logs.join('\n') || '✅ Code executed successfully (no output)');
        } catch (err) {
          setOutput(logs.join('\n') + (logs.length ? '\n' : '') + '❌ Error: ' + err.message);
        } finally {
          console.log = originalLog;
          console.error = originalError;
          console.warn = originalWarn;
        }
      } else {
        // Python or SQL - use AI
        const challengeContext = challenge ? `\n\nContext (Tables/Data available):\n${challenge.text}` : '';
        const prompt = `Act as a precise ${language} interpreter. Execute the following code and return ONLY the console/terminal output. If the code implies tables or variables defined in the Context, assume they exist exactly as described. If there's a syntax or logic error, return the error message.\n\nCode to execute:\n\`\`\`${language}\n${code}\n\`\`\`${challengeContext}`;
        const result = await callAI(prompt);
        setOutput(result.trim());
      }
    } catch (err) {
      setOutput('❌ Error: ' + err.message);
    } finally {
      setIsRunning(false);
    }
  }, [language, code, challenge]);

  const handleTabKey = useCallback((e) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const start = e.target.selectionStart;
      const end = e.target.selectionEnd;
      const newCode = code.substring(0, start) + '  ' + code.substring(end);
      setCode(newCode);
      setTimeout(() => {
        e.target.selectionStart = e.target.selectionEnd = start + 2;
      }, 0);
    } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      runCode();
    }
  }, [code, runCode]);

  // Generate challenge
  const generateChallenge = useCallback(async () => {
    const topics = CHALLENGE_TOPICS[language];
    const topic = challengeTopic || topics[Math.floor(Math.random() * topics.length)];
    
    setIsGeneratingChallenge(true);
    setSolutionFeedback(null);
    setOutput('');

    try {
      const prompt = `Generate a coding challenge for ${language} on the topic: "${topic}".
Format your response EXACTLY like this:
TITLE: [Short challenge title]
DIFFICULTY: ${challengeDifficulty}
DESCRIPTION: [Clear problem description in 2-3 sentences]
EXAMPLE: [One input/output example]
HINT: [One helpful hint]

Keep it concise and solvable in under 20 lines of code.`;

      const result = await callAI(prompt);
      setChallenge({ text: result, topic });
      setCode(`// Challenge: ${topic}\n// Write your solution below\n\n`);
    } catch (err) {
      setOutput('❌ Failed to generate challenge: ' + err.message);
    } finally {
      setIsGeneratingChallenge(false);
    }
  }, [language, challengeTopic, challengeDifficulty]);

  // Check solution
  const checkSolution = useCallback(async () => {
    if (!challenge) return;
    setIsCheckingSolution(true);

    try {
      const prompt = `You are a code reviewer. Evaluate this ${language} solution for the following challenge.

Challenge:
${challenge.text}

Student's Solution:
\`\`\`${language}
${code}
\`\`\`

Respond with:
1. VERDICT: PASS or FAIL
2. Brief feedback (2-3 sentences)
3. If FAIL, a hint to fix it
4. If PASS, a suggestion for optimization (if any)

Keep response concise.`;

      const result = await callAI(prompt);
      const passed = result.toUpperCase().includes('PASS') && !result.toUpperCase().includes('FAIL');
      
      setSolutionFeedback({ text: result, passed });
      
      if (passed) {
        const newCount = challengesSolved + 1;
        setChallengesSolved(newCount);
        localStorage.setItem('code_challenges_solved', String(newCount));
      }
    } catch (err) {
      setSolutionFeedback({ text: '❌ Failed to check solution: ' + err.message, passed: false });
    } finally {
      setIsCheckingSolution(false);
    }
  }, [challenge, code, language, challengesSolved]);

  return (
    <div className="section-page">
      <style>{`
        @keyframes playgroundPulse {
          0%, 100% { box-shadow: 0 0 20px rgba(139, 92, 246, 0.15); }
          50% { box-shadow: 0 0 40px rgba(139, 92, 246, 0.3); }
        }
        @keyframes codeGlow {
          0%, 100% { border-color: var(--border); }
          50% { border-color: var(--accent); }
        }
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes successPop {
          0% { transform: scale(0.8); opacity: 0; }
          50% { transform: scale(1.05); }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes runPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .pg-editor-area:focus-within {
          border-color: var(--accent) !important;
          box-shadow: 0 0 30px rgba(139, 92, 246, 0.2) !important;
        }
        .pg-lang-tab { transition: all 0.25s ease; }
        .pg-lang-tab:hover { transform: translateY(-2px); }
        .pg-run-btn:hover { transform: translateY(-1px); box-shadow: 0 4px 20px rgba(139, 92, 246, 0.4) !important; }
        .pg-run-btn:active { transform: scale(0.97); }
        .pg-challenge-btn:hover { transform: translateY(-1px); }
        .pg-snippet-btn:hover { background: var(--accent) !important; color: white !important; }
        .pg-textarea::-webkit-scrollbar { width: 8px; }
        .pg-textarea::-webkit-scrollbar-track { background: transparent; }
        .pg-textarea::-webkit-scrollbar-thumb { background: var(--border); border-radius: 4px; }
        .pg-textarea::-webkit-scrollbar-thumb:hover { background: var(--text-muted); }
      `}</style>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '2rem' }}>💻</span> 
            <span style={{ background: 'linear-gradient(135deg, var(--accent), #a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Code Playground
            </span>
          </h2>
          <p style={{ color: 'var(--text-secondary)', margin: '0.25rem 0 0 0', fontSize: '0.9rem' }}>
            Write, run, and test code with AI-powered execution & challenges
          </p>
        </div>
        <div style={{
          background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.15), rgba(59, 130, 246, 0.15))',
          border: '1px solid var(--accent)',
          borderRadius: '12px',
          padding: '0.6rem 1.2rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          fontSize: '1rem',
          fontWeight: 700,
          color: 'var(--accent)',
        }}>
          🏆 {challengesSolved} challenge{challengesSolved !== 1 ? 's' : ''} solved
        </div>
      </div>

      {/* Language Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        {LANGUAGES.map(lang => (
          <button
            key={lang.id}
            className="pg-lang-tab"
            onClick={() => handleLanguageChange(lang.id)}
            style={{
              padding: '0.6rem 1.4rem',
              border: language === lang.id ? '2px solid var(--accent)' : '2px solid var(--border)',
              borderRadius: '10px',
              background: language === lang.id
                ? 'linear-gradient(135deg, rgba(139, 92, 246, 0.2), rgba(59, 130, 246, 0.15))'
                : 'var(--bg-card)',
              color: language === lang.id ? 'var(--accent)' : 'var(--text-secondary)',
              cursor: 'pointer',
              fontWeight: language === lang.id ? 700 : 500,
              fontSize: '0.9rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              boxShadow: language === lang.id ? '0 0 15px rgba(139, 92, 246, 0.15)' : 'none',
            }}
          >
            <span>{lang.icon}</span> {lang.label}
          </button>
        ))}

        <div style={{ flex: 1 }} />

        {/* Example Snippet Button */}
        <button
          className="pg-snippet-btn"
          onClick={() => { setCode(EXAMPLE_SNIPPETS[language]); setOutput(''); setSolutionFeedback(null); }}
          style={{
            padding: '0.6rem 1rem',
            border: '1px solid var(--border)',
            borderRadius: '10px',
            background: 'var(--bg-card)',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            fontSize: '0.85rem',
            transition: 'all 0.2s ease',
          }}
        >
          📝 Load Example
        </button>
      </div>

      {/* Challenge Generation */}
      <div className="section-card" style={{
        marginBottom: '1rem',
        padding: '1rem 1.25rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        flexWrap: 'wrap',
      }}>
        <select
          value={challengeTopic}
          onChange={(e) => setChallengeTopic(e.target.value)}
          className="form-control"
          style={{
            flex: '1 1 200px',
            minWidth: '180px',
            maxWidth: '300px',
            padding: '0.5rem 0.75rem',
            fontSize: '0.85rem',
          }}
        >
          <option value="">🎲 Random Topic</option>
          {CHALLENGE_TOPICS[language].map(topic => (
            <option key={topic} value={topic}>{topic}</option>
          ))}
        </select>
        <select
          value={challengeDifficulty}
          onChange={(e) => setChallengeDifficulty(e.target.value)}
          className="form-control"
          style={{
            width: '100px',
            padding: '0.5rem 0.75rem',
            fontSize: '0.85rem',
          }}
        >
          <option value="Easy">Easy</option>
          <option value="Medium">Medium</option>
          <option value="Hard">Hard</option>
        </select>
        <button
          className="btn btn-primary pg-challenge-btn"
          onClick={generateChallenge}
          disabled={isGeneratingChallenge}
          style={{ fontSize: '0.9rem', whiteSpace: 'nowrap' }}
        >
          {isGeneratingChallenge ? '⏳ Generating...' : '🤖 Generate Challenge'}
        </button>
        {challenge && (
          <button
            className="btn btn-primary pg-challenge-btn"
            onClick={checkSolution}
            disabled={isCheckingSolution}
            style={{
              fontSize: '0.9rem',
              whiteSpace: 'nowrap',
              background: 'linear-gradient(135deg, #10b981, #059669)',
            }}
          >
            {isCheckingSolution ? '⏳ Checking...' : '✅ Check Solution'}
          </button>
        )}
      </div>

      {/* Challenge Display */}
      {challenge && (
        <div style={{
          background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.08), rgba(59, 130, 246, 0.05))',
          border: '1px solid var(--accent)',
          borderRadius: '12px',
          padding: '1.25rem',
          marginBottom: '1rem',
          animation: 'slideDown 0.3s ease',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
            <h4 style={{ margin: 0, color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              🎯 Challenge: {challenge.topic}
            </h4>
          </div>
          <pre style={{
            whiteSpace: 'pre-wrap',
            color: 'var(--text-primary)',
            fontSize: '0.88rem',
            lineHeight: 1.6,
            margin: 0,
            fontFamily: 'inherit',
          }}>{challenge.text}</pre>
        </div>
      )}

      {/* Solution Feedback */}
      {solutionFeedback && (
        <div style={{
          background: solutionFeedback.passed
            ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.12), rgba(5, 150, 105, 0.08))'
            : 'linear-gradient(135deg, rgba(239, 68, 68, 0.12), rgba(220, 38, 38, 0.08))',
          border: `1px solid ${solutionFeedback.passed ? 'var(--success)' : 'var(--danger)'}`,
          borderRadius: '12px',
          padding: '1.25rem',
          marginBottom: '1rem',
          animation: 'successPop 0.4s ease',
        }}>
          <h4 style={{
            margin: '0 0 0.5rem 0',
            color: solutionFeedback.passed ? 'var(--success)' : 'var(--danger)',
            fontSize: '1.1rem',
          }}>
            {solutionFeedback.passed ? '🎉 Challenge Passed!' : '🔄 Keep Trying!'}
          </h4>
          <pre style={{
            whiteSpace: 'pre-wrap',
            color: 'var(--text-primary)',
            fontSize: '0.88rem',
            lineHeight: 1.6,
            margin: 0,
            fontFamily: 'inherit',
          }}>{solutionFeedback.text}</pre>
        </div>
      )}

      {/* Split Pane: Editor + Output */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '1rem',
        minHeight: '450px',
      }}>
        {/* Left Pane: Code Editor */}
        <div
          className="pg-editor-area"
          style={{
            background: '#0d1117',
            borderRadius: '14px',
            border: editorFocused ? '2px solid var(--accent)' : '2px solid var(--border)',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            transition: 'border-color 0.3s ease, box-shadow 0.3s ease',
            boxShadow: editorFocused ? '0 0 30px rgba(139, 92, 246, 0.2)' : '0 4px 20px rgba(0,0,0,0.3)',
          }}
        >
          {/* Editor Header */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0.65rem 1rem',
            background: 'rgba(255,255,255,0.03)',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ display: 'flex', gap: '6px' }}>
                <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#ff5f57' }} />
                <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#febc2e' }} />
                <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#28c840' }} />
              </div>
              <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem', marginLeft: '0.5rem' }}>
                {LANGUAGES.find(l => l.id === language)?.icon} {language}.playground
              </span>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <button
                onClick={() => setShowHistory(!showHistory)}
                style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.7)', borderRadius: '4px', padding: '0.2rem 0.5rem', fontSize: '0.75rem', cursor: 'pointer' }}
                title="View Code History"
              >
                🕒 History
              </button>
              <button
                onClick={() => { navigator.clipboard.writeText(code); alert('Code copied to clipboard!'); }}
                style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.7)', borderRadius: '4px', padding: '0.2rem 0.5rem', fontSize: '0.75rem', cursor: 'pointer' }}
                title="Copy Code"
              >
                📋 Copy
              </button>
              <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.75rem' }}>
                {lineCount} lines
              </span>
            </div>
          </div>

          {/* History Dropdown */}
          {showHistory && (
            <div style={{ position: 'absolute', top: '40px', right: '10px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px', zIndex: 10, padding: '0.5rem', maxHeight: '200px', overflowY: 'auto', boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Recent Runs</div>
              {codeHistory.length === 0 ? <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>No history yet</div> : codeHistory.map((h, i) => (
                <div key={i} onClick={() => { setCode(h.code); setShowHistory(false); }} style={{ padding: '0.4rem', fontSize: '0.8rem', color: 'var(--text-primary)', cursor: 'pointer', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '250px' }}>
                  {new Date(h.timestamp).toLocaleTimeString()}: {h.code.substring(0, 30)}...
                </div>
              ))}
            </div>
          )}

          {/* Editor Body */}
          <div style={{ display: 'flex', flex: 1, position: 'relative' }}>
            {/* Line Numbers */}
            <div
              ref={lineNumberRef}
              style={{
                padding: '1rem 0',
                minWidth: '48px',
                textAlign: 'right',
                color: 'rgba(255,255,255,0.2)',
                fontSize: '0.82rem',
                fontFamily: "'Fira Code', 'Cascadia Code', 'JetBrains Mono', 'Consolas', monospace",
                lineHeight: '1.65',
                userSelect: 'none',
                overflow: 'hidden',
                borderRight: '1px solid rgba(255,255,255,0.06)',
                paddingRight: '10px',
              }}
            >
              {Array.from({ length: lineCount }, (_, i) => (
                <div key={i} style={{ height: '1.65em' }}>{i + 1}</div>
              ))}
            </div>

            {/* Textarea */}
            <textarea
              ref={textareaRef}
              className="pg-textarea"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              onScroll={handleEditorScroll}
              onKeyDown={handleTabKey}
              onFocus={() => setEditorFocused(true)}
              onBlur={() => setEditorFocused(false)}
              spellCheck={false}
              style={{
                flex: 1,
                background: 'transparent',
                color: '#e6edf3',
                border: 'none',
                outline: 'none',
                resize: 'none',
                padding: '1rem',
                fontFamily: "'Fira Code', 'Cascadia Code', 'JetBrains Mono', 'Consolas', monospace",
                fontSize: '0.88rem',
                lineHeight: '1.65',
                tabSize: 2,
                caretColor: 'var(--accent)',
              }}
            />
          </div>

          {/* Run Button Bar */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '0.6rem 1rem',
            background: 'rgba(255,255,255,0.02)',
            borderTop: '1px solid rgba(255,255,255,0.06)',
          }}>
            <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.75rem' }}>
              {language === 'javascript' ? '⚡ Local eval()' : '🤖 AI-powered execution'}
            </span>
            <button
              className="pg-run-btn"
              onClick={runCode}
              disabled={isRunning}
              style={{
                padding: '0.5rem 1.5rem',
                background: isRunning
                  ? 'var(--border)'
                  : 'linear-gradient(135deg, #8b5cf6, #6366f1)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: isRunning ? 'not-allowed' : 'pointer',
                fontWeight: 700,
                fontSize: '0.85rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                transition: 'all 0.2s ease',
                animation: isRunning ? 'runPulse 1s infinite' : 'none',
              }}
            >
              {isRunning ? '⏳ Running...' : '▶ Run Code'}
            </button>
          </div>
        </div>

        {/* Right Pane: Output */}
        <div style={{
          background: '#0d1117',
          borderRadius: '14px',
          border: '2px solid var(--border)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}>
          {/* Output Header */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            padding: '0.65rem 1rem',
            background: 'rgba(255,255,255,0.03)',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ color: '#28c840', fontSize: '0.6rem' }}>●</span>
              <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.82rem', fontWeight: 600 }}>
                Output Console
              </span>
            </div>
            {output && (
              <button
                onClick={() => setOutput('')}
                style={{
                  marginLeft: 'auto',
                  background: 'none',
                  border: 'none',
                  color: 'rgba(255,255,255,0.3)',
                  cursor: 'pointer',
                  fontSize: '0.75rem',
                }}
              >
                Clear
              </button>
            )}
          </div>

          {/* Output Body */}
          <div style={{
            flex: 1,
            padding: '1rem',
            overflowY: 'auto',
            fontFamily: "'Fira Code', 'Cascadia Code', 'JetBrains Mono', 'Consolas', monospace",
            fontSize: '0.85rem',
            lineHeight: 1.7,
            color: '#e6edf3',
          }}>
            {isRunning ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '1rem' }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  border: '3px solid var(--border)',
                  borderTop: '3px solid var(--accent)',
                  borderRadius: '50%',
                  animation: 'spin 0.8s linear infinite',
                }} />
                <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  {language === 'javascript' ? 'Executing...' : 'AI is processing your code...'}
                </span>
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
              </div>
            ) : output ? (
              <pre style={{
                margin: 0,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                animation: 'fadeIn 0.3s ease',
              }}>{output}</pre>
            ) : (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                color: 'rgba(255,255,255,0.2)',
                textAlign: 'center',
                gap: '0.75rem',
              }}>
                <span style={{ fontSize: '2.5rem' }}>⚡</span>
                <span>Click <strong>▶ Run Code</strong> to see output</span>
                <span style={{ fontSize: '0.75rem' }}>
                  {language === 'javascript' ? 'JavaScript runs locally via eval()' : `${language === 'python' ? 'Python' : 'SQL'} runs via AI`}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Keyboard Shortcuts */}
      <div style={{
        marginTop: '1rem',
        padding: '0.75rem 1.25rem',
        background: 'var(--bg-card)',
        borderRadius: '10px',
        border: '1px solid var(--border)',
        display: 'flex',
        gap: '2rem',
        flexWrap: 'wrap',
        alignItems: 'center',
      }}>
        <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 600 }}>Tips:</span>
        <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>
          <kbd style={{ background: 'var(--bg-main)', padding: '2px 6px', borderRadius: '4px', border: '1px solid var(--border)', fontSize: '0.75rem' }}>Tab</kbd> to indent
        </span>
        <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>
          <kbd style={{ background: 'var(--bg-main)', padding: '2px 6px', borderRadius: '4px', border: '1px solid var(--border)', fontSize: '0.75rem' }}>Ctrl</kbd> + <kbd style={{ background: 'var(--bg-main)', padding: '2px 6px', borderRadius: '4px', border: '1px solid var(--border)', fontSize: '0.75rem' }}>Enter</kbd> to run
        </span>
        <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>
          JS uses <code style={{ color: 'var(--accent)' }}>console.log()</code> for output
        </span>
        <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>
          Python & SQL are executed via AI
        </span>
      </div>
    </div>
  );
}
