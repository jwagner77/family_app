import React, { useState, useEffect } from 'react';
import { BookOpen, History, Plus, X, Trash2, Calendar, BookMarked, Edit3 } from 'lucide-react';

export default function ReadingLogView({ showToast, permissions }) {
  const [activeSubTab, setActiveSubTab] = useState('books'); // 'books' or 'timeline'
  const [booksSummary, setBooksSummary] = useState([]);
  const [allLogs, setAllLogs] = useState([]);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [loadingLogs, setLoadingLogs] = useState(false);

  // Expanded book ID mapping for collapsible views
  const [expandedBooks, setExpandedBooks] = useState({});

  // Add Log Modal
  const [isAddLogOpen, setIsAddLogOpen] = useState(false);
  const [availableBooks, setAvailableBooks] = useState({ library: [], reading_list: [] }); // Combined library + reading list
  const [selectedBookType, setSelectedBookType] = useState('library'); // library, reading_list, manual
  const [selectedBookId, setSelectedBookId] = useState('');
  const [manualTitle, setManualTitle] = useState('');
  const [manualAuthor, setManualAuthor] = useState('');
  const [progressPercent, setProgressPercent] = useState(0);
  const [notes, setNotes] = useState('');
  const [entryDate, setEntryDate] = useState('');
  
  const [pageNumber, setPageNumber] = useState('');
  const [inputTotalPages, setInputTotalPages] = useState('');
  const [streak, setStreak] = useState(0);

  const fetchStreak = async () => {
    try {
      const res = await fetch('/api/streak');
      if (res.ok) {
        const data = await res.json();
        setStreak(data.streak || 0);
      }
    } catch (e) {
      console.error('Failed to fetch streak:', e);
    }
  };

  // DNF States
  const [dnfList, setDnfList] = useState([]);
  const [loadingDnf, setLoadingDnf] = useState(false);
  const [isDnfModalOpen, setIsDnfModalOpen] = useState(false);
  const [dnfBookToMark, setDnfBookToMark] = useState(null);
  const [dnfReason, setDnfReason] = useState('');

  const fetchDnf = async () => {
    setLoadingDnf(true);
    try {
      const res = await fetch('/api/reading-log/dnf');
      if (res.ok) {
        const data = await res.json();
        setDnfList(data);
      }
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoadingDnf(false);
    }
  };

  const handleResumeBook = async (dnfId) => {
    try {
      const res = await fetch(`/api/reading-log/dnf/${dnfId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to resume reading');
      showToast('Book resumed! Added back to active reading.');
      if (activeSubTab === 'books') fetchSummary();
      else if (activeSubTab === 'dnf') fetchDnf();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const openDnfModal = (book) => {
    setDnfBookToMark(book);
    setDnfReason('');
    setIsDnfModalOpen(true);
  };

  const handleDnfSubmit = async (e) => {
    e.preventDefault();
    if (!dnfBookToMark) return;

    const payload = {
      book_id: dnfBookToMark.book_id > 0 ? dnfBookToMark.book_id : null,
      reading_list_id: dnfBookToMark.reading_list_id > 0 ? dnfBookToMark.reading_list_id : null,
      book_title: dnfBookToMark.book_title,
      book_author: dnfBookToMark.book_author,
      reason: dnfReason
    };

    try {
      const res = await fetch('/api/reading-log/dnf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error('Failed to mark book as DNF');
      showToast('Book marked as Did Not Finish.');
      setIsDnfModalOpen(false);
      fetchSummary();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const fetchSummary = async () => {
    setLoadingSummary(true);
    try {
      const res = await fetch('/api/reading-log/summary');
      if (res.ok) {
        const data = await res.json();
        setBooksSummary(data);
      }
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoadingSummary(false);
    }
  };

  const fetchAllLogs = async () => {
    setLoadingLogs(true);
    try {
      const res = await fetch('/api/reading-log');
      if (res.ok) {
        const data = await res.json();
        setAllLogs(data);
      }
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoadingLogs(false);
    }
  };

  const loadDropdownBooks = async () => {
    try {
      const [libRes, listRes] = await Promise.all([
        fetch('/api/books?status=all'),
        fetch('/api/reading-list')
      ]);
      const libraryBooks = libRes.ok ? await libRes.json() : [];
      const readingListBooks = listRes.ok ? await listRes.json() : [];
      
      setAvailableBooks({
        library: libraryBooks,
        reading_list: readingListBooks
      });
    } catch (err) {
      console.error('Failed to load books for dropdown', err);
    }
  };

  useEffect(() => {
    fetchStreak();
    if (activeSubTab === 'books') {
      fetchSummary();
    } else if (activeSubTab === 'timeline') {
      fetchAllLogs();
    } else if (activeSubTab === 'dnf') {
      fetchDnf();
    }
  }, [activeSubTab]);

  useEffect(() => {
    const handleAddTrigger = (e) => {
      if (e.detail.tab === 'reading_log') {
        openLogModal();
      }
    };
    window.addEventListener('trigger-add-action', handleAddTrigger);
    return () => {
      window.removeEventListener('trigger-add-action', handleAddTrigger);
    };
  }, []);

  const toggleExpand = (bookKey) => {
    setExpandedBooks(prev => ({
      ...prev,
      [bookKey]: !prev[bookKey]
    }));
  };

  const openLogModal = (bookPreset = null) => {
    loadDropdownBooks();
    setProgressPercent(10);
    setNotes('');
    setEntryDate(new Date().toISOString().substring(0, 10));
    setPageNumber('');
    setInputTotalPages('');

    if (bookPreset) {
      if (bookPreset.book_id > 0) {
        setSelectedBookType('library');
        setSelectedBookId(bookPreset.book_id);
      } else if (bookPreset.reading_list_id > 0) {
        setSelectedBookType('reading_list');
        setSelectedBookId(bookPreset.reading_list_id);
      } else {
        setSelectedBookType('manual');
        setManualTitle(bookPreset.book_title);
        setManualAuthor(bookPreset.book_author);
      }
    } else {
      setSelectedBookType('library');
      setSelectedBookId('');
      setManualTitle('');
      setManualAuthor('');
    }
    setIsAddLogOpen(true);
  };

  const getSelectedBookTotalPages = () => {
    if (selectedBookType === 'library' && selectedBookId) {
      const book = availableBooks.library.find(b => String(b.id) === String(selectedBookId));
      return book ? (book.total_pages || 0) : 0;
    }
    if (selectedBookType === 'reading_list' && selectedBookId) {
      const book = availableBooks.reading_list.find(b => String(b.id) === String(selectedBookId));
      return book ? (book.lib_total_pages || 0) : 0;
    }
    return 0;
  };

  const handleLogSubmit = async (e) => {
    e.preventDefault();

    const resolvedTotalPages = getSelectedBookTotalPages() || Number(inputTotalPages) || 0;
    const progress_pct = (Number(pageNumber) && resolvedTotalPages)
      ? Math.min(100, Math.max(0, Math.round((Number(pageNumber) / resolvedTotalPages) * 100)))
      : Number(progressPercent);

    let payload = {
      progress_percent: progress_pct,
      notes: notes,
      entry_date: entryDate ? `${entryDate} 12:00:00` : null,
      page_number: pageNumber ? Number(pageNumber) : null,
      total_pages: resolvedTotalPages ? Number(resolvedTotalPages) : null
    };

    if (selectedBookType === 'library') {
      if (!selectedBookId) return showToast('Please select a library book', 'error');
      const matched = availableBooks.library.find(b => String(b.id) === String(selectedBookId));
      payload.book_id = Number(selectedBookId);
      payload.book_title = matched ? matched.title : 'Library Book';
      payload.book_author = matched ? matched.author : '';
    } else if (selectedBookType === 'reading_list') {
      if (!selectedBookId) return showToast('Please select a reading list book', 'error');
      const matched = availableBooks.reading_list.find(b => String(b.id) === String(selectedBookId));
      payload.reading_list_id = Number(selectedBookId);
      payload.book_title = matched ? (matched.lib_title || matched.title) : 'Reading List Book';
      payload.book_author = matched ? (matched.lib_author || matched.author) : '';
    } else {
      if (!manualTitle.trim()) return showToast('Please enter a book title', 'error');
      payload.book_title = manualTitle.trim();
      payload.book_author = manualAuthor.trim();
    }

    try {
      const res = await fetch('/api/reading-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error('Failed to save log entry');
      showToast('Log entry recorded!');
      setIsAddLogOpen(false);
      
      // Refresh current tab
      if (activeSubTab === 'books') fetchSummary();
      else fetchAllLogs();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleDeleteEntry = async (entryId) => {
    if (!window.confirm('Are you sure you want to delete this journal entry?')) return;
    try {
      const res = await fetch(`/api/reading-log/${entryId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete log entry');
      showToast('Journal entry deleted.');
      if (activeSubTab === 'books') fetchSummary();
      else fetchAllLogs();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="content-header">
        <div>
          <h2>Personal Reading Journal</h2>
          <p className="subtitle" style={{ color: 'var(--text-muted)' }}>Keep track of your reading milestones, pages read, and reviews over time.</p>
        </div>
      </div>

      {/* Streak Tracker Banner */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '1rem',
        background: 'linear-gradient(135deg, rgba(249, 115, 22, 0.15) 0%, rgba(239, 68, 68, 0.15) 100%)',
        border: '1px solid rgba(249, 115, 22, 0.3)',
        borderRadius: 'var(--radius-lg)',
        padding: '1.25rem 1.5rem',
        marginBottom: '1.5rem',
        color: 'var(--text-main)',
        boxShadow: '0 4px 15px rgba(249, 115, 22, 0.05)'
      }}>
        <div style={{
          fontSize: '2.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          animation: 'pulse 2s infinite'
        }}>
          🔥
        </div>
        <div>
          <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#f97316', fontWeight: 'bold' }}>
            {streak} Day{streak !== 1 ? 's' : ''} Reading Streak!
          </h3>
          <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
            {streak > 0 
              ? "Amazing job! Keep adding reading logs every day to keep the flame alive."
              : "No active streak. Log your progress today to start a new reading streak!"}
          </p>
        </div>
      </div>

      {/* Subtab selection */}
      <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid var(--border-color)', marginBottom: '1.5rem', paddingBottom: '0.25rem', flexWrap: 'wrap' }}>
        <button 
          className={`btn ${activeSubTab === 'books' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => setActiveSubTab('books')}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', border: 'none', background: 'transparent', color: activeSubTab === 'books' ? 'var(--primary)' : 'var(--text-muted)', borderBottom: activeSubTab === 'books' ? '2px solid var(--primary)' : 'none', borderRadius: 0, padding: '0.5rem 1rem', fontSize: '1rem', fontWeight: 'bold' }}
        >
          <BookMarked size={18} />
          My Books Journal
        </button>
        <button 
          className={`btn ${activeSubTab === 'timeline' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => setActiveSubTab('timeline')}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', border: 'none', background: 'transparent', color: activeSubTab === 'timeline' ? 'var(--primary)' : 'var(--text-muted)', borderBottom: activeSubTab === 'timeline' ? '2px solid var(--primary)' : 'none', borderRadius: 0, padding: '0.5rem 1rem', fontSize: '1rem', fontWeight: 'bold' }}
        >
          <History size={18} />
          All Journal Entries
        </button>
        <button 
          className={`btn ${activeSubTab === 'dnf' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => setActiveSubTab('dnf')}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', border: 'none', background: 'transparent', color: activeSubTab === 'dnf' ? 'var(--primary)' : 'var(--text-muted)', borderBottom: activeSubTab === 'dnf' ? '2px solid var(--primary)' : 'none', borderRadius: 0, padding: '0.5rem 1rem', fontSize: '1rem', fontWeight: 'bold' }}
        >
          <X size={18} style={{ color: 'var(--danger)' }} />
          Did Not Finish (DNF)
        </button>
      </div>

      {/* Books Summary Tab */}
      {activeSubTab === 'books' && (
        <div className="animate-fade-in">
          {loadingSummary ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>Loading summary...</div>
          ) : booksSummary.length === 0 ? (
            <div className="card" style={{ padding: '4rem 2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              ✍️ You haven't added any reading log entries yet. Click "Add Journal Entry" to log progress for a book.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {booksSummary.map(book => {
                const bookKey = `${book.book_id}_${book.reading_list_id}_${book.book_title}`;
                const isExpanded = !!expandedBooks[bookKey];
                
                return (
                  <div key={bookKey} className="card" style={{ padding: '1.25rem' }}>
                    <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'center', flexWrap: 'wrap' }}>
                      <div style={{ width: '50px', height: '75px', background: 'var(--bg-app)', border: '1px solid var(--border-color)', borderRadius: '4px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {book.lib_cover_url ? (
                          <img src={book.lib_cover_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <span style={{ fontSize: '1.5rem' }}>📚</span>
                        )}
                      </div>
                      
                      <div style={{ flex: 1, minWidth: '220px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                          <h4 style={{ margin: '0 0 0.25rem 0', fontSize: '1.15rem' }}>{book.book_title}</h4>
                          {book.is_dnf && (
                            <span style={{ fontSize: '0.65rem', padding: '1px 6px', background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '4px', fontWeight: 'bold' }}>
                              DNF
                            </span>
                          )}
                        </div>
                        <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-muted)' }}>by {book.book_author || 'Unknown'}</p>
                        {book.is_dnf && book.dnf_reason && (
                          <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.8rem', color: 'var(--danger)', fontStyle: 'italic' }}>
                            Reason: "{book.dnf_reason}"
                          </p>
                        )}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', minWidth: '240px' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.25rem' }}>
                            <span>Reading Progress</span>
                            <strong>{book.latest_progress}%</strong>
                          </div>
                          <div style={{ height: '8px', background: 'var(--bg-app)', border: '1px solid var(--border-color)', borderRadius: '4px', overflow: 'hidden' }}>
                            <div style={{ width: `${book.latest_progress}%`, height: '100%', background: book.is_dnf ? '#ef4444' : 'var(--primary)' }} />
                          </div>
                        </div>
                        
                        <div style={{ display: 'flex', gap: '0.35rem' }}>
                          <button 
                            className="btn btn-outline" 
                            style={{ fontSize: '0.8rem', padding: '0.5rem 0.75rem' }}
                            onClick={() => toggleExpand(bookKey)}
                          >
                            {isExpanded ? 'Hide' : `History (${book.logs?.length || 0})`}
                          </button>
                          {permissions === 'full' && (
                            book.is_dnf ? (
                              <button 
                                className="btn btn-primary" 
                                style={{ fontSize: '0.8rem', padding: '0.5rem 0.75rem' }}
                                onClick={() => handleResumeBook(book.dnf_id)}
                                title="Resume reading this book"
                              >
                                Resume
                              </button>
                            ) : (
                              <>
                                <button 
                                  className="btn btn-primary" 
                                  style={{ fontSize: '0.8rem', padding: '0.5rem 0.75rem' }}
                                  onClick={() => openLogModal(book)}
                                  title="Log another reading session"
                                >
                                  Add Log
                                </button>
                                <button 
                                  className="btn btn-outline" 
                                  style={{ fontSize: '0.8rem', padding: '0.5rem 0.4rem', color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.2)' }}
                                  onClick={() => openDnfModal(book)}
                                  title="Mark as Did Not Finish"
                                >
                                  Mark DNF
                                </button>
                              </>
                            )
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Collapsible log entries drawer */}
                    {isExpanded && (
                      <div className="animate-fade-in" style={{ borderTop: '1px solid var(--border-color)', marginTop: '1.25rem', paddingTop: '1rem' }}>
                        <h5 style={{ margin: '0 0 0.75rem 0', fontSize: '0.9rem', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em' }}>Historical Logs</h5>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                          {book.logs?.map(log => (
                            <div 
                              key={log.id} 
                              style={{ display: 'flex', background: 'var(--bg-app)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '0.75rem 1rem', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1.5rem' }}
                            >
                              <div style={{ flex: 1 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.35rem', fontSize: '0.85rem' }}>
                                  <span style={{ fontWeight: 'bold', color: 'var(--primary)' }}>
                                    {log.page_number ? `Read page ${log.page_number} of ${log.total_pages} (${log.progress_percent}%)` : `${log.progress_percent}% read`}
                                  </span>
                                  <span style={{ color: 'var(--text-muted)' }}>|</span>
                                  <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                    <Calendar size={12} /> {new Date(log.entry_date).toLocaleDateString()}
                                  </span>
                                </div>
                                {log.notes && <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-main)', fontStyle: 'italic', lineHeight: '1.4' }}>"{log.notes}"</p>}
                              </div>

                              {permissions === 'full' && (
                                <button 
                                  className="btn btn-danger" 
                                  style={{ padding: '0.35rem', color: 'var(--danger)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                  onClick={() => handleDeleteEntry(log.id)}
                                  title="Delete entry"
                                >
                                  <Trash2 size={14} />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Timeline Tab */}
      {activeSubTab === 'timeline' && (
        <div className="animate-fade-in">
          {loadingLogs ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>Loading journal timeline...</div>
          ) : allLogs.length === 0 ? (
            <div className="card" style={{ padding: '4rem 2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              ✍️ You haven't added any reading log entries yet.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {allLogs.map(log => (
                <div key={log.id} className="card" style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start', padding: '1rem' }}>
                  <div style={{ width: '40px', height: '60px', background: 'var(--bg-app)', border: '1px solid var(--border-color)', borderRadius: '4px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {log.lib_cover_url ? (
                      <img src={log.lib_cover_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <span style={{ fontSize: '1.25rem' }}>📚</span>
                    )}
                  </div>
                  
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
                      <div>
                        <h4 style={{ margin: '0 0 0.15rem 0', fontSize: '1.05rem' }}>{log.book_title}</h4>
                        <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>by {log.book_author || 'Unknown'}</p>
                      </div>
                      
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.85rem' }}>
                        <span style={{ fontWeight: 'bold', color: 'var(--primary)' }}>
                          {log.page_number ? `Read page ${log.page_number} of ${log.total_pages} (${log.progress_percent}%)` : `${log.progress_percent}% progress`}
                        </span>
                        <span style={{ color: 'var(--text-muted)' }}>•</span>
                        <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Calendar size={12} /> {new Date(log.entry_date).toLocaleDateString()}</span>
                        {permissions === 'full' && (
                          <button 
                            className="btn btn-danger" 
                            style={{ padding: '0.35rem', marginLeft: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            onClick={() => handleDeleteEntry(log.id)}
                            title="Delete entry"
                          >
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>
                    </div>

                    {log.notes && (
                      <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-main)', fontStyle: 'italic', background: 'var(--bg-app)', border: '1px solid var(--border-color)', borderRadius: '4px', padding: '0.5rem 0.75rem', marginTop: '0.25rem' }}>
                        "{log.notes}"
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Did Not Finish Tab */}
      {activeSubTab === 'dnf' && (
        <div className="animate-fade-in">
          {loadingDnf ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>Loading DNF list...</div>
          ) : dnfList.length === 0 ? (
            <div className="card" style={{ padding: '4rem 2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              🎯 Great job! You have no books marked as Did Not Finish.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {dnfList.map(item => (
                <div key={item.id} className="card" style={{ display: 'flex', gap: '1.25rem', alignItems: 'flex-start', padding: '1.25rem' }}>
                  <div style={{ width: '50px', height: '75px', background: 'var(--bg-app)', border: '1px solid var(--border-color)', borderRadius: '4px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {(item.lib_cover_url || item.list_cover_url) ? (
                      <img src={item.lib_cover_url || item.list_cover_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <span style={{ fontSize: '1.5rem' }}>📚</span>
                    )}
                  </div>
                  
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
                      <div>
                        <h4 style={{ margin: '0 0 0.15rem 0', fontSize: '1.15rem' }}>{item.book_title}</h4>
                        <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>by {item.book_author || 'Unknown'}</p>
                      </div>
                      
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <span style={{ fontSize: '0.85rem', color: 'var(--danger)', fontWeight: 'bold' }}>Stopped at {item.latest_progress}%</span>
                        {permissions === 'full' && (
                          <button 
                            className="btn btn-primary" 
                            style={{ fontSize: '0.8rem', padding: '0.4rem 0.75rem' }}
                            onClick={() => handleResumeBook(item.id)}
                          >
                            Resume Reading
                          </button>
                        )}
                      </div>
                    </div>
                    
                    {item.reason && (
                      <div style={{ background: 'var(--bg-app)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '0.5rem 0.75rem', marginTop: '0.5rem', fontSize: '0.85rem' }}>
                        <strong style={{ color: 'var(--text-muted)' }}>DNF Reason: </strong>
                        <span style={{ fontStyle: 'italic' }}>"{item.reason}"</span>
                      </div>
                    )}
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <Calendar size={12} /> Paused on {new Date(item.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Add Log Modal */}
      {isAddLogOpen && (
        <div className="modal-overlay" onClick={() => setIsAddLogOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Create Journal Entry</h2>
              <button className="close-btn" onClick={() => setIsAddLogOpen(false)}>×</button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleLogSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                
                <div className="form-group">
                  <label>Association</label>
                  <select 
                    value={selectedBookType} 
                    onChange={(e) => {
                      setSelectedBookType(e.target.value);
                      setSelectedBookId('');
                    }}
                    className="input-control"
                  >
                    <option value="library">Library book catalog</option>
                    <option value="reading_list">My Reading list books</option>
                    <option value="manual">Write manual title...</option>
                  </select>
                </div>

                {selectedBookType === 'library' && (
                  <div className="form-group animate-fade-in">
                    <label htmlFor="log-lib-book-select">Select Book *</label>
                    <select 
                      id="log-lib-book-select"
                      value={selectedBookId}
                      onChange={(e) => setSelectedBookId(e.target.value)}
                      className="input-control"
                      required
                    >
                      <option value="">-- Choose Book --</option>
                      {availableBooks.library?.map(b => (
                        <option key={b.id} value={b.id}>{b.title} {b.author ? `(by ${b.author})` : ''}</option>
                      ))}
                    </select>
                  </div>
                )}

                {selectedBookType === 'reading_list' && (
                  <div className="form-group animate-fade-in">
                    <label htmlFor="log-list-book-select">Select Reading List Item *</label>
                    <select 
                      id="log-list-book-select"
                      value={selectedBookId}
                      onChange={(e) => setSelectedBookId(e.target.value)}
                      className="input-control"
                      required
                    >
                      <option value="">-- Choose Item --</option>
                      {availableBooks.reading_list?.map(b => (
                        <option key={b.id} value={b.id}>{b.lib_title || b.title} {b.lib_author || b.author ? `(by ${b.lib_author || b.author})` : ''}</option>
                      ))}
                    </select>
                  </div>
                )}

                {selectedBookType === 'manual' && (
                  <div className="form-group animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <div>
                      <label htmlFor="log-manual-title">Book Title *</label>
                      <input 
                        id="log-manual-title"
                        type="text" 
                        value={manualTitle} 
                        onChange={(e) => setManualTitle(e.target.value)} 
                        className="input-control" 
                        required 
                      />
                    </div>
                    <div>
                      <label htmlFor="log-manual-author">Author</label>
                      <input 
                        id="log-manual-author"
                        type="text" 
                        value={manualAuthor} 
                        onChange={(e) => setManualAuthor(e.target.value)} 
                        className="input-control" 
                      />
                    </div>
                  </div>
                )}

                {/* Page progress calculation */}
                {(() => {
                  const dbTotalPages = getSelectedBookTotalPages();
                  const showTotalPagesInput = dbTotalPages === 0;
                  const resolvedTotalPages = dbTotalPages || Number(inputTotalPages) || 0;
                  const calculatedPercent = (Number(pageNumber) && resolvedTotalPages)
                    ? Math.min(100, Math.max(0, Math.round((Number(pageNumber) / resolvedTotalPages) * 100)))
                    : 0;

                  return (
                    <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      <label style={{ fontWeight: 'bold' }}>Progress Reached *</label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1 }}>
                          <input
                            type="number"
                            min="0"
                            placeholder="Current Page"
                            value={pageNumber}
                            onChange={(e) => setPageNumber(e.target.value)}
                            className="input-control"
                            style={{ flex: 1, textAlign: 'center' }}
                            required
                          />
                          <span style={{ fontSize: '1.2rem', color: 'var(--text-muted)' }}>/</span>
                          {showTotalPagesInput ? (
                            <input
                              type="number"
                              min="1"
                              placeholder="Total Pages"
                              value={inputTotalPages}
                              onChange={(e) => setInputTotalPages(e.target.value)}
                              className="input-control"
                              style={{ flex: 1, textAlign: 'center' }}
                              required
                            />
                          ) : (
                            <span style={{ flex: 1, fontSize: '1.1rem', fontWeight: 'bold', padding: '0.5rem', background: 'var(--bg-app)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                              {dbTotalPages}
                            </span>
                          )}
                        </div>
                        <div style={{ background: 'var(--primary)', color: 'var(--primary-foreground)', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-md)', fontWeight: 'bold', minWidth: '60px', textAlign: 'center' }}>
                          {calculatedPercent}%
                        </div>
                      </div>
                      {showTotalPagesInput && (
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          Total pages for this book is not set. Please enter it here to compute progress.
                        </span>
                      )}
                    </div>
                  );
                })()}

                <div className="form-group">
                  <label htmlFor="log-date-input">Log Date</label>
                  <input 
                    id="log-date-input"
                    type="date" 
                    value={entryDate} 
                    onChange={(e) => setEntryDate(e.target.value)} 
                    className="input-control" 
                    required 
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="log-notes-input">Journal notes</label>
                  <textarea 
                    id="log-notes-input"
                    placeholder="Quotes, ideas, or annotations from this session..."
                    value={notes} 
                    onChange={(e) => setNotes(e.target.value)} 
                    className="input-control" 
                    rows="3"
                  />
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', borderTop: '1px solid var(--border)', paddingTop: '0.75rem', marginTop: '0.5rem' }}>
                  <button type="button" className="btn btn-outline" onClick={() => setIsAddLogOpen(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary">Save Log Entry</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Mark as DNF Modal */}
      {isDnfModalOpen && dnfBookToMark && (
        <div className="modal-overlay animate-fade-in" onClick={() => setIsDnfModalOpen(false)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', zIndex: 1100 }}>
          <div className="modal-content animate-slide-up" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '420px', width: '90%' }}>
            <div className="modal-header">
              <h3>Mark as Did Not Finish</h3>
              <button className="close-btn" onClick={() => setIsDnfModalOpen(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body" style={{ padding: '1.5rem' }}>
              <h4 style={{ margin: '0 0 1rem 0', color: 'var(--danger)' }}>
                {dnfBookToMark.book_title}
              </h4>
              <form onSubmit={handleDnfSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div className="form-group">
                  <label htmlFor="dnf-reason-input">Reason for stopping (optional)</label>
                  <textarea 
                    id="dnf-reason-input"
                    placeholder="e.g. Too slow pacing, lost interest, writing style wasn't for me..." 
                    value={dnfReason} 
                    onChange={(e) => setDnfReason(e.target.value)} 
                    className="input-control" 
                    rows="3"
                  />
                </div>
                <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                  <button type="button" className="btn btn-outline" style={{ flex: 1 }} onClick={() => setIsDnfModalOpen(false)}>Cancel</button>
                  <button type="submit" className="btn btn-danger" style={{ flex: 1 }}>Mark DNF</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
