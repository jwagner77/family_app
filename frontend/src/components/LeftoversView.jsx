import React, { useState, useEffect } from 'react';
import { ShoppingCart, Trash2, Plus, Calendar, Clock, RotateCw } from 'lucide-react';

export default function LeftoversView({ showToast, user }) {
  const [leftovers, setLeftovers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Manual Leftover Form states
  const [name, setName] = useState('');
  const [servings, setServings] = useState('1');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const canManage = user?.permissions?.planner === 'full';

  const loadLeftovers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/leftovers');
      if (res.ok) {
        setLeftovers(await res.json());
      } else {
        throw new Error('Failed to load leftovers');
      }
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLeftovers();

    const handleAddTrigger = (e) => {
      if (e.detail.tab === 'leftovers') {
        setIsAddModalOpen(true);
      }
    };
    window.addEventListener('trigger-add-action', handleAddTrigger);
    return () => {
      window.removeEventListener('trigger-add-action', handleAddTrigger);
    };
  }, []);

  const handleAddLeftover = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      const res = await fetch('/api/leftovers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          servings: parseInt(servings, 10) || 1
        })
      });

      if (!res.ok) throw new Error('Failed to record leftover');
      
      showToast(`Leftover "${name.trim()}" recorded.`);
      setName('');
      setServings('1');
      setIsAddModalOpen(false);
      loadLeftovers();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleConsumeLeftover = async (id, name) => {
    if (!window.confirm(`Mark "${name}" as consumed/discarded?`)) return;

    try {
      const res = await fetch(`/api/leftovers/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete leftover record');

      showToast(`Leftover "${name}" removed.`);
      loadLeftovers();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="animate-fade-in">
      <div className="content-header">
        <div>
          <h2>Leftovers Tracker</h2>
          <p style={{ color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            Keep track of food in your fridge to reduce waste and plan easy meals.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn btn-outline" onClick={loadLeftovers} disabled={loading}>
            <RotateCw size={18} /> Refresh
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem 2rem' }}>
          <RotateCw size={36} className="spinner" style={{ margin: '0 auto 1rem auto' }} />
          <p>Loading leftovers list...</p>
        </div>
      ) : leftovers.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '4rem 2rem', border: '1px solid var(--border-color)' }}>
          <ShoppingCart size={48} style={{ color: 'var(--primary)', marginBottom: '1rem', opacity: 0.6 }} />
          <h3>No Leftovers Tracked</h3>
          <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>
            Your fridge is currently empty of tracked leftovers. Add them manually or mark meals as leftovers from the Weekly Planner!
          </p>
        </div>
      ) : (
        <div className="grid-3">
          {leftovers.map(item => (
            <div 
              key={item.id} 
              className="card animate-slide-up"
              style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                justifyContent: 'space-between',
                border: '1px solid var(--border-color)',
                height: '100%'
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.75rem' }}>
                  <h4 style={{ fontSize: '1.2rem', fontWeight: '700' }}>{item.name}</h4>
                  <span style={{ fontSize: '0.75rem', background: 'var(--primary-light)', color: 'var(--primary)', padding: '0.2rem 0.5rem', borderRadius: '4px', fontWeight: 'bold' }}>
                    {item.servings} Servings
                  </span>
                </div>
                
                {item.recipe_title && (
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                    Source Recipe: <strong>{item.recipe_title}</strong>
                  </p>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Calendar size={14} /> Added: {formatDate(item.date_added)}
                  </span>
                </div>
              </div>

              {canManage && (
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-color)' }}>
                  <button 
                    className="btn btn-secondary" 
                    style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem', color: 'var(--danger)' }} 
                    onClick={() => handleConsumeLeftover(item.id, item.name)}
                  >
                    <Trash2 size={14} /> Consumed / Discarded
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {isAddModalOpen && (
        <div className="modal-overlay" onClick={() => setIsAddModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Record Leftover</h2>
              <button className="close-btn" onClick={() => setIsAddModalOpen(false)}>×</button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleAddLeftover} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div className="form-group">
                  <label htmlFor="leftover-name">Leftover Name *</label>
                  <input 
                    id="leftover-name"
                    type="text" 
                    className="input-control" 
                    placeholder="e.g. Lasagna" 
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required 
                    autoFocus
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="leftover-servings">Estimated Servings</label>
                  <input 
                    id="leftover-servings"
                    type="number" 
                    min="1"
                    className="input-control" 
                    value={servings}
                    onChange={(e) => setServings(e.target.value)}
                    required 
                  />
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', borderTop: '1px solid var(--border)', paddingTop: '0.75rem', marginTop: '0.5rem' }}>
                  <button type="button" className="btn btn-outline" onClick={() => setIsAddModalOpen(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary">Record Leftover</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
