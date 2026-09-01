import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, Trash2, Settings2, RefreshCw, X, Check, Sun, Moon,
  ArrowLeft, ArrowRight, ArrowUp, ArrowDown, Clock, AlignLeft, 
  BookOpen, CheckSquare, DollarSign, Calendar, AlertTriangle, 
  ChefHat, Book, Info, PlusCircle, LayoutGrid, Edit2, Play, Pause,
  ChevronDown, Star, PlayCircle, PauseCircle, Layers, Copy,
  ChevronLeft, ChevronRight, List, MapPin, Tag
} from 'lucide-react';

const WIDGET_TYPES = [
  { type: 'clock', name: 'Digital Clock & Date', category: 'Utility', defaultSize: { w: 4, h: 2 } },
  { type: 'text', name: 'Custom Text Card', category: 'Utility', defaultSize: { w: 3, h: 2 } },

  { type: 'calendar_daily', name: '📅 Calendar: Daily Agenda', category: 'Calendar', defaultSize: { w: 4, h: 4 } },
  { type: 'calendar_weekly', name: '📅 Calendar: Weekly Agenda', category: 'Calendar', defaultSize: { w: 6, h: 4 } },
  { type: 'calendar_monthly', name: '📅 Calendar: Monthly Agenda', category: 'Calendar', defaultSize: { w: 6, h: 5 } },
  { type: 'calendar_month_grid', name: '📅 Calendar: Full Monthly Calendar', category: 'Calendar', defaultSize: { w: 12, h: 6 } },
  
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
  const [dashboards, setDashboards] = useState([]);
  const [currentDashboardId, setCurrentDashboardId] = useState(() => localStorage.getItem('active_dashboard_id') || 'default');
  const [isAddDashboardModalOpen, setIsAddDashboardModalOpen] = useState(false);
  const [newDashboardName, setNewDashboardName] = useState('');
  const [cloneFromId, setCloneFromId] = useState('');
  const [isManageDashboardsModalOpen, setIsManageDashboardsModalOpen] = useState(false);
  const [editingDashboardId, setEditingDashboardId] = useState(null);
  const [renameDashboardName, setRenameDashboardName] = useState('');

  // Rotation state
  const [isRotating, setIsRotating] = useState(false);
  const [rotationInterval, setRotationInterval] = useState(30);
  const [rotationDashboards, setRotationDashboards] = useState([]);
  const [secondsUntilRotate, setSecondsUntilRotate] = useState(30);

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

  const fetchDashboards = async () => {
    try {
      const res = await fetch('/api/dashboards');
      if (res.ok) {
        const data = await res.json();
        setDashboards(data);
        if (data.length > 0) {
          // If current ID is invalid or not in list, fallback to default or first
          const exists = data.some(d => d.id === currentDashboardId);
          if (!exists) {
            const def = data.find(d => d.is_default) || data[0];
            setCurrentDashboardId(def.id);
            localStorage.setItem('active_dashboard_id', def.id);
          }
        }
      }
    } catch (e) {
      console.error('Failed to fetch dashboards:', e);
    }
  };

  const fetchWidgets = async (dashboardId = currentDashboardId) => {
    if (!dashboardId) return;
    try {
      const res = await fetch(`/api/dashboard/widgets?dashboard_id=${encodeURIComponent(dashboardId)}`);
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
        
        const rotEnabled = data.dashboard_rotation_enabled === 'true';
        const rotInterval = parseInt(data.dashboard_rotation_interval, 10) || 30;
        setRotationInterval(rotInterval);
        setSecondsUntilRotate(rotInterval);
        
        if (data.dashboard_rotation_dashboards) {
          try {
            setRotationDashboards(JSON.parse(data.dashboard_rotation_dashboards));
          } catch (e) {}
        }
        
        if (data.dashboard_bg_type === 'unsplash' && data.dashboard_bg_value) {
          setCurrentSig(data.dashboard_bg_value);
        }
      }
    } catch (e) {
      console.error('Failed to fetch dashboard settings:', e);
    }
  };

  useEffect(() => {
    fetchDashboards();
    fetchDashboardSettings();
  }, []);

  useEffect(() => {
    if (currentDashboardId) {
      localStorage.setItem('active_dashboard_id', currentDashboardId);
      fetchWidgets(currentDashboardId);
    }
    if (bgType === 'unsplash') {
      setCurrentSig(Date.now().toString());
    }
  }, [currentDashboardId, refreshTrigger]);

  // Handle dashboard auto-rotation
  useEffect(() => {
    if (!isRotating || dashboards.length <= 1) return;

    const interval = setInterval(() => {
      setSecondsUntilRotate(prev => {
        if (prev <= 1) {
          // Time to rotate to next dashboard
          const validList = (rotationDashboards && rotationDashboards.length > 0)
            ? dashboards.filter(d => rotationDashboards.includes(d.id))
            : dashboards;
          
          const cycleList = validList.length > 0 ? validList : dashboards;
          const currentIndex = cycleList.findIndex(d => d.id === currentDashboardId);
          const nextIndex = (currentIndex + 1) % cycleList.length;
          const nextDash = cycleList[nextIndex];
          if (nextDash) {
            setCurrentDashboardId(nextDash.id);
          }
          return rotationInterval;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isRotating, dashboards, rotationDashboards, currentDashboardId, rotationInterval]);

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

  const handleCreateDashboard = async (e) => {
    e.preventDefault();
    if (!newDashboardName.trim()) return;

    try {
      const res = await fetch('/api/dashboards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newDashboardName.trim(),
          clone_from_id: cloneFromId || null
        })
      });
      if (res.ok) {
        const data = await res.json();
        showToast(`Dashboard "${data.name}" created!`);
        setIsAddDashboardModalOpen(false);
        setNewDashboardName('');
        setCloneFromId('');
        await fetchDashboards();
        setCurrentDashboardId(data.id);
      } else {
        const err = await res.json().catch(() => ({}));
        showToast(err.error || 'Failed to create dashboard', 'error');
      }
    } catch (e) {
      showToast('Failed to create dashboard', 'error');
    }
  };

  const handleRenameDashboard = async (dashboardId, newName) => {
    if (!newName || !newName.trim()) return;
    try {
      const res = await fetch(`/api/dashboards/${dashboardId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim() })
      });
      if (res.ok) {
        showToast('Dashboard renamed successfully');
        setEditingDashboardId(null);
        fetchDashboards();
      } else {
        const err = await res.json().catch(() => ({}));
        showToast(err.error || 'Failed to rename dashboard', 'error');
      }
    } catch (e) {
      showToast('Failed to rename dashboard', 'error');
    }
  };

  const handleSetDefaultDashboard = async (dashboardId) => {
    try {
      const res = await fetch(`/api/dashboards/${dashboardId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_default: 1 })
      });
      if (res.ok) {
        showToast('Default dashboard updated');
        fetchDashboards();
      }
    } catch (e) {
      showToast('Failed to update default dashboard', 'error');
    }
  };

  const handleDeleteDashboard = async (dashboardId) => {
    if (dashboards.length <= 1) {
      showToast('Cannot delete the only remaining dashboard', 'error');
      return;
    }
    const target = dashboards.find(d => d.id === dashboardId);
    if (!window.confirm(`Are you sure you want to delete dashboard "${target?.name || 'this dashboard'}" and all its widgets?`)) return;

    try {
      const res = await fetch(`/api/dashboards/${dashboardId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        showToast('Dashboard deleted');
        const remaining = dashboards.filter(d => d.id !== dashboardId);
        setDashboards(remaining);
        if (currentDashboardId === dashboardId) {
          const next = remaining.find(d => d.is_default) || remaining[0];
          setCurrentDashboardId(next ? next.id : 'default');
        }
        fetchDashboards();
      } else {
        const err = await res.json().catch(() => ({}));
        showToast(err.error || 'Failed to delete dashboard', 'error');
      }
    } catch (e) {
      showToast('Failed to delete dashboard', 'error');
    }
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
      dashboard_id: currentDashboardId,
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
      fetchWidgets(currentDashboardId); // Rollback
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
      fetchWidgets(currentDashboardId); // Rollback
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
      fetchWidgets(currentDashboardId);
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

  if (loading && dashboards.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: '1rem' }}>
        <div className="spinner"></div>
        <p style={{ color: 'var(--text-muted)' }}>Loading your dashboard space...</p>
      </div>
    );
  }

  const currentDashboard = dashboards.find(d => d.id === currentDashboardId) || dashboards[0] || { name: 'Main Dashboard' };

  return (
    <div style={{ width: '100%', paddingBottom: '4rem' }}>
      
      {/* Local toast alerts */}
      {toast && (
        <div className={`alert-banner ${toast.type === 'success' ? 'alert-success' : (toast.type === 'info' ? 'alert-info' : 'alert-error')}`} style={{ position: 'fixed', top: '1.5rem', right: '1.5rem', zIndex: 1100, width: 'auto', minWidth: '280px', boxShadow: 'var(--shadow-lg)' }}>
          <span>{toast.text}</span>
          <button className="close-btn" onClick={() => setToast(null)}>×</button>
        </div>
      )}

      {/* Dashboard Top Header Control Panel */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <h2 style={{ fontSize: '1.75rem', fontWeight: '800', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', color: (bgType === 'dark' || bgType === 'unsplash' || (bgType === 'upload' && bgValue)) ? '#ffffff' : 'inherit' }}>
              <LayoutGrid size={26} style={{ color: 'var(--primary)' }} />
              Dashboard
            </h2>

            {/* Dashboard Selector Dropdown */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(255, 255, 255, 0.05)', padding: '0.25rem 0.5rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
              <select
                value={currentDashboardId}
                onChange={(e) => setCurrentDashboardId(e.target.value)}
                className="input-control"
                style={{
                  padding: '0.35rem 0.75rem',
                  fontSize: '0.875rem',
                  fontWeight: '700',
                  minWidth: '180px',
                  cursor: 'pointer',
                  background: 'var(--card)',
                  color: 'var(--foreground)'
                }}
              >
                {dashboards.map(d => (
                  <option key={d.id} value={d.id}>
                    {d.name} {d.is_default ? '★ (Default)' : ''} ({d.widget_count || 0} widgets)
                  </option>
                ))}
              </select>

              {/* + Add Dashboard Button */}
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  setNewDashboardName('');
                  setCloneFromId('');
                  setIsAddDashboardModalOpen(true);
                }}
                style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.35rem', whiteSpace: 'nowrap' }}
                title="Create a new dashboard"
              >
                <Plus size={14} /> Add Dashboard
              </button>

              {/* Manage Dashboards Button */}
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setIsManageDashboardsModalOpen(true)}
                style={{ padding: '0.35rem 0.6rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                title="Manage and rename dashboards"
              >
                <Settings2 size={14} />
              </button>
            </div>
          </div>

          <p style={{ color: (bgType === 'dark' || bgType === 'unsplash' || (bgType === 'upload' && bgValue)) ? 'rgba(255, 255, 255, 0.7)' : 'var(--text-muted)', fontSize: '0.8125rem', margin: 0 }}>
            Viewing dashboard: <strong style={{ color: 'var(--primary)' }}>{currentDashboard.name}</strong> • Select or add dashboards to customize views across all home server applications.
          </p>
        </div>
        
        <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Dashboard Rotation Control */}
          {dashboards.length > 1 && (
            <button
              type="button"
              className={`btn ${isRotating ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => {
                const nextState = !isRotating;
                setIsRotating(nextState);
                setSecondsUntilRotate(rotationInterval);
                showToast(nextState ? `Auto-rotating dashboards every ${rotationInterval}s` : 'Dashboard rotation paused', 'info');
              }}
              style={{ padding: '0.5rem 0.85rem', display: 'flex', gap: '0.4rem', alignItems: 'center', fontSize: '0.8125rem' }}
              title={isRotating ? "Pause automatic dashboard rotation" : "Start automatic dashboard rotation"}
            >
              {isRotating ? (
                <>
                  <PauseCircle size={15} />
                  <span>Rotating ({secondsUntilRotate}s)</span>
                </>
              ) : (
                <>
                  <PlayCircle size={15} />
                  <span>Auto-Rotate</span>
                </>
              )}
            </button>
          )}

          <button 
            className="btn btn-dashboard-action" 
            onClick={() => setRefreshTrigger(p => p + 1)}
            style={{ padding: '0.5rem 0.85rem', display: 'flex', gap: '0.4rem', fontSize: '0.8125rem' }}
            title="Reload widget data"
          >
            <RefreshCw size={14} /> Refresh
          </button>
          
          <button 
            className={`btn btn-dashboard-action ${isEditing ? 'active' : ''}`}
            onClick={() => setIsEditing(!isEditing)}
            style={{ padding: '0.5rem 0.85rem', display: 'flex', gap: '0.4rem', fontSize: '0.8125rem' }}
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
              style={{ padding: '0.5rem 1rem', display: 'flex', gap: '0.4rem', fontSize: '0.8125rem' }}
            >
              <Plus size={14} /> Add Widget
            </button>
            
            {isAddOpen && (
              <>
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 90 }} onClick={() => setIsAddOpen(false)} />
                <div className="card animate-fade-in" style={{ position: 'absolute', right: 0, top: '110%', width: '320px', zIndex: 100, padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '420px', overflowY: 'auto', boxShadow: 'var(--shadow-lg)' }}>
                  <h4 style={{ fontSize: '0.9rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', margin: 0 }}>Select Widget Type</h4>
                  
                  {Array.from(new Set(WIDGET_TYPES.map(w => w.category))).map(category => (
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

      {/* Create New Dashboard Modal */}
      {isAddDashboardModalOpen && (
        <div className="modal-overlay" onClick={() => setIsAddDashboardModalOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '460px' }}>
            <div className="modal-header">
              <h2 style={{ fontSize: '1.25rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Plus size={18} style={{ color: 'var(--primary)' }} /> Create New Dashboard
              </h2>
              <button className="close-btn" style={{ fontSize: '1.5rem' }} onClick={() => setIsAddDashboardModalOpen(false)}>×</button>
            </div>
            
            <form onSubmit={handleCreateDashboard}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div className="form-group">
                  <label style={{ fontWeight: '600', marginBottom: '0.4rem', display: 'block' }}>Dashboard Name *</label>
                  <input
                    type="text"
                    className="input-control"
                    value={newDashboardName}
                    onChange={e => setNewDashboardName(e.target.value)}
                    placeholder="e.g. Kitchen Display, Kids View, Office Screen..."
                    autoFocus
                    required
                  />
                </div>

                <div className="form-group">
                  <label style={{ fontWeight: '600', marginBottom: '0.4rem', display: 'block' }}>Initial Layout</label>
                  <select
                    className="input-control"
                    value={cloneFromId}
                    onChange={e => setCloneFromId(e.target.value)}
                  >
                    <option value="">Start with clean, empty dashboard</option>
                    {dashboards.map(d => (
                      <option key={d.id} value={d.id}>
                        Clone widgets from "{d.name}" ({d.widget_count || 0} widgets)
                      </option>
                    ))}
                  </select>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.35rem', display: 'block' }}>
                    Cloning will make an independent copy of all widgets and coordinates.
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                  <button type="button" className="btn btn-outline" onClick={() => setIsAddDashboardModalOpen(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary" disabled={!newDashboardName.trim()}>
                    <Plus size={14} /> Create Dashboard
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Manage Dashboards Modal */}
      {isManageDashboardsModalOpen && (
        <div className="modal-overlay" onClick={() => setIsManageDashboardsModalOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h2 style={{ fontSize: '1.25rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Settings2 size={18} style={{ color: 'var(--primary)' }} /> Manage Dashboards
              </h2>
              <button className="close-btn" style={{ fontSize: '1.5rem' }} onClick={() => setIsManageDashboardsModalOpen(false)}>×</button>
            </div>
            
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>
                Rename existing dashboards, set which one loads by default, or delete dashboards you no longer need.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '350px', overflowY: 'auto' }}>
                {dashboards.map(dash => {
                  const isEditingThis = editingDashboardId === dash.id;
                  const isDefault = Boolean(dash.is_default);

                  return (
                    <div
                      key={dash.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0.75rem 1rem',
                        borderRadius: 'var(--radius)',
                        border: '1px solid var(--border)',
                        background: currentDashboardId === dash.id ? 'var(--accent)' : 'var(--card)',
                        gap: '0.75rem'
                      }}
                    >
                      {isEditingThis ? (
                        <div style={{ display: 'flex', gap: '0.5rem', flex: 1, alignItems: 'center' }}>
                          <input
                            type="text"
                            className="input-control"
                            value={renameDashboardName}
                            onChange={e => setRenameDashboardName(e.target.value)}
                            autoFocus
                            style={{ padding: '0.35rem 0.6rem', fontSize: '0.85rem' }}
                          />
                          <button
                            type="button"
                            className="btn btn-primary"
                            onClick={() => handleRenameDashboard(dash.id, renameDashboardName)}
                            style={{ padding: '0.35rem 0.6rem', fontSize: '0.75rem' }}
                          >
                            <Check size={13} />
                          </button>
                          <button
                            type="button"
                            className="btn btn-outline"
                            onClick={() => setEditingDashboardId(null)}
                            style={{ padding: '0.35rem 0.6rem', fontSize: '0.75rem' }}
                          >
                            <X size={13} />
                          </button>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flex: 1, minWidth: 0 }}>
                          <span style={{ fontWeight: '700', fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {dash.name}
                          </span>
                          {isDefault && (
                            <span style={{ fontSize: '0.7rem', padding: '0.15rem 0.5rem', borderRadius: '12px', background: 'rgba(234, 179, 8, 0.15)', color: '#eab308', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                              <Star size={11} /> Default
                            </span>
                          )}
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            ({dash.widget_count || 0} widgets)
                          </span>
                        </div>
                      )}

                      {!isEditingThis && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          {!isDefault && (
                            <button
                              type="button"
                              className="btn btn-outline"
                              onClick={() => handleSetDefaultDashboard(dash.id)}
                              style={{ padding: '0.35rem 0.6rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                              title="Make this the default dashboard on login"
                            >
                              <Star size={12} /> Set Default
                            </button>
                          )}
                          <button
                            type="button"
                            className="btn btn-outline"
                            onClick={() => {
                              setEditingDashboardId(dash.id);
                              setRenameDashboardName(dash.name);
                            }}
                            style={{ padding: '0.35rem 0.5rem', fontSize: '0.75rem' }}
                            title="Rename dashboard"
                          >
                            <Edit2 size={12} />
                          </button>
                          {dashboards.length > 1 && (
                            <button
                              type="button"
                              className="btn btn-outline danger"
                              onClick={() => handleDeleteDashboard(dash.id)}
                              style={{ padding: '0.35rem 0.5rem', fontSize: '0.75rem', color: '#ef4444', borderColor: '#ef4444' }}
                              title="Delete dashboard"
                            >
                              <Trash2 size={12} />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <button type="button" className="btn btn-primary" onClick={() => setIsManageDashboardsModalOpen(false)}>
                  Done
                </button>
              </div>
            </div>
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
    case 'calendar_daily':
    case 'calendar_weekly':
    case 'calendar_monthly':
    case 'calendar_month_grid': return <Calendar size={16} />;
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
    calendar_daily: 'Daily Agenda',
    calendar_weekly: 'Weekly Agenda',
    calendar_monthly: 'Monthly Agenda',
    calendar_month_grid: 'Monthly Calendar',
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
      
    case 'calendar_daily':
      return <CalendarDailyAgendaView data={data} onNavigateTab={onNavigateTab} />;
    case 'calendar_weekly':
      return <CalendarWeeklyAgendaView data={data} onNavigateTab={onNavigateTab} />;
    case 'calendar_monthly':
      return <CalendarMonthlyAgendaView data={data} onNavigateTab={onNavigateTab} />;
    case 'calendar_month_grid':
      return <CalendarMonthGridView data={data} onNavigateTab={onNavigateTab} />;

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

/* ========================================================
   CALENDAR WIDGET VIEWS (DAILY, WEEKLY, MONTHLY, FULL GRID)
   ======================================================== */

function processCalendarData(data, targetYear, targetMonth) {
  if (!data) return { itemsByDate: {}, allItems: [], todayStr: '', colors: {} };
  
  const today = new Date();
  const year = targetYear !== undefined ? targetYear : today.getFullYear();
  const month = targetMonth !== undefined ? targetMonth : today.getMonth();
  const todayStr = data.todayStr || today.toISOString().split('T')[0];

  const colors = {
    event: data.colors?.event || '#3b82f6',
    task: data.colors?.task || '#10b981',
    bill: data.colors?.bill || '#ef4444',
    subscription: data.colors?.subscription || '#8b5cf6',
    contact_event: data.colors?.contact_event || '#ec4899'
  };

  const itemsByDate = {};
  const allItems = [];

  const addItem = (item) => {
    if (!item.dateStr) return;
    if (!itemsByDate[item.dateStr]) itemsByDate[item.dateStr] = [];
    itemsByDate[item.dateStr].push(item);
    allItems.push(item);
  };

  const getDatesSpanned = (startStr, endStr) => {
    if (!startStr) return [];
    const sDate = startStr.split('T')[0];
    if (!endStr) return [sDate];
    const eDate = endStr.split('T')[0];
    if (sDate === eDate) return [sDate];

    const start = new Date(startStr);
    let end = new Date(endStr);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return [sDate];
    if (end.getHours() === 0 && end.getMinutes() === 0 && end.getSeconds() === 0 && end.getMilliseconds() === 0) {
      end = new Date(end.getTime() - 1000);
    }
    const dates = [];
    const cur = new Date(start.getFullYear(), start.getMonth(), start.getDate());
    const endComp = new Date(end.getFullYear(), end.getMonth(), end.getDate());
    while (cur <= endComp) {
      const y = cur.getFullYear();
      const m = String(cur.getMonth() + 1).padStart(2, '0');
      const d = String(cur.getDate()).padStart(2, '0');
      dates.push(`${y}-${m}-${d}`);
      cur.setDate(cur.getDate() + 1);
    }
    return dates;
  };

  // 1. Events
  (data.events || []).forEach(e => {
    const dates = getDatesSpanned(e.start_time, e.end_time);
    dates.forEach(dateStr => {
      let timeStr = null;
      if (!e.all_day && e.start_time && e.start_time.includes('T')) {
        const timePart = e.start_time.split('T')[1]?.substring(0, 5);
        if (timePart) {
          const [h, m] = timePart.split(':');
          const hour = parseInt(h, 10);
          const ampm = hour >= 12 ? 'PM' : 'AM';
          const displayHour = hour % 12 || 12;
          timeStr = `${displayHour}:${m} ${ampm}`;
        }
      }
      addItem({
        id: `event-${e.id}-${dateStr}`,
        title: e.title,
        type: 'event',
        typeLabel: 'Event',
        dateStr,
        timeStr: e.all_day ? 'All Day' : timeStr,
        allDay: Boolean(e.all_day),
        location: e.location || '',
        description: e.description || '',
        color: colors.event,
        icon: '📅'
      });
    });
  });

  // 2. Tasks
  (data.tasks || []).forEach(t => {
    if (t.due_date) {
      const dateStr = t.due_date.split('T')[0];
      addItem({
        id: `task-${t.id}`,
        title: t.title,
        type: 'task',
        typeLabel: 'Task',
        dateStr,
        timeStr: 'Due',
        allDay: true,
        location: t.list_name ? `List: ${t.list_name}` : '',
        description: t.description || '',
        color: colors.task,
        icon: '☑️',
        completed: Boolean(t.completed)
      });
    }
  });

  // 3. Bills
  (data.bills || []).forEach(b => {
    const dateStr = (b.due_date || b.next_billing_date || '').split('T')[0];
    if (dateStr) {
      addItem({
        id: `bill-${b.id}`,
        title: b.name,
        type: 'bill',
        typeLabel: 'Bill',
        dateStr,
        timeStr: `$${parseFloat(b.amount || 0).toFixed(2)}`,
        allDay: true,
        location: b.category || 'Recurring Bill',
        description: `Amount: $${b.amount}`,
        color: colors.bill,
        icon: '💸',
        amount: b.amount
      });
    }
  });

  // 4. Subscriptions
  (data.subscriptions || []).forEach(s => {
    const dateStr = (s.next_billing_date || s.due_date || '').split('T')[0];
    if (dateStr) {
      addItem({
        id: `sub-${s.id}`,
        title: s.name,
        type: 'subscription',
        typeLabel: 'Subscription',
        dateStr,
        timeStr: `$${parseFloat(s.amount || 0).toFixed(2)}`,
        allDay: true,
        location: s.billing_cycle ? `${s.billing_cycle} sub` : 'Subscription',
        description: `Amount: $${s.amount}`,
        color: colors.subscription,
        icon: '🔁',
        amount: s.amount
      });
    }
  });

  // 5. Contact Birthdays
  (data.contacts || []).forEach(c => {
    if (c.birthday) {
      const parts = c.birthday.split('-');
      if (parts.length === 3) {
        const birthYear = parseInt(parts[0], 10);
        const birthMonth = parts[1];
        const birthDay = parts[2];
        [year - 1, year, year + 1].forEach(projYear => {
          const dateStr = `${projYear}-${birthMonth}-${birthDay}`;
          const age = projYear - birthYear;
          const ageSuffix = age > 0 ? ` (${age} Birthday)` : ' Birthday';
          addItem({
            id: `bday-${c.id}-${projYear}`,
            title: `🎂 ${c.name}${ageSuffix}`,
            type: 'contact_event',
            typeLabel: 'Birthday',
            dateStr,
            timeStr: 'All Day',
            allDay: true,
            location: 'Birthday',
            description: `${c.name} turns ${age}. Born ${c.birthday}`,
            color: colors.contact_event,
            icon: '🎂'
          });
        });
      }
    }
  });

  // 6. Contact & User Important Dates
  (data.contactImportantDates || []).forEach(d => {
    if (d.date) {
      const parts = d.date.split('-');
      if (parts.length === 3) {
        const startYear = parseInt(parts[0], 10);
        const startMonth = parts[1];
        const startDay = parts[2];
        [year - 1, year, year + 1].forEach(projYear => {
          const dateStr = `${projYear}-${startMonth}-${startDay}`;
          const years = projYear - startYear;
          const yearsSuffix = years > 0 ? ` (${years} Years)` : '';
          addItem({
            id: `cdate-${d.id}-${projYear}`,
            title: `✨ ${d.contact_name}'s ${d.name}${yearsSuffix}`,
            type: 'contact_event',
            typeLabel: 'Important Date',
            dateStr,
            timeStr: 'All Day',
            allDay: true,
            location: d.contact_name || '',
            description: `${d.contact_name}'s ${d.name} (${d.date})`,
            color: colors.contact_event,
            icon: '✨'
          });
        });
      }
    }
  });

  (data.userImportantDates || []).forEach(d => {
    if (d.date) {
      const parts = d.date.split('-');
      if (parts.length === 3) {
        const startYear = parseInt(parts[0], 10);
        const startMonth = parts[1];
        const startDay = parts[2];
        [year - 1, year, year + 1].forEach(projYear => {
          const dateStr = `${projYear}-${startMonth}-${startDay}`;
          const years = projYear - startYear;
          const yearsSuffix = years > 0 ? ` (${years} Years)` : '';
          addItem({
            id: `udate-${d.id}-${projYear}`,
            title: `✨ ${d.name}${yearsSuffix}`,
            type: 'contact_event',
            typeLabel: 'Important Date',
            dateStr,
            timeStr: 'All Day',
            allDay: true,
            location: '',
            description: `${d.name} (${d.date})`,
            color: colors.contact_event,
            icon: '✨'
          });
        });
      }
    }
  });

  Object.keys(itemsByDate).forEach(k => {
    itemsByDate[k].sort((a, b) => {
      if (a.allDay && !b.allDay) return -1;
      if (!a.allDay && b.allDay) return 1;
      return (a.timeStr || '').localeCompare(b.timeStr || '');
    });
  });

  allItems.sort((a, b) => {
    if (a.dateStr !== b.dateStr) return a.dateStr.localeCompare(b.dateStr);
    return (a.timeStr || '').localeCompare(b.timeStr || '');
  });

  return { itemsByDate, allItems, todayStr, colors };
}

// 1. DAILY AGENDA VIEW
function CalendarDailyAgendaView({ data, onNavigateTab }) {
  const today = new Date();
  const [selectedDate, setSelectedDate] = useState(today);

  const year = selectedDate.getFullYear();
  const month = selectedDate.getMonth();
  const { itemsByDate, todayStr, colors } = processCalendarData(data, year, month);

  const selectedDateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`;
  const isToday = selectedDateStr === todayStr;
  const items = itemsByDate[selectedDateStr] || [];

  const handlePrevDay = () => {
    setSelectedDate(d => new Date(d.getFullYear(), d.getMonth(), d.getDate() - 1));
  };
  const handleNextDay = () => {
    setSelectedDate(d => new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1));
  };
  const handleToday = () => {
    setSelectedDate(new Date());
  };

  const formattedHeader = selectedDate.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '0.6rem' }}>
      {/* Top Header Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.03)', padding: '0.35rem 0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <button type="button" className="btn btn-outline" onClick={handlePrevDay} style={{ padding: '0.2rem 0.4rem', fontSize: '0.7rem', height: '24px' }}>
            <ChevronLeft size={13} />
          </button>
          <span style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--foreground)' }}>
            {formattedHeader}
          </span>
          <button type="button" className="btn btn-outline" onClick={handleNextDay} style={{ padding: '0.2rem 0.4rem', fontSize: '0.7rem', height: '24px' }}>
            <ChevronRight size={13} />
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          {isToday ? (
            <span style={{ fontSize: '0.65rem', fontWeight: '700', background: 'var(--primary)', color: '#fff', padding: '0.15rem 0.45rem', borderRadius: '10px' }}>
              Today
            </span>
          ) : (
            <button type="button" className="btn btn-outline" onClick={handleToday} style={{ padding: '0.15rem 0.45rem', fontSize: '0.65rem', height: '22px' }}>
              Today
            </button>
          )}
          <span style={{ fontSize: '0.7rem', color: 'var(--muted-foreground)' }}>
            {items.length} {items.length === 1 ? 'item' : 'items'}
          </span>
        </div>
      </div>

      {/* Agenda Items List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', flex: 1, overflowY: 'auto', paddingRight: '0.15rem' }}>
        {items.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, color: 'var(--muted-foreground)', fontStyle: 'italic', fontSize: '0.75rem', padding: '1rem 0', textAlign: 'center' }}>
            <span>No events or tasks scheduled for this day.</span>
          </div>
        ) : (
          items.map(item => (
            <div
              key={item.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.45rem 0.6rem',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--card)',
                border: '1px solid var(--border)',
                borderLeft: `3.5px solid ${item.color}`,
                fontSize: '0.75rem'
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0, gap: '0.1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <span style={{ fontSize: '0.8rem' }}>{item.icon}</span>
                  <span style={{ fontWeight: '700', color: 'var(--foreground)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {item.title}
                  </span>
                </div>
                {item.location && (
                  <span style={{ fontSize: '0.65rem', color: 'var(--muted-foreground)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    📍 {item.location}
                  </span>
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', flexShrink: 0 }}>
                <span style={{ fontSize: '0.65rem', fontWeight: '700', color: item.color, background: 'rgba(255,255,255,0.05)', padding: '0.1rem 0.35rem', borderRadius: '4px' }}>
                  {item.timeStr || item.typeLabel}
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {onNavigateTab && (
        <button
          type="button"
          className="btn btn-outline"
          onClick={() => onNavigateTab('calendar')}
          style={{ fontSize: '0.7rem', padding: '0.25rem', marginTop: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}
        >
          Open Calendar View <ArrowRight size={11} />
        </button>
      )}
    </div>
  );
}

// 2. WEEKLY AGENDA VIEW
function CalendarWeeklyAgendaView({ data, onNavigateTab }) {
  const today = new Date();
  const [weekOffset, setWeekOffset] = useState(0);

  const baseDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() + (weekOffset * 7));
  const { itemsByDate, todayStr } = processCalendarData(data, baseDate.getFullYear(), baseDate.getMonth());

  const daysOfWeek = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate() + i);
    const yStr = d.getFullYear();
    const mStr = String(d.getMonth() + 1).padStart(2, '0');
    const dayStr = String(d.getDate()).padStart(2, '0');
    const dateStr = `${yStr}-${mStr}-${dayStr}`;
    daysOfWeek.push({
      date: d,
      dateStr,
      isToday: dateStr === todayStr,
      dayName: d.toLocaleDateString(undefined, { weekday: 'short' }),
      formattedDate: d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      items: itemsByDate[dateStr] || []
    });
  }

  const startLabel = daysOfWeek[0].formattedDate;
  const endLabel = daysOfWeek[6].formattedDate;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '0.5rem' }}>
      {/* Header with week navigation */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.03)', padding: '0.35rem 0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <button type="button" className="btn btn-outline" onClick={() => setWeekOffset(w => w - 1)} style={{ padding: '0.2rem 0.4rem', fontSize: '0.7rem', height: '24px' }}>
            <ChevronLeft size={13} />
          </button>
          <span style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--foreground)' }}>
            {startLabel} – {endLabel}
          </span>
          <button type="button" className="btn btn-outline" onClick={() => setWeekOffset(w => w + 1)} style={{ padding: '0.2rem 0.4rem', fontSize: '0.7rem', height: '24px' }}>
            <ChevronRight size={13} />
          </button>
        </div>

        {weekOffset !== 0 && (
          <button type="button" className="btn btn-outline" onClick={() => setWeekOffset(0)} style={{ padding: '0.15rem 0.45rem', fontSize: '0.65rem', height: '22px' }}>
            Current Week
          </button>
        )}
      </div>

      {/* 7-Day Agenda List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', flex: 1, overflowY: 'auto', paddingRight: '0.15rem' }}>
        {daysOfWeek.map(day => (
          <div
            key={day.dateStr}
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.3rem',
              padding: '0.45rem 0.6rem',
              borderRadius: 'var(--radius-sm)',
              background: day.isToday ? 'rgba(59, 130, 246, 0.06)' : 'var(--card)',
              border: day.isToday ? '1px solid rgba(59, 130, 246, 0.3)' : '1px solid var(--border)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: '800', color: day.isToday ? 'var(--primary)' : 'var(--foreground)' }}>
                  {day.dayName}, {day.formattedDate}
                </span>
                {day.isToday && (
                  <span style={{ fontSize: '0.6rem', fontWeight: '700', background: 'var(--primary)', color: '#fff', padding: '0.05rem 0.35rem', borderRadius: '8px' }}>
                    Today
                  </span>
                )}
              </div>
              <span style={{ fontSize: '0.65rem', color: 'var(--muted-foreground)' }}>
                {day.items.length} {day.items.length === 1 ? 'item' : 'items'}
              </span>
            </div>

            {day.items.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', marginTop: '0.15rem' }}>
                {day.items.map(item => (
                  <div
                    key={item.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '0.4rem',
                      padding: '0.25rem 0.4rem',
                      borderRadius: '4px',
                      background: 'rgba(255,255,255,0.03)',
                      borderLeft: `2.5px solid ${item.color}`,
                      fontSize: '0.7rem'
                    }}
                  >
                    <span style={{ color: 'var(--foreground)', fontWeight: '600', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                      {item.icon} {item.title}
                    </span>
                    <span style={{ color: item.color, fontSize: '0.65rem', fontWeight: '700', flexShrink: 0 }}>
                      {item.timeStr}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <span style={{ fontSize: '0.65rem', color: 'var(--muted-foreground)', fontStyle: 'italic' }}>
                No events or tasks
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// 3. MONTHLY AGENDA VIEW
function CalendarMonthlyAgendaView({ data, onNavigateTab }) {
  const today = new Date();
  const [currentDate, setCurrentDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const { itemsByDate, todayStr } = processCalendarData(data, year, month);

  const monthName = currentDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  const monthPrefix = `${year}-${String(month + 1).padStart(2, '0')}`;

  const monthDates = Object.keys(itemsByDate)
    .filter(d => d.startsWith(monthPrefix) && itemsByDate[d]?.length > 0)
    .sort();

  const totalMonthItems = monthDates.reduce((acc, d) => acc + (itemsByDate[d]?.length || 0), 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '0.5rem' }}>
      {/* Month Navigation */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.03)', padding: '0.35rem 0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <button type="button" className="btn btn-outline" onClick={() => setCurrentDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1))} style={{ padding: '0.2rem 0.4rem', fontSize: '0.7rem', height: '24px' }}>
            <ChevronLeft size={13} />
          </button>
          <span style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--foreground)' }}>
            {monthName}
          </span>
          <button type="button" className="btn btn-outline" onClick={() => setCurrentDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1))} style={{ padding: '0.2rem 0.4rem', fontSize: '0.7rem', height: '24px' }}>
            <ChevronRight size={13} />
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <button type="button" className="btn btn-outline" onClick={() => setCurrentDate(new Date(today.getFullYear(), today.getMonth(), 1))} style={{ padding: '0.15rem 0.45rem', fontSize: '0.65rem', height: '22px' }}>
            This Month
          </button>
          <span style={{ fontSize: '0.7rem', color: 'var(--muted-foreground)' }}>
            {totalMonthItems} {totalMonthItems === 1 ? 'item' : 'items'}
          </span>
        </div>
      </div>

      {/* Month Agenda Scrollable List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1, overflowY: 'auto', paddingRight: '0.15rem' }}>
        {monthDates.length === 0 ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, color: 'var(--muted-foreground)', fontStyle: 'italic', fontSize: '0.75rem', padding: '2rem 0', textAlign: 'center' }}>
            No scheduled items for {monthName}.
          </div>
        ) : (
          monthDates.map(dateStr => {
            const dateObj = new Date(`${dateStr}T12:00:00`);
            const isToday = dateStr === todayStr;
            const items = itemsByDate[dateStr] || [];

            return (
              <div
                key={dateStr}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.3rem',
                  padding: '0.45rem 0.6rem',
                  borderRadius: 'var(--radius-sm)',
                  background: isToday ? 'rgba(59, 130, 246, 0.06)' : 'var(--card)',
                  border: isToday ? '1px solid rgba(59, 130, 246, 0.3)' : '1px solid var(--border)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: '800', color: isToday ? 'var(--primary)' : 'var(--foreground)' }}>
                    {dateObj.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                    {isToday && <span style={{ marginLeft: '0.35rem', fontSize: '0.6rem', fontWeight: '700', background: 'var(--primary)', color: '#fff', padding: '0.05rem 0.35rem', borderRadius: '8px' }}>Today</span>}
                  </span>
                  <span style={{ fontSize: '0.65rem', color: 'var(--muted-foreground)' }}>
                    {items.length} {items.length === 1 ? 'item' : 'items'}
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  {items.map(item => (
                    <div
                      key={item.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '0.4rem',
                        padding: '0.25rem 0.4rem',
                        borderRadius: '4px',
                        background: 'rgba(255,255,255,0.03)',
                        borderLeft: `3px solid ${item.color}`,
                        fontSize: '0.7rem'
                      }}
                    >
                      <span style={{ color: 'var(--foreground)', fontWeight: '600', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                        {item.icon} {item.title}
                      </span>
                      <span style={{ color: item.color, fontSize: '0.65rem', fontWeight: '700', flexShrink: 0 }}>
                        {item.timeStr}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

// 4. FULL MONTHLY CALENDAR GRID VIEW (FILLS ENTIRE DASHBOARD PAGE)
function CalendarMonthGridView({ data, onNavigateTab }) {
  const today = new Date();
  const [currentDate, setCurrentDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [inspectDay, setInspectDay] = useState(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const { itemsByDate, todayStr, colors } = processCalendarData(data, year, month);

  const monthName = currentDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

  // Compute 35 or 42 grid cells
  const firstDayIndex = new Date(year, month, 1).getDay();
  const numDaysInMonth = new Date(year, month + 1, 0).getDate();
  const prevMonthNumDays = new Date(year, month, 0).getDate();

  const daysGrid = [];

  // Previous month padding
  for (let i = firstDayIndex - 1; i >= 0; i--) {
    const day = prevMonthNumDays - i;
    const m = month === 0 ? 11 : month - 1;
    const y = month === 0 ? year - 1 : year;
    const dateStr = `${y}-${String(m + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    daysGrid.push({
      day,
      dateStr,
      isCurrentMonth: false,
      isToday: dateStr === todayStr,
      items: itemsByDate[dateStr] || []
    });
  }

  // Current month days
  for (let d = 1; d <= numDaysInMonth; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    daysGrid.push({
      day: d,
      dateStr,
      isCurrentMonth: true,
      isToday: dateStr === todayStr,
      items: itemsByDate[dateStr] || []
    });
  }

  // Next month padding to fill complete grid
  const remaining = (daysGrid.length > 35 ? 42 : 35) - daysGrid.length;
  for (let d = 1; d <= remaining; d++) {
    const m = month === 11 ? 0 : month + 1;
    const y = month === 11 ? year + 1 : year;
    const dateStr = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    daysGrid.push({
      day: d,
      dateStr,
      isCurrentMonth: false,
      isToday: dateStr === todayStr,
      items: itemsByDate[dateStr] || []
    });
  }

  const inspectedItems = inspectDay ? (itemsByDate[inspectDay] || []) : [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '0.4rem', position: 'relative' }}>
      {/* Month Navigation & Category Legend */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', background: 'rgba(255,255,255,0.03)', padding: '0.4rem 0.6rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <button type="button" className="btn btn-outline" onClick={() => setCurrentDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1))} style={{ padding: '0.2rem 0.4rem', fontSize: '0.75rem', height: '26px' }}>
            <ChevronLeft size={14} />
          </button>
          <span style={{ fontSize: '0.9rem', fontWeight: '800', color: 'var(--foreground)', minWidth: '130px', textAlign: 'center' }}>
            {monthName}
          </span>
          <button type="button" className="btn btn-outline" onClick={() => setCurrentDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1))} style={{ padding: '0.2rem 0.4rem', fontSize: '0.75rem', height: '26px' }}>
            <ChevronRight size={14} />
          </button>
          <button type="button" className="btn btn-outline" onClick={() => setCurrentDate(new Date(today.getFullYear(), today.getMonth(), 1))} style={{ padding: '0.2rem 0.5rem', fontSize: '0.7rem', height: '26px' }}>
            Today
          </button>
        </div>

        {/* Category color dots legend */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.65rem' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: colors.event || '#3b82f6' }}></span>
            <span style={{ color: 'var(--muted-foreground)' }}>Events</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.65rem' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: colors.task || '#10b981' }}></span>
            <span style={{ color: 'var(--muted-foreground)' }}>Tasks</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.65rem' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: colors.bill || '#ef4444' }}></span>
            <span style={{ color: 'var(--muted-foreground)' }}>Bills</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.65rem' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: colors.subscription || '#8b5cf6' }}></span>
            <span style={{ color: 'var(--muted-foreground)' }}>Subs</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.65rem' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: colors.contact_event || '#ec4899' }}></span>
            <span style={{ color: 'var(--muted-foreground)' }}>Birthdays</span>
          </div>
        </div>
      </div>

      {/* Weekday headers */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: '2px', textAlign: 'center' }}>
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
          <div key={d} style={{ fontSize: '0.7rem', fontWeight: '700', color: 'var(--muted-foreground)', padding: '0.2rem 0' }}>
            {d}
          </div>
        ))}
      </div>

      {/* Days Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gridAutoRows: 'minmax(55px, 1fr)', gap: '3px', flex: 1, minHeight: 0, overflowY: 'auto' }}>
        {daysGrid.map(dayCell => {
          const isSelected = inspectDay === dayCell.dateStr;
          return (
            <div
              key={dayCell.dateStr}
              onClick={() => setInspectDay(isSelected ? null : dayCell.dateStr)}
              style={{
                border: isSelected ? '1.5px solid var(--primary)' : (dayCell.isToday ? '1px solid rgba(59, 130, 246, 0.5)' : '1px solid var(--border)'),
                borderRadius: 'var(--radius-sm)',
                padding: '0.25rem',
                background: dayCell.isToday ? 'rgba(59, 130, 246, 0.08)' : (dayCell.isCurrentMonth ? 'var(--card)' : 'rgba(0,0,0,0.02)'),
                opacity: dayCell.isCurrentMonth ? 1 : 0.45,
                display: 'flex',
                flexDirection: 'column',
                gap: '0.15rem',
                cursor: 'pointer',
                overflow: 'hidden',
                position: 'relative'
              }}
            >
              {/* Day number header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span
                  style={{
                    fontSize: '0.7rem',
                    fontWeight: dayCell.isToday ? '800' : '600',
                    width: '18px',
                    height: '18px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '50%',
                    background: dayCell.isToday ? 'var(--primary)' : 'transparent',
                    color: dayCell.isToday ? '#fff' : 'var(--foreground)'
                  }}
                >
                  {dayCell.day}
                </span>

                {dayCell.items.length > 0 && (
                  <span style={{ fontSize: '0.55rem', fontWeight: '700', color: 'var(--muted-foreground)' }}>
                    {dayCell.items.length}
                  </span>
                )}
              </div>

              {/* Event pill snippets */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.12rem', overflow: 'hidden' }}>
                {dayCell.items.slice(0, 3).map((item, idx) => (
                  <div
                    key={idx}
                    style={{
                      fontSize: '0.58rem',
                      fontWeight: '600',
                      padding: '0.05rem 0.2rem',
                      borderRadius: '2px',
                      background: 'rgba(255,255,255,0.04)',
                      borderLeft: `2px solid ${item.color}`,
                      color: 'var(--foreground)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}
                    title={`${item.title} (${item.timeStr || item.typeLabel})`}
                  >
                    {item.title}
                  </div>
                ))}
                {dayCell.items.length > 3 && (
                  <span style={{ fontSize: '0.55rem', color: 'var(--muted-foreground)', paddingLeft: '0.2rem' }}>
                    +{dayCell.items.length - 3} more
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Inspected Day Detail Popup / Tray */}
      {inspectDay && (
        <div
          style={{
            position: 'absolute',
            bottom: '0.5rem',
            left: '0.5rem',
            right: '0.5rem',
            maxHeight: '190px',
            background: 'var(--popover, var(--card))',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
            zIndex: 20,
            padding: '0.75rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '0.35rem' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: '800', color: 'var(--foreground)' }}>
              Agenda for {new Date(`${inspectDay}T12:00:00`).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
            <button
              type="button"
              onClick={() => setInspectDay(null)}
              style={{ background: 'none', border: 'none', color: 'var(--muted-foreground)', cursor: 'pointer', fontSize: '1rem', padding: '0.1rem 0.3rem' }}
            >
              ×
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', overflowY: 'auto', flex: 1 }}>
            {inspectedItems.length === 0 ? (
              <span style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)', fontStyle: 'italic', padding: '0.5rem 0' }}>
                No events or tasks on this day.
              </span>
            ) : (
              inspectedItems.map(item => (
                <div
                  key={item.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '0.5rem',
                    padding: '0.35rem 0.5rem',
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--muted)',
                    borderLeft: `3px solid ${item.color}`,
                    fontSize: '0.75rem'
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
                    <span style={{ fontWeight: '700', color: 'var(--foreground)' }}>
                      {item.icon} {item.title}
                    </span>
                    {item.location && (
                      <span style={{ fontSize: '0.65rem', color: 'var(--muted-foreground)' }}>
                        📍 {item.location}
                      </span>
                    )}
                  </div>
                  <span style={{ fontSize: '0.7rem', fontWeight: '700', color: item.color, flexShrink: 0 }}>
                    {item.timeStr || item.typeLabel}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
