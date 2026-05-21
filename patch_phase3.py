import re

# 1. Update AppRouter.js
router_file = r'e:\progress_tracker\frontend\src\AppRouter.js'
with open(router_file, 'r', encoding='utf-8') as f:
    router_code = f.read()

# Add API_BASE_URL import if not present
if 'import API_BASE_URL' not in router_code:
    router_code = router_code.replace("import GlobalSearch from './components/GlobalSearch';", "import GlobalSearch from './components/GlobalSearch';\nimport API_BASE_URL from './api/config';")

# Replace Sidebar component to fetch analytics
sidebar_old = """function Sidebar({ open, onClose }) {
  return (
    <aside className={`sidebar ${open ? 'open' : ''}`}>"""
sidebar_new = """function Sidebar({ open, onClose }) {
  const [badges, setBadges] = useState({ reminders: 0, jobs: 0, questions: 0 });

  useEffect(() => {
    fetch(`${API_BASE_URL}/analytics/summary`)
      .then(r => r.json())
      .then(data => {
        let qCount = 0;
        try {
          if (data.questions_by_topic) {
            qCount = data.questions_by_topic.reduce((acc, t) => acc + (t.count || 0), 0); // Simplified badge logic
          }
        } catch(e) {}
        setBadges({
          reminders: data.upcoming_reminders ? data.upcoming_reminders.length : 0,
          jobs: data.counts ? data.counts.total_apps : 0,
          questions: 0 // Will implement real spaced repetition badge later
        });
      })
      .catch(e => console.error(e));
  }, []);

  return (
    <aside className={`sidebar ${open ? 'open' : ''}`}>"""
router_code = router_code.replace(sidebar_old, sidebar_new)

# Update nav link rendering
navlink_old = """                <span className="nav-link-icon">{item.icon}</span>
                {item.label}
              </NavLink>"""
navlink_new = """                <span className="nav-link-icon">{item.icon}</span>
                {item.label}
                {item.path === '/reminders' && badges.reminders > 0 && <span className="nav-link-badge" style={{background: 'var(--danger)', color: 'white'}}>{badges.reminders}</span>}
                {item.path === '/questions' && badges.questions > 0 && <span className="nav-link-badge" style={{background: 'var(--warning)', color: 'black'}}>{badges.questions}</span>}
              </NavLink>"""
router_code = router_code.replace(navlink_old, navlink_new)

with open(router_file, 'w', encoding='utf-8') as f:
    f.write(router_code)


# 2. Update QuestionBankList.js for Spaced Repetition Review Mode
qb_file = r'e:\progress_tracker\frontend\src\components\QuestionBankList.js'
with open(qb_file, 'r', encoding='utf-8') as f:
    qb_code = f.read()

# I will write the spaced repetition logic in a separate block.
# Since it's a large component, let's just create the patch string.
qb_old_render = """  return (
    <div>
      <div className="qb-header">
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <select 
            value={filterTopic} 
            onChange={e => setFilterTopic(e.target.value)}
            className="qb-filter"
          >
            <option value="All">All Topics</option>
            {topics.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <select 
            value={filterDifficulty} 
            onChange={e => setFilterDifficulty(e.target.value)}
            className="qb-filter"
          >
            <option value="All">All Difficulties</option>
            <option value="Easy">Easy</option>
            <option value="Medium">Medium</option>
            <option value="Hard">Hard</option>
          </select>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(true)}>+ Add Question</button>
      </div>"""

qb_new_render = """  const [reviewMode, setReviewMode] = useState(false);
  const [reviewIndex, setReviewIndex] = useState(0);
  const [showReviewAnswer, setShowReviewAnswer] = useState(false);

  // Spaced repetition logic: 
  // confidence 0-20: 1 day, 20-50: 3 days, 50-80: 7 days, 80+: 14 days
  const isDue = (q) => {
    if (!q.last_revised) return true;
    const daysSince = (new Date() - new Date(q.last_revised)) / (1000 * 60 * 60 * 24);
    const conf = q.confidence || 0;
    if (conf < 20) return daysSince >= 1;
    if (conf < 50) return daysSince >= 3;
    if (conf < 80) return daysSince >= 7;
    return daysSince >= 14;
  };

  const dueQuestions = questions.filter(isDue);

  const submitReview = async (q, newConfidence) => {
    const updated = { ...q, confidence: newConfidence, last_revised: new Date().toISOString().split('T')[0] };
    await updateQuestion(q.id, updated);
    setQuestions(questions.map(x => x.id === q.id ? updated : x));
    setShowReviewAnswer(false);
    if (reviewIndex < dueQuestions.length - 1) {
      setReviewIndex(reviewIndex + 1);
    } else {
      setReviewMode(false);
    }
  };

  if (reviewMode && dueQuestions.length > 0) {
    const q = dueQuestions[reviewIndex];
    return (
      <div style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center', padding: '2rem' }}>
        <h3 style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>Reviewing {reviewIndex + 1} of {dueQuestions.length}</h3>
        <div className="qb-card" style={{ padding: '3rem', minHeight: '300px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '2rem' }}>{q.question}</h2>
          
          {!showReviewAnswer ? (
            <button className="btn btn-primary" style={{ padding: '1rem', fontSize: '1.1rem' }} onClick={() => setShowReviewAnswer(true)}>Show Answer</button>
          ) : (
            <div style={{ animation: 'fadeIn 0.3s' }}>
              <div style={{ padding: '1.5rem', background: 'var(--bg-main)', borderRadius: 'var(--radius-md)', marginBottom: '2rem', textAlign: 'left' }}>
                <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}>{q.answer || 'No answer provided.'}</pre>
              </div>
              <p style={{ fontWeight: 600, marginBottom: '1rem' }}>How confident are you?</p>
              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                <button className="btn btn-danger" onClick={() => submitReview(q, 10)}>Hard (10%)</button>
                <button className="btn btn-edit" onClick={() => submitReview(q, 40)}>Medium (40%)</button>
                <button className="btn btn-primary" onClick={() => submitReview(q, 75)}>Good (75%)</button>
                <button className="btn btn-secondary" style={{ color: 'var(--success)', borderColor: 'var(--success)' }} onClick={() => submitReview(q, 100)}>Easy (100%)</button>
              </div>
            </div>
          )}
        </div>
        <button className="btn btn-ghost" style={{ marginTop: '2rem' }} onClick={() => setReviewMode(false)}>Exit Review</button>
      </div>
    );
  }

  return (
    <div>
      <div className="qb-header">
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <select 
            value={filterTopic} 
            onChange={e => setFilterTopic(e.target.value)}
            className="qb-filter"
          >
            <option value="All">All Topics</option>
            {topics.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <select 
            value={filterDifficulty} 
            onChange={e => setFilterDifficulty(e.target.value)}
            className="qb-filter"
          >
            <option value="All">All Difficulties</option>
            <option value="Easy">Easy</option>
            <option value="Medium">Medium</option>
            <option value="Hard">Hard</option>
            <option value="Due">📖 Due for Review ({dueQuestions.length})</option>
          </select>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {dueQuestions.length > 0 && (
            <button className="btn btn-edit" style={{ background: 'var(--warning)', color: 'black' }} onClick={() => { setReviewIndex(0); setShowReviewAnswer(false); setReviewMode(true); }}>
              🧠 Review Due ({dueQuestions.length})
            </button>
          )}
          <button className="btn btn-primary" onClick={() => setShowForm(true)}>+ Add Question</button>
        </div>
      </div>"""

qb_code = qb_code.replace(qb_old_render, qb_new_render)

# Update filtering logic to handle "Due" difficulty filter
filter_old = """const filtered = questions.filter(q => {
    const tMatch = filterTopic === 'All' || q.topic === filterTopic;
    const dMatch = filterDifficulty === 'All' || q.difficulty === filterDifficulty;
    return tMatch && dMatch;
  });"""
filter_new = """const filtered = questions.filter(q => {
    const tMatch = filterTopic === 'All' || q.topic === filterTopic;
    const dMatch = filterDifficulty === 'All' 
                   || (filterDifficulty === 'Due' ? isDue(q) : q.difficulty === filterDifficulty);
    return tMatch && dMatch;
  });"""
qb_code = qb_code.replace(filter_old, filter_new)

with open(qb_file, 'w', encoding='utf-8') as f:
    f.write(qb_code)

print("Patch successful!")
