import React, { useState, useEffect } from 'react';
import { FileCheck, Upload, Star, Trash2, Info, RefreshCw, FileText } from 'lucide-react';

export default function WordTemplateExport({ showToast, user }) {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Upload states
  const [file, setFile] = useState(null);
  const [templateName, setTemplateName] = useState('');
  const [uploading, setUploading] = useState(false);

  // Load templates list
  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/templates');
      if (!res.ok) throw new Error('Failed to load Word templates');
      const data = await res.json();
      setTemplates(data);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  // Handle file select
  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      if (selectedFile.name.endsWith('.docx')) {
        setFile(selectedFile);
        // Pre-fill name field with file name without extension
        if (!templateName) {
          setTemplateName(selectedFile.name.replace(/\.[^/.]+$/, ''));
        }
      } else {
        showToast('Please upload a Microsoft Word .docx file.', 'error');
      }
    }
  };

  // Upload template
  const handleUploadTemplate = async (e) => {
    e.preventDefault();
    if (!file || !templateName.trim()) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('template', file);
    formData.append('name', templateName.trim());

    try {
      const res = await fetch('/api/templates', {
        method: 'POST',
        body: formData
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to upload template');
      }

      showToast('Word template uploaded successfully!');
      setFile(null);
      setTemplateName('');
      fetchTemplates();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setUploading(false);
    }
  };

  // Set default template
  const handleSetDefault = async (id, name) => {
    try {
      const res = await fetch(`/api/templates/${id}/default`, { method: 'POST' });
      if (!res.ok) throw new Error('Failed to set default template');
      
      showToast(`"${name}" is now the default template for recipe printing.`);
      fetchTemplates();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // Delete template
  const handleDelete = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete template "${name}"?`)) return;

    try {
      const res = await fetch(`/api/templates/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete template');
      
      showToast(`Template "${name}" deleted.`);
      fetchTemplates();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="content-header">
        <h2>Word Templates Manager</h2>
      </div>

      {/* Available Templates centered at the top */}
      <div style={{ maxWidth: '100%', margin: '0 auto 2rem auto', width: '100%' }}>
        <div className="card">
          <h3 style={{ marginBottom: '1.25rem', fontSize: '1.2rem' }}>Available Templates</h3>
          
          {loading ? (
            <div style={{ textAlign: 'center', padding: '2rem' }}>
              <RefreshCw size={24} className="spinner" style={{ margin: '0 auto 0.5rem auto' }} />
              <p style={{ fontSize: '0.85rem' }}>Loading templates...</p>
            </div>
          ) : templates.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', textAlign: 'center', padding: '2rem' }}>
              No templates configured.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {templates.map(tpl => (
                <div 
                  key={tpl.id}
                  style={{ 
                    padding: '1.25rem', 
                    borderRadius: 'var(--radius-sm)', 
                    border: '1px solid var(--border-color)', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between',
                    background: tpl.is_default === 1 ? 'var(--primary-light)' : 'var(--bg-card)',
                    borderColor: tpl.is_default === 1 ? 'var(--primary)' : 'var(--border-color)',
                    boxShadow: 'var(--shadow-sm)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', overflow: 'hidden' }}>
                    <FileCheck size={28} style={{ color: tpl.is_default === 1 ? 'var(--primary)' : 'var(--text-muted)' }} />
                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      <strong style={{ fontSize: '0.95rem' }}>{tpl.name}</strong>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        Uploaded {new Date(tpl.uploaded_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    {tpl.is_default === 1 ? (
                      <span 
                        style={{ 
                          fontSize: '0.75rem', 
                          background: 'var(--primary)', 
                          color: '#ffffff', 
                          padding: '0.25rem 0.5rem', 
                          borderRadius: '4px',
                          fontWeight: 'bold',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.25rem' 
                        }}
                      >
                        <Star size={12} /> Default
                      </span>
                    ) : (
                      user?.permissions?.recipes === 'full' ? (
                        <button 
                          className="btn btn-outline" 
                          style={{ padding: '0.35rem 0.65rem', fontSize: '0.8rem' }}
                          onClick={() => handleSetDefault(tpl.id, tpl.name)}
                        >
                          Make Default
                        </button>
                      ) : null
                    )}

                    {user?.permissions?.recipes === 'full' && (
                      <button 
                        className="btn btn-outline"
                        style={{ padding: '0.35rem 0.5rem', color: 'var(--danger)' }}
                        onClick={() => handleDelete(tpl.id, tpl.name)}
                        disabled={tpl.is_default === 1}
                        title={tpl.is_default === 1 ? "Cannot delete default template" : "Delete template"}
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div 
        style={{ 
          display: 'flex', 
          flexWrap: 'wrap', 
          gap: '2rem', 
          maxWidth: '100%', 
          margin: '0 auto', 
          width: '100%', 
          justifyContent: 'center',
          alignItems: 'stretch'
        }}
      >
        {/* Upload Card */}
        {user?.permissions?.recipes === 'full' && (
          <div className="card" style={{ flex: '1 1 360px', maxWidth: '100%', display: 'flex', flexDirection: 'column' }}>
            <h3 style={{ fontSize: '1.2rem', marginBottom: '1.25rem' }}>Upload New DOCX Template</h3>
            <form onSubmit={handleUploadTemplate} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', flex: 1, justifyContent: 'space-between' }}>
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label htmlFor="template-name">Template Name *</label>
                <input 
                  id="template-name"
                  type="text" 
                  className="input-control" 
                  placeholder="e.g. Minimalist Printout" 
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  required 
                />
              </div>

              {!file ? (
                <div 
                  className="upload-zone"
                  onClick={() => document.getElementById('tpl-input').click()}
                  style={{ padding: '2.5rem 1.5rem', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}
                >
                  <Upload size={32} />
                  <div>
                    <strong>Click to select Word file</strong>
                  </div>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Supports .docx extensions only</span>
                  <input 
                    type="file" 
                    id="tpl-input" 
                    accept=".docx" 
                    onChange={handleFileChange} 
                    style={{ display: 'none' }} 
                  />
                </div>
              ) : (
                <div 
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '0.75rem', 
                    padding: '0.85rem', 
                    border: '1px solid var(--border-color)', 
                    borderRadius: 'var(--radius-sm)', 
                    background: 'var(--bg-app)',
                    marginBottom: '1rem'
                  }}
                >
                  <FileText size={24} style={{ color: 'var(--primary)' }} />
                  <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, fontSize: '0.85rem' }}>
                    <strong>{file.name}</strong>
                  </div>
                  <button 
                    type="button" 
                    className="close-btn" 
                    onClick={() => { setFile(null); setTemplateName(''); }}
                    style={{ fontSize: '1.25rem' }}
                    disabled={uploading}
                  >
                    ×
                  </button>
                </div>
              )}

              <button 
                type="submit" 
                className="btn btn-primary" 
                style={{ width: '100%', marginTop: 'auto' }}
                disabled={!file || !templateName.trim() || uploading}
              >
                {uploading ? 'Uploading...' : 'Upload Template'}
              </button>
            </form>
          </div>
        )}

        {/* Template Format Instructions Card */}
        <div className="card" style={{ flex: '1 1 360px', maxWidth: '100%', display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.15rem', marginBottom: '0.75rem' }}>
            <Info size={18} style={{ color: 'var(--primary)' }} /> Template Tag Formatting
          </h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
            Create a custom Word Document (.docx) and insert the following placeholder tags anywhere in your text. The app will replace these tags with actual recipe details when exporting:
          </p>

          <ul style={{ fontSize: '0.8rem', paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', margin: 0 }}>
            <li><strong>{"{title}"}</strong> - Recipe title</li>
            <li><strong>{"{description}"}</strong> - Recipe description</li>
            <li><strong>{"{prep_time}"}</strong> / <strong>{"{cook_time}"}</strong> - Minutes</li>
            <li><strong>{"{servings}"}</strong> - Number of servings</li>
            <li>
              <strong>{"{#ingredients}• {formatted}{/ingredients}"}</strong>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                A loop printing ingredients list. Within the loop, you can use: `amount`, `unit`, `name`, or `formatted` (which compiles `1 cup flour`).
              </div>
            </li>
            <li>
              <strong>{"{#instructions}{step}. {text}{/instructions}"}</strong>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                A loop printing instructions list. Within the loop, use: `step` for step numbers, and `text` for descriptions.
              </div>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
