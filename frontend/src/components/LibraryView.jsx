import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, Search, List, Grid, Trash2, Archive, 
  Tag, X, Camera, RefreshCw, Eye, Edit2, Bookmark, CheckSquare, Square
} from 'lucide-react';


export default function LibraryView({ showToast, permissions, currentUser }) {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState('grid');
  
  // Filters & Sorting
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState('');
  const [statusFilter, setStatusFilter] = useState('library'); // library, archived, all
  const [sortField, setSortField] = useState('title'); // title, author, created_at
  const [sortOrder, setSortOrder] = useState('asc'); // asc, desc
  const [uniqueTags, setUniqueTags] = useState([]);

  // Selection
  const [selectedIds, setSelectedIds] = useState([]);

  // Modal / Editing states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingBook, setEditingBook] = useState(null); // Book currently being edited
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [activeBook, setActiveBook] = useState(null); // Book inside detail modal

  // Barcode Scanner Modal
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const zxingReaderInstance = useRef(null);

  // ISBN Lookup
  const [isbnLookupVal, setIsbnLookupVal] = useState('');
  const [isbnLoading, setIsbnLoading] = useState(false);

  // Reading List Selection Prompt
  const [isListPromptOpen, setIsListPromptOpen] = useState(false);
  const [promptBookId, setPromptBookId] = useState(null);
  const [promptBookTitle, setPromptBookTitle] = useState('');
  const [promptLoadingLists, setPromptLoadingLists] = useState(false);
  const [userReadingLists, setUserReadingLists] = useState([]);



  // Bulk Actions Dialog
  const [isBulkTagOpen, setIsBulkTagOpen] = useState(false);
  const [bulkTagInput, setBulkTagInput] = useState('');
  const [bulkTagAction, setBulkTagAction] = useState('add'); // add, remove, set

  // Book Form State
  const [formIsbn, setFormIsbn] = useState('');
  const [formTitle, setFormTitle] = useState('');
  const [formAuthor, setFormAuthor] = useState('');
  const [formPublisher, setFormPublisher] = useState('');
  const [formPublishedDate, setFormPublishedDate] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formCoverUrl, setFormCoverUrl] = useState('');
  const [formTags, setFormTags] = useState('');
  const [formStatus, setFormStatus] = useState('library');
  const [formCoverFile, setFormCoverFile] = useState(null);
  const [formRating, setFormRating] = useState(0);
  const [formRedFlag, setFormRedFlag] = useState(0);
  const [formTotalPages, setFormTotalPages] = useState(0);

  // Comments & Recommendations State
  const [comments, setComments] = useState([]);
  const [newCommentText, setNewCommentText] = useState('');
  const [loadingComments, setLoadingComments] = useState(false);
  const [usersList, setUsersList] = useState([]);
  const [recommendToUserId, setRecommendToUserId] = useState('');
  const [recommendNotes, setRecommendNotes] = useState('');
  const [isRecommendLoading, setIsRecommendLoading] = useState(false);

  const fetchBooks = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/books?q=${encodeURIComponent(searchQuery)}&tag=${encodeURIComponent(selectedTag)}&status=${statusFilter}`);
      if (!res.ok) throw new Error('Failed to load books catalog');
      const data = await res.json();
      
      // Perform client-side sorting
      const sorted = [...data].sort((a, b) => {
        let fieldA = (a[sortField] || '').toLowerCase();
        let fieldB = (b[sortField] || '').toLowerCase();
        if (sortField === 'id' || sortField === 'created_at') {
          fieldA = a[sortField];
          fieldB = b[sortField];
        }
        if (fieldA < fieldB) return sortOrder === 'asc' ? -1 : 1;
        if (fieldA > fieldB) return sortOrder === 'asc' ? 1 : -1;
        return 0;
      });

      setBooks(sorted);
      
      // Extract unique tags
      const tagsSet = new Set();
      data.forEach(book => {
        if (book.tags) {
          book.tags.split(',').forEach(tag => tagsSet.add(tag.trim()));
        }
      });
      setUniqueTags(Array.from(tagsSet));
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBooks();
    setSelectedIds([]);
  }, [searchQuery, selectedTag, statusFilter, sortField, sortOrder]);

  useEffect(() => {
    const handleAddTrigger = (e) => {
      if (e.detail.tab === 'library') {
        openAddForm();
      }
    };
    window.addEventListener('trigger-add-action', handleAddTrigger);
    return () => {
      window.removeEventListener('trigger-add-action', handleAddTrigger);
    };
  }, []);

  const fetchComments = async (bookId) => {
    setLoadingComments(true);
    try {
      const res = await fetch(`/api/books/${bookId}/comments`);
      if (res.ok) {
        const data = await res.json();
        setComments(data);
      }
    } catch (e) {
      console.error('Failed to fetch comments:', e);
    } finally {
      setLoadingComments(false);
    }
  };

  const handlePostComment = async (e) => {
    e.preventDefault();
    if (!newCommentText.trim()) return;
    try {
      const res = await fetch(`/api/books/${activeBook.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comment: newCommentText })
      });
      if (res.ok) {
        setNewCommentText('');
        fetchComments(activeBook.id);
        showToast('Comment posted successfully!');
      } else {
        const err = await res.json();
        showToast(err.error || 'Failed to post comment', 'error');
      }
    } catch (e) {
      showToast(e.message, 'error');
    }
  };

  const handleDeleteComment = async (commentId) => {
    if (!window.confirm('Delete comment?')) return;
    try {
      const res = await fetch(`/api/books/${activeBook.id}/comments/${commentId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        fetchComments(activeBook.id);
        showToast('Comment deleted.');
      } else {
        const err = await res.json();
        showToast(err.error || 'Failed to delete comment', 'error');
      }
    } catch (e) {
      showToast(e.message, 'error');
    }
  };

  const fetchUsersList = async () => {
    try {
      const res = await fetch('/api/users/list');
      if (res.ok) {
        const data = await res.json();
        setUsersList(data);
      }
    } catch (e) {
      console.error('Failed to fetch users list:', e);
    }
  };

  const handleRecommendBook = async (e) => {
    e.preventDefault();
    if (!recommendToUserId) {
      showToast('Please select a user to recommend to.', 'error');
      return;
    }
    setIsRecommendLoading(true);
    try {
      const res = await fetch(`/api/books/${activeBook.id}/recommend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to_user_id: Number(recommendToUserId),
          notes: recommendNotes.trim()
        })
      });
      if (res.ok) {
        setRecommendToUserId('');
        setRecommendNotes('');
        showToast('Book recommended successfully!');
      } else {
        const err = await res.json();
        showToast(err.error || 'Failed to recommend book', 'error');
      }
    } catch (e) {
      showToast(e.message, 'error');
    } finally {
      setIsRecommendLoading(false);
    }
  };

  useEffect(() => {
    if (isDetailOpen && activeBook) {
      fetchComments(activeBook.id);
      fetchUsersList();
    }
  }, [isDetailOpen, activeBook]);

  const handleToggleSort = (field) => {
    if (sortField === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const handleSelectBook = (id, e) => {
    e.stopPropagation();
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedIds.length === books.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(books.map(b => b.id));
    }
  };

  // ISBN Lookup operation
  const handleIsbnLookup = async (isbnVal) => {
    const queryIsbn = isbnVal || isbnLookupVal;
    if (!queryIsbn.trim()) return;
    setIsbnLoading(true);
    setFormIsbn(queryIsbn.trim());
    try {
      const res = await fetch('/api/books/isbn-lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isbn: queryIsbn.trim() })
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to find book details.');
      }
      const data = await res.json();
      
      // Populate form
      setFormIsbn(data.isbn || queryIsbn);
      setFormTitle(data.title || '');
      setFormAuthor(data.author || '');
      setFormPublisher(data.publisher || '');
      setFormPublishedDate(data.published_date || '');
      setFormDescription(data.description || '');
      setFormCoverUrl(data.cover_url || '');
      setFormStatus('library');
      setFormTotalPages(data.total_pages || 0);
      
      showToast('Book details loaded by ISBN!');
      setIsbnLookupVal('');
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setIsbnLoading(false);
    }
  };

  // Barcode Scanner Camera Lifecycle
  useEffect(() => {
    if (isScannerOpen) {
      // Small timeout to let the container render in DOM
      const timer = setTimeout(() => {
        if (!document.getElementById("barcode-scanner-video")) return;
        
        // Ensure ZXing is loaded globally
        if (!window.ZXing) {
          console.error("ZXing library is not loaded on window.");
          showToast("Scanner library not loaded. Please refresh the page.", "error");
          setIsScannerOpen(false);
          return;
        }

        const codeReader = new window.ZXing.BrowserMultiFormatReader();
        zxingReaderInstance.current = codeReader;

        codeReader.listVideoInputDevices().then((videoInputDevices) => {
          let selectedDeviceId = null;
          // Try to find the back camera
          const backCamera = videoInputDevices.find(device => 
            device.label.toLowerCase().includes('back') || 
            device.label.toLowerCase().includes('environment') || 
            device.label.toLowerCase().includes('rear')
          );
          
          if (backCamera) {
            selectedDeviceId = backCamera.deviceId;
          } else if (videoInputDevices.length > 0) {
            selectedDeviceId = videoInputDevices[0].deviceId;
          }

          codeReader.decodeFromVideoDevice(
            selectedDeviceId,
            'barcode-scanner-video',
            (result, err) => {
              if (result) {
                handleBarcodeScanned(result.text);
              }
            }
          );
        }).catch(err => {
          console.error("Failed to start scanner:", err);
          showToast("Could not start camera. Please verify camera permissions.", "error");
          setIsScannerOpen(false);
        });
      }, 300);

      return () => {
        clearTimeout(timer);
        if (zxingReaderInstance.current) {
          zxingReaderInstance.current.reset();
          zxingReaderInstance.current = null;
        }
      };
    }
  }, [isScannerOpen]);

  const handleBarcodeScanned = (barcode) => {
    if (zxingReaderInstance.current) {
      zxingReaderInstance.current.reset();
      zxingReaderInstance.current = null;
    }
    setIsScannerOpen(false);
    showToast(`Scanned barcode: ${barcode}`);
    
    // Fill the manual lookup value and trigger the lookup automatically!
    setIsbnLookupVal(barcode);
    handleIsbnLookup(barcode);
  };



  // Form Operations
  const openAddForm = () => {
    setEditingBook(null);
    setFormIsbn('');
    setFormTitle('');
    setFormAuthor('');
    setFormPublisher('');
    setFormPublishedDate('');
    setFormDescription('');
    setFormCoverUrl('');
    setFormTags('');
    setFormStatus('library');
    setFormCoverFile(null);
    setFormRating(0);
    setFormRedFlag(0);
    setFormTotalPages(0);
    setIsFormOpen(true);
  };

  const openEditForm = (book) => {
    setEditingBook(book);
    setFormIsbn(book.isbn || '');
    setFormTitle(book.title || '');
    setFormAuthor(book.author || '');
    setFormPublisher(book.publisher || '');
    setFormPublishedDate(book.published_date || '');
    setFormDescription(book.description || '');
    setFormCoverUrl(book.cover_url || '');
    setFormTags(book.tags || '');
    setFormStatus(book.status || 'library');
    setFormCoverFile(null);
    setFormRating(book.rating || 0);
    setFormRedFlag(book.red_flag || 0);
    setFormTotalPages(book.total_pages || 0);
    setIsFormOpen(true);
    setIsDetailOpen(false);
  };

  const handleTagToggle = (tag) => {
    const trimmedTag = tag.trim();
    if (!trimmedTag) return;
    
    const currentTagsList = formTags
      .split(',')
      .map(t => t.trim())
      .filter(t => t !== '');
    
    const existsIdx = currentTagsList.findIndex(t => t.toLowerCase() === trimmedTag.toLowerCase());
    
    let newTagsList;
    if (existsIdx >= 0) {
      newTagsList = currentTagsList.filter((_, idx) => idx !== existsIdx);
    } else {
      newTagsList = [...currentTagsList, trimmedTag];
    }
    
    setFormTags(newTagsList.join(', '));
  };

  const handleBulkTagToggle = (tag) => {
    const trimmedTag = tag.trim();
    if (!trimmedTag) return;
    
    const currentTagsList = bulkTagInput
      .split(',')
      .map(t => t.trim())
      .filter(t => t !== '');
    
    const existsIdx = currentTagsList.findIndex(t => t.toLowerCase() === trimmedTag.toLowerCase());
    
    let newTagsList;
    if (existsIdx >= 0) {
      newTagsList = currentTagsList.filter((_, idx) => idx !== existsIdx);
    } else {
      newTagsList = [...currentTagsList, trimmedTag];
    }
    
    setBulkTagInput(newTagsList.join(', '));
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!formTitle.trim()) return;

    const bookPayload = {
      isbn: formIsbn,
      title: formTitle,
      author: formAuthor,
      publisher: formPublisher,
      published_date: formPublishedDate,
      description: formDescription,
      cover_url: formCoverUrl,
      tags: formTags,
      status: formStatus,
      rating: formRating,
      red_flag: formRedFlag,
      total_pages: Number(formTotalPages) || 0
    };

    const formData = new FormData();
    formData.append('book', JSON.stringify(bookPayload));
    if (formCoverFile) {
      formData.append('cover', formCoverFile);
    }

    try {
      const url = editingBook ? `/api/books/${editingBook.id}` : '/api/books';
      const method = editingBook ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        body: formData
      });
      if (!res.ok) throw new Error('Failed to save book');
      showToast(editingBook ? 'Book updated successfully!' : 'Book added to Library!');
      setIsFormOpen(false);
      setEditingBook(null);
      fetchBooks();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // Add Book to Reading List
  const handleAddToReadingList = async (bookId, bookTitle) => {
    setPromptBookId(bookId);
    setPromptBookTitle(bookTitle || 'this book');
    setIsListPromptOpen(true);
    setPromptLoadingLists(true);
    try {
      const res = await fetch('/api/reading-lists');
      if (res.ok) {
        const data = await res.json();
        setUserReadingLists(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setPromptLoadingLists(false);
    }
  };

  const confirmAddToList = async (listId) => {
    try {
      const res = await fetch('/api/reading-list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ book_id: promptBookId, reading_list_id: listId })
      });
      if (!res.ok) throw new Error('Failed to add to reading list');
      showToast('Book added to reading list!');
      setIsListPromptOpen(false);
      setIsDetailOpen(false);
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const confirmAddToListDefault = async () => {
    try {
      const res = await fetch('/api/reading-list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ book_id: promptBookId })
      });
      if (!res.ok) throw new Error('Failed to add to reading list');
      showToast('Book added to default reading list!');
      setIsListPromptOpen(false);
      setIsDetailOpen(false);
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // Single Delete
  const handleDeleteBook = async (id) => {
    if (!window.confirm('Are you sure you want to delete this book from your library?')) return;
    try {
      const res = await fetch(`/api/books/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete book');
      showToast('Book deleted.');
      setIsDetailOpen(false);
      fetchBooks();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // Bulk Actions
  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!window.confirm(`Are you sure you want to delete the ${selectedIds.length} selected books?`)) return;
    try {
      const res = await fetch('/api/books/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedIds })
      });
      if (!res.ok) throw new Error('Bulk delete failed');
      showToast(`Deleted ${selectedIds.length} books.`);
      setSelectedIds([]);
      fetchBooks();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleBulkArchive = async (archiveVal) => {
    if (selectedIds.length === 0) return;
    try {
      const res = await fetch('/api/books/bulk-archive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedIds, archive: archiveVal })
      });
      if (!res.ok) throw new Error('Bulk action failed');
      showToast(`Updated status for ${selectedIds.length} books.`);
      setSelectedIds([]);
      fetchBooks();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleBulkTagSubmit = async (e) => {
    e.preventDefault();
    if (selectedIds.length === 0) return;
    try {
      const res = await fetch('/api/books/bulk-tag', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ids: selectedIds,
          tags: bulkTagInput,
          action: bulkTagAction
        })
      });
      if (!res.ok) throw new Error('Bulk tagging failed');
      showToast(`Updated tags for ${selectedIds.length} books.`);
      setIsBulkTagOpen(false);
      setBulkTagInput('');
      setSelectedIds([]);
      fetchBooks();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="content-header">
        <div>
          <h2>Library Catalogue</h2>
          <p className="subtitle" style={{ color: 'var(--text-muted)' }}>Browse and manage all physical and digital books in your collection.</p>
        </div>
        <div />
      </div>

      {/* Filters, Tag selector, and Sort Panel */}
      <div className="card" style={{ marginBottom: '2rem', padding: '1rem' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center', justifyContent: 'space-between' }}>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, minWidth: '260px' }}>
            <Search size={20} style={{ color: 'var(--text-muted)' }} />
            <input 
              type="text" 
              placeholder="Search by title, author, ISBN..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-control"
              style={{ border: 'none', background: 'transparent', width: '100%', outline: 'none' }}
            />
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center' }}>
            {/* Tag Filter */}
            <select 
              value={selectedTag} 
              onChange={(e) => setSelectedTag(e.target.value)} 
              className="input-control" 
              style={{ width: '150px', background: 'var(--bg-app)', color: 'var(--text-main)' }}
            >
              <option value="">All Tags</option>
              {uniqueTags.map(tag => (
                <option key={tag} value={tag}>{tag}</option>
              ))}
            </select>

            {/* Status Filter */}
            <select 
              value={statusFilter} 
              onChange={(e) => setStatusFilter(e.target.value)} 
              className="input-control" 
              style={{ width: '150px', background: 'var(--bg-app)', color: 'var(--text-main)' }}
            >
              <option value="library">Library Only</option>
              <option value="reference">Reference Only</option>
              <option value="checked_out">Checked Out Only</option>
              <option value="archived">Archived Only</option>
              <option value="all">All Books</option>
            </select>

            {/* Layout switchers */}
            <div style={{ display: 'flex', gap: '0.25rem' }}>
              <button 
                onClick={() => setViewMode('grid')} 
                className={`btn ${viewMode === 'grid' ? 'btn-primary' : 'btn-outline'}`}
                style={{ padding: '0.5rem' }}
                title="Grid Mode"
              >
                <Grid size={18} />
              </button>
              <button 
                onClick={() => setViewMode('list')} 
                className={`btn ${viewMode === 'list' ? 'btn-primary' : 'btn-outline'}`}
                style={{ padding: '0.5rem' }}
                title="Table Mode"
              >
                <List size={18} />
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* Main Books Grid or Table Listing */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
          <RefreshCw className="animate-spin" size={32} style={{ marginBottom: '1rem' }} />
          <div>Retrieving Library Books...</div>
        </div>
      ) : books.length === 0 ? (
        <div className="card" style={{ padding: '4rem 2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          📚 No books found matching these filters. Try adjusting your search query or tag selection.
        </div>
      ) : viewMode === 'grid' ? (
        <div className="recipe-grid animate-fade-in" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1.5rem' }}>
          {books.map(book => (
            <div 
              key={book.id} 
              className="card book-card animate-fade-in" 
              style={{ 
                cursor: 'pointer', 
                position: 'relative', 
                display: 'flex', 
                flexDirection: 'column', 
                height: '100%',
                padding: '0.75rem',
                gap: '0.75rem'
              }}
              onClick={() => { setActiveBook(book); setIsDetailOpen(true); }}
            >
              {/* Checkbox Overlay for bulk management */}
              {permissions === 'full' && (
                <div 
                  style={{ position: 'absolute', top: '10px', right: '10px', zIndex: 10, background: 'rgba(0,0,0,0.6)', borderRadius: '6px', padding: '4px', display: 'flex' }}
                  onClick={(e) => handleSelectBook(book.id, e)}
                >
                  {selectedIds.includes(book.id) ? (
                    <CheckSquare size={20} style={{ color: 'var(--primary)' }} />
                  ) : (
                    <Square size={20} style={{ color: '#fff' }} />
                  )}
                </div>
              )}

              {/* Red Flag Alert Badge */}
              {book.red_flag === 1 && (
                <div 
                  style={{ 
                    position: 'absolute', 
                    top: '10px', 
                    left: '10px', 
                    zIndex: 10, 
                    background: 'rgba(239, 68, 68, 0.95)', 
                    color: '#fff', 
                    borderRadius: '6px', 
                    padding: '2px 8px', 
                    fontSize: '0.7rem', 
                    fontWeight: 'bold', 
                    boxShadow: '0 2px 4px rgba(0,0,0,0.2)' 
                  }}
                  title="Trigger Warning: Sensitive Content"
                >
                  🚩 Red Flag
                </div>
              )}

              {/* Cover Image Container */}
              <div style={{ 
                width: '100%', 
                height: '260px', 
                background: 'var(--bg-app)', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                overflow: 'hidden', 
                borderRadius: '8px', 
                border: '1px solid var(--border-color)',
                position: 'relative'
              }}>
                {book.cover_url ? (
                  <img 
                    src={book.cover_url} 
                    alt={book.title} 
                    style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', display: 'block' }} 
                  />
                ) : (
                  <div style={{ fontSize: '3rem' }}>📚</div>
                )}

                {/* Status Overlay Badge if not standard library */}
                {book.status && book.status !== 'library' && (
                  <span 
                    style={{ 
                      position: 'absolute', 
                      bottom: '8px', 
                      left: '8px', 
                      fontSize: '0.65rem', 
                      padding: '2px 6px', 
                      background: 'var(--bg-card)', 
                      color: book.status === 'archived' ? 'var(--danger)' : 'var(--primary)', 
                      border: `1px solid ${book.status === 'archived' ? 'var(--danger)' : 'var(--primary)'}`, 
                      borderRadius: '4px', 
                      fontWeight: 'bold',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em'
                    }}
                  >
                    {book.status.replace('_', ' ')}
                  </span>
                )}
              </div>

              {/* Book Info */}
              <div style={{ display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'space-between' }}>
                <div>
                  <h4 style={{ margin: '0 0 0.15rem 0', fontSize: '1rem', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', minHeight: '2.5rem', lineHeight: '1.25' }} title={book.title}>
                    {book.title}
                  </h4>
                  <p style={{ margin: '0 0 0.25rem 0', fontSize: '0.85rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    by {book.author || 'Unknown'}
                  </p>
                  
                  {/* Star Rating Display */}
                  <div style={{ display: 'flex', gap: '2px', color: '#f39c12', marginBottom: '0.5rem' }}>
                    {Array.from({ length: 5 }).map((_, idx) => (
                      <span key={idx} style={{ fontSize: '0.9rem' }}>
                        {idx < (book.rating || 0) ? '★' : '☆'}
                      </span>
                    ))}
                  </div>
                </div>

                {book.tags && (
                  <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap', marginTop: '0.25rem' }}>
                    {book.tags.split(',').slice(0, 2).map((t, idx) => (
                      <span key={idx} style={{ fontSize: '0.65rem', padding: '1px 5px', background: 'var(--bg-app)', border: '1px solid var(--border-color)', borderRadius: '4px', color: 'var(--text-muted)' }}>
                        {t.trim()}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Table / List View */
        <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
          <table className="table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: 'var(--bg-app)', borderBottom: '1px solid var(--border-color)' }}>
                {permissions === 'full' && (
                  <th style={{ width: '45px', padding: '1rem' }}>
                    <div onClick={handleSelectAll} style={{ cursor: 'pointer' }}>
                      {selectedIds.length === books.length ? <CheckSquare size={20} style={{ color: 'var(--primary)' }} /> : <Square size={20} />}
                    </div>
                  </th>
                )}
                <th style={{ padding: '1rem' }}>Cover</th>
                <th style={{ padding: '1rem', cursor: 'pointer' }} onClick={() => handleToggleSort('title')}>
                  Title {sortField === 'title' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th style={{ padding: '1rem', cursor: 'pointer' }} onClick={() => handleToggleSort('author')}>
                  Author {sortField === 'author' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th style={{ padding: '1rem' }}>ISBN</th>
                <th style={{ padding: '1rem' }}>Tags</th>
                <th style={{ padding: '1rem' }}>Publisher</th>
                <th style={{ padding: '1rem' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {books.map(book => (
                <tr 
                  key={book.id} 
                  style={{ borderBottom: '1px solid var(--border-color)', cursor: 'pointer' }} 
                  onClick={() => { setActiveBook(book); setIsDetailOpen(true); }}
                >
                  {permissions === 'full' && (
                    <td style={{ padding: '1rem' }} onClick={(e) => e.stopPropagation()}>
                      <div onClick={(e) => handleSelectBook(book.id, e)} style={{ cursor: 'pointer' }}>
                        {selectedIds.includes(book.id) ? <CheckSquare size={20} style={{ color: 'var(--primary)' }} /> : <Square size={20} />}
                      </div>
                    </td>
                  )}
                  <td style={{ padding: '0.5rem 1rem' }}>
                    {book.cover_url ? (
                      <img src={book.cover_url} alt="" style={{ width: '35px', height: '50px', objectFit: 'cover', borderRadius: '2px' }} />
                    ) : (
                      <span style={{ fontSize: '1.25rem' }}>📚</span>
                    )}
                  </td>
                  <td style={{ padding: '1rem', fontWeight: 'bold' }}>{book.title}</td>
                  <td style={{ padding: '1rem' }}>{book.author || '-'}</td>
                  <td style={{ padding: '1rem', fontFamily: 'monospace' }}>{book.isbn || '-'}</td>
                  <td style={{ padding: '1rem' }}>
                    <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
                      {book.tags ? book.tags.split(',').map((t, idx) => (
                        <span key={idx} style={{ fontSize: '0.7rem', padding: '1px 5px', background: 'var(--bg-app)', border: '1px solid var(--border-color)', borderRadius: '4px' }}>{t.trim()}</span>
                      )) : '-'}
                    </div>
                  </td>
                  <td style={{ padding: '1rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>{book.publisher || '-'}</td>
                  <td style={{ padding: '1rem' }}>
                    <span className={`badge ${book.status === 'archived' ? 'badge-danger' : 'badge-success'}`} style={{ textTransform: 'capitalize' }}>
                      {book.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Bulk Management Action Toolbar overlay */}
      {selectedIds.length > 0 && (
        <div 
          className="card animate-slide-up" 
          style={{ 
            position: 'fixed', 
            bottom: '20px', 
            left: '50%', 
            transform: 'translateX(-50%)', 
            zIndex: 1000, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between', 
            gap: '2rem', 
            padding: '0.75rem 1.5rem', 
            background: 'var(--bg-card)', 
            boxShadow: '0 8px 30px rgba(0,0,0,0.3)', 
            border: '1px solid var(--primary)',
            width: '90%',
            maxWidth: '680px'
          }}
        >
          <span style={{ fontWeight: 'bold', fontSize: '0.95rem' }}>
            {selectedIds.length} books selected
          </span>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button 
              className="btn btn-outline" 
              style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', padding: '0.5rem 0.75rem', fontSize: '0.85rem' }} 
              onClick={() => setIsBulkTagOpen(true)}
            >
              <Tag size={16} /> Bulk Tag
            </button>
            <button 
              className="btn btn-outline" 
              style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', padding: '0.5rem 0.75rem', fontSize: '0.85rem' }} 
              onClick={() => handleBulkArchive(true)}
            >
              <Archive size={16} /> Archive
            </button>
            <button 
              className="btn btn-outline" 
              style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', padding: '0.5rem 0.75rem', fontSize: '0.85rem' }} 
              onClick={() => handleBulkArchive(false)}
            >
              Unarchive
            </button>
            <button 
              className="btn btn-danger" 
              style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', padding: '0.5rem 0.75rem', fontSize: '0.85rem' }} 
              onClick={handleBulkDelete}
            >
              <Trash2 size={16} /> Delete
            </button>
            <button 
              className="close-btn" 
              onClick={() => setSelectedIds([])}
              style={{ margin: 0, padding: '0.25rem', fontSize: '1.25rem' }}
            >
              ×
            </button>
          </div>
        </div>
      )}



      {/* Bulk Tag Dialogue */}
      {isBulkTagOpen && (
        <div className="modal-overlay" onClick={() => setIsBulkTagOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Bulk Manage Tags</h3>
              <button className="close-btn" onClick={() => setIsBulkTagOpen(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body" style={{ padding: '1.5rem' }}>
              <form onSubmit={handleBulkTagSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                
                <div className="form-group">
                  <label>Action</label>
                  <select 
                    value={bulkTagAction} 
                    onChange={(e) => setBulkTagAction(e.target.value)} 
                    className="input-control"
                    style={{ background: 'var(--bg-app)', color: 'var(--text-main)' }}
                  >
                    <option value="add">Add tags to books</option>
                    <option value="remove">Remove tags from books</option>
                    <option value="set">Set tags (overwrite existing)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="bulk-tag-val">Tags (comma-separated)</label>
                  <input 
                    id="bulk-tag-val"
                    type="text" 
                    placeholder="e.g. Fiction, Classics" 
                    value={bulkTagInput} 
                    onChange={(e) => setBulkTagInput(e.target.value)}
                    className="input-control"
                    required
                    autoFocus
                  />
                  {uniqueTags.length > 0 && (
                    <div style={{ marginTop: '0.5rem' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.35rem' }}>
                        Choose from existing tags:
                      </span>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', maxHeight: '90px', overflowY: 'auto', padding: '2px' }}>
                        {uniqueTags.map(tag => {
                          const isSelected = bulkTagInput
                            .split(',')
                            .map(t => t.trim().toLowerCase())
                            .includes(tag.toLowerCase());
                          return (
                            <button
                              key={tag}
                              type="button"
                              onClick={() => handleBulkTagToggle(tag)}
                              style={{
                                fontSize: '0.7rem',
                                padding: '2px 8px',
                                borderRadius: '9999px',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease',
                                background: isSelected ? 'var(--primary)' : 'var(--bg-app)',
                                color: isSelected ? 'var(--primary-foreground)' : 'var(--text-main)',
                                border: `1px solid ${isSelected ? 'var(--primary)' : 'var(--border-color)'}`,
                              }}
                            >
                              {tag}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                  <button type="button" className="btn btn-outline" style={{ flex: 1 }} onClick={() => setIsBulkTagOpen(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Save</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Book Add / Edit Form Modal */}
      {isFormOpen && (
        <div className="modal-overlay" onClick={() => setIsFormOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingBook ? 'Edit Book Details' : 'Add New Book'}</h3>
              <button className="close-btn" onClick={() => setIsFormOpen(false)}>
                <X size={20} />
              </button>
            </div>
            
            <div className="modal-body" style={{ padding: '1.5rem' }}>
              
              {/* ISBN Lookup Panel */}
              {!editingBook && (
                <div className="card" style={{ padding: '0.75rem', marginBottom: '1.5rem', background: 'var(--bg-app)' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>Look Up Book by ISBN</label>
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                    <input 
                      type="text" 
                      placeholder="e.g. 9780140328721" 
                      value={isbnLookupVal} 
                      onChange={(e) => setIsbnLookupVal(e.target.value)}
                      className="input-control"
                      style={{ flex: 1, minWidth: '150px' }}
                    />
                    <button 
                      type="button" 
                      className="btn btn-primary" 
                      onClick={() => handleIsbnLookup()} 
                      disabled={isbnLoading || !isbnLookupVal.trim()}
                      style={{ height: '38px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                      {isbnLoading ? 'Searching...' : 'Find'}
                    </button>
                    <button 
                      type="button" 
                      className="btn btn-outline" 
                      onClick={() => setIsScannerOpen(true)}
                      style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', height: '38px' }}
                    >
                      <Camera size={18} />
                      Scan
                    </button>
                  </div>
                </div>
              )}

              <form onSubmit={handleFormSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                  <div className="form-group">
                    <label htmlFor="book-title-input">Book Title *</label>
                    <input 
                      id="book-title-input"
                      type="text" 
                      value={formTitle} 
                      onChange={(e) => setFormTitle(e.target.value)} 
                      className="input-control" 
                      required 
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="book-author-input">Author</label>
                    <input 
                      id="book-author-input"
                      type="text" 
                      value={formAuthor} 
                      onChange={(e) => setFormAuthor(e.target.value)} 
                      className="input-control" 
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                  <div className="form-group">
                    <label htmlFor="book-isbn-input">ISBN</label>
                    <input 
                      id="book-isbn-input"
                      type="text" 
                      value={formIsbn} 
                      onChange={(e) => setFormIsbn(e.target.value)} 
                      className="input-control" 
                    />
                  </div>
                   <div className="form-group">
                    <label htmlFor="book-tags-input">Tags (comma-separated)</label>
                    <input 
                      id="book-tags-input"
                      type="text" 
                      placeholder="Fiction, Biography, Sci-Fi"
                      value={formTags} 
                      onChange={(e) => setFormTags(e.target.value)} 
                      className="input-control" 
                    />
                    {uniqueTags.length > 0 && (
                      <div style={{ marginTop: '0.5rem' }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.35rem' }}>
                          Choose from existing tags:
                        </span>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', maxHeight: '90px', overflowY: 'auto', padding: '2px' }}>
                          {uniqueTags.map(tag => {
                            const isSelected = formTags
                              .split(',')
                              .map(t => t.trim().toLowerCase())
                              .includes(tag.toLowerCase());
                            return (
                              <button
                                key={tag}
                                type="button"
                                onClick={() => handleTagToggle(tag)}
                                style={{
                                  fontSize: '0.7rem',
                                  padding: '2px 8px',
                                  borderRadius: '9999px',
                                  cursor: 'pointer',
                                  transition: 'all 0.15s ease',
                                  background: isSelected ? 'var(--primary)' : 'var(--bg-app)',
                                  color: isSelected ? 'var(--primary-foreground)' : 'var(--text-main)',
                                  border: `1px solid ${isSelected ? 'var(--primary)' : 'var(--border-color)'}`,
                                }}
                              >
                                {tag}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
                  <div className="form-group">
                    <label htmlFor="book-publisher-input">Publisher</label>
                    <input 
                      id="book-publisher-input"
                      type="text" 
                      value={formPublisher} 
                      onChange={(e) => setFormPublisher(e.target.value)} 
                      className="input-control" 
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="book-published-input">Published Date / Year</label>
                    <input 
                      id="book-published-input"
                      type="text" 
                      value={formPublishedDate} 
                      onChange={(e) => setFormPublishedDate(e.target.value)} 
                      className="input-control" 
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="book-pages-input">Total Pages</label>
                    <input 
                      id="book-pages-input"
                      type="number" 
                      min="0"
                      value={formTotalPages} 
                      onChange={(e) => setFormTotalPages(Number(e.target.value) || 0)} 
                      className="input-control" 
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="book-desc-input">Description / Summary</label>
                  <textarea 
                    id="book-desc-input"
                    value={formDescription} 
                    onChange={(e) => setFormDescription(e.target.value)} 
                    className="input-control" 
                    rows="3"
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                  <div className="form-group">
                    <label htmlFor="book-cover-file">Upload Cover Image</label>
                    <input 
                      id="book-cover-file"
                      type="file" 
                      accept="image/*" 
                      onChange={(e) => setFormCoverFile(e.target.files[0])}
                      className="input-control"
                      style={{ padding: '0.4rem' }}
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="book-cover-url">Cover Image URL</label>
                    <input 
                      id="book-cover-url"
                      type="text" 
                      value={formCoverUrl} 
                      onChange={(e) => setFormCoverUrl(e.target.value)} 
                      className="input-control" 
                      placeholder="Or paste direct image link"
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                  <div className="form-group">
                    <label>Book Rating (5 Stars)</label>
                    <div style={{ display: 'flex', gap: '6px', fontSize: '1.5rem', color: '#f39c12', marginTop: '0.25rem' }}>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <span 
                          key={star} 
                          onClick={() => setFormRating(star === formRating ? 0 : star)} 
                          style={{ cursor: 'pointer', userSelect: 'none' }}
                        >
                          {star <= formRating ? '★' : '☆'}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="form-group">
                    <label htmlFor="book-red-flag">Trigger Warning Flag</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginTop: '0.65rem' }}>
                      <input 
                        id="book-red-flag"
                        type="checkbox" 
                        checked={formRedFlag === 1}
                        onChange={(e) => setFormRedFlag(e.target.checked ? 1 : 0)}
                        className="custom-checkbox"
                      />
                      <span style={{ fontSize: '0.9rem', color: 'var(--text-main)' }}>Mark book with Red Flag 🚩</span>
                    </div>
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="book-status-input">Status</label>
                  <select 
                    id="book-status-input"
                    value={formStatus} 
                    onChange={(e) => setFormStatus(e.target.value)} 
                    className="input-control"
                    style={{ background: 'var(--bg-app)', color: 'var(--text-main)' }}
                  >
                    <option value="library">Library catalogue (active)</option>
                    <option value="reference">Reference</option>
                    <option value="checked_out">Checked Out</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>

                <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                  <button type="button" className="btn btn-outline" style={{ flex: 1 }} onClick={() => setIsFormOpen(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Save Book</button>
                </div>
              </form>

            </div>
          </div>
        </div>
      )}

      {/* Book Detail Modal */}
      {isDetailOpen && activeBook && (
        <div className="modal-overlay" onClick={() => setIsDetailOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Book Specifications</h3>
              <button className="close-btn" onClick={() => setIsDetailOpen(false)}>
                <X size={20} />
              </button>
            </div>
            
            <div className="modal-body" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                <div style={{ width: '130px', height: '190px', background: 'var(--bg-app)', border: '1px solid var(--border-color)', borderRadius: '6px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 10px rgba(0,0,0,0.1)' }}>
                  {activeBook.cover_url ? (
                    <img src={activeBook.cover_url} alt={activeBook.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <span style={{ fontSize: '2.5rem' }}>📚</span>
                  )}
                </div>
                
                <div style={{ flex: 1, minWidth: '220px' }}>
                  <h4 style={{ margin: '0 0 0.25rem 0', fontSize: '1.4rem', color: 'var(--primary)', lineHeight: '1.2' }}>{activeBook.title}</h4>
                  <p style={{ margin: '0 0 0.5rem 0', fontSize: '1.1rem', fontWeight: 'bold' }}>by {activeBook.author || 'Unknown'}</p>
                  
                  {/* Star Rating display */}
                  <div style={{ display: 'flex', gap: '4px', fontSize: '1.25rem', color: '#f39c12', marginBottom: '0.75rem', alignItems: 'center' }}>
                    {Array.from({ length: 5 }).map((_, starIdx) => (
                      <span key={starIdx}>
                        {starIdx < (activeBook.rating || 0) ? '★' : '☆'}
                      </span>
                    ))}
                    {activeBook.rating ? <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginLeft: '0.5rem' }}>({activeBook.rating}/5 stars)</span> : null}
                  </div>

                  {/* Red Flag alert warning */}
                  {activeBook.red_flag === 1 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(239, 68, 68, 0.12)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.25)', padding: '0.5rem 0.75rem', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '0.75rem' }}>
                      <span>🚩 Warning: Triggering or sensitive content.</span>
                    </div>
                  )}
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.85rem' }}>
                    {activeBook.isbn && <div><strong>ISBN:</strong> <span style={{ fontFamily: 'monospace' }}>{activeBook.isbn}</span></div>}
                    {activeBook.publisher && <div><strong>Publisher:</strong> {activeBook.publisher}</div>}
                    {activeBook.published_date && <div><strong>Published:</strong> {activeBook.published_date}</div>}
                    {activeBook.total_pages > 0 && <div><strong>Total Pages:</strong> {activeBook.total_pages} pages</div>}
                    <div><strong>Added to catalog:</strong> {new Date(activeBook.created_at).toLocaleDateString()}</div>
                    <div>
                      <strong>Status: </strong>
                      <span className={`badge ${activeBook.status === 'archived' ? 'badge-danger' : activeBook.status === 'library' ? 'badge-success' : 'badge-primary'}`} style={{ textTransform: 'capitalize' }}>
                        {activeBook.status.replace('_', ' ')}
                      </span>
                    </div>
                  </div>

                  {activeBook.tags && (
                    <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', marginTop: '0.75rem' }}>
                      {activeBook.tags.split(',').map((t, idx) => (
                        <span key={idx} style={{ fontSize: '0.75rem', padding: '2px 8px', background: 'var(--bg-app)', border: '1px solid var(--border-color)', borderRadius: '4px' }}>
                          {t.trim()}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {activeBook.description && (
                <div style={{ background: 'var(--bg-app)', padding: '1rem', borderRadius: '6px' }}>
                  <strong style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Description:</strong>
                  <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: '1.5', maxHeight: '150px', overflowY: 'auto' }}>
                    {activeBook.description}
                  </p>
                </div>
              )}

              {/* Recommendations Section */}
              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
                <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  🤝 Recommend Book
                </h4>
                <form onSubmit={handleRecommendBook} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <select
                      value={recommendToUserId}
                      onChange={(e) => setRecommendToUserId(e.target.value)}
                      className="input-control"
                      style={{ flex: 1, minWidth: '180px', background: 'var(--bg-app)', color: 'var(--text-main)' }}
                    >
                      <option value="">-- Select Member --</option>
                      {usersList
                        .filter(u => u.id !== currentUser?.id)
                        .map(u => (
                          <option key={u.id} value={u.id}>
                            {u.display_name || u.username} ({u.username})
                          </option>
                        ))}
                    </select>
                    <button
                      type="submit"
                      disabled={isRecommendLoading || !recommendToUserId}
                      className="btn btn-primary"
                      style={{ fontSize: '0.85rem', padding: '0.5rem 1rem' }}
                    >
                      {isRecommendLoading ? 'Sending...' : 'Recommend'}
                    </button>
                  </div>
                  <input
                    type="text"
                    placeholder="Add an optional recommendation note (e.g. 'You will love this plot!')"
                    value={recommendNotes}
                    onChange={(e) => setRecommendNotes(e.target.value)}
                    className="input-control"
                    style={{ fontSize: '0.85rem' }}
                  />
                </form>
              </div>

              {/* Comments Section */}
              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <h4 style={{ margin: 0, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  💬 Book Comments ({comments.length})
                </h4>
                
                {/* Comments List */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '180px', overflowY: 'auto', paddingRight: '4px' }}>
                  {loadingComments ? (
                    <div style={{ textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Loading comments...</div>
                  ) : comments.length === 0 ? (
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic', padding: '0.5rem 0' }}>
                      No comments yet. Be the first to post!
                    </div>
                  ) : (
                    comments.map(c => (
                      <div key={c.id} style={{ background: 'var(--bg-app)', border: '1px solid var(--border-color)', padding: '0.65rem 0.85rem', borderRadius: '6px', position: 'relative' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                          <span style={{ fontWeight: 'bold', fontSize: '0.85rem', color: 'var(--primary)' }}>
                            {c.display_name || c.username}
                          </span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            {new Date(c.created_at).toLocaleString()}
                          </span>
                        </div>
                        <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-main)', lineHeight: '1.4', whiteSpace: 'pre-wrap' }}>
                          {c.comment}
                        </p>
                        {(c.user_id === currentUser?.id || currentUser?.role_name === 'Administrator') && (
                          <button
                            onClick={() => handleDeleteComment(c.id)}
                            style={{
                              position: 'absolute',
                              right: '8px',
                              bottom: '8px',
                              background: 'none',
                              border: 'none',
                              color: 'var(--danger)',
                              cursor: 'pointer',
                              padding: '2px',
                              display: 'flex',
                              alignItems: 'center',
                              opacity: 0.6
                            }}
                            title="Delete comment"
                            onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                            onMouseLeave={(e) => e.currentTarget.style.opacity = '0.6'}
                          >
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>
                    ))
                  )}
                </div>

                {/* Comment Form */}
                <form onSubmit={handlePostComment} style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
                  <input
                    type="text"
                    placeholder="Write a comment..."
                    value={newCommentText}
                    onChange={(e) => setNewCommentText(e.target.value)}
                    className="input-control"
                    style={{ flex: 1, fontSize: '0.85rem' }}
                    required
                  />
                  <button
                    type="submit"
                    className="btn btn-outline"
                    style={{ fontSize: '0.85rem', padding: '0.5rem 1rem' }}
                  >
                    Post
                  </button>
                </form>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem', flexWrap: 'wrap' }}>
                <button 
                  className="btn btn-outline" 
                  style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.85rem' }}
                  onClick={() => handleAddToReadingList(activeBook.id, activeBook.title)}
                >
                  <Bookmark size={16} /> Add to Reading List
                </button>

                {permissions === 'full' && (
                  <>
                    <button 
                      className="btn btn-outline" 
                      style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', marginLeft: 'auto', fontSize: '0.85rem' }}
                      onClick={() => openEditForm(activeBook)}
                    >
                      <Edit2 size={16} /> Edit
                    </button>
                    <button 
                      className="btn btn-danger" 
                      style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.85rem' }}
                      onClick={() => handleDeleteBook(activeBook.id)}
                    >
                      <Trash2 size={16} /> Delete
                    </button>
                  </>
                )}
              </div>

            </div>
          </div>
        </div>
      )}

      {/* Barcode Scanner Modal overlay */}
      {isScannerOpen && (
        <div className="modal-overlay" onClick={() => setIsScannerOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Scan Barcode</h3>
              <button className="close-btn" onClick={() => setIsScannerOpen(false)}>×</button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', padding: '1.5rem' }}>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                Center the barcode in the scanner box below to scan.
              </p>
              <div 
                style={{ 
                  width: '100%', 
                  maxWidth: '350px', 
                  height: '250px', 
                  borderRadius: 'var(--radius-md)', 
                  overflow: 'hidden', 
                  border: '2px solid var(--primary)',
                  background: '#000',
                  position: 'relative'
                }} 
              >
                <video 
                  id="barcode-scanner-video" 
                  style={{ 
                    width: '100%', 
                    height: '100%', 
                    objectFit: 'cover' 
                  }} 
                  muted
                  playsInline
                  autoPlay
                />
              </div>
              <button 
                type="button" 
                className="btn btn-secondary" 
                onClick={() => setIsScannerOpen(false)}
                style={{ width: '100%' }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Select Reading List Modal */}
      {isListPromptOpen && (
        <div className="modal-overlay" onClick={() => setIsListPromptOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Select Reading List</h3>
              <button className="close-btn" onClick={() => setIsListPromptOpen(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body" style={{ padding: '1.5rem' }}>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
                Choose which reading list you would like to add <strong>{promptBookTitle}</strong> to:
              </p>
              {promptLoadingLists ? (
                <div style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-muted)' }}>Loading lists...</div>
              ) : userReadingLists.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-muted)' }}>
                  No reading lists found. We will create a default one for you.
                  <button className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }} onClick={confirmAddToListDefault}>
                    Create & Add
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {userReadingLists.map(list => (
                    <button 
                      key={list.id} 
                      className="btn btn-outline" 
                      style={{ 
                        width: '100%', 
                        justifyContent: 'flex-start', 
                        textAlign: 'left',
                        padding: '0.75rem 1rem',
                        height: 'auto',
                        display: 'block',
                        whiteSpace: 'normal'
                      }}
                      onClick={() => confirmAddToList(list.id)}
                    >
                      <div style={{ fontWeight: '600', fontSize: '0.95rem' }}>{list.name}</div>
                      {list.description && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>{list.description}</div>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
