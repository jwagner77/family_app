import React, { useState, useEffect } from 'react';
import { 
  CheckSquare, 
  Square, 
  Plus, 
  Trash2, 
  User, 
  Calendar, 
  RefreshCw, 
  AlertCircle, 
  List, 
  Tag, 
  Cloud, 
  ChevronRight,
  Info
} from 'lucide-react';

export default function TasksView({ showToast, currentUser }) {
  const [lists, setLists] = useState([]);
  const [activeListId, setActiveListId] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [assignees, setAssignees] = useState([]);
  
  // Form states
  const [newListName, setNewListName] = useState('');
  const [newListDesc, setNewListDesc] = useState('');
  const [newListType, setNewListType] = useState('local');
  const [isAddingList, setIsAddingList] = useState(false);

  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDesc, setNewTaskDesc] = useState('');
  const [newTaskDueDate, setNewTaskDueDate] = useState('');
  const [newTaskAssignee, setNewTaskAssignee] = useState('');
  const [isAddingTask, setIsAddingTask] = useState(false);

  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    fetchLists();
    fetchAssignees();
  }, []);

  useEffect(() => {
    if (activeListId) {
      fetchTasks(activeListId);
    } else {
      setTasks([]);
    }
  }, [activeListId]);

  const fetchLists = async () => {
    try {
      const res = await fetch('/api/todo/lists');
      if (res.ok) {
        const data = await res.json();
        setLists(data);
        if (data.length > 0 && !activeListId) {
          setActiveListId(data[0].id);
        }
      }
    } catch (err) {
      console.error('Error fetching lists:', err);
    }
  };

  const fetchAssignees = async () => {
    try {
      const res = await fetch('/api/todo/assignees');
      if (res.ok) {
        const data = await res.json();
        setAssignees(data);
      }
    } catch (err) {
      console.error('Error fetching assignees:', err);
    }
  };

  const fetchTasks = async (listId) => {
    try {
      const res = await fetch(`/api/todo/lists/${listId}/tasks`);
      if (res.ok) {
        const data = await res.json();
        setTasks(data);
      }
    } catch (err) {
      console.error('Error fetching tasks:', err);
    }
  };

  const handleCreateList = async (e) => {
    e.preventDefault();
    if (!newListName.trim()) return;

    try {
      const res = await fetch('/api/todo/lists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newListName,
          description: newListDesc,
          list_type: newListType
        })
      });

      if (res.ok) {
        const created = await res.json();
        setLists(prev => [...prev, created]);
        setActiveListId(created.id);
        setNewListName('');
        setNewListDesc('');
        setNewListType('local');
        setIsAddingList(false);
        showToast('List created successfully!', 'success');
      } else {
        const err = await res.json();
        showToast(err.error || 'Failed to create list', 'error');
      }
    } catch (err) {
      showToast('Error connecting to server', 'error');
    }
  };

  const handleDeleteList = async (listId) => {
    if (!window.confirm('Are you sure you want to delete this list and all its tasks?')) return;

    try {
      const res = await fetch(`/api/todo/lists/${listId}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        setLists(prev => prev.filter(l => l.id !== listId));
        if (activeListId === listId) {
          const remaining = lists.filter(l => l.id !== listId);
          setActiveListId(remaining.length > 0 ? remaining[0].id : null);
        }
        showToast('List deleted successfully.', 'success');
      }
    } catch (err) {
      showToast('Failed to delete list.', 'error');
    }
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();
    if (!newTaskTitle.trim() || !activeListId) return;

    const activeList = lists.find(l => l.id === activeListId);
    const assignedToVal = activeList?.list_type === 'm365' ? currentUser.id : (newTaskAssignee || null);

    try {
      const res = await fetch(`/api/todo/lists/${activeListId}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTaskTitle,
          description: newTaskDesc,
          assigned_to: assignedToVal,
          due_date: newTaskDueDate
        })
      });

      if (res.ok) {
        setNewTaskTitle('');
        setNewTaskDesc('');
        setNewTaskDueDate('');
        setNewTaskAssignee('');
        setIsAddingTask(false);
        fetchTasks(activeListId);
        showToast('Task added successfully!', 'success');
      }
    } catch (err) {
      showToast('Failed to add task.', 'error');
    }
  };

  const handleToggleTask = async (task) => {
    const nextStatus = task.status === 'completed' ? 'pending' : 'completed';
    try {
      const res = await fetch(`/api/todo/tasks/${task.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus })
      });

      if (res.ok) {
        setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: nextStatus } : t));
        showToast(nextStatus === 'completed' ? 'Task completed!' : 'Task reopened.', 'success');
      }
    } catch (err) {
      showToast('Failed to update task status.', 'error');
    }
  };

  const handleDeleteTask = async (taskId) => {
    try {
      const res = await fetch(`/api/todo/tasks/${taskId}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        setTasks(prev => prev.filter(t => t.id !== taskId));
        showToast('Task deleted.', 'success');
      }
    } catch (err) {
      showToast('Failed to delete task.', 'error');
    }
  };

  const handleSyncNow = async () => {
    setIsSyncing(true);
    try {
      const res = await fetch('/api/todo/sync', {
        method: 'POST'
      });

      if (res.ok) {
        await fetchLists();
        if (activeListId) {
          await fetchTasks(activeListId);
        }
        showToast('Sync with Microsoft 365 completed!', 'success');
      } else {
        const errData = await res.json();
        showToast(errData.error || 'Sync failed. Make sure your Microsoft Calendar/SSO is configured.', 'error');
      }
    } catch (err) {
      showToast('Error syncing with M365.', 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  const activeList = lists.find(l => l.id === activeListId);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%' }}>
      {/* Page Title Header */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', width: '100%', marginBottom: '1.25rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: '800', margin: 0, color: 'var(--foreground)' }}>
          Task List
        </h1>
        <div style={{ height: '1px', background: 'var(--border)', width: '100%' }} />
      </div>

      <div className="animate-fade-in" style={{ display: 'flex', gap: '2rem', height: 'calc(100vh - 190px)', minHeight: '500px', width: '100%' }}>
      
      {/* Sidebar - Lists Panel */}
      <div className="card" style={{ width: '280px', display: 'flex', flexDirection: 'column', padding: '1.25rem', gap: '1rem', shrink: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
            <List size={20} /> Lists
          </h3>
          <button 
            className="btn btn-outline" 
            style={{ padding: '0.25rem 0.5rem', minWidth: 'auto', fontSize: '0.8rem' }}
            onClick={() => setIsAddingList(!isAddingList)}
          >
            <Plus size={16} />
          </button>
        </div>

        {isAddingList && (
          <form onSubmit={handleCreateList} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', padding: '0.75rem', background: 'var(--bg-main)', borderRadius: '12px' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <input 
                type="text" 
                className="input-control" 
                placeholder="List Name" 
                value={newListName}
                onChange={e => setNewListName(e.target.value)}
                required
                style={{ padding: '0.5rem' }}
              />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <select 
                className="input-control"
                value={newListType}
                onChange={e => setNewListType(e.target.value)}
                style={{ padding: '0.5rem' }}
              >
                <option value="local">Local List</option>
                <option value="m365">Microsoft To-Do Sync</option>
              </select>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button type="submit" className="btn btn-primary" style={{ flex: 1, padding: '0.35rem', fontSize: '0.8rem' }}>Save</button>
              <button type="button" className="btn btn-outline" style={{ flex: 1, padding: '0.35rem', fontSize: '0.8rem' }} onClick={() => setIsAddingList(false)}>Cancel</button>
            </div>
          </form>
        )}

        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {lists.map(l => (
            <div 
              key={l.id} 
              onClick={() => setActiveListId(l.id)}
              className={`nav-link ${activeListId === l.id ? 'active' : ''}`}
              style={{ 
                cursor: 'pointer', 
                justifyContent: 'space-between',
                padding: '0.75rem 1rem',
                borderRadius: '16px',
                background: activeListId === l.id ? 'var(--primary-light)' : 'transparent',
                color: activeListId === l.id ? 'var(--primary)' : 'var(--text-main)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', overflow: 'hidden' }}>
                {l.list_type === 'm365' ? <Cloud size={18} style={{ color: '#0078d4' }} /> : <List size={18} />}
                <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', fontWeight: activeListId === l.id ? '700' : '500' }}>
                  {l.name}
                </span>
              </div>
              {activeListId === l.id && l.list_type !== 'm365' && (
                <button 
                  onClick={(e) => { e.stopPropagation(); handleDeleteList(l.id); }}
                  style={{ background: 'transparent', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: 0 }}
                  title="Delete List"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          ))}
          {lists.length === 0 && (
            <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              No lists created yet.
            </div>
          )}
        </div>
      </div>

      {/* Main Content - Tasks Panel */}
      <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '1.5rem', gap: '1.5rem', overflow: 'hidden' }}>
        
        {activeList ? (
          <>
            {/* Header section */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem', shrink: 0 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <h2 style={{ fontSize: '1.5rem', fontWeight: '800', margin: 0 }}>{activeList.name}</h2>
                  <span className={`badge ${activeList.list_type === 'm365' ? 'badge-info' : 'badge-success'}`} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', background: activeList.list_type === 'm365' ? 'rgba(0, 120, 212, 0.15)' : 'rgba(76, 175, 80, 0.15)', color: activeList.list_type === 'm365' ? '#0078d4' : '#4caf50' }}>
                    {activeList.list_type === 'm365' ? (
                      <><Cloud size={12} /> Microsoft To-Do</>
                    ) : (
                      <><Tag size={12} /> Local List</>
                    )}
                  </span>
                </div>
                {activeList.description && (
                  <p style={{ margin: '0.25rem 0 0 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>{activeList.description}</p>
                )}
              </div>

              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button 
                  className="btn btn-outline" 
                  onClick={handleSyncNow}
                  disabled={isSyncing}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                >
                  <RefreshCw size={16} className={isSyncing ? 'animate-spin' : ''} />
                  {isSyncing ? 'Syncing...' : 'Sync Now'}
                </button>
                <button 
                  className="btn btn-primary"
                  onClick={() => setIsAddingTask(!isAddingTask)}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                >
                  <Plus size={18} /> Add Task
                </button>
              </div>
            </div>

            {/* Task Add Form Overlay / Block */}
            {isAddingTask && (
              <form onSubmit={handleCreateTask} className="animate-fade-in" style={{ background: 'var(--bg-main)', padding: '1.25rem', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '1rem', border: '1px solid var(--border-color)', shrink: 0 }}>
                <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: '700' }}>New Task details</h4>
                
                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                  <div className="form-group" style={{ flex: 2, minWidth: '200px', marginBottom: 0 }}>
                    <label>Task Title</label>
                    <input 
                      type="text" 
                      className="input-control" 
                      placeholder="e.g. Wash the car" 
                      value={newTaskTitle}
                      onChange={e => setNewTaskTitle(e.target.value)}
                      required 
                    />
                  </div>
                  
                  {activeList.list_type !== 'm365' && (
                    <div className="form-group" style={{ flex: 1, minWidth: '150px', marginBottom: 0 }}>
                      <label>Assignee</label>
                      <select 
                        className="input-control"
                        value={newTaskAssignee}
                        onChange={e => setNewTaskAssignee(e.target.value)}
                      >
                        <option value="">Unassigned</option>
                        {assignees.map(u => (
                          <option key={u.id} value={u.id}>{u.display_name || u.username}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="form-group" style={{ flex: 1, minWidth: '150px', marginBottom: 0 }}>
                    <label>Due Date</label>
                    <input 
                      type="date" 
                      className="input-control" 
                      value={newTaskDueDate}
                      onChange={e => setNewTaskDueDate(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Notes / Description</label>
                  <textarea 
                    className="input-control" 
                    placeholder="Add details here..." 
                    value={newTaskDesc}
                    onChange={e => setNewTaskDesc(e.target.value)}
                    rows={2}
                    style={{ resize: 'none' }}
                  />
                </div>

                {activeList.list_type === 'm365' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    <Info size={14} style={{ color: '#0078d4' }} />
                    <span>Microsoft To-Do tasks will be auto-assigned to you (`{currentUser.display_name || currentUser.username}`).</span>
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                  <button type="button" className="btn btn-outline" onClick={() => setIsAddingTask(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary">Save Task</button>
                </div>
              </form>
            )}

            {/* Tasks listing area */}
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1.5rem', paddingRight: '0.25rem' }}>
              
              {/* Pending Tasks */}
              <div>
                <h4 style={{ fontSize: '0.9rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem', fontWeight: '700' }}>
                  To Do ({tasks.filter(t => t.status !== 'completed').length})
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {tasks.filter(t => t.status !== 'completed').map(task => (
                    <div key={task.id} className="card hover-lift" style={{ display: 'flex', alignItems: 'center', padding: '1rem', gap: '1rem', border: '1px solid var(--border-color)' }}>
                      <button 
                        onClick={() => handleToggleTask(task)}
                        style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', color: 'var(--text-muted)' }}
                      >
                        <Square size={22} />
                      </button>
                      
                      <div style={{ flex: 1 }}>
                        <h5 style={{ fontSize: '1rem', margin: 0, fontWeight: '600' }}>{task.title}</h5>
                        {task.description && (
                          <p style={{ margin: '0.25rem 0 0 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>{task.description}</p>
                        )}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', shrink: 0 }}>
                        {task.due_date && (
                          <span style={{ fontSize: '0.8rem', color: 'var(--danger)', background: 'rgba(244, 67, 54, 0.1)', padding: '0.25rem 0.5rem', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '0.25rem', fontWeight: '600' }}>
                            <Calendar size={12} /> {task.due_date}
                          </span>
                        )}
                        {activeList.list_type !== 'm365' && task.assignee_name && (
                          <span style={{ fontSize: '0.8rem', color: 'var(--primary)', background: 'var(--primary-light)', padding: '0.25rem 0.5rem', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '0.25rem', fontWeight: '600' }}>
                            <User size={12} /> {task.assignee_name}
                          </span>
                        )}
                        <button 
                          onClick={() => handleDeleteTask(task.id)}
                          style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0.25rem' }}
                          className="hover-danger"
                          title="Delete Task"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                  {tasks.filter(t => t.status !== 'completed').length === 0 && (
                    <div style={{ textAlign: 'center', padding: '2rem 1rem', border: '1px dashed var(--border-color)', borderRadius: '16px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                      All tasks completed! ✨ Add a task to get started.
                    </div>
                  )}
                </div>
              </div>

              {/* Completed Tasks */}
              {tasks.filter(t => t.status === 'completed').length > 0 && (
                <div>
                  <h4 style={{ fontSize: '0.9rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem', fontWeight: '700' }}>
                    Completed ({tasks.filter(t => t.status === 'completed').length})
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {tasks.filter(t => t.status === 'completed').map(task => (
                      <div key={task.id} className="card" style={{ display: 'flex', alignItems: 'center', padding: '1rem', gap: '1rem', border: '1px solid var(--border-color)', opacity: 0.6 }}>
                        <button 
                          onClick={() => handleToggleTask(task)}
                          style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', color: 'var(--success)' }}
                        >
                          <CheckSquare size={22} />
                        </button>
                        
                        <div style={{ flex: 1 }}>
                          <h5 style={{ fontSize: '1rem', margin: 0, fontWeight: '600', textDecoration: 'line-through', color: 'var(--text-muted)' }}>{task.title}</h5>
                          {task.description && (
                            <p style={{ margin: '0.25rem 0 0 0', color: 'var(--text-muted)', fontSize: '0.85rem', textDecoration: 'line-through' }}>{task.description}</p>
                          )}
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', shrink: 0 }}>
                          <button 
                            onClick={() => handleDeleteTask(task.id)}
                            style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0.25rem' }}
                            title="Delete Task"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          </>
        ) : (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: '1rem', color: 'var(--text-muted)' }}>
            <Cloud size={48} style={{ color: 'var(--primary)', opacity: 0.5 }} />
            <h3 style={{ margin: 0, fontWeight: '700' }}>No List Selected</h3>
            <p style={{ margin: 0, fontSize: '0.9rem', textAlign: 'center' }}>
              Create or select a list on the left to start managing your household tasks.
            </p>
          </div>
        )}

      </div>

    </div>
    </div>
  );
}
