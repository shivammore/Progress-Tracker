import React, { useEffect, useState } from 'react';
import { fetchReminders, deleteReminder, updateReminder } from '../api/reminderApi';
import ReminderForm from './ReminderForm';
import RightSidebarWidgets from './RightSidebarWidgets';

function EditRow({ reminder, onSave, onCancel }) {
  const [form, setForm] = useState({ ...reminder });
  const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value });
  const handleSubmit = e => {
    e.preventDefault();
    onSave({ ...form });
  };
  return (
    <form onSubmit={handleSubmit} className="form-grid" style={{ display: 'flex', gap: '0.5rem', width: '100%', alignItems: 'center' }}>
      <input className="form-control" name="title" value={form.title} onChange={handleChange} required style={{flex: 1}} />
      <input className="form-control" name="due_date" type="date" value={form.due_date} onChange={handleChange} required style={{width:130}} />
      <select className="form-control" name="completed" value={form.completed ? 'true' : 'false'} onChange={e => setForm({ ...form, completed: e.target.value === 'true' })} style={{width:100}}>
        <option value="false">Pending</option>
        <option value="true">Done</option>
      </select>
      <button className="btn btn-primary" type="submit">💾 Save</button>
      <button className="btn" type="button" onClick={onCancel} style={{ background: '#e2e8f0' }}>❌ Cancel</button>
    </form>
  );
}

const getTodayStr = () => {
  const today = new Date();
  const y = today.getFullYear();
  const m = String(today.getMonth() + 1).padStart(2, '0');
  const d = String(today.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

export default function ReminderList() {
  const [reminders, setReminders] = useState([]);
  const [editId, setEditId] = useState(null);
  
  const loadReminders = () => fetchReminders().then(res => setReminders(res.data));
  useEffect(() => { loadReminders(); }, []);

  const handleDelete = async (id) => {
    if (window.confirm('Delete this reminder?')) {
      await deleteReminder(id);
      loadReminders();
    }
  };

  const handleEdit = (id) => setEditId(id);
  const handleCancel = () => setEditId(null);
  const handleSave = async (form) => {
    await updateReminder(form.id, {...form, completed: form.completed === true || form.completed === 'true'});
    setEditId(null);
    loadReminders();
  };

  const toggleComplete = async (reminder) => {
    await updateReminder(reminder.id, { ...reminder, completed: !reminder.completed });
    loadReminders();
  };

  // Group and sort reminders
  const todayStr = getTodayStr();
  
  const overdue = reminders
    .filter(r => !r.completed && r.due_date < todayStr)
    .sort((a, b) => a.due_date.localeCompare(b.due_date));

  const dueToday = reminders
    .filter(r => !r.completed && r.due_date === todayStr)
    .sort((a, b) => a.due_date.localeCompare(b.due_date));

  const upcoming = reminders
    .filter(r => !r.completed && r.due_date > todayStr)
    .sort((a, b) => a.due_date.localeCompare(b.due_date));

  const completed = reminders
    .filter(r => r.completed)
    .sort((a, b) => b.due_date.localeCompare(a.due_date));

  const renderReminderGroup = (title, items, borderStyle, headerEmoji) => {
    if (items.length === 0) return null;
    return (
      <div className="reminder-group" style={{ marginBottom: '2rem' }}>
        <h4 className="reminder-group-header" style={{
          display: 'flex', alignItems: 'center', gap: '0.5rem',
          fontSize: '0.95rem', fontWeight: 700, margin: '1rem 0',
          color: 'var(--text-primary)'
        }}>
          <span>{headerEmoji}</span> {title} 
          <span className="reminder-count-badge" style={{
            fontSize: '0.7rem', background: 'var(--border)', color: 'var(--text-secondary)',
            borderRadius: '2rem', padding: '0.1rem 0.5rem', fontWeight: 700
          }}>
            {items.length}
          </span>
        </h4>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {items.map(reminder => (
            <div 
              key={reminder.id} 
              className={`reminder-card ${reminder.completed ? 'reminder-completed' : ''}`}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '1rem', background: reminder.completed ? 'rgba(248, 250, 252, 0.75)' : 'var(--bg-card)',
                borderRadius: 'var(--radius-md)', border: '1px solid var(--border)',
                borderLeft: borderStyle,
                boxShadow: 'var(--shadow-sm)',
                transition: 'all var(--transition)'
              }}
            >
              {editId === reminder.id ? (
                <EditRow reminder={reminder} onSave={handleSave} onCancel={handleCancel} />
              ) : (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', flex: 1, minWidth: 0 }}>
                    <input 
                      type="checkbox" 
                      checked={reminder.completed} 
                      onChange={() => toggleComplete(reminder)}
                      style={{ 
                        width: '1.25rem', height: '1.25rem', cursor: 'pointer',
                        accentColor: 'var(--accent)'
                      }}
                    />
                    <div style={{ minWidth: 0 }}>
                      <div style={{ 
                        fontWeight: 600, 
                        textDecoration: reminder.completed ? 'line-through' : 'none', 
                        color: reminder.completed ? 'var(--text-muted)' : 'var(--text-primary)',
                        fontSize: '0.92rem',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}>
                        {reminder.title}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                        📅 Due: {reminder.due_date}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.35rem', flexShrink: 0 }}>
                    <button className="btn btn-kanban-action" onClick={() => handleEdit(reminder.id)} title="Edit">✏️</button>
                    <button className="btn btn-kanban-action danger" onClick={() => handleDelete(reminder.id)} title="Delete">🗑️</button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="dashboard-grid">
      <div className="dp-left-col">
      <ReminderForm onSuccess={loadReminders} />
      
      <div style={{ marginTop: '1.5rem' }}>
        {renderReminderGroup('Overdue', overdue, '4px solid var(--danger)', '🚨')}
        {renderReminderGroup('Due Today', dueToday, '4px solid var(--warning)', '📅')}
        {renderReminderGroup('Upcoming', upcoming, '4px solid var(--accent)', '📆')}
        {renderReminderGroup('Completed', completed, '4px solid var(--success)', '✅')}
        
        {reminders.length === 0 && (
          <div className="empty-state" style={{ padding: '3rem 1.5rem' }}>
            <div className="empty-state-icon">🔔</div>
            <div className="empty-state-text">No reminders found.</div>
          </div>
        )}
      </div>
    </div>

      <RightSidebarWidgets />

    </div>
  );
}