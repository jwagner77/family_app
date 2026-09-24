import React, { useState, useEffect, useRef } from 'react';
import { Calendar, Plus, Trash2, Download, Search, X, Utensils, RefreshCw, Edit2, Users, Check } from 'lucide-react';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const MEALS = ['Breakfast', 'Lunch', 'Dinner'];

export default function WeeklyMenu({ showToast, handleExportWord, user }) {
  const [menuPlan, setMenuPlan] = useState({});
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);

  // Selector modal state
  const [activeSlot, setActiveSlot] = useState(null); // { day, meal }
  const [searchQuery, setSearchQuery] = useState('');
  const [selectorTab, setSelectorTab] = useState('recipes'); // 'recipes', 'leftovers', or 'custom'
  const [leftovers, setLeftovers] = useState([]);
  const [customMealText, setCustomMealText] = useState('');
  const [assigningRecipe, setAssigningRecipe] = useState(null);
  const [recipeServings, setRecipeServings] = useState(4);
  const [mealTags, setMealTags] = useState('');

  // Edit Meal modal states
  const [editingEntry, setEditingEntry] = useState(null);
  const [editingCustomMealText, setEditingCustomMealText] = useState('');
  const [editingServings, setEditingServings] = useState(4);
  const [editingTags, setEditingTags] = useState('');
  const [editingHasLeftovers, setEditingHasLeftovers] = useState(false);
  const [editingSelectedPeople, setEditingSelectedPeople] = useState([]);
  const [editingIsCustomPerson, setEditingIsCustomPerson] = useState(false);
  const [editingCustomPersonName, setEditingCustomPersonName] = useState('');
  const [editingShowPeopleDropdown, setEditingShowPeopleDropdown] = useState(false);
  const editPeopleDropdownRef = useRef(null);

  // Person assignment and filtering states
  const [assignableUsers, setAssignableUsers] = useState([]);
  const [selectedPeople, setSelectedPeople] = useState([]);
  const [isCustomPersonSelected, setIsCustomPersonSelected] = useState(false);
  const [customPersonName, setCustomPersonName] = useState('');
  const [showPeopleDropdown, setShowPeopleDropdown] = useState(false);
  const [filterMyMeals, setFilterMyMeals] = useState(false);
  const peopleDropdownRef = useRef(null);

  // Autocomplete states
  const [retainedCustomMeals, setRetainedCustomMeals] = useState([]);
  const [retainedTags, setRetainedTags] = useState([]);
  const [activeInputFocus, setActiveInputFocus] = useState(null); // 'customMeal' | 'mealTags' | 'editingTags' | 'editingCustomMeal' | null

  // Calendar sync modal state
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [oidcConfigured, setOidcConfigured] = useState(null);
  const [syncing, setSyncing] = useState(false);

  const getMonday = (d) => {
    const date = new Date(d);
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(date.setDate(diff));
  };

  const formatDate = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const checkOidcStatus = async () => {
    try {
      const res = await fetch('/api/auth/oidc/config');
      if (res.ok) {
        const data = await res.json();
        setOidcConfigured(data.oidc_enabled);
      } else {
        setOidcConfigured(false);
      }
    } catch (err) {
      console.error('Error fetching OIDC config:', err);
      setOidcConfigured(false);
    }
  };

  // Fetch the menu plan
  const fetchMenu = async () => {
    try {
      const res = await fetch('/api/menu');
      if (!res.ok) throw new Error('Failed to load weekly menu');
      const data = await res.json();
      
      // Structure the data as an object: { 'Monday': { 'Breakfast': [], ... } }
      const structured = {};
      DAYS.forEach(day => {
        structured[day] = {};
        MEALS.forEach(meal => {
          structured[day][meal] = [];
        });
      });

      data.forEach(item => {
        if (structured[item.day_of_week]) {
          let mealItem = null;
          if (item.recipe_id !== null) {
            mealItem = {
              type: 'recipe',
              id: item.recipe_id,
              menu_entry_id: item.id,
              title: item.recipe_title,
              image_path: item.recipe_image,
              has_leftovers: item.has_leftovers,
              servings: item.servings,
              tags: item.tags ? item.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
              assigned_people: item.assigned_people ? item.assigned_people.split(',').map(p => p.trim()).filter(Boolean) : []
            };
          } else if (item.leftover_id !== null) {
            mealItem = {
              type: 'leftover',
              id: item.leftover_id,
              menu_entry_id: item.id,
              title: item.leftover_name,
              has_leftovers: 0,
              tags: item.tags ? item.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
              assigned_people: item.assigned_people ? item.assigned_people.split(',').map(p => p.trim()).filter(Boolean) : []
            };
          } else if (item.custom_meal !== null && item.custom_meal !== '') {
            mealItem = {
              type: 'custom',
              menu_entry_id: item.id,
              title: item.custom_meal,
              raw_title: item.custom_meal,
              has_leftovers: 0,
              tags: item.tags ? item.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
              assigned_people: item.assigned_people ? item.assigned_people.split(',').map(p => p.trim()).filter(Boolean) : []
            };
          }
          if (mealItem && structured[item.day_of_week][item.meal_type]) {
            structured[item.day_of_week][item.meal_type].push(mealItem);
          }
        }
      });
      setMenuPlan(structured);
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // Fetch all recipes (for selection)
  const fetchRecipes = async () => {
    try {
      const res = await fetch('/api/recipes');
      if (res.ok) {
        const data = await res.json();
        setRecipes(data);
      }
    } catch (err) {
      console.error('Failed to load recipes for menu selection:', err);
    }
  };

  // Fetch leftovers (for selection)
  const fetchLeftovers = async () => {
    try {
      const res = await fetch('/api/leftovers');
      if (res.ok) {
        const data = await res.json();
        setLeftovers(data);
      }
    } catch (err) {
      console.error('Failed to load leftovers for selection:', err);
    }
  };

  const fetchRetainedMealsAndTags = async () => {
    try {
      const token = localStorage.getItem('token') || '';
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
      const [mealsRes, tagsRes] = await Promise.all([
        fetch('/api/custom-meals', { headers }),
        fetch('/api/tags', { headers })
      ]);
      if (mealsRes.ok) {
        const mealsData = await mealsRes.json();
        setRetainedCustomMeals(mealsData);
      }
      if (tagsRes.ok) {
        const tagsData = await tagsRes.json();
        setRetainedTags(tagsData);
      }
    } catch (err) {
      console.error('Failed to load autocomplete suggestions:', err);
    }
  };

  const handleClearEntirePlan = async () => {
    if (!window.confirm("Are you sure you want to clear the entire weekly meal plan? This will remove all scheduled meals.")) {
      return;
    }
    setLoading(true);
    try {
      const token = localStorage.getItem('token') || '';
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
      const res = await fetch('/api/menu', {
        method: 'DELETE',
        headers
      });
      if (!res.ok) throw new Error('Failed to clear meal plan');
      showToast('Weekly meal plan cleared successfully');
      fetchMenu();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchAssignableUsers = async () => {
    try {
      const token = localStorage.getItem('token') || '';
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
      const res = await fetch('/api/users/assignable', { headers });
      if (res.ok) {
        const data = await res.json();
        setAssignableUsers(data);
      }
    } catch (err) {
      console.error('Failed to load assignable users:', err);
    }
  };

  const openAssignModal = (day, meal) => {
    setActiveSlot({ day, meal });
    fetchLeftovers();
    setMealTags('');
    
    // Pre-populate with logged in user if they have a name
    if (user) {
      const myName = user.display_name || user.username;
      setSelectedPeople([myName]);
    } else {
      setSelectedPeople([]);
    }
    setIsCustomPersonSelected(false);
    setCustomPersonName('');
    setShowPeopleDropdown(false);
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (peopleDropdownRef.current && !peopleDropdownRef.current.contains(event.target)) {
        setShowPeopleDropdown(false);
      }
      if (editPeopleDropdownRef.current && !editPeopleDropdownRef.current.contains(event.target)) {
        setEditingShowPeopleDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    Promise.all([
      fetchMenu(),
      fetchRecipes(),
      fetchLeftovers(),
      checkOidcStatus(),
      fetchRetainedMealsAndTags(),
      fetchAssignableUsers()
    ]).finally(() => setLoading(false));
    setStartDate(formatDate(getMonday(new Date())));
  }, []);

  // Update a specific slot
  const handleAssignSlot = async (recipeId, leftoverId, customMeal = null, servings = null) => {
    if (!activeSlot) return;
    const { day, meal } = activeSlot;

    // Auto leftovers tag logic
    let finalTags = mealTags.trim();
    if (leftoverId) {
      const tagArr = finalTags.split(',').map(t => t.trim()).filter(Boolean);
      if (!tagArr.some(t => t.toLowerCase() === 'leftovers')) {
        tagArr.push('Leftovers');
      }
      finalTags = tagArr.join(', ');
    }

    const peopleList = [...selectedPeople];
    if (isCustomPersonSelected && customPersonName.trim()) {
      const customParts = customPersonName.split(',').map(p => p.trim()).filter(Boolean);
      customParts.forEach(p => {
        if (!peopleList.includes(p)) {
          peopleList.push(p);
        }
      });
    }
    const finalAssignedPeople = peopleList.join(', ');

    try {
      const res = await fetch('/api/menu', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          day_of_week: day,
          meal_type: meal,
          recipe_id: recipeId || null,
          leftover_id: leftoverId || null,
          has_leftovers: 0,
          custom_meal: customMeal || null,
          servings: servings || null,
          tags: finalTags || null,
          assigned_people: finalAssignedPeople || null
        })
      });

      if (!res.ok) throw new Error('Failed to update menu slot');
      
      const label = recipeId ? 'recipe' : (leftoverId ? 'leftover' : 'custom meal');
      showToast(`Assigned ${label} to ${day} ${meal}`);
      fetchMenu();
      fetchLeftovers(); // Refresh leftovers list
      fetchRetainedMealsAndTags(); // Refresh autocomplete items
      setActiveSlot(null);
      setSearchQuery('');
      setSelectorTab('recipes');
      setAssigningRecipe(null);
      setMealTags('');
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // Clear slot entry by ID
  const handleClearSlotEntry = async (entryId, mealTitle, day, meal, e) => {
    e.stopPropagation();
    if (!window.confirm(`Remove "${mealTitle}" from ${day} ${meal}?`)) return;

    try {
      const res = await fetch(`/api/menu/${entryId}`, {
        method: 'DELETE'
      });

      if (!res.ok) throw new Error('Failed to remove meal');
      showToast('Meal removed successfully');
      fetchMenu();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // Mark a meal as having leftovers
  const handleMarkLeftovers = async (day, meal, assigned) => {
    const plannedServings = assigned.servings || 4;
    const defaultLeftovers = Math.max(1, plannedServings - 2);
    const userInput = window.prompt(
      `Mark "${assigned.title}" as leftovers.\nPlanned servings: ${plannedServings}.\nHow many servings are left over?`,
      defaultLeftovers
    );
    if (userInput === null) return; // User cancelled
    const servingsLeft = parseInt(userInput) || defaultLeftovers;

    try {
      const leftoversRes = await fetch('/api/leftovers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `Leftovers: ${assigned.title}`,
          recipe_id: assigned.id,
          servings: servingsLeft
        })
      });
      if (!leftoversRes.ok) throw new Error('Failed to record leftovers');

      const menuRes = await fetch('/api/menu', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: assigned.menu_entry_id,
          recipe_id: assigned.id,
          leftover_id: null,
          has_leftovers: 1,
          servings: plannedServings,
          tags: assigned.tags ? assigned.tags.join(', ') : null
        })
      });
      if (!menuRes.ok) throw new Error('Failed to mark meal as having leftovers');

      showToast(`Recorded leftovers for "${assigned.title}" with today's date.`);
      fetchMenu();
      fetchLeftovers();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // Open Edit Meal modal and populate current values
  const handleOpenEditModal = (entry) => {
    setEditingEntry(entry);
    setEditingCustomMealText(entry.type === 'custom' ? (entry.title || '') : '');
    setEditingServings(entry.servings !== null && entry.servings !== undefined ? entry.servings : (entry.type === 'recipe' ? 4 : ''));
    setEditingTags(entry.tags ? entry.tags.join(', ') : '');
    setEditingHasLeftovers(entry.has_leftovers === 1);

    // Map existing assigned people
    const assigned = entry.assigned_people || [];
    const knownUserNames = assignableUsers.map(u => u.display_name || u.username);
    const knownSelected = [];
    const customSelected = [];
    assigned.forEach(name => {
      if (knownUserNames.includes(name)) {
        knownSelected.push(name);
      } else {
        customSelected.push(name);
      }
    });
    setEditingSelectedPeople(knownSelected);
    if (customSelected.length > 0) {
      setEditingIsCustomPerson(true);
      setEditingCustomPersonName(customSelected.join(', '));
    } else {
      setEditingIsCustomPerson(false);
      setEditingCustomPersonName('');
    }
    setEditingShowPeopleDropdown(false);
  };

  // Save changes to edited meal
  const handleSaveEditedMeal = async () => {
    if (!editingEntry) return;
    try {
      let finalTags = editingTags.trim();
      if (editingEntry.type === 'leftover') {
        const tagArr = finalTags.split(',').map(t => t.trim()).filter(Boolean);
        if (!tagArr.some(t => t.toLowerCase() === 'leftovers')) {
          tagArr.push('Leftovers');
        }
        finalTags = tagArr.join(', ');
      }

      const allPeople = [...editingSelectedPeople];
      if (editingIsCustomPerson && editingCustomPersonName.trim()) {
        allPeople.push(editingCustomPersonName.trim());
      }
      const finalAssignedPeople = allPeople.filter(Boolean).join(', ');

      const payload = {
        id: editingEntry.menu_entry_id,
        recipe_id: editingEntry.type === 'recipe' ? editingEntry.id : null,
        leftover_id: editingEntry.type === 'leftover' ? editingEntry.id : null,
        custom_meal: editingEntry.type === 'custom' ? (editingCustomMealText.trim() || editingEntry.title) : null,
        has_leftovers: editingHasLeftovers ? 1 : 0,
        servings: editingServings ? parseInt(editingServings, 10) : null,
        tags: finalTags || null,
        assigned_people: finalAssignedPeople || null
      };

      const res = await fetch('/api/menu', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error('Failed to update meal');
      showToast('Meal plan entry updated successfully');
      fetchMenu();
      fetchRetainedMealsAndTags(); // Refresh autocomplete items
      setEditingEntry(null);
      setEditingTags('');
      setEditingCustomMealText('');
      setEditingSelectedPeople([]);
      setEditingIsCustomPerson(false);
      setEditingCustomPersonName('');
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleMicrosoftSync = async () => {
    if (!startDate) {
      showToast('Please select a starting date first.', 'error');
      return;
    }
    setSyncing(true);
    const tokenVal = localStorage.getItem('token') || '';
    try {
      const res = await fetch('/api/users/calendar-sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tokenVal}`
        },
        body: JSON.stringify({ startDate })
      });
      
      if (res.ok) {
        const data = await res.json();
        showToast(`Weekly meal plan synced successfully to your Microsoft Calendar (${data.count || 0} meals created)!`, 'success');
        setShowSyncModal(false);
      } else {
        let errData = {};
        try {
          errData = await res.json();
        } catch (e) {}
        
        if (res.status === 401 && errData.needs_auth) {
          // Fall back to redirect flow
          let redirectUrl = `/api/auth/ms-calendar/login?startDate=${startDate}`;
          if (tokenVal) {
            redirectUrl += `&token=${encodeURIComponent(tokenVal)}`;
          }
          window.location.href = redirectUrl;
        } else {
          throw new Error(errData.error || 'Failed to sync with Microsoft calendar');
        }
      }
    } catch (err) {
      showToast('Calendar Sync Failed: ' + err.message, 'error');
    } finally {
      setSyncing(false);
    }
  };

  const getCustomMealSuggestions = () => {
    if (!customMealText.trim()) return [];
    return retainedCustomMeals.filter(meal => 
      meal.toLowerCase().includes(customMealText.toLowerCase()) && 
      meal.toLowerCase() !== customMealText.trim().toLowerCase()
    );
  };

  const getTagSuggestions = (currentText) => {
    const parts = currentText.split(',');
    const currentTag = parts[parts.length - 1].trim();
    
    if (!currentTag) {
      const currentFullTags = parts.map(p => p.trim().toLowerCase()).filter(Boolean);
      return retainedTags.filter(tag => !currentFullTags.includes(tag.toLowerCase()));
    }
    
    const existingTags = parts.slice(0, -1).map(p => p.trim().toLowerCase());
    return retainedTags.filter(tag => 
      tag.toLowerCase().includes(currentTag.toLowerCase()) &&
      tag.toLowerCase() !== currentTag.toLowerCase() &&
      !existingTags.includes(tag.toLowerCase())
    );
  };

  const handleSelectTagSuggestion = (suggestion, currentText, setter) => {
    const parts = currentText.split(',');
    parts[parts.length - 1] = ' ' + suggestion;
    setter(parts.join(', ').trim() + ', ');
  };

  const renderSuggestions = (suggestions, onSelect) => {
    if (suggestions.length === 0) return null;
    return (
      <div 
        style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          zIndex: 1000,
          background: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-sm)',
          boxShadow: 'var(--shadow-md)',
          maxHeight: '150px',
          overflowY: 'auto',
          marginTop: '0.25rem'
        }}
      >
        {suggestions.map((s, idx) => (
          <div
            key={idx}
            onMouseDown={(e) => {
              e.preventDefault(); // Prevents immediate blur
              onSelect(s);
            }}
            style={{
              padding: '0.5rem 0.75rem',
              cursor: 'pointer',
              fontSize: '0.85rem',
              transition: 'background var(--transition-fast)',
              borderBottom: idx < suggestions.length - 1 ? '1px solid var(--border-color)' : 'none',
              color: 'var(--text-main)',
              textAlign: 'left'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'var(--border-color)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
          >
            {s}
          </div>
        ))}
      </div>
    );
  };

  // Filter recipes based on search query
  const filteredRecipes = recipes.filter(r => 
    (r.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (r.description && r.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="animate-fade-in">
      <div className="content-header">
        <h2>Weekly Menu Planner</h2>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          {user && (
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', fontSize: '0.9rem', color: 'var(--text-main)', marginRight: '0.75rem', userSelect: 'none' }}>
              <input 
                type="checkbox" 
                checked={filterMyMeals} 
                onChange={(e) => setFilterMyMeals(e.target.checked)}
                style={{ cursor: 'pointer', width: '15px', height: '15px' }}
              />
              <span>Show only my meals</span>
            </label>
          )}
          {user?.permissions?.planner === 'full' && (
            <button 
              className="btn btn-outline"
              onClick={handleClearEntirePlan}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--danger)', borderColor: 'var(--danger)' }}
              disabled={loading}
            >
              <Trash2 size={16} />
              <span>Clear Plan</span>
            </button>
          )}
          <button 
            className="btn btn-secondary"
            onClick={() => setShowSyncModal(true)}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <Calendar size={16} />
            <span>Sync to Calendar</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem 2rem' }}>
          <RefreshCw size={36} className="spinner" style={{ margin: '0 auto 1rem auto' }} />
          <p>Loading your planner...</p>
        </div>
      ) : (
        /* Planner Grid */
        /* Planner Rows */
        <div 
          style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '1.25rem',
            overflowX: 'auto',
            paddingBottom: '1.5rem',
            width: '100%'
          }}
        >
          {DAYS.map(day => (
            <div 
              key={day} 
              className="card planner-day-row" 
              style={{ 
                borderLeft: '4px solid var(--primary)'
              }}
            >
              <h3 style={{ fontSize: '1.15rem', color: 'var(--primary)', fontWeight: 'bold' }}>
                {day}
              </h3>
              
              {MEALS.map(meal => {
                const allAssigned = menuPlan[day]?.[meal] || [];
                const assigned = filterMyMeals
                  ? allAssigned.filter(entry => {
                      if (!user) return true;
                      if (!entry.assigned_people || entry.assigned_people.length === 0) return false;
                      const myUsername = (user.username || '').toLowerCase();
                      const myDisplayName = (user.display_name || '').toLowerCase();
                      return entry.assigned_people.some(p => {
                        const lp = p.toLowerCase();
                        return lp === myUsername || lp === myDisplayName;
                      });
                    })
                  : allAssigned;
                return (
                  <div 
                    key={meal} 
                    style={{ 
                      background: 'var(--bg-app)', 
                      borderRadius: 'var(--radius-sm)', 
                      padding: '0.75rem', 
                      border: '1px solid var(--border-color)', 
                      minHeight: '120px', 
                      display: 'flex', 
                      flexDirection: 'column', 
                      justifyContent: 'space-between',
                      position: 'relative',
                      height: '100%'
                    }}
                  >
                    <div>
                      <div 
                        style={{ 
                          fontSize: '0.7rem', 
                          fontWeight: 'bold', 
                          textTransform: 'uppercase', 
                          color: 'var(--text-muted)', 
                          marginBottom: '0.5rem' 
                        }}
                      >
                        {meal}
                      </div>
                      
                      {assigned && assigned.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                          {assigned.map((entry, entryIdx) => (
                            <div 
                              key={entry.menu_entry_id || entryIdx} 
                              style={{ 
                                display: 'flex', 
                                flexDirection: 'column', 
                                gap: '0.35rem',
                                borderBottom: entryIdx < assigned.length - 1 ? '1px dashed var(--border-color)' : 'none',
                                paddingBottom: entryIdx < assigned.length - 1 ? '0.5rem' : '0'
                              }}
                            >
                              <div style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-main)', display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                                <span style={{ wordBreak: 'break-word' }}>{entry.title}</span>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                                {entry.servings ? (
                                  <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}>
                                    🍽️ {entry.servings} {entry.servings === 1 ? 'serving' : 'servings'}
                                  </span>
                                ) : null}
                                {entry.has_leftovers === 1 && (
                                  <span style={{ display: 'inline-block', fontSize: '0.68rem', color: 'var(--accent)', fontWeight: 'bold' }}>
                                    🍲 Leftovers Generated
                                  </span>
                                )}
                              </div>
                              
                              {/* Display entry tags */}
                              {entry.tags && entry.tags.length > 0 && (
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem', marginTop: '0.15rem' }}>
                                  {entry.tags.map(t => (
                                    <span 
                                      key={t} 
                                      style={{ 
                                        fontSize: '0.65rem', 
                                        background: t.toLowerCase() === 'leftovers' ? 'var(--accent-light)' : 'var(--primary-light)', 
                                        color: t.toLowerCase() === 'leftovers' ? 'var(--accent)' : 'var(--primary)', 
                                        padding: '0.1rem 0.35rem', 
                                        borderRadius: '3px',
                                        fontWeight: 'bold'
                                      }}
                                    >
                                      {t}
                                    </span>
                                  ))}
                                </div>
                              )}

                              {/* Display assigned people */}
                              {entry.assigned_people && entry.assigned_people.length > 0 && (
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem', marginTop: '0.25rem' }}>
                                  {entry.assigned_people.map(p => (
                                    <span 
                                      key={p} 
                                      style={{ 
                                        fontSize: '0.65rem', 
                                        background: 'var(--primary-light)', 
                                        color: 'var(--primary)', 
                                        padding: '0.1rem 0.35rem', 
                                        borderRadius: '3px',
                                        border: '1px solid rgba(211, 84, 0, 0.15)',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '0.15rem',
                                        fontWeight: 'bold'
                                      }}
                                    >
                                      👤 {p}
                                    </span>
                                  ))}
                                </div>
                              )}

                              {/* Item actions */}
                              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '4px', flexWrap: 'wrap', marginTop: '0.25rem' }}>
                                {entry.type === 'recipe' && (
                                  <button 
                                    className="btn btn-outline" 
                                    style={{ padding: '0.2rem 0.3rem' }} 
                                    onClick={() => handleExportWord(entry.id)}
                                    title="Export Recipe to Word"
                                  >
                                    <Download size={11} />
                                  </button>
                                )}
                                {entry.type === 'recipe' && entry.has_leftovers !== 1 && user?.permissions?.planner === 'full' && (
                                  <button 
                                    className="btn btn-outline" 
                                    style={{ padding: '0.2rem 0.3rem', color: 'var(--accent)', fontSize: '0.65rem' }} 
                                    onClick={() => handleMarkLeftovers(day, meal, entry)}
                                    title="Mark as leftovers"
                                  >
                                    Leftovers
                                  </button>
                                )}
                                {user?.permissions?.planner === 'full' && (
                                  <button 
                                    className="btn btn-outline" 
                                    style={{ padding: '0.2rem 0.35rem', color: 'var(--primary)', fontSize: '0.65rem', display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }} 
                                    onClick={() => handleOpenEditModal(entry)}
                                    title="Edit Meal (servings, people, tags)"
                                  >
                                    <Edit2 size={10} />
                                    <span>Edit</span>
                                  </button>
                                )}
                                {user?.permissions?.planner === 'full' && (
                                  <button 
                                    className="btn btn-outline" 
                                    style={{ padding: '0.2rem 0.3rem', color: 'var(--danger)' }} 
                                    onClick={(e) => handleClearSlotEntry(entry.menu_entry_id, entry.title, day, meal, e)}
                                    title="Remove meal"
                                  >
                                    <Trash2 size={11} />
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                          Empty
                        </div>
                      )}
                    </div>

                    <div style={{ marginTop: '0.75rem', paddingTop: '0.5rem', borderTop: assigned && assigned.length > 0 ? '1px solid var(--border-color)' : 'none' }}>
                      {user?.permissions?.planner === 'full' && (
                        <button 
                          className="btn btn-secondary" 
                          style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', width: '100%', display: 'flex', alignItems: 'center', gap: '0.25rem', justifyContent: 'center' }} 
                          onClick={() => openAssignModal(day, meal)}
                        >
                          <Plus size={12} /> Assign Meal
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}

      {/* Recipe Selection Modal overlay */}
      {activeSlot && (
        <div className="modal-overlay" onClick={() => { setActiveSlot(null); setSearchQuery(''); setCustomMealText(''); setAssigningRecipe(null); setSelectedPeople([]); setIsCustomPersonSelected(false); setCustomPersonName(''); setShowPeopleDropdown(false); }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px', overflow: 'visible' }}>
            <div className="modal-header">
              <h2 style={{ fontSize: '1.25rem' }}>
                Assign Meal to {activeSlot.day} {activeSlot.meal}
              </h2>
              <button 
                className="close-btn" 
                onClick={() => { setActiveSlot(null); setSearchQuery(''); setCustomMealText(''); setAssigningRecipe(null); setSelectedPeople([]); setIsCustomPersonSelected(false); setCustomPersonName(''); setShowPeopleDropdown(false); }}
              >
                ×
              </button>
            </div>
            <div className="modal-body" style={{ padding: '1.5rem', overflow: 'visible' }}>
              
              {/* Person field (dropdown checklist) */}
              <div className="form-group" style={{ marginBottom: '1.25rem', position: 'relative' }} ref={peopleDropdownRef}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
                  Assign to Person/People
                </label>
                <div style={{ position: 'relative' }}>
                  <button
                    type="button"
                    className="input-control"
                    onClick={() => setShowPeopleDropdown(!showPeopleDropdown)}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border-color)',
                      background: 'var(--bg-app)',
                      color: 'var(--text-main)',
                      fontSize: '0.9rem',
                      textAlign: 'left',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      cursor: 'pointer'
                    }}
                  >
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {selectedPeople.length === 0 && !isCustomPersonSelected
                        ? 'Select People...'
                        : [
                            ...selectedPeople,
                            ...(isCustomPersonSelected && customPersonName.trim() ? [customPersonName.trim()] : [])
                          ].join(', ') || 'Custom Name...'}
                    </span>
                    <span>▼</span>
                  </button>
                  
                  {showPeopleDropdown && (
                    <div
                      style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        right: 0,
                        zIndex: 1010,
                        background: 'var(--bg-card)',
                        border: '1px solid var(--border-color)',
                        borderRadius: 'var(--radius-sm)',
                        boxShadow: 'var(--shadow-lg)',
                        padding: '0.75rem',
                        marginTop: '0.25rem',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.6rem',
                        maxHeight: '220px',
                        overflowY: 'auto'
                      }}
                    >
                      {assignableUsers.map(u => {
                        const nameToUse = u.display_name || u.username;
                        const isChecked = selectedPeople.includes(nameToUse);
                        return (
                          <label key={u.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.9rem' }} onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedPeople([...selectedPeople, nameToUse]);
                                } else {
                                  setSelectedPeople(selectedPeople.filter(p => p !== nameToUse));
                                }
                              }}
                              style={{ cursor: 'pointer' }}
                            />
                            <span>{nameToUse}</span>
                          </label>
                        );
                      })}
                      
                      {/* Custom option */}
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.9rem', borderTop: '1px solid var(--border-color)', paddingTop: '0.5rem' }} onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isCustomPersonSelected}
                          onChange={(e) => setIsCustomPersonSelected(e.target.checked)}
                          style={{ cursor: 'pointer' }}
                        />
                        <span style={{ fontWeight: 'bold' }}>Custom Name (not listed)</span>
                      </label>
                      
                      {isCustomPersonSelected && (
                        <input
                          type="text"
                          placeholder="Type custom name..."
                          value={customPersonName}
                          onChange={(e) => setCustomPersonName(e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          className="input-control"
                          style={{
                            width: '100%',
                            padding: '0.5rem',
                            fontSize: '0.85rem',
                            borderRadius: '4px',
                            border: '1px solid var(--border-color)',
                            background: 'var(--bg-app)',
                            color: 'var(--text-main)'
                          }}
                        />
                      )}
                      
                      <button
                        type="button"
                        className="btn btn-primary"
                        style={{ padding: '0.35rem 0.5rem', fontSize: '0.8rem', marginTop: '0.25rem', width: '100%' }}
                        onClick={(e) => { e.stopPropagation(); setShowPeopleDropdown(false); }}
                      >
                        Done
                      </button>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Tab selector */}
              <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', marginBottom: '1.25rem', gap: '1rem', overflowX: 'auto' }}>
                <button 
                  type="button"
                  onClick={() => setSelectorTab('recipes')}
                  style={{ 
                    padding: '0.5rem 1rem', 
                    background: 'transparent', 
                    border: 'none', 
                    borderBottom: selectorTab === 'recipes' ? '2px solid var(--primary)' : 'none', 
                    color: selectorTab === 'recipes' ? 'var(--primary)' : 'var(--text-muted)',
                    fontWeight: '600',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap'
                  }}
                >
                  Recipes
                </button>
                <button 
                  type="button"
                  onClick={() => setSelectorTab('leftovers')}
                  style={{ 
                    padding: '0.5rem 1rem', 
                    background: 'transparent', 
                    border: 'none', 
                    borderBottom: selectorTab === 'leftovers' ? '2px solid var(--primary)' : 'none', 
                    color: selectorTab === 'leftovers' ? 'var(--primary)' : 'var(--text-muted)',
                    fontWeight: '600',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap'
                  }}
                >
                  Leftovers
                </button>
                <button 
                  type="button"
                  onClick={() => setSelectorTab('custom')}
                  style={{ 
                    padding: '0.5rem 1rem', 
                    background: 'transparent', 
                    border: 'none', 
                    borderBottom: selectorTab === 'custom' ? '2px solid var(--primary)' : 'none', 
                    color: selectorTab === 'custom' ? 'var(--primary)' : 'var(--text-muted)',
                    fontWeight: '600',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap'
                  }}
                >
                  Custom Meal
                </button>
              </div>

              {selectorTab === 'recipes' && assigningRecipe ? (
                /* Planned servings selection sub-form */
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  <div style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', padding: '1rem', background: 'var(--bg-app)' }}>
                    <strong style={{ display: 'block', fontSize: '1rem', marginBottom: '0.25rem' }}>{assigningRecipe.title}</strong>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      Default Recipe Servings: {assigningRecipe.servings || 'Not specified (defaults to 4)'}
                    </span>
                  </div>
                  <div className="form-group">
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
                      Number of Servings for this Meal Plan Entry
                    </label>
                    <input 
                      type="number" 
                      min="1" 
                      max="100"
                      value={recipeServings}
                      onChange={(e) => setRecipeServings(parseInt(e.target.value) || 1)}
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--border-color)',
                        background: 'var(--bg-app)',
                        color: 'var(--text-main)',
                        fontSize: '0.9rem',
                        outline: 'none'
                      }}
                    />
                  </div>
                  <div className="form-group" style={{ position: 'relative' }}>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
                      Tags (comma-separated, e.g. Keto, Spicy)
                    </label>
                    <input 
                      type="text" 
                      placeholder="e.g. Keto, Spicy, Kid-friendly..."
                      value={mealTags}
                      onChange={(e) => setMealTags(e.target.value)}
                      onFocus={() => setActiveInputFocus('mealTags')}
                      onBlur={() => setTimeout(() => setActiveInputFocus(null), 200)}
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--border-color)',
                        background: 'var(--bg-app)',
                        color: 'var(--text-main)',
                        fontSize: '0.9rem',
                        outline: 'none'
                      }}
                    />
                    {activeInputFocus === 'mealTags' && renderSuggestions(getTagSuggestions(mealTags), (suggestion) => handleSelectTagSuggestion(suggestion, mealTags, setMealTags))}
                  </div>
                  <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                    <button 
                      className="btn btn-secondary"
                      onClick={() => setAssigningRecipe(null)}
                      style={{ flex: 1 }}
                    >
                      Back to List
                    </button>
                    <button 
                      className="btn btn-primary"
                      onClick={() => handleAssignSlot(assigningRecipe.id, null, null, recipeServings)}
                      style={{ flex: 2 }}
                    >
                      Add to Meal Plan
                    </button>
                  </div>
                </div>
              ) : selectorTab === 'recipes' ? (
                <>
                  {/* Search filter in selector modal */}
                  <div 
                    className="form-group" 
                    style={{ 
                      flexDirection: 'row', 
                      alignItems: 'center', 
                      border: '1px solid var(--border-color)', 
                      borderRadius: 'var(--radius-sm)', 
                      padding: '0.5rem 0.75rem', 
                      marginBottom: '1.5rem',
                      background: 'var(--bg-app)' 
                    }}
                  >
                    <Search size={18} style={{ color: 'var(--text-muted)' }} />
                    <input 
                      type="text" 
                      placeholder="Search recipes..." 
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      style={{ border: 'none', background: 'transparent', flex: 1, outline: 'none', fontSize: '0.9rem', paddingLeft: '0.5rem', color: 'var(--text-main)' }}
                    />
                  </div>

                  {/* Recipe options list */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '300px', overflowY: 'auto' }}>
                    {filteredRecipes.length === 0 ? (
                      <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem', padding: '1rem' }}>
                        No recipes found.
                      </p>
                    ) : (
                      filteredRecipes.map(recipe => (
                        <div 
                          key={recipe.id}
                          onClick={() => { setAssigningRecipe(recipe); setRecipeServings(recipe.servings || 4); }}
                          style={{ 
                            padding: '0.75rem 1rem', 
                            border: '1px solid var(--border-color)', 
                            borderRadius: 'var(--radius-sm)', 
                            cursor: 'pointer', 
                            transition: 'var(--transition-fast)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.75rem' 
                          }}
                          className="nav-link-style-hover"
                          onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--primary)'}
                          onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border-color)'}
                        >
                          <Utensils size={16} style={{ color: 'var(--primary)' }} />
                          <strong style={{ fontSize: '0.9rem' }}>{recipe.title}</strong>
                        </div>
                      ))
                    )}
                  </div>
                </>
              ) : null}

              {selectorTab === 'leftovers' && (
                /* Leftovers Options List */
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '300px', overflowY: 'auto' }}>
                  {leftovers.length === 0 ? (
                    <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem', padding: '2rem 1rem' }}>
                      No leftovers in fridge. You can mark a recipe meal as leftovers to add it.
                    </p>
                  ) : (
                    leftovers.map(item => (
                      <div 
                        key={item.id}
                        onClick={() => handleAssignSlot(null, item.id)}
                        style={{ 
                          padding: '0.75rem 1rem', 
                          border: '1px solid var(--border-color)', 
                          borderRadius: 'var(--radius-sm)', 
                          cursor: 'pointer', 
                          transition: 'var(--transition-fast)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '0.75rem' 
                        }}
                        className="nav-link-style-hover"
                        onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--primary)'}
                        onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border-color)'}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <span style={{ fontSize: '1.2rem' }}>🍲</span>
                          <strong style={{ fontSize: '0.9rem' }}>{item.name}</strong>
                        </div>
                        <span style={{ fontSize: '0.75rem', background: 'var(--primary-light)', color: 'var(--primary)', padding: '0.1rem 0.4rem', borderRadius: '4px', fontWeight: 'bold' }}>
                          {item.servings} Servings
                        </span>
                      </div>
                    ))
                  )}
                </div>
              )}

              {selectorTab === 'custom' && (
                /* Custom Meal Input Form */
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  <div className="form-group" style={{ position: 'relative' }}>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
                      Custom Meal or Activity (e.g. eating out, fast food, bbq)
                    </label>
                    <input 
                      type="text" 
                      placeholder="e.g. Eating out at Olive Garden, Fast Food, Backyard BBQ..."
                      value={customMealText}
                      onChange={(e) => setCustomMealText(e.target.value)}
                      onFocus={() => setActiveInputFocus('customMeal')}
                      onBlur={() => setTimeout(() => setActiveInputFocus(null), 200)}
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--border-color)',
                        background: 'var(--bg-app)',
                        color: 'var(--text-main)',
                        fontSize: '0.9rem',
                        outline: 'none'
                      }}
                    />
                    {activeInputFocus === 'customMeal' && renderSuggestions(getCustomMealSuggestions(), (suggestion) => setCustomMealText(suggestion))}
                  </div>
                  <button 
                    className="btn btn-primary"
                    disabled={!customMealText.trim()}
                    onClick={() => handleAssignSlot(null, null, customMealText.trim())}
                    style={{ width: '100%', marginTop: '0.5rem' }}
                  >
                    Assign Custom Meal
                  </button>
                </div>
              )}

              {/* Common Tags Input at the bottom of Assign Modal */}
              {(!assigningRecipe || selectorTab !== 'recipes') && (
                <div className="form-group" style={{ marginTop: '1.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '1.25rem', position: 'relative' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
                    Tags (comma-separated, e.g. Keto, Spicy)
                  </label>
                  <input 
                    type="text" 
                    placeholder="e.g. Keto, Spicy, Kid-friendly..."
                    value={mealTags}
                    onChange={(e) => setMealTags(e.target.value)}
                    onFocus={() => setActiveInputFocus('mealTagsCommon')}
                    onBlur={() => setTimeout(() => setActiveInputFocus(null), 200)}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border-color)',
                      background: 'var(--bg-app)',
                      color: 'var(--text-main)',
                      fontSize: '0.9rem',
                      outline: 'none'
                    }}
                  />
                  {activeInputFocus === 'mealTagsCommon' && renderSuggestions(getTagSuggestions(mealTags), (suggestion) => handleSelectTagSuggestion(suggestion, mealTags, setMealTags))}
                </div>
              )}

            </div>
          </div>
        </div>
      )}

      {/* Edit Meal Modal overlay */}
      {editingEntry && (
        <div className="modal-overlay" onClick={() => { setEditingEntry(null); setEditingTags(''); setEditingCustomMealText(''); setEditingShowPeopleDropdown(false); }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px', overflow: 'visible' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Edit2 size={18} className="text-primary" />
                <h2 style={{ fontSize: '1.25rem', margin: 0 }}>Edit Meal</h2>
              </div>
              <button 
                className="close-btn" 
                onClick={() => { setEditingEntry(null); setEditingTags(''); setEditingCustomMealText(''); setEditingShowPeopleDropdown(false); }}
              >
                ×
              </button>
            </div>

            <div className="modal-body" style={{ padding: '1.5rem', overflow: 'visible', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              
              {/* Meal Header Info */}
              <div style={{
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-sm)',
                padding: '0.85rem 1rem',
                background: 'var(--bg-app)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '0.5rem'
              }}>
                <div>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 'bold', display: 'block' }}>
                    Meal Name
                  </span>
                  <strong style={{ fontSize: '1rem', color: 'var(--text-main)' }}>{editingEntry.title}</strong>
                </div>
                <span style={{
                  fontSize: '0.65rem',
                  fontWeight: 'bold',
                  padding: '0.2rem 0.5rem',
                  borderRadius: '4px',
                  background: editingEntry.type === 'recipe' ? 'var(--primary-light)' : editingEntry.type === 'leftover' ? 'var(--accent-light)' : 'rgba(100, 116, 139, 0.15)',
                  color: editingEntry.type === 'recipe' ? 'var(--primary)' : editingEntry.type === 'leftover' ? 'var(--accent)' : 'var(--text-muted)'
                }}>
                  {editingEntry.type === 'recipe' ? '📖 Recipe' : editingEntry.type === 'leftover' ? '🍲 Leftover' : '✍️ Custom Meal'}
                </span>
              </div>

              {/* If custom meal, allow editing the meal text */}
              {editingEntry.type === 'custom' && (
                <div className="form-group" style={{ position: 'relative' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
                    Custom Meal Name
                  </label>
                  <input
                    type="text"
                    value={editingCustomMealText}
                    onChange={(e) => setEditingCustomMealText(e.target.value)}
                    onFocus={() => setActiveInputFocus('editingCustomMeal')}
                    onBlur={() => setTimeout(() => setActiveInputFocus(null), 200)}
                    placeholder="e.g. Pizza Night, Eating Out..."
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border-color)',
                      background: 'var(--bg-app)',
                      color: 'var(--text-main)',
                      fontSize: '0.9rem',
                      outline: 'none'
                    }}
                  />
                  {activeInputFocus === 'editingCustomMeal' && renderSuggestions(getCustomMealSuggestions(), (suggestion) => setEditingCustomMealText(suggestion))}
                </div>
              )}

              {/* Number of Servings */}
              <div className="form-group">
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
                  Number of Servings
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ padding: '0.6rem 0.9rem', fontSize: '1rem', fontWeight: 'bold' }}
                    onClick={() => setEditingServings(prev => Math.max(1, (parseInt(prev) || 1) - 1))}
                  >
                    −
                  </button>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={editingServings}
                    onChange={(e) => setEditingServings(parseInt(e.target.value) || 1)}
                    style={{
                      width: '100%',
                      padding: '0.65rem',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border-color)',
                      background: 'var(--bg-app)',
                      color: 'var(--text-main)',
                      fontSize: '1rem',
                      fontWeight: 'bold',
                      textAlign: 'center',
                      outline: 'none'
                    }}
                  />
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ padding: '0.6rem 0.9rem', fontSize: '1rem', fontWeight: 'bold' }}
                    onClick={() => setEditingServings(prev => (parseInt(prev) || 0) + 1)}
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Person / People Assignment Dropdown */}
              <div className="form-group" style={{ position: 'relative' }} ref={editPeopleDropdownRef}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
                  Assigned People / Users
                </label>
                <div style={{ position: 'relative' }}>
                  <button
                    type="button"
                    className="input-control"
                    onClick={() => setEditingShowPeopleDropdown(!editingShowPeopleDropdown)}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border-color)',
                      background: 'var(--bg-app)',
                      color: 'var(--text-main)',
                      fontSize: '0.9rem',
                      textAlign: 'left',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      cursor: 'pointer'
                    }}
                  >
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {editingSelectedPeople.length === 0 && !editingIsCustomPerson
                        ? 'Select People...'
                        : [
                            ...editingSelectedPeople,
                            ...(editingIsCustomPerson && editingCustomPersonName.trim() ? [editingCustomPersonName.trim()] : [])
                          ].join(', ') || 'Custom Name...'}
                    </span>
                    <span>▼</span>
                  </button>

                  {editingShowPeopleDropdown && (
                    <div
                      style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        right: 0,
                        zIndex: 1010,
                        background: 'var(--bg-card)',
                        border: '1px solid var(--border-color)',
                        borderRadius: 'var(--radius-sm)',
                        boxShadow: 'var(--shadow-lg)',
                        padding: '0.75rem',
                        marginTop: '0.25rem',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.6rem',
                        maxHeight: '220px',
                        overflowY: 'auto'
                      }}
                    >
                      {assignableUsers.map(u => {
                        const nameToUse = u.display_name || u.username;
                        const isChecked = editingSelectedPeople.includes(nameToUse);
                        return (
                          <label key={u.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.9rem' }} onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setEditingSelectedPeople([...editingSelectedPeople, nameToUse]);
                                } else {
                                  setEditingSelectedPeople(editingSelectedPeople.filter(p => p !== nameToUse));
                                }
                              }}
                              style={{ cursor: 'pointer' }}
                            />
                            <span>{nameToUse}</span>
                          </label>
                        );
                      })}

                      {/* Custom option */}
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.9rem', borderTop: '1px solid var(--border-color)', paddingTop: '0.5rem' }} onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={editingIsCustomPerson}
                          onChange={(e) => setEditingIsCustomPerson(e.target.checked)}
                          style={{ cursor: 'pointer' }}
                        />
                        <span style={{ fontWeight: 'bold' }}>Custom Name (not listed)</span>
                      </label>

                      {editingIsCustomPerson && (
                        <input
                          type="text"
                          placeholder="Type custom name..."
                          value={editingCustomPersonName}
                          onChange={(e) => setEditingCustomPersonName(e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          className="input-control"
                          style={{
                            width: '100%',
                            padding: '0.5rem',
                            fontSize: '0.85rem',
                            borderRadius: '4px',
                            border: '1px solid var(--border-color)',
                            background: 'var(--bg-app)',
                            color: 'var(--text-main)'
                          }}
                        />
                      )}

                      <button
                        type="button"
                        className="btn btn-primary"
                        style={{ padding: '0.35rem 0.5rem', fontSize: '0.8rem', marginTop: '0.25rem', width: '100%' }}
                        onClick={(e) => { e.stopPropagation(); setEditingShowPeopleDropdown(false); }}
                      >
                        Done
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Tags Input */}
              <div className="form-group" style={{ position: 'relative' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
                  Tags (comma-separated, e.g. Keto, Quick, Dinner)
                </label>
                <input 
                  type="text" 
                  placeholder="e.g. Keto, Spicy, Family..."
                  value={editingTags}
                  onChange={(e) => setEditingTags(e.target.value)}
                  onFocus={() => setActiveInputFocus('editingTags')}
                  onBlur={() => setTimeout(() => setActiveInputFocus(null), 200)}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-app)',
                    color: 'var(--text-main)',
                    fontSize: '0.9rem',
                    outline: 'none'
                  }}
                />
                {activeInputFocus === 'editingTags' && renderSuggestions(getTagSuggestions(editingTags), (suggestion) => handleSelectTagSuggestion(suggestion, editingTags, setEditingTags))}
              </div>

              {/* Has Leftovers (For recipes) */}
              {editingEntry.type === 'recipe' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0' }}>
                  <input
                    type="checkbox"
                    id="editingHasLeftovers"
                    checked={editingHasLeftovers}
                    onChange={(e) => setEditingHasLeftovers(e.target.checked)}
                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                  />
                  <label htmlFor="editingHasLeftovers" style={{ fontSize: '0.875rem', fontWeight: '500', cursor: 'pointer', userSelect: 'none' }}>
                    Mark meal as generating leftovers
                  </label>
                </div>
              )}

              {/* Modal Actions */}
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button 
                  className="btn btn-secondary"
                  onClick={() => { setEditingEntry(null); setEditingTags(''); setEditingCustomMealText(''); setEditingShowPeopleDropdown(false); }}
                  style={{ flex: 1 }}
                >
                  Cancel
                </button>
                <button 
                  className="btn btn-primary"
                  onClick={handleSaveEditedMeal}
                  style={{ flex: 2 }}
                >
                  Save Changes
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* Calendar Sync Modal overlay */}
      {showSyncModal && (
        <div className="modal-overlay" onClick={() => setShowSyncModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h2 style={{ fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Calendar size={20} className="text-primary" />
                Sync Meal Plan to Calendar
              </h2>
              <button 
                className="close-btn" 
                onClick={() => setShowSyncModal(false)}
              >
                ×
              </button>
            </div>
            <div className="modal-body" style={{ padding: '1.5rem' }}>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
                Export your current weekly menu plan as calendar events. Meals will be scheduled at standard times:
                Breakfast (8:00 AM), Lunch (12:00 PM), and Dinner (6:30 PM).
              </p>

              {/* Starting date picker */}
              <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
                  Week Starting Date (Monday)
                </label>
                <input 
                  type="date" 
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-app)',
                    color: 'var(--text-main)',
                    fontSize: '0.9rem',
                    outline: 'none'
                  }}
                />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem', display: 'block' }}>
                  Please select the Monday corresponding to this menu.
                </span>
              </div>

              {/* Sync Options */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1.5rem' }}>
                
                {/* Option 1: ICS download */}
                <div 
                  style={{
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-md)',
                    padding: '1rem',
                    background: 'var(--bg-card)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.75rem'
                  }}
                >
                  <div>
                    <h4 style={{ fontSize: '0.95rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                      <Download size={16} style={{ color: 'var(--primary)' }} />
                      Download iCalendar (.ics) File
                    </h4>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem', marginBottom: 0 }}>
                      Generate and download an .ics file to manually import into Apple Calendar, Google Calendar, or Outlook.
                    </p>
                  </div>
                  <button 
                    className="btn btn-secondary"
                    onClick={() => {
                      const tokenVal = localStorage.getItem('token') || '';
                      let downloadUrl = `/api/menu/export-ics?startDate=${startDate}`;
                      if (tokenVal) {
                        downloadUrl += `&token=${encodeURIComponent(tokenVal)}`;
                      }
                      window.open(downloadUrl, '_blank');
                      setShowSyncModal(false);
                    }}
                    style={{ alignSelf: 'flex-start' }}
                  >
                    Download ICS
                  </button>
                </div>

                {/* Option 2: Microsoft Graph sync */}
                <div 
                  style={{
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-md)',
                    padding: '1rem',
                    background: 'var(--bg-card)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.75rem'
                  }}
                >
                  <div>
                    <h4 style={{ fontSize: '0.95rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                      <svg width="16" height="16" viewBox="0 0 23 23" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M0 0H10.9V10.9H0V0Z" fill="#F25022"/>
                        <path d="M12.1 0H23V10.9H12.1V0Z" fill="#7FBA00"/>
                        <path d="M0 12.1H10.9V23H0V12.1Z" fill="#00A4EF"/>
                        <path d="M12.1 12.1H23V23H12.1V12.1Z" fill="#FFB900"/>
                      </svg>
                      Sync to Microsoft Calendar
                    </h4>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem', marginBottom: 0 }}>
                      Directly sync meals to your M365 Outlook calendar. Authenticates with your Microsoft account on-the-fly.
                    </p>
                  </div>
                  
                  {oidcConfigured === null ? (
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>Checking SSO settings...</span>
                  ) : oidcConfigured ? (
                    <button 
                      className="btn btn-primary"
                      onClick={handleMicrosoftSync}
                      disabled={syncing}
                      style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                    >
                      {syncing ? (
                        <>
                          <RefreshCw size={16} style={{ animation: 'rotate 1s infinite linear' }} />
                          <span>Syncing...</span>
                        </>
                      ) : (
                        <span>Sync with Microsoft</span>
                      )}
                    </button>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <span style={{ fontSize: '0.8rem', color: 'var(--danger)', fontWeight: '500' }}>
                        ⚠️ Microsoft SSO (OIDC) is not enabled or configured in settings.
                      </span>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>
                        An administrator needs to enable and configure M365 SSO in the settings panel to use direct sync.
                      </p>
                    </div>
                  )}
                </div>

              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
