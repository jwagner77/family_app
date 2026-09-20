import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Grid, 
  List, 
  Star, 
  Trash2, 
  Plus, 
  Download, 
  BookOpen, 
  Clock, 
  Users, 
  Edit2, 
  ShoppingCart, 
  X, 
  ChevronDown 
} from 'lucide-react';
import RecipeForm from './RecipeForm';

export default function RecipesView({ showToast, user }) {
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTagFilter, setSelectedTagFilter] = useState('');
  const [reusableTags, setReusableTags] = useState([]);
  const [viewMode, setViewMode] = useState('grid');
  const [selectedIds, setSelectedIds] = useState([]);
  
  // Modals / Details State
  const [currentRecipe, setCurrentRecipe] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editRecipe, setEditRecipe] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [defaultTemplateId, setDefaultTemplateId] = useState('');
  
  // Shopping list placement state
  const [promptListRecipe, setPromptListRecipe] = useState(null);
  const [promptLists, setPromptLists] = useState([]);
  const [selectedPromptListId, setSelectedPromptListId] = useState('');
  const [newListNameInPrompt, setNewListNameInPrompt] = useState('');

  const token = localStorage.getItem('token') || '';

  const fetchRecipes = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/recipes?q=${encodeURIComponent(searchQuery)}`);
      if (!res.ok) throw new Error('Failed to fetch recipes');
      const data = await res.json();
      setRecipes(data);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchTags = async () => {
    try {
      const res = await fetch('/api/tags');
      if (res.ok) {
        const data = await res.json();
        setReusableTags(data);
      }
    } catch (err) {
      console.error('Failed to load reusable tags:', err);
    }
  };

  const fetchTemplates = async () => {
    try {
      const res = await fetch('/api/templates');
      if (res.ok) {
        const data = await res.json();
        setTemplates(data);
        const def = data.find(t => t.is_default === 1);
        if (def) setDefaultTemplateId(def.id);
      }
    } catch (err) {
      console.error('Failed to load templates:', err);
    }
  };

  useEffect(() => {
    fetchRecipes();
    fetchTags();
    fetchTemplates();
  }, [searchQuery]);

  useEffect(() => {
    const handleAddTrigger = (e) => {
      if (e.detail.tab === 'recipes') {
        openCreateForm();
      }
    };
    window.addEventListener('trigger-add-action', handleAddTrigger);
    return () => {
      window.removeEventListener('trigger-add-action', handleAddTrigger);
    };
  }, []);

  const loadRecipeDetails = async (id) => {
    try {
      const res = await fetch(`/api/recipes/${id}`);
      if (!res.ok) throw new Error('Could not load recipe details');
      const data = await res.json();
      setCurrentRecipe(data);
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleDeleteRecipe = async (id, e) => {
    if (e) e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this recipe?')) return;
    
    try {
      const res = await fetch(`/api/recipes/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete recipe');
      showToast('Recipe deleted successfully');
      fetchRecipes();
      if (currentRecipe?.id === id) setCurrentRecipe(null);
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleToggleFavorite = async (recipeId, e) => {
    if (e) e.stopPropagation();
    try {
      const res = await fetch(`/api/recipes/${recipeId}/toggle-favorite`, {
        method: 'POST'
      });
      if (!res.ok) throw new Error('Failed to toggle favorite status');
      const data = await res.json();
      
      setRecipes(prev => prev.map(r => r.id === recipeId ? { ...r, favorite: data.favorite } : r));
      if (currentRecipe && currentRecipe.id === recipeId) {
        setCurrentRecipe(prev => ({ ...prev, favorite: data.favorite }));
      }
      showToast(data.favorite ? 'Added to favorites' : 'Removed from favorites');
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleAddRecipeClick = async (recipe) => {
    setPromptListRecipe(recipe);
    setSelectedPromptListId('');
    setNewListNameInPrompt('');
    
    try {
      const res = await fetch('/api/shopping-lists');
      if (res.ok) {
        const data = await res.json();
        setPromptLists(data);
        const lastActive = localStorage.getItem('active_shopping_list_id');
        const editable = data.filter(l => l.permission === 'owner' || l.permission === 'edit');
        if (lastActive && editable.some(l => String(l.id) === String(lastActive))) {
          setSelectedPromptListId(lastActive);
        } else if (editable.length > 0) {
          setSelectedPromptListId(editable[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to load lists for prompt:', err);
    }
  };

  const handleConfirmAddToList = async (e) => {
    e.preventDefault();
    if (!promptListRecipe) return;

    let targetListId = selectedPromptListId;

    try {
      if (selectedPromptListId === 'new') {
        if (!newListNameInPrompt.trim()) return;
        const createRes = await fetch('/api/shopping-lists', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: newListNameInPrompt.trim() })
        });
        if (!createRes.ok) throw new Error('Failed to create new shopping list');
        const createData = await createRes.json();
        targetListId = createData.id;
        localStorage.setItem('active_shopping_list_id', targetListId);
      }

      const res = await fetch(`/api/shopping-lists/${targetListId}/recipes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipe_id: promptListRecipe.id })
      });
      
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to add recipe to list');
      }
      
      showToast(`Added ingredients for "${promptListRecipe.title}" to shopping list.`);
      setPromptListRecipe(null);
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleExportWord = (recipeId, templateId) => {
    const tId = templateId || defaultTemplateId;
    let url = `/api/recipes/${recipeId}/export`;
    const params = [];
    if (tId) params.push(`templateId=${tId}`);
    if (token) params.push(`token=${encodeURIComponent(token)}`);
    if (params.length > 0) url += `?${params.join('&')}`;
    window.open(url, '_blank');
  };

  const openCreateForm = () => {
    setEditRecipe(null);
    setIsFormOpen(true);
  };

  const openEditForm = (recipe, e) => {
    if (e) e.stopPropagation();
    setEditRecipe(recipe);
    setIsFormOpen(true);
  };

  const handleFormSuccess = () => {
    setIsFormOpen(false);
    setEditRecipe(null);
    fetchRecipes();
    fetchTags();
    if (currentRecipe) {
      loadRecipeDetails(currentRecipe.id);
    }
  };

  const handleSelectRecipe = (id, e) => {
    e.stopPropagation();
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    const filtered = filteredRecipes;
    if (selectedIds.length === filtered.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filtered.map(r => r.id));
    }
  };

  const handleBulkDelete = async () => {
    if (!window.confirm(`Are you sure you want to delete ${selectedIds.length} recipes?`)) return;
    try {
      const res = await fetch('/api/recipes/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedIds })
      });
      if (!res.ok) throw new Error('Bulk delete failed');
      showToast(`Successfully deleted ${selectedIds.length} recipes.`);
      setSelectedIds([]);
      fetchRecipes();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleBulkExport = () => {
    let url = `/api/recipes/bulk-export`;
    const params = [];
    params.push(`ids=${selectedIds.join(',')}`);
    if (defaultTemplateId) params.push(`templateId=${defaultTemplateId}`);
    if (token) params.push(`token=${encodeURIComponent(token)}`);
    url += `?${params.join('&')}`;
    window.open(url, '_blank');
  };

  const filteredRecipes = recipes.filter(recipe => {
    if (!selectedTagFilter) return true;
    if (!recipe.tags) return false;
    const recipeTagsList = recipe.tags.split(',').map(t => t.trim().toLowerCase());
    return recipeTagsList.includes(selectedTagFilter.toLowerCase());
  });

  const canWrite = user?.permissions?.recipes === 'full';

  return (
    <div className="animate-fade-in">
      <div className="content-header">
        <h2>My Recipes</h2>
      </div>

      {/* Filter Bar */}
      <div className="card" style={{ marginBottom: '2rem', padding: '0.75rem 1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1.5rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1, minWidth: '240px' }}>
            <Search size={22} style={{ color: 'var(--text-muted)' }} />
            <input 
              type="text"
              placeholder="Search recipes by title or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ 
                width: '100%',
                border: 'none', 
                background: 'transparent', 
                fontSize: '1.05rem', 
                color: 'var(--text-main)', 
                outline: 'none' 
              }}
            />
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>Filter by Tag:</span>
            <select 
              value={selectedTagFilter} 
              onChange={(e) => setSelectedTagFilter(e.target.value)}
              className="input-control"
              style={{ 
                padding: '0.4rem 0.75rem', 
                borderRadius: 'var(--radius-sm)', 
                border: '1px solid var(--border-color)', 
                background: 'var(--bg-app)', 
                color: 'var(--text-main)',
                fontSize: '0.9rem',
                outline: 'none',
                cursor: 'pointer',
                minWidth: '130px'
              }}
            >
              <option value="">All Tags</option>
              {reusableTags.map(tag => (
                <option key={tag} value={tag}>{tag}</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <button 
              className={`btn ${viewMode === 'grid' ? 'btn-primary' : 'btn-outline'}`}
              style={{ padding: '0.5rem 0.75rem' }}
              onClick={() => setViewMode('grid')}
              title="Grid View"
            >
              <Grid size={18} />
            </button>
            <button 
              className={`btn ${viewMode === 'list' ? 'btn-primary' : 'btn-outline'}`}
              style={{ padding: '0.5rem 0.75rem' }}
              onClick={() => setViewMode('list')}
              title="List View"
            >
              <List size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Bulk Select Bar */}
      {selectedIds.length > 0 && (
        <div 
          className="card animate-slide-up" 
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between', 
            padding: '1rem 1.5rem', 
            marginBottom: '1.5rem', 
            border: '1px solid var(--primary)', 
            background: 'var(--primary-light)',
            flexWrap: 'wrap',
            gap: '1rem',
            color: 'var(--primary-foreground)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <input 
              type="checkbox" 
              checked={filteredRecipes.length > 0 && selectedIds.length === filteredRecipes.length}
              onChange={toggleSelectAll}
              style={{ width: '18px', height: '18px', cursor: 'pointer' }}
            />
            <span style={{ fontWeight: '600' }}>
              {selectedIds.length} recipe{selectedIds.length > 1 ? 's' : ''} selected
            </span>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button className="btn btn-outline" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }} onClick={handleBulkExport}>
              <Download size={16} /> Bulk Export (.zip)
            </button>
            {canWrite && (
              <button 
                className="btn btn-secondary" 
                style={{ padding: '0.5rem 1rem', fontSize: '0.85rem', color: 'var(--danger)' }} 
                onClick={handleBulkDelete}
              >
                <Trash2 size={16} /> Bulk Delete
              </button>
            )}
            <button className="btn btn-outline" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }} onClick={() => setSelectedIds([])}>
              Clear Selection
            </button>
          </div>
        </div>
      )}

      {/* Recipes Rendering */}
      {loading ? (
        <div className="grid-3">
          {[1, 2, 3].map(n => (
            <div key={n} className="card" style={{ height: '320px' }}>
              <div className="shimmer-loader" style={{ height: '200px', margin: '-1.75rem -1.75rem 1rem -1.75rem' }} />
              <div className="shimmer-loader" style={{ height: '24px', width: '70%', marginBottom: '0.75rem' }} />
              <div className="shimmer-loader" style={{ height: '16px', width: '40%' }} />
            </div>
          ))}
        </div>
      ) : filteredRecipes.length === 0 ? (
        <div className="card text-center" style={{ padding: '3rem 2rem' }}>
          <BookOpen size={48} style={{ color: 'var(--text-muted)', marginBottom: '1rem', opacity: 0.5 }} />
          <h3>No Recipes Found</h3>
          <p style={{ color: 'var(--text-muted)' }}>
            {searchQuery || selectedTagFilter ? 'Try modifying your filters.' : 'Get started by creating your first recipe!'}
          </p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid-3">
          {filteredRecipes.map(recipe => (
            <div 
              key={recipe.id} 
              className="card recipe-card hover-glow" 
              style={{ cursor: 'pointer', position: 'relative' }}
              onClick={() => loadRecipeDetails(recipe.id)}
            >
              {canWrite && (
                <div style={{ position: 'absolute', top: '10px', left: '10px', zIndex: 10 }}>
                  <input 
                    type="checkbox" 
                    checked={selectedIds.includes(recipe.id)}
                    onChange={(e) => handleSelectRecipe(recipe.id, e)}
                    onClick={(e) => e.stopPropagation()}
                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                  />
                </div>
              )}

              <button 
                className="btn-icon" 
                style={{ 
                  position: 'absolute', 
                  top: '10px', 
                  right: '10px', 
                  zIndex: 10,
                  background: 'rgba(9, 9, 11, 0.4)',
                  backdropFilter: 'blur(4px)',
                  color: recipe.favorite ? '#f1c40f' : '#fff'
                }}
                onClick={(e) => handleToggleFavorite(recipe.id, e)}
              >
                <Star size={16} fill={recipe.favorite ? '#f1c40f' : 'transparent'} />
              </button>

              {recipe.image_path ? (
                <img src={recipe.image_path} alt={recipe.title} className="recipe-card-img" />
              ) : (
                <div className="recipe-placeholder-img">🍳</div>
              )}

              <h3 style={{ marginTop: '0.5rem', marginBottom: '0.25rem' }}>{recipe.title}</h3>
              <p className="text-muted text-sm" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', minHeight: '36px' }}>
                {recipe.description || 'No description provided.'}
              </p>

              <div className="recipe-meta-badges">
                {recipe.prep_time && (
                  <span className="badge badge-primary">
                    <Clock size={12} /> {recipe.prep_time}m prep
                  </span>
                )}
                {recipe.cook_time && (
                  <span className="badge badge-primary">
                    <Clock size={12} /> {recipe.cook_time}m cook
                  </span>
                )}
                {recipe.servings && (
                  <span className="badge badge-primary">
                    <Users size={12} /> {recipe.servings} serv
                  </span>
                )}
              </div>

              {recipe.tags && (
                <div style={{ marginTop: '0.75rem', display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
                  {recipe.tags.split(',').map((tag, idx) => (
                    <span key={idx} style={{ fontSize: '0.7rem', color: 'var(--text-muted)', background: 'var(--bg-app)', padding: '0.15rem 0.4rem', borderRadius: '4px' }}>
                      #{tag.trim()}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        /* List View */
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  {canWrite && <th style={{ width: '40px' }}><input type="checkbox" checked={selectedIds.length === filteredRecipes.length} onChange={toggleSelectAll} /></th>}
                  <th>Favorite</th>
                  <th>Title</th>
                  <th>Prep Time</th>
                  <th>Cook Time</th>
                  <th>Servings</th>
                  <th>Tags</th>
                  {canWrite && <th className="text-right">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {filteredRecipes.map(recipe => (
                  <tr key={recipe.id} onClick={() => loadRecipeDetails(recipe.id)} style={{ cursor: 'pointer' }}>
                    {canWrite && (
                      <td onClick={(e) => e.stopPropagation()}>
                        <input type="checkbox" checked={selectedIds.includes(recipe.id)} onChange={(e) => handleSelectRecipe(recipe.id, e)} />
                      </td>
                    )}
                    <td onClick={(e) => handleToggleFavorite(recipe.id, e)}>
                      <Star size={16} fill={recipe.favorite ? '#f1c40f' : 'transparent'} style={{ color: recipe.favorite ? '#f1c40f' : 'var(--text-muted)' }} />
                    </td>
                    <td><strong>{recipe.title}</strong></td>
                    <td>{recipe.prep_time ? `${recipe.prep_time}m` : '-'}</td>
                    <td>{recipe.cook_time ? `${recipe.cook_time}m` : '-'}</td>
                    <td>{recipe.servings || '-'}</td>
                    <td>{recipe.tags || '-'}</td>
                    {canWrite && (
                      <td className="text-right" onClick={(e) => e.stopPropagation()}>
                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                          <button className="btn btn-outline btn-sm" style={{ padding: '0.25rem 0.5rem' }} onClick={(e) => openEditForm(recipe, e)}><Edit2 size={12} /></button>
                          <button className="btn btn-outline btn-sm" style={{ padding: '0.25rem 0.5rem', color: 'var(--danger)' }} onClick={(e) => handleDeleteRecipe(recipe.id, e)}><Trash2 size={12} /></button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Recipe Detail Modal */}
      {currentRecipe && (
        <div className="modal-overlay" onClick={() => setCurrentRecipe(null)}>
          <div className="modal-content recipe-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 style={{ fontSize: '1.35rem', fontWeight: 700, margin: 0, wordBreak: 'break-word' }}>{currentRecipe.title}</h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0 }}>
                <button 
                  className="btn-icon"
                  style={{ background: 'transparent', border: 'none', color: currentRecipe.favorite ? '#f1c40f' : 'var(--text-muted)' }}
                  onClick={(e) => handleToggleFavorite(currentRecipe.id, e)}
                  title={currentRecipe.favorite ? 'Unmark Favorite' : 'Mark Favorite'}
                >
                  <Star size={18} fill={currentRecipe.favorite ? '#f1c40f' : 'transparent'} />
                </button>
                {canWrite && (
                  <button className="btn btn-outline btn-sm" style={{ padding: '0.4rem 0.6rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }} onClick={(e) => openEditForm(currentRecipe, e)}>
                    <Edit2 size={14} /> Edit
                  </button>
                )}
                <button className="btn-icon close-btn" style={{ background: 'transparent', border: 'none' }} onClick={() => setCurrentRecipe(null)} title="Close">
                  <X size={20} />
                </button>
              </div>
            </div>
            
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', overflowY: 'auto', paddingBottom: '2.5rem' }}>
              {currentRecipe.image_path ? (
                <img 
                  src={currentRecipe.image_path} 
                  alt={currentRecipe.title} 
                  style={{ width: '100%', maxHeight: '320px', objectFit: 'cover', borderRadius: 'var(--radius)' }} 
                />
              ) : (
                <div style={{ width: '100%', height: '120px', background: 'linear-gradient(135deg, var(--primary-light), var(--accent))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.75rem', borderRadius: 'var(--radius)' }}>🍳</div>
              )}

              {currentRecipe.description && (
                <p style={{ fontSize: '1.05rem', lineHeight: '1.6', margin: 0, color: 'var(--foreground)' }}>{currentRecipe.description}</p>
              )}

              {/* Recipe Meta Stats */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '1rem' }}>
                <div className="card text-center" style={{ padding: '0.85rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}>
                  <Clock size={20} style={{ color: 'var(--primary)' }} />
                  <span className="text-muted text-sm" style={{ display: 'block' }}>Prep Time</span>
                  <strong style={{ fontSize: '1rem' }}>{currentRecipe.prep_time ? `${currentRecipe.prep_time} mins` : 'N/A'}</strong>
                </div>
                <div className="card text-center" style={{ padding: '0.85rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}>
                  <Clock size={20} style={{ color: 'var(--primary)' }} />
                  <span className="text-muted text-sm" style={{ display: 'block' }}>Cook Time</span>
                  <strong style={{ fontSize: '1rem' }}>{currentRecipe.cook_time ? `${currentRecipe.cook_time} mins` : 'N/A'}</strong>
                </div>
                <div className="card text-center" style={{ padding: '0.85rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}>
                  <Users size={20} style={{ color: 'var(--primary)' }} />
                  <span className="text-muted text-sm" style={{ display: 'block' }}>Servings</span>
                  <strong style={{ fontSize: '1rem' }}>{currentRecipe.servings ? `${currentRecipe.servings} portions` : 'N/A'}</strong>
                </div>
              </div>

              {/* Ingredients and Instructions Side-by-Side */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', alignItems: 'start' }}>
                {/* Ingredients Pane */}
                <div className="card" style={{ padding: '1.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Ingredients</h3>
                    <button 
                      className="btn btn-outline btn-sm" 
                      style={{ fontSize: '0.78rem', padding: '0.3rem 0.6rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                      onClick={() => handleAddRecipeClick(currentRecipe)}
                    >
                      <ShoppingCart size={13} /> Add ingredients to List
                    </button>
                  </div>
                  <ul style={{ listStyleType: 'none', paddingLeft: 0, margin: 0, display: 'flex', flexDirection: 'column' }}>
                    {currentRecipe.ingredients?.map((ing, idx) => (
                      <li key={idx} style={{ padding: '0.55rem 0', borderBottom: idx < currentRecipe.ingredients.length - 1 ? '1px solid var(--border)' : 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
                        <span style={{ flex: 1, wordBreak: 'break-word', fontSize: '0.92rem' }}>{ing.name}</span>
                        <span style={{ fontWeight: '600', color: 'var(--primary)', whiteSpace: 'nowrap', textAlign: 'right', fontSize: '0.92rem' }}>
                          {ing.amount} {ing.unit}
                        </span>
                      </li>
                    ))}
                    {(!currentRecipe.ingredients || currentRecipe.ingredients.length === 0) && (
                      <li style={{ color: 'var(--text-muted)', fontSize: '0.88rem', fontStyle: 'italic', padding: '0.5rem 0' }}>No ingredients listed.</li>
                    )}
                  </ul>
                </div>

                {/* Instructions Pane */}
                <div className="card" style={{ padding: '1.25rem' }}>
                  <h3 style={{ marginTop: 0, marginBottom: '1rem', fontSize: '1.1rem' }}>Instructions</h3>
                  <ol style={{ paddingLeft: '1.25rem', margin: 0, display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                    {currentRecipe.instructions?.map((inst, idx) => (
                      <li key={idx} style={{ paddingBottom: idx < currentRecipe.instructions.length - 1 ? '0.65rem' : 0, borderBottom: idx < currentRecipe.instructions.length - 1 ? '1px dashed var(--border)' : 'none', lineHeight: '1.6', fontSize: '0.92rem' }}>
                        {inst.instruction_text}
                      </li>
                    ))}
                    {(!currentRecipe.instructions || currentRecipe.instructions.length === 0) && (
                      <li style={{ color: 'var(--text-muted)', fontSize: '0.88rem', fontStyle: 'italic', listStyleType: 'none', marginLeft: '-1.25rem' }}>No instructions listed.</li>
                    )}
                  </ol>
                </div>
              </div>

              {/* Template Export Selector */}
              {templates.length > 0 && (
                <div className="card" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', flexShrink: 0, minHeight: 'fit-content' }}>
                  <div>
                    <strong style={{ fontSize: '1rem' }}>Export Recipe to Word</strong>
                    <p className="text-muted text-sm" style={{ margin: '0.25rem 0 0 0' }}>Select a template to generate a structured document.</p>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                    <select 
                      value={defaultTemplateId}
                      onChange={(e) => setDefaultTemplateId(e.target.value)}
                      className="input-control"
                      style={{ minWidth: '160px', height: '2.5rem' }}
                    >
                      {templates.map(t => (
                        <option key={t.id} value={t.id}>{t.name} {t.is_default ? '(Default)' : ''}</option>
                      ))}
                    </select>
                    <button className="btn btn-outline" style={{ height: '2.5rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }} onClick={() => handleExportWord(currentRecipe.id)}>
                      <Download size={16} /> Export
                    </button>
                  </div>
                </div>
              )}
            </div>
            
            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div>
                {currentRecipe.source_url && (
                  <a href={currentRecipe.source_url} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover-underline">
                    View Recipe Source Link
                  </a>
                )}
              </div>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                {canWrite && (
                  <button className="btn btn-secondary" style={{ color: 'var(--danger)' }} onClick={() => handleDeleteRecipe(currentRecipe.id)}>
                    Delete Recipe
                  </button>
                )}
                <button className="btn btn-outline" onClick={() => setCurrentRecipe(null)}>Close</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Recipe Create/Edit Form Modal */}
      {isFormOpen && (
        <div className="modal-overlay" onClick={() => setIsFormOpen(false)}>
          <div className="modal-content recipe-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editRecipe ? 'Edit Recipe' : 'Add New Recipe'}</h2>
              <button className="btn-icon close-btn" style={{ background: 'transparent', border: 'none' }} onClick={() => setIsFormOpen(false)} title="Close"><X size={20} /></button>
            </div>
            <div className="modal-body" style={{ maxHeight: '80vh', overflowY: 'auto' }}>
              <RecipeForm 
                recipe={editRecipe} 
                onSuccess={handleFormSuccess} 
                onCancel={() => setIsFormOpen(false)}
                showToast={showToast} 
              />
            </div>
          </div>
        </div>
      )}

      {/* Add Recipe ingredients to Shopping List picker modal */}
      {promptListRecipe && (
        <div className="modal-overlay" style={{ zIndex: 10001 }} onClick={() => setPromptListRecipe(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '460px', width: '90vw', height: 'auto', maxHeight: '90vh' }}>
            <form onSubmit={handleConfirmAddToList}>
              <div className="modal-header">
                <h2>Add to Shopping List</h2>
                <button className="btn-icon close-btn" style={{ background: 'transparent', border: 'none' }} type="button" onClick={() => setPromptListRecipe(null)} title="Close"><X size={20} /></button>
              </div>
              <div className="modal-body">
                <p>Choose which shopping list to add ingredients from <strong>"{promptListRecipe.title}"</strong> to:</p>
                <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                  <label>Select List</label>
                  <select
                    className="input-control"
                    value={selectedPromptListId}
                    onChange={(e) => setSelectedPromptListId(e.target.value)}
                    required
                  >
                    <option value="" disabled>-- Select List --</option>
                    {promptLists.filter(l => l.permission === 'owner' || l.permission === 'edit').map(list => (
                      <option key={list.id} value={list.id}>{list.name} ({list.permission})</option>
                    ))}
                    <option value="new">+ Create New List...</option>
                  </select>
                </div>

                {selectedPromptListId === 'new' && (
                  <div className="form-group animate-fade-in" style={{ marginBottom: '1.25rem' }}>
                    <label>New List Name</label>
                    <input 
                      type="text" 
                      className="input-control" 
                      placeholder="e.g. Grocery Run" 
                      value={newListNameInPrompt} 
                      onChange={(e) => setNewListNameInPrompt(e.target.value)}
                      required 
                    />
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button className="btn btn-outline" type="button" onClick={() => setPromptListRecipe(null)}>Cancel</button>
                <button className="btn btn-primary" type="submit" disabled={!selectedPromptListId || (selectedPromptListId === 'new' && !newListNameInPrompt.trim())}>
                  Add Ingredients
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
