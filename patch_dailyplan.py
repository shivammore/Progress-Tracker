import re
import os

filepath = r"e:\progress_tracker\frontend\src\components\DailyPlanList.js"
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add new state fields
state_target = """  const [quizAnswers, setQuizAnswers] = React.useState({}); // { `${taskIndex}-${qIndex}`: selectedOptionIndex }
  const [quizSubmitted, setQuizSubmitted] = React.useState({}); // { taskIndex: bool }"""
state_replacement = """  const [quizAnswers, setQuizAnswers] = React.useState({}); // { `${taskIndex}-${qIndex}`: selectedOptionIndex }
  const [quizSubmitted, setQuizSubmitted] = React.useState({}); // { taskIndex: bool }
  const [quizConfig, setQuizConfig] = React.useState({}); // { index: { difficulty: 'Intermediate', format: 'Multiple Choice', timed: false } }
  const [shortAnswers, setShortAnswers] = React.useState({}); // { index: string }
  const [gradingShortAnswer, setGradingShortAnswer] = React.useState({}); // { index: bool }
  const [timeLeft, setTimeLeft] = React.useState({}); // { index: number }
  const [timerActive, setTimerActive] = React.useState({}); // { index: bool }
  const [savingFlashcard, setSavingFlashcard] = React.useState({}); // { stringKey: bool }

  React.useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft(prev => {
        const next = { ...prev };
        let anyChanges = false;
        Object.keys(timerActive).forEach(idx => {
          if (timerActive[idx] && next[idx] > 0) {
            next[idx] -= 1;
            anyChanges = true;
            if (next[idx] === 0) {
              setQuizSubmitted(s => ({ ...s, [idx]: true }));
              setTimerActive(ta => ({ ...ta, [idx]: false }));
            }
          }
        });
        return anyChanges ? next : prev;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [timerActive]);

  const saveFlashcard = async (topic, question, answer, key) => {
    setSavingFlashcard(prev => ({ ...prev, [key]: true }));
    try {
      const response = await fetch(`${API_BASE_URL}/questions/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: topic,
          question: question,
          difficulty: 'Intermediate',
          answer: answer
        })
      });
      if (!response.ok) throw new Error('Failed to save');
      setSavingFlashcard(prev => ({ ...prev, [key]: 'saved' }));
      setTimeout(() => setSavingFlashcard(prev => ({ ...prev, [key]: false })), 2000);
    } catch (e) {
      alert("Error saving flashcard: " + e.message);
      setSavingFlashcard(prev => ({ ...prev, [key]: false }));
    }
  };"""

content = content.replace(state_target, state_replacement)

# 2. Extract quizScores
score_extract_target = """  let aiQuizzes = {};
  if (plan.ai_quiz) {
    try {
      const parsed = JSON.parse(plan.ai_quiz);
      if (typeof parsed === 'object' && parsed !== null) aiQuizzes = parsed;
    } catch (e) {}
  }"""
score_extract_replacement = score_extract_target + """\n
  let quizScores = {};
  if (plan.quiz_scores) {
    try {
      const parsed = JSON.parse(plan.quiz_scores);
      if (typeof parsed === 'object' && parsed !== null) quizScores = parsed;
    } catch (e) {}
  }"""
content = content.replace(score_extract_target, score_extract_replacement)

# 3. generateTaskQuiz
generate_quiz_target = """      const prompt = `I am preparing for software/data engineering interviews.\\nMy focus area for today is '${plan.focus_area}'.\\nToday's task: ${task}\\n\\nPlease generate a highly educational, 3-question Multiple Choice Quiz to test my understanding of this task.\\n\\nYou MUST return ONLY a JSON array of objects, with NO markdown formatting, NO code blocks, and NO other text. \\nStructure exactly like this:\\n[\\n  {\\n    "question": "...",\\n    "options": ["...", "...", "...", "..."],\\n    "answer": 0,\\n    "explanation": "..."\\n  }\\n]`;"""

generate_quiz_replacement = """      const config = quizConfig[index] || { difficulty: 'Intermediate', format: 'Multiple Choice', timed: false };
      let prompt = '';
      if (config.format === 'Short Answer') {
        prompt = `I am preparing for software/data engineering interviews at the ${config.difficulty} level.\\nMy focus area for today is '${plan.focus_area}'.\\nToday's task: ${task}\\n\\nPlease generate a highly educational, 1-question conceptual or coding interview question to test my understanding.\\n\\nYou MUST return ONLY a single JSON object, with NO markdown formatting:\\n{\\n  "question": "..."\\n}`;
      } else {
        prompt = `I am preparing for software/data engineering interviews at the ${config.difficulty} level.\\nMy focus area for today is '${plan.focus_area}'.\\nToday's task: ${task}\\n\\nPlease generate a highly educational, 3-question Multiple Choice Quiz to test my understanding of this task.\\n\\nYou MUST return ONLY a JSON array of objects, with NO markdown formatting, NO code blocks, and NO other text. \\nStructure exactly like this:\\n[\\n  {\\n    "question": "...",\\n    "options": ["...", "...", "...", "..."],\\n    "answer": 0,\\n    "explanation": "..."\\n  }\\n]`;
      }"""
content = content.replace(generate_quiz_target, generate_quiz_replacement)

# 4. JSON parsing in generateTaskQuiz
json_parse_target = """        const parsed = JSON.parse(cleanText.trim());
        if (Array.isArray(parsed)) parsedQuiz = parsed;
      } catch (err) {"""
json_parse_replacement = """        const parsed = JSON.parse(cleanText.trim());
        if (Array.isArray(parsed) || (typeof parsed === 'object' && parsed !== null)) parsedQuiz = parsed;
      } catch (err) {"""
content = content.replace(json_parse_target, json_parse_replacement)

# 5. Timer Start logic
timer_start_target = """      const newQuizzes = { ...aiQuizzes, [index]: parsedQuiz };
      const updatedPlan = { ...plan, ai_quiz: JSON.stringify(newQuizzes) };
      await updateDailyPlan(plan.id, updatedPlan);
      if (typeof reloadPlans === 'function') await reloadPlans();
    } catch (error) {"""
timer_start_replacement = """      const newQuizzes = { ...aiQuizzes, [index]: parsedQuiz };
      const updatedPlan = { ...plan, ai_quiz: JSON.stringify(newQuizzes) };
      await updateDailyPlan(plan.id, updatedPlan);
      if (typeof reloadPlans === 'function') await reloadPlans();
      
      const config = quizConfig[index] || { difficulty: 'Intermediate', format: 'Multiple Choice', timed: false };
      if (config.timed) {
        setTimeLeft(prev => ({ ...prev, [index]: config.format === 'Multiple Choice' ? 180 : 300 }));
        setTimerActive(prev => ({ ...prev, [index]: true }));
      }
    } catch (error) {"""
content = content.replace(timer_start_target, timer_start_replacement)

# 6. Grading Short Answer
grade_short_target = """  const handleToggleQuiz = (index, task) => {"""
grade_short_replacement = """  const gradeShortAnswer = async (index, taskText, questionText) => {
    setGradingShortAnswer(prev => ({ ...prev, [index]: true }));
    setTimerActive(prev => ({ ...prev, [index]: false }));
    try {
      const gatewayUrl = localStorage.getItem('AI_GATEWAY_URL') || '';
      const apiKey = localStorage.getItem('AI_API_KEY');
      let model = localStorage.getItem('AI_MODEL') || 'gemini-1.5-flash';
      const answer = shortAnswers[index] || '';
      const prompt = `I am answering a ${quizConfig[index]?.difficulty || 'Intermediate'} level software engineering interview question.\\nQuestion: ${questionText}\\nMy Answer: ${answer}\\n\\nPlease grade my answer as an interviewer. Return a JSON object with strictly exactly this format:\\n{\\n  "pass": true,\\n  "feedback": "detailed explanation of what was good and what was missing or wrong"\\n}`;

      let url = '';
      let headers = {};
      let body = {};
      if (/generativelanguage\\.googleapis\\.com/.test(gatewayUrl)) {
        url = `${gatewayUrl.replace(/\\/$/, '')}/${model}:generateContent?key=${apiKey}`;
        headers = { 'Content-Type': 'application/json' };
        body = { contents: [{ parts: [{ text: prompt }] }] };
      } else {
        url = gatewayUrl.endsWith('/v1/chat/completions') ? gatewayUrl : `${gatewayUrl.replace(/\\/$/, '')}/v1/chat/completions`;
        headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` };
        body = { model, messages: [{ role: 'system', content: 'You are an interviewer grading an answer.' }, { role: 'user', content: prompt }], temperature: 0.7 };
      }

      const response = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
      const data = await response.json();
      let text = '';
      if (data.choices && data.choices[0]?.message?.content) text = data.choices[0].message.content;
      else if (data.candidates && data.candidates[0]?.content?.parts) text = data.candidates[0].content.parts.map(p => p.text).join('\\n');
      
      let cleanText = text.trim();
      if (cleanText.startsWith('```json')) cleanText = cleanText.substring(7);
      if (cleanText.startsWith('```')) cleanText = cleanText.substring(3);
      if (cleanText.endsWith('```')) cleanText = cleanText.slice(0, -3);
      const parsed = JSON.parse(cleanText.trim());
      
      const currentQuizObj = aiQuizzes[index];
      currentQuizObj.grade = parsed;
      
      const newQuizzes = { ...aiQuizzes, [index]: currentQuizObj };
      const scoreObj = { score: parsed.pass ? 1 : 0, total: 1, level: quizConfig[index]?.difficulty || 'Intermediate' };
      const newScores = { ...quizScores, [index]: scoreObj };
      const updatedPlan = { ...plan, ai_quiz: JSON.stringify(newQuizzes), quiz_scores: JSON.stringify(newScores) };
      await updateDailyPlan(plan.id, updatedPlan);
      
      if (typeof reloadPlans === 'function') await reloadPlans();
    } catch (e) {
      alert("Grading failed: " + e.message);
    } finally {
      setGradingShortAnswer(prev => ({ ...prev, [index]: false }));
      setQuizSubmitted(prev => ({ ...prev, [index]: true }));
    }
  };

  const submitMCQ = async (index) => {
    setTimerActive(prev => ({ ...prev, [index]: false }));
    setQuizSubmitted(prev => ({ ...prev, [index]: true }));
    const quizArr = aiQuizzes[index];
    if (!Array.isArray(quizArr)) return;
    let score = 0;
    quizArr.forEach((q, qIndex) => {
      if (quizAnswers[`${index}-${qIndex}`] === q.answer) score++;
    });
    const scoreObj = { score, total: quizArr.length, level: quizConfig[index]?.difficulty || 'Intermediate' };
    const newScores = { ...quizScores, [index]: scoreObj };
    const updatedPlan = { ...plan, quiz_scores: JSON.stringify(newScores) };
    await updateDailyPlan(plan.id, updatedPlan);
    if (typeof reloadPlans === 'function') await reloadPlans();
  };

  const handleToggleQuiz = (index, task) => {"""
content = content.replace(grade_short_target, grade_short_replacement)


# 7. Render Score Badge
badge_target = """                <button className={`dp-task-btn ${showQuiz[i] ? 'active' : ''}`} onClick={e => { e.stopPropagation(); handleToggleQuiz(i, item.text); }} disabled={loadingQuiz[i]}>
                  {loadingQuiz[i] ? '⏳' : showQuiz[i] ? '▲ Quiz' : '▼ Quiz'}
                </button>
                {showQuiz[i] && aiQuizzes[i] && (
                  <button className="dp-task-btn" onClick={e => { e.stopPropagation(); generateTaskQuiz(item.text, i); }} disabled={loadingQuiz[i]} title="Regenerate">🔄</button>
                )}
              </div>
            </div>"""
badge_replacement = """                <button className={`dp-task-btn ${showQuiz[i] ? 'active' : ''}`} onClick={e => { e.stopPropagation(); handleToggleQuiz(i, item.text); }} disabled={loadingQuiz[i]}>
                  {loadingQuiz[i] ? '⏳' : showQuiz[i] ? '▲ Quiz' : '▼ Quiz'}
                </button>
                {showQuiz[i] && aiQuizzes[i] && (
                  <button className="dp-task-btn" onClick={e => { e.stopPropagation(); generateTaskQuiz(item.text, i); }} disabled={loadingQuiz[i]} title="Regenerate">🔄</button>
                )}
                {quizScores[i] && (
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--accent)', marginLeft: '0.5rem', background: 'rgba(59, 130, 246, 0.1)', padding: '2px 6px', borderRadius: '4px' }}>
                    Score: {quizScores[i].score}/{quizScores[i].total} ({quizScores[i].level})
                  </span>
                )}
              </div>
            </div>"""
content = content.replace(badge_target, badge_replacement)


# 8. Render full Quiz UI
ui_target = """            {showQuiz[i] && (
              <div className="ai-guide-box" style={{ margin: '0.5rem 0 0.25rem 2.5rem', padding: '1rem', background: 'rgba(59, 130, 246, 0.05)', border: '1px solid rgba(59, 130, 246, 0.2)', borderRadius: '8px' }}>
                {loadingQuiz[i] ? (
                  <div className="chat-loading" style={{ padding: '0.5rem 0' }}><div className="typing-dot"></div><div className="typing-dot"></div><div className="typing-dot"></div></div>
                ) : aiQuizzes[i] ? (
                  Array.isArray(aiQuizzes[i]) ? (
                    <div>
                      <h4 style={{ marginTop: 0, color: 'var(--accent)', marginBottom: '1rem' }}>Interactive Assessment</h4>
                      {aiQuizzes[i].map((q, qIndex) => (
                        <div key={qIndex} style={{ marginBottom: '1.5rem', background: 'var(--bg-card)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border)' }}>
                          <p style={{ fontWeight: 600, marginBottom: '0.75rem' }}>{qIndex + 1}. {q.question}</p>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            {q.options && q.options.map((opt, optIdx) => {
                              const isSelected = quizAnswers[`${i}-${qIndex}`] === optIdx;
                              const isSubmitted = quizSubmitted[i];
                              const isCorrect = q.answer === optIdx;
                              
                              let bg = 'transparent';
                              let borderColor = 'var(--border)';
                              if (isSubmitted) {
                                if (isCorrect) {
                                  bg = 'rgba(16, 185, 129, 0.1)';
                                  borderColor = 'var(--success)';
                                } else if (isSelected && !isCorrect) {
                                  bg = 'rgba(239, 68, 68, 0.1)';
                                  borderColor = 'var(--danger)';
                                }
                              } else if (isSelected) {
                                bg = 'rgba(59, 130, 246, 0.1)';
                                borderColor = 'var(--accent)';
                              }

                              return (
                                <label key={optIdx} style={{ 
                                  display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem', 
                                  border: `1px solid ${borderColor}`, borderRadius: '4px', background: bg,
                                  cursor: isSubmitted ? 'default' : 'pointer', transition: 'all 0.2s'
                                }}>
                                  <input 
                                    type="radio" 
                                    name={`quiz-${i}-${qIndex}`} 
                                    checked={isSelected}
                                    onChange={() => !isSubmitted && setQuizAnswers(prev => ({ ...prev, [`${i}-${qIndex}`]: optIdx }))}
                                    disabled={isSubmitted}
                                  />
                                  <span>{opt}</span>
                                </label>
                              );
                            })}
                          </div>
                          {quizSubmitted[i] && (
                            <div style={{ marginTop: '1rem', padding: '0.75rem', background: 'rgba(255, 255, 255, 0.05)', borderLeft: `3px solid ${quizAnswers[`${i}-${qIndex}`] === q.answer ? 'var(--success)' : 'var(--danger)'}`, borderRadius: '0 4px 4px 0' }}>
                              <p style={{ margin: 0, fontSize: '0.9rem' }}>
                                <span style={{ fontWeight: 600, color: quizAnswers[`${i}-${qIndex}`] === q.answer ? 'var(--success)' : 'var(--danger)' }}>
                                  {quizAnswers[`${i}-${qIndex}`] === q.answer ? '✓ Correct! ' : '✗ Incorrect. '}
                                </span>
                                {q.explanation}
                              </p>
                            </div>
                          )}
                        </div>
                      ))}
                      {!quizSubmitted[i] && (
                        <button 
                          className="btn btn-primary" 
                          style={{ width: '100%', marginTop: '0.5rem', padding: '0.75rem', fontWeight: 600, border: 'none', background: 'var(--accent)', color: 'white', borderRadius: '4px', cursor: 'pointer' }}
                          onClick={() => setQuizSubmitted(prev => ({ ...prev, [i]: true }))}
                        >
                          📝 Submit Answers
                        </button>
                      )}
                      {quizSubmitted[i] && (
                        <button 
                          className="btn btn-secondary" 
                          style={{ width: '100%', marginTop: '0.5rem', padding: '0.75rem', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-main)', borderRadius: '4px', cursor: 'pointer' }}
                          onClick={() => {
                            setQuizSubmitted(prev => ({ ...prev, [i]: false }));
                            setQuizAnswers(prev => {
                              const next = { ...prev };
                              aiQuizzes[i].forEach((_, qIdx) => delete next[`${i}-${qIdx}`]);
                              return next;
                            });
                          }}
                        >
                          🔄 Retake Quiz
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="markdown-body"><ReactMarkdown remarkPlugins={[remarkGfm]}>{typeof aiQuizzes[i] === 'string' ? aiQuizzes[i] : JSON.stringify(aiQuizzes[i])}</ReactMarkdown></div>
                  )
                ) : (
                  <span style={{ color: 'var(--text-muted)' }}>No quiz yet.</span>
                )}
              </div>
            )}"""

ui_replacement = """            {showQuiz[i] && (
              <div className="ai-guide-box" style={{ margin: '0.5rem 0 0.25rem 2.5rem', padding: '1rem', background: 'rgba(59, 130, 246, 0.05)', border: '1px solid rgba(59, 130, 246, 0.2)', borderRadius: '8px' }}>
                
                {/* Configuration Panel */}
                {!aiQuizzes[i] && !loadingQuiz[i] && (
                  <div style={{ marginBottom: '1rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
                    <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Difficulty:
                      <select 
                        value={quizConfig[i]?.difficulty || 'Intermediate'} 
                        onChange={e => setQuizConfig(p => ({ ...p, [i]: { ...(p[i] || { format: 'Multiple Choice', timed: false }), difficulty: e.target.value } }))}
                        style={{ marginLeft: '0.5rem', padding: '0.2rem', borderRadius: '4px', border: '1px solid var(--border)' }}
                      >
                        <option value="Beginner">Beginner</option>
                        <option value="Intermediate">Intermediate</option>
                        <option value="Senior/Staff">Senior/Staff</option>
                      </select>
                    </label>
                    <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Format:
                      <select 
                        value={quizConfig[i]?.format || 'Multiple Choice'} 
                        onChange={e => setQuizConfig(p => ({ ...p, [i]: { ...(p[i] || { difficulty: 'Intermediate', timed: false }), format: e.target.value } }))}
                        style={{ marginLeft: '0.5rem', padding: '0.2rem', borderRadius: '4px', border: '1px solid var(--border)' }}
                      >
                        <option value="Multiple Choice">Multiple Choice</option>
                        <option value="Short Answer">Short Answer</option>
                      </select>
                    </label>
                    <label style={{ fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <input 
                        type="checkbox" 
                        checked={quizConfig[i]?.timed || false} 
                        onChange={e => setQuizConfig(p => ({ ...p, [i]: { ...(p[i] || { difficulty: 'Intermediate', format: 'Multiple Choice' }), timed: e.target.checked } }))}
                      />
                      ⏳ Timed Mode
                    </label>
                  </div>
                )}

                {timerActive[i] && timeLeft[i] !== undefined && (
                  <div style={{ textAlign: 'right', fontWeight: 700, color: timeLeft[i] <= 10 ? 'var(--danger)' : 'var(--accent)', fontSize: '1.2rem', marginBottom: '0.5rem' }}>
                    ⏳ {Math.floor(timeLeft[i] / 60)}:{(timeLeft[i] % 60).toString().padStart(2, '0')}
                  </div>
                )}

                {loadingQuiz[i] || gradingShortAnswer[i] ? (
                  <div className="chat-loading" style={{ padding: '0.5rem 0' }}><div className="typing-dot"></div><div className="typing-dot"></div><div className="typing-dot"></div></div>
                ) : aiQuizzes[i] ? (
                  Array.isArray(aiQuizzes[i]) ? (
                    <div>
                      <h4 style={{ marginTop: 0, color: 'var(--accent)', marginBottom: '1rem' }}>Interactive Assessment</h4>
                      {aiQuizzes[i].map((q, qIndex) => (
                        <div key={qIndex} style={{ marginBottom: '1.5rem', background: 'var(--bg-card)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border)' }}>
                          <p style={{ fontWeight: 600, marginBottom: '0.75rem' }}>{qIndex + 1}. {q.question}</p>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            {q.options && q.options.map((opt, optIdx) => {
                              const isSelected = quizAnswers[`${i}-${qIndex}`] === optIdx;
                              const isSubmitted = quizSubmitted[i];
                              const isCorrect = q.answer === optIdx;
                              
                              let bg = 'transparent';
                              let borderColor = 'var(--border)';
                              if (isSubmitted) {
                                if (isCorrect) {
                                  bg = 'rgba(16, 185, 129, 0.1)';
                                  borderColor = 'var(--success)';
                                } else if (isSelected && !isCorrect) {
                                  bg = 'rgba(239, 68, 68, 0.1)';
                                  borderColor = 'var(--danger)';
                                }
                              } else if (isSelected) {
                                bg = 'rgba(59, 130, 246, 0.1)';
                                borderColor = 'var(--accent)';
                              }

                              return (
                                <label key={optIdx} style={{ 
                                  display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem', 
                                  border: `1px solid ${borderColor}`, borderRadius: '4px', background: bg,
                                  cursor: isSubmitted ? 'default' : 'pointer', transition: 'all 0.2s'
                                }}>
                                  <input 
                                    type="radio" 
                                    name={`quiz-${i}-${qIndex}`} 
                                    checked={isSelected}
                                    onChange={() => !isSubmitted && setQuizAnswers(prev => ({ ...prev, [`${i}-${qIndex}`]: optIdx }))}
                                    disabled={isSubmitted}
                                  />
                                  <span>{opt}</span>
                                </label>
                              );
                            })}
                          </div>
                          {quizSubmitted[i] && (
                            <div style={{ marginTop: '1rem', padding: '0.75rem', background: 'rgba(255, 255, 255, 0.05)', borderLeft: `3px solid ${quizAnswers[`${i}-${qIndex}`] === q.answer ? 'var(--success)' : 'var(--danger)'}`, borderRadius: '0 4px 4px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                              <p style={{ margin: 0, fontSize: '0.9rem', flex: 1 }}>
                                <span style={{ fontWeight: 600, color: quizAnswers[`${i}-${qIndex}`] === q.answer ? 'var(--success)' : 'var(--danger)' }}>
                                  {quizAnswers[`${i}-${qIndex}`] === q.answer ? '✓ Correct! ' : '✗ Incorrect. '}
                                </span>
                                {q.explanation}
                              </p>
                              {quizAnswers[`${i}-${qIndex}`] !== q.answer && (
                                <button 
                                  onClick={() => saveFlashcard(plan.focus_area, q.question, q.explanation, `${i}-${qIndex}`)}
                                  className="btn btn-secondary" style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem', marginLeft: '1rem', whiteSpace: 'nowrap' }}
                                  disabled={savingFlashcard[`${i}-${qIndex}`] === true}
                                >
                                  {savingFlashcard[`${i}-${qIndex}`] === 'saved' ? '✓ Saved' : '🧠 Save to Flashcards'}
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                      {!quizSubmitted[i] && (
                        <button 
                          className="btn btn-primary" 
                          style={{ width: '100%', marginTop: '0.5rem', padding: '0.75rem', fontWeight: 600, border: 'none', background: 'var(--accent)', color: 'white', borderRadius: '4px', cursor: 'pointer' }}
                          onClick={() => submitMCQ(i)}
                        >
                          📝 Submit Answers
                        </button>
                      )}
                      {quizSubmitted[i] && (
                        <button 
                          className="btn btn-secondary" 
                          style={{ width: '100%', marginTop: '0.5rem', padding: '0.75rem', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-main)', borderRadius: '4px', cursor: 'pointer' }}
                          onClick={() => {
                            setQuizSubmitted(prev => ({ ...prev, [i]: false }));
                            setQuizAnswers(prev => {
                              const next = { ...prev };
                              aiQuizzes[i].forEach((_, qIdx) => delete next[`${i}-${qIdx}`]);
                              return next;
                            });
                          }}
                        >
                          🔄 Retake Quiz
                        </button>
                      )}
                    </div>
                  ) : (typeof aiQuizzes[i] === 'object' && aiQuizzes[i] !== null && aiQuizzes[i].question) ? (
                    <div>
                      <h4 style={{ marginTop: 0, color: 'var(--accent)', marginBottom: '1rem' }}>Short Answer Assessment</h4>
                      <div style={{ marginBottom: '1.5rem', background: 'var(--bg-card)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border)' }}>
                        <p style={{ fontWeight: 600, marginBottom: '0.75rem' }}>{aiQuizzes[i].question}</p>
                        <textarea
                          style={{ width: '100%', minHeight: '120px', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--bg-main)', color: 'var(--text-main)', fontFamily: 'inherit' }}
                          placeholder="Type your detailed answer here..."
                          value={shortAnswers[i] || ''}
                          onChange={e => setShortAnswers(prev => ({ ...prev, [i]: e.target.value }))}
                          disabled={quizSubmitted[i]}
                        />
                        {quizSubmitted[i] && aiQuizzes[i].grade && (
                          <div style={{ marginTop: '1rem', padding: '1rem', background: aiQuizzes[i].grade.pass ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)', borderLeft: `4px solid ${aiQuizzes[i].grade.pass ? 'var(--success)' : 'var(--danger)'}`, borderRadius: '4px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                              <div>
                                <h4 style={{ margin: '0 0 0.5rem 0', color: aiQuizzes[i].grade.pass ? 'var(--success)' : 'var(--danger)' }}>
                                  {aiQuizzes[i].grade.pass ? '✅ Passed' : '❌ Needs Improvement'}
                                </h4>
                                <p style={{ margin: 0, fontSize: '0.9rem' }}>{aiQuizzes[i].grade.feedback}</p>
                              </div>
                              {!aiQuizzes[i].grade.pass && (
                                <button 
                                  onClick={() => saveFlashcard(plan.focus_area, aiQuizzes[i].question, aiQuizzes[i].grade.feedback, `${i}-sa`)}
                                  className="btn btn-secondary" style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem', marginLeft: '1rem', whiteSpace: 'nowrap' }}
                                >
                                  {savingFlashcard[`${i}-sa`] === 'saved' ? '✓ Saved' : '🧠 Save to Flashcards'}
                                </button>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                      {!quizSubmitted[i] && (
                        <button 
                          className="btn btn-primary" 
                          style={{ width: '100%', padding: '0.75rem', fontWeight: 600, border: 'none', background: 'var(--accent)', color: 'white', borderRadius: '4px', cursor: 'pointer' }}
                          onClick={() => gradeShortAnswer(i, item.text, aiQuizzes[i].question)}
                          disabled={!(shortAnswers[i] && shortAnswers[i].trim().length > 0)}
                        >
                          ⚖️ Grade My Answer
                        </button>
                      )}
                      {quizSubmitted[i] && (
                        <button 
                          className="btn btn-secondary" 
                          style={{ width: '100%', marginTop: '0.5rem', padding: '0.75rem', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-main)', borderRadius: '4px', cursor: 'pointer' }}
                          onClick={() => {
                            setQuizSubmitted(prev => ({ ...prev, [i]: false }));
                            const currentObj = { ...aiQuizzes[i] };
                            delete currentObj.grade;
                            updateDailyPlan(plan.id, { ...plan, ai_quiz: JSON.stringify({ ...aiQuizzes, [i]: currentObj }) });
                          }}
                        >
                          🔄 Retry Question
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="markdown-body"><ReactMarkdown remarkPlugins={[remarkGfm]}>{typeof aiQuizzes[i] === 'string' ? aiQuizzes[i] : JSON.stringify(aiQuizzes[i])}</ReactMarkdown></div>
                  )
                ) : (
                  <div style={{ textAlign: 'center', padding: '1rem 0' }}>
                    <p style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>Ready to generate an assessment.</p>
                    <button className="btn btn-primary" onClick={() => generateTaskQuiz(item.text, i)}>✨ Generate Quiz</button>
                  </div>
                )}
              </div>
            )}"""
content = content.replace(ui_target, ui_replacement)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
print("Patch applied.")
