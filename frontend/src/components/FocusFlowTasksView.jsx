import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus, Search, Trash2, Edit2, CheckCircle, Play, Pause,
  AlertCircle, Clock, Calendar, ChevronDown, ChevronUp,
  Inbox, AlertTriangle, Zap, Sparkles, FolderOpen, AlarmClock, User
} from 'lucide-react';

const PRIORITY_COLORS = {
  urgent: { text: '#ef4444', bg: '#ef444422' },
  high:   { text: '#f59e0b', bg: '#f59e0b22' },
  medium: { text: '#3b82f6', bg: '#3b82f622' },
  low:    { text: '#10b981', bg: '#10b98122' }
};

// Check if current time falls within a project's schedule blocks
function isWithinSchedule(project, schedules) {
  if (!project.schedule_enabled || !schedules || schedules.length === 0) return true;
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0=Sun
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const todayBlocks = schedules.filter(b => b.day_of_week === dayOfWeek);
  if (todayBlocks.length === 0) return false; // No blocks for today
  for (const block of todayBlocks) {
    if (block.all_day) return true;
    if (block.start_time && block.end_time) {
      const [sh, sm] = block.start_time.split(':').map(Number);
      const [eh, em] = block.end_time.split(':').map(Number);
      if (nowMin >= sh * 60 + sm && nowMin <= eh * 60 + em) return true;
    }
  }
  return false;
}

export default function TasksView({ showToast, permissions }) {
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]); // Household users list
  const [projectSchedules, setProjectSchedules] = useState({}); // { projectId: [blocks] }
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('pending');
  const [filterPriority, setFilterPriority] = useState('');
  const [collapsedGroups, setCollapsedGroups] = useState({});

  // Active Timer state
  const [activeLog, setActiveLog] = useState(null);

  // Edit/Create Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create');

  // Task form details
  const [taskId, setTaskId] = useState(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [project_id, setProjectId] = useState('');
  const [assignedUserId, setAssignedUserId] = useState('');
  const [status, setStatus] = useState('backlog');
  const [priority, setPriority] = useState('medium');
  const [due_date, setDueDate] = useState('');
  const [estimated_time, setEstimatedTime] = useState(0);
  const [subtasks, setSubtasks] = useState([]);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [expandedTaskId, setExpandedTaskId] = useState(null);

  const isReadOnly = permissions === 'read';

  const fetchActiveLog = async () => {
    try {
      const res = await fetch('/api/focusflow/timelogs/active');
      if (res.ok) setActiveLog(await res.json());
    } catch (err) { console.error(err); }
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/users/list');
      if (res.ok) setUsers(await res.json());
    } catch (err) { console.error(err); }
  };

  const fetchProjects = async () => {
    try {
      const res = await fetch('/api/focusflow/projects');
      if (res.ok) {
        const data = await res.json();
        setProjects(data);
        // Fetch schedules for all scheduled projects
        const scheduled = data.filter(p => p.schedule_enabled);
        const scheduleMap = {};
        await Promise.all(scheduled.map(async (p) => {
          try {
            const sr = await fetch(`/api/focusflow/projects/${p.id}/schedules`);
            if (sr.ok) scheduleMap[p.id] = await sr.json();
          } catch (_) {}
        }));
        setProjectSchedules(scheduleMap);
      }
    } catch (err) { console.error(err); }
  };

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    try {
      let query = `?q=${encodeURIComponent(search)}`;
      if (filterStatus) query += `&status=${filterStatus}`;
      if (filterPriority) query += `&priority=${filterPriority}`;
      const res = await fetch(`/api/focusflow/tasks${query}`);
      if (res.ok) setTasks(await res.json());
      else showToast('Failed to load tasks', 'error');
    } catch (err) { showToast('Network error loading tasks', 'error'); }
    finally { setLoading(false); }
  }, [search, filterStatus, filterPriority]);

  useEffect(() => { 
    fetchProjects(); 
    fetchUsers(); 
    
    const handleAddTrigger = (e) => {
      if (e.detail.tab === 'todo') {
        handleOpenCreateModal();
      }
    };
    window.addEventListener('trigger-add-action', handleAddTrigger);
    return () => {
      window.removeEventListener('trigger-add-action', handleAddTrigger);
    };
  }, []);
  useEffect(() => { fetchTasks(); fetchActiveLog(); }, [fetchTasks]);

  // Group tasks by project
  const groupedTasks = () => {
    const groups = {};
    // Ensure Inbox comes first
    const sortedProjects = [...projects].sort((a, b) => {
      if (a.name === 'Inbox') return -1;
      if (b.name === 'Inbox') return 1;
      return a.name.localeCompare(b.name);
    });
    sortedProjects.forEach(p => { groups[p.id] = { project: p, tasks: [] }; });
    // Tasks without a project go to Inbox
    const inbox = projects.find(p => p.name === 'Inbox');
    tasks.forEach(task => {
      const pid = task.project_id || (inbox ? inbox.id : 'none');
      if (groups[pid]) groups[pid].tasks.push(task);
    });
    return Object.values(groups).filter(g => g.tasks.length > 0 || g.project.name === 'Inbox');
  };

  const toggleGroup = (projectId) => {
    setCollapsedGroups(prev => ({ ...prev, [projectId]: !prev[projectId] }));
  };

  const openCreateForProject = (proj) => {
    setModalMode('create');
    setTaskId(null);
    setTitle(''); setDescription('');
    setProjectId(String(proj.id));
    setAssignedUserId('');
    setStatus('backlog'); setPriority('medium');
    setDueDate(''); setEstimatedTime(0);
    setSubtasks([]); setNewSubtaskTitle('');
    setIsModalOpen(true);
  };

  const handleOpenCreateModal = () => {
    const inbox = projects.find(p => p.name === 'Inbox');
    openCreateForProject(inbox || projects[0] || { id: '' });
  };

  const handleOpenEditModal = async (task) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/focusflow/tasks/${task.id}`);
      if (res.ok) {
        const d = await res.json();
        setModalMode('edit'); setTaskId(d.id); setTitle(d.title);
        setDescription(d.description || '');
        setProjectId(d.project_id ? String(d.project_id) : '');
        setAssignedUserId(d.user_id ? String(d.user_id) : '');
        setStatus(d.status || 'backlog'); setPriority(d.priority || 'medium');
        setDueDate(d.due_date || ''); setEstimatedTime(d.estimated_time || 0);
        setSubtasks(d.subtasks || []); setNewSubtaskTitle('');
        setIsModalOpen(true);
      } else showToast('Failed to load task details', 'error');
    } catch (err) { showToast('Network error', 'error'); }
    finally { setLoading(false); }
  };

  const handleAddSubtask = () => {
    if (!newSubtaskTitle.trim()) return;
    setSubtasks([...subtasks, { title: newSubtaskTitle.trim(), status: 'backlog' }]);
    setNewSubtaskTitle('');
  };

  const handleSaveTask = async (e) => {
    e.preventDefault();
    if (!title.trim()) { showToast('Task title is required', 'error'); return; }
    
    // Check if the target project is shared
    const targetProj = projects.find(p => String(p.id) === String(project_id));
    const isSharedProj = targetProj && targetProj.is_shared === 1;

    const payload = {
      title: title.trim(), description: description.trim(),
      project_id: project_id ? Number(project_id) : null,
      status, priority, due_date: due_date || null,
      estimated_time: Number(estimated_time) || 0, subtasks,
      user_id: isSharedProj && assignedUserId ? Number(assignedUserId) : null
    };
    try {
      const res = await fetch(modalMode === 'create' ? '/api/focusflow/tasks' : `/api/focusflow/tasks/${taskId}`, {
        method: modalMode === 'create' ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        showToast(modalMode === 'create' ? 'Task created!' : 'Task updated!', 'success');
        setIsModalOpen(false); fetchTasks();
      } else {
        const d = await res.json();
        showToast(d.error || 'Failed to save task', 'error');
      }
    } catch (err) { showToast('Network error saving task', 'error'); }
  };

  const handleDeleteTask = async (id) => {
    if (!window.confirm('Delete this task?')) return;
    try {
      const res = await fetch(`/api/focusflow/tasks/${id}`, { method: 'DELETE' });
      if (res.ok) { showToast('Task deleted', 'success'); fetchTasks(); if (activeLog?.task_id === id) setActiveLog(null); }
      else showToast('Failed to delete task', 'error');
    } catch (err) { showToast('Network error', 'error'); }
  };

  const handleToggleToday = async (task) => {
    const nextStatus = task.status === 'today' ? 'backlog' : 'today';
    try {
      const res = await fetch(`/api/focusflow/tasks/${task.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...task, status: nextStatus })
      });
      if (res.ok) { showToast(nextStatus === 'today' ? 'Added to Today' : 'Moved to Backlog', 'success'); fetchTasks(); }
    } catch (err) { showToast('Network error', 'error'); }
  };

  const handleCompleteTask = async (task) => {
    try {
      const res = await fetch(`/api/focusflow/tasks/${task.id}/complete`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: true, title: task.title })
      });
      if (res.ok) { showToast('Task completed! 🎯', 'success'); fetchTasks(); if (activeLog?.task_id === task.id) setActiveLog(null); }
    } catch (err) { showToast('Network error', 'error'); }
  };

  const handleToggleSubtaskComplete = async (subtask) => {
    try {
      const isCompleted = subtask.status === 'completed';
      const res = await fetch(`/api/focusflow/tasks/${subtask.id}/complete`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: !isCompleted, title: subtask.title })
      });
      if (res.ok) {
        showToast(isCompleted ? 'Micro-step incomplete' : 'Micro-step completed! 🎯', 'success');
        fetchTasks();
      } else {
        showToast('Failed to update micro-step', 'error');
      }
    } catch (err) {
      showToast('Network error', 'error');
    }
  };

  const handleStartTimer = async (task) => {
    try {
      const res = await fetch('/api/focusflow/timelogs/start', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task_id: task.id })
      });
      if (res.ok) { showToast(`Tracking: "${task.title}"`, 'success'); fetchActiveLog(); fetchTasks(); }
    } catch (err) { showToast('Network error', 'error'); }
  };

  const handleStopTimer = async () => {
    if (!activeLog) return;
    try {
      const res = await fetch('/api/focusflow/timelogs/stop', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ log_id: activeLog.id })
      });
      if (res.ok) { showToast('Timer stopped, work log saved.', 'success'); setActiveLog(null); fetchTasks(); }
    } catch (err) { showToast('Network error', 'error'); }
  };

  const formatTime = (seconds) => {
    if (!seconds) return '0m';
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;
  };

  const groups = groupedTasks();

  const TaskCard = ({ task }) => {
    const isActive = activeLog && activeLog.task_id === task.id;
    const actualMin = Math.round((task.time_spent || 0) / 60);
    const isOver = task.estimated_time > 0 && actualMin > task.estimated_time;

    return (
      <div className="card" style={{
        padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem',
        borderLeft: isActive ? '4px solid #10b981' : '4px solid transparent'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '0.3rem' }}>
              <span style={{
                fontSize: '0.65rem', padding: '0.1rem 0.4rem', borderRadius: '4px',
                backgroundColor: PRIORITY_COLORS[task.priority]?.bg, color: PRIORITY_COLORS[task.priority]?.text,
                fontWeight: 'bold', textTransform: 'uppercase'
              }}>{task.priority}</span>
              {task.status === 'today' && (
                <span style={{ fontSize: '0.65rem', padding: '0.1rem 0.4rem', borderRadius: '4px', backgroundColor: '#10b98122', color: '#10b981', fontWeight: 'bold' }}>
                  ⚡ TODAY
                </span>
              )}
              {task.project_is_shared === 1 && (
                <span style={{ fontSize: '0.65rem', padding: '0.1rem 0.4rem', borderRadius: '4px', backgroundColor: '#3b82f618', color: '#2563eb', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                  <User size={10} /> {task.assignee_display_name || task.assignee_username || 'Unassigned'}
                </span>
              )}
              {task.due_date && (
                <span style={{ fontSize: '0.72rem', color: 'var(--muted-foreground)', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                  <Calendar size={11} /> {task.due_date}
                </span>
              )}
            </div>
            <h3 style={{ fontSize: '0.95rem', fontWeight: '600', marginBottom: '0.15rem' }}>{task.title}</h3>
            {task.description && (
              <p style={{ fontSize: '0.8rem', color: 'var(--muted-foreground)' }}>{task.description}</p>
            )}
            {task.subtasks && task.subtasks.length > 0 && (
              <button onClick={() => setExpandedTaskId(expandedTaskId === task.id ? null : task.id)}
                style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: '0.78rem', fontWeight: '600',
                  display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.4rem', cursor: 'pointer', padding: 0 }}>
                {task.subtasks.filter(s => s.status === 'completed').length}/{task.subtasks.length} micro-steps
                {expandedTaskId === task.id ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
              </button>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.75rem', fontWeight: '500' }}>
              <Clock size={11} />
              <span>{formatTime(task.time_spent)}</span>
              {task.estimated_time > 0 && (
                <>
                  <span style={{ color: 'var(--muted-foreground)' }}>/ {task.estimated_time}m est</span>
                  {isOver && <AlertTriangle size={11} style={{ color: '#ef4444' }} title="Exceeded estimate!" />}
                </>
              )}
            </div>
            {!isReadOnly && (
              <div style={{ display: 'flex', gap: '0.3rem', marginTop: '0.15rem' }}>
                {task.status !== 'completed' && (
                  <button className="btn btn-outline" style={{ height: '1.75rem', width: '1.75rem', padding: 0 }}
                    title="Complete" onClick={() => handleCompleteTask(task)}>
                    <CheckCircle size={13} />
                  </button>
                )}
                {isActive ? (
                  <button className="btn btn-danger" style={{ height: '1.75rem', width: '1.75rem', padding: 0 }}
                    title="Stop timer" onClick={handleStopTimer}>
                    <Pause size={11} fill="currentColor" />
                  </button>
                ) : (
                  task.status !== 'completed' && (
                    <button className="btn btn-outline" style={{ height: '1.75rem', width: '1.75rem', padding: 0 }}
                      title="Start timer" onClick={() => handleStartTimer(task)}>
                      <Play size={11} fill="currentColor" />
                    </button>
                  )
                )}
                {task.status !== 'completed' && (
                  <button className="btn btn-outline" style={{ height: '1.75rem', fontSize: '0.7rem', padding: '0 0.45rem',
                    backgroundColor: task.status === 'today' ? 'color-mix(in srgb,var(--primary) 12%,transparent)' : 'transparent',
                    color: task.status === 'today' ? 'var(--primary)' : 'var(--foreground)' }}
                    onClick={() => handleToggleToday(task)}>Today</button>
                )}
                <button className="btn btn-outline" style={{ height: '1.75rem', width: '1.75rem', padding: 0 }}
                  title="Edit" onClick={() => handleOpenEditModal(task)}>
                  <Edit2 size={12} />
                </button>
                <button className="btn btn-outline" style={{ height: '1.75rem', width: '1.75rem', padding: 0 }}
                  title="Delete" onClick={() => handleDeleteTask(task.id)}>
                  <Trash2 size={12} />
                </button>
              </div>
            )}
          </div>
        </div>

        {expandedTaskId === task.id && task.subtasks && task.subtasks.length > 0 && (
          <div style={{ padding: '0.5rem 0.75rem', backgroundColor: 'var(--muted)', borderRadius: '6px', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            {task.subtasks.map(sub => (
              <div key={sub.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <button
                  onClick={() => handleToggleSubtaskComplete(sub)}
                  title={sub.status === 'completed' ? "Mark Incomplete" : "Complete Micro-step"}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: 0,
                    display: 'flex',
                    alignItems: 'center',
                    color: 'var(--muted-foreground)'
                  }}
                >
                  <div style={{ width: '11px', height: '11px', borderRadius: '3px', border: '1.5px solid var(--ring)', flexShrink: 0,
                    backgroundColor: sub.status === 'completed' ? 'var(--primary)' : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {sub.status === 'completed' && <div style={{ width: '5px', height: '5px', backgroundColor: 'var(--primary-foreground)', borderRadius: '1px' }} />}
                  </div>
                </button>
                <span style={{ fontSize: '0.78rem', color: sub.status === 'completed' ? 'var(--muted-foreground)' : 'var(--foreground)',
                  textDecoration: sub.status === 'completed' ? 'line-through' : 'none' }}>
                  {sub.title}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const selectedProjObj = projects.find(p => String(p.id) === String(project_id));
  const isProjShared = selectedProjObj && selectedProjObj.is_shared === 1;

  return (
    <div className="tasks-view animate-fade-in">
      <div className="content-header">
        <div>
          <h2>Tasks</h2>
          <p>Tasks grouped by Focus Area — track time, beat procrastination, stay focused.</p>
        </div>
      </div>

      {/* Filter toolbar */}
      <div className="card" style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', padding: '1rem', marginBottom: '1.5rem' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
          <Search size={14} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted-foreground)' }} />
          <input type="text" className="input-control" style={{ paddingLeft: '2.25rem' }}
            placeholder="Search tasks..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="input-control" style={{ width: '150px' }} value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
          <option value="pending">Pending</option>
          <option value="today">Today's Focus</option>
          <option value="completed">Completed</option>
          <option value="all">All Statuses</option>
        </select>
        <select className="input-control" style={{ width: '140px' }} value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)}>
          <option value="">All Priorities</option>
          <option value="urgent">🔴 Urgent</option>
          <option value="high">🟡 High</option>
          <option value="medium">🔵 Medium</option>
          <option value="low">🟢 Low</option>
        </select>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '5rem' }}><div className="spinner" /></div>
      ) : groups.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
          <Inbox size={48} style={{ margin: '0 auto 1rem', opacity: 0.4, color: 'var(--muted-foreground)' }} />
          <h3>No tasks found</h3>
          <p style={{ color: 'var(--muted-foreground)', marginTop: '0.25rem' }}>Clear filters or capture a new task idea.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {groups.map(({ project, tasks: groupTasks }) => {
            const isCollapsed = collapsedGroups[project.id];
            const scheduleBlocks = projectSchedules[project.id] || [];
            const inSchedule = isWithinSchedule(project, scheduleBlocks);
            const accentColor = project.color || '#3b82f6';

            return (
              <div key={project.id} className="card" style={{ padding: 0, overflow: 'hidden' }}>
                {/* Focus Area group header */}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem',
                  borderBottom: isCollapsed ? 'none' : '1px solid var(--border)',
                  backgroundColor: `${accentColor}10`,
                  cursor: 'pointer'
                }} onClick={() => toggleGroup(project.id)}>
                  <div style={{ width: '3px', height: '20px', borderRadius: '2px', backgroundColor: accentColor, flexShrink: 0 }} />
                  <FolderOpen size={16} style={{ color: accentColor, flexShrink: 0 }} />
                  <span style={{ fontWeight: '700', fontSize: '0.95rem', color: accentColor, flex: 1, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    {project.name}
                    {project.is_shared === 1 && (
                      <span style={{ fontSize: '0.65rem', padding: '0.05rem 0.35rem', borderRadius: '10px', backgroundColor: '#3b82f622', color: '#3b82f6', fontWeight: 'bold' }}>
                        👥 Shared List
                      </span>
                    )}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)', marginRight: '0.5rem' }}>
                    {groupTasks.length} task{groupTasks.length !== 1 ? 's' : ''}
                  </span>

                  {/* Schedule warning badge */}
                  {project.schedule_enabled === 1 && !inSchedule && (
                    <span title="Outside scheduled focus hours for this Focus Area" style={{
                      display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.7rem',
                      padding: '0.15rem 0.5rem', borderRadius: '20px',
                      backgroundColor: '#f59e0b22', color: '#f59e0b', fontWeight: '600', marginRight: '0.25rem'
                    }}>
                      <AlarmClock size={11} /> Off-schedule
                    </span>
                  )}

                  {isCollapsed ? <ChevronDown size={16} style={{ color: 'var(--muted-foreground)' }} /> : <ChevronUp size={16} style={{ color: 'var(--muted-foreground)' }} />}
                </div>

                {/* Task list */}
                {!isCollapsed && (
                  <div style={{ padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                    {groupTasks.map(task => <TaskCard key={task.id} task={task} />)}
                    {!isReadOnly && (
                      <button className="btn btn-outline" style={{ alignSelf: 'flex-start', fontSize: '0.8rem', gap: '0.35rem' }}
                        onClick={() => openCreateForProject(project)}>
                        <Plus size={13} /> Add task to {project.name}
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Dialog */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{modalMode === 'create' ? 'Create Task' : 'Edit Task'}</h2>
              <button className="close-btn" onClick={() => setIsModalOpen(false)}>×</button>
            </div>

            <div className="modal-body">
              <form onSubmit={handleSaveTask}>
                <div className="form-group">
                  <label htmlFor="task-title">Task Title</label>
                  <input id="task-title" type="text" className="input-control" value={title}
                    onChange={(e) => setTitle(e.target.value)} required maxLength={100} autoFocus />
                </div>
                <div className="form-group">
                  <label htmlFor="task-desc">Description (short, action-oriented)</label>
                  <textarea id="task-desc" className="input-control" value={description}
                    onChange={(e) => setDescription(e.target.value)} maxLength={500} />
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: isProjShared ? '1fr 1fr 1fr' : '1fr 1fr', gap: '0.75rem', marginBottom: '0.5rem' }}>
                  <div className="form-group">
                    <label htmlFor="task-project">Focus Area</label>
                    <select id="task-project" className="input-control" value={project_id} onChange={(e) => setProjectId(e.target.value)}>
                      {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label htmlFor="task-priority">Priority</label>
                    <select id="task-priority" className="input-control" value={priority} onChange={(e) => setPriority(e.target.value)}>
                      <option value="low">🟢 Low</option>
                      <option value="medium">🔵 Medium</option>
                      <option value="high">🟡 High</option>
                      <option value="urgent">🔴 Urgent</option>
                    </select>
                  </div>
                  {isProjShared && (
                    <div className="form-group">
                      <label htmlFor="task-assignee">Assignee</label>
                      <select id="task-assignee" className="input-control" value={assignedUserId} onChange={(e) => setAssignedUserId(e.target.value)}>
                        <option value="">Unassigned</option>
                        {users.map(u => (
                          <option key={u.id} value={u.id}>{u.display_name || u.username}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.5rem' }}>
                  <div className="form-group">
                    <label htmlFor="task-duedate">Due Date</label>
                    <input id="task-duedate" type="date" className="input-control" value={due_date} onChange={(e) => setDueDate(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label htmlFor="task-est">Est. Effort (minutes)</label>
                    <input id="task-est" type="number" min="0" className="input-control" value={estimated_time}
                      onChange={(e) => setEstimatedTime(e.target.value)} placeholder="e.g. 30" />
                  </div>
                </div>
                {modalMode === 'edit' && (
                  <div className="form-group">
                    <label htmlFor="task-status">Status</label>
                    <select id="task-status" className="input-control" value={status} onChange={(e) => setStatus(e.target.value)}>
                      <option value="backlog">Backlog</option>
                      <option value="today">Today's Focus</option>
                      <option value="completed">Completed</option>
                      <option value="archived">Archived</option>
                    </select>
                  </div>
                )}
                {/* Micro-steps */}
                <div className="form-group" style={{ marginTop: '0.75rem', borderTop: '1px solid var(--border)', paddingTop: '0.75rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <Sparkles size={14} /> Micro-steps (Break it down!)
                  </label>
                  {subtasks.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', margin: '0.4rem 0' }}>
                      {subtasks.map((sub, sidx) => (
                        <div key={sidx} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: '0.8rem', color: 'var(--foreground)' }}>- {sub.title}</span>
                          <button type="button" className="btn btn-outline" style={{ height: '1.5rem', fontSize: '0.7rem', padding: '0 0.35rem' }}
                            onClick={() => setSubtasks(subtasks.filter((_, i) => i !== sidx))}>Remove</button>
                        </div>
                      ))}
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.4rem' }}>
                    <input type="text" className="input-control" style={{ flex: 1, height: '2.1rem', fontSize: '0.82rem' }}
                      placeholder="Add a micro-step..." value={newSubtaskTitle} onChange={(e) => setNewSubtaskTitle(e.target.value)} />
                    <button type="button" className="btn btn-outline" style={{ height: '2.1rem', fontSize: '0.82rem' }} onClick={handleAddSubtask}>Add</button>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1.5rem', borderTop: '1px solid var(--border)', paddingTop: '0.75rem' }}>
                  <button type="button" className="btn btn-outline" onClick={() => setIsModalOpen(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary">Save Task</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
