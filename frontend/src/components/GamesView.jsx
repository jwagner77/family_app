import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Play,
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
  Info,
  ExternalLink
} from 'lucide-react';

export default function GamesView({ showToast, currentUser }) {
  const [games, setGames] = useState([]);
  const [history, setHistory] = useState([]);
  const [loadingGames, setLoadingGames] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [mtgUrl, setMtgUrl] = useState('');
  const [users, setUsers] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [winnerType, setWinnerType] = useState('pending');
  const [winnerContact, setWinnerContact] = useState('');
  const [winnerOther, setWinnerOther] = useState('');

  // Current Game Card states
  const [currentGame, setCurrentGame] = useState(null);
  const [activePlayers, setActivePlayers] = useState([]);
  const [winners, setWinners] = useState([]);
  const [notesContent, setNotesContent] = useState('');
  const [notesPreviewMode, setNotesPreviewMode] = useState(false);
  const [customPlayerName, setCustomPlayerName] = useState('');
  const [showSlashMenu, setShowSlashMenu] = useState(false);

  // Notes viewer modal states
  const [viewingNotesLog, setViewingNotesLog] = useState(null);
  const [viewingNotesContent, setViewingNotesContent] = useState('');

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
    fetchMtgUrl();
    fetchUsersAndContacts();

    const handleAddTrigger = (e) => {
      if (e.detail.tab === 'games') {
        setIsAddModalOpen(true);
      }
    };
    window.addEventListener('trigger-add-action', handleAddTrigger);
    return () => {
      window.removeEventListener('trigger-add-action', handleAddTrigger);
    };
  }, []);

  const fetchMtgUrl = async () => {
    try {
      const res = await fetch('/api/settings/public');
      if (res.ok) {
        const data = await res.json();
        setMtgUrl(data.mtg_url || '');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchUsersAndContacts = async () => {
    try {
      const resUsers = await fetch('/api/users/list');
      if (resUsers.ok) {
        const data = await resUsers.json();
        setUsers(data);
      }
      const resContacts = await fetch('/api/contacts');
      if (resContacts.ok) {
        const data = await resContacts.json();
        setContacts(data);
      }
    } catch (err) {
      console.error('Error fetching users/contacts for games:', err);
    }
  };

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

  const handlePlayGame = (game) => {
    setCurrentGame(game);
    setNotesContent('');
    setWinners([]);
    
    const defaultPlayers = [];
    if (currentUser?.display_name || currentUser?.username) {
      defaultPlayers.push(currentUser.display_name || currentUser.username);
    }
    setActivePlayers(defaultPlayers);
    showToast(`Loaded "${game.title}" into the Current Game panel! 🎲`, 'success');
  };

  // --- Current Game & Notes Markdown Editor Handlers ---
  const handleAddPlayer = (name) => {
    if (!name.trim()) return;
    const cleanName = name.trim();
    if (activePlayers.includes(cleanName)) {
      showToast(`${cleanName} is already playing!`, 'error');
      return;
    }
    setActivePlayers([...activePlayers, cleanName]);
    setCustomPlayerName('');
  };

  const handleRemovePlayer = (name) => {
    setActivePlayers(activePlayers.filter(p => p !== name));
    setWinners(winners.filter(p => p !== name));
  };

  const handleToggleWinner = (name) => {
    if (winners.includes(name)) {
      setWinners(winners.filter(w => w !== name));
    } else {
      setWinners([...winners, name]);
    }
  };

  const handleSlashCommand = (cmd) => {
    let template = '';
    switch (cmd) {
      case 'score':
        template = '\n\n### Current Scoreboard\n| Player | Round 1 | Round 2 | Total |\n| :--- | :--- | :--- | :--- |\n' + 
          activePlayers.map(p => `| ${p} | 0 | 0 | 0 |`).join('\n') + '\n';
        break;
      case 'table':
        template = '\n\n| Header 1 | Header 2 |\n| :--- | :--- |\n| Cell 1 | Cell 2 |\n';
        break;
      case 'notes':
        template = '\n\n### Game Play Notes\n- Round 1: \n- Notable plays: \n';
        break;
      case 'round':
        template = '\n\n### Round Notes\n* \n';
        break;
      case 'clear':
        setNotesContent('');
        setShowSlashMenu(false);
        return;
      default:
        break;
    }
    setNotesContent(prev => prev + template);
    setShowSlashMenu(false);
  };

  const handleGameOver = async () => {
    if (!currentGame) return;
    if (activePlayers.length === 0) {
      showToast('Please select at least 1 player', 'error');
      return;
    }
    const winnerString = winners.length > 0 ? winners.join(' & ') : 'No Winner';
    try {
      const res = await fetch('/api/games/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          game_id: currentGame.id,
          players_count: activePlayers.length,
          winner: winnerString,
          notes_content: notesContent
        })
      });
      if (res.ok) {
        showToast(`Game Over! Logged play for "${currentGame.title}" with winner: ${winnerString}! 🏆`, 'success');
        setCurrentGame(null);
        setActivePlayers([]);
        setWinners([]);
        setNotesContent('');
        fetchHistory();
      } else {
        const err = await res.json();
        showToast(err.error || 'Failed to submit game play log', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Network error logging game over', 'error');
    }
  };

  const handleViewNotes = async (log) => {
    if (!log.notes_file) return;
    try {
      const res = await fetch(`/api/games/history/${log.id}/notes`);
      if (res.ok) {
        const markdown = await res.text();
        setViewingNotesLog(log);
        setViewingNotesContent(markdown);
      } else {
        showToast('Failed to load notes content', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Error fetching notes content from server', 'error');
    }
  };

  // Open Edit Play Modal
  const openEditPlayModal = (play) => {
    setSelectedPlay(play);
    const win = play.winner || '';
    setEditWinner(win);

    if (win === 'Pending' || win === '') {
      setWinnerType('pending');
      setWinnerContact('');
      setWinnerOther('');
    } else if (users.some(u => (u.display_name || u.username) === win)) {
      setWinnerType(win);
      setWinnerContact('');
      setWinnerOther('');
    } else if (contacts.some(c => c.name === win)) {
      setWinnerType('contact');
      setWinnerContact(win);
      setWinnerOther('');
    } else {
      setWinnerType('other');
      setWinnerContact('');
      setWinnerOther(win);
    }

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

    const finalWinner = 
      winnerType === 'pending' ? 'Pending' :
      winnerType === 'contact' ? winnerContact :
      winnerType === 'other' ? winnerOther :
      winnerType;

    if (!finalWinner || !finalWinner.trim()) {
      showToast('Winner name is required', 'error');
      return;
    }

    try {
      const res = await fetch(`/api/games/history/${selectedPlay.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          winner: finalWinner.trim(),
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
    const isAdmin = currentUser?.role_name === 'Administrator';
    if (!isAdmin) {
      showToast('Only administrators can delete game play logs.', 'error');
      return;
    }

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

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <RenderStars count={game.rating} />
                    <button 
                      type="button" 
                      className="btn-icon"
                      onClick={() => handlePlayGame(game)}
                      style={{ 
                        padding: '0.25rem',
                        color: '#10b981',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                      title="Log a Play"
                    >
                      <Play size={14} fill="currentColor" />
                    </button>
                    {game.title === 'Magic: The Gathering' && mtgUrl && (
                      <a 
                        href={mtgUrl} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="btn-icon" 
                        style={{ 
                          padding: '0.25rem',
                          color: 'var(--primary)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                        title="Open MTG App"
                      >
                        <ExternalLink size={14} />
                      </a>
                    )}
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

        {/* COLUMN 2: CURRENT GAME */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', height: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '700', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Gamepad2 size={18} style={{ color: 'var(--primary)' }} /> Current Game
            </h2>
            {currentGame && (
              <button 
                type="button" 
                onClick={() => {
                  setCurrentGame(null);
                  setActivePlayers([]);
                  setWinners([]);
                  setNotesContent('');
                }}
                className="btn-icon text-destructive"
                style={{ padding: '0.25rem' }}
                title="Cancel Session"
              >
                ×
              </button>
            )}
          </div>

          {!currentGame ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '2rem 1.5rem', border: '1px dashed var(--border)', borderRadius: 'var(--radius)', textAlign: 'center' }}>
              <Gamepad2 size={36} style={{ color: 'var(--muted-foreground)', margin: '0 auto 0.5rem auto' }} />
              <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--muted-foreground)' }}>No active game session. Load a game from the library or pick one below to start.</p>
              <select 
                className="input-control"
                onChange={(e) => {
                  if (!e.target.value) return;
                  const selected = games.find(g => g.id === parseInt(e.target.value, 10));
                  if (selected) handlePlayGame(selected);
                }}
                value=""
                style={{ marginTop: '0.5rem' }}
              >
                <option value="">-- Choose a Game --</option>
                {games.map(g => (
                  <option key={g.id} value={g.id}>{g.title} ({g.game_type})</option>
                ))}
              </select>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--primary)', fontWeight: 'bold' }}>
                  Active Game
                </span>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 'bold', margin: '0.125rem 0' }}>
                  {currentGame.title}
                </h3>
                <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>
                  Recommended players: {currentGame.min_players === currentGame.max_players ? `${currentGame.min_players}` : `${currentGame.min_players}-${currentGame.max_players}`}
                </p>
              </div>

              {/* Select Players */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.8125rem', fontWeight: '600', color: 'var(--muted-foreground)', marginBottom: '-0.25rem' }}>
                  Select Players:
                </label>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <select 
                    className="input-control"
                    onChange={(e) => {
                      if (!e.target.value) return;
                      handleAddPlayer(e.target.value);
                      e.target.value = '';
                    }}
                    defaultValue=""
                    style={{ flex: 1 }}
                  >
                    <option value="" disabled>-- Add Player --</option>
                    <optgroup label="Household Members">
                      {users.map(u => {
                        const name = u.display_name || u.username;
                        return <option key={u.id} value={name}>{name}</option>;
                      })}
                    </optgroup>
                    <optgroup label="Contacts">
                      {contacts.map(c => (
                        <option key={c.id} value={c.name}>{c.name}</option>
                      ))}
                    </optgroup>
                  </select>
                  <span style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>or</span>
                  <input 
                    type="text"
                    className="input-control"
                    placeholder="Guest Name"
                    value={customPlayerName}
                    onChange={e => setCustomPlayerName(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddPlayer(customPlayerName);
                      }
                    }}
                    style={{ flex: 1 }}
                  />
                  <button 
                    type="button"
                    onClick={() => handleAddPlayer(customPlayerName)}
                    className="btn btn-outline"
                    style={{ padding: '0 0.75rem', height: '36px' }}
                  >
                    Add
                  </button>
                </div>

                {/* Active Players checklist */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.25rem' }}>
                  <div style={{ fontSize: '0.8125rem', fontWeight: '600', color: 'var(--muted-foreground)' }}>
                    Active Players (Check winners):
                  </div>
                  {activePlayers.length === 0 ? (
                    <p style={{ margin: 0, fontStyle: 'italic', fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>
                      No players added yet. Select members or type a guest name.
                    </p>
                  ) : (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                      {activePlayers.map(player => {
                        const isWinner = winners.includes(player);
                        return (
                          <div 
                            key={player} 
                            style={{ 
                              display: 'flex', 
                              alignItems: 'center', 
                              gap: '0.35rem', 
                              padding: '0.25rem 0.5rem', 
                              background: isWinner ? 'var(--primary-light)' : 'var(--card-hover)', 
                              border: isWinner ? '1px solid var(--primary)' : '1px solid var(--border)', 
                              borderRadius: '20px',
                              boxShadow: 'var(--shadow-sm)'
                            }}
                          >
                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8125rem', cursor: 'pointer', margin: 0, fontWeight: isWinner ? '700' : 'normal', color: isWinner ? 'var(--primary-foreground)' : 'var(--foreground)' }}>
                              <input 
                                type="checkbox"
                                checked={isWinner}
                                onChange={() => handleToggleWinner(player)}
                                style={{ cursor: 'pointer', accentColor: 'var(--primary)' }}
                              />
                              {isWinner ? '🏆 ' : ''}{player}
                            </label>
                            <button 
                              type="button" 
                              onClick={() => handleRemovePlayer(player)} 
                              style={{ 
                                background: 'transparent', 
                                border: 'none', 
                                color: isWinner ? 'var(--primary-foreground)' : 'var(--text-muted)', 
                                cursor: 'pointer', 
                                fontSize: '0.875rem', 
                                padding: '0 0.125rem',
                                fontWeight: 'bold'
                              }}
                              title="Remove Player"
                            >
                              ×
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Slash notes editor */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <label style={{ fontSize: '0.8125rem', fontWeight: '600', color: 'var(--muted-foreground)', margin: 0 }}>
                      Notes & Scorecard:
                    </label>
                    <button 
                      type="button" 
                      onClick={() => setNotesPreviewMode(!notesPreviewMode)}
                      className="btn" 
                      style={{ fontSize: '0.65rem', padding: '1px 6px', height: '18px', background: 'var(--card-hover)', border: '1px solid var(--border)', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                    >
                      {notesPreviewMode ? '✍️ Edit' : '👁️ Preview'}
                    </button>
                  </div>
                  {!notesPreviewMode && (
                    <div style={{ display: 'flex', gap: '0.25rem' }}>
                      <button type="button" onClick={() => handleSlashCommand('score')} className="btn btn-outline" style={{ fontSize: '0.65rem', padding: '2px 6px', height: '22px' }}>/score</button>
                      <button type="button" onClick={() => handleSlashCommand('table')} className="btn btn-outline" style={{ fontSize: '0.65rem', padding: '2px 6px', height: '22px' }}>/table</button>
                      <button type="button" onClick={() => handleSlashCommand('notes')} className="btn btn-outline" style={{ fontSize: '0.65rem', padding: '2px 6px', height: '22px' }}>/notes</button>
                      <button type="button" onClick={() => handleSlashCommand('round')} className="btn btn-outline" style={{ fontSize: '0.65rem', padding: '2px 6px', height: '22px' }}>/round</button>
                      <button type="button" onClick={() => handleSlashCommand('clear')} className="btn btn-outline btn-danger" style={{ fontSize: '0.65rem', padding: '2px 6px', height: '22px' }}>/clear</button>
                    </div>
                  )}
                </div>

                {notesPreviewMode ? (
                  <div 
                    className="markdown-body"
                    style={{ 
                      minHeight: '130px', 
                      padding: '0.75rem', 
                      border: '1px solid var(--border)', 
                      borderRadius: 'var(--radius)', 
                      background: 'var(--card-hover)', 
                      overflowY: 'auto',
                      fontSize: '0.8125rem',
                      lineHeight: '1.4',
                      color: 'var(--foreground)'
                    }}
                    dangerouslySetInnerHTML={{ __html: renderMarkdownToHtml(notesContent) }}
                  />
                ) : (
                  <>
                    <textarea
                      className="input-control"
                      placeholder="Take notes, keep score, or type comments. Click templates above to drop structure!"
                      value={notesContent}
                      onChange={(e) => {
                        const val = e.target.value;
                        setNotesContent(val);
                        setShowSlashMenu(val.endsWith('/'));
                      }}
                      style={{ minHeight: '130px', fontFamily: 'monospace', fontSize: '0.8125rem', lineHeight: '1.4' }}
                    />
                    {showSlashMenu && (
                      <div style={{ fontSize: '0.7rem', color: 'var(--primary)', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '-0.25rem' }}>
                        💡 Templates ready: Click `/score`, `/table`, `/notes`, or `/round` above to insert structures!
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Game Over Button */}
              <button 
                type="button"
                onClick={handleGameOver}
                className="btn btn-primary"
                style={{ width: '100%', marginTop: '0.5rem', gap: '0.5rem', justifyContent: 'center' }}
              >
                🏁 Game Over (Log to History)
              </button>
            </div>
          )}
        </div>

        {/* COLUMN 3: GAMES PLAYED HISTORY */}
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
                      {log.notes_file && (
                        <button 
                          type="button" 
                          className="btn-icon"
                          onClick={() => handleViewNotes(log)}
                          style={{ padding: '0.25rem', color: 'var(--primary)' }}
                          title="View Game Notes"
                        >
                          <Info size={13} />
                        </button>
                      )}
                      <button 
                        type="button" 
                        className="btn-icon"
                        onClick={() => openEditPlayModal(log)}
                        style={{ padding: '0.25rem' }}
                        title="Edit Winner / Play Log"
                      >
                        <Edit2 size={13} />
                      </button>
                      {currentUser?.role_name === 'Administrator' && (
                        <button 
                          type="button" 
                          className="btn-icon text-destructive"
                          onClick={() => handleDeletePlayLog(log.id)}
                          style={{ padding: '0.25rem' }}
                          title="Remove Log"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
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
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Add New Game</h2>
              <button className="close-btn" onClick={() => setIsAddModalOpen(false)}>×</button>
            </div>
            
            <div className="modal-body">
              <form onSubmit={handleAddGame} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
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

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', borderTop: '1px solid var(--border)', paddingTop: '0.75rem', marginTop: '0.5rem' }}>
                  <button type="button" className="btn btn-outline" onClick={() => setIsAddModalOpen(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary">Add Game</button>
                </div>
              </form>
            </div>
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
                  Click <strong>Let's Play!</strong> to load this game into your active session card and select players!
                </p>

                <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem' }}>
                  <button type="button" className="btn btn-outline" onClick={() => setPickedGame(null)}>Roll Again</button>
                  <button 
                    type="button" 
                    className="btn btn-primary" 
                    onClick={() => {
                      handlePlayGame(pickedGame);
                      setIsPickModalOpen(false);
                      setPickedGame(null);
                    }}
                  >
                    Let's Play!
                  </button>
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
                <label>Winner</label>
                <select 
                  className="input-control" 
                  value={winnerType}
                  onChange={e => {
                    const val = e.target.value;
                    setWinnerType(val);
                    if (val === 'contact' && contacts.length > 0 && !winnerContact) {
                      setWinnerContact(contacts[0].name);
                    }
                  }}
                  required 
                >
                  <option value="pending">Pending</option>
                  
                  {users.length > 0 && (
                    <optgroup label="Household Users">
                      {users.map(u => {
                        const name = u.display_name || u.username;
                        return <option key={u.id} value={name}>{name}</option>;
                      })}
                    </optgroup>
                  )}

                  <option value="contact">Contact...</option>
                  <option value="other">Other (Manual Entry)...</option>
                </select>

                {winnerType === 'contact' && (
                  <div style={{ marginTop: '0.75rem' }}>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '600', marginBottom: '0.25rem' }}>Select Contact</label>
                    <select 
                      className="input-control"
                      value={winnerContact}
                      onChange={e => setWinnerContact(e.target.value)}
                      required
                    >
                      <option value="">-- Choose Contact --</option>
                      {contacts.map(c => (
                        <option key={c.id} value={c.name}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                {winnerType === 'other' && (
                  <div style={{ marginTop: '0.75rem' }}>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '600', marginBottom: '0.25rem' }}>Winner Name (Manual Entry)</label>
                    <input 
                      type="text" 
                      className="input-control"
                      placeholder="e.g. Mom, Team A, Guest"
                      value={winnerOther}
                      onChange={e => setWinnerOther(e.target.value)}
                      required
                    />
                  </div>
                )}
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

      {/* MODAL 4: VIEW GAME NOTES */}
      {viewingNotesLog && (
        <div className="modal-overlay" onClick={() => setViewingNotesLog(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h2 style={{ fontSize: '1.25rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Info size={20} /> Game Session Notes
              </h2>
              <button className="close-btn" onClick={() => setViewingNotesLog(null)}>×</button>
            </div>
            
            <div className="modal-body" style={{ maxHeight: '450px', overflowY: 'auto', padding: '1rem 0.5rem' }}>
              <div style={{ marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 'bold' }}>
                  Game Played
                </span>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', margin: '0.25rem 0' }}>
                  {viewingNotesLog.game_title}
                </h3>
                <div style={{ display: 'flex', gap: '1rem', fontSize: '0.8rem', color: 'var(--muted-foreground)' }}>
                  <span>📅 {new Date(viewingNotesLog.played_at).toLocaleDateString()}</span>
                  <span>👥 {viewingNotesLog.players_count} Players</span>
                  <span>🏆 Winner: {viewingNotesLog.winner}</span>
                </div>
              </div>

              <div 
                className="markdown-body"
                style={{ fontSize: '0.875rem', lineHeight: '1.6', color: 'var(--foreground)' }}
                dangerouslySetInnerHTML={{ __html: renderMarkdownToHtml(viewingNotesContent) }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid var(--border)', paddingTop: '0.75rem', marginTop: '0.5rem' }}>
              <button type="button" className="btn btn-outline" onClick={() => setViewingNotesLog(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

function renderMarkdownToHtml(markdown) {
  if (!markdown) return '<p style="color: var(--muted-foreground); font-style: italic;">No notes recorded for this game play.</p>';
  let html = markdown
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
    
  // Headers
  html = html.replace(/^### (.*$)/gim, '<h3 style="font-size: 1.125rem; font-weight: bold; margin-top: 1rem; margin-bottom: 0.5rem; color: var(--foreground); border-bottom: 1px solid var(--border); padding-bottom: 0.25rem;">$1</h3>');
  html = html.replace(/^## (.*$)/gim, '<h2 style="font-size: 1.25rem; font-weight: bold; margin-top: 1.25rem; margin-bottom: 0.5rem; color: var(--foreground);">$1</h2>');
  html = html.replace(/^# (.*$)/gim, '<h1 style="font-size: 1.5rem; font-weight: bold; margin-top: 1.5rem; margin-bottom: 0.75rem; color: var(--foreground);">$1</h1>');
  
  // Bold
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  
  // Lists
  html = html.replace(/^\s*-\s+(.*$)/gim, '<li style="margin-left: 1.5rem; list-style-type: disc; margin-bottom: 0.25rem;">$1</li>');
  html = html.replace(/^\s*\*\s+(.*$)/gim, '<li style="margin-left: 1.5rem; list-style-type: disc; margin-bottom: 0.25rem;">$1</li>');
  
  // Table Parser
  const lines = html.split('\n');
  const processedLines = [];
  let inTable = false;
  let tableRows = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith('|') && line.endsWith('|')) {
      inTable = true;
      const cells = line.split('|').map(c => c.trim()).filter((c, idx, arr) => idx > 0 && idx < arr.length - 1);
      const isAlignLine = line.includes('-') && !line.match(/[a-zA-Z0-9]/);
      if (!isAlignLine) {
        tableRows.push(cells);
      }
    } else {
      if (inTable) {
        let tableHtml = '<table style="width:100%; border-collapse:collapse; margin: 1rem 0; border: 1px solid var(--border); font-size: 0.875rem;">';
        tableRows.forEach((row, rIdx) => {
          const isHeader = rIdx === 0;
          tableHtml += '<tr style="border-bottom: 1px solid var(--border);">';
          row.forEach(cell => {
            if (isHeader) {
              tableHtml += `<th style="padding: 0.5rem 0.75rem; border-right: 1px solid var(--border); font-weight: bold; background: var(--card-hover); text-align: left; color: var(--foreground);">${cell}</th>`;
            } else {
              tableHtml += `<td style="padding: 0.5rem 0.75rem; border-right: 1px solid var(--border);">${cell}</td>`;
            }
          });
          tableHtml += '</tr>';
        });
        tableHtml += '</table>';
        processedLines.push(tableHtml);
        
        inTable = false;
        tableRows = [];
      }
      processedLines.push(lines[i]);
    }
  }

  if (inTable && tableRows.length > 0) {
    let tableHtml = '<table style="width:100%; border-collapse:collapse; margin: 1rem 0; border: 1px solid var(--border); font-size: 0.875rem;">';
    tableRows.forEach((row, rIdx) => {
      const isHeader = rIdx === 0;
      tableHtml += '<tr style="border-bottom: 1px solid var(--border);">';
      row.forEach(cell => {
        if (isHeader) {
          tableHtml += `<th style="padding: 0.5rem 0.75rem; border-right: 1px solid var(--border); font-weight: bold; background: var(--card-hover); text-align: left; color: var(--foreground);">${cell}</th>`;
        } else {
          tableHtml += `<td style="padding: 0.5rem 0.75rem; border-right: 1px solid var(--border);">${cell}</td>`;
        }
      });
      tableHtml += '</tr>';
    });
    tableHtml += '</table>';
    processedLines.push(tableHtml);
  }

  html = processedLines.join('\n');

  // Double newlines to paragraph breaks
  html = html.replace(/\n\n/g, '<br/><br/>');
  // Single newline to simple break if not in list or table
  html = html.split('\n').map(line => {
    const trimmed = line.trim();
    if (trimmed.startsWith('<li') || trimmed.startsWith('<tr') || trimmed.startsWith('<table') || trimmed.startsWith('</table') || trimmed.startsWith('<td') || trimmed.startsWith('<th') || trimmed.startsWith('<h') || trimmed.includes('<table')) {
      return line;
    }
    return line + '<br/>';
  }).join('\n');

  return html;
}
