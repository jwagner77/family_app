import React, { useState, useEffect } from 'react';
import { Plus, Trash2, BookOpen, X, Play, FileText, CheckCircle, Info } from 'lucide-react';

export default function ReadingListView({ showToast, permissions }) {
  const [readingList, setReadingList] = useState([]);
  const [loading, setLoading] = useState(false);

  // Multiple Reading Lists States
  const [lists, setLists] = useState([]);
  const [activeListId, setActiveListId] = useState('');
  const [loadingLists, setLoadingLists] = useState(false);

  // List Form Modal States
  const [isListFormOpen, setIsListFormOpen] = useState(false);
  const [editingList, setEditingList] = useState(null);
  const [listName, setListName] = useState('');
  const [listDescription, setListDescription] = useState('');
  const [listIsPublic, setListIsPublic] = useState(false);

  // Manual Add Modal
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [manualTitle, setManualTitle] = useState('');
  const [manualAuthor, setManualAuthor] = useState('');
  const [manualCoverUrl, setManualCoverUrl] = useState('');

  // Log Entry Modal
  const [isLogOpen, setIsLogOpen] = useState(false);
  const [activeItem, setActiveItem] = useState(null); // reading_list item
  const [progressPercent, setProgressPercent] = useState(0);
  const [logNotes, setLogNotes] = useState('');
  const [logDate, setLogDate] = useState('');

  // Detail Modal
  const [activeDetail, setActiveDetail] = useState(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const fetchLists = async (selectNewId = null) => {
    setLoadingLists(true);
    try {
      const res = await fetch('/api/reading-lists');
      if (res.ok) {
        const data = await res.json();
        setLists(data);
        if (data.length > 0) {
          if (selectNewId) {
            setActiveListId(selectNewId);
          } else if (!activeListId) {
            const sorted = [...data].sort((a, b) => a.id - b.id);
            setActiveListId(sorted[0].id);
          }
        }
      }
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoadingLists(false);
    }
  };

  const fetchReadingList = async () => {
    if (!activeListId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/reading-list?reading_list_id=${activeListId}`);
      if (res.ok) {
        const data = await res.json();
        setReadingList(data);
      }
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLists();

    const handleAddTrigger = (e) => {
      if (e.detail.tab === 'reading_list') {
        setIsAddOpen(true);
      }
    };
    window.addEventListener('trigger-add-action', handleAddTrigger);
    return () => {
      window.removeEventListener('trigger-add-action', handleAddTrigger);
    };
  }, []);

  useEffect(() => {
    if (activeListId) {
      fetchReadingList();
    }
  }, [activeListId]);

  const handleListSubmit = async (e) => {
    e.preventDefault();
    if (!listName.trim()) return;

    const payload = {
      name: listName.trim(),
      description: listDescription.trim(),
      is_public: listIsPublic ? 1 : 0
    };

    try {
      if (editingList) {
        const res = await fetch(`/api/reading-lists/${editingList.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (!res.ok) throw new Error('Failed to update reading list');
        showToast('Reading list updated!');
        fetchLists(editingList.id);
      } else {
        const res = await fetch('/api/reading-lists', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (!res.ok) throw new Error('Failed to create reading list');
        const data = await res.json();
        showToast('Reading list created!');
        fetchLists(data.id);
      }
      setIsListFormOpen(false);
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleDeleteList = async () => {
    if (!activeListId) return;
    const activeList = lists.find(l => l.id === activeListId);
    if (!activeList) return;

    if (lists.length <= 1) {
      return showToast('Cannot delete your only reading list.', 'error');
    }

    if (!window.confirm(`Are you sure you want to delete "${activeList.name}"? All books in this list will be removed.`)) return;

    try {
      const res = await fetch(`/api/reading-lists/${activeListId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete reading list');
      showToast('Reading list deleted.');
      const remaining = lists.filter(l => l.id !== activeListId);
      const nextId = remaining[0]?.id || null;
      setActiveListId(nextId);
      fetchLists(nextId);
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const openCreateList = () => {
    setEditingList(null);
    setListName('');
    setListDescription('');
    setListIsPublic(false);
    setIsListFormOpen(true);
  };

  const openEditList = () => {
    const activeList = lists.find(l => l.id === activeListId);
    if (!activeList) return;
    setEditingList(activeList);
    setListName(activeList.name);
    setListDescription(activeList.description || '');
    setListIsPublic(activeList.is_public === 1);
    setIsListFormOpen(true);
  };

  const copyShareLink = () => {
    const activeList = lists.find(l => l.id === activeListId);
    if (!activeList) return;
    const shareUrl = `${window.location.origin}${window.location.pathname}?share=${activeList.share_token}`;
    navigator.clipboard.writeText(shareUrl);
    showToast('Share link copied to clipboard!');
  };

  const handleManualAdd = async (e) => {
    e.preventDefault();
    if (!manualTitle.trim() || !activeListId) return;

    try {
      const res = await fetch('/api/reading-list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reading_list_id: activeListId,
          manualBook: {
            title: manualTitle.trim(),
            author: manualAuthor.trim(),
            cover_url: manualCoverUrl.trim()
          }
        })
      });
      if (!res.ok) throw new Error('Failed to add book manually');
      showToast('Added manual book to reading list!');
      setIsAddOpen(false);
      setManualTitle('');
      setManualAuthor('');
      setManualCoverUrl('');
      fetchReadingList();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleRemoveItem = async (id, title) => {
    if (!window.confirm(`Remove "${title}" from your reading list?`)) return;
    try {
      const res = await fetch(`/api/reading-list/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to remove item');
      showToast('Removed from reading list.');
      fetchReadingList();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const openLogModal = (item) => {
    setActiveItem(item);
    setProgressPercent(10); // Start at 10% or default
    setLogNotes('');
    setLogDate(new Date().toISOString().substring(0, 10)); // YYYY-MM-DD
    setIsLogOpen(true);
  };

  const handleLogSubmit = async (e) => {
    e.preventDefault();
    if (!activeItem) return;

    const payload = {
      book_id: activeItem.book_id || null,
      reading_list_id: activeItem.id,
      book_title: activeItem.lib_title || activeItem.title,
      book_author: activeItem.lib_author || activeItem.author,
      progress_percent: progressPercent,
      notes: logNotes,
      entry_date: logDate ? `${logDate} 12:00:00` : null
    };

    try {
      const res = await fetch('/api/reading-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error('Failed to create reading log entry');
      showToast('Reading progress logged in your journal!');
      setIsLogOpen(false);
      
      // If book is completed (100%), ask to remove it from reading list? Or just let them manage it.
      if (Number(progressPercent) === 100) {
        if (window.confirm(`Congratulations on finishing "${payload.book_title}"! Would you like to remove it from your reading list?`)) {
          await fetch(`/api/reading-list/${activeItem.id}`, { method: 'DELETE' });
          fetchReadingList();
        }
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="content-header" style={{ marginBottom: '1.5rem' }}>
        <div>
          <h2>Reading List Queue</h2>
          <p className="subtitle" style={{ color: 'var(--text-muted)' }}>Your bucket list of books to read next. Add books from the library catalogue or enter custom ideas.</p>
        </div>
      </div>

      {/* Reading List Selector and Controls Panel */}
      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap', marginBottom: '1.5rem', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '0.75rem 1.25rem' }}>
        <span style={{ fontWeight: 'bold', fontSize: '0.9rem', color: 'var(--text-muted)' }}>Active List:</span>
        {loadingLists ? (
          <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Loading...</span>
        ) : (
          <select 
            value={activeListId} 
            onChange={(e) => setActiveListId(Number(e.target.value))} 
            className="input-control" 
            style={{ width: '220px', fontSize: '0.9rem' }}
          >
            {lists.map(list => (
              <option key={list.id} value={list.id}>
                {list.name} {list.is_public === 1 ? '🌐 (Public)' : '🔒 (Private)'}
              </option>
            ))}
          </select>
        )}
        
        {permissions === 'full' && (
          <div style={{ display: 'flex', gap: '0.35rem' }}>
            <button className="btn btn-outline" style={{ fontSize: '0.8rem', padding: '0.4rem 0.75rem' }} onClick={openCreateList}>
              New List
            </button>
            <button className="btn btn-outline" style={{ fontSize: '0.8rem', padding: '0.4rem 0.75rem' }} onClick={openEditList}>
              Rename/Edit
            </button>
            {lists.length > 1 && (
              <button className="btn btn-danger" style={{ fontSize: '0.8rem', padding: '0.4rem 0.75rem', background: 'transparent', color: 'var(--danger)', border: '1px solid rgba(239,68,68,0.2)' }} onClick={handleDeleteList}>
                Delete List
              </button>
            )}
          </div>
        )}

        {/* Share Button (if public list) */}
        {lists.find(l => l.id === activeListId)?.is_public === 1 && (
          <button 
            className="btn btn-secondary" 
            style={{ fontSize: '0.8rem', padding: '0.4rem 0.75rem', marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.25rem' }} 
            onClick={copyShareLink}
            title="Copy Public Share Link to Clipboard"
          >
            <span>Copy Share Link 🔗</span>
          </button>
        )}
      </div>

      {/* Description Panel */}
      {lists.find(l => l.id === activeListId)?.description && (
        <p style={{ fontStyle: 'italic', color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '-0.75rem', marginBottom: '1.5rem', background: 'var(--bg-app)', borderLeft: '3px solid var(--primary)', padding: '0.25rem 0.75rem' }}>
          {lists.find(l => l.id === activeListId).description}
        </p>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>Loading Reading List...</div>
      ) : readingList.length === 0 ? (
        <div className="card" style={{ padding: '4rem 2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          📌 Your reading list is currently empty. Go to the Library section and add some books, or hit "Add Manual Book" above.
        </div>
      ) : (
        <div className="recipe-grid animate-fade-in" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1.5rem', marginTop: '1.5rem' }}>
          {readingList.map(item => {
            const title = item.lib_title || item.title;
            const author = item.lib_author || item.author;
            const cover = item.lib_cover_url || item.cover_url;
            return (
              <div 
                key={item.id} 
                className="card book-card animate-fade-in" 
                style={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  height: '100%',
                  padding: '0.75rem',
                  gap: '0.75rem',
                  position: 'relative'
                }}
              >
                <div style={{ 
                  width: '100%', 
                  height: '240px', 
                  background: 'var(--bg-app)', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  overflow: 'hidden', 
                  borderRadius: '8px', 
                  border: '1px solid var(--border-color)', 
                  position: 'relative' 
                }}>
                  {cover ? (
                    <img 
                      src={cover} 
                      alt={title} 
                      style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', display: 'block' }} 
                    />
                  ) : (
                    <div style={{ fontSize: '3rem' }}>📚</div>
                  )}
                  
                  {item.book_id && (
                    <span 
                      style={{ 
                        position: 'absolute', 
                        bottom: '8px', 
                        left: '8px', 
                        fontSize: '0.65rem', 
                        padding: '2px 6px', 
                        background: 'var(--bg-card)', 
                        color: 'var(--primary)', 
                        border: '1px solid var(--primary)', 
                        borderRadius: '4px', 
                        fontWeight: 'bold' 
                      }}
                      title="Linked to Library Catalog"
                    >
                      Library Book
                    </span>
                  )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'space-between' }}>
                  <div style={{ marginBottom: '0.5rem' }}>
                    <h4 style={{ margin: '0 0 0.15rem 0', fontSize: '1rem', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', minHeight: '2.5rem', lineHeight: '1.25' }} title={title}>
                      {title}
                    </h4>
                    <p style={{ margin: '0 0 0.25rem 0', fontSize: '0.85rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      by {author || 'Unknown'}
                    </p>
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem' }}>
                    <button 
                      className="btn btn-primary" 
                      style={{ flex: 1, padding: '0.4rem 0.5rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}
                      onClick={() => openLogModal(item)}
                      title="Log reading session / update progress"
                    >
                      <Play size={12} /> Log Progress
                    </button>
                    {item.book_id && (
                      <button 
                        className="btn btn-outline" 
                        style={{ padding: '0.4rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        onClick={async () => {
                          const res = await fetch(`/api/books/${item.book_id}`);
                          if (res.ok) {
                            const details = await res.json();
                            setActiveDetail(details);
                            setIsDetailOpen(true);
                          }
                        }}
                        title="Book Specifications"
                      >
                        <Info size={14} />
                      </button>
                    )}
                    {permissions === 'full' && (
                      <button 
                        className="btn btn-danger" 
                        style={{ padding: '0.4rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        onClick={() => handleRemoveItem(item.id, title)}
                        title="Remove from Reading List"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Manual Book Creation Modal */}
      {isAddOpen && (
        <div className="modal-overlay" onClick={() => setIsAddOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Add Manual Book Suggestion</h2>
              <button className="close-btn" onClick={() => setIsAddOpen(false)}>×</button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleManualAdd} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div className="form-group">
                  <label htmlFor="manual-title-input">Book Title *</label>
                  <input 
                    id="manual-title-input"
                    type="text" 
                    value={manualTitle} 
                    onChange={(e) => setManualTitle(e.target.value)} 
                    className="input-control" 
                    required 
                    autoFocus
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="manual-author-input">Author</label>
                  <input 
                    id="manual-author-input"
                    type="text" 
                    value={manualAuthor} 
                    onChange={(e) => setManualAuthor(e.target.value)} 
                    className="input-control" 
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="manual-cover-input">Cover Image URL</label>
                  <input 
                    id="manual-cover-input"
                    type="text" 
                    value={manualCoverUrl} 
                    onChange={(e) => setManualCoverUrl(e.target.value)} 
                    className="input-control" 
                    placeholder="https://example.com/cover.jpg"
                  />
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', borderTop: '1px solid var(--border)', paddingTop: '0.75rem', marginTop: '0.5rem' }}>
                  <button type="button" className="btn btn-outline" onClick={() => setIsAddOpen(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary">Add Book</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Log Entry Creation Modal */}
      {isLogOpen && activeItem && (
        <div className="modal-overlay animate-fade-in" onClick={() => setIsLogOpen(false)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', zIndex: 1100 }}>
          <div className="modal-content animate-slide-up" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '450px', width: '90%' }}>
            <div className="modal-header">
              <h3>Log Reading Progress</h3>
              <button className="close-btn" onClick={() => setIsLogOpen(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body" style={{ padding: '1.5rem' }}>
              <h4 style={{ margin: '0 0 1rem 0', color: 'var(--primary)' }}>
                {activeItem.lib_title || activeItem.title}
              </h4>
              
              <form onSubmit={handleLogSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div className="form-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <label htmlFor="log-progress-slider">Current Progress *</label>
                    <span style={{ fontWeight: 'bold' }}>{progressPercent}%</span>
                  </div>
                  <input 
                    id="log-progress-slider"
                    type="range" 
                    min="0" 
                    max="100" 
                    value={progressPercent} 
                    onChange={(e) => setProgressPercent(e.target.value)} 
                    className="input-control"
                    style={{ height: '8px', padding: 0 }}
                    required 
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                    <span>0% (Just started)</span>
                    <span>100% (Finished!)</span>
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="log-date-input">Log Date</label>
                  <input 
                    id="log-date-input"
                    type="date" 
                    value={logDate} 
                    onChange={(e) => setLogDate(e.target.value)} 
                    className="input-control" 
                    required 
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="log-notes-input">Journal Notes</label>
                  <textarea 
                    id="log-notes-input"
                    placeholder="Reflections, favorite quotes, or thoughts on this session..." 
                    value={logNotes} 
                    onChange={(e) => setLogNotes(e.target.value)} 
                    className="input-control" 
                    rows="3"
                  />
                </div>

                <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                  <button type="button" className="btn btn-outline" style={{ flex: 1 }} onClick={() => setIsLogOpen(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Save Log Entry</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Book Specifications Modal (for Details) */}
      {isDetailOpen && activeDetail && (
        <div className="modal-overlay animate-fade-in" onClick={() => setIsDetailOpen(false)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', zIndex: 1100 }}>
          <div className="modal-content animate-slide-up" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px', width: '90%' }}>
            <div className="modal-header">
              <h3>Book Specifications</h3>
              <button className="close-btn" onClick={() => setIsDetailOpen(false)}>
                <X size={20} />
              </button>
            </div>
            
            <div className="modal-body" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                <div style={{ width: '100px', height: '145px', background: 'var(--bg-app)', border: '1px solid var(--border-color)', borderRadius: '4px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {activeDetail.cover_url ? (
                    <img src={activeDetail.cover_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <span style={{ fontSize: '2rem' }}>📚</span>
                  )}
                </div>
                
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h4 style={{ margin: '0 0 0.25rem 0', color: 'var(--primary)' }}>{activeDetail.title}</h4>
                  <p style={{ margin: '0 0 0.5rem 0', fontWeight: 'bold' }}>by {activeDetail.author || 'Unknown'}</p>
                  <div style={{ fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                    {activeDetail.isbn && <div><strong>ISBN:</strong> {activeDetail.isbn}</div>}
                    {activeDetail.publisher && <div><strong>Publisher:</strong> {activeDetail.publisher}</div>}
                    {activeDetail.published_date && <div><strong>Published:</strong> {activeDetail.published_date}</div>}
                  </div>
                </div>
              </div>

              {activeDetail.description && (
                <div style={{ background: 'var(--bg-app)', padding: '0.75rem', borderRadius: '4px', fontSize: '0.85rem' }}>
                  <strong>Description:</strong>
                  <p style={{ margin: '0.25rem 0 0 0', color: 'var(--text-muted)', lineHeight: '1.4', maxHeight: '100px', overflowY: 'auto' }}>
                    {activeDetail.description}
                  </p>
                </div>
              )}

              <button className="btn btn-outline" style={{ width: '100%' }} onClick={() => setIsDetailOpen(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Create / Edit Reading List Modal */}
      {isListFormOpen && (
        <div className="modal-overlay animate-fade-in" onClick={() => setIsListFormOpen(false)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', zIndex: 1100 }}>
          <div className="modal-content animate-slide-up" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '450px', width: '90%' }}>
            <div className="modal-header">
              <h3>{editingList ? 'Edit Reading List Settings' : 'Create New Reading List'}</h3>
              <button className="close-btn" onClick={() => setIsListFormOpen(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body" style={{ padding: '1.5rem' }}>
              <form onSubmit={handleListSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div className="form-group">
                  <label htmlFor="list-name-input">List Name *</label>
                  <input 
                    id="list-name-input"
                    type="text" 
                    value={listName} 
                    onChange={(e) => setListName(e.target.value)} 
                    className="input-control" 
                    required 
                    autoFocus
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="list-desc-input">Description</label>
                  <textarea 
                    id="list-desc-input"
                    placeholder="Short description of this reading list..." 
                    value={listDescription} 
                    onChange={(e) => setListDescription(e.target.value)} 
                    className="input-control" 
                    rows="3"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="list-public-check">Visibility Settings</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginTop: '0.25rem' }}>
                    <input 
                      id="list-public-check"
                      type="checkbox" 
                      checked={listIsPublic}
                      onChange={(e) => setListIsPublic(e.target.checked)}
                      className="custom-checkbox"
                    />
                    <span style={{ fontSize: '0.9rem', color: 'var(--text-main)' }}>Make reading list public / shareable 🌐</span>
                  </div>
                  <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Anyone with the link will be able to view this reading list without logging in.
                  </p>
                </div>

                <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                  <button type="button" className="btn btn-outline" style={{ flex: 1 }} onClick={() => setIsListFormOpen(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                    {editingList ? 'Save Changes' : 'Create List'}
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
