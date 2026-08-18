import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Check, Flame, Award, TrendingUp, Calendar, RefreshCw } from 'lucide-react';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const FREQUENCY_LABELS = {
  daily: 'Daily',
  weekdays: 'Weekdays',
  weekends: 'Weekends',
  weekly: 'Weekly',
  custom: 'Custom'
};

const EMOJI_OPTIONS = ['⭐','🔥','💪','🧠','📚','🏃','🥗','💧','🧘','✍️','🎯','🎨','🎵','😴','🌿','🛡️','⚡','🌅'];

// Build a 13-week grid (Sun–Sat columns, 13 rows)
function buildHeatmap(completedDates) {
  const dateSet = new Set(completedDates);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dayOfWeek = today.getDay();
  const startDate = new Date(today);
  startDate.setDate(today.getDate() - dayOfWeek - 12 * 7); // 13 weeks back
  const weeks = [];
  let current = new Date(startDate);
  for (let w = 0; w < 13; w++) {
    const week = [];
    for (let d = 0; d < 7; d++) {
      const dateStr = current.toLocaleDateString('sv');
      week.push({ date: dateStr, done: dateSet.has(dateStr), future: current > today });
      current.setDate(current.getDate() + 1);
    }
    weeks.push(week);
  }
  return weeks;
}

function HeatmapGrid({ history, color }) {
  const weeks = buildHeatmap(history || []);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginTop: '0.5rem' }}>
      <div style={{ display: 'flex', gap: '1px', marginBottom: '2px' }}>
        {DAYS.map(d => <div key={d} style={{ width: '14px', textAlign: 'center', fontSize: '0.55rem', color: 'var(--muted-foreground)' }}>{d[0]}</div>)}
      </div>
      {weeks.map((week, wi) => (
        <div key={wi} style={{ display: 'flex', gap: '1px' }}>
          {week.map((cell, di) => (
            <div key={di} title={cell.date} style={{
              width: '14px', height: '14px', borderRadius: '2px',
              backgroundColor: cell.future ? 'transparent' : cell.done ? color || 'var(--primary)' : 'var(--border)',
              opacity: cell.future ? 0 : 1
            }} />
          ))}
        </div>
      ))}
    </div>
  );
}

export default function HabitsView({ showToast, permissions }) {
  const [habits, setHabits] = useState([]);
  const [histories, setHistories] = useState({}); // { habitId: [dates] }
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create');
  const [editingId, setEditingId] = useState(null);

  // Habit Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('#3b82f6');
  const [icon, setIcon] = useState('⭐');
  const [targetFrequency, setTargetFrequency] = useState('daily');
  const [customDays, setCustomDays] = useState([]);

  // Habit Tasks Form State
  const [newTaskTitles, setNewTaskTitles] = useState({}); // { habitId: 'title' }
  const [newTaskTypes, setNewTaskTypes] = useState({}); // { habitId: 'one_time' | 'recurring' }

  const isReadOnly = permissions === 'read';

  useEffect(() => { 
    fetchHabits(); 
    
    const handleAddTrigger = (e) => {
      if (e.detail.tab === 'habits') {
        openCreate();
      }
    };
    window.addEventListener('trigger-add-action', handleAddTrigger);
    return () => {
      window.removeEventListener('trigger-add-action', handleAddTrigger);
    };
  }, []);

  const fetchHabits = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/focusflow/habits');
      if (res.ok) {
        setHabits(await res.json());
      } else showToast('Failed to load habits', 'error');
    } catch (err) { showToast('Network error', 'error'); }
    finally { setLoading(false); }
  };

  const fetchHistory = async (habitId) => {
    if (histories[habitId]) return; // cached
    try {
      const res = await fetch(`/api/focusflow/habits/${habitId}/history`);
      if (res.ok) {
        const data = await res.json();
        setHistories(prev => ({ ...prev, [habitId]: data }));
      }
    } catch (_) {}
  };

  const handleToggleExpand = (id) => {
    const next = expandedId === id ? null : id;
    setExpandedId(next);
    if (next) fetchHistory(next);
  };

  const handleToggleComplete = async (habit) => {
    const method = habit.completed_today ? 'DELETE' : 'POST';
    try {
      const res = await fetch(`/api/focusflow/habits/${habit.id}/complete`, { method });
      if (res.ok) {
        if (!habit.completed_today) showToast(`✅ "${habit.title}" checked off!`, 'success');
        fetchHabits();
        setHistories(prev => { const n = { ...prev }; delete n[habit.id]; return n; });
      }
    } catch (err) { showToast('Network error', 'error'); }
  };

  // Habit Task Actions
  const handleAddTaskToHabit = async (habitId) => {
    const taskTitle = newTaskTitles[habitId] || '';
    const taskType = newTaskTypes[habitId] || 'one_time';
    if (!taskTitle.trim()) return;

    try {
      const res = await fetch('/api/focusflow/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: taskTitle.trim(),
          habit_id: habitId,
          habit_task_type: taskType,
          status: 'backlog',
          priority: 'medium'
        })
      });
      if (res.ok) {
        showToast('Task added to habit', 'success');
        setNewTaskTitles(prev => ({ ...prev, [habitId]: '' }));
        fetchHabits();
      } else {
        const d = await res.json();
        showToast(d.error || 'Failed to add task', 'error');
      }
    } catch (err) { showToast('Network error', 'error'); }
  };

  const handleDeleteHabitTask = async (taskId) => {
    if (!window.confirm('Delete this task from the habit?')) return;
    try {
      const res = await fetch(`/api/focusflow/tasks/${taskId}`, { method: 'DELETE' });
      if (res.ok) {
        showToast('Task deleted from habit', 'success');
        fetchHabits();
      } else showToast('Failed to delete task', 'error');
    } catch (err) { showToast('Network error', 'error'); }
  };

  const handleToggleTaskComplete = async (task) => {
    const method = task.completed_today ? 'DELETE' : 'POST';
    try {
      const res = await fetch(`/api/focusflow/habits/tasks/${task.id}/complete`, { method });
      if (res.ok) {
        if (!task.completed_today) showToast(`✅ Task complete!`, 'success');
        fetchHabits();
        // Invalidate history cache so heatmap updates if the main habit completion toggles
        setHistories(prev => { const n = { ...prev }; delete n[task.habit_id]; return n; });
      } else showToast('Failed to toggle task status', 'error');
    } catch (err) { showToast('Network error', 'error'); }
  };

  const openCreate = () => {
    setModalMode('create'); setEditingId(null);
    setTitle(''); setDescription(''); setColor('#3b82f6'); setIcon('⭐');
    setTargetFrequency('daily'); setCustomDays([]);
    setIsModalOpen(true);
  };

  const openEdit = (h) => {
    setModalMode('edit'); setEditingId(h.id);
    setTitle(h.title); setDescription(h.description || '');
    setColor(h.color || '#3b82f6'); setIcon(h.icon || '⭐');
    setTargetFrequency(h.target_frequency || 'daily');
    try { setCustomDays(JSON.parse(h.custom_days || '[]')); } catch { setCustomDays([]); }
    setIsModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!title.trim()) { showToast('Title is required', 'error'); return; }
    const payload = {
      title: title.trim(), description: description.trim(), color, icon,
      target_frequency: targetFrequency,
      custom_days: targetFrequency === 'custom' ? customDays : null
    };
    try {
      const res = await fetch(modalMode === 'create' ? '/api/focusflow/habits' : `/api/focusflow/habits/${editingId}`, {
        method: modalMode === 'create' ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        showToast(modalMode === 'create' ? 'Habit created!' : 'Habit updated!', 'success');
        setIsModalOpen(false); fetchHabits();
      } else { const d = await res.json(); showToast(d.error || 'Failed to save', 'error'); }
    } catch (err) { showToast('Network error', 'error'); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this habit? All history and tasks will be lost.')) return;
    try {
      const res = await fetch(`/api/focusflow/habits/${id}`, { method: 'DELETE' });
      if (res.ok) { showToast('Habit deleted', 'success'); fetchHabits(); }
    } catch (err) { showToast('Network error', 'error'); }
  };

  const completedToday = habits.filter(h => h.completed_today).length;

  return (
    <div className="animate-fade-in">
      <div className="content-header">
        <div>
          <h2>Habits</h2>
          <p>Compounding daily goals. You can assign tasks (one-time or recurring) to assist with habit building.</p>
        </div>
      </div>

      {/* Daily summary bar */}
      {habits.length > 0 && (
        <div className="card" style={{ padding: '1rem 1.25rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span style={{ fontWeight: '700', fontSize: '0.9rem' }}>Today's Check-Ins</span>
              <span style={{ fontSize: '0.85rem', color: 'var(--muted-foreground)' }}>{completedToday} / {habits.length}</span>
            </div>
            <div style={{ height: '6px', backgroundColor: 'var(--border)', borderRadius: '4px', overflow: 'hidden' }}>
              <div style={{
                height: '100%', borderRadius: '4px',
                backgroundColor: completedToday === habits.length ? '#10b981' : 'var(--primary)',
                width: `${habits.length > 0 ? (completedToday / habits.length) * 100 : 0}%`,
                transition: 'width 0.4s ease'
              }} />
            </div>
          </div>
          {completedToday === habits.length && habits.length > 0 && (
            <span style={{ fontSize: '1.5rem' }} title="All habits complete!">🎉</span>
          )}
        </div>
      )}

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '5rem' }}><div className="spinner" /></div>
      ) : habits.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
          <Award size={48} style={{ margin: '0 auto 1rem', opacity: 0.4, color: 'var(--muted-foreground)' }} />
          <h3>No habits yet</h3>
          <p style={{ color: 'var(--muted-foreground)', marginTop: '0.25rem' }}>Start with one small habit. Compound your wins.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {habits.map(h => (
            <div key={h.id} className="card" style={{ padding: 0, overflow: 'hidden', borderLeft: `4px solid ${h.color || 'var(--primary)'}` }}>
              {/* Habit Header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.9rem 1.1rem', cursor: 'pointer' }}
                onClick={() => handleToggleExpand(h.id)}>
                {/* Check button */}
                <button onClick={(e) => { e.stopPropagation(); !isReadOnly && handleToggleComplete(h); }}
                  style={{
                    width: '38px', height: '38px', borderRadius: '50%', flexShrink: 0, border: 'none',
                    cursor: isReadOnly ? 'default' : 'pointer',
                    backgroundColor: h.completed_today ? (h.color || '#10b981') : 'var(--border)',
                    color: h.completed_today ? 'white' : 'var(--muted-foreground)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '1.1rem', transition: 'background-color 0.2s, transform 0.1s',
                    transform: h.completed_today ? 'scale(1.07)' : 'scale(1)'
                  }}>
                  {h.completed_today ? <Check size={18} strokeWidth={3} /> : <span>{h.icon || '⭐'}</span>}
                </button>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: '700', fontSize: '0.95rem', marginBottom: '0.15rem',
                    textDecoration: h.completed_today ? 'line-through' : 'none',
                    color: h.completed_today ? 'var(--muted-foreground)' : 'var(--foreground)' }}>
                    {h.title}
                  </div>
                  <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.72rem', color: 'var(--muted-foreground)' }}>
                      {FREQUENCY_LABELS[h.target_frequency] || h.target_frequency}
                    </span>
                    {h.completion_rate > 0 && (
                      <span style={{ fontSize: '0.72rem', color: 'var(--muted-foreground)', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                        <TrendingUp size={10} /> {h.completion_rate}% last 30d
                      </span>
                    )}
                  </div>
                </div>

                {/* Streak */}
                {h.streak > 0 && (
                  <span style={{
                    display: 'flex', alignItems: 'center', gap: '0.2rem', fontSize: '0.85rem', fontWeight: '800',
                    padding: '0.2rem 0.6rem', borderRadius: '20px',
                    backgroundColor: h.streak >= 7 ? '#f59e0b22' : (h.streak >= 3 ? '#ef444422' : 'var(--border)'),
                    color: h.streak >= 7 ? '#f59e0b' : (h.streak >= 3 ? '#ef4444' : 'var(--muted-foreground)')
                  }}>
                    <Flame size={13} /> {h.streak}
                  </span>
                )}

                {!isReadOnly && (
                  <div style={{ display: 'flex', gap: '0.3rem', flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                    <button className="btn btn-outline" style={{ height: '1.75rem', width: '1.75rem', padding: 0 }} onClick={() => openEdit(h)}><Edit2 size={12} /></button>
                    <button className="btn btn-outline" style={{ height: '1.75rem', width: '1.75rem', padding: 0 }} onClick={() => handleDelete(h.id)}><Trash2 size={12} /></button>
                  </div>
                )}
              </div>

              {/* Habit Details, Heatmap, and Task list */}
              {expandedId === h.id && (
                <div style={{ padding: '0 1.1rem 1rem', borderTop: '1px solid var(--border)', paddingTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {h.description && <p style={{ fontSize: '0.82rem', color: 'var(--muted-foreground)', margin: 0 }}>{h.description}</p>}
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', flexWrap: 'wrap' }}>
                    <div>
                      <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '0.75rem' }}>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: '1.4rem', fontWeight: '800', color: h.color || 'var(--primary)' }}>{h.streak}</div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--muted-foreground)' }}>Current streak</div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: '1.4rem', fontWeight: '800', color: 'var(--foreground)' }}>{h.completion_rate}%</div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--muted-foreground)' }}>Last 30 days</div>
                        </div>
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--muted-foreground)', marginBottom: '0.35rem', fontWeight: '600' }}>13-Week Activity</div>
                      <HeatmapGrid history={histories[h.id] || []} color={h.color} />
                    </div>

                    {/* Habit Tasks List Section */}
                    <div style={{ borderLeft: '1px solid var(--border)', paddingLeft: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      <div style={{ fontSize: '0.8rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <Sparkles size={13} style={{ color: h.color }} /> Habit Tasks
                      </div>

                      {/* Add task input */}
                      {!isReadOnly && (
                        <div style={{ display: 'flex', gap: '0.35rem' }}>
                          <input
                            type="text"
                            className="input-control"
                            style={{ fontSize: '0.8rem', height: '1.85rem' }}
                            placeholder="Add task title..."
                            value={newTaskTitles[h.id] || ''}
                            onChange={e => setNewTaskTitles(prev => ({ ...prev, [h.id]: e.target.value }))}
                            onKeyDown={e => { if (e.key === 'Enter') handleAddTaskToHabit(h.id); }}
                          />
                          <select
                            className="input-control"
                            style={{ fontSize: '0.8rem', height: '1.85rem', width: '90px', padding: '0 0.25rem' }}
                            value={newTaskTypes[h.id] || 'one_time'}
                            onChange={e => setNewTaskTypes(prev => ({ ...prev, [h.id]: e.target.value }))}
                          >
                            <option value="one_time">One-time</option>
                            <option value="recurring">Recurring</option>
                          </select>
                          <button className="btn btn-outline" style={{ height: '1.85rem', padding: '0 0.5rem', fontSize: '0.8rem' }} onClick={() => handleAddTaskToHabit(h.id)}>
                            +
                          </button>
                        </div>
                      )}

                      {/* Task checklist */}
                      {(!h.tasks || h.tasks.length === 0) ? (
                        <p style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)', fontStyle: 'italic', margin: '0.5rem 0' }}>
                          No tasks assigned to this habit.
                        </p>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', maxHeight: '160px', overflowY: 'auto' }}>
                          {h.tasks.map(task => (
                            <div key={task.id} style={{
                              display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem 0.5rem',
                              backgroundColor: 'var(--muted)', borderRadius: '4px', border: '1px solid var(--border)',
                              opacity: task.completed_today ? 0.65 : 1
                            }}>
                              <button
                                onClick={() => !isReadOnly && handleToggleTaskComplete(task)}
                                style={{
                                  width: '18px', height: '18px', borderRadius: '50%', border: 'none', cursor: isReadOnly ? 'default' : 'pointer',
                                  backgroundColor: task.completed_today ? (h.color || '#10b981') : 'var(--border)',
                                  color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                                }}
                              >
                                {task.completed_today && <Check size={10} strokeWidth={3} />}
                              </button>
                              <span style={{
                                fontSize: '0.78rem', fontWeight: '500', flex: 1, minWidth: 0, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap',
                                textDecoration: task.completed_today ? 'line-through' : 'none'
                              }} title={task.title}>{task.title}</span>
                              
                              {/* Type tag icon */}
                              {task.habit_task_type === 'recurring' ? (
                                <RefreshCw size={10} style={{ color: 'var(--muted-foreground)' }} title="Recurring Habit Task" />
                              ) : (
                                <Calendar size={10} style={{ color: 'var(--muted-foreground)' }} title="One-time Habit Task" />
                              )}
                              
                              {!isReadOnly && (
                                <button onClick={() => handleDeleteHabitTask(task.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted-foreground)', fontSize: '0.85rem' }}>
                                  ×
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Habit Create/Edit Modal */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{modalMode === 'create' ? 'Create Habit' : 'Edit Habit'}</h2>
              <button className="close-btn" onClick={() => setIsModalOpen(false)}>×</button>
            </div>

            <div className="modal-body">
              <form onSubmit={handleSave}>
                <div className="form-group">
                  <label htmlFor="habit-title">Habit Title</label>
                  <input id="habit-title" type="text" className="input-control" value={title}
                    onChange={(e) => setTitle(e.target.value)} required maxLength={80} autoFocus />
                </div>
                <div className="form-group">
                  <label htmlFor="habit-desc">Description (optional)</label>
                  <textarea id="habit-desc" className="input-control" rows={2} value={description}
                    onChange={(e) => setDescription(e.target.value)} maxLength={300} />
                </div>

                <div className="form-group">
                  <label>Icon</label>
                  <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginTop: '0.25rem' }}>
                    {EMOJI_OPTIONS.map(em => (
                      <button key={em} type="button" onClick={() => setIcon(em)} style={{
                        width: '32px', height: '32px', borderRadius: '6px', border: icon === em ? '2px solid var(--primary)' : '1px solid var(--border)',
                        backgroundColor: icon === em ? 'color-mix(in srgb,var(--primary) 12%,transparent)' : 'var(--muted)',
                        cursor: 'pointer', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0
                      }}>{em}</button>
                    ))}
                  </div>
                </div>

                <div className="form-group">
                  <label>Color</label>
                  <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginTop: '0.25rem' }}>
                    {['#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6','#ec4899','#06b6d4','#f97316'].map(c => (
                      <button key={c} type="button" onClick={() => setColor(c)} style={{
                        width: '26px', height: '26px', borderRadius: '50%', backgroundColor: c, border: color === c ? '3px solid var(--foreground)' : '1px solid transparent',
                        cursor: 'pointer', padding: 0, transform: color === c ? 'scale(1.15)' : 'scale(1)', transition: 'transform 0.1s'
                      }} />
                    ))}
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="habit-freq">Frequency</label>
                  <select id="habit-freq" className="input-control" value={targetFrequency} onChange={(e) => setTargetFrequency(e.target.value)}>
                    {Object.entries(FREQUENCY_LABELS).map(([val, label]) => <option key={val} value={val}>{label}</option>)}
                  </select>
                </div>

                {targetFrequency === 'custom' && (
                  <div className="form-group">
                    <label>Which days?</label>
                    <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginTop: '0.25rem' }}>
                      {DAYS.map((day, idx) => (
                        <button key={idx} type="button"
                          onClick={() => setCustomDays(prev => prev.includes(idx) ? prev.filter(d => d !== idx) : [...prev, idx])}
                          style={{
                            padding: '0.3rem 0.6rem', borderRadius: '6px', fontSize: '0.78rem', fontWeight: '600', cursor: 'pointer',
                            border: '1px solid var(--border)',
                            backgroundColor: customDays.includes(idx) ? 'color-mix(in srgb,var(--primary) 15%,transparent)' : 'var(--muted)',
                            color: customDays.includes(idx) ? 'var(--primary)' : 'var(--muted-foreground)'
                          }}>
                          {day}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1.5rem', borderTop: '1px solid var(--border)', paddingTop: '0.75rem' }}>
                  <button type="button" className="btn btn-outline" onClick={() => setIsModalOpen(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary">Save Habit</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
