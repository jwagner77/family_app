import React, { useState, useEffect } from 'react';
import { 
  Plus, Trash2, Check, UserPlus, Play, RefreshCw, Calendar, 
  Clock, CheckCircle, User, AlertCircle, Sparkles, ClipboardList
} from 'lucide-react';

export default function HousekeepingView({ showToast, currentUser }) {
  const [tasks, setTasks] = useState([]);
  const [logs, setLogs] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Tabs
  const [activeSubTab, setActiveSubTab] = useState('all'); // all, mine, unassigned, completed

  // Form Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [reoccurrence, setReoccurrence] = useState('none');
  const [assignedToUserId, setAssignedToUserId] = useState('');

  useEffect(() => {
    fetchTasks();
    fetchLogs();
    fetchUsers();

    const handleAddTrigger = (e) => {
      if (e.detail.tab === 'housekeeping') {
        handleOpenCreateModal();
      }
    };
    window.addEventListener('trigger-add-action', handleAddTrigger);
    return () => {
      window.removeEventListener('trigger-add-action', handleAddTrigger);
    };
  }, []);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/housekeeping/tasks');
      if (res.ok) {
        const data = await res.json();
        setTasks(data);
      } else {
        showToast('Failed to fetch tasks', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Error loading housekeeping tasks', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchLogs = async () => {
    try {
      const res = await fetch('/api/housekeeping/logs');
      if (res.ok) {
        const data = await res.json();
        setLogs(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/users/list');
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleOpenCreateModal = () => {
    setEditingTask(null);
    setTitle('');
    setDescription('');
    setDueDate(new Date().toISOString().split('T')[0]);
    setReoccurrence('none');
    setAssignedToUserId('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (task) => {
    setEditingTask(task);
    setTitle(task.title);
    setDescription(task.description || '');
    setDueDate(task.due_date);
    setReoccurrence(task.reoccurrence);
    setAssignedToUserId(task.assigned_to_user_id || '');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !dueDate) {
      showToast('Please fill in title and due date', 'error');
      return;
    }

    const payload = {
      title: title.trim(),
      description: description.trim(),
      due_date: dueDate,
      reoccurrence,
      assigned_to_user_id: assignedToUserId ? parseInt(assignedToUserId, 10) : null
    };

    try {
      let res;
      if (editingTask) {
        payload.status = editingTask.status;
        res = await fetch(`/api/housekeeping/tasks/${editingTask.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } else {
        res = await fetch('/api/housekeeping/tasks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      }

      if (res.ok) {
        showToast(editingTask ? 'Task updated successfully' : 'Task created successfully', 'success');
        setIsModalOpen(false);
        fetchTasks();
      } else {
        const errorData = await res.json();
        showToast(errorData.error || 'Failed to save task', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Server error saving task', 'error');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this task?')) return;
    try {
      const res = await fetch(`/api/housekeeping/tasks/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        showToast('Task deleted successfully', 'success');
        fetchTasks();
      } else {
        showToast('Failed to delete task', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Server error deleting task', 'error');
    }
  };

  const handleGrabTask = async (id) => {
    try {
      const res = await fetch(`/api/housekeeping/tasks/${id}/grab`, {
        method: 'POST'
      });
      if (res.ok) {
        showToast('Task assigned to you!', 'success');
        fetchTasks();
      } else {
        showToast('Failed to grab task', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Server error grabbing task', 'error');
    }
  };

  const handleCompleteTask = async (id) => {
    try {
      const res = await fetch(`/api/housekeeping/tasks/${id}/complete`, {
        method: 'POST'
      });
      if (res.ok) {
        const data = await res.json();
        showToast(data.message, 'success');
        fetchTasks();
        fetchLogs();
      } else {
        showToast('Failed to complete task', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Server error completing task', 'error');
    }
  };

  // Helper date checker
  const isOverdue = (dateStr, status) => {
    if (status === 'completed') return false;
    const today = new Date().toISOString().split('T')[0];
    return dateStr < today;
  };

  const isDueToday = (dateStr, status) => {
    if (status === 'completed') return false;
    const today = new Date().toISOString().split('T')[0];
    return dateStr === today;
  };

  // Filter Tasks
  const filteredTasks = tasks.filter(task => {
    if (activeSubTab === 'mine') {
      return task.assigned_to_user_id === currentUser?.id && task.status === 'pending';
    }
    if (activeSubTab === 'unassigned') {
      return !task.assigned_to_user_id && task.status === 'pending';
    }
    if (activeSubTab === 'completed') {
      return task.status === 'completed';
    }
    // 'all' tab shows pending tasks
    return task.status === 'pending';
  });

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', height: '100%', paddingBottom: '2rem' }}>
      
      {/* Header bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: '800', margin: 0 }}>Housekeeping</h2>
          <p style={{ margin: '0.25rem 0 0 0', color: 'var(--muted-foreground)', fontSize: '0.875rem' }}>
            Roster household chores, assign maintenance responsibilities, and log task completions.
          </p>
        </div>
      </div>

      {/* Main split-screen panel */}
      <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap', alignItems: 'flex-start' }}>
        
        {/* Left side chores board */}
        <div style={{ flex: '2 1 600px', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          {/* Subtabs filter bar */}
          <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
            {[
              { id: 'all', label: 'Active Tasks' },
              { id: 'mine', label: 'My Tasks' },
              { id: 'unassigned', label: 'Unassigned Chores' },
              { id: 'completed', label: 'Completed Chores' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveSubTab(tab.id)}
                style={{
                  padding: '0.5rem 1rem',
                  border: 'none',
                  background: activeSubTab === tab.id ? 'var(--primary-light)' : 'transparent',
                  color: activeSubTab === tab.id ? 'var(--primary)' : 'var(--muted-foreground)',
                  fontWeight: '600',
                  fontSize: '0.85rem',
                  borderRadius: 'var(--radius)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* List of Tasks */}
          {loading ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--muted-foreground)' }}>
              Loading tasks...
            </div>
          ) : filteredTasks.length === 0 ? (
            <div style={{ 
              padding: '4rem 2rem', 
              textAlign: 'center', 
              border: '1px dashed var(--border)', 
              borderRadius: 'var(--radius)', 
              background: 'var(--card)',
              color: 'var(--muted-foreground)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '1rem'
            }}>
              <ClipboardList size={40} style={{ opacity: 0.4 }} />
              <div>
                <h4 style={{ margin: '0 0 0.25rem 0', fontWeight: '700', color: 'var(--foreground)' }}>No Chores Found</h4>
                <p style={{ margin: 0, fontSize: '0.8rem' }}>
                  {activeSubTab === 'mine' 
                    ? "Hooray! You don't have any housekeeping tasks assigned to you right now."
                    : activeSubTab === 'unassigned'
                    ? "Everything is already picked up! No unassigned chores."
                    : "No chores found matching this category. Tap New Task to get started!"
                  }
                </p>
              </div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
              {filteredTasks.map(task => {
                const overdue = isOverdue(task.due_date, task.status);
                const dueToday = isDueToday(task.due_date, task.status);
                
                return (
                  <div 
                    key={task.id} 
                    className="card animate-fade-in"
                    style={{ 
                      padding: '1.25rem', 
                      display: 'flex', 
                      flexDirection: 'column', 
                      justifyContent: 'space-between',
                      gap: '1rem',
                      border: overdue 
                        ? '1px solid rgba(239, 68, 68, 0.4)' 
                        : dueToday 
                        ? '1px solid rgba(245, 158, 11, 0.4)' 
                        : '1px solid var(--border)',
                      background: overdue 
                        ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.02) 0%, var(--card) 100%)'
                        : 'var(--card)',
                      boxShadow: 'var(--shadow-sm)'
                    }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                        <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: '700', color: 'var(--foreground)' }}>{task.title}</h4>
                        {task.reoccurrence !== 'none' && (
                          <span style={{ 
                            background: 'var(--primary-light)', 
                            color: 'var(--primary)', 
                            padding: '0.15rem 0.4rem', 
                            borderRadius: '4px', 
                            fontSize: '0.65rem', 
                            fontWeight: '700',
                            textTransform: 'uppercase',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.2'
                          }}>
                            <RefreshCw size={10} /> {task.reoccurrence}
                          </span>
                        )}
                      </div>
                      
                      {task.description && (
                        <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--muted-foreground)', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                          {task.description}
                        </p>
                      )}

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', marginTop: '0.25rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', color: overdue ? '#f87171' : dueToday ? '#fbbf24' : 'var(--muted-foreground)', fontWeight: (overdue || dueToday) ? '700' : '500' }}>
                          <Calendar size={12} />
                          <span>
                            Due: {task.due_date} {overdue && ' (Overdue)'} {dueToday && ' (Today)'}
                          </span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>
                          <User size={12} />
                          <span>
                            {task.assigned_to_user_id 
                              ? `Assigned: ${task.assigned_display_name || task.assigned_username}`
                              : 'Unassigned (Volunteer needed)'
                            }
                          </span>
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border)', paddingTop: '0.75rem', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <div style={{ display: 'flex', gap: '0.35rem' }}>
                        {task.status !== 'completed' && (
                          <button 
                            className="btn btn-primary" 
                            onClick={() => handleCompleteTask(task.id)}
                            style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.25rem', background: '#10b981', borderColor: '#10b981' }}
                            title="Log complete"
                          >
                            <Check size={12} /> Complete
                          </button>
                        )}
                        {!task.assigned_to_user_id && task.status !== 'completed' && (
                          <button 
                            className="btn btn-outline" 
                            onClick={() => handleGrabTask(task.id)}
                            style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                            title="Assign to myself"
                          >
                            <UserPlus size={12} /> Grab
                          </button>
                        )}
                      </div>

                      <div style={{ display: 'flex', gap: '0.25rem' }}>
                        <button 
                          className="btn btn-outline" 
                          onClick={() => handleOpenEditModal(task)}
                          style={{ padding: '0.3rem 0.5rem', minWidth: 'auto', fontSize: '0.75rem' }}
                          title="Edit Chores Settings"
                        >
                          Edit
                        </button>
                        <button 
                          className="btn btn-outline" 
                          onClick={() => handleDelete(task.id)}
                          style={{ padding: '0.3rem 0.5rem', minWidth: 'auto', fontSize: '0.75rem', color: 'var(--destructive)', borderColor: 'rgba(239,68,68,0.2)' }}
                          title="Remove Chore"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right side completions history log */}
        <div className="card" style={{ flex: '1 1 300px', display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1.5rem', minHeight: '380px' }}>
          <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '800', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Sparkles size={18} style={{ color: 'var(--primary)' }} /> Completions Log
            </h3>
            <span style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>Audit history of household chores maintenance</span>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '550px' }}>
            {logs.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--muted-foreground)', fontSize: '0.8rem', fontStyle: 'italic' }}>
                No completed chores logged yet.
              </div>
            ) : (
              logs.map(log => (
                <div key={log.id} style={{ display: 'flex', flexDirection: 'column', padding: '0.6rem 0.75rem', background: 'var(--muted)', borderRadius: '8px', borderLeft: '3px solid #10b981', gap: '0.2rem' }}>
                  <span style={{ fontWeight: '700', fontSize: '0.85rem', color: 'var(--foreground)' }}>{log.task_title}</span>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.7rem', color: 'var(--muted-foreground)' }}>
                    <span>Done by: {log.completed_by_display_name || log.completed_by_username}</span>
                    <span>{new Date(log.completed_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* Task Creation/Editing Modal */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingTask ? 'Edit Housekeeping Chore' : 'Create Housekeeping Chore'}</h2>
              <button className="close-btn" onClick={() => setIsModalOpen(false)}>×</button>
            </div>

            <div className="modal-body">
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="form-group">
                  <label style={{ fontSize: '0.75rem', fontWeight: '600' }}>Chore Title *</label>
                  <input 
                    type="text" 
                    className="input-control"
                    placeholder="e.g. Clean kitchen counters" 
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required 
                  />
                </div>

                <div className="form-group">
                  <label style={{ fontSize: '0.75rem', fontWeight: '600' }}>Description</label>
                  <textarea 
                    className="input-control"
                    style={{ minHeight: '80px', resize: 'vertical' }}
                    placeholder="Details about maintaining this chore..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label style={{ fontSize: '0.75rem', fontWeight: '600' }}>Due Date *</label>
                    <input 
                      type="date" 
                      className="input-control"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      required 
                    />
                  </div>

                  <div className="form-group">
                    <label style={{ fontSize: '0.75rem', fontWeight: '600' }}>Reoccurrence</label>
                    <select 
                      className="input-control"
                      value={reoccurrence}
                      onChange={(e) => setReoccurrence(e.target.value)}
                    >
                      <option value="none">One-off Chore</option>
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                      <option value="yearly">Yearly</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label style={{ fontSize: '0.75rem', fontWeight: '600' }}>Assign To</label>
                  <select 
                    className="input-control"
                    value={assignedToUserId}
                    onChange={(e) => setAssignedToUserId(e.target.value)}
                  >
                    <option value="">-- Unassigned (Volunteer Grab) --</option>
                    {users.map(u => (
                      <option key={u.id} value={u.id}>
                        {u.display_name || u.username} ({u.username})
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem', borderTop: '1px solid var(--border)', paddingTop: '0.75rem' }}>
                  <button 
                    type="button" 
                    className="btn btn-outline" 
                    onClick={() => setIsModalOpen(false)}
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="btn btn-primary"
                  >
                    {editingTask ? 'Save Changes' : 'Create Chore'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
