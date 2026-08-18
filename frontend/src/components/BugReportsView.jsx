import React, { useState, useEffect } from 'react';
import { AlertTriangle, Plus, Trash2, Clock, RefreshCw } from 'lucide-react';

export default function BugReportsView({ showToast, currentUser }) {
  const [bugs, setBugs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [steps, setSteps] = useState('');
  const [severity, setSeverity] = useState('medium');
  const [formOpen, setFormOpen] = useState(false);

  const fetchBugs = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/bugs');
      if (res.ok) {
        const data = await res.json();
        setBugs(data || []);
      } else {
        const err = await res.json().catch(() => ({}));
        showToast(err.error || 'Failed to fetch bug reports', 'error');
      }
    } catch (e) {
      console.error(e);
      showToast('Error loading bug reports', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBugs();

    const handleAddTrigger = (e) => {
      if (e.detail.tab === 'bugs') {
        setFormOpen(true);
      }
    };
    window.addEventListener('trigger-add-action', handleAddTrigger);
    return () => {
      window.removeEventListener('trigger-add-action', handleAddTrigger);
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) return;

    setSubmitting(true);
    try {
      const res = await fetch('/api/bugs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          steps_to_reproduce: steps.trim(),
          severity
        })
      });
      const data = await res.json();
      if (res.ok) {
        showToast('Bug report submitted successfully!', 'success');
        setTitle('');
        setDescription('');
        setSteps('');
        setSeverity('medium');
        setFormOpen(false);
        fetchBugs();
      } else {
        throw new Error(data.error || 'Failed to submit bug report');
      }
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async (id, payload) => {
    try {
      const res = await fetch(`/api/bugs/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (res.ok) {
        showToast('Bug report updated successfully!', 'success');
        fetchBugs();
      } else {
        throw new Error(data.error || 'Failed to update bug report');
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleDelete = async (id, bugTitle) => {
    if (!window.confirm(`Are you sure you want to delete bug "${bugTitle}"?`)) return;

    try {
      const res = await fetch(`/api/bugs/${id}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (res.ok) {
        showToast('Bug report deleted successfully.', 'success');
        fetchBugs();
      } else {
        throw new Error(data.error || 'Failed to delete bug report');
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const isAdmin = currentUser?.role_name === 'Administrator';

  const getSeverityBadgeClass = (sev) => {
    switch (sev?.toLowerCase()) {
      case 'critical': return 'badge-danger';
      case 'high': return 'badge-warning';
      case 'medium': return 'badge-primary';
      default: return 'badge-secondary';
    }
  };

  const getStatusBadgeClass = (status) => {
    switch (status?.toLowerCase()) {
      case 'resolved': return 'badge-success';
      case 'in_progress': return 'badge-info';
      case 'closed': return 'badge-secondary';
      default: return 'badge-danger';
    }
  };

  const formatText = (text) => {
    return (text || '').replace('_', ' ').toUpperCase();
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem', width: '100%' }}>
      <div className="content-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2>Bug Reports & Issues</h2>
          <p>Report issues and track their progress toward resolution.</p>
        </div>
      </div>

      {formOpen && (
        <div className="modal-overlay" onClick={() => setFormOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Submit a Bug Report</h2>
              <button className="close-btn" onClick={() => setFormOpen(false)}>×</button>
            </div>

            <div className="modal-body">
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label htmlFor="bug-title">Title *</label>
                    <input 
                      id="bug-title"
                      type="text" 
                      className="input-control" 
                      placeholder="e.g., Login fails on mobile browsers" 
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="bug-severity">Severity</label>
                    <select 
                      id="bug-severity"
                      className="input-control" 
                      value={severity}
                      onChange={(e) => setSeverity(e.target.value)}
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="critical">Critical</option>
                    </select>
                  </div>
                </div>
                
                <div className="form-group">
                  <label htmlFor="bug-desc">Description *</label>
                  <textarea 
                    id="bug-desc"
                    className="input-control" 
                    rows="3"
                    placeholder="What is the bug? What did you expect to happen instead?"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    required
                    style={{ resize: 'vertical' }}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="bug-steps">Steps to Reproduce</label>
                  <textarea 
                    id="bug-steps"
                    className="input-control" 
                    rows="3"
                    placeholder="1. Go to...\n2. Click...\n3. Observe error..."
                    value={steps}
                    onChange={(e) => setSteps(e.target.value)}
                    style={{ resize: 'vertical' }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', borderTop: '1px solid var(--border)', paddingTop: '0.75rem', marginTop: '0.5rem' }}>
                  <button type="button" className="btn btn-outline" onClick={() => setFormOpen(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={submitting}>
                    Submit Report
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {loading && bugs.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem' }}>
          <RefreshCw size={36} className="spinner" style={{ margin: '0 auto 1rem auto' }} />
          <p>Loading bug reports...</p>
        </div>
      ) : bugs.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {bugs.map((bug) => (
            <div key={bug.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
                <div>
                  <h4 style={{ fontSize: '1.1rem', fontWeight: '600', margin: '0 0 0.25rem 0' }}>{bug.title}</h4>
                  <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap', fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>
                    <span>Reported by <strong style={{ color: 'var(--foreground)' }}>{bug.creator_display_name || bug.creator_username || 'System'}</strong></span>
                    <span>•</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <Clock size={12} /> {new Date(bug.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
                  <span className={`badge ${getSeverityBadgeClass(bug.severity)}`} style={{ fontSize: '0.75rem', padding: '0.125rem 0.5rem', fontWeight: '600' }}>
                    {formatText(bug.severity)}
                  </span>
                  <span className={`badge ${getStatusBadgeClass(bug.status)}`} style={{ fontSize: '0.75rem', padding: '0.125rem 0.5rem', fontWeight: '600' }}>
                    {formatText(bug.status)}
                  </span>
                  
                  {isAdmin && (
                    <button 
                      className="btn btn-outline" 
                      onClick={() => handleDelete(bug.id, bug.title)}
                      style={{ color: 'var(--destructive)', border: 'none', padding: '0.25rem', height: '1.75rem', width: '1.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      title="Delete Bug Report"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div>
                  <span style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--muted-foreground)', display: 'block', marginBottom: '0.25rem' }}>Description</span>
                  <p style={{ margin: 0, fontSize: '0.875rem', lineHeight: '1.6', color: 'var(--foreground)', opacity: 0.9, whiteSpace: 'pre-wrap' }}>
                    {bug.description}
                  </p>
                </div>

                {bug.steps_to_reproduce && bug.steps_to_reproduce.trim() && (
                  <div style={{ borderTop: '1px dashed var(--border)', paddingTop: '0.75rem' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--muted-foreground)', display: 'block', marginBottom: '0.25rem' }}>Steps to Reproduce</span>
                    <pre style={{ margin: 0, fontSize: '0.8125rem', fontFamily: 'var(--font-sans)', whiteSpace: 'pre-wrap', background: 'var(--muted)', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius)', color: 'var(--foreground)', lineHeight: '1.5' }}>
                      {bug.steps_to_reproduce}
                    </pre>
                  </div>
                )}
              </div>

              {isAdmin && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', borderTop: '1px solid var(--border)', paddingTop: '0.75rem', marginTop: '0.25rem', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--muted-foreground)' }}>Admin Status:</span>
                    <select 
                      value={bug.status}
                      onChange={(e) => handleUpdate(bug.id, { status: e.target.value })}
                      className="input-control"
                      style={{ width: '130px', height: '1.75rem', fontSize: '0.75rem', padding: '0 0.5rem' }}
                    >
                      <option value="open">Open</option>
                      <option value="in_progress">In Progress</option>
                      <option value="resolved">Resolved</option>
                      <option value="closed">Closed</option>
                    </select>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--muted-foreground)' }}>Admin Severity:</span>
                    <select 
                      value={bug.severity}
                      onChange={(e) => handleUpdate(bug.id, { severity: e.target.value })}
                      className="input-control"
                      style={{ width: '110px', height: '1.75rem', fontSize: '0.75rem', padding: '0 0.5rem' }}
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="critical">Critical</option>
                    </select>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--muted-foreground)' }}>
          <AlertTriangle size={40} style={{ margin: '0 auto 1rem auto', strokeWidth: 1.5, opacity: 0.7 }} />
          <p style={{ margin: 0, fontSize: '0.9rem' }}>No bug reports have been submitted. System is running smoothly!</p>
        </div>
      )}
    </div>
  );
}
