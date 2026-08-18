import React, { useState, useEffect } from 'react';
import { ShoppingCart, Check, Plus, Trash2, Printer, RefreshCw, Edit2, Share2, Users, UserPlus } from 'lucide-react';

const CATEGORIES = ['Produce', 'Meat & Seafood', 'Dairy & Eggs', 'Pantry', 'Bakery', 'Frozen', 'Other'];

export default function ShoppingList({ showToast, user }) {
  const [lists, setLists] = useState([]);
  const [activeListId, setActiveListId] = useState(null);
  const [listDetails, setListDetails] = useState(null);
  const [loading, setLoading] = useState(true);

  // Sharing users
  const [sharingUsers, setSharingUsers] = useState([]);

  // Modals visibility & input states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newListName, setNewListName] = useState('');

  const [isRenameModalOpen, setIsRenameModalOpen] = useState(false);
  const [renameListName, setRenameListName] = useState('');

  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [shareUserId, setShareUserId] = useState('');
  const [sharePermission, setSharePermission] = useState('view');

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customAmount, setCustomAmount] = useState('');
  const [customUnit, setCustomUnit] = useState('');
  const [customCategory, setCustomCategory] = useState('Other');

  // Edit Modal states
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null); // The database item record
  const [editName, setEditName] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [editUnit, setEditUnit] = useState('');
  const [editCategory, setEditCategory] = useState('Other');

  // Load lists on mount
  useEffect(() => {
    loadLists();
    loadSharingUsers();

    const handleAddTrigger = (e) => {
      if (e.detail.tab === 'shopping') {
        setIsAddModalOpen(true);
      }
    };
    window.addEventListener('trigger-add-action', handleAddTrigger);
    return () => {
      window.removeEventListener('trigger-add-action', handleAddTrigger);
    };
  }, []);

  // Reload details when activeListId changes
  useEffect(() => {
    if (activeListId) {
      loadListDetails(activeListId);
    } else {
      setListDetails(null);
    }
  }, [activeListId]);

  const loadLists = async (defaultIdToSelect = null) => {
    try {
      const res = await fetch('/api/shopping-lists');
      if (!res.ok) throw new Error('Failed to load shopping lists');
      const data = await res.json();
      setLists(data);

      if (data.length > 0) {
        let idToSelect = defaultIdToSelect;
        if (!idToSelect) {
          const savedId = localStorage.getItem('active_shopping_list_id');
          if (savedId && data.some(l => String(l.id) === String(savedId))) {
            idToSelect = parseInt(savedId);
          } else {
            idToSelect = data[0].id;
          }
        }
        setActiveListId(idToSelect);
        localStorage.setItem('active_shopping_list_id', idToSelect);
      } else {
        // Auto-create a default list if none exist
        const createRes = await fetch('/api/shopping-lists', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: 'My Shopping List' })
        });
        if (createRes.ok) {
          const createData = await createRes.json();
          loadLists(createData.id);
        } else {
          setActiveListId(null);
          setListDetails(null);
        }
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const loadListDetails = async (id) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/shopping-lists/${id}`);
      if (!res.ok) throw new Error('Failed to load shopping list details');
      const data = await res.json();
      setListDetails(data);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadSharingUsers = async () => {
    try {
      const res = await fetch('/api/users/list-sharing');
      if (res.ok) {
        const data = await res.json();
        setSharingUsers(data);
      }
    } catch (err) {
      console.error('Failed to load sharing users:', err);
    }
  };

  // Helper to parse amount to float
  const parseAmountFloat = (amt) => {
    if (!amt) return null;
    const str = String(amt).trim();
    if (!str) return null;

    let val = str;
    const uniFractions = { '½': '0.5', '⅓': '0.33', '⅔': '0.66', '¼': '0.25', '¾': '0.75' };
    for (const [uni, asc] of Object.entries(uniFractions)) {
      val = val.replace(uni, asc);
    }

    if (val.includes('-')) {
      val = val.split('-')[0].trim();
    }

    if (val.includes('/')) {
      const parts = val.split(/\s+/);
      let total = 0;
      for (const part of parts) {
        if (part.includes('/')) {
          const [num, den] = part.split('/').map(Number);
          if (den) total += num / den;
        } else {
          total += Number(part) || 0;
        }
      }
      return total;
    }

    return parseFloat(val) || null;
  };

  // Auto-add to inventory when item is checked
  const handleAddToInventory = async (item) => {
    try {
      const sizeNumber = parseAmountFloat(item.amount);
      const todayStr = new Date().toISOString().split('T')[0];

      const payload = {
        title: item.name,
        category: item.category || 'Other',
        date_added: todayStr,
        expiration_date: null,
        percentage_used: 0,
        size_number: sizeNumber,
        size_unit: item.unit || null
      };

      const res = await fetch('/api/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        showToast(`Auto-added "${item.name}" to Kitchen Inventory`);
      } else {
        const err = await res.json();
        console.error('Failed to auto-add to inventory:', err.error);
      }
    } catch (err) {
      console.error('Error auto-adding to inventory:', err);
    }
  };

  const handleCreateList = async (e) => {
    e.preventDefault();
    if (!newListName.trim()) return;

    try {
      const res = await fetch('/api/shopping-lists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newListName.trim() })
      });
      if (!res.ok) throw new Error('Failed to create shopping list');
      const data = await res.json();
      showToast(`Shopping list "${newListName}" created.`);
      setNewListName('');
      setIsCreateModalOpen(false);
      loadLists(data.id);
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleRenameList = async (e) => {
    e.preventDefault();
    if (!renameListName.trim() || !activeListId) return;

    try {
      const res = await fetch(`/api/shopping-lists/${activeListId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: renameListName.trim() })
      });
      if (!res.ok) throw new Error('Failed to rename shopping list');
      showToast(`Shopping list renamed to "${renameListName}".`);
      setIsRenameModalOpen(false);
      loadLists(activeListId);
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleDeleteList = async () => {
    if (!activeListId || !listDetails) return;
    if (!window.confirm(`Are you sure you want to delete the shopping list "${listDetails.list.name}"? This action cannot be undone.`)) return;

    try {
      const res = await fetch(`/api/shopping-lists/${activeListId}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error('Failed to delete shopping list');
      showToast(`Deleted shopping list "${listDetails.list.name}".`);
      
      // Clear local storage and reload lists
      localStorage.removeItem('active_shopping_list_id');
      loadLists();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleShareList = async (e) => {
    e.preventDefault();
    if (!shareUserId || !activeListId) return;

    try {
      const res = await fetch(`/api/shopping-lists/${activeListId}/shares`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shared_with_user_id: parseInt(shareUserId),
          permission: sharePermission
        })
      });
      if (!res.ok) throw new Error('Failed to share shopping list');
      showToast('List shared successfully.');
      setShareUserId('');
      loadListDetails(activeListId);
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleRevokeShare = async (shareId) => {
    if (!activeListId) return;
    if (!window.confirm('Are you sure you want to revoke this sharing permission?')) return;

    try {
      const res = await fetch(`/api/shopping-lists/${activeListId}/shares/${shareId}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error('Failed to revoke sharing permission');
      showToast('Revoked share permission.');
      loadListDetails(activeListId);
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const toggleCheck = async (item) => {
    const isNowChecked = item.is_checked === 1 ? 0 : 1;

    // Fast UI update
    setListDetails(prev => ({
      ...prev,
      items: prev.items.map(i => i.id === item.id ? { ...i, is_checked: isNowChecked } : i)
    }));

    try {
      const res = await fetch(`/api/shopping-lists/${activeListId}/items/${item.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_checked: isNowChecked })
      });
      if (!res.ok) throw new Error('Failed to toggle item check status');

      if (isNowChecked === 1) {
        handleAddToInventory(item);
      }
    } catch (err) {
      showToast(err.message, 'error');
      // Revert UI on failure
      setListDetails(prev => ({
        ...prev,
        items: prev.items.map(i => i.id === item.id ? { ...i, is_checked: item.is_checked } : i)
      }));
    }
  };

  const handleAddCustomItem = async (e) => {
    e.preventDefault();
    if (!customName.trim() || !activeListId) return;

    try {
      const res = await fetch(`/api/shopping-lists/${activeListId}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: customName.trim(),
          amount: customAmount.trim(),
          unit: customUnit.trim(),
          category: customCategory,
          is_checked: false
        })
      });
      if (!res.ok) throw new Error('Failed to add custom item');
      showToast(`Added custom item: ${customName}`);
      
      setCustomName('');
      setCustomAmount('');
      setCustomUnit('');
      setCustomCategory('Other');
      setIsAddModalOpen(false);
      loadListDetails(activeListId);
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleRemoveItem = async (itemId, itemName, e) => {
    if (e) e.stopPropagation();
    if (!activeListId) return;

    try {
      const res = await fetch(`/api/shopping-lists/${activeListId}/items/${itemId}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error('Failed to delete item');
      showToast(`Removed "${itemName}"`);
      loadListDetails(activeListId);
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleRemoveManualRecipe = async (recipeId, title, e) => {
    if (e) e.stopPropagation();
    if (!activeListId) return;

    try {
      const res = await fetch(`/api/shopping-lists/${activeListId}/recipes/${recipeId}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error('Failed to remove recipe ingredients');
      showToast(`Removed "${title}" ingredients from list.`);
      loadListDetails(activeListId);
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleEditClick = (item, e) => {
    if (e) e.stopPropagation();
    setEditingItem(item);
    setEditName(item.name);
    setEditAmount(item.amount || '');
    setEditUnit(item.unit || '');
    setEditCategory(item.category || 'Other');
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingItem || !editName.trim() || !activeListId) return;

    try {
      const res = await fetch(`/api/shopping-lists/${activeListId}/items/${editingItem.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editName.trim(),
          amount: editAmount.trim(),
          unit: editUnit.trim(),
          category: editCategory
        })
      });
      if (!res.ok) throw new Error('Failed to update item');
      showToast(`Updated item: ${editName}`);
      setIsEditModalOpen(false);
      setEditingItem(null);
      loadListDetails(activeListId);
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleResetList = async () => {
    if (!activeListId || !listDetails) return;
    if (!window.confirm(`Are you sure you want to clear "${listDetails.list.name}"? This will delete all ingredients and custom items in this list.`)) return;

    try {
      const res = await fetch(`/api/shopping-lists/${activeListId}/reset`, {
        method: 'POST'
      });
      if (!res.ok) throw new Error('Failed to clear list');
      showToast('List cleared successfully.');
      loadListDetails(activeListId);
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleImportWeeklyMenu = async () => {
    if (!activeListId || !listDetails) return;
    setLoading(true);
    try {
      const res = await fetch('/api/menu');
      if (!res.ok) throw new Error('Failed to load weekly planner menu');
      const menuData = await res.json();

      const recipeIds = menuData
        .filter(m => m.recipe_id)
        .map(m => m.recipe_id);

      if (recipeIds.length === 0) {
        showToast('No recipes found in the weekly planner menu to import.', 'info');
        setLoading(false);
        return;
      }

      const uniqueRecipeIds = [...new Set(recipeIds)];
      let importedCount = 0;

      for (const rId of uniqueRecipeIds) {
        // Only link recipes that aren't already linked to the list
        if (listDetails.recipes.some(r => r.recipe_id === rId)) {
          continue;
        }

        const postRes = await fetch(`/api/shopping-lists/${activeListId}/recipes`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ recipe_id: rId })
        });
        if (postRes.ok) {
          importedCount++;
        }
      }

      if (importedCount > 0) {
        showToast(`Imported ${importedCount} recipe(s) from weekly menu.`);
        loadListDetails(activeListId);
      } else {
        showToast('All weekly menu recipes are already imported to this list.', 'info');
      }
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // Compute values
  const listItems = listDetails?.items || [];
  const manualRecipes = listDetails?.recipes || [];
  const isOwner = listDetails?.list?.permission === 'owner';
  const isEditable = isOwner || listDetails?.list?.permission === 'edit';

  const groupedItems = {};
  CATEGORIES.forEach(cat => {
    groupedItems[cat] = [];
  });

  listItems.forEach(item => {
    const cat = item.category || 'Other';
    if (groupedItems[cat]) {
      groupedItems[cat].push(item);
    } else {
      groupedItems['Other'].push(item);
    }
  });

  const totalItems = listItems.length;
  const totalChecked = listItems.filter(item => item.is_checked === 1).length;

  return (
    <div className="animate-fade-in print-area">
      {/* Dropdown Selector Header */}
      <div className="content-header no-print" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <h2>Shopping List</h2>
            
            <div style={{ position: 'relative' }}>
              <select
                className="input-control"
                value={activeListId || ''}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val) {
                    setActiveListId(parseInt(val));
                    localStorage.setItem('active_shopping_list_id', val);
                  }
                }}
                style={{
                  minWidth: '220px',
                  background: 'var(--bg-card)',
                  color: 'var(--text-main)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  padding: '0.5rem 2rem 0.5rem 1rem',
                  cursor: 'pointer',
                  fontWeight: '600'
                }}
              >
                {lists.length === 0 && <option value="">No lists available</option>}
                {lists.some(l => l.permission === 'owner') && (
                  <optgroup label="My Lists">
                    {lists.filter(l => l.permission === 'owner').map(l => (
                      <option key={l.id} value={l.id}>{l.name}</option>
                    ))}
                  </optgroup>
                )}
                {lists.some(l => l.permission !== 'owner') && (
                  <optgroup label="Shared with Me">
                    {lists.filter(l => l.permission !== 'owner').map(l => (
                      <option key={l.id} value={l.id}>
                        {l.name} ({l.owner_username}'s)
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>
            </div>

            {listDetails?.list && (
              <span className={`badge ${isOwner ? 'badge-primary' : listDetails.list.permission === 'edit' ? 'badge-success' : 'badge-secondary'}`} style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}>
                {isOwner ? 'Owner' : listDetails.list.permission === 'edit' ? 'Can Edit' : 'Read-only'}
              </span>
            )}
          </div>

          <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap' }}>
            <button className="btn btn-outline" onClick={() => setIsCreateModalOpen(true)}>
              <Plus size={18} /> New List
            </button>
            
            {isOwner && (
              <>
                <button className="btn btn-outline" onClick={() => { setRenameListName(listDetails.list.name); setIsRenameModalOpen(true); }} disabled={!activeListId}>
                  Rename
                </button>
                <button className="btn btn-outline" onClick={() => setIsShareModalOpen(true)} disabled={!activeListId}>
                  <Share2 size={18} /> Share
                </button>
                <button 
                  className="btn btn-outline" 
                  style={{ color: 'var(--danger)', borderColor: 'rgba(239, 68, 68, 0.2)' }}
                  onClick={handleDeleteList} 
                  disabled={!activeListId}
                >
                  <Trash2 size={18} /> Delete
                </button>
              </>
            )}
          </div>
        </div>

        {/* Action button toolbar */}
        {listDetails?.list && (
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
            <button className="btn btn-outline" onClick={() => loadListDetails(activeListId)} disabled={loading}>
              <RefreshCw size={18} /> Refresh List
            </button>
            
            {isEditable && (
              <>
                <button className="btn btn-outline" onClick={handleImportWeeklyMenu} disabled={loading}>
                  Import Weekly Menu
                </button>
                <button 
                  className="btn btn-secondary" 
                  onClick={handleResetList} 
                  style={{ color: 'var(--danger)', borderColor: 'rgba(239, 68, 68, 0.2)' }}
                  disabled={loading || totalItems === 0}
                >
                  Clear List
                </button>
              </>
            )}

            <button className="btn btn-primary" onClick={handlePrint} disabled={totalItems === 0}>
              <Printer size={18} /> Print Shopping List
            </button>
          </div>
        )}
      </div>

      {totalItems > 0 && (
        <div className="card no-print" style={{ marginBottom: '2rem', padding: '1rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <strong>Shopping Progress:</strong> {totalChecked} of {totalItems} items completed
          </div>
          <div style={{ width: '200px', height: '8px', background: 'var(--border-color)', borderRadius: '100px', overflow: 'hidden' }}>
            <div 
              style={{ 
                width: `${(totalChecked / totalItems) * 100}%`, 
                height: '100%', 
                background: 'var(--success)', 
                transition: 'width 0.3s ease' 
              }} 
            />
          </div>
        </div>
      )}

      {manualRecipes.length > 0 && (
        <div className="card no-print animate-fade-in" style={{ marginBottom: '2rem', padding: '1.25rem 1.5rem' }}>
          <div style={{ fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '0.65rem', color: 'var(--text-muted)' }}>
            Imported recipes in this shopping list:
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            {manualRecipes.map(mr => (
              <span key={mr.recipe_id} className="badge badge-primary" style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                <span>{mr.recipe_title}</span>
                {isEditable && (
                  <button 
                    onClick={(e) => handleRemoveManualRecipe(mr.recipe_id, mr.recipe_title, e)}
                    style={{ background: 'transparent', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontWeight: 'bold', fontSize: '1.1rem', lineHeight: '1', padding: '0 2px' }}
                    title="Remove ingredients"
                  >
                    ×
                  </button>
                )}
              </span>
            ))}
          </div>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem 2rem' }}>
          <RefreshCw size={36} className="spinner" style={{ margin: '0 auto 1rem auto' }} />
          <p>Consolidating ingredients...</p>
        </div>
      ) : totalItems === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
          <ShoppingCart size={48} style={{ color: 'var(--primary)', marginBottom: '1rem', opacity: 0.6 }} />
          <h3>Shopping List is Empty</h3>
          <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem', marginBottom: '1.5rem' }}>
            {isEditable 
              ? 'Add items manually or import recipes.'
              : 'This shared list has no items and you do not have permissions to add them.'}
          </p>
        </div>
      ) : (
        /* Checklist items */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem', width: '100%' }}>
          {CATEGORIES.map(category => {
            const items = groupedItems[category];
            if (items.length === 0) return null;

            return (
              <div key={category}>
                <h3 
                  style={{ 
                    fontSize: '1.15rem', 
                    marginBottom: '0.85rem', 
                    borderBottom: '2px solid var(--border-color)', 
                    paddingBottom: '0.35rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem' 
                  }}
                >
                  <span>{category}</span>
                  <span 
                    style={{ 
                      fontSize: '0.75rem', 
                      background: 'var(--primary-light)', 
                      color: 'var(--primary)', 
                      padding: '0.1rem 0.5rem', 
                      borderRadius: '100px', 
                      fontWeight: '700' 
                    }}
                  >
                    {items.length}
                  </span>
                </h3>

                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {items.map(item => {
                    const isChecked = item.is_checked === 1;
                    return (
                      <div 
                        key={item.id}
                        className={`shopping-list-item ${isChecked ? 'checked' : ''}`}
                        onClick={() => isEditable && toggleCheck(item)}
                        style={{ cursor: isEditable ? 'pointer' : 'default' }}
                      >
                        <div className="shopping-list-checkbox">
                          <span 
                            style={{ 
                              width: '20px', 
                              height: '20px', 
                              border: `2px solid ${isChecked ? 'var(--success)' : 'var(--border-color)'}`, 
                              borderRadius: '4px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              background: isChecked ? 'var(--success)' : 'transparent',
                              transition: 'all 0.1s ease',
                              color: '#ffffff',
                              opacity: isEditable ? 1 : 0.6
                            }}
                          >
                            {isChecked && <Check size={14} strokeWidth={3} />}
                          </span>
                          <div>
                            <strong style={{ fontSize: '0.95rem', textDecoration: isChecked ? 'line-through' : 'none', opacity: isChecked ? 0.6 : 1 }}>
                              {item.amount} {item.unit} {item.name}
                            </strong>
                            {item.raw_text && (
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }} className="no-print">
                                {item.raw_text}
                              </div>
                            )}
                          </div>
                        </div>

                        <div style={{ display: 'inline-flex', gap: '0.25rem' }} className="no-print" onClick={(e) => e.stopPropagation()}>
                          {isEditable && (
                            <>
                              <button 
                                className="btn btn-outline" 
                                style={{ padding: '0.25rem 0.4rem', border: 'none', background: 'transparent' }} 
                                onClick={(e) => handleEditClick(item, e)}
                                title="Edit Item"
                              >
                                <Edit2 size={14} style={{ color: 'var(--primary)' }} />
                              </button>
                              <button 
                                className="btn btn-outline" 
                                style={{ padding: '0.25rem 0.4rem', border: 'none', background: 'transparent' }} 
                                onClick={(e) => handleRemoveItem(item.id, item.name, e)}
                                title="Delete Item"
                              >
                                <Trash2 size={14} style={{ color: 'var(--danger)' }} />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create List Modal */}
      {isCreateModalOpen && (
        <div className="modal-overlay" onClick={() => setIsCreateModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.2rem' }}>Create New Shopping List</h3>
              <button className="close-btn" style={{ fontSize: '1.5rem' }} onClick={() => setIsCreateModalOpen(false)}>×</button>
            </div>
            <div className="modal-body" style={{ padding: '1.5rem' }}>
              <form onSubmit={handleCreateList} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div className="form-group">
                  <label htmlFor="list-name">List Name *</label>
                  <input 
                    id="list-name"
                    type="text" 
                    className="input-control" 
                    placeholder="e.g. Costco Run" 
                    value={newListName}
                    onChange={(e) => setNewListName(e.target.value)}
                    required 
                    autoFocus
                  />
                </div>
                <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '0.5rem' }}>
                  Create List
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Rename List Modal */}
      {isRenameModalOpen && (
        <div className="modal-overlay" onClick={() => setIsRenameModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.2rem' }}>Rename Shopping List</h3>
              <button className="close-btn" style={{ fontSize: '1.5rem' }} onClick={() => setIsRenameModalOpen(false)}>×</button>
            </div>
            <div className="modal-body" style={{ padding: '1.5rem' }}>
              <form onSubmit={handleRenameList} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div className="form-group">
                  <label htmlFor="rename-list-name">List Name *</label>
                  <input 
                    id="rename-list-name"
                    type="text" 
                    className="input-control" 
                    value={renameListName}
                    onChange={(e) => setRenameListName(e.target.value)}
                    required 
                    autoFocus
                  />
                </div>
                <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '0.5rem' }}>
                  Save Changes
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Share List Modal */}
      {isShareModalOpen && listDetails && (
        <div className="modal-overlay" onClick={() => setIsShareModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Share2 size={20} /> Share "{listDetails.list.name}"
              </h3>
              <button className="close-btn" style={{ fontSize: '1.5rem' }} onClick={() => setIsShareModalOpen(false)}>×</button>
            </div>
            <div className="modal-body" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              
              {/* Share with new user */}
              <form onSubmit={handleShareList} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1.5rem' }}>
                <h4 style={{ fontSize: '1rem', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <UserPlus size={16} /> Share with someone
                </h4>
                <div className="grid-2-col" style={{ gridTemplateColumns: '2fr 1fr' }}>
                  <div className="form-group">
                    <label htmlFor="share-user">User</label>
                    <select
                      id="share-user"
                      className="input-control"
                      value={shareUserId}
                      onChange={(e) => setShareUserId(e.target.value)}
                      required
                      style={{ background: 'var(--bg-app)', color: 'var(--text-main)' }}
                    >
                      <option value="">Select user...</option>
                      {sharingUsers.map(su => (
                        <option key={su.id} value={su.id}>{su.username}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label htmlFor="share-permission">Permission</label>
                    <select
                      id="share-permission"
                      className="input-control"
                      value={sharePermission}
                      onChange={(e) => setSharePermission(e.target.value)}
                      style={{ background: 'var(--bg-app)', color: 'var(--text-main)' }}
                    >
                      <option value="view">View</option>
                      <option value="edit">Edit</option>
                    </select>
                  </div>
                </div>
                <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={!shareUserId}>
                  Share Access
                </button>
              </form>

              {/* Currently Shared Users list */}
              <div>
                <h4 style={{ fontSize: '1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Users size={16} /> Currently Shared With
                </h4>
                {listDetails.shares && listDetails.shares.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', textAlign: 'center', margin: '1rem 0' }}>
                    This list is not shared with anyone yet.
                  </p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {listDetails.shares && listDetails.shares.map(share => (
                      <div key={share.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-app)', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                        <div>
                          <strong style={{ fontSize: '0.95rem' }}>{share.shared_username}</strong>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'capitalize' }}>
                            {share.permission === 'edit' ? 'Can edit' : 'Read-only'}
                          </div>
                        </div>
                        <button 
                          className="btn btn-outline" 
                          style={{ padding: '0.25rem', border: 'none', background: 'transparent' }} 
                          onClick={() => handleRevokeShare(share.id)}
                          title="Revoke Permission"
                        >
                          <Trash2 size={16} style={{ color: 'var(--danger)' }} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Custom Item Modal */}
      {isAddModalOpen && (
        <div className="modal-overlay" onClick={() => setIsAddModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Add Custom Item</h2>
              <button className="close-btn" onClick={() => setIsAddModalOpen(false)}>×</button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleAddCustomItem} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div className="form-group">
                  <label htmlFor="custom-name">Item Name *</label>
                  <input 
                    id="custom-name"
                    type="text" 
                    className="input-control" 
                    placeholder="e.g. Toilet Paper" 
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    required 
                    autoFocus
                  />
                </div>

                <div className="grid-2-col">
                  <div className="form-group">
                    <label htmlFor="custom-amount">Amount</label>
                    <input 
                      id="custom-amount"
                      type="text" 
                      className="input-control" 
                      placeholder="e.g. 1" 
                      value={customAmount}
                      onChange={(e) => setCustomAmount(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="custom-unit">Unit</label>
                    <input 
                      id="custom-unit"
                      type="text" 
                      className="input-control" 
                      placeholder="e.g. pack" 
                      value={customUnit}
                      onChange={(e) => setCustomUnit(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="custom-category">Department</label>
                  <select 
                    id="custom-category"
                    className="input-control" 
                    value={customCategory}
                    onChange={(e) => setCustomCategory(e.target.value)}
                    style={{ background: 'var(--bg-app)', color: 'var(--text-main)', cursor: 'pointer' }}
                  >
                    {CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', borderTop: '1px solid var(--border)', paddingTop: '0.75rem', marginTop: '0.5rem' }}>
                  <button type="button" className="btn btn-outline" onClick={() => setIsAddModalOpen(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary">Add to List</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit Item Modal */}
      {isEditModalOpen && (
        <div className="modal-overlay" onClick={() => { setIsEditModalOpen(false); setEditingItem(null); }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.2rem' }}>Edit Item</h3>
              <button className="close-btn" style={{ fontSize: '1.5rem' }} onClick={() => { setIsEditModalOpen(false); setEditingItem(null); }}>×</button>
            </div>
            <div className="modal-body" style={{ padding: '1.5rem' }}>
              <form onSubmit={handleSaveEdit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div className="form-group">
                  <label htmlFor="edit-name">Item Name *</label>
                  <input 
                    id="edit-name"
                    type="text" 
                    className="input-control" 
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    required 
                    autoFocus
                  />
                </div>

                <div className="grid-2-col">
                  <div className="form-group">
                    <label htmlFor="edit-amount">Amount</label>
                    <input 
                      id="edit-amount"
                      type="text" 
                      className="input-control" 
                      placeholder="e.g. 1" 
                      value={editAmount}
                      onChange={(e) => setEditAmount(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="edit-unit">Unit</label>
                    <input 
                      id="edit-unit"
                      type="text" 
                      className="input-control" 
                      placeholder="e.g. pack" 
                      value={editUnit}
                      onChange={(e) => setEditUnit(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="edit-category">Department</label>
                  <select 
                    id="edit-category"
                    className="input-control" 
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value)}
                    style={{ background: 'var(--bg-app)', color: 'var(--text-main)', cursor: 'pointer' }}
                  >
                    {CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '0.5rem' }}>
                  Save Changes
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Styled Print CSS overrides */}
      <style>{`
        @media print {
          body {
            background: #ffffff !important;
            color: #000000 !important;
          }
          .no-print {
            display: none !important;
          }
          .print-area {
            width: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          .main-content {
            margin-left: 0 !important;
            width: 100% !important;
            padding: 0 !important;
          }
          .sidebar {
            display: none !important;
          }
          .shopping-list-item {
            border: none !important;
            border-bottom: 1px solid #ccc !important;
            padding: 0.5rem 0 !important;
            page-break-inside: avoid;
          }
          .shopping-list-item.checked {
            display: none !important;
          }
          h3 {
            border-bottom: 2px solid #333 !important;
            margin-top: 1.5rem !important;
            color: #000000 !important;
          }
        }
      `}</style>
    </div>
  );
}
