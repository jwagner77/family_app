import React, { useState, useEffect } from 'react';
import { BookOpen, Sparkles, AlertCircle, ArrowLeft } from 'lucide-react';

export default function SharedReadingListView({ shareToken, onClose }) {
  const [listDetails, setListDetails] = useState(null);
  const [items, setItems] = useState([]);
  const [ownerName, setOwnerName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchSharedList = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/reading-lists/share/${shareToken}`);
        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || 'Failed to load shared reading list');
        }
        const data = await res.json();
        setListDetails(data.list);
        setItems(data.items);
        setOwnerName(data.owner_name || 'Unknown User');
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchSharedList();
  }, [shareToken]);

  return (
    <div className="login-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minHeight: '100vh', padding: '2rem 1.5rem', background: 'var(--bg-app)', overflowY: 'auto' }}>
      
      {/* Back button to Login */}
      <div style={{ alignSelf: 'flex-start', maxWidth: '1000px', width: '100%', marginBottom: '1.5rem' }}>
        <button 
          onClick={onClose}
          className="btn btn-outline"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', fontSize: '0.9rem' }}
        >
          <ArrowLeft size={16} /> Back to Sign In
        </button>
      </div>

      <div style={{ maxWidth: '1000px', width: '100%', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        
        {loading ? (
          <div className="card" style={{ textAlign: 'center', padding: '4rem 2rem', color: 'var(--text-muted)' }}>
            <div className="spinner" style={{ margin: '0 auto 1.5rem auto' }} />
            Loading Shared Reading List...
          </div>
        ) : error ? (
          <div className="card" style={{ padding: '3rem 2rem', textAlign: 'center', color: 'var(--danger)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
            <AlertCircle size={40} />
            <div>
              <h3>Error Loading List</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.25rem' }}>{error}</p>
            </div>
          </div>
        ) : (
          <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            
            {/* Header Details Card */}
            <div className="card" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--primary)', fontSize: '0.85rem', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                <Sparkles size={16} /> Shared Reading List
              </div>
              <h1 style={{ margin: 0, fontSize: '2.25rem', fontWeight: '800', letterSpacing: '-0.5px' }}>
                {listDetails.name}
              </h1>
              <p style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text-muted)' }}>
                Curated by <strong style={{ color: 'var(--text-main)' }}>{ownerName}</strong> • {items.length} {items.length === 1 ? 'book' : 'books'}
              </p>
              {listDetails.description && (
                <p style={{ margin: '0.75rem 0 0 0', padding: '0.75rem', background: 'var(--bg-app)', borderLeft: '3px solid var(--primary)', borderRadius: '0 8px 8px 0', fontStyle: 'italic', fontSize: '0.95rem', color: 'var(--text-main)' }}>
                  {listDetails.description}
                </p>
              )}
            </div>

            {/* Books Grid */}
            {items.length === 0 ? (
              <div className="card" style={{ padding: '4rem 2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                📚 This reading list doesn't have any books suggest in it yet.
              </div>
            ) : (
              <div className="recipe-grid animate-fade-in" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1.5rem' }}>
                {items.map(item => {
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
                        gap: '0.75rem'
                      }}
                    >
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
                        {cover ? (
                          <img 
                            src={cover} 
                            alt={title} 
                            style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', display: 'block' }} 
                          />
                        ) : (
                          <div style={{ fontSize: '3rem' }}>📚</div>
                        )}
                      </div>

                      {/* Info Panel */}
                      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'space-between' }}>
                        <div>
                          <h4 style={{ margin: '0 0 0.15rem 0', fontSize: '1rem', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', minHeight: '2.5rem', lineHeight: '1.25' }} title={title}>
                            {title}
                          </h4>
                          <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.85rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            by {author || 'Unknown'}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

          </div>
        )}

      </div>
    </div>
  );
}
