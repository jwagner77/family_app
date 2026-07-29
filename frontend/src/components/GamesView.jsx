import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Trash2, 
  Edit2, 
  Star, 
  Gamepad2, 
  Users, 
  Calendar, 
  Award, 
  Dice5,
  Sparkles,
  Search,
  Filter,
  Check,
  Info
} from 'lucide-react';

export default function GamesView({ showToast }) {
  const [games, setGames] = useState([]);
  const [history, setHistory] = useState([]);
  const [loadingGames, setLoadingGames] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Search/Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');

  // Modal: Add New Game
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newGameTitle, setNewGameTitle] = useState('');
  const [newGameType, setNewGameType] = useState('Board');
  const [newMinPlayers, setNewMinPlayers] = useState(2);
  const [newMaxPlayers, setNewMaxPlayers] = useState(4);
  const [newRecommendedAges, setNewRecommendedAges] = useState('');
  const [newRating, setNewRating] = useState(5);

  // Modal: Pick Game (Random Selector)
  const [isPickModalOpen, setIsPickModalOpen] = useState(false);
  const [playerCount, setPlayerCount] = useState(2);
  const [pickedGame, setPickedGame] = useState(null);

  // Modal: Edit Play History Log
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedPlay, setSelectedPlay] = useState(null);
  const [editWinner, setEditWinner] = useState('');
  const [editPlayersCount, setEditPlayersCount] = useState('');
  const [editDate, setEditDate] = useState('');

  // Fetch Games & History on Mount
  useEffect(() => {
    fetchGames();
    fetchHistory();
  }, []);

  const fetchGames = async () => {
    setLoadingGames(true);
    try {
      const res = await fetch('/api/games');
      if (res.ok) {
        const data = await res.json();
        setGames(data);
      } else {
        showToast('Failed to load games library', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Connection error loading games', 'error');
    } finally {
      setLoadingGames(false);
    }
  };

  const fetchHistory = async () => {
    setLoadingHistory(true);
    try {
      const res = await fetch('/api/games/history');
      if (res.ok) {
        const data = await res.json();
        setHistory(data);
      } else {
        showToast('Failed to load played history', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Connection error loading history', 'error');
    } finally {
      setLoadingHistory(false);
    }
  };

  // Add Game Handler
  const handleAddGame = async (e) => {
    e.preventDefault();
    if (!newGameTitle.trim()) return;

    try {
      const res = await fetch('/api/games', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newGameTitle.trim(),
          game_type: newGameType,
          min_players: newMinPlayers,
          max_players: newMaxPlayers,
          recommended_ages: newRecommendedAges.trim(),
          rating: newRating
        })
      });

      if (res.ok) {
        showToast('Game added to library!', 'success');
        setIsAddModalOpen(false);
        // Reset states
        setNewGameTitle('');
        setNewGameType('Board');
        setNewMinPlayers(2);
        setNewMaxPlayers(4);
        setNewRecommendedAges('');
        setNewRating(5);
        fetchGames();
      } else {
        const errData = await res.json();
        showToast(errData.error || 'Failed to add game', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Network error adding game', 'error');
    }
  };

  // Delete Game Handler
  const handleDeleteGame = async (id) => {
    if (!window.confirm('Are you sure you want to remove this game? This will also delete its play logs.')) return;

    try {
      const res = await fetch(`/api/games/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        showToast('Game removed from library', 'success');
        fetchGames();
        fetchHistory(); // History updates due to CASCADE
      } else {
        showToast('Failed to delete game', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Network error deleting game', 'error');
    }
  };

  // Random Picker Handler
  const handlePickGame = (e) => {
    e.preventDefault();
    const count = parseInt(playerCount, 10);
    if (isNaN(count) || count <= 0) return;

    // Filter games matching player count bounds
    const eligible = games.filter(g => g.min_players <= count && g.max_players >= count);

    if (eligible.length === 0) {
      setPickedGame('none');
      return;
    }

    const randomGame = eligible[Math.floor(Math.random() * eligible.length)];
    setPickedGame(randomGame);

    // Auto log to play history
    logPlayHistory(randomGame.id, count);
  };

  const logPlayHistory = async (gameId, count) => {
    try {
      const res = await fetch('/api/games/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          game_id: gameId,
          players_count: count,
          winner: 'Pending'
        })
      });
      if (res.ok) {
        fetchHistory();
      }
    } catch (err) {
      console.error('Failed to auto-log play history:', err);
    }
  };

  // Open Edit Play Modal
  const openEditPlayModal = (play) => {
    setSelectedPlay(play);
    setEditWinner(play.winner || '');
    setEditPlayersCount(play.players_count || '');
    // Format datetime-local input value
    const dateStr = play.played_at.includes('T') ? play.played_at.substring(0, 16) : play.played_at;
    setEditDate(dateStr);
    setIsEditModalOpen(true);
  };

  // Save Play History Log Handler
  const handleSavePlayLog = async (e) => {
    e.preventDefault();
    if (!selectedPlay) return;

    try {
      const res = await fetch(`/api/games/history/${selectedPlay.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          winner: editWinner.trim(),
          players_count: editPlayersCount ? parseInt(editPlayersCount, 10) : null,
          played_at: editDate || new Date().toISOString()
        })
      });

      if (res.ok) {
        showToast('Play history log updated!', 'success');
        setIsEditModalOpen(false);
        fetchHistory();
      } else {
        showToast('Failed to update play log', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Network error saving play log', 'error');
    }
  };

  // Delete Play Log Handler
  const handleDeletePlayLog = async (id) => {
    if (!window.confirm('Are you sure you want to delete this play log?')) return;

    try {
      const res = await fetch(`/api/games/history/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        showToast('Play log deleted', 'success');
        fetchHistory();
      } else {
        showToast('Failed to delete play log', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Network error deleting play log', 'error');
    }
  };

  // Star Rating Picker Component
  const StarRatingInput = ({ value, onChange }) => {
    const [hoverValue, setHoverValue] = useState(0);
    return (
      <div style={{ display: 'flex', gap: '0.25rem' }}>
        {[1, 2, 3, 4, 5].map((star) => {
          const isFilled = star <= (hoverValue || value);
          return (
            <button
              type="button"
              key={star}
              onClick={() => onChange(star)}
              onMouseEnter={() => setHoverValue(star)}
              onMouseLeave={() => setHoverValue(0)}
              style={{
                background: 'none',
                border: 'none',
                padding: 0,
                cursor: 'pointer',
                color: isFilled ? 'var(--primary)' : 'var(--muted-foreground)',
                transition: 'color 0.15s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Star size={22} fill={isFilled ? 'currentColor' : 'none'} strokeWidth={1.5} />
            </button>
          );
        })}
      </div>
    );
  };

  // Star Static Renderer
  const RenderStars = ({ count }) => {
    return (
      <div style={{ display: 'flex', gap: '0.125rem' }}>
        {[1, 2, 3, 4, 5].map((star) => (
          <Star 
            key={star} 
            size={14} 
            fill={star <= count ? 'currentColor' : 'none'} 
            color={star <= count ? 'var(--primary)' : 'var(--muted-foreground)'} 
            strokeWidth={1.5}
          />
        ))}
      </div>
    );
  };

  // Filtered games logic
  const filteredGames = games.filter(game => {
    const matchesSearch = game.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === 'all' || game.game_type.toLowerCase() === filterType.toLowerCase();
    return matchesSearch && matchesType;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%' }}>
      
      {/* HEADER SECTION */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', width: '100%', borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: '800', margin: 0 }}>
            Family Game Time
          </h2>
          <p style={{ margin: '0.25rem 0 0 0', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            Catalog your games, roll a random pick, and track game night winners.
          </p>
        </div>
        
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button 
            type="button" 
            className="btn btn-outline" 
            onClick={() => { setPickedGame(null); setIsPickModalOpen(true); }}
            style={{ gap: '0.5rem' }}
          >
            <Dice5 size={16} /> Pick a Game
          </button>
          <button 
            type="button" 
            className="btn btn-primary" 
            onClick={() => setIsAddModalOpen(true)}
            style={{ gap: '0.5rem' }}
          >
            <Plus size={16} /> Add New Game
          </button>
        </div>
      </div>

      {/* MAIN TWO-COLUMN DASHBOARD */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.5rem', alignItems: 'start' }}>
        
        {/* COLUMN 1: GAMES LIBRARY */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', height: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '700', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              Games Library
            </h2>
            <span className="badge badge-secondary" style={{ fontSize: '0.75rem' }}>
              {filteredGames.length} {filteredGames.length === 1 ? 'Game' : 'Games'}
            </span>
          </div>

          {/* Search and filter controls */}
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <div style={{ flex: 1, position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted-foreground)' }} />
              <input 
                type="text" 
                placeholder="Search games..." 
                className="input-control"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{ paddingLeft: '2.25rem' }}
              />
            </div>
            <select
              className="input-control"
              value={filterType}
              onChange={e => setFilterType(e.target.value)}
              style={{ width: '120px' }}
            >
              <option value="all">All Types</option>
              <option value="board">Board Game</option>
              <option value="card">Card Game</option>
            </select>
          </div>

          {/* Games List Container */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '550px', overflowY: 'auto', paddingRight: '2px' }}>
            {loadingGames ? (
              <p style={{ textAlign: 'center', color: 'var(--muted-foreground)', fontSize: '0.875rem' }}>Loading games library...</p>
            ) : filteredGames.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem 1rem', border: '1px dashed var(--border)', borderRadius: 'var(--radius)' }}>
                <p style={{ margin: 0, color: 'var(--muted-foreground)', fontSize: '0.875rem' }}>
                  {searchQuery || filterType !== 'all' ? 'No matching games found' : 'Your games library is empty.'}
                </p>
              </div>
            ) : (
              filteredGames.map(game => (
                <div 
                  key={game.id} 
                  style={{ 
                    border: '1px solid var(--border)', 
                    borderRadius: 'var(--radius)', 
                    padding: '0.875rem',
                    background: 'var(--card)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '1rem',
                    boxShadow: 'var(--shadow-sm)'
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontWeight: '600', fontSize: '0.925rem', color: 'var(--foreground)' }}>{game.title}</span>
                      <span className={`badge ${game.game_type === 'Card' ? 'badge-info' : 'badge-primary'}`} style={{ fontSize: '0.65rem', padding: '0.1rem 0.35rem' }}>
                        {game.game_type}
                      </span>
                    </div>
                    
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <Users size={12} /> {game.min_players === game.max_players ? `${game.min_players} Players` : `${game.min_players}-${game.max_players} Players`}
                      </span>
                      {game.recommended_ages && (
                        <span>• Age: {game.recommended_ages}</span>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <RenderStars count={game.rating} />
                    <button 
                      type="button" 
                      className="btn-icon text-destructive"
                      onClick={() => handleDeleteGame(game.id)}
                      style={{ padding: '0.25rem' }}
                      title="Remove Game"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* COLUMN 2: GAMES PLAYED HISTORY */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', height: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '700', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              Played History Dashboard
            </h2>
            <span className="badge badge-secondary" style={{ fontSize: '0.75rem' }}>
              {history.length} {history.length === 1 ? 'Play Log' : 'Play Logs'}
            </span>
          </div>

          {/* History List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '620px', overflowY: 'auto', paddingRight: '2px' }}>
            {loadingHistory ? (
              <p style={{ textAlign: 'center', color: 'var(--muted-foreground)', fontSize: '0.875rem' }}>Loading play logs...</p>
            ) : history.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem 1rem', border: '1px dashed var(--border)', borderRadius: 'var(--radius)' }}>
                <p style={{ margin: 0, color: 'var(--muted-foreground)', fontSize: '0.875rem' }}>
                  No games logged yet. Pick a game or log history to populate.
                </p>
              </div>
            ) : (
              history.map(log => {
                const dateVal = new Date(log.played_at);
                const dateStr = dateVal.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                const timeStr = dateVal.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
                
                return (
                  <div 
                    key={log.id} 
                    style={{ 
                      border: '1px solid var(--border)', 
                      borderRadius: 'var(--radius)', 
                      padding: '0.875rem',
                      background: 'var(--card)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: '1rem',
                      boxShadow: 'var(--shadow-sm)'
                    }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                      <span style={{ fontWeight: '700', fontSize: '0.9rem', color: 'var(--foreground)' }}>
                        {log.game_title}
                      </span>
                      
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <Calendar size={12} /> {dateStr} at {timeStr}
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <Users size={12} /> {log.players_count} players
                        </span>
                      </div>
                      
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.125rem' }}>
                        <Award size={12} style={{ color: log.winner === 'Pending' ? 'var(--muted-foreground)' : 'var(--primary)' }} />
                        <span style={{ 
                          fontSize: '0.75rem', 
                          fontWeight: '600', 
                          color: log.winner === 'Pending' ? 'var(--muted-foreground)' : 'var(--primary)' 
                        }}>
                          Winner: {log.winner}
                        </span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <button 
                        type="button" 
                        className="btn-icon"
                        onClick={() => openEditPlayModal(log)}
                        style={{ padding: '0.25rem' }}
                        title="Edit Winner / Play Log"
                      >
                        <Edit2 size={13} />
                      </button>
                      <button 
                        type="button" 
                        className="btn-icon text-destructive"
                        onClick={() => handleDeletePlayLog(log.id)}
                        style={{ padding: '0.25rem' }}
                        title="Remove Log"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>

      {/* MODAL 1: ADD NEW GAME */}
      {isAddModalOpen && (
        <div className="modal-overlay" onClick={() => setIsAddModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px' }}>
            <div className="modal-header">
              <h2 style={{ fontSize: '1.25rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Plus size={20} /> Add New Game
              </h2>
              <button className="close-btn" onClick={() => setIsAddModalOpen(false)}>×</button>
            </div>
            
            <form onSubmit={handleAddGame} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', paddingTop: '0.5rem' }}>
              <div className="form-group">
                <label>Game Title</label>
                <input 
                  type="text" 
                  className="input-control" 
                  placeholder="e.g. Catan, Exploding Kittens" 
                  value={newGameTitle}
                  onChange={e => setNewGameTitle(e.target.value)}
                  required 
                />
              </div>

              <div style={{ display: 'flex', gap: '1rem' }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label>Game Type</label>
                  <select 
                    className="input-control"
                    value={newGameType}
                    onChange={e => setNewGameType(e.target.value)}
                  >
                    <option value="Board">Board Game</option>
                    <option value="Card">Card Game</option>
                  </select>
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label>Recommended Ages</label>
                  <input 
                    type="text" 
                    className="input-control" 
                    placeholder="e.g. 8+, 12+" 
                    value={newRecommendedAges}
                    onChange={e => setNewRecommendedAges(e.target.value)}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem' }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label>Min Players</label>
                  <input 
                    type="number" 
                    min="1" 
                    className="input-control" 
                    value={newMinPlayers}
                    onChange={e => setNewMinPlayers(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    required 
                  />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label>Max Players</label>
                  <input 
                    type="number" 
                    min="1" 
                    className="input-control" 
                    value={newMaxPlayers}
                    onChange={e => setNewMaxPlayers(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    required 
                  />
                </div>
              </div>

              <div className="form-group">
                <label style={{ marginBottom: '0.375rem' }}>Rating</label>
                <StarRatingInput value={newRating} onChange={setNewRating} />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button type="button" className="btn btn-outline" onClick={() => setIsAddModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Add Game</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: PICK A GAME (RANDOM SELECTOR) */}
      {isPickModalOpen && (
        <div className="modal-overlay" onClick={() => setIsPickModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px' }}>
            <div className="modal-header">
              <h2 style={{ fontSize: '1.25rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Dice5 size={20} /> Game Selector Helper
              </h2>
              <button className="close-btn" onClick={() => setIsPickModalOpen(false)}>×</button>
            </div>
            
            {pickedGame === null ? (
              <form onSubmit={handlePickGame} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', paddingTop: '0.5rem' }}>
                <div className="form-group">
                  <label>How many players will be playing?</label>
                  <input 
                    type="number" 
                    min="1" 
                    className="input-control" 
                    value={playerCount}
                    onChange={e => setPlayerCount(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    required 
                  />
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                  <button type="button" className="btn btn-outline" onClick={() => setIsPickModalOpen(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary" style={{ gap: '0.5rem' }}>
                    <Dice5 size={16} /> Select Random Game
                  </button>
                </div>
              </form>
            ) : pickedGame === 'none' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', textAlign: 'center', padding: '1.5rem 0.5rem 0.5rem' }}>
                <p style={{ margin: 0, fontSize: '0.95rem', fontWeight: '500', color: 'var(--muted-foreground)' }}>
                  No games in your library support {playerCount} players.
                </p>
                <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--muted-foreground)' }}>
                  Try adding a game that fits this player count!
                </p>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem', marginTop: '0.5rem' }}>
                  <button type="button" className="btn btn-outline" onClick={() => setPickedGame(null)}>Back</button>
                  <button type="button" className="btn btn-primary" onClick={() => setIsPickModalOpen(false)}>Close</button>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', paddingTop: '0.5rem' }}>
                
                <div style={{ 
                  border: '2px solid var(--primary)', 
                  background: 'var(--muted)',
                  borderRadius: 'var(--radius)', 
                  padding: '1.25rem',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '0.75rem',
                  textAlign: 'center',
                  position: 'relative',
                  overflow: 'hidden'
                }}>
                  <div style={{ position: 'absolute', top: '-5px', right: '-5px', opacity: 0.1 }}>
                    <Sparkles size={60} />
                  </div>
                  
                  <span className="badge badge-primary" style={{ textTransform: 'uppercase', fontSize: '0.65rem', fontWeight: 'bold', tracking: '0.05em' }}>
                    Selected Game
                  </span>
                  
                  <h3 style={{ fontSize: '1.5rem', fontWeight: '800', margin: 0 }}>
                    {pickedGame.title}
                  </h3>
                  
                  <span className="badge badge-secondary" style={{ fontSize: '0.7rem' }}>
                    {pickedGame.game_type}
                  </span>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', justifyContent: 'center', fontSize: '0.8rem', color: 'var(--muted-foreground)', marginTop: '0.25rem' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <Users size={13} /> {pickedGame.min_players === pickedGame.max_players ? `${pickedGame.min_players} Players` : `${pickedGame.min_players}-${pickedGame.max_players} Players`}
                    </span>
                    {pickedGame.recommended_ages && (
                      <span>• Age: {pickedGame.recommended_ages}</span>
                    )}
                  </div>
                  
                  <div style={{ marginTop: '0.25rem' }}>
                    <RenderStars count={pickedGame.rating} />
                  </div>
                </div>

                <p style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)', margin: 0, textAlign: 'center' }}>
                  This game has been added to your Played History as <strong>Pending</strong>. Feel free to update the winner once the game finishes!
                </p>

                <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem' }}>
                  <button type="button" className="btn btn-outline" onClick={() => setPickedGame(null)}>Roll Again</button>
                  <button type="button" className="btn btn-primary" onClick={() => setIsPickModalOpen(false)}>Let's Play!</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL 3: EDIT PLAY HISTORY LOG */}
      {isEditModalOpen && selectedPlay && (
        <div className="modal-overlay" onClick={() => setIsEditModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px' }}>
            <div className="modal-header">
              <h2 style={{ fontSize: '1.25rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Edit2 size={18} /> Record Winner
              </h2>
              <button className="close-btn" onClick={() => setIsEditModalOpen(false)}>×</button>
            </div>
            
            <form onSubmit={handleSavePlayLog} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', paddingTop: '0.5rem' }}>
              <div className="form-group">
                <label>Game Title</label>
                <input 
                  type="text" 
                  className="input-control" 
                  value={selectedPlay.game_title} 
                  disabled 
                  style={{ background: 'var(--muted)', cursor: 'not-allowed' }}
                />
              </div>

              <div className="form-group">
                <label>Winner Name</label>
                <input 
                  type="text" 
                  className="input-control" 
                  placeholder="e.g. Joshua, Mom, Team A" 
                  value={editWinner}
                  onChange={e => setEditWinner(e.target.value)}
                  required 
                />
              </div>

              <div style={{ display: 'flex', gap: '1rem' }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label>Players Count</label>
                  <input 
                    type="number" 
                    min="1" 
                    className="input-control" 
                    value={editPlayersCount}
                    onChange={e => setEditPlayersCount(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    required 
                  />
                </div>
                <div className="form-group" style={{ flex: 1.5 }}>
                  <label>Played On</label>
                  <input 
                    type="datetime-local" 
                    className="input-control" 
                    value={editDate}
                    onChange={e => setEditDate(e.target.value)}
                    required 
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button type="button" className="btn btn-outline" onClick={() => setIsEditModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Log</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
