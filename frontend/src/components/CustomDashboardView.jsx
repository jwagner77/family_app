import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, Trash2, Settings2, RefreshCw, X, Check, Sun, Moon,
  ArrowLeft, ArrowRight, ArrowUp, ArrowDown, Clock, AlignLeft, 
  BookOpen, CheckSquare, DollarSign, Calendar, AlertTriangle, 
  ChefHat, Book, Info, PlusCircle, LayoutGrid
} from 'lucide-react';

const WIDGET_TYPES = [
  { type: 'clock', name: 'Digital Clock & Date', category: 'Utility', defaultSize: { w: 4, h: 2 } },
  { type: 'text', name: 'Custom Text Card', category: 'Utility', defaultSize: { w: 3, h: 2 } },
  
  { type: 'cookbook_menu', name: '🍳 Cookbook: Weekly Menu', category: 'Cookbook', defaultSize: { w: 6, h: 4 } },
  { type: 'cookbook_menu_3day', name: '🍳 Cookbook: 3-Day Meal Plan', category: 'Cookbook', defaultSize: { w: 3, h: 3 } },
  { type: 'cookbook_menu_5day', name: '🍳 Cookbook: 5-Day Meal Plan', category: 'Cookbook', defaultSize: { w: 5, h: 3 } },
  { type: 'cookbook_leftovers', name: '🍳 Cookbook: Expiring Leftovers', category: 'Cookbook', defaultSize: { w: 3, h: 3 } },
  { type: 'cookbook_recent', name: '🍳 Cookbook: Recent Recipes', category: 'Cookbook', defaultSize: { w: 4, h: 3 } },
  { type: 'cookbook_shopping', name: '🍳 Cookbook: Shopping List', category: 'Cookbook', defaultSize: { w: 3, h: 3 } },
  
  { type: 'library_recent', name: '📚 Library: Recent Books', category: 'Library', defaultSize: { w: 4, h: 3 } },
  { type: 'library_summary', name: '📚 Library: Reading Progress', category: 'Library', defaultSize: { w: 4, h: 3 } },
  { type: 'library_reading_list', name: '📚 Library: Reading List', category: 'Library', defaultSize: { w: 3, h: 3 } },
  
  { type: 'home_tasks', name: '🏠 Home: Active Tasks', category: 'Home', defaultSize: { w: 4, h: 3 } },
  { type: 'home_calendar', name: '🏠 Home: Upcoming Events', category: 'Home', defaultSize: { w: 4, h: 3 } },
  { type: 'home_subscriptions', name: '🏠 Home: Subscriptions', category: 'Home', defaultSize: { w: 3, h: 3 } },
  { type: 'home_recurring_bills', name: '🏠 Home: Recurring Bills', category: 'Home', defaultSize: { w: 3, h: 3 } },
  
  { type: 'weather_current', name: '🌤️ Weather: Current Weather', category: 'Weather', defaultSize: { w: 3, h: 2 } },
  { type: 'weather_hourly', name: '🌤️ Weather: 5-Hour Forecast', category: 'Weather', defaultSize: { w: 4, h: 2 } },
  { type: 'weather_daily', name: '🌤️ Weather: 5-Day Forecast', category: 'Weather', defaultSize: { w: 4, h: 3 } },
  { type: 'weather_combo', name: '🌤️ Weather: Current + 5-Day', category: 'Weather', defaultSize: { w: 4, h: 4 } },
];

export default function CustomDashboardView({ onOpenModal, onNavigateTab, user, resolvedTheme }) {
  const [widgets, setWidgets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [bgType, setBgType] = useState('theme');
  const [bgValue, setBgValue] = useState('');
  const [bgKeywords, setBgKeywords] = useState('');
  const [refreshInterval, setRefreshInterval] = useState('disabled');
  const [currentSig, setCurrentSig] = useState(Date.now().toString());
  const [unsplashUrl, setUnsplashUrl] = useState('');
  const [unsplashAttribution, setUnsplashAttribution] = useState(null);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const gridRef = useRef(null);
  const [dragState, setDragState] = useState({
    id: null,
    startX: 0,
    startY: 0,
    initialX: 0,
    initialY: 0,
    offsetX: 0,
    offsetY: 0
  });
  
  // Widget edit config modal state
  const [editingWidget, setEditingWidget] = useState(null);
  const [configTitle, setConfigTitle] = useState('');
  const [configLimit, setConfigLimit] = useState(5);
  const [configText, setConfigText] = useState('');

  const fetchWidgets = async () => {
    try {
      const res = await fetch('/api/dashboard/widgets');
      if (res.ok) {
        const data = await res.json();
        setWidgets(data);
      }
    } catch (e) {
      console.error('Failed to fetch widgets:', e);
      showToast('Failed to load dashboard widgets', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchDashboardSettings = async () => {
    try {
      const res = await fetch('/api/settings/public');
      if (res.ok) {
        const data = await res.json();
        setBgType(data.dashboard_bg_type || 'theme');
        setBgValue(data.dashboard_bg_value || '');
        setBgKeywords(data.dashboard_bg_unsplash_keywords || '');
        setRefreshInterval(data.dashboard_refresh_interval || 'disabled');
        if (data.dashboard_bg_type === 'unsplash' && data.dashboard_bg_value) {
          // Keep signature stable unless rotated or refreshed
          setCurrentSig(data.dashboard_bg_value);
        }
      }
    } catch (e) {
      console.error('Failed to fetch dashboard settings:', e);
    }
  };

  useEffect(() => {
    fetchWidgets();
    fetchDashboardSettings();
    if (bgType === 'unsplash') {
      setCurrentSig(Date.now().toString());
    }
  }, [refreshTrigger]);

  // Set up auto-refresh interval
  useEffect(() => {
    if (refreshInterval === 'disabled' || !refreshInterval) return;
    const intervalMs = parseInt(refreshInterval, 10) * 1000;
    if (isNaN(intervalMs) || intervalMs <= 0) return;

    const timer = setInterval(() => {
      setRefreshTrigger(p => p + 1);
    }, intervalMs);

    return () => clearInterval(timer);
  }, [refreshInterval]);

  useEffect(() => {
    if (bgType !== 'unsplash') {
      setUnsplashAttribution(null);
      return;
    }
    let active = true;
    const fetchUnsplash = async () => {
      try {
        const query = bgKeywords ? `&keywords=${encodeURIComponent(bgKeywords)}` : '';
        const res = await fetch(`/api/dashboard/background/unsplash?sig=${currentSig}${query}`);
        if (res.ok && active) {
          const data = await res.json();
          if (data.url) {
            setUnsplashUrl(data.url);
          }
          if (data.attribution) {
            setUnsplashAttribution(data.attribution);
          } else {
            setUnsplashAttribution(null);
          }
        }
      } catch (e) {
        console.error('Failed to fetch Unsplash background:', e);
      }
    };
    fetchUnsplash();
    return () => {
      active = false;
    };
  }, [bgType, currentSig, bgKeywords]);

  // Style app container background dynamically to render behind nav bar/sidebar
  useEffect(() => {
    const appEl = document.querySelector('.app-container');
    const mainEl = document.querySelector('.main-content');
    if (!appEl || !mainEl) return;

    // Save original styles to restore them on unmount
    const originalAppBgImage = appEl.style.backgroundImage;
    const originalAppBgColor = appEl.style.backgroundColor;
    const originalAppBgSize = appEl.style.backgroundSize;
    const originalAppBgPosition = appEl.style.backgroundPosition;
    const originalAppBgRepeat = appEl.style.backgroundRepeat;
    const originalAppBgAttachment = appEl.style.backgroundAttachment;
    
    const originalMainBgColor = mainEl.style.backgroundColor;
    const originalMainColor = mainEl.style.color;

    if (bgType === 'light') {
      appEl.style.backgroundColor = '#f8fafc';
      appEl.style.backgroundImage = 'none';
      mainEl.style.backgroundColor = 'transparent';
      mainEl.style.color = '#1e293b';
    } else if (bgType === 'dark') {
      appEl.style.backgroundColor = '#09090b';
      appEl.style.backgroundImage = 'none';
      mainEl.style.backgroundColor = 'transparent';
      mainEl.style.color = '#f8fafc';
    } else if (bgType === 'unsplash') {
      const url = unsplashUrl || `https://images.unsplash.com/featured/1920x1080?sig=${currentSig}${bgKeywords ? `&${encodeURIComponent(bgKeywords)}` : ''}`;
      appEl.style.backgroundImage = `linear-gradient(rgba(0, 0, 0, 0.45), rgba(0, 0, 0, 0.45)), url(${url})`;
      appEl.style.backgroundSize = 'cover';
      appEl.style.backgroundPosition = 'center';
      appEl.style.backgroundRepeat = 'no-repeat';
      appEl.style.backgroundAttachment = 'fixed';
      
      mainEl.style.backgroundColor = 'transparent';
      mainEl.style.color = '#ffffff';
    } else if (bgType === 'upload' && bgValue) {
      appEl.style.backgroundImage = `linear-gradient(rgba(0, 0, 0, 0.45), rgba(0, 0, 0, 0.45)), url(${bgValue})`;
      appEl.style.backgroundSize = 'cover';
      appEl.style.backgroundPosition = 'center';
      appEl.style.backgroundRepeat = 'no-repeat';
      appEl.style.backgroundAttachment = 'fixed';
      
      mainEl.style.backgroundColor = 'transparent';
      mainEl.style.color = '#ffffff';
    }

    return () => {
      appEl.style.backgroundImage = originalAppBgImage;
      appEl.style.backgroundColor = originalAppBgColor;
      appEl.style.backgroundSize = originalAppBgSize;
      appEl.style.backgroundPosition = originalAppBgPosition;
      appEl.style.backgroundRepeat = originalAppBgRepeat;
      appEl.style.backgroundAttachment = originalAppBgAttachment;
      
      mainEl.style.backgroundColor = originalMainBgColor;
      mainEl.style.color = originalMainColor;
    };
  }, [bgType, bgValue, bgKeywords, currentSig, unsplashUrl]);

  const showToast = (text, type = 'success') => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 3500);
  };

  const addWidget = async (typeInfo) => {
    const id = 'w_' + Math.random().toString(36).substring(2, 11);
    
    // Find next available Y coordinate to prevent overlapping on spawn
    let maxY = 0;
    widgets.forEach(w => {
      if (w.y + w.h > maxY) maxY = w.y + w.h;
    });

    const newWidget = {
      id,
      type: typeInfo.type,
      x: 0,
      y: maxY,
      w: typeInfo.defaultSize.w,
      h: typeInfo.defaultSize.h,
      config: {
        title: '',
        limit: 5,
        text: typeInfo.type === 'text' ? 'Double click or edit to add text notes.' : ''
      }
    };

    // Optimistic UI update
    setWidgets(prev => [...prev, newWidget]);
    setIsAddOpen(false);

    try {
      const res = await fetch('/api/dashboard/widgets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newWidget)
      });
      if (res.ok) {
        showToast('Widget added successfully!');
        setRefreshTrigger(p => p + 1);
      } else {
        throw new Error('Failed to save widget');
      }
    } catch (e) {
      showToast('Failed to add widget to server', 'error');
      fetchWidgets(); // Rollback
    }
  };

  const deleteWidget = async (id) => {
    if (!window.confirm('Are you sure you want to remove this widget from your dashboard?')) return;
    
    // Optimistic UI update
    setWidgets(prev => prev.filter(w => w.id !== id));
    
    try {
      const res = await fetch(`/api/dashboard/widgets/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        showToast('Widget removed');
      } else {
        throw new Error('Failed to delete');
      }
    } catch (e) {
      showToast('Failed to delete widget from server', 'error');
      setRefreshTrigger(p => p + 1); // Rollback
    }
  };

  const overlaps = (a, b) => {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  };

  const resolveCollisions = (allWidgets, activeWidget) => {
    let resolved = [];
    const otherWidgets = allWidgets.filter(w => w.id !== activeWidget.id);
    resolved.push(activeWidget);

    const sortedOthers = [...otherWidgets].sort((a, b) => {
      if (a.y !== b.y) return a.y - b.y;
      return a.x - b.x;
    });

    for (const widget of sortedOthers) {
      let current = { ...widget };
      let colliding = true;

      while (colliding) {
        colliding = false;
        for (const r of resolved) {
          if (overlaps(current, r)) {
            current.y = r.y + r.h;
            colliding = true;
          }
        }
      }
      resolved.push(current);
    }
    return resolved;
  };

  const updateWidgetLayout = async (id, updates) => {
    const widget = widgets.find(w => w.id === id);
    if (!widget) return;

    const activeWidget = { ...widget, ...updates };
    const currentWidgets = widgets.map(w => w.id === id ? activeWidget : w);
    const newLayout = resolveCollisions(currentWidgets, activeWidget);

    setWidgets(newLayout);

    try {
      await fetch('/api/dashboard/widgets/layout', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newLayout.map(w => ({ id: w.id, x: w.x, y: w.y, w: w.w, h: w.h })))
      });
    } catch (e) {
      console.error(e);
      showToast('Failed to save dashboard layout', 'error');
      fetchWidgets(); // Rollback
    }
  };

  const handleMoveLeft = (w) => { if (w.x > 0) updateWidgetLayout(w.id, { x: w.x - 1 }); };
  const handleMoveRight = (w) => { if (w.x + w.w < 12) updateWidgetLayout(w.id, { x: w.x + 1 }); };
  const handleMoveUp = (w) => { if (w.y > 0) updateWidgetLayout(w.id, { y: w.y - 1 }); };
  const handleMoveDown = (w) => { updateWidgetLayout(w.id, { y: w.y + 1 }); };

  const handleWidthIncrease = (w) => { if (w.x + w.w < 12) updateWidgetLayout(w.id, { w: w.w + 1 }); };
  const handleWidthDecrease = (w) => { if (w.w > 1) updateWidgetLayout(w.id, { w: w.w - 1 }); };
  const handleHeightIncrease = (w) => { if (w.h < 10) updateWidgetLayout(w.id, { h: w.h + 1 }); };
  const handleHeightDecrease = (w) => { if (w.h > 1) updateWidgetLayout(w.id, { h: w.h - 1 }); };

  const handlePointerDown = (e, widget) => {
    if (!isEditing) return;
    if (e.target.closest('button') || e.target.closest('input') || e.target.closest('textarea')) return;

    e.preventDefault();
    const cardEl = e.currentTarget;
    cardEl.setPointerCapture(e.pointerId);

    setDragState({
      id: widget.id,
      startX: e.clientX,
      startY: e.clientY,
      initialX: widget.x,
      initialY: widget.y,
      offsetX: 0,
      offsetY: 0
    });
  };

  const handlePointerMove = (e, widget) => {
    if (dragState.id !== widget.id) return;
    e.preventDefault();

    const deltaX = e.clientX - dragState.startX;
    const deltaY = e.clientY - dragState.startY;

    const gridEl = gridRef.current;
    if (!gridEl) return;

    const rect = gridEl.getBoundingClientRect();
    const colWidth = rect.width / 12;
    const rowHeightWithGap = 95 + 20; // 95px height + 20px gap

    const deltaCols = Math.round(deltaX / colWidth);
    const deltaRows = Math.round(deltaY / rowHeightWithGap);

    let targetX = dragState.initialX + deltaCols;
    let targetY = dragState.initialY + deltaRows;

    targetX = Math.max(0, Math.min(12 - widget.w, targetX));
    targetY = Math.max(0, targetY);

    setDragState(prev => ({
      ...prev,
      offsetX: deltaX,
      offsetY: deltaY
    }));

    if (targetX !== widget.x || targetY !== widget.y) {
      const activeWidget = { ...widget, x: targetX, y: targetY };
      const currentWidgets = widgets.map(w => w.id === widget.id ? activeWidget : w);
      const newLayout = resolveCollisions(currentWidgets, activeWidget);
      setWidgets(newLayout);
    }
  };

  const handlePointerUp = async (e, widget) => {
    if (dragState.id !== widget.id) return;
    e.preventDefault();
    e.currentTarget.releasePointerCapture(e.pointerId);

    setDragState({
      id: null,
      startX: 0,
      startY: 0,
      initialX: 0,
      initialY: 0,
      offsetX: 0,
      offsetY: 0
    });

    try {
      await fetch('/api/dashboard/widgets/layout', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(widgets.map(w => ({ id: w.id, x: w.x, y: w.y, w: w.w, h: w.h })))
      });
    } catch (err) {
      console.error(err);
      showToast('Failed to save dashboard layout', 'error');
      fetchWidgets();
    }
  };

  const getWidgetStyle = (widget) => {
    const isDragging = dragState.id === widget.id;
    const style = {
      gridColumn: `${widget.x + 1} / span ${widget.w}`,
      gridRow: `${widget.y + 1} / span ${widget.h}`,
      cursor: isEditing ? (isDragging ? 'grabbing' : 'grab') : 'default',
      touchAction: isEditing ? 'none' : 'auto'
    };

    if (isDragging && gridRef.current) {
      const rect = gridRef.current.getBoundingClientRect();
      const colWidth = rect.width / 12;
      const rowHeightWithGap = 95 + 20;

      const shiftX = (widget.x - dragState.initialX) * colWidth;
      const shiftY = (widget.y - dragState.initialY) * rowHeightWithGap;

      const renderX = dragState.offsetX - shiftX;
      const renderY = dragState.offsetY - shiftY;

      style.transform = `translate3d(${renderX}px, ${renderY}px, 0)`;
      style.zIndex = 1000;
      style.opacity = 0.85;
      style.boxShadow = 'var(--shadow-lg)';
      style.borderColor = 'var(--primary)';
    }

    return style;
  };

  const openEditModal = (widget) => {
    setEditingWidget(widget);
    setConfigTitle(widget.config.title || '');
    setConfigLimit(widget.config.limit || 5);
    setConfigText(widget.config.text || '');
  };

  const saveWidgetConfig = async (e) => {
    e.preventDefault();
    if (!editingWidget) return;

    const updatedConfig = {
      ...editingWidget.config,
      title: configTitle.trim(),
      limit: Number(configLimit) || 5,
      text: configText
    };

    setWidgets(prev => prev.map(w => w.id === editingWidget.id ? { ...w, config: updatedConfig } : w));
    
    try {
      const res = await fetch(`/api/dashboard/widgets/${editingWidget.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config: updatedConfig })
      });
      if (res.ok) {
        showToast('Widget configuration updated!');
        setRefreshTrigger(p => p + 1);
      } else {
        throw new Error('Failed to update config');
      }
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setEditingWidget(null);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: '1rem' }}>
        <div className="spinner"></div>
        <p style={{ color: 'var(--text-muted)' }}>Loading your dashboard space...</p>
      </div>
    );
  }

  return (
    <div style={{ width: '100%', paddingBottom: '4rem' }}>
      
      {/* Local toast alerts */}
      {toast && (
        <div className={`alert-banner ${toast.type === 'success' ? 'alert-success' : 'alert-error'}`} style={{ position: 'fixed', top: '1.5rem', right: '1.5rem', zIndex: 1100, width: 'auto', minWidth: '280px', boxShadow: 'var(--shadow-lg)' }}>
          <span>{toast.text}</span>
          <button className="close-btn" onClick={() => setToast(null)}>×</button>
        </div>
      )}

      {/* Dashboard Top Header Control Panel */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '2rem', fontWeight: '800', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', color: (bgType === 'dark' || bgType === 'unsplash' || (bgType === 'upload' && bgValue)) ? '#ffffff' : 'inherit' }}>
            <LayoutGrid size={28} style={{ color: 'var(--primary)' }} />
            Custom Dashboard
          </h2>
          <p style={{ color: (bgType === 'dark' || bgType === 'unsplash' || (bgType === 'upload' && bgValue)) ? 'rgba(255, 255, 255, 0.7)' : 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
            Aggregated metrics and views across all home server applications.
          </p>
        </div>
        
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <button 
            className="btn btn-dashboard-action" 
            onClick={() => setRefreshTrigger(p => p + 1)}
            style={{ padding: '0.6rem 1rem', display: 'flex', gap: '0.4rem', fontSize: '0.85rem' }}
            title="Reload widget data"
          >
            <RefreshCw size={14} /> Refresh All
          </button>
          
          <button 
            className={`btn btn-dashboard-action ${isEditing ? 'active' : ''}`}
            onClick={() => setIsEditing(!isEditing)}
            style={{ padding: '0.6rem 1rem', display: 'flex', gap: '0.4rem', fontSize: '0.85rem' }}
          >
            {isEditing ? (
              <><Check size={14} /> Done Layout</>
            ) : (
              <><LayoutGrid size={14} /> Edit Layout</>
            )}
          </button>

          {/* Add Widget Button & Dropdown */}
          <div style={{ position: 'relative' }}>
            <button 
              className="btn btn-primary"
              onClick={() => setIsAddOpen(!isAddOpen)}
              style={{ padding: '0.6rem 1.25rem', display: 'flex', gap: '0.4rem', fontSize: '0.85rem' }}
            >
              <Plus size={14} /> Add Widget
            </button>
            
            {isAddOpen && (
              <>
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 90 }} onClick={() => setIsAddOpen(false)} />
                <div className="card animate-fade-in" style={{ position: 'absolute', right: 0, top: '110%', width: '320px', zIndex: 100, padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '420px', overflowY: 'auto', boxShadow: 'var(--shadow-lg)' }}>
                  <h4 style={{ fontSize: '0.9rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', margin: 0 }}>Select Widget Type</h4>
                  
                  {['Utility', 'Cookbook', 'Library', 'Home', 'Weather'].map(category => (
                    <div key={category} style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                      <span style={{ fontSize: '0.7rem', fontWeight: 'bold', textTransform: 'uppercase', color: 'var(--text-muted)', marginTop: '0.25rem' }}>{category}</span>
                      {WIDGET_TYPES.filter(w => w.category === category).map(type => (
                        <button
                          key={type.type}
                          className="btn btn-outline"
                          onClick={() => addWidget(type)}
                          style={{ justifyContent: 'flex-start', padding: '0.4rem 0.75rem', fontSize: '0.8rem', borderRadius: 'var(--radius-sm)' }}
                        >
                          <PlusCircle size={12} /> {type.name}
                        </button>
                      ))}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* DOTTED GRID LAYOUT CANVAS */}
      <div className="dashboard-grid-container">
        {widgets.length === 0 ? (
          <div className="card" style={{ padding: '4rem 2rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.25rem' }}>
            <div style={{ fontSize: '3rem' }}>📊</div>
            <h3 style={{ fontSize: '1.25rem', margin: 0 }}>Your Dashboard is Empty</h3>
            <p style={{ color: 'var(--text-muted)', maxWidth: '420px', margin: 0, fontSize: '0.9rem' }}>
              Add custom widgets representing your Cookbook, Library, and Home applications to keep track of everything in one place.
            </p>
            <button className="btn btn-primary" onClick={() => setIsAddOpen(true)} style={{ display: 'flex', gap: '0.5rem' }}>
              <Plus size={16} /> Get Started: Add a Widget
            </button>
          </div>
        ) : (
          <div ref={gridRef} className={`dashboard-grid ${isEditing ? 'editing' : ''}`}>
            {widgets.map(widget => (
              <div 
                key={widget.id}
                id={widget.id}
                className={`widget-card theme-${resolvedTheme || 'light'} ${isEditing ? 'editing' : ''} ${dragState.id === widget.id ? 'dragging' : ''}`}
                style={getWidgetStyle(widget)}
                onPointerDown={(e) => handlePointerDown(e, widget)}
                onPointerMove={(e) => handlePointerMove(e, widget)}
                onPointerUp={(e) => handlePointerUp(e, widget)}
              >
                {/* Visual Widget Header */}
                <div className="widget-header">
                  <span className="widget-title">
                    {getWidgetIcon(widget.type)}
                    {widget.config.title || getDefaultWidgetName(widget.type)}
                  </span>
                  {!isEditing && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <button 
                        onClick={() => setRefreshTrigger(p => p + 1)}
                        style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', padding: '0.25rem' }}
                        title="Reload this widget"
                      >
                        <RefreshCw size={12} />
                      </button>
                    </div>
                  )}
                </div>

                {/* Widget Data-Driven Body */}
                <div className="widget-body">
                  <WidgetContentLoader widget={widget} refreshTrigger={refreshTrigger} onNavigateTab={onNavigateTab} user={user} />
                </div>

                {/* Edit Mode Overlays containing move/resize handles */}
                {isEditing && (
                  <div className="widget-controls-overlay">
                    <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--primary)' }}>
                      Size: {widget.w}x{widget.h} | Position: ({widget.x},{widget.y})
                    </span>
                    
                    {/* Move controls */}
                    <div className="control-btn-group">
                      <button className="control-btn" onClick={() => handleMoveUp(widget)} title="Move Up"><ArrowUp size={14} /></button>
                      <button className="control-btn" onClick={() => handleMoveDown(widget)} title="Move Down"><ArrowDown size={14} /></button>
                      <button className="control-btn" onClick={() => handleMoveLeft(widget)} title="Move Left"><ArrowLeft size={14} /></button>
                      <button className="control-btn" onClick={() => handleMoveRight(widget)} title="Move Right"><ArrowRight size={14} /></button>
                    </div>

                    {/* Resize controls */}
                    <div className="control-btn-group">
                      <button className="control-btn" onClick={() => handleWidthDecrease(widget)} title="Narrower">-W</button>
                      <button className="control-btn" onClick={() => handleWidthIncrease(widget)} title="Wider">+W</button>
                      <button className="control-btn" onClick={() => handleHeightDecrease(widget)} title="Shorter">-H</button>
                      <button className="control-btn" onClick={() => handleHeightIncrease(widget)} title="Taller">+H</button>
                    </div>

                    {/* Action controls */}
                    <div className="control-btn-group" style={{ marginTop: '0.25rem' }}>
                      <button className="control-btn" onClick={() => openEditModal(widget)} title="Widget Settings" style={{ color: 'var(--primary)', borderColor: 'var(--primary)' }}>
                        <Settings2 size={14} />
                      </button>
                      <button className="control-btn danger" onClick={() => deleteWidget(widget.id)} title="Delete Widget">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Widget settings config modal */}
      {editingWidget && (
        <div className="modal-overlay" onClick={() => setEditingWidget(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '480px' }}>
            <div className="modal-header">
              <h2 style={{ fontSize: '1.25rem', fontWeight: '800' }}>Widget Configurations</h2>
              <button className="close-btn" style={{ fontSize: '1.5rem' }} onClick={() => setEditingWidget(null)}>×</button>
            </div>
            
            <form onSubmit={saveWidgetConfig}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="form-group">
                  <label>Custom Title Override</label>
                  <input
                    type="text"
                    className="input-control"
                    value={configTitle}
                    onChange={e => setConfigTitle(e.target.value)}
                    placeholder={`Leave blank to use default (${getDefaultWidgetName(editingWidget.type)})`}
                  />
                </div>

                {editingWidget.type.includes('recent') && (
                  <div className="form-group">
                    <label>Items Display Count</label>
                    <input
                      type="number"
                      className="input-control"
                      value={configLimit}
                      onChange={e => setConfigLimit(Math.max(1, Number(e.target.value)))}
                      min="1"
                      max="20"
                    />
                  </div>
                )}

                {editingWidget.type === 'text' && (
                  <div className="form-group">
                    <label>Text Content</label>
                    <textarea
                      className="input-control"
                      value={configText}
                      onChange={e => setConfigText(e.target.value)}
                      placeholder="Enter note contents..."
                    />
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
                  <button type="button" className="btn btn-outline" onClick={() => setEditingWidget(null)}>Cancel</button>
                  <button type="submit" className="btn btn-primary">Save Changes</button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* UNPLASH ATTRIBUTION BADGE */}
      {bgType === 'unsplash' && unsplashAttribution && (
        <div style={{
          position: 'fixed',
          bottom: '1rem',
          right: '1.5rem',
          backgroundColor: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(4px)',
          padding: '0.4rem 0.8rem',
          borderRadius: 'var(--radius-sm, 4px)',
          fontSize: '0.72rem',
          color: '#ffffff',
          zIndex: 1000,
          border: '1px solid rgba(255,255,255,0.15)',
          boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.25rem',
          fontFamily: 'var(--font-body)',
          pointerEvents: 'auto'
        }}>
          <span>Photo by</span>
          <a
            href={unsplashAttribution.photographerUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: '#60a5fa', textDecoration: 'underline', fontWeight: '600' }}
          >
            {unsplashAttribution.photographerName}
          </a>
          <span>on</span>
          <a
            href={unsplashAttribution.photoUrl || 'https://unsplash.com?utm_source=dashboard_app&utm_medium=referral'}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: '#60a5fa', textDecoration: 'underline', fontWeight: '600' }}
          >
            Unsplash
          </a>
        </div>
      )}
    </div>
  );
}

// Helper icons mapping
function getWidgetIcon(type) {
  switch (type) {
    case 'clock': return <Clock size={16} />;
    case 'text': return <AlignLeft size={16} />;
    case 'cookbook_menu':
    case 'cookbook_menu_3day':
    case 'cookbook_menu_5day': return <ChefHat size={16} />;
    case 'cookbook_leftovers': return <ChefHat size={16} />;
    case 'cookbook_recent': return <ChefHat size={16} />;
    case 'cookbook_shopping': return <ChefHat size={16} />;
    case 'library_recent': return <BookOpen size={16} />;
    case 'library_summary': return <BookOpen size={16} />;
    case 'library_reading_list': return <BookOpen size={16} />;
    case 'home_tasks': return <CheckSquare size={16} />;
    case 'home_calendar': return <Calendar size={16} />;
    case 'home_subscriptions': return <DollarSign size={16} />;
    case 'home_bills':
    case 'home_recurring_bills': return <DollarSign size={16} />;
    case 'weather_current':
    case 'weather_hourly':
    case 'weather_daily':
    case 'weather_combo': return <Sun size={16} />;
    default: return <Info size={16} />;
  }
}

function getDefaultWidgetName(type) {
  const typeMap = {
    clock: 'Digital Clock & Date',
    text: 'Note Card',
    cookbook_menu: 'Weekly Menu Plan',
    cookbook_menu_3day: '3-Day Meal Plan',
    cookbook_menu_5day: '5-Day Meal Plan',
    cookbook_leftovers: 'Expiring Leftovers',
    cookbook_recent: 'Recent Recipes added',
    cookbook_shopping: 'Shopping Lists',
    library_recent: 'Recently Added Books',
    library_summary: 'Reading Log Summary',
    library_reading_list: 'Active Reading List',
    home_tasks: 'Upcoming Todo Tasks',
    home_calendar: 'Calendar Timeline',
    home_subscriptions: 'Subscriptions Billings',
    home_bills: 'Recurring Bills',
    home_recurring_bills: 'Recurring Bills',
    weather_current: 'Current Weather',
    weather_hourly: '5-Hour Forecast',
    weather_daily: '5-Day Forecast',
    weather_combo: 'Current + 5-Day Forecast'
  };
  return typeMap[type] || 'Custom Widget';
}

/* WIDGET RENDER DATA CONTROLLERS */
function WidgetContentLoader({ widget, refreshTrigger, onNavigateTab, user }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    const loadData = async () => {
      try {
        const res = await fetch(`/api/dashboard/widget-data/${widget.id}`);
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || `Server status ${res.status}`);
        }
        const json = await res.json();
        if (active) {
          setData(json);
          setLoading(false);
        }
      } catch (err) {
        if (active) {
          setError(err.message);
          setLoading(false);
        }
      }
    };

    loadData();

    return () => { active = false; };
  }, [widget.id, refreshTrigger]);

  if (loading) {
    return (
      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
          <div className="spinner" style={{ width: '18px', height: '18px', borderWidth: '2px' }}></div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Loading...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', color: 'var(--danger)', textAlign: 'center', gap: '0.5rem', padding: '0.5rem' }}>
        <AlertTriangle size={20} />
        <span style={{ fontSize: '0.75rem', fontWeight: 'bold' }}>Widget Error</span>
        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {error.includes('not configured') ? (
            <span style={{ color: 'var(--primary)' }}>Integration not configured in Settings</span>
          ) : error}
        </span>
      </div>
    );
  }

  // Render individual widget bodies based on their retrieved structures
  switch (widget.type) {
    case 'clock':
      return <ClockWidgetView />;
    case 'text':
      return <TextWidgetView text={widget.config.text || ''} />;
      
    case 'cookbook_leftovers':
      return <CookbookLeftoversView leftovers={data} />;
    case 'cookbook_menu':
      return <CookbookMenuView menu={data} />;
    case 'cookbook_recent':
      return <CookbookRecentView recipes={data} />;
    case 'cookbook_shopping':
      return <CookbookShoppingView lists={data} />;
      
    case 'library_recent':
      return <LibraryRecentView books={data} />;
    case 'library_summary':
      return <LibrarySummaryView summary={data} />;
    case 'library_reading_list':
      return <LibraryReadingListView items={data} />;
      
    case 'home_tasks':
      return <HomeTasksView tasks={data} />;
    case 'home_calendar':
      return <HomeCalendarView events={data} />;
    case 'home_subscriptions':
      return <HomeSubscriptionsView subscriptions={data} user={user} />;
    case 'home_bills':
    case 'home_recurring_bills':
      return <HomeBillsView bills={data} user={user} />;
      
    case 'cookbook_menu_3day':
      return <CookbookMenuNDaysView menu={data} daysCount={3} />;
    case 'cookbook_menu_5day':
      return <CookbookMenuNDaysView menu={data} daysCount={5} />;
      
    case 'weather_current':
      return <WeatherCurrentView weather={data} />;
    case 'weather_hourly':
      return <WeatherHourlyView weather={data} />;
    case 'weather_daily':
      return <WeatherDailyView weather={data} />;
    case 'weather_combo':
      return <WeatherComboView weather={data} />;
      
    default:
      return <p style={{ fontSize: '0.75rem' }}>Unsupported widget: {widget.type}</p>;
  }
}

/* WIDGET PRESENTATION VIEWS */

function ClockWidgetView() {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const timeStr = time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const dateStr = time.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', justifyItems: 'center', justifyContent: 'center', height: '100%', textAlign: 'center', padding: '0.5rem 0' }}>
      <span style={{ fontSize: '1.75rem', fontWeight: '800', fontFamily: 'monospace', color: 'var(--primary)', letterSpacing: '0.5px' }}>{timeStr}</span>
      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem', fontWeight: '500' }}>{dateStr}</span>
    </div>
  );
}

function TextWidgetView({ text }) {
  return (
    <div style={{ whiteSpace: 'pre-wrap', color: 'var(--text-main)', fontSize: '0.8rem', lineHeight: '1.5', height: '100%' }}>
      {text || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Double click or edit layout to write notes here...</span>}
    </div>
  );
}

function CookbookLeftoversView({ leftovers }) {
  if (!leftovers || leftovers.length === 0) {
    return <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.75rem', textAlign: 'center', marginTop: '1rem' }}>No active leftovers in the fridge.</p>;
  }

  const sorted = [...leftovers].sort((a, b) => new Date(a.expiration_date) - new Date(b.expiration_date)).slice(0, 5);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      {sorted.map(item => {
        const diff = new Date(item.expiration_date) - new Date().setHours(0,0,0,0);
        const daysLeft = Math.ceil(diff / (1000 * 60 * 60 * 24));
        let badgeStyle = 'badge-primary';
        let badgeLabel = `${daysLeft} days left`;
        
        if (daysLeft <= 0) {
          badgeStyle = 'badge-danger';
          badgeLabel = 'Expired';
        } else if (daysLeft === 1) {
          badgeStyle = 'badge-danger';
          badgeLabel = 'Expires tomorrow';
        } else if (daysLeft === 2) {
          badgeStyle = 'badge-warning';
          badgeLabel = '2 days left';
        }

        return (
          <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.4rem 0.5rem', borderBottom: '1px solid var(--border-color)', fontSize: '0.75rem' }}>
            <span style={{ fontWeight: '500', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '60%' }} title={item.name}>{item.name}</span>
            <span className={`badge ${badgeStyle}`}>{badgeLabel}</span>
          </div>
        );
      })}
    </div>
  );
}

function CookbookMenuView({ menu }) {
  if (!menu || menu.length === 0) {
    return <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.75rem', textAlign: 'center', marginTop: '1.5rem' }}>No meals planned on the menu.</p>;
  }

  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  
  // Group menu by day of week
  const grouped = {};
  daysOfWeek.forEach(d => { grouped[d] = []; });
  menu.forEach(item => {
    if (grouped[item.day_of_week]) {
      grouped[item.day_of_week].push(item);
    }
  });

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem', height: '100%', overflowY: 'auto' }}>
      {daysOfWeek.map(day => {
        const plans = grouped[day];
        const hasPlans = plans && plans.length > 0;
        
        return (
          <div key={day} style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', padding: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.35rem', background: 'var(--bg-app-dark, rgba(0,0,0,0.01))' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--primary)', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.15rem' }}>{day}</span>
            
            {hasPlans ? (
              plans.map((p, idx) => (
                <div key={idx} style={{ display: 'flex', flexDirection: 'column', fontSize: '0.7rem', borderBottom: idx < plans.length - 1 ? '1px dashed var(--border-color)' : 'none', paddingBottom: '0.15rem' }}>
                  <span style={{ textTransform: 'capitalize', color: 'var(--text-muted)', fontSize: '0.65rem', fontWeight: '600' }}>{p.meal_type}</span>
                  <span style={{ fontWeight: '500', color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {p.recipe_title || p.leftover_name || p.custom_meal}
                  </span>
                </div>
              ))
            ) : (
              <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontStyle: 'italic', marginTop: '0.25rem' }}>No meals planned</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

function CookbookRecentView({ recipes }) {
  if (!recipes || recipes.length === 0) {
    return <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.75rem', textAlign: 'center', marginTop: '1.5rem' }}>No recipes added yet.</p>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      {recipes.slice(0, 4).map(recipe => (
        <div key={recipe.id} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', padding: '0.25rem 0', borderBottom: '1px solid var(--border-color)' }}>
          {recipe.image_path ? (
            <img 
              src={recipe.image_path.startsWith('/') ? recipe.image_path : `/${recipe.image_path}`} 
              alt={recipe.title} 
              style={{ width: '36px', height: '36px', objectFit: 'cover', borderRadius: '4px' }} 
            />
          ) : (
            <div style={{ width: '36px', height: '36px', borderRadius: '4px', background: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem' }}>🍳</div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{recipe.title}</span>
            <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Servings: {recipe.servings || 'N/A'} | Time: {recipe.cook_time ? `${recipe.cook_time}m` : 'N/A'}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function CookbookShoppingView({ lists }) {
  if (!lists || lists.length === 0) {
    return <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.75rem', textAlign: 'center', marginTop: '1.5rem' }}>No active shopping lists.</p>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      {lists.slice(0, 5).map(list => (
        <div key={list.id} style={{ display: 'flex', justifyItems: 'center', justifyContent: 'space-between', padding: '0.4rem 0.5rem', borderBottom: '1px solid var(--border-color)', fontSize: '0.75rem' }}>
          <span style={{ fontWeight: '500' }}>🛒 {list.name}</span>
          <span className="badge badge-primary">{list.item_count || 0} items</span>
        </div>
      ))}
    </div>
  );
}

function LibraryRecentView({ books }) {
  if (!books || books.length === 0) {
    return <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.75rem', textAlign: 'center', marginTop: '1.5rem' }}>No books in the library.</p>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      {books.slice(0, 4).map(book => (
        <div key={book.id} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', padding: '0.25rem 0', borderBottom: '1px solid var(--border-color)' }}>
          {book.cover_url ? (
            <img 
              src={book.cover_url} 
              alt={book.title} 
              style={{ width: '32px', height: '42px', objectFit: 'cover', borderRadius: '2px', boxShadow: '0 1px 2px rgba(0,0,0,0.1)' }} 
            />
          ) : (
            <div style={{ width: '32px', height: '42px', borderRadius: '2px', background: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem' }}>📚</div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{book.title}</span>
            <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>By: {book.author || 'Unknown Author'}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function LibrarySummaryView({ summary }) {
  if (!summary || summary.length === 0) {
    return <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.75rem', textAlign: 'center', marginTop: '1.5rem' }}>No active reading progress logged.</p>;
  }

  // Filter books currently being read (progress > 0 and progress < 100)
  const activeBooks = summary.filter(b => b.latest_progress > 0 && b.latest_progress < 100 && !b.is_dnf).slice(0, 3);

  if (activeBooks.length === 0) {
    return <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.75rem', textAlign: 'center', marginTop: '1.5rem' }}>All logged books are completed or DNF.</p>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      {activeBooks.map(book => (
        <div key={book.book_id || book.reading_list_id || book.book_title} style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', paddingBottom: '0.4rem', borderBottom: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: 'bold' }}>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '75%' }}>{book.book_title}</span>
            <span style={{ color: 'var(--primary)' }}>{book.latest_progress}%</span>
          </div>
          <div style={{ width: '100%', height: '6px', background: 'var(--border-color)', borderRadius: '3px', overflow: 'hidden' }}>
            <div style={{ width: `${book.latest_progress}%`, height: '100%', background: 'var(--primary)', borderRadius: '3px' }}></div>
          </div>
          <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)', textAlign: 'right' }}>Author: {book.book_author || 'Unknown'}</span>
        </div>
      ))}
    </div>
  );
}

function LibraryReadingListView({ items }) {
  if (!items || items.length === 0) {
    return <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.75rem', textAlign: 'center', marginTop: '1.5rem' }}>Reading list is empty.</p>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      {items.slice(0, 5).map(item => (
        <div key={item.id} style={{ display: 'flex', justifyItems: 'center', justifyContent: 'space-between', padding: '0.4rem 0.5rem', borderBottom: '1px solid var(--border-color)', fontSize: '0.75rem' }}>
          <span style={{ fontWeight: '500', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '70%' }}>
            📖 {item.title || item.lib_title}
          </span>
          <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '28%' }}>
            {item.author || item.lib_author || 'Unknown'}
          </span>
        </div>
      ))}
    </div>
  );
}

function HomeTasksView({ tasks }) {
  if (!tasks || tasks.length === 0) {
    return <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.75rem', textAlign: 'center', marginTop: '1.5rem' }}>No active todo tasks.</p>;
  }

  // Filter uncompleted tasks
  const activeTasks = tasks.filter(t => !t.completed).slice(0, 5);

  if (activeTasks.length === 0) {
    return <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.75rem', textAlign: 'center', marginTop: '1.5rem' }}>🎉 All tasks completed!</p>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      {activeTasks.map(task => {
        const isOverdue = task.due_date && new Date(task.due_date) < new Date();
        const dateStr = task.due_date ? new Date(task.due_date).toLocaleDateString([], { month: 'short', day: 'numeric' }) : '';
        
        return (
          <div key={task.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.3rem 0', borderBottom: '1px solid var(--border-color)', fontSize: '0.75rem' }}>
            <input type="checkbox" checked={false} readOnly style={{ cursor: 'not-allowed', accentColor: 'var(--primary)' }} />
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
              <span style={{ fontWeight: '500', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{task.title}</span>
              <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>List: {task.list_name}</span>
            </div>
            {dateStr && (
              <span className={`badge ${isOverdue ? 'badge-danger' : 'badge-primary'}`} style={{ fontSize: '0.65rem', flexShrink: 0 }}>
                {dateStr}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

function HomeCalendarView({ events }) {
  if (!events || events.length === 0) {
    return <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.75rem', textAlign: 'center', marginTop: '1.5rem' }}>No upcoming calendar events.</p>;
  }

  // Get active future events
  const upcoming = events
    .filter(e => new Date(e.end_time) >= new Date())
    .slice(0, 4);

  if (upcoming.length === 0) {
    return <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.75rem', textAlign: 'center', marginTop: '1.5rem' }}>No upcoming events today.</p>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
      {upcoming.map(event => {
        const start = new Date(event.start_time);
        const dateStr = start.toLocaleDateString([], { month: 'short', day: 'numeric' });
        const timeStr = start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        return (
          <div key={event.id} style={{ display: 'flex', gap: '0.5rem', alignItems: 'start', paddingBottom: '0.4rem', borderBottom: '1px solid var(--border-color)', fontSize: '0.75rem' }}>
            <div style={{ background: 'var(--primary-light)', padding: '0.25rem 0.4rem', borderRadius: '4px', textAlign: 'center', minWidth: '45px', flexShrink: 0 }}>
              <span style={{ display: 'block', fontSize: '0.65rem', fontWeight: 'bold', color: 'var(--primary)' }}>{dateStr}</span>
              <span style={{ display: 'block', fontSize: '0.55rem', color: 'var(--text-muted)' }}>{timeStr}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 }}>
              <span style={{ fontWeight: 'bold', color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{event.title}</span>
              <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                📍 {event.location || 'No Location'}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

const getTodayStrInTimezone = (tz) => {
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: tz || undefined,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    const parts = formatter.formatToParts(new Date());
    const year = parts.find(p => p.type === 'year').value;
    const month = parts.find(p => p.type === 'month').value;
    const day = parts.find(p => p.type === 'day').value;
    return `${year}-${month}-${day}`;
  } catch (e) {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
};

const formatDateInTimezone = (dateStr, tz) => {
  if (!dateStr) return 'N/A';
  try {
    const cleanStr = dateStr.substring(0, 10);
    const parts = cleanStr.split('-');
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    const day = parseInt(parts[2], 10);
    const d = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
    const weekday = d.toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' });
    return `${weekday} ${month}/${day}`;
  } catch (e) {
    return dateStr;
  }
};

function HomeSubscriptionsView({ subscriptions, user }) {
  const todayStr = getTodayStrInTimezone(user?.timezone);
  const upcoming = (subscriptions || []).filter(sub => {
    if (!sub.next_billing_date) return false;
    return sub.next_billing_date.substring(0, 10) >= todayStr;
  });

  if (upcoming.length === 0) {
    return <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.75rem', textAlign: 'center', marginTop: '1.5rem' }}>No active subscriptions.</p>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', flex: 1, overflowY: 'auto' }}>
        {upcoming.slice(0, 3).map(sub => {
          const billingDate = formatDateInTimezone(sub.next_billing_date, user?.timezone);
          return (
            <div key={sub.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.3rem 0.5rem', borderBottom: '1px solid var(--border-color)', fontSize: '0.75rem' }}>
              <span style={{ fontWeight: '500', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '55%' }}>{sub.name}</span>
              <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Due: {billingDate}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function HomeBillsView({ bills, user }) {
  const todayStr = getTodayStrInTimezone(user?.timezone);
  const upcoming = (bills || []).filter(bill => {
    if (!bill.next_billing_date) return false;
    return bill.next_billing_date.substring(0, 10) >= todayStr;
  });

  if (upcoming.length === 0) {
    return <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.75rem', textAlign: 'center', marginTop: '1.5rem' }}>No active bills.</p>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', flex: 1, overflowY: 'auto' }}>
        {upcoming.slice(0, 3).map(bill => {
          const billingDate = formatDateInTimezone(bill.next_billing_date, user?.timezone);
          return (
            <div key={bill.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.3rem 0.5rem', borderBottom: '1px solid var(--border-color)', fontSize: '0.75rem' }}>
              <span style={{ fontWeight: '500', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '55%' }}>
                {bill.name} {bill.tag && <span style={{ fontSize: '0.65rem', color: 'var(--primary)' }}>({bill.tag})</span>}
              </span>
              <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Due: {billingDate}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// --- WEATHER WIDGET VIEWS ---

function getWeatherInfo(wcode) {
  const code = Number(wcode);
  if (code === 0) return { label: 'Clear Sky', icon: '☀️' };
  if ([1, 2, 3].includes(code)) return { label: 'Partly Cloudy', icon: '🌤️' };
  if ([45, 48].includes(code)) return { label: 'Foggy', icon: '🌫️' };
  if ([51, 53, 55, 56, 57].includes(code)) return { label: 'Drizzle', icon: '🌧️' };
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return { label: 'Rainy', icon: '🌧️' };
  if ([71, 73, 75, 77, 85, 86].includes(code)) return { label: 'Snowy', icon: '❄️' };
  if ([95, 96, 99].includes(code)) return { label: 'Thunderstorm', icon: '⛈️' };
  return { label: 'Unknown', icon: '🌤️' };
}

function WeatherCurrentView({ weather }) {
  if (!weather) return <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.75rem', textAlign: 'center', marginTop: '1.5rem' }}>No weather data.</p>;
  
  const currentInfo = getWeatherInfo(weather.current.weathercode);
  const tempUnitStr = weather.unit === 'celsius' ? '°C' : '°F';
  const windUnitStr = weather.unit === 'celsius' ? 'km/h' : 'mph';

  const todayHigh = weather.daily && weather.daily.temperature_2m_max ? Math.round(weather.daily.temperature_2m_max[0]) : null;
  const todayLow = weather.daily && weather.daily.temperature_2m_min ? Math.round(weather.daily.temperature_2m_min[0]) : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'space-between', padding: '0.2rem' }}>
      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        📍 {weather.locationName || 'Current Location'}
      </div>
      
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '0.4rem 0' }}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: '2rem', fontWeight: '800', lineHeight: 1, color: 'var(--text-main)' }}>
            {Math.round(weather.current.temperature)}{tempUnitStr}
          </span>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '500', marginTop: '0.2rem' }}>
            {currentInfo.icon} {currentInfo.label}
          </span>
        </div>
        <div style={{ fontSize: '2.5rem', lineHeight: 1 }}>
          {currentInfo.icon}
        </div>
      </div>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border-color)', paddingTop: '0.4rem', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
        <span>Wind: {weather.current.windspeed} {windUnitStr}</span>
        {todayHigh !== null && todayLow !== null && (
          <span>H: {todayHigh}° L: {todayLow}°</span>
        )}
      </div>
    </div>
  );
}

function WeatherHourlyView({ weather }) {
  if (!weather || !weather.hourly) return <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.75rem', textAlign: 'center', marginTop: '1.5rem' }}>No forecast data.</p>;

  const tempUnitStr = weather.unit === 'celsius' ? '°' : '°';
  const currentHour = new Date().getHours();
  
  const hourlyData = [];
  for (let i = 0; i < 5; i++) {
    const idx = (currentHour + i) % 24;
    const hourLabel = idx === 0 ? '12 AM' : idx === 12 ? '12 PM' : idx > 12 ? `${idx - 12} PM` : `${idx} AM`;
    const temp = weather.hourly.temperature_2m ? Math.round(weather.hourly.temperature_2m[idx]) : '--';
    const code = weather.hourly.weathercode ? weather.hourly.weathercode[idx] : 0;
    const info = getWeatherInfo(code);
    hourlyData.push({ hourLabel, temp, info });
  }

  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '100%', gap: '0.4rem', padding: '0.2rem 0' }}>
      {hourlyData.map((item, idx) => (
        <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, padding: '0.4rem 0.2rem', background: 'rgba(var(--primary-rgb, 0,0,0), 0.05)', borderRadius: 'var(--radius-sm, 4px)', fontSize: '0.7rem' }}>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.6rem', marginBottom: '0.2rem' }}>{item.hourLabel}</span>
          <span style={{ fontSize: '1.1rem', margin: '0.15rem 0' }} title={item.info.label}>{item.info.icon}</span>
          <span style={{ fontWeight: 'bold', color: 'var(--text-main)' }}>{item.temp}{tempUnitStr}</span>
        </div>
      ))}
    </div>
  );
}

function WeatherDailyView({ weather }) {
  if (!weather || !weather.daily) return <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.75rem', textAlign: 'center', marginTop: '1.5rem' }}>No forecast data.</p>;

  const dailyData = [];
  const limit = Math.min(5, weather.daily.time.length);
  for (let i = 0; i < limit; i++) {
    const rawDate = weather.daily.time[i];
    const dayLabel = new Date(rawDate + 'T00:00:00').toLocaleDateString([], { weekday: 'short' });
    const maxTemp = Math.round(weather.daily.temperature_2m_max[i]);
    const minTemp = Math.round(weather.daily.temperature_2m_min[i]);
    const code = weather.daily.weathercode[i];
    const info = getWeatherInfo(code);
    dailyData.push({ dayLabel, maxTemp, minTemp, info });
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', height: '100%', overflowY: 'auto' }}>
      {dailyData.map((item, idx) => (
        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.25rem 0.5rem', borderBottom: '1px solid var(--border-color)', fontSize: '0.72rem' }}>
          <span style={{ fontWeight: '500', color: 'var(--text-muted)', minWidth: '40px' }}>{item.dayLabel}</span>
          <span style={{ fontSize: '0.95rem' }} title={item.info.label}>{item.info.icon}</span>
          <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end', minWidth: '55px' }}>
            <span style={{ fontWeight: 'bold', color: 'var(--text-main)' }}>{item.maxTemp}°</span>
            <span style={{ color: 'var(--text-muted)', opacity: 0.8 }}>{item.minTemp}°</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function WeatherComboView({ weather }) {
  if (!weather) return <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.75rem', textAlign: 'center', marginTop: '1.5rem' }}>No weather data.</p>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', height: '100%' }}>
      <div style={{ paddingBottom: '0.5rem', borderBottom: '1px solid var(--border-color)' }}>
        <WeatherCurrentView weather={weather} />
      </div>
      <div style={{ flex: 1, minHeight: 0 }}>
        <span style={{ fontSize: '0.65rem', fontWeight: 'bold', textTransform: 'uppercase', tracking: 'wider', color: 'var(--text-muted)', display: 'block', marginBottom: '0.3rem', paddingLeft: '0.2rem' }}>
          5-Day Forecast
        </span>
        <WeatherDailyView weather={weather} />
      </div>
    </div>
  );
}

function CookbookMenuNDaysView({ menu, daysCount }) {
  if (!menu || menu.length === 0) {
    return <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.75rem', textAlign: 'center', marginTop: '1.5rem' }}>No meals planned on the menu.</p>;
  }

  const daysOfWeekOrder = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const todayIdx = new Date().getDay();
  const targetDays = [];
  for (let i = 0; i < daysCount; i++) {
    targetDays.push(daysOfWeekOrder[(todayIdx + i) % 7]);
  }

  const grouped = {};
  targetDays.forEach(d => { grouped[d] = []; });
  menu.forEach(item => {
    if (grouped[item.day_of_week]) {
      grouped[item.day_of_week].push(item);
    }
  });

  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${daysCount}, minmax(0, 1fr))`, gap: '0.5rem', height: '100%', overflowY: 'auto' }}>
      {targetDays.map(day => {
        const plans = grouped[day];
        const hasPlans = plans && plans.length > 0;
        
        return (
          <div key={day} style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', padding: '0.4rem', display: 'flex', flexDirection: 'column', gap: '0.25rem', background: 'var(--bg-app-dark, rgba(0,0,0,0.01))', minWidth: 0 }}>
            <span style={{ fontSize: '0.7rem', fontWeight: 'bold', color: 'var(--primary)', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.1rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{day}</span>
            
            {hasPlans ? (
              plans.map((p, idx) => (
                <div key={idx} style={{ display: 'flex', flexDirection: 'column', fontSize: '0.65rem', borderBottom: idx < plans.length - 1 ? '1px dashed var(--border-color)' : 'none', paddingBottom: '0.1rem', minWidth: 0 }}>
                  <span style={{ textTransform: 'capitalize', color: 'var(--text-muted)', fontSize: '0.6rem', fontWeight: '600' }}>{p.meal_type}</span>
                  <span style={{ fontWeight: '500', color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={p.recipe_title || p.leftover_name || p.custom_meal}>
                    {p.recipe_title || p.leftover_name || p.custom_meal}
                  </span>
                </div>
              ))
            ) : (
              <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontStyle: 'italic', marginTop: '0.2rem' }}>No meals</span>
            )}
          </div>
        );
      })}
    </div>
  );
}
