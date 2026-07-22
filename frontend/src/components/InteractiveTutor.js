import React, { useState, useEffect, useRef, useCallback } from 'react';
import ReactDOM from 'react-dom';
import ReactMarkdown from 'react-markdown';
import callAI from '../api/aiApi';
import { fetchQuestions, bulkCreateQuestions, reviewQuestion } from '../api/questionBankApi';
import { getCachedResponse, setCachedResponse } from '../api/tutorCache';
import MonacoEditor from '@monaco-editor/react';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import mermaid from 'mermaid';

// ── Constants ──────────────────────────────────────────────────
const SLIDING_WINDOW_SIZE = 6;
const SUMMARIZE_THRESHOLD = 10;
const MAX_OUTPUT_TOKENS = 1024;

const MODES = [
  { key: 'teach', icon: '🎓', label: 'Teach Me', desc: 'Step-by-step explanations with hints' },
  { key: 'quiz', icon: '📝', label: 'Quiz Me', desc: 'Multiple choice questions' },
  { key: 'code', icon: '💻', label: 'Code Challenge', desc: 'Solve coding problems' },
  { key: 'flashcard', icon: '⚡', label: 'Flashcards', desc: 'Rapid-fire review cards' },
];

const DIFFICULTY_LABELS = { beginner: '🟢 Beginner', intermediate: '🟡 Intermediate', advanced: '🔴 Advanced' };

// ── System prompts per mode ────────────────────────────────────
const SYSTEM_PROMPTS = {
  teach: `You are a Socratic interview prep tutor. Rules:
- Teach ONE concept at a time, under 150 words
- Always end with a thought-provoking question
- Never give the full answer immediately — guide the student to discover it
- If the student asks for a hint, give a small clue, not the answer
- Adjust complexity to the DIFFICULTY level provided
- Use analogies and real-world examples
- Praise correct answers briefly, then advance to next concept
- Use $...$ for inline math and $$...$$ for block math
- Use \`\`\`mermaid code blocks to draw flowcharts or diagrams when visually explaining concepts`,

  quiz: `You generate interview prep quiz questions. You MUST respond in EXACTLY this format with no extra text before or after:
QUESTION: [your question here]
A) [option A]
B) [option B]
C) [option C]
D) [option D]
ANSWER: [correct letter, e.g. B]
EXPLANATION: [brief 1-2 sentence explanation why the answer is correct]

Rules:
- Questions must be relevant to the topic and difficulty level
- Make distractors plausible but clearly wrong to someone who knows the concept
- Vary question types: conceptual, time-complexity, output prediction, best-practice`,

  code: `You create coding challenges for interview prep. Respond in this format:
PROBLEM: [clear problem statement in 2-3 sentences]
EXAMPLE:
Input: [sample input]
Output: [expected output]
CONSTRAINTS: [any constraints like time/space complexity]
HINT: [a subtle hint without giving away the solution]

Rules:
- Match the problem difficulty to the DIFFICULTY level
- Problems should be solvable in 15-30 lines of code
- Focus on the topic area provided`,

  codeReview: `You are a code reviewer for interview prep. Review the student's code solution.
- Point out bugs, edge cases, or inefficiencies
- Rate the solution: ✅ Correct, ⚠️ Partially Correct, or ❌ Incorrect
- Suggest one optimization if applicable
- Keep feedback under 150 words
- Be encouraging even if the code is wrong`,

  flashcard: `You generate flashcard Q&A pairs for interview prep. Generate exactly 1 flashcard. Respond in EXACTLY this format:
FRONT: [concise question, under 20 words]
BACK: [concise answer, under 40 words]

Rules:
- Questions should test key concepts for the given topic
- Answers should be precise and memorable
- Match difficulty level provided
- Cover definitions, complexities, edge cases, and best practices`
};

// ── Mastery persistence ────────────────────────────────────────
function loadMastery(topic) {
  try {
    const raw = localStorage.getItem(`mastery_${topic}`);
    return raw ? JSON.parse(raw) : { correct: 0, total: 0, hintsUsed: 0, difficulty: 'beginner' };
  } catch { return { correct: 0, total: 0, hintsUsed: 0, difficulty: 'beginner' }; }
}
function saveMastery(topic, mastery) {
  try { localStorage.setItem(`mastery_${topic}`, JSON.stringify(mastery)); } catch {}
}
function calcDifficulty(mastery) {
  if (mastery.total < 3) return 'beginner';
  const ratio = mastery.correct / mastery.total;
  if (ratio >= 0.8) return 'advanced';
  if (ratio >= 0.5) return 'intermediate';
  return 'beginner';
}

// ── Quiz parser ────────────────────────────────────────────────
function parseQuiz(text) {
  try {
    const qMatch = text.match(/QUESTION:\s*(.+?)(?=\nA\))/s);
    const aMatch = text.match(/A\)\s*(.+?)(?=\nB\))/s);
    const bMatch = text.match(/B\)\s*(.+?)(?=\nC\))/s);
    const cMatch = text.match(/C\)\s*(.+?)(?=\nD\))/s);
    const dMatch = text.match(/D\)\s*(.+?)(?=\nANSWER:)/s);
    const ansMatch = text.match(/ANSWER:\s*([A-D])/i);
    const expMatch = text.match(/EXPLANATION:\s*(.+)/s);
    if (!qMatch || !aMatch || !bMatch || !cMatch || !dMatch || !ansMatch) return null;
    return {
      question: qMatch[1].trim(),
      options: [
        { letter: 'A', text: aMatch[1].trim() },
        { letter: 'B', text: bMatch[1].trim() },
        { letter: 'C', text: cMatch[1].trim() },
        { letter: 'D', text: dMatch[1].trim() },
      ],
      answer: ansMatch[1].toUpperCase(),
      explanation: expMatch ? expMatch[1].trim() : ''
    };
  } catch { return null; }
}

// ── Flashcard parser ───────────────────────────────────────────
function parseFlashcard(text) {
  try {
    const frontMatch = text.match(/FRONT:\s*(.+?)(?=\nBACK:)/s);
    const backMatch = text.match(/BACK:\s*(.+)/s);
    if (!frontMatch || !backMatch) return null;
    return { front: frontMatch[1].trim(), back: backMatch[1].trim() };
  } catch { return null; }
}

// ── Code problem parser ────────────────────────────────────────
function parseCodeProblem(text) {
  try {
    const probMatch = text.match(/PROBLEM:\s*(.+?)(?=\nEXAMPLE:)/s);
    const exMatch = text.match(/EXAMPLE:\s*(.+?)(?=\nCONSTRAINTS:)/s);
    const conMatch = text.match(/CONSTRAINTS:\s*(.+?)(?=\nHINT:)/s);
    const hintMatch = text.match(/HINT:\s*(.+)/s);
    if (!probMatch) return null;
    return {
      problem: probMatch[1].trim(),
      example: exMatch ? exMatch[1].trim() : '',
      constraints: conMatch ? conMatch[1].trim() : '',
      hint: hintMatch ? hintMatch[1].trim() : ''
    };
  } catch { return null; }
}

// ════════════════════════════════════════════════════════════════
// MERMAID RENDERER
// ════════════════════════════════════════════════════════════════
const MermaidChart = ({ chart }) => {
  const chartRef = useRef(null);
  useEffect(() => {
    if (chartRef.current && chart) {
      mermaid.render(`mermaid-${Math.random().toString(36).substr(2, 9)}`, chart)
        .then(({ svg }) => {
          if (chartRef.current) chartRef.current.innerHTML = svg;
        })
        .catch(e => {
          if (chartRef.current) chartRef.current.innerHTML = `<pre style="color:red; font-size:0.75rem;">Mermaid Error</pre>`;
        });
    }
  }, [chart]);
  return <div ref={chartRef} style={{ background: '#fff', padding: '1rem', borderRadius: 'var(--radius-md)', margin: '1rem 0', overflowX: 'auto', display: 'flex', justifyContent: 'center' }} />;
};

// ════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ════════════════════════════════════════════════════════════════
export default function InteractiveTutor({ plan, taskIndex, taskText, onClose, initialHistory = null, onSaveHistory }) {
  const [mode, setMode] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputVal, setInputVal] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [conversationSummary, setConversationSummary] = useState('');
  const [tokensSaved, setTokensSaved] = useState(0);
  const [mastery, setMastery] = useState(() => loadMastery(taskText));
  const endOfMessagesRef = useRef(null);

  // ── Quiz state ───────────────────────────────────────────────
  const [quizData, setQuizData] = useState(null); // parsed quiz
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [quizRevealed, setQuizRevealed] = useState(false);
  const [quizScore, setQuizScore] = useState({ correct: 0, total: 0 });

  // ── Code state ───────────────────────────────────────────────
  const [codeProblem, setCodeProblem] = useState(null);
  const [userCode, setUserCode] = useState('');
  const [codeReview, setCodeReview] = useState('');
  const [codeLanguage, setCodeLanguage] = useState('python');
  const [consoleOutput, setConsoleOutput] = useState('');
  const [isCodeRunning, setIsCodeRunning] = useState(false);
  const [correctSolution, setCorrectSolution] = useState('');
  const [rightTab, setRightTab] = useState('code');

  // ── Flashcard state ──────────────────────────────────────────
  const [flashcard, setFlashcard] = useState(null);
  const [dueFlashcards, setDueFlashcards] = useState([]);
  const [flipped, setFlipped] = useState(false);
  const [flashStats, setFlashStats] = useState({ knew: 0, partial: 0, didntKnow: 0 });

  // ── Hint state (for teach mode) ──────────────────────────────
  const [hintLevel, setHintLevel] = useState(0);
  const [hints, setHints] = useState([]);
  const [showHints, setShowHints] = useState(false);

  // ── Helpers ──────────────────────────────────────────────────
  const topicName = `${plan.focus_area} — ${taskText}`;
  const topic = topicName;
  const masteryPercent = mastery.total > 0 ? Math.round((mastery.correct / mastery.total) * 100) : 0;
  const difficulty = calcDifficulty(mastery);

  const updateMastery = useCallback((correct) => {
    setMastery(prev => {
      const next = { ...prev, correct: prev.correct + (correct ? 1 : 0), total: prev.total + 1, difficulty: calcDifficulty({ ...prev, total: prev.total + 1, correct: prev.correct + (correct ? 1 : 0) }) };
      saveMastery(taskText, next);
      return next;
    });
  }, [taskText]);

  const buildHistory = useCallback((msgs) => {
    const valid = msgs.filter(m => !(m.role === 'assistant' && m.content.startsWith('Error')));
    return valid.slice(-SLIDING_WINDOW_SIZE).map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', content: m.content }));
  }, []);

  const summarizeOlder = useCallback(async (msgs) => {
    const older = msgs.slice(0, msgs.length - SLIDING_WINDOW_SIZE);
    if (!older.length) return;
    const txt = older.map(m => `${m.role}: ${m.content}`).join('\n');
    try {
      const s = await callAI(`Summarize in 2 sentences:\n${txt}`, [], { maxOutputTokens: 80 });
      setConversationSummary(s);
      setTokensSaved(prev => prev + Math.round(txt.length / 4));
    } catch {
      setConversationSummary(`Discussed: ${older.filter(m => m.role === 'user').map(m => m.content).slice(0, 3).join('; ')}`);
    }
  }, []);

  // ── Auto-scroll ──────────────────────────────────────────────
  useEffect(() => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: 'smooth' });
    if (messages.length > 0 && onSaveHistory) onSaveHistory(taskIndex, messages);
  }, [messages, taskIndex, onSaveHistory]);

  useEffect(() => {
    if (messages.length >= SUMMARIZE_THRESHOLD && messages.length % 4 === 0) summarizeOlder(messages);
  }, [messages.length, summarizeOlder, messages]);

  // ── If we have initial history, go straight to teach mode ────
  useEffect(() => {
    mermaid.initialize({ startOnLoad: false, theme: 'dark' });
    if (initialHistory && initialHistory.length > 0) {
      setMode('teach');
      setMessages(initialHistory);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ════════════════════════════════════════════════════════════
  // MODE STARTERS
  // ════════════════════════════════════════════════════════════
  const startMode = async (m) => {
    setMode(m);
    setIsTyping(true);
    setHintLevel(0);
    setHints([]);
    setShowHints(false);

    if (m === 'teach') {
      const cached = getCachedResponse(plan.focus_area, taskText);
      if (cached) {
        setMessages([{ role: 'assistant', content: cached }]);
        setTokensSaved(prev => prev + Math.round(cached.length / 4));
        setIsTyping(false);
        return;
      }
      try {
        const prompt = `Topic: ${topic}\nDifficulty: ${difficulty}\n\nGreet me and teach the FIRST concept. Ask a question to test understanding.`;
        const reply = await callAI(prompt, [], { maxOutputTokens: MAX_OUTPUT_TOKENS, systemInstruction: SYSTEM_PROMPTS.teach });
        setMessages([{ role: 'assistant', content: reply }]);
        setCachedResponse(plan.focus_area, taskText, reply);
      } catch (e) {
        setMessages([{ role: 'assistant', content: 'Error: ' + e.message }]);
      }
    } else if (m === 'quiz') {
      await loadQuiz();
    } else if (m === 'code') {
      await loadCodeChallenge();
    } else if (m === 'flashcard') {
      await loadFlashcard();
    }
    setIsTyping(false);
  };

  // ── Quiz ─────────────────────────────────────────────────────
  const loadQuiz = async () => {
    setQuizData(null); setSelectedAnswer(null); setQuizRevealed(false);
    try {
      const prompt = `Topic: ${topic}\nDifficulty: ${difficulty}\nPrevious score: ${quizScore.correct}/${quizScore.total}\n\nGenerate a quiz question.`;
      const reply = await callAI(prompt, [], { maxOutputTokens: MAX_OUTPUT_TOKENS, systemInstruction: SYSTEM_PROMPTS.quiz });
      const parsed = parseQuiz(reply);
      if (parsed) setQuizData(parsed);
      else setQuizData({ question: 'Could not parse quiz. Raw response:', options: [{ letter: 'A', text: reply.substring(0, 200) }], answer: 'A', explanation: '' });
    } catch (e) {
      setQuizData({ question: 'Error loading quiz: ' + e.message, options: [], answer: '', explanation: '' });
    }
  };

  const handleQuizAnswer = (letter) => {
    if (quizRevealed) return;
    setSelectedAnswer(letter);
    setQuizRevealed(true);
    const isCorrect = letter === quizData.answer;
    setQuizScore(prev => ({ correct: prev.correct + (isCorrect ? 1 : 0), total: prev.total + 1 }));
    updateMastery(isCorrect);
  };

  // ── Code Challenge ───────────────────────────────────────────
  const loadCodeChallenge = async () => {
    setCodeProblem(null); setUserCode(''); setCodeReview('');
    setConsoleOutput(''); setCorrectSolution(''); setRightTab('code');
    try {
      const prompt = `Topic: ${topic}\nDifficulty: ${difficulty}\nLanguage: ${codeLanguage}\n\nGenerate a coding challenge in ${codeLanguage}.`;
      const reply = await callAI(prompt, [], { maxOutputTokens: MAX_OUTPUT_TOKENS, systemInstruction: SYSTEM_PROMPTS.code });
      const parsed = parseCodeProblem(reply);
      setCodeProblem(parsed || { problem: reply, example: '', constraints: '', hint: '' });
    } catch (e) {
      setCodeProblem({ problem: 'Error: ' + e.message, example: '', constraints: '', hint: '' });
    }
  };

  const runUserCode = async () => {
    const codeToRun = rightTab === 'code' ? userCode : correctSolution;
    if (!codeToRun.trim()) return;
    setIsCodeRunning(true);
    setConsoleOutput('');
    try {
      const prompt = `Act as a strict ${codeLanguage} interpreter/compiler. Execute this code and return ONLY the console/terminal output (stdout/stderr). Assume all common third-party libraries (numpy, pandas, matplotlib, torch, sklearn, etc.) are successfully installed and available. If there is a legitimate syntax or logic error, return the error message. Do not explain the code. Do not output anything other than the execution result.\n\nCode:\n\`\`\`${codeLanguage}\n${codeToRun}\n\`\`\``;
      const reply = await callAI(prompt, [], { maxOutputTokens: MAX_OUTPUT_TOKENS });
      setConsoleOutput(reply.trim() || '✅ Code executed successfully with no output.');
    } catch (e) {
      setConsoleOutput('❌ Execution Error: ' + e.message);
    }
    setIsCodeRunning(false);
  };

  const fetchSolution = async () => {
    if (!codeProblem) return;
    setIsTyping(true);
    try {
      const prompt = `Problem: ${codeProblem.problem}\nLanguage: ${codeLanguage}\n\nGenerate the correct, optimal, and executable solution code for this problem. WARNING: Be extremely careful about the library methods you use (e.g. scikit-learn, numpy). Do NOT hallucinate methods that do not exist (e.g., calling .generate() on an sklearn classifier). Only use standard, existing API methods. Return ONLY the code snippet. Do not include markdown code block backticks (like \`\`\`python). Just the raw code. No explanations.`;
      const reply = await callAI(prompt, [], { maxOutputTokens: MAX_OUTPUT_TOKENS });
      let code = reply.trim();
      if (code.startsWith('```')) {
        code = code.replace(/^```[a-z]*\n/, '').replace(/\n```$/, '');
      }
      setCorrectSolution(code);
      setRightTab('solution');
    } catch (e) {
      setCorrectSolution('# Error fetching solution: ' + e.message);
      setRightTab('solution');
    }
    setIsTyping(false);
  };

  const submitCode = async () => {
    if (!userCode.trim()) return;
    setIsTyping(true);
    try {
      const prompt = `Problem: ${codeProblem.problem}\nLanguage: ${codeLanguage}\n\nStudent's code:\n\`\`\`${codeLanguage}\n${userCode}\n\`\`\`\n\nReview this solution.`;
      const reply = await callAI(prompt, [], { maxOutputTokens: MAX_OUTPUT_TOKENS, systemInstruction: SYSTEM_PROMPTS.codeReview });
      setCodeReview(reply);
      const isCorrect = reply.includes('✅');
      updateMastery(isCorrect);
    } catch (e) {
      setCodeReview('Error reviewing code: ' + e.message);
    }
    setIsTyping(false);
  };

  // ── Flashcard System (SRS) ───────────────────────────────────
  const loadFlashcard = async (queue = dueFlashcards) => {
    setFlashcard(null); setFlipped(false);
    
    // If queue is empty, fetch from backend or generate new ones
    if (queue.length === 0) {
      try {
        setIsTyping(true);
        // Try fetching due cards from DB
        const res = await fetchQuestions(topicName, true);
        if (res.data && res.data.length > 0) {
          setDueFlashcards(res.data);
          setFlashcard(res.data[0]);
          setIsTyping(false);
          return;
        }

        // If no due cards, generate a batch of 5 new cards via AI
        const prompt = `Topic: ${topicName}\nDifficulty: ${difficulty}\n\nGenerate exactly 5 highly effective interview flashcards for this topic. Output ONLY a valid JSON array of objects, where each object has a "question" string and an "answer" string. Do not include markdown \`\`\`json blocks.`;
        const reply = await callAI(prompt, [], { maxOutputTokens: 800 });
        
        let newCards = [];
        try {
          newCards = JSON.parse(reply.trim().replace(/^```json/i, '').replace(/```$/i, '').trim());
        } catch(e) {
          // Fallback parsing if AI doesn't output pure JSON array
          const parsed = parseFlashcard(reply);
          if (parsed) newCards = [{ question: parsed.front, answer: parsed.back }];
        }

        if (newCards.length > 0) {
          // Bulk save to DB
          const dbCards = newCards.map(c => ({
            topic: topicName,
            question: c.question,
            answer: c.answer,
            difficulty: difficulty
          }));
          const savedRes = await bulkCreateQuestions(dbCards);
          setDueFlashcards(savedRes.data);
          setFlashcard(savedRes.data[0]);
        } else {
          setFlashcard({ question: 'Error parsing flashcards', answer: 'Please try again.' });
        }
      } catch (e) {
        const detail = e.response?.data?.detail || e.message;
        setFlashcard({ question: 'Error: ' + detail, answer: '' });
      } finally {
        setIsTyping(false);
      }
    } else {
      // Pick next from queue
      setFlashcard(queue[0]);
    }
  };

  const rateFlashcard = async (rating) => {
    setFlashStats(prev => ({ ...prev, [rating]: prev[rating] + 1 }));
    updateMastery(rating === 'knew');
    setIsTyping(true);

    // Map string rating to SM-2 numeric grade (0-5)
    let numericGrade = 4; // Good (Knew it)
    if (rating === 'didntKnow') numericGrade = 1;
    if (rating === 'partial') numericGrade = 3;

    try {
      if (flashcard && flashcard.id) {
        await reviewQuestion(flashcard.id, numericGrade);
      }
    } catch(e) {
      console.error("Failed to save flashcard review", e);
    }

    const nextQueue = dueFlashcards.slice(1);
    setDueFlashcards(nextQueue);
    await loadFlashcard(nextQueue);
    setIsTyping(false);
  };

  // ── Teach mode: send message ─────────────────────────────────
  const handleSend = async (e) => {
    e.preventDefault();
    if (!inputVal.trim() || isTyping) return;
    const userMsg = inputVal.trim();
    setInputVal('');
    const newMsgs = [...messages, { role: 'user', content: userMsg }];
    setMessages(newMsgs);
    setIsTyping(true);
    setHintLevel(0); setHints([]); setShowHints(false);
    try {
      let prompt = userMsg;
      if (conversationSummary) prompt = `[Summary: ${conversationSummary}]\n\nStudent: ${userMsg}`;
      const history = buildHistory(newMsgs.slice(0, -1));
      const reply = await callAI(prompt, history, { maxOutputTokens: MAX_OUTPUT_TOKENS, systemInstruction: SYSTEM_PROMPTS.teach + `\nDifficulty: ${difficulty}` });
      setMessages(prev => [...prev, { role: 'assistant', content: reply }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Error: ' + err.message }]);
    }
    setIsTyping(false);
  };

  // ── Hint system ──────────────────────────────────────────────
  const getHint = async () => {
    if (hintLevel >= 3 || isTyping) return;
    setIsTyping(true);
    const nextLevel = hintLevel + 1;
    const lastQ = [...messages].reverse().find(m => m.role === 'assistant')?.content || taskText;
    try {
      const prompt = `The student needs hint level ${nextLevel}/3 for this question:\n"${lastQ.substring(0, 300)}"\n\nLevel 1 = vague nudge. Level 2 = partial answer. Level 3 = nearly full answer.\nGive ONLY the level ${nextLevel} hint in under 30 words.`;
      const reply = await callAI(prompt, [], { maxOutputTokens: 80, systemInstruction: SYSTEM_PROMPTS.teach });
      setHints(prev => [...prev, reply]);
      setHintLevel(nextLevel);
      setShowHints(true);
      setMastery(prev => { const n = { ...prev, hintsUsed: prev.hintsUsed + 1 }; saveMastery(taskText, n); return n; });
    } catch (err) {
      setHints(prev => [...prev, 'Could not generate hint.']);
    }
    setIsTyping(false);
  };

  // ── Text-to-speech ───────────────────────────────────────────
  const handleSpeak = (text) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text.replace(/[#_*`[\]()]/g, ''));
      window.speechSynthesis.speak(u);
    }
  };

  // ════════════════════════════════════════════════════════════
  // RENDER
  // ════════════════════════════════════════════════════════════
  const renderModeSelector = () => (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '2rem 1.5rem', gap: '1rem', overflowY: 'auto' }}>
      <div style={{ textAlign: 'center', marginBottom: '0.5rem' }}>
        <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🎯</div>
        <h3 style={{ margin: '0 0 0.25rem', color: 'var(--text-primary)', fontSize: '1.1rem' }}>How would you like to learn?</h3>
        <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{taskText}</p>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
        {MODES.map(m => (
          <button key={m.key} onClick={() => startMode(m.key)} style={{
            padding: '1.25rem 1rem', background: 'var(--bg-main)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)', cursor: 'pointer', textAlign: 'center',
            transition: 'all 0.2s', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.4rem'
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(99,102,241,0.2)'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}
          >
            <span style={{ fontSize: '1.8rem' }}>{m.icon}</span>
            <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.95rem' }}>{m.label}</span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{m.desc}</span>
          </button>
        ))}
      </div>
      {mastery.total > 0 && (
        <div style={{ padding: '0.75rem', background: 'rgba(99,102,241,0.08)', borderRadius: 'var(--radius-md)', fontSize: '0.8rem', color: 'var(--text-secondary)', textAlign: 'center' }}>
          📊 Previous mastery: <strong>{masteryPercent}%</strong> ({mastery.correct}/{mastery.total} correct) • {DIFFICULTY_LABELS[difficulty]}
        </div>
      )}
    </div>
  );

  const renderTeachMode = () => (
    <>
      <div style={s.chatArea}>
        {conversationSummary && (
          <div style={{ padding: '0.5rem 0.75rem', background: 'rgba(99,102,241,0.1)', borderRadius: '0.75rem', fontSize: '0.75rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
            📝 {conversationSummary}
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} style={{ ...s.bubble, alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start', background: m.role === 'user' ? 'var(--accent)' : 'var(--bg-main)', color: m.role === 'user' ? '#fff' : 'var(--text-primary)' }}>
            <ReactMarkdown 
              remarkPlugins={[remarkMath]} 
              rehypePlugins={[rehypeKatex]}
              components={{
                code({node, inline, className, children, ...props}) {
                  const match = /language-(\w+)/.exec(className || '')
                  if (!inline && match && match[1] === 'mermaid') {
                    return <MermaidChart chart={String(children).replace(/\n$/, '')} />
                  }
                  return <code className={className} {...props}>{children}</code>
                }
              }}
            >
              {m.content}
            </ReactMarkdown>
            {m.role === 'assistant' && (
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
                <button onClick={() => { setInputVal('Please simplify this (Explain Like I\'m 5).'); setTimeout(() => document.getElementById('teach-send-btn')?.click(), 50); }} style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem', background: 'rgba(99,102,241,0.1)', color: 'var(--accent)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: '4px', cursor: 'pointer' }}>👶 Simplify</button>
                <button onClick={() => { setInputVal('Can you do a deep dive with examples?'); setTimeout(() => document.getElementById('teach-send-btn')?.click(), 50); }} style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem', background: 'rgba(16,185,129,0.1)', color: '#10b981', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '4px', cursor: 'pointer' }}>🔬 Deep Dive</button>
                <button onClick={() => { setInputVal('Summarize this into 2 key bullet points.'); setTimeout(() => document.getElementById('teach-send-btn')?.click(), 50); }} style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem', background: 'rgba(245,158,11,0.1)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.2)', borderRadius: '4px', cursor: 'pointer' }}>📝 Summarize</button>
                <button onClick={() => handleSpeak(m.content)} style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem', background: 'transparent', color: 'var(--text-secondary)', border: '1px solid var(--border)', borderRadius: '4px', cursor: 'pointer', marginLeft: 'auto' }}>🔊 Read Aloud</button>
              </div>
            )}
          </div>
        ))}
        {showHints && hints.length > 0 && (
          <div style={{ padding: '0.75rem', background: 'rgba(251,191,36,0.1)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(251,191,36,0.3)' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#f59e0b', marginBottom: '0.4rem' }}>💡 Hints ({hintLevel}/3)</div>
            {hints.map((h, i) => (
              <div key={i} style={{ fontSize: '0.85rem', color: 'var(--text-primary)', padding: '0.25rem 0', borderBottom: i < hints.length - 1 ? '1px solid rgba(251,191,36,0.15)' : 'none' }}>
                <strong>Level {i + 1}:</strong> {h}
              </div>
            ))}
          </div>
        )}
        {isTyping && <div style={{ ...s.bubble, alignSelf: 'flex-start', background: 'var(--bg-main)' }}><span className="tutor-dot">.</span><span className="tutor-dot">.</span><span className="tutor-dot">.</span></div>}
        <div ref={endOfMessagesRef} />
      </div>
      <div style={{ padding: '0 1.25rem 0.5rem', display: 'flex', gap: '0.5rem' }}>
        <button onClick={getHint} disabled={hintLevel >= 3 || isTyping} style={{ ...s.hintBtn, opacity: hintLevel >= 3 ? 0.4 : 1 }}>
          💡 Hint {hintLevel > 0 ? `(${hintLevel}/3)` : ''}
        </button>
        <button onClick={() => { setMode(null); setMessages([]); }} style={s.switchBtn}>← Switch Mode</button>
      </div>
      <form onSubmit={handleSend} style={s.inputArea}>
        <input type="text" value={inputVal} onChange={e => setInputVal(e.target.value)} placeholder="Type your answer..." style={s.input} />
        <button id="teach-send-btn" type="submit" disabled={isTyping} style={s.sendBtn}>Send</button>
      </form>
    </>
  );

  const renderQuizMode = () => (
    <>
      <div style={{ flex: 1, padding: '1.5rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {!quizData ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>Loading quiz...</div>
        ) : (
          <>
            <div style={{ padding: '1rem', background: 'var(--bg-main)', borderRadius: 'var(--radius-md)', fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.5 }}>
              {quizData.question}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
              {quizData.options.map(opt => {
                let bg = 'var(--bg-main)';
                let border = '1px solid var(--border)';
                if (quizRevealed) {
                  if (opt.letter === quizData.answer) { bg = 'rgba(16,185,129,0.15)'; border = '2px solid #10b981'; }
                  else if (opt.letter === selectedAnswer) { bg = 'rgba(239,68,68,0.15)'; border = '2px solid #ef4444'; }
                }
                return (
                  <button key={opt.letter} onClick={() => handleQuizAnswer(opt.letter)} disabled={quizRevealed}
                    style={{ padding: '0.85rem', background: bg, border, borderRadius: 'var(--radius-md)', cursor: quizRevealed ? 'default' : 'pointer', textAlign: 'left', fontSize: '0.9rem', color: 'var(--text-primary)', transition: 'all 0.2s', lineHeight: 1.4 }}>
                    <strong>{opt.letter})</strong> {opt.text}
                  </button>
                );
              })}
            </div>
            {quizRevealed && (
              <div style={{ padding: '0.75rem', borderRadius: 'var(--radius-md)', background: selectedAnswer === quizData.answer ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', border: `1px solid ${selectedAnswer === quizData.answer ? '#10b981' : '#ef4444'}` }}>
                <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.3rem', color: selectedAnswer === quizData.answer ? '#10b981' : '#ef4444' }}>
                  {selectedAnswer === quizData.answer ? '✅ Correct!' : `❌ Wrong — Answer: ${quizData.answer}`}
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{quizData.explanation}</div>
              </div>
            )}
          </>
        )}
        <div ref={endOfMessagesRef} />
      </div>
      <div style={{ padding: '1rem 1.25rem', borderTop: '1px solid var(--border)', display: 'flex', gap: '0.5rem', background: 'var(--bg-main)' }}>
        <button onClick={() => { setMode(null); }} style={s.switchBtn}>← Switch Mode</button>
        <div style={{ flex: 1, textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-secondary)', alignSelf: 'center' }}>
          Score: <strong>{quizScore.correct}/{quizScore.total}</strong>
        </div>
        {quizRevealed && (
          <button onClick={async () => { setIsTyping(true); await loadQuiz(); setIsTyping(false); }} disabled={isTyping} style={s.sendBtn}>
            Next →
          </button>
        )}
      </div>
    </>
  );

  const renderCodeMode = () => (
    <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
      {/* Left Panel: Prompt, Solution, and Output */}
      <div style={{ flex: '0 0 45%', maxWidth: '500px', display: 'flex', flexDirection: 'column', borderRight: '1px solid var(--border)', background: 'var(--bg-main)', overflowY: 'auto' }}>
        <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {!codeProblem ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>Loading challenge...</div>
          ) : (
            <>
              <div style={{ padding: '1rem', background: 'var(--bg-card)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--accent)', marginBottom: '0.5rem' }}>💻 Problem</div>
                <div style={{ fontSize: '0.9rem', color: 'var(--text-primary)', lineHeight: 1.5 }}>{codeProblem.problem}</div>
                {codeProblem.example && (
                  <pre style={{ background: 'var(--bg-dark, #1e1e1e)', color: '#d4d4d4', padding: '0.75rem', borderRadius: '6px', fontSize: '0.8rem', marginTop: '0.75rem', overflowX: 'auto', whiteSpace: 'pre-wrap' }}>{codeProblem.example}</pre>
                )}
                {codeProblem.constraints && <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>⚠️ {codeProblem.constraints}</div>}
              </div>
              
              {codeReview && (
                <div style={{ padding: '0.75rem', background: 'rgba(99,102,241,0.08)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(99,102,241,0.2)' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--accent)', marginBottom: '0.4rem' }}>📋 Review</div>
                  <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>{codeReview}</ReactMarkdown>
                </div>
              )}
              
              {(consoleOutput || isCodeRunning) && (
                <div style={{ marginTop: '0.5rem', background: '#000', color: '#0f0', padding: '0.75rem', borderRadius: 'var(--radius-md)', fontFamily: '"Fira Code", monospace', fontSize: '0.8rem', minHeight: '60px', overflowX: 'auto', whiteSpace: 'pre-wrap', border: '1px solid #333' }}>
                  <div style={{ color: '#888', marginBottom: '0.3rem', fontSize: '0.75rem' }}>&gt; Console Output</div>
                  {isCodeRunning ? 'Running...' : consoleOutput}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Right Panel: Editor and Controls */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#1e1e1e', overflow: 'hidden' }}>
        <div style={{ padding: '0', background: '#252526', display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #333', alignItems: 'flex-end' }}>
          <div style={{ display: 'flex', gap: '2px', paddingLeft: '0.5rem' }}>
            <button onClick={() => setRightTab('code')} style={{ padding: '0.5rem 1rem', background: rightTab === 'code' ? '#1e1e1e' : '#2d2d2d', color: rightTab === 'code' ? '#fff' : '#888', border: 'none', borderTop: rightTab === 'code' ? '2px solid #007acc' : '2px solid transparent', cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.85rem' }}>Your Code</button>
            {correctSolution && <button onClick={() => setRightTab('solution')} style={{ padding: '0.5rem 1rem', background: rightTab === 'solution' ? '#1e1e1e' : '#2d2d2d', color: rightTab === 'solution' ? '#10b981' : '#888', border: 'none', borderTop: rightTab === 'solution' ? '2px solid #10b981' : '2px solid transparent', cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.85rem' }}>💡 Solution</button>}
          </div>
          <div style={{ padding: '0.3rem 0.5rem' }}>
            <select value={codeLanguage} onChange={e => setCodeLanguage(e.target.value)} style={{ background: '#3c3c3c', color: '#fff', border: '1px solid #555', borderRadius: '4px', padding: '0.2rem 0.5rem', fontSize: '0.8rem', outline: 'none' }}>
              <option value="python">Python</option>
              <option value="javascript">JavaScript</option>
              <option value="java">Java</option>
              <option value="cpp">C++</option>
              <option value="sql">SQL</option>
            </select>
          </div>
        </div>
        
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <MonacoEditor
            height="100%"
            language={codeLanguage}
            theme="vs-dark"
            value={rightTab === 'code' ? userCode : correctSolution}
            onChange={val => { if (rightTab === 'code') setUserCode(val || ''); }}
            options={{
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              fontSize: 14,
              fontFamily: '"Fira Code", "Cascadia Code", monospace',
              padding: { top: 16, bottom: 16 },
              lineNumbersMinChars: 3,
              tabSize: 2,
              readOnly: rightTab === 'solution'
            }}
          />
        </div>
        
        {/* Bottom Toolbar */}
        <div style={{ padding: '0.75rem 1rem', background: 'var(--bg-main)', borderTop: '1px solid var(--border)', display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <button onClick={() => setMode(null)} style={s.switchBtn}>← Back</button>
          {codeProblem?.hint && !codeReview && (
            <button onClick={() => alert(codeProblem.hint)} style={s.hintBtn}>💡 Hint</button>
          )}
          <button onClick={fetchSolution} disabled={isTyping || !codeProblem} style={{ ...s.hintBtn, background: 'rgba(16,185,129,0.1)', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)' }}>Solution</button>
          <div style={{ flex: 1 }} />
          <button onClick={runUserCode} disabled={isCodeRunning || !userCode.trim()} style={{ ...s.sendBtn, background: '#10b981', color: '#fff' }}>
            {isCodeRunning ? 'Running...' : '▶ Run'}
          </button>
          {!codeReview ? (
            <button onClick={submitCode} disabled={isTyping || !userCode.trim()} style={s.sendBtn}>✅ Submit</button>
          ) : (
            <button onClick={async () => { setIsTyping(true); await loadCodeChallenge(); setIsTyping(false); }} disabled={isTyping} style={s.sendBtn}>Next →</button>
          )}
        </div>
      </div>
    </div>
  );

  const renderFlashcardMode = () => {
    const totalCards = flashStats.knew + flashStats.partial + flashStats.didntKnow;
    return (
      <>
        <div style={{ flex: 1, padding: '1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
          {!flashcard ? (
            <div style={{ color: 'var(--text-secondary)' }}>Loading flashcard...</div>
          ) : (
            <>
              <div onClick={() => setFlipped(!flipped)} style={{
                width: '100%', maxWidth: '400px', minHeight: '180px', padding: '2rem 1.5rem',
                background: flipped ? 'linear-gradient(135deg, rgba(16,185,129,0.1), rgba(16,185,129,0.05))' : 'var(--bg-main)',
                border: `1px solid ${flipped ? '#10b981' : 'var(--border)'}`,
                borderRadius: 'var(--radius-lg)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                textAlign: 'center', transition: 'all 0.3s', position: 'relative',
                transform: flipped ? 'rotateY(0deg)' : 'rotateY(0deg)',
                boxShadow: flipped ? '0 8px 24px rgba(16,185,129,0.15)' : 'var(--shadow-md)'
              }}>
                <div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.5rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {flipped ? '✅ Answer' : '❓ Question'} — Tap to flip
                  </div>
                  <div style={{ fontSize: '1.05rem', color: 'var(--text-primary)', lineHeight: 1.5, fontWeight: flipped ? 400 : 600 }}>
                    {flipped ? (flashcard.answer || flashcard.back) : (flashcard.question || flashcard.front)}
                  </div>
                </div>
              </div>
              {flipped && (
                <div style={{ display: 'flex', gap: '0.5rem', width: '100%', maxWidth: '400px' }}>
                  <button onClick={() => rateFlashcard('didntKnow')} disabled={isTyping} style={{ ...s.rateBtn, background: 'rgba(239,68,68,0.1)', borderColor: '#ef4444', color: '#ef4444' }}>❌ Didn't Know</button>
                  <button onClick={() => rateFlashcard('partial')} disabled={isTyping} style={{ ...s.rateBtn, background: 'rgba(251,191,36,0.1)', borderColor: '#f59e0b', color: '#f59e0b' }}>🤔 Partial</button>
                  <button onClick={() => rateFlashcard('knew')} disabled={isTyping} style={{ ...s.rateBtn, background: 'rgba(16,185,129,0.1)', borderColor: '#10b981', color: '#10b981' }}>✅ Knew It</button>
                </div>
              )}
              {totalCards > 0 && (
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', gap: '1rem' }}>
                  <span>✅ {flashStats.knew}</span>
                  <span>🤔 {flashStats.partial}</span>
                  <span>❌ {flashStats.didntKnow}</span>
                  <span>Total: {totalCards}</span>
                </div>
              )}
            </>
          )}
        </div>
        <div style={{ padding: '1rem 1.25rem', borderTop: '1px solid var(--border)', display: 'flex', gap: '0.5rem', background: 'var(--bg-main)' }}>
          <button onClick={() => setMode(null)} style={s.switchBtn}>← Switch Mode</button>
        </div>
      </>
    );
  };

  // ── Main render ──────────────────────────────────────────────
  return ReactDOM.createPortal(
    <div style={s.overlay}>
      <div style={{ ...s.modal, maxWidth: mode === 'code' ? '1200px' : '620px', height: mode === 'code' ? '90vh' : '85vh', maxHeight: mode === 'code' ? '900px' : '700px', transition: 'all 0.3s ease' }}>
        {/* Header */}
        <div style={s.header}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>🤖 AI Tutor</h3>
              {mode && <span style={{ fontSize: '0.7rem', background: 'var(--accent)', color: '#fff', padding: '0.15rem 0.5rem', borderRadius: '1rem', fontWeight: 600 }}>
                {MODES.find(m => m.key === mode)?.icon} {MODES.find(m => m.key === mode)?.label}
              </span>}
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{taskText}</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
            {mastery.total > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                <div style={{ width: '50px', height: '6px', background: 'var(--border)', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ width: `${masteryPercent}%`, height: '100%', background: masteryPercent >= 80 ? '#10b981' : masteryPercent >= 50 ? '#f59e0b' : '#ef4444', borderRadius: '3px', transition: 'width 0.3s' }} />
                </div>
                <span>{masteryPercent}%</span>
              </div>
            )}
            {tokensSaved > 0 && <span style={{ fontSize: '0.65rem', color: 'var(--success)', background: 'rgba(16,185,129,0.1)', padding: '0.15rem 0.4rem', borderRadius: '1rem' }}>💎 {tokensSaved}</span>}
            <button onClick={onClose} style={s.closeBtn}>✕</button>
          </div>
        </div>

        {/* Content */}
        {!mode && renderModeSelector()}
        {mode === 'teach' && renderTeachMode()}
        {mode === 'quiz' && renderQuizMode()}
        {mode === 'code' && renderCodeMode()}
        {mode === 'flashcard' && renderFlashcardMode()}
      </div>
      <style>{`
        .tutor-dot { animation: tutorTyping 1.4s infinite; display: inline-block; margin: 0 1px; font-weight: bold; }
        .tutor-dot:nth-child(2) { animation-delay: 0.2s; }
        .tutor-dot:nth-child(3) { animation-delay: 0.4s; }
        @keyframes tutorTyping { 0%, 100% { opacity: 0.2; transform: translateY(0); } 50% { opacity: 1; transform: translateY(-2px); } }
      `}</style>
    </div>,
    document.body
  );
}

// ── Styles ─────────────────────────────────────────────────────
const s = {
  overlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' },
  modal: { background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: '620px', height: '85vh', maxHeight: '700px', display: 'flex', flexDirection: 'column', boxShadow: 'var(--shadow-xl)', overflow: 'hidden', border: '1px solid var(--border)' },
  header: { padding: '1rem 1.25rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.03)', gap: '0.5rem' },
  closeBtn: { background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '1.2rem', cursor: 'pointer', padding: '0.25rem' },
  chatArea: { flex: 1, padding: '1.25rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.75rem' },
  bubble: { padding: '0.75rem 1.1rem', borderRadius: '1.1rem', maxWidth: '85%', fontSize: '0.9rem', position: 'relative', boxShadow: 'var(--shadow-sm)', lineHeight: 1.5 },
  listenBtn: { position: 'absolute', bottom: '-10px', right: '10px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '50%', width: '26px', height: '26px', cursor: 'pointer', fontSize: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  inputArea: { padding: '1rem 1.25rem', borderTop: '1px solid var(--border)', display: 'flex', gap: '0.5rem', background: 'var(--bg-main)' },
  input: { flex: 1, padding: '0.65rem 0.85rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)', outline: 'none', fontSize: '0.9rem' },
  sendBtn: { padding: '0.65rem 1.25rem', borderRadius: 'var(--radius-md)', border: 'none', background: 'linear-gradient(135deg, var(--accent), var(--accent-dark, #4f46e5))', color: 'white', fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem', whiteSpace: 'nowrap' },
  switchBtn: { padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'var(--bg-main)', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.8rem', whiteSpace: 'nowrap' },
  hintBtn: { padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid rgba(251,191,36,0.4)', background: 'rgba(251,191,36,0.08)', color: '#f59e0b', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, whiteSpace: 'nowrap' },
  rateBtn: { flex: 1, padding: '0.7rem', border: '1px solid', borderRadius: 'var(--radius-md)', cursor: 'pointer', fontWeight: 600, fontSize: '0.8rem', textAlign: 'center' }
};
