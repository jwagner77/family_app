import React, { useState, useEffect } from 'react';
import { Lightbulb, Plus, Trash2, Clock, RefreshCw, GitPullRequest } from 'lucide-react';

export default function FeatureRequestsView({ showToast, currentUser }) {
  const [features, setFeatures] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [formOpen, setFormOpen] = useState(false);

  const fetchFeatures = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/features');
      if (res.ok) {
        const data = await res.json();
        setFeatures(data || []);
      } else {
        const err = await res.json().catch(() => ({}));
        showToast(err.error || 'Failed to fetch feature requests', 'error');
      }
    } catch (e) {
      console.error(e);
      showToast('Error loading feature requests', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeatures();

    const handleAddTrigger = (e) => {
      if (e.detail.tab === 'features') {
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
      const res = await fetch('/api/features', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim()
        })
      });
      const data = await res.json();
      if (res.ok) {
        showToast('Feature request submitted successfully!', 'success');
        setTitle('');
        setDescription('');
        setFormOpen(false);
        fetchFeatures();
      } else {
        throw new Error(data.error || 'Failed to submit feature request');
      }
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateStatus = async (id, newStatus) => {
    try {
      const res = await fetch(`/api/features/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      const data = await res.json();
      if (res.ok) {
        showToast('Status updated successfully!', 'success');
        fetchFeatures();
      } else {
        throw new Error(data.error || 'Failed to update status');
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleDelete = async (id, requestTitle) => {
    if (!window.confirm(`Are you sure you want to delete "${requestTitle}"?`)) return;

    try {
      const res = await fetch(`/api/features/${id}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (res.ok) {
        showToast('Feature request deleted successfully.', 'success');
        fetchFeatures();
      } else {
        throw new Error(data.error || 'Failed to delete request');
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const isAdmin = currentUser?.role_name === 'Administrator';

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'completed': return 'badge-success';
      case 'planned': return 'badge-info';
      case 'under_review': return 'badge-primary';
      case 'rejected': return 'badge-danger';
      default: return 'badge-secondary';
    }
  };

  const formatStatus = (status) => {
    return (status || '').replace('_', ' ').toUpperCase();
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem', width: '100%' }}>
      <div className="content-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2>Feature Requests</h2>
          <p>Submit and review community ideas for new features or updates.</p>
        </div>
      </div>

      {formOpen && (
        <div className="modal-overlay" onClick={() => setFormOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Request a Feature</h2>
              <button className="close-btn" onClick={() => setFormOpen(false)}>×</button>
            </div>

            <div className="modal-body">
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div className="form-group">
                  <label htmlFor="feature-title">Title *</label>
                  <input 
                    id="feature-title"
                    type="text" 
                    className="input-control" 
                    placeholder="What is your idea?" 
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="feature-desc">Description *</label>
                  <textarea 
                    id="feature-desc"
                    className="input-control" 
                    rows="6"
                    placeholder="Describe the feature, why it is useful, and how it should work..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    required
                    style={{ resize: 'vertical' }}
                  />
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', borderTop: '1px solid var(--border)', paddingTop: '0.75rem', marginTop: '0.5rem' }}>
                  <button type="button" className="btn btn-outline" onClick={() => setFormOpen(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={submitting}>
                    {submitting ? 'Submitting...' : 'Submit Request'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {loading && features.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem' }}>
          <RefreshCw size={36} className="spinner" style={{ margin: '0 auto 1rem auto' }} />
          <p>Loading feature requests...</p>
        </div>
      ) : features.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {features.map((feature) => (
            <div key={feature.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
                <div>
                  <h4 style={{ fontSize: '1.1rem', fontWeight: '600', margin: '0 0 0.25rem 0' }}>{feature.title}</h4>
                  <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap', fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>
                    <span>Submitted by <strong style={{ color: 'var(--foreground)' }}>{feature.creator_display_name || feature.creator_username || 'System'}</strong></span>
                    <span>•</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <Clock size={12} /> {new Date(feature.created_at).toLocaleDateString()}
                    </span>
                    {feature.github_issue_url && (
                      <>
                        <span>•</span>
                        <a 
                          href={feature.github_issue_url} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--primary)', fontWeight: '600', textDecoration: 'none' }}
                          title={`GitHub Issue #${feature.github_issue_number}`}
                        >
                          <GitPullRequest size={12} /> Issue #{feature.github_issue_number}
                        </a>
                      </>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
                  <span className={`badge ${getStatusBadgeClass(feature.status)}`} style={{ fontSize: '0.75rem', padding: '0.125rem 0.5rem', fontWeight: '600' }}>
                    {formatStatus(feature.status)}
                  </span>
                  
                  {isAdmin && (
                    <button 
                      className="btn btn-outline" 
                      onClick={() => handleDelete(feature.id, feature.title)}
                      style={{ color: 'var(--destructive)', border: 'none', padding: '0.25rem', height: '1.75rem', width: '1.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      title="Delete Feature Request"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>

              <p style={{ margin: 0, fontSize: '0.875rem', lineHeight: '1.6', color: 'var(--foreground)', opacity: 0.9, whiteSpace: 'pre-wrap' }}>
                {feature.description}
              </p>

              {isAdmin && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderTop: '1px solid var(--border)', paddingTop: '0.75rem', marginTop: '0.25rem' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--muted-foreground)' }}>Admin Controls: Status</span>
                  <select 
                    value={feature.status}
                    onChange={(e) => handleUpdateStatus(feature.id, e.target.value)}
                    className="input-control"
                    style={{ width: '150px', height: '1.75rem', fontSize: '0.75rem', padding: '0 0.5rem' }}
                  >
                    <option value="pending">Pending</option>
                    <option value="under_review">Under Review</option>
                    <option value="planned">Planned</option>
                    <option value="completed">Completed</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--muted-foreground)' }}>
          <Lightbulb size={40} style={{ margin: '0 auto 1rem auto', strokeWidth: 1.5, opacity: 0.7 }} />
          <p style={{ margin: 0, fontSize: '0.9rem' }}>No feature requests have been submitted yet. Be the first to request a feature!</p>
        </div>
      )}
    </div>
  );
}
