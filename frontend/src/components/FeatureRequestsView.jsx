import React, { useState, useEffect } from 'react';
import { Lightbulb, Plus, Trash2, Clock, RefreshCw, GitPullRequest, ChevronDown, ChevronUp, CheckCircle2, Image as ImageIcon, ExternalLink, X } from 'lucide-react';

export default function FeatureRequestsView({ showToast, currentUser }) {
  const [features, setFeatures] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);
  const [lightboxImage, setLightboxImage] = useState(null);

  // Form states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [screenshotFile, setScreenshotFile] = useState(null);
  const [screenshotPreview, setScreenshotPreview] = useState('');
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

  const handleScreenshotSelect = (file) => {
    if (file && file.type && file.type.startsWith('image/')) {
      setScreenshotFile(file);
      setScreenshotPreview(URL.createObjectURL(file));
    }
  };

  const handlePasteScreenshot = (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          handleScreenshotSelect(file);
          break;
        }
      }
    }
  };

  const clearScreenshot = () => {
    setScreenshotFile(null);
    setScreenshotPreview('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) return;

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('title', title.trim());
      formData.append('description', description.trim());
      if (screenshotFile) {
        formData.append('screenshot', screenshotFile);
      }

      const res = await fetch('/api/features', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (res.ok) {
        showToast('Feature request submitted successfully!', 'success');
        setTitle('');
        setDescription('');
        clearScreenshot();
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

  const incompleteFeatures = features.filter((f) => f.status !== 'completed');
  const completedFeatures = features.filter((f) => f.status === 'completed');

  const renderFeatureCard = (feature) => (
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
            {feature.status === 'completed' && (
              <>
                <span>•</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--success, #10b981)', fontWeight: '600' }}>
                  <CheckCircle2 size={12} /> Completed on {new Date(feature.completed_at || feature.created_at).toLocaleDateString()}
                </span>
              </>
            )}
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

      {feature.screenshot_path && (
        <div style={{ marginTop: '0.25rem' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--muted-foreground)', display: 'block', marginBottom: '0.4rem' }}>
            Attached Screenshot
          </span>
          <img
            src={feature.screenshot_path}
            alt={`Screenshot for ${feature.title}`}
            onClick={() => setLightboxImage(feature.screenshot_path)}
            title="Click to view full size"
            style={{
              maxWidth: '100%',
              maxHeight: '220px',
              objectFit: 'contain',
              borderRadius: 'var(--radius)',
              border: '1px solid var(--border)',
              cursor: 'zoom-in',
              background: 'var(--muted)'
            }}
          />
        </div>
      )}

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
  );

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

            <div className="modal-body" onPaste={handlePasteScreenshot}>
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
                    rows="5"
                    placeholder="Describe the feature, why it is useful, and how it should work..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    required
                    style={{ resize: 'vertical' }}
                  />
                </div>
                <div className="form-group">
                  <label>Screenshot (Optional)</label>
                  <input
                    id="feature-screenshot-input"
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleScreenshotSelect(e.target.files?.[0])}
                    style={{ display: 'none' }}
                  />
                  {screenshotPreview ? (
                    <div
                      style={{
                        position: 'relative',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius)',
                        overflow: 'hidden',
                        background: 'var(--muted)',
                        maxHeight: '200px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      <img
                        src={screenshotPreview}
                        alt="Screenshot preview"
                        style={{ maxWidth: '100%', maxHeight: '200px', objectFit: 'contain' }}
                      />
                      <button
                        type="button"
                        onClick={clearScreenshot}
                        title="Remove screenshot"
                        style={{
                          position: 'absolute',
                          top: '8px',
                          right: '8px',
                          background: 'rgba(0, 0, 0, 0.65)',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '50%',
                          width: '28px',
                          height: '28px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <div
                      onClick={() => document.getElementById('feature-screenshot-input')?.click()}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        e.preventDefault();
                        handleScreenshotSelect(e.dataTransfer.files?.[0]);
                      }}
                      style={{
                        border: '1px dashed var(--border)',
                        borderRadius: 'var(--radius)',
                        padding: '1.25rem',
                        textAlign: 'center',
                        cursor: 'pointer',
                        color: 'var(--muted-foreground)',
                        background: 'var(--background)'
                      }}
                    >
                      <ImageIcon size={24} style={{ margin: '0 auto 0.4rem auto', opacity: 0.7 }} />
                      <p style={{ margin: 0, fontSize: '0.8rem' }}>
                        Click to upload, drag & drop, or paste (<strong>Ctrl+V</strong>) a screenshot
                      </p>
                    </div>
                  )}
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {incompleteFeatures.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {incompleteFeatures.map((feature) => renderFeatureCard(feature))}
            </div>
          ) : (
            <div className="card" style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--muted-foreground)' }}>
              <CheckCircle2 size={36} style={{ margin: '0 auto 0.75rem auto', strokeWidth: 1.5, color: 'var(--success, #10b981)', opacity: 0.85 }} />
              <p style={{ margin: 0, fontSize: '0.9rem' }}>All submitted feature requests have been completed! Expand the completed section below to view them.</p>
            </div>
          )}

          {completedFeatures.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '0.5rem' }}>
              <button
                type="button"
                onClick={() => setShowCompleted((prev) => !prev)}
                className="card"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.875rem 1.25rem',
                  cursor: 'pointer',
                  border: '1px solid var(--border)',
                  background: 'var(--card)',
                  color: 'var(--foreground)',
                  width: '100%',
                  textAlign: 'left'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <CheckCircle2 size={18} style={{ color: 'var(--success, #10b981)' }} />
                  <span style={{ fontWeight: '600', fontSize: '0.95rem' }}>Completed Feature Requests</span>
                  <span className="badge badge-secondary" style={{ fontSize: '0.75rem', padding: '0.1rem 0.5rem' }}>
                    {completedFeatures.length}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem', color: 'var(--muted-foreground)' }}>
                  <span>{showCompleted ? 'Hide' : 'Show'}</span>
                  {showCompleted ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </div>
              </button>

              {showCompleted && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {completedFeatures.map((feature) => renderFeatureCard(feature))}
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--muted-foreground)' }}>
          <Lightbulb size={40} style={{ margin: '0 auto 1rem auto', strokeWidth: 1.5, opacity: 0.7 }} />
          <p style={{ margin: 0, fontSize: '0.9rem' }}>No feature requests have been submitted yet. Be the first to request a feature!</p>
        </div>
      )}

      {lightboxImage && (
        <div
          className="modal-overlay"
          onClick={() => setLightboxImage(null)}
          style={{ justifyContent: 'center', alignItems: 'center', padding: '1.5rem' }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'relative',
              maxWidth: '90vw',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '0.75rem'
            }}
          >
            <div style={{ display: 'flex', gap: '0.5rem', alignSelf: 'flex-end' }}>
              <a
                href={lightboxImage}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-secondary"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem', padding: '0.35rem 0.75rem', textDecoration: 'none' }}
              >
                <ExternalLink size={14} /> Open Original
              </a>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setLightboxImage(null)}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}
              >
                <X size={14} /> Close
              </button>
            </div>
            <img
              src={lightboxImage}
              alt="Full size screenshot"
              style={{
                maxWidth: '90vw',
                maxHeight: 'calc(90vh - 3rem)',
                objectFit: 'contain',
                borderRadius: 'var(--radius)',
                boxShadow: 'var(--shadow-lg)'
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
