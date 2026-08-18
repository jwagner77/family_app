import React, { useState, useEffect } from 'react';
import {
  Plus, Folder, Edit2, Trash2, FolderOpen, Sparkles, Clock, AlarmClock, X
} from 'lucide-react';

const PRESET_COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444',
  '#8b5cf6', '#ec4899', '#06b6d4', '#64748b'
];

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function FocusAreasView({ showToast, permissions }) {
  const [focusAreas, setFocusAreas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create');

  // Form states
  const [focusAreaId, setFocusAreaId] = useState(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('#3b82f6');
  const [status, setStatus] = useState('active');
  const [isShared, setIsShared] = useState(false);

  // Schedule states
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [scheduleBlocks, setScheduleBlocks] = useState([]); // [{day_of_week, all_day, start_time, end_time}]

  const isReadOnly = permissions === 'read';

  useEffect(() => { 
    fetchFocusAreas(); 
    
    const handleAddTrigger = (e) => {
      if (e.detail.tab === 'focus_areas') {
        handleOpenCreateModal();
      }
    };
    window.addEventListener('trigger-add-action', handleAddTrigger);
    return () => {
      window.removeEventListener('trigger-add-action', handleAddTrigger);
    };
  }, []);

  const fetchFocusAreas = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/focusflow/projects');
      if (res.ok) setFocusAreas(await res.json());
      else showToast('Failed to fetch Focus Areas', 'error');
    } catch (err) { showToast('Network error loading Focus Areas', 'error'); }
    finally { setLoading(false); }
  };

  const fetchScheduleForFocusArea = async (faId) => {
    try {
      const res = await fetch(`/api/focusflow/projects/${faId}/schedules`);
      if (res.ok) return await res.json();
    } catch (_) {}
    return [];
  };

  const handleOpenCreateModal = () => {
    setModalMode('create'); setFocusAreaId(null); setName(''); setDescription('');
    setColor('#3b82f6'); setStatus('active'); setIsShared(false);
    setScheduleEnabled(false); setScheduleBlocks([]);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = async (fa) => {
    if (fa.name === 'Inbox' || fa.name === 'Housekeeping') { showToast(`The ${fa.name} Focus Area cannot be modified.`, 'error'); return; }
    setModalMode('edit'); setFocusAreaId(fa.id); setName(fa.name);
    setDescription(fa.description || ''); setColor(fa.color || '#3b82f6'); setStatus(fa.status || 'active');
    setIsShared(!!fa.is_shared);
    setScheduleEnabled(!!fa.schedule_enabled);
    const blocks = await fetchScheduleForFocusArea(fa.id);
    setScheduleBlocks(blocks);
    setIsModalOpen(true);
  };

  // Schedule editing helpers
  const addBlock = (dayOfWeek) => {
    setScheduleBlocks(prev => [...prev, { day_of_week: dayOfWeek, all_day: false, start_time: '09:00', end_time: '17:00' }]);
  };

  const removeBlock = (idx) => {
    setScheduleBlocks(prev => prev.filter((_, i) => i !== idx));
  };

  const updateBlock = (idx, field, value) => {
    setScheduleBlocks(prev => prev.map((b, i) => i === idx ? { ...b, [field]: value } : b));
  };

  const dayHasBlocks = (dayIdx) => scheduleBlocks.some(b => b.day_of_week === dayIdx);

  const handleSaveFocusArea = async (e) => {
    e.preventDefault();
    if (!name.trim()) { showToast('Focus Area name is required', 'error'); return; }
    const payload = { name: name.trim(), description: description.trim(), color, status, is_shared: isShared ? 1 : 0 };
    try {
      let res;
      if (modalMode === 'create') {
        res = await fetch('/api/focusflow/projects', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      } else {
        res = await fetch(`/api/focusflow/projects/${focusAreaId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      }
      if (res.ok) {
        const saved = await res.json();
        const faId = modalMode === 'create' ? saved.id : focusAreaId;
        // Save schedule
        if (faId) {
          await fetch(`/api/focusflow/projects/${faId}/schedules`, {
            method: 'PUT', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ schedule_enabled: scheduleEnabled, blocks: scheduleEnabled ? scheduleBlocks : [] })
          });
        }
        showToast(modalMode === 'create' ? 'Focus Area created!' : 'Focus Area updated!', 'success');
        setIsModalOpen(false); fetchFocusAreas();
      } else {
        const d = await res.json();
        showToast(d.error || 'Failed to save Focus Area', 'error');
      }
    } catch (err) { showToast('Network error saving Focus Area', 'error'); }
  };

  const handleDeleteFocusArea = async (fa) => {
    if (fa.name === 'Inbox') { showToast('The default Inbox Focus Area cannot be deleted.', 'error'); return; }
    if (!window.confirm(`Delete Focus Area "${fa.name}"? Tasks will be moved to Inbox.`)) return;
    try {
      const res = await fetch(`/api/focusflow/projects/${fa.id}`, { method: 'DELETE' });
      if (res.ok) { showToast('Focus Area deleted', 'success'); fetchFocusAreas(); }
      else { const d = await res.json(); showToast(d.error || 'Failed to delete Focus Area', 'error'); }
    } catch (err) { showToast('Network error', 'error'); }
  };

  // Summarize schedule for display on card
  const getScheduleSummary = (fa) => {
    if (!fa.schedule_enabled) return null;
    return <span style={{ fontSize: '0.7rem', color: 'var(--muted-foreground)', display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.35rem' }}><AlarmClock size={11} /> Work schedule active</span>;
  };

  return (
    <div className="projects-view animate-fade-in">
      <div className="content-header">
        <div>
          <h2>Focus Areas</h2>
          <p>Group your tasks into logical buckets. Set work schedules to stay aware of when to focus.</p>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '5rem' }}><div className="spinner" /></div>
      ) : focusAreas.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
          <FolderOpen size={48} style={{ margin: '0 auto 1rem', opacity: 0.5, color: 'var(--muted-foreground)' }} />
          <h3>No Focus Areas created yet</h3>
          <p style={{ color: 'var(--muted-foreground)', marginTop: '0.25rem' }}>Create Focus Areas to categorize your tasks without pressure.</p>
        </div>
      ) : (
        <div className="grid-3">
          {focusAreas.map(fa => (
            <div key={fa.id} className="card" style={{ borderLeft: `5px solid ${fa.color || '#3b82f6'}`, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '140px' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: '700', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '60%' }}>{fa.name}</h3>
                  <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
                    {fa.is_shared === 1 && (
                      <span style={{ fontSize: '0.7rem', padding: '0.1rem 0.4rem', borderRadius: '10px', backgroundColor: '#3b82f622', color: '#3b82f6', fontWeight: 'bold' }}>
                        👥 Shared
                      </span>
                    )}
                    <span style={{ fontSize: '0.7rem', padding: '0.1rem 0.4rem', borderRadius: '10px',
                      backgroundColor: fa.status === 'active' ? '#10b98122' : '#64748b22',
                      color: fa.status === 'active' ? '#10b981' : '#64748b', fontWeight: 'bold' }}>
                      {fa.status}
                    </span>
                  </div>
                </div>
                <p style={{ fontSize: '0.8rem', color: 'var(--muted-foreground)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: 1.4 }}>
                  {fa.description || <i>No description</i>}
                </p>
                {getScheduleSummary(fa)}
              </div>
              {!isReadOnly && fa.name !== 'Inbox' && fa.name !== 'Housekeeping' && (
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1rem', borderTop: '1px solid var(--border)', paddingTop: '0.75rem' }}>
                  <button className="btn btn-outline" style={{ height: '1.75rem', padding: '0 0.5rem', fontSize: '0.75rem' }} onClick={() => handleOpenEditModal(fa)}>
                    <Edit2 size={12} /> Edit
                  </button>
                  <button className="btn btn-danger" style={{ height: '1.75rem', padding: '0 0.5rem', fontSize: '0.75rem' }} onClick={() => handleDeleteFocusArea(fa)}>
                    <Trash2 size={12} /> Delete
                  </button>
                </div>
              )}
              {(fa.name === 'Inbox' || fa.name === 'Housekeeping') && (
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem', borderTop: '1px solid var(--border)', paddingTop: '0.75rem' }}>
                  <span style={{ fontSize: '0.7rem', color: 'var(--muted-foreground)', fontStyle: 'italic' }}>🔒 Default System {fa.name}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{modalMode === 'create' ? 'Create Focus Area' : 'Edit Focus Area'}</h2>
              <button className="close-btn" onClick={() => setIsModalOpen(false)}>×</button>
            </div>

            <div className="modal-body">
              <form onSubmit={handleSaveFocusArea}>
                <div className="form-group">
                  <label htmlFor="fa-name">Focus Area Name</label>
                  <input id="fa-name" type="text" className="input-control" value={name}
                    onChange={(e) => setName(e.target.value)} required maxLength={50} autoFocus />
                </div>
                <div className="form-group">
                  <label htmlFor="fa-desc">Description</label>
                  <textarea id="fa-desc" className="input-control" value={description}
                    onChange={(e) => setDescription(e.target.value)} maxLength={200} />
                </div>

                {/* Color picker */}
                <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                  <label>Focus Color Accent</label>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.25rem' }}>
                    {PRESET_COLORS.map(c => (
                      <button key={c} type="button" onClick={() => setColor(c)} style={{
                        width: '28px', height: '28px', borderRadius: '50%', backgroundColor: c, padding: 0, cursor: 'pointer',
                        border: color === c ? '3px solid var(--foreground)' : '1px solid transparent',
                        transform: color === c ? 'scale(1.15)' : 'scale(1)', transition: 'transform 0.1s'
                      }} title={c} />
                    ))}
                  </div>
                </div>

                {/* Share Toggle */}
                <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', userSelect: 'none' }}>
                    <input type="checkbox" checked={isShared} onChange={(e) => setIsShared(e.target.checked)} />
                    <span style={{ fontSize: '0.85rem', fontWeight: '500' }}>👥 Share with Household (create a shared to-do list)</span>
                  </label>
                </div>

                {modalMode === 'edit' && (
                  <div className="form-group">
                    <label htmlFor="fa-status">Status</label>
                    <select id="fa-status" className="input-control" value={status} onChange={(e) => setStatus(e.target.value)}>
                      <option value="active">Active</option>
                      <option value="archived">Archived</option>
                    </select>
                  </div>
                )}

                {/* ── Work Schedule Section ── */}
                <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem', marginTop: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: '600', margin: 0 }}>
                      <AlarmClock size={15} /> Focus Schedule
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.85rem' }}>
                      <input type="checkbox" checked={scheduleEnabled} onChange={(e) => setScheduleEnabled(e.target.checked)} />
                      Enable
                    </label>
                  </div>

                  {scheduleEnabled && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      <p style={{ fontSize: '0.78rem', color: 'var(--muted-foreground)', marginBottom: '0.25rem' }}>
                        Define when you work on this Focus Area. You'll see an "Off-schedule" warning in Tasks when outside these windows.
                      </p>

                      {/* Day selectors */}
                      <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                        {DAYS.map((day, idx) => (
                          <button key={idx} type="button"
                            onClick={() => addBlock(idx)}
                            style={{
                              padding: '0.3rem 0.6rem', borderRadius: '6px', fontSize: '0.78rem', fontWeight: '600',
                              cursor: 'pointer', border: '1px solid var(--border)',
                              backgroundColor: dayHasBlocks(idx) ? 'color-mix(in srgb,var(--primary) 15%,transparent)' : 'var(--muted)',
                              color: dayHasBlocks(idx) ? 'var(--primary)' : 'var(--muted-foreground)'
                            }}>
                            + {day}
                          </button>
                        ))}
                      </div>

                      {/* Time blocks list */}
                      {scheduleBlocks.length > 0 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                          {scheduleBlocks.map((block, idx) => (
                            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.75rem',
                              backgroundColor: 'var(--muted)', borderRadius: '8px', flexWrap: 'wrap' }}>
                              <span style={{ fontSize: '0.8rem', fontWeight: '700', minWidth: '32px', color: 'var(--primary)' }}>
                                {DAYS[block.day_of_week]}
                              </span>
                              <label style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.78rem', cursor: 'pointer', margin: 0 }}>
                                <input type="checkbox" checked={!!block.all_day} onChange={(e) => updateBlock(idx, 'all_day', e.target.checked)} />
                                All Day
                              </label>
                              {!block.all_day && (
                                <>
                                  <input type="time" value={block.start_time || '09:00'} onChange={(e) => updateBlock(idx, 'start_time', e.target.value)}
                                    className="input-control" style={{ width: '110px', height: '2rem', padding: '0 0.5rem', fontSize: '0.8rem' }} />
                                  <span style={{ fontSize: '0.78rem', color: 'var(--muted-foreground)' }}>to</span>
                                  <input type="time" value={block.end_time || '17:00'} onChange={(e) => updateBlock(idx, 'end_time', e.target.value)}
                                    className="input-control" style={{ width: '110px', height: '2rem', padding: '0 0.5rem', fontSize: '0.8rem' }} />
                                </>
                              )}
                              <button type="button" onClick={() => removeBlock(idx)}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted-foreground)', marginLeft: 'auto', padding: '0.1rem' }}>
                                <X size={14} />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      {scheduleBlocks.length === 0 && (
                        <p style={{ fontSize: '0.78rem', color: 'var(--muted-foreground)', fontStyle: 'italic' }}>
                          Click a day button above to add a time block.
                        </p>
                      )}
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1.5rem', borderTop: '1px solid var(--border)', paddingTop: '0.75rem' }}>
                  <button type="button" className="btn btn-outline" onClick={() => setIsModalOpen(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary">Save Focus Area</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
