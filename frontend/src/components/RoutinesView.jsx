import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Check, RotateCcw, Clock, Flame, ChevronDown, ChevronUp, ToggleLeft, ToggleRight, Sparkles } from 'lucide-react';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const FREQUENCY_LABELS = {
  daily: 'Daily',
  weekdays: 'Weekdays (Mon–Fri)',
  weekends: 'Weekends (Sat–Sun)',
  weekly: 'Once a week',
  custom: 'Custom days'
};

function isDueToday(routine) {
  const day = new Date().getDay(); // 0=Sun
  switch (routine.frequency) {
    case 'daily': return true;
    case 'weekdays': return day >= 1 && day <= 5;
    case 'weekends': return day === 0 || day === 6;
    case 'weekly': return true;
    case 'custom': {
      try {
        const days = JSON.parse(routine.custom_days || '[]');
        return days.includes(day);
      } catch { return false; }
    }
    default: return true;
  }
}

export default function RoutinesView({ showToast, permissions }) {
  const [routines, setRoutines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);
  const [expandedRoutineId, setExpandedRoutineId] = useState(null);
  
  // Routine Edit/Create Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create');
  const [editingId, setEditingId] = useState(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [frequency, setFrequency] = useState('daily');
  const [customDays, setCustomDays] = useState([]);
  const [timeOfDay, setTimeOfDay] = useState('');
  const [estimatedTime, setEstimatedTime] = useState(0);

  // Routine Task Quick Add State
  const [newTaskTitles, setNewTaskTitles] = useState({}); // { routineId: 'title' }

  const isReadOnly = permissions === 'read';

  useEffect(() => { 
    fetchRoutines(); 
    
    const handleAddTrigger = (e) => {
      if (e.detail.tab === 'routines') {
        openCreate();
      }
    };
    window.addEventListener('trigger-add-action', handleAddTrigger);
    return () => {
      window.removeEventListener('trigger-add-action', handleAddTrigger);
    };
  }, []);

  // Midnight auto-reset check to clear checklists when local date changes
  useEffect(() => {
    let lastDate = new Date().toLocaleDateString();
    const interval = setInterval(() => {
      const currentDate = new Date().toLocaleDateString();
      if (currentDate !== lastDate) {
        lastDate = currentDate;
        fetchRoutines();
      }
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  const fetchRoutines = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/focusflow/routines');
      if (res.ok) setRoutines(await res.json());
      else showToast('Failed to load routines', 'error');
    } catch (err) { showToast('Network error loading routines', 'error'); }
    finally { setLoading(false); }
  };

  const openCreate = () => {
    setModalMode('create'); setEditingId(null);
    setTitle(''); setDescription(''); setFrequency('daily');
    setCustomDays([]); setTimeOfDay(''); setEstimatedTime(0);
    setIsModalOpen(true);
  };

  const openEdit = (r) => {
    setModalMode('edit'); setEditingId(r.id);
    setTitle(r.title); setDescription(r.description || '');
    setFrequency(r.frequency || 'daily');
    try { setCustomDays(JSON.parse(r.custom_days || '[]')); } catch { setCustomDays([]); }
    setTimeOfDay(r.time_of_day || ''); setEstimatedTime(r.estimated_time || 0);
    setIsModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!title.trim()) { showToast('Title is required', 'error'); return; }
    const payload = {
      title: title.trim(), description: description.trim(), frequency,
      custom_days: frequency === 'custom' ? customDays : null,
      time_of_day: timeOfDay || null, estimated_time: Number(estimatedTime) || 0
    };
    try {
      const res = await fetch(modalMode === 'create' ? '/api/focusflow/routines' : `/api/focusflow/routines/${editingId}`, {
        method: modalMode === 'create' ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) { showToast(modalMode === 'create' ? 'Routine created!' : 'Routine updated!', 'success'); setIsModalOpen(false); fetchRoutines(); }
      else { const d = await res.json(); showToast(d.error || 'Failed to save', 'error'); }
    } catch (err) { showToast('Network error', 'error'); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this routine? All associated routine tasks will also be deleted.')) return;
    try {
      const res = await fetch(`/api/focusflow/routines/${id}`, { method: 'DELETE' });
      if (res.ok) { showToast('Routine deleted', 'success'); fetchRoutines(); }
    } catch (err) { showToast('Network error', 'error'); }
  };

  const handleToggleActive = async (routine) => {
    try {
      const res = await fetch(`/api/focusflow/routines/${routine.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...routine, is_active: routine.is_active ? 0 : 1 })
      });
      if (res.ok) fetchRoutines();
    } catch (err) { showToast('Network error', 'error'); }
  };

  // Routine Task Actions
  const handleAddTaskToRoutine = async (routineId) => {
    const taskTitle = newTaskTitles[routineId] || '';
    if (!taskTitle.trim()) return;

    try {
      const res = await fetch('/api/focusflow/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: taskTitle.trim(),
          routine_id: routineId,
          status: 'backlog',
          priority: 'medium'
        })
      });
      if (res.ok) {
        showToast('Task added to routine', 'success');
        setNewTaskTitles(prev => ({ ...prev, [routineId]: '' }));
        fetchRoutines();
      } else {
        const d = await res.json();
        showToast(d.error || 'Failed to add task', 'error');
      }
    } catch (err) { showToast('Network error', 'error'); }
  };

  const handleDeleteRoutineTask = async (taskId) => {
    if (!window.confirm('Delete this task from the routine?')) return;
    try {
      const res = await fetch(`/api/focusflow/tasks/${taskId}`, { method: 'DELETE' });
      if (res.ok) {
        showToast('Task deleted from routine', 'success');
        fetchRoutines();
      } else showToast('Failed to delete task', 'error');
    } catch (err) { showToast('Network error', 'error'); }
  };

  const handleToggleTaskComplete = async (task) => {
    const method = task.completed_today ? 'DELETE' : 'POST';
    try {
      const res = await fetch(`/api/focusflow/routines/tasks/${task.id}/complete`, { method });
      if (res.ok) {
        if (!task.completed_today) showToast(`✅ Task complete!`, 'success');
        fetchRoutines();
      } else showToast('Failed to toggle task status', 'error');
    } catch (err) { showToast('Network error', 'error'); }
  };

  const todayRoutines = routines.filter(r => r.is_active && isDueToday(r));
  const otherRoutines = routines.filter(r => !r.is_active || !isDueToday(r));

  return (
    <div className="animate-fade-in">
      <div className="content-header">
        <div>
          <h2>Routines</h2>
          <p>Group tasks together into structures (Morning Routine, Clean Up) that recur on schedule.</p>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '5rem' }}><div className="spinner" /></div>
      ) : (
        <>
          {/* Today's Checklist of Routines & their tasks */}
          {todayRoutines.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '3rem 2rem', marginBottom: '1.5rem' }}>
              <RotateCcw size={40} style={{ margin: '0 auto 0.75rem', opacity: 0.4, color: 'var(--muted-foreground)' }} />
              <h3>No routines scheduled for today</h3>
              <p style={{ color: 'var(--muted-foreground)', marginTop: '0.25rem' }}>Create routines to build daily habits and structure.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginBottom: '2rem' }}>
              {todayRoutines.map(r => {
                const totalTasks = r.tasks?.length || 0;
                const doneTasks = r.tasks?.filter(t => t.completed_today).length || 0;
                const pct = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;
                const isExpanded = expandedRoutineId === r.id;

                return (
                  <div key={r.id} className="card" style={{ padding: 0, overflow: 'hidden', borderLeft: `5px solid var(--primary)` }}>
                    {/* Routine Header */}
                    <div style={{
                      padding: '1rem 1.25rem', backgroundColor: 'var(--muted)', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      cursor: 'pointer'
                    }} onClick={() => setExpandedRoutineId(isExpanded ? null : r.id)}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                          <span style={{ fontWeight: '700', fontSize: '1rem' }}>{r.title}</span>
                          <span style={{ fontSize: '0.72rem', padding: '0.15rem 0.4rem', borderRadius: '10px', backgroundColor: 'var(--border)', color: 'var(--muted-foreground)' }}>
                            {FREQUENCY_LABELS[r.frequency]}
                          </span>
                          {r.time_of_day && (
                            <span style={{ fontSize: '0.72rem', color: 'var(--muted-foreground)', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                              <Clock size={11} /> {r.time_of_day}
                            </span>
                          )}
                        </div>
                        {r.description && <p style={{ fontSize: '0.8rem', color: 'var(--muted-foreground)', margin: '0.25rem 0 0' }}>{r.description}</p>}
                        
                        {/* Progress indicator */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.5rem', maxWidth: '300px' }}>
                          <div style={{ flex: 1, height: '4px', backgroundColor: 'var(--border)', borderRadius: '2px', overflow: 'hidden' }}>
                            <div style={{ width: `${pct}%`, height: '100%', backgroundColor: pct === 100 ? '#10b981' : 'var(--primary)', transition: 'width 0.3s' }} />
                          </div>
                          <span style={{ fontSize: '0.72rem', fontWeight: '600', color: pct === 100 ? '#10b981' : 'var(--muted-foreground)' }}>{doneTasks}/{totalTasks} tasks</span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }} onClick={e => e.stopPropagation()}>
                        {r.streak > 0 && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', fontSize: '0.75rem', fontWeight: '700', padding: '0.15rem 0.45rem', borderRadius: '12px', backgroundColor: '#f59e0b22', color: '#f59e0b' }}>
                            <Flame size={12} /> {r.streak}d
                          </span>
                        )}
                        {!isReadOnly && (
                          <div style={{ display: 'flex', gap: '0.25rem' }}>
                            <button className="btn btn-outline" style={{ height: '1.75rem', width: '1.75rem', padding: 0 }} onClick={() => openEdit(r)}><Edit2 size={12} /></button>
                            <button className="btn btn-outline" style={{ height: '1.75rem', width: '1.75rem', padding: 0 }} onClick={() => handleDelete(r.id)}><Trash2 size={12} /></button>
                          </div>
                        )}
                        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </div>
                    </div>

                    {/* Routine Task List & Task Management */}
                    {isExpanded && (
                      <div style={{ padding: '1rem 1.25rem', borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {/* Add new task to routine input */}
                        {!isReadOnly && (
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <input
                              type="text"
                              className="input-control"
                              placeholder="Add a step to this routine (e.g. Drink glass of water)..."
                              value={newTaskTitles[r.id] || ''}
                              onChange={e => setNewTaskTitles(prev => ({ ...prev, [r.id]: e.target.value }))}
                              onKeyDown={e => { if (e.key === 'Enter') handleAddTaskToRoutine(r.id); }}
                            />
                            <button className="btn btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', whiteSpace: 'nowrap' }} onClick={() => handleAddTaskToRoutine(r.id)}>
                              <Plus size={14} /> Add Task
                            </button>
                          </div>
                        )}

                        {/* Routine tasks checklist */}
                        {totalTasks === 0 ? (
                          <p style={{ fontSize: '0.8rem', color: 'var(--muted-foreground)', fontStyle: 'italic', textAlign: 'center', padding: '1rem' }}>
                            No tasks added to this routine yet. Add some tasks above to get started!
                          </p>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            {r.tasks.map(task => (
                              <div key={task.id} style={{
                                display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem 0.75rem', backgroundColor: 'var(--background)',
                                border: '1px solid var(--border)', borderRadius: '6px', opacity: task.completed_today ? 0.65 : 1
                              }}>
                                <button
                                  onClick={() => !isReadOnly && handleToggleTaskComplete(task)}
                                  style={{
                                    width: '22px', height: '22px', borderRadius: '50%', border: 'none', cursor: isReadOnly ? 'default' : 'pointer',
                                    backgroundColor: task.completed_today ? '#10b981' : 'var(--border)',
                                    color: task.completed_today ? 'white' : 'var(--muted-foreground)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                                  }}
                                >
                                  {task.completed_today && <Check size={12} strokeWidth={3} />}
                                </button>
                                <span style={{
                                  fontSize: '0.85rem', fontWeight: '500', flex: 1,
                                  textDecoration: task.completed_today ? 'line-through' : 'none'
                                }}>{task.title}</span>
                                {!isReadOnly && (
                                  <button
                                    onClick={() => handleDeleteRoutineTask(task.id)}
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted-foreground)' }}
                                    title="Remove task"
                                  >
                                    ×
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Show All / Other Routines */}
          {otherRoutines.length > 0 && (
            <div>
              <button onClick={() => setShowAll(v => !v)} style={{
                background: 'none', border: 'none', color: 'var(--muted-foreground)', fontSize: '0.85rem',
                fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.75rem', padding: 0
              }}>
                {showAll ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                {showAll ? 'Hide' : 'Show'} other routines ({otherRoutines.length})
              </button>
              {showAll && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                  {otherRoutines.map(r => {
                    const isExpanded = expandedRoutineId === r.id;
                    const totalTasks = r.tasks?.length || 0;
                    return (
                      <div key={r.id} className="card" style={{ padding: 0, overflow: 'hidden', opacity: r.is_active ? 1 : 0.6 }}>
                        <div style={{
                          padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', justifyItems: 'center', gap: '0.75rem', cursor: 'pointer',
                          backgroundColor: 'var(--muted)'
                        }} onClick={() => setExpandedRoutineId(isExpanded ? null : r.id)}>
                          <RotateCcw size={15} style={{ color: 'var(--muted-foreground)' }} />
                          <div style={{ flex: 1 }}>
                            <span style={{ fontWeight: '600', fontSize: '0.88rem' }}>{r.title}</span>
                            <span style={{ fontSize: '0.72rem', color: 'var(--muted-foreground)', marginLeft: '0.5rem' }}>
                              {FREQUENCY_LABELS[r.frequency]} ({totalTasks} tasks)
                            </span>
                            {!r.is_active && <span style={{ fontSize: '0.7rem', color: 'var(--muted-foreground)', marginLeft: '0.5rem' }}>(paused)</span>}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }} onClick={e => e.stopPropagation()}>
                            {!isReadOnly && (
                              <>
                                <button className="btn btn-outline" style={{ height: '1.75rem', padding: '0 0.5rem', fontSize: '0.72rem' }}
                                  onClick={() => handleToggleActive(r)}>
                                  {r.is_active ? <ToggleRight size={14} style={{ color: 'var(--primary)' }} /> : <ToggleLeft size={14} />}
                                </button>
                                <button className="btn btn-outline" style={{ height: '1.75rem', width: '1.75rem', padding: 0 }} onClick={() => openEdit(r)}><Edit2 size={12} /></button>
                                <button className="btn btn-outline" style={{ height: '1.75rem', width: '1.75rem', padding: 0 }} onClick={() => handleDelete(r.id)}><Trash2 size={12} /></button>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Routine Task Management */}
                        {isExpanded && (
                          <div style={{ padding: '0.75rem 1rem', borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            {!isReadOnly && (
                              <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <input
                                  type="text"
                                  className="input-control"
                                  placeholder="Add routine task..."
                                  value={newTaskTitles[r.id] || ''}
                                  onChange={e => setNewTaskTitles(prev => ({ ...prev, [r.id]: e.target.value }))}
                                  onKeyDown={e => { if (e.key === 'Enter') handleAddTaskToRoutine(r.id); }}
                                />
                                <button className="btn btn-outline" style={{ fontSize: '0.75rem' }} onClick={() => handleAddTaskToRoutine(r.id)}>Add</button>
                              </div>
                            )}
                            {totalTasks === 0 ? (
                              <p style={{ fontSize: '0.78rem', color: 'var(--muted-foreground)', fontStyle: 'italic', margin: 0 }}>No tasks in this routine.</p>
                            ) : (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                                {r.tasks.map(task => (
                                  <div key={task.id} style={{ display: 'flex', alignItems: 'center', justifyItems: 'center', justifyContent: 'space-between', padding: '0.35rem 0.5rem', backgroundColor: 'var(--background)', borderRadius: '4px', border: '1px solid var(--border)' }}>
                                    <span style={{ fontSize: '0.8rem' }}>{task.title}</span>
                                    {!isReadOnly && <button onClick={() => handleDeleteRoutineTask(task.id)} style={{ background: 'none', border: 'none', color: 'var(--muted-foreground)', cursor: 'pointer' }}>×</button>}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Routine edit/create Modal */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{modalMode === 'create' ? 'Create Routine' : 'Edit Routine'}</h2>
              <button className="close-btn" onClick={() => setIsModalOpen(false)}>×</button>
            </div>

            <div className="modal-body">
              <form onSubmit={handleSave}>
                <div className="form-group">
                  <label htmlFor="routine-title">Routine Title</label>
                  <input id="routine-title" type="text" className="input-control" value={title}
                    onChange={(e) => setTitle(e.target.value)} required maxLength={80} autoFocus />
                </div>
                <div className="form-group">
                  <label htmlFor="routine-desc">Description (optional)</label>
                  <textarea id="routine-desc" className="input-control" value={description}
                    onChange={(e) => setDescription(e.target.value)} maxLength={300} rows={2} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.5rem' }}>
                  <div className="form-group">
                    <label htmlFor="routine-freq">Frequency</label>
                    <select id="routine-freq" className="input-control" value={frequency} onChange={(e) => setFrequency(e.target.value)}>
                      {Object.entries(FREQUENCY_LABELS).map(([val, label]) => <option key={val} value={val}>{label}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label htmlFor="routine-time">Suggested Time</label>
                    <input id="routine-time" type="time" className="input-control" value={timeOfDay} onChange={(e) => setTimeOfDay(e.target.value)} />
                  </div>
                </div>
                {frequency === 'custom' && (
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
                <div className="form-group">
                  <label htmlFor="routine-est">Estimated Time (minutes)</label>
                  <input id="routine-est" type="number" min="0" className="input-control" value={estimatedTime}
                    onChange={(e) => setEstimatedTime(e.target.value)} placeholder="e.g. 15" />
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1.5rem', borderTop: '1px solid var(--border)', paddingTop: '0.75rem' }}>
                  <button type="button" className="btn btn-outline" onClick={() => setIsModalOpen(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary">Save Routine</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
