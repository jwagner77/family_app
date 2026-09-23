import React, { useState, useEffect, useRef } from 'react';
import { 
  CheckCircle, 
  Calendar, 
  CreditCard, 
  Clock, 
  AlertCircle, 
  ArrowRight,
  TrendingUp,
  ListTodo,
  Receipt,
  ChefHat,
  Utensils,
  AlertTriangle,
  Soup,
  BookOpen,
  Bookmark,
  Flame,
  Bell,
  Sun,
  Check,
  Image,
  GripVertical,
  X,
  RotateCcw,
  LayoutGrid,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

const DEFAULT_CARD_SIZES = {
  events: { colSpan: 6 },
  tasks: { colSpan: 6 },
  finances: { colSpan: 4 },
  meals: { colSpan: 8 },
  weather: { colSpan: 4 },
  daily_agenda: { colSpan: 4 },
  weekly_agenda: { colSpan: 6 },
  monthly_agenda: { colSpan: 6 },
  monthly_calendar: { colSpan: 12 }
};

const ALL_AVAILABLE_OVERVIEW_CARDS = [
  'events', 'tasks', 'finances', 'meals', 'weather',
  'daily_agenda', 'weekly_agenda', 'monthly_agenda', 'monthly_calendar'
];

export default function HomeView({ onNavigateTab, user }) {
  const [tasks, setTasks] = useState([]);
  const [events, setEvents] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [bills, setBills] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [weather, setWeather] = useState(null);
  const [weeklyMenu, setWeeklyMenu] = useState([]);
  const [calendarData, setCalendarData] = useState(null);
  const [overviewDailyDate, setOverviewDailyDate] = useState(new Date());
  const [overviewWeekOffset, setOverviewWeekOffset] = useState(0);
  const [overviewMonthDate, setOverviewMonthDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [calendarInspectDay, setCalendarInspectDay] = useState(null);
  const [unreadNotifications, setUnreadNotifications] = useState([]);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  
  const [isEditMode, setIsEditMode] = useState(false);
  const [dashboardCards, setDashboardCards] = useState(['events', 'tasks', 'finances', 'meals', 'weather']);
  const [hiddenCards, setHiddenCards] = useState([]);
  const [draggedIndex, setDraggedIndex] = useState(null);

  const [cardSizes, setCardSizes] = useState(() => {
    const savedSizes = localStorage.getItem('overview_dashboard_sizes');
    if (savedSizes) {
      try {
        return { ...DEFAULT_CARD_SIZES, ...JSON.parse(savedSizes) };
      } catch (err) {
        console.error('Error loading saved dashboard card sizes:', err);
      }
    }
    return DEFAULT_CARD_SIZES;
  });

  const [resizingCard, setResizingCard] = useState(null);
  const gridRef = useRef(null);
  const notificationsRef = useRef(null);

  useEffect(() => {
    if (!isNotificationsOpen) return;
    const handleClickOutside = (e) => {
      if (notificationsRef.current && !notificationsRef.current.contains(e.target)) {
        setIsNotificationsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isNotificationsOpen]);

  useEffect(() => {
    if (!resizingCard) return;

    const handlePointerMove = (e) => {
      const clientX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
      const deltaX = (resizingCard.direction === 'right' ? 1 : -1) * (clientX - resizingCard.startX);
      const deltaCols = Math.round(deltaX / resizingCard.colWidth);
      const nextColSpan = Math.max(3, Math.min(12, resizingCard.startColSpan + deltaCols));

      setCardSizes(prev => ({
        ...prev,
        [resizingCard.cardType]: {
          ...prev[resizingCard.cardType],
          colSpan: nextColSpan
        }
      }));
    };

    const handlePointerUp = () => {
      setResizingCard(prev => {
        if (prev) {
          setCardSizes(currentSizes => {
            localStorage.setItem('overview_dashboard_sizes', JSON.stringify(currentSizes));
            return currentSizes;
          });
        }
        return null;
      });
    };

    window.addEventListener('mousemove', handlePointerMove);
    window.addEventListener('mouseup', handlePointerUp);
    window.addEventListener('touchmove', handlePointerMove);
    window.addEventListener('touchend', handlePointerUp);

    return () => {
      window.removeEventListener('mousemove', handlePointerMove);
      window.removeEventListener('mouseup', handlePointerUp);
      window.removeEventListener('touchmove', handlePointerMove);
      window.removeEventListener('touchend', handlePointerUp);
    };
  }, [resizingCard]);
  
  useEffect(() => {
    fetchTasks();
    fetchEvents();
    fetchSubscriptions();
    fetchBills();
    fetchKitchenData();
    fetchContacts();
    fetchWeather();
    fetchCalendarOverviewData();
    fetchUnreadNotifications();

    // Load custom dashboard layout if saved
    const savedLayout = localStorage.getItem('overview_dashboard_layout');
    const savedHidden = localStorage.getItem('overview_dashboard_hidden');
    if (savedLayout) {
      try {
        setDashboardCards(JSON.parse(savedLayout));
      } catch (err) {
        console.error('Error loading saved dashboard layout:', err);
      }
    }
    if (savedHidden) {
      try {
        setHiddenCards(JSON.parse(savedHidden));
      } catch (err) {
        console.error('Error loading saved hidden cards:', err);
      }
    }
  }, []);

  const fetchCalendarOverviewData = async () => {
    try {
      const res = await fetch('/api/calendar/overview-data');
      if (res.ok) {
        const data = await res.json();
        setCalendarData(data);
      }
    } catch (err) {
      console.error('Error fetching calendar overview data:', err);
    }
  };

  const fetchTasks = async () => {
    try {
      const res = await fetch('/api/focusflow/tasks');
      if (res.ok) {
        const data = await res.json();
        setTasks(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchContacts = async () => {
    try {
      const res = await fetch('/api/contacts');
      if (res.ok) {
        const data = await res.json();
        setContacts(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchWeather = async () => {
    try {
      const res = await fetch('/api/weather');
      if (res.ok) {
        const data = await res.json();
        setWeather(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchUnreadNotifications = async () => {
    try {
      const res = await fetch('/api/notifications/unread');
      if (res.ok) {
        const data = await res.json();
        setUnreadNotifications(data);
      }
    } catch (err) {
      console.error('Failed to fetch unread notifications:', err);
    }
  };

  const handleMarkAsRead = async (id) => {
    try {
      const res = await fetch(`/api/notifications/${id}/read`, { method: 'POST' });
      if (res.ok) {
        setUnreadNotifications(prev => prev.filter(n => n.id !== id));
      }
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const res = await fetch('/api/notifications/read-all', { method: 'POST' });
      if (res.ok) {
        setUnreadNotifications([]);
      }
    } catch (err) {
      console.error('Failed to mark all notifications as read:', err);
    }
  };

  const handleDragStart = (e, index) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
  };

  const handleDrop = (e, targetIndex) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === targetIndex) return;

    const updatedCards = [...dashboardCards];
    const draggedItem = updatedCards[draggedIndex];
    updatedCards.splice(draggedIndex, 1);
    updatedCards.splice(targetIndex, 0, draggedItem);

    setDashboardCards(updatedCards);
    localStorage.setItem('overview_dashboard_layout', JSON.stringify(updatedCards));
    setDraggedIndex(null);
  };

  const handleHideCard = (cardType) => {
    const updatedActive = dashboardCards.filter(c => c !== cardType);
    const updatedHidden = [...hiddenCards, cardType];
    setDashboardCards(updatedActive);
    setHiddenCards(updatedHidden);
    localStorage.setItem('overview_dashboard_layout', JSON.stringify(updatedActive));
    localStorage.setItem('overview_dashboard_hidden', JSON.stringify(updatedHidden));
  };

  const handleShowCard = (cardType) => {
    const updatedActive = [...dashboardCards, cardType];
    const updatedHidden = hiddenCards.filter(c => c !== cardType);
    setDashboardCards(updatedActive);
    setHiddenCards(updatedHidden);
    localStorage.setItem('overview_dashboard_layout', JSON.stringify(updatedActive));
    localStorage.setItem('overview_dashboard_hidden', JSON.stringify(updatedHidden));
  };

  const getCardLabel = (type) => {
    switch (type) {
      case 'events': return 'Upcoming Events';
      case 'tasks': return 'Upcoming Tasks';
      case 'finances': return 'Bills & Subscriptions';
      case 'meals': return 'Weekly Meal Plan';
      case 'weather': return 'Weather Forecast';
      case 'daily_agenda': return '📅 Daily Agenda';
      case 'weekly_agenda': return '📅 Weekly Agenda';
      case 'monthly_agenda': return '📅 Monthly Agenda';
      case 'monthly_calendar': return '📅 Monthly Calendar (Full Grid)';
      default: return type;
    }
  };

  const handleResizeStart = (e, cardType, direction = 'right') => {
    e.preventDefault();
    e.stopPropagation();
    
    const clientX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
    const gridEl = gridRef.current;
    if (!gridEl) return;
    
    const containerWidth = gridEl.offsetWidth;
    const gap = 24;
    const totalGap = 11 * gap;
    const colWidth = (containerWidth - totalGap) / 12;
    const startColSpan = cardSizes[cardType]?.colSpan || DEFAULT_CARD_SIZES[cardType]?.colSpan || 6;
    
    setResizingCard({
      cardType,
      direction,
      startX: clientX,
      startColSpan,
      colWidth: colWidth + gap,
      currentColSpan: startColSpan
    });
  };

  const handleAdjustCardSpan = (cardType, delta) => {
    setCardSizes(prev => {
      const currentSpan = prev[cardType]?.colSpan || DEFAULT_CARD_SIZES[cardType]?.colSpan || 6;
      const newSpan = Math.max(3, Math.min(12, currentSpan + delta));
      const updated = {
        ...prev,
        [cardType]: {
          ...prev[cardType],
          colSpan: newSpan
        }
      };
      localStorage.setItem('overview_dashboard_sizes', JSON.stringify(updated));
      return updated;
    });
  };

  const handleResetLayout = () => {
    const defaultCards = ['events', 'tasks', 'finances', 'meals', 'weather'];
    setDashboardCards(defaultCards);
    setHiddenCards([]);
    setCardSizes(DEFAULT_CARD_SIZES);
    localStorage.removeItem('overview_dashboard_layout');
    localStorage.removeItem('overview_dashboard_hidden');
    localStorage.removeItem('overview_dashboard_sizes');
  };

  const fetchEvents = async () => {
    try {
      const res = await fetch('/api/calendar/events/upcoming');
      if (res.ok) {
        const data = await res.json();
        setEvents(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchSubscriptions = async () => {
    try {
      const res = await fetch('/api/subscriptions');
      if (res.ok) {
        const data = await res.json();
        setSubscriptions(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchBills = async () => {
    try {
      const res = await fetch('/api/bills');
      if (res.ok) {
        const data = await res.json();
        setBills(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchKitchenData = async () => {
    try {
      const menuRes = await fetch('/api/menu');
      if (menuRes.ok) {
        const data = await menuRes.json();
        setWeeklyMenu(data);
      }
    } catch (e) {
      console.error('Failed to load kitchen dashboard data:', e);
    }
  };

  const getGreeting = () => {
    const hr = new Date().getHours();
    if (hr < 12) return 'Good morning';
    if (hr < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const getWeatherInfo = (code) => {
    if (code === undefined || code === null) return { text: 'Unknown', icon: '❓' };
    switch (code) {
      case 0: return { text: 'Clear Sky', icon: '☀️' };
      case 1: case 2: case 3: return { text: 'Partly Cloudy', icon: '⛅' };
      case 45: case 48: return { text: 'Foggy', icon: '🌫️' };
      case 51: case 53: case 55: return { text: 'Drizzle', icon: '🌧️' };
      case 56: case 57: return { text: 'Freezing Drizzle', icon: '🌧️' };
      case 61: case 63: case 65: return { text: 'Rainy', icon: '🌧️' };
      case 66: case 67: return { text: 'Freezing Rain', icon: '🌧️' };
      case 71: case 73: case 75: return { text: 'Snowy', icon: '❄️' };
      case 77: return { text: 'Snow Grains', icon: '❄️' };
      case 80: case 81: case 82: return { text: 'Rain Showers', icon: '🌦️' };
      case 85: case 86: return { text: 'Snow Showers', icon: '❄️' };
      case 95: return { text: 'Thunderstorms', icon: '⛈️' };
      case 96: case 99: return { text: 'Thunderstorms w/ Hail', icon: '⛈️' };
      default: return { text: 'Overcast', icon: '☁️' };
    }
  };

  const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const todayDayName = daysOfWeek[new Date().getDay()];
  const todaysMeals = weeklyMenu.filter(item => item.day_of_week === todayDayName);

  const todayDateStr = new Date().toLocaleDateString('sv');
  const todayEvents = events.filter(e => {
    if (!e.start_time) return false;
    return e.start_time.split('T')[0] === todayDateStr;
  });

  const todayTasks = tasks.filter(t => {
    if (!t.due_date) return false;
    const isPending = t.status !== 'completed' && !t.completed;
    return isPending && t.due_date.split('T')[0] === todayDateStr;
  });

  const todayBills = bills.filter(b => b.due_date && b.due_date.split('T')[0] === todayDateStr);
  const todaySubs = subscriptions.filter(s => s.next_billing_date && s.next_billing_date.split('T')[0] === todayDateStr);

  const todayObj = new Date();
  const currentMonth = todayObj.getMonth() + 1;
  const currentDay = todayObj.getDate();
  
  const todayBirthdays = contacts.filter(c => {
    if (!c.birthday) return false;
    const parts = c.birthday.split('-');
    if (parts.length === 3) {
      const m = parseInt(parts[1], 10);
      const d = parseInt(parts[2], 10);
      return m === currentMonth && d === currentDay;
    }
    return false;
  }).map(c => {
    const parts = c.birthday.split('-');
    const age = todayObj.getFullYear() - parseInt(parts[0], 10);
    return { name: c.name, age };
  });

  const todayAnniversaries = todayEvents.filter(e => {
    const title = e.title || '';
    return title.toLowerCase().includes('anniversary');
  });

  const upcomingEvents = events
    .filter(e => {
      if (!e.start_time) return false;
      const eventDate = e.start_time.split('T')[0];
      return eventDate >= todayDateStr;
    })
    .sort((a, b) => a.start_time.localeCompare(b.start_time))
    .slice(0, 5);

  const upcomingActiveTasks = tasks
    .filter(t => {
      const isPending = t.status !== 'completed' && !t.completed;
      return isPending;
    })
    .sort((a, b) => {
      if (!a.due_date) return 1;
      if (!b.due_date) return -1;
      return a.due_date.localeCompare(b.due_date);
    })
    .slice(0, 5);

  const upcomingFinance = [
    ...bills.map(b => ({ id: `bill-${b.id}`, name: b.name, amount: b.amount, date: b.due_date, type: 'bill' })),
    ...subscriptions.map(s => ({ id: `sub-${s.id}`, name: s.name, amount: s.amount, date: s.next_billing_date, type: 'subscription' }))
  ]
    .filter(item => item.date >= todayDateStr)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 5);

  const getNext7Days = () => {
    const days = [];
    const date = new Date();
    for (let i = 0; i < 7; i++) {
      const d = new Date(date);
      d.setDate(date.getDate() + i);
      const dayName = daysOfWeek[d.getDay()];
      days.push({
        dayName,
        dateStr: d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        isToday: i === 0
      });
    }
    return days;
  };
  const weekDays = getNext7Days();

  const getDayNameShort = (dateStr) => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const d = new Date(dateStr + 'T00:00:00');
    return days[d.getDay()];
  };

  const forecastData = [];
  if (weather && weather.daily && weather.daily.time) {
    for (let i = 0; i < 5; i++) {
      if (weather.daily.time[i]) {
        forecastData.push({
          date: weather.daily.time[i],
          dayName: i === 0 ? 'Today' : getDayNameShort(weather.daily.time[i]),
          code: weather.daily.weathercode[i],
          maxTemp: weather.daily.temperature_2m_max[i],
          minTemp: weather.daily.temperature_2m_min[i]
        });
      }
    }
  }

  const renderCardEditControls = (cardType) => {
    if (!isEditMode) return null;
    const colSpan = cardSizes[cardType]?.colSpan || DEFAULT_CARD_SIZES[cardType]?.colSpan || 6;
    const percentage = Math.round((colSpan / 12) * 100);

    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'rgba(255, 255, 255, 0.04)',
        border: '1px solid var(--border)',
        borderRadius: '6px',
        padding: '0.35rem 0.6rem',
        fontSize: '0.75rem',
        marginBottom: '0.25rem',
        userSelect: 'none'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--muted-foreground)' }}>
          <GripVertical size={14} style={{ cursor: 'grab' }} />
          <span style={{ fontWeight: '700', color: 'var(--primary)' }}>{colSpan}/12 Col</span>
          <span style={{ fontSize: '0.6875rem' }}>({percentage}% width)</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <button 
            type="button" 
            onClick={(e) => { e.stopPropagation(); handleAdjustCardSpan(cardType, -1); }}
            disabled={colSpan <= 3}
            className="btn btn-outline"
            style={{ padding: '0 0.4rem', height: '24px', fontSize: '0.75rem', minWidth: '24px', cursor: colSpan <= 3 ? 'not-allowed' : 'pointer' }}
            title="Shrink Width (-1 col)"
          >
            -
          </button>
          <button 
            type="button" 
            onClick={(e) => { e.stopPropagation(); handleAdjustCardSpan(cardType, 1); }}
            disabled={colSpan >= 12}
            className="btn btn-outline"
            style={{ padding: '0 0.4rem', height: '24px', fontSize: '0.75rem', minWidth: '24px', cursor: colSpan >= 12 ? 'not-allowed' : 'pointer' }}
            title="Expand Width (+1 col)"
          >
            +
          </button>
          <button 
            type="button" 
            onClick={(e) => { e.stopPropagation(); handleHideCard(cardType); }}
            style={{ border: 'none', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--destructive, #ef4444)', borderRadius: '4px', cursor: 'pointer', padding: '0.2rem 0.35rem', display: 'flex', alignItems: 'center' }}
            title="Remove from Dashboard"
          >
            <X size={14} />
          </button>
        </div>
      </div>
    );
  };

  const renderCardResizeHandles = (cardType) => {
    if (!isEditMode) return null;
    const isResizingThis = resizingCard?.cardType === cardType;

    return (
      <>
        <div 
          onMouseDown={(e) => handleResizeStart(e, cardType, 'left')}
          onTouchStart={(e) => handleResizeStart(e, cardType, 'left')}
          style={{
            position: 'absolute',
            top: 0,
            left: '-6px',
            width: '14px',
            height: '100%',
            cursor: 'ew-resize',
            zIndex: 30,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            userSelect: 'none'
          }}
          title="Drag to resize card width"
        >
          <div style={{
            width: '4px',
            height: '40px',
            borderRadius: '2px',
            background: isResizingThis ? 'var(--primary)' : 'var(--border)',
            boxShadow: '0 0 6px rgba(0,0,0,0.4)',
            transition: 'background 0.15s ease'
          }} />
        </div>

        <div 
          onMouseDown={(e) => handleResizeStart(e, cardType, 'right')}
          onTouchStart={(e) => handleResizeStart(e, cardType, 'right')}
          style={{
            position: 'absolute',
            top: 0,
            right: '-6px',
            width: '14px',
            height: '100%',
            cursor: 'ew-resize',
            zIndex: 30,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            userSelect: 'none'
          }}
          title="Drag to resize card width"
        >
          <div style={{
            width: '4px',
            height: '40px',
            borderRadius: '2px',
            background: isResizingThis ? 'var(--primary)' : 'var(--border)',
            boxShadow: '0 0 6px rgba(0,0,0,0.4)',
            transition: 'background 0.15s ease'
          }} />
        </div>

        <div 
          onMouseDown={(e) => handleResizeStart(e, cardType, 'right')}
          onTouchStart={(e) => handleResizeStart(e, cardType, 'right')}
          style={{
            position: 'absolute',
            bottom: '4px',
            right: '4px',
            width: '22px',
            height: '22px',
            cursor: 'se-resize',
            zIndex: 30,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--primary)',
            background: 'rgba(255, 255, 255, 0.06)',
            borderRadius: '4px',
            userSelect: 'none'
          }}
          title="Drag corner to stretch or shrink card"
        >
          <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
            <path d="M9 2L2 9M9 5.5L5.5 9M9 9H9.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </div>
      </>
    );
  };

  const cardDragProps = (idx, cardType) => {
    const colSpan = cardSizes[cardType]?.colSpan || DEFAULT_CARD_SIZES[cardType]?.colSpan || 6;
    const isResizingThis = resizingCard?.cardType === cardType;

    return {
      className: `card overview-card ${isEditMode ? 'card-editing' : ''}`,
      draggable: isEditMode && !resizingCard,
      onDragStart: (e) => handleDragStart(e, idx),
      onDragOver: (e) => handleDragOver(e, idx),
      onDrop: (e) => handleDrop(e, idx),
      onDragEnd: () => setDraggedIndex(null),
      style: {
        gridColumn: `span ${colSpan}`,
        padding: '1.5rem', 
        background: 'color-mix(in srgb, var(--card) calc(var(--navbar-opacity, 0.75) * 100%), transparent)', 
        backdropFilter: 'blur(8px)', 
        WebkitBackdropFilter: 'blur(8px)', 
        border: isEditMode ? (isResizingThis ? '2px solid var(--primary)' : '2px dashed var(--primary)') : '1px solid var(--border)', 
        borderRadius: 'var(--radius)',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
        position: 'relative',
        cursor: isEditMode ? (resizingCard ? 'ew-resize' : 'grab') : 'default',
        opacity: draggedIndex === idx ? 0.4 : 1,
        transition: resizingCard ? 'none' : 'opacity 0.2s ease, border-color 0.2s ease'
      }
    };
  };

  const renderEventsCard = (idx) => (
    <div key="events" {...cardDragProps(idx, 'events')}>
      {renderCardResizeHandles('events')}
      {renderCardEditControls('events')}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
        <Calendar size={18} style={{ color: 'var(--primary)' }} />
        <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: '800', color: 'var(--foreground)' }}>Upcoming Events</h3>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', flex: 1 }}>
        {upcomingEvents.length > 0 ? (
          upcomingEvents.map(e => {
            const eventDate = new Date(e.start_time);
            return (
              <div key={e.id} style={{ display: 'flex', gap: '0.75rem', fontSize: '0.8125rem' }}>
                <div style={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center', 
                  background: 'rgba(255,255,255,0.03)', 
                  border: '1px solid var(--border)', 
                  borderRadius: '6px', 
                  width: '42px', 
                  height: '42px', 
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <span style={{ fontSize: '0.625rem', textTransform: 'uppercase', color: 'var(--primary)', fontWeight: 'bold', lineHeight: 1 }}>
                    {eventDate.toLocaleDateString(undefined, { month: 'short' })}
                  </span>
                  <span style={{ fontSize: '0.9375rem', fontWeight: 'bold', lineHeight: 1.1, color: 'var(--foreground)' }}>
                    {eventDate.getDate()}
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <strong style={{ color: 'var(--foreground)' }}>{e.title}</strong>
                  <span style={{ color: 'var(--muted-foreground)', fontSize: '0.7rem' }}>
                    {e.all_day ? 'All Day' : eventDate.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                    {e.location && ` • ${e.location}`}
                  </span>
                </div>
              </div>
            );
          })
        ) : (
          <div style={{ color: 'var(--muted-foreground)', fontStyle: 'italic', fontSize: '0.8125rem', textAlign: 'center', padding: '1.5rem 0' }}>
            No upcoming events.
          </div>
        )}
      </div>
      <button 
        onClick={() => !isEditMode && onNavigateTab('calendar')}
        className="btn btn-outline"
        style={{ width: '100%', fontSize: '0.75rem', marginTop: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem', cursor: isEditMode ? 'default' : 'pointer' }}
        disabled={isEditMode}
      >
        Go to Calendar <ArrowRight size={12} />
      </button>
    </div>
  );

  const renderTasksCard = (idx) => (
    <div key="tasks" {...cardDragProps(idx, 'tasks')}>
      {renderCardResizeHandles('tasks')}
      {renderCardEditControls('tasks')}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
        <ListTodo size={18} style={{ color: '#10b981' }} />
        <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: '800', color: 'var(--foreground)' }}>Upcoming Tasks</h3>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', flex: 1 }}>
        {upcomingActiveTasks.length > 0 ? (
          upcomingActiveTasks.map(t => {
            const isOverdue = t.due_date && t.due_date.split('T')[0] < todayDateStr;
            return (
              <div 
                key={t.id} 
                style={{ 
                  padding: '0.5rem 0.75rem', 
                  background: 'rgba(255,255,255,0.01)', 
                  border: '1px solid var(--border)', 
                  borderRadius: '6px',
                  fontSize: '0.8125rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '0.5rem'
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem', overflow: 'hidden', flex: 1 }}>
                  <strong style={{ color: 'var(--foreground)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{t.title}</strong>
                  {t.due_date && (
                    <span style={{ fontSize: '0.7rem', color: isOverdue ? '#ef4444' : 'var(--muted-foreground)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      {isOverdue ? '⚠️ Overdue: ' : '📅 '}
                      {new Date(t.due_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </span>
                  )}
                </div>
                {t.list_name && (
                  <span className="badge" style={{ fontSize: '0.625rem', textTransform: 'uppercase', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', flexShrink: 0 }}>
                    {t.list_name}
                  </span>
                )}
              </div>
            );
          })
        ) : (
          <div style={{ color: 'var(--muted-foreground)', fontStyle: 'italic', fontSize: '0.8125rem', textAlign: 'center', padding: '1.5rem 0' }}>
            All caught up! No upcoming tasks.
          </div>
        )}
      </div>
      <button 
        onClick={() => !isEditMode && onNavigateTab('focus')}
        className="btn btn-outline"
        style={{ width: '100%', fontSize: '0.75rem', marginTop: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem', cursor: isEditMode ? 'default' : 'pointer' }}
        disabled={isEditMode}
      >
        Manage Tasks <ArrowRight size={12} />
      </button>
    </div>
  );

  const renderFinancesCard = (idx) => (
    <div key="finances" {...cardDragProps(idx, 'finances')}>
      {renderCardResizeHandles('finances')}
      {renderCardEditControls('finances')}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
        <Receipt size={18} style={{ color: '#3b82f6' }} />
        <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: '800', color: 'var(--foreground)' }}>Bills & Subscriptions</h3>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', flex: 1 }}>
        {upcomingFinance.length > 0 ? (
          upcomingFinance.map(item => {
            const isSub = item.type === 'subscription';
            return (
              <div 
                key={item.id} 
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between', 
                  fontSize: '0.8125rem',
                  padding: '0.35rem 0',
                  borderBottom: '1px dashed rgba(255,255,255,0.05)'
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <strong style={{ color: 'var(--foreground)' }}>{item.name}</strong>
                  <span style={{ fontSize: '0.7rem', color: 'var(--muted-foreground)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <span>{isSub ? '🔁 Sub' : '💸 Bill'}</span> • Due {new Date(item.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  </span>
                </div>
                <span style={{ fontWeight: '700', color: isSub ? '#8b5cf6' : '#3b82f6' }}>
                  ${parseFloat(item.amount).toFixed(2)}
                </span>
              </div>
            );
          })
        ) : (
          <div style={{ color: 'var(--muted-foreground)', fontStyle: 'italic', fontSize: '0.8125rem', textAlign: 'center', padding: '1.5rem 0' }}>
            No upcoming bills or subscriptions.
          </div>
        )}
      </div>
      <button 
        onClick={() => !isEditMode && onNavigateTab('settings')}
        className="btn btn-outline"
        style={{ width: '100%', fontSize: '0.75rem', marginTop: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem', cursor: isEditMode ? 'default' : 'pointer' }}
        disabled={isEditMode}
      >
        Manage Finances <ArrowRight size={12} />
      </button>
    </div>
  );

  const renderMealsCard = (idx) => (
    <div key="meals" {...cardDragProps(idx, 'meals')}>
      {renderCardResizeHandles('meals')}
      {renderCardEditControls('meals')}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
        <ChefHat size={18} style={{ color: '#ec4899' }} />
        <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: '800', color: 'var(--foreground)' }}>Weekly Meal Plan</h3>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1, maxHeight: '240px', overflowY: 'auto', paddingRight: '0.25rem' }}>
        {weekDays.map((day, idx) => {
          const dayMeals = weeklyMenu.filter(item => item.day_of_week === day.dayName);
          return (
            <div 
              key={idx} 
              style={{ 
                padding: '0.4rem 0.6rem', 
                background: day.isToday ? 'rgba(236, 72, 153, 0.04)' : 'rgba(255,255,255,0.01)', 
                border: day.isToday ? '1px solid rgba(236, 72, 153, 0.2)' : '1px solid var(--border)', 
                borderRadius: '6px',
                fontSize: '0.75rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.25rem'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: '700', color: day.isToday ? '#f472b6' : 'var(--foreground)' }}>
                <span>{day.dayName}</span>
                <span style={{ fontSize: '0.65rem', color: 'var(--muted-foreground)' }}>{day.dateStr}</span>
              </div>
              {dayMeals.length > 0 ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginTop: '0.15rem' }}>
                  {dayMeals.map(m => (
                    <div 
                      key={m.id} 
                      style={{ 
                        fontSize: '0.6875rem', 
                        padding: '0.15rem 0.35rem', 
                        background: 'rgba(255,255,255,0.03)', 
                        borderRadius: '4px',
                        border: '1px solid rgba(255,255,255,0.05)',
                        color: 'var(--foreground)'
                      }}
                      title={m.meal_type}
                    >
                      <span style={{ fontWeight: 'bold', color: '#f472b6', marginRight: '0.25rem' }}>{m.meal_type[0]}:</span>
                      {m.recipe_title || m.custom_meal || 'Leftovers'}
                    </div>
                  ))}
                </div>
              ) : (
                <span style={{ color: 'var(--muted-foreground)', fontStyle: 'italic', fontSize: '0.6875rem' }}>No meals planned</span>
              )}
            </div>
          );
        })}
      </div>
      <button 
        onClick={() => !isEditMode && onNavigateTab('recipes')}
        className="btn btn-outline"
        style={{ width: '100%', fontSize: '0.75rem', marginTop: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem', cursor: isEditMode ? 'default' : 'pointer' }}
        disabled={isEditMode}
      >
        Meal Planner <ArrowRight size={12} />
      </button>
    </div>
  );

  const renderWeatherCard = (idx) => (
    <div key="weather" {...cardDragProps(idx, 'weather')}>
      {renderCardResizeHandles('weather')}
      {renderCardEditControls('weather')}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
        <Sun size={18} style={{ color: '#f59e0b' }} />
        <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: '800', color: 'var(--foreground)' }}>Weather Forecast</h3>
      </div>

      {weather ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', flex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '0.65rem', color: 'var(--muted-foreground)', textTransform: 'uppercase', fontWeight: 'bold' }}>Current Weather</span>
              <strong style={{ fontSize: '1.5rem', color: 'var(--foreground)' }}>
                {weather.current?.temperature}°{weather.unit === 'celsius' ? 'C' : 'F'}
              </strong>
              <span style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)', marginTop: '0.15rem' }}>
                {getWeatherInfo(weather.current?.weathercode).text}
              </span>
            </div>
            <span style={{ fontSize: '2.5rem', lineHeight: 1 }}>
              {getWeatherInfo(weather.current?.weathercode).icon}
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.7rem', fontWeight: 'bold', color: 'var(--muted-foreground)', textTransform: 'uppercase' }}>5-Day Forecast</span>
            {forecastData.map((f, idx) => (
              <div 
                key={idx} 
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between',
                  fontSize: '0.75rem',
                  padding: '0.25rem 0.5rem',
                  borderRadius: '4px',
                  background: idx % 2 === 0 ? 'rgba(255,255,255,0.01)' : 'transparent'
                }}
              >
                <span style={{ width: '45px', fontWeight: '600' }}>{f.dayName}</span>
                <span style={{ fontSize: '1.1rem', width: '25px', textAlign: 'center' }}>
                  {getWeatherInfo(f.code).icon}
                </span>
                <span style={{ flex: 1, color: 'var(--muted-foreground)', fontSize: '0.7rem', paddingLeft: '0.5rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {getWeatherInfo(f.code).text}
                </span>
                <span style={{ fontWeight: '700', textAlign: 'right' }}>
                  <span style={{ color: 'var(--foreground)' }}>{Math.round(f.maxTemp)}°</span>
                  <span style={{ color: 'var(--muted-foreground)', fontSize: '0.7rem', marginLeft: '0.35rem' }}>{Math.round(f.minTemp)}°</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div style={{ color: 'var(--muted-foreground)', fontStyle: 'italic', fontSize: '0.8125rem', textAlign: 'center', padding: '2rem 0', flex: 1 }}>
          Failed to load weather forecast data.
        </div>
      )}
    </div>
  );

  /* CALENDAR HELPER */
  const getProcessedCalendar = (targetYear, targetMonth) => {
    if (!calendarData) return { itemsByDate: {}, allItems: [], todayStr: todayDateStr, colors: {} };
    const today = new Date();
    const year = targetYear !== undefined ? targetYear : today.getFullYear();
    const month = targetMonth !== undefined ? targetMonth : today.getMonth();
    const todayStr = calendarData.todayStr || todayDateStr;

    const colors = {
      event: calendarData.colors?.event || '#3b82f6',
      holiday: calendarData.colors?.holiday || '#f97316',
      task: calendarData.colors?.task || '#10b981',
      bill: calendarData.colors?.bill || '#ef4444',
      subscription: calendarData.colors?.subscription || '#8b5cf6',
      contact_event: calendarData.colors?.contact_event || '#ec4899'
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

    // 1. Events & Holidays
    (calendarData.events || []).forEach(e => {
      const isHoliday = e.event_type === 'holiday';
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
          id: `${isHoliday ? 'holiday' : 'event'}-${e.id}-${dateStr}`,
          title: isHoliday ? `🎉 ${e.title}` : e.title,
          type: isHoliday ? 'holiday' : 'event',
          typeLabel: isHoliday ? 'Holiday' : 'Event',
          dateStr,
          timeStr: e.all_day ? 'All Day' : timeStr,
          allDay: Boolean(e.all_day),
          location: e.location || '',
          color: isHoliday ? colors.holiday : colors.event,
          icon: isHoliday ? '🎉' : '📅'
        });
      });
    });

    // 2. Tasks
    (calendarData.tasks || []).forEach(t => {
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
          color: colors.task,
          icon: '☑️'
        });
      }
    });

    // 3. Bills
    (calendarData.bills || []).forEach(b => {
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
          location: b.category || 'Bill',
          color: colors.bill,
          icon: '💸'
        });
      }
    });

    // 4. Subscriptions
    (calendarData.subscriptions || []).forEach(s => {
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
          location: 'Subscription',
          color: colors.subscription,
          icon: '🔁'
        });
      }
    });

    // 5. Contact Birthdays
    (calendarData.contacts || []).forEach(c => {
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
              color: colors.contact_event,
              icon: '🎂'
            });
          });
        }
      }
    });

    // 6. Contact & User Important Dates
    (calendarData.contactImportantDates || []).forEach(d => {
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
              color: colors.contact_event,
              icon: '✨'
            });
          });
        }
      }
    });

    return { itemsByDate, allItems, todayStr, colors };
  };

  /* 1. DAILY AGENDA CARD */
  const renderDailyAgendaCard = (idx) => {
    const year = overviewDailyDate.getFullYear();
    const month = overviewDailyDate.getMonth();
    const { itemsByDate, todayStr, colors } = getProcessedCalendar(year, month);
    const selectedDateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(overviewDailyDate.getDate()).padStart(2, '0')}`;
    const isToday = selectedDateStr === todayStr;
    const items = itemsByDate[selectedDateStr] || [];

    const formattedHeader = overviewDailyDate.toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });

    return (
      <div key="daily_agenda" {...cardDragProps(idx, 'daily_agenda')}>
        {renderCardResizeHandles('daily_agenda')}
        {renderCardEditControls('daily_agenda')}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Calendar size={18} style={{ color: 'var(--primary)' }} />
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: '800', color: 'var(--foreground)' }}>Daily Agenda</h3>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => !isEditMode && setOverviewDailyDate(d => new Date(d.getFullYear(), d.getMonth(), d.getDate() - 1))}
              disabled={isEditMode}
              style={{ padding: '0.15rem 0.35rem', fontSize: '0.7rem', height: '24px' }}
            >
              <ChevronLeft size={13} />
            </button>
            <span style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--foreground)' }}>
              {formattedHeader}
            </span>
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => !isEditMode && setOverviewDailyDate(d => new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1))}
              disabled={isEditMode}
              style={{ padding: '0.15rem 0.35rem', fontSize: '0.7rem', height: '24px' }}
            >
              <ChevronRight size={13} />
            </button>
            {!isToday && (
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => !isEditMode && setOverviewDailyDate(new Date())}
                disabled={isEditMode}
                style={{ padding: '0.15rem 0.45rem', fontSize: '0.65rem', height: '24px' }}
              >
                Today
              </button>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', flex: 1, maxHeight: '250px', overflowY: 'auto', paddingRight: '0.2rem' }}>
          {items.length === 0 ? (
            <div style={{ color: 'var(--muted-foreground)', fontStyle: 'italic', fontSize: '0.8125rem', textAlign: 'center', padding: '1.5rem 0' }}>
              No scheduled items for this day.
            </div>
          ) : (
            items.map(item => (
              <div
                key={item.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '0.5rem',
                  padding: '0.45rem 0.6rem',
                  borderRadius: 'var(--radius-sm)',
                  background: 'rgba(255,255,255,0.01)',
                  border: '1px solid var(--border)',
                  borderLeft: `3.5px solid ${item.color}`,
                  fontSize: '0.8125rem'
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
                  <span style={{ fontWeight: '600', color: 'var(--foreground)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {item.icon} {item.title}
                  </span>
                  {item.location && (
                    <span style={{ fontSize: '0.6875rem', color: 'var(--muted-foreground)' }}>
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

        <button 
          onClick={() => !isEditMode && onNavigateTab('calendar')}
          className="btn btn-outline"
          style={{ width: '100%', fontSize: '0.75rem', marginTop: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem', cursor: isEditMode ? 'default' : 'pointer' }}
          disabled={isEditMode}
        >
          View in Calendar <ArrowRight size={12} />
        </button>
      </div>
    );
  };

  /* 2. WEEKLY AGENDA CARD */
  const renderWeeklyAgendaCard = (idx) => {
    const today = new Date();
    const baseDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() + (overviewWeekOffset * 7));
    const { itemsByDate, todayStr } = getProcessedCalendar(baseDate.getFullYear(), baseDate.getMonth());

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

    return (
      <div key="weekly_agenda" {...cardDragProps(idx, 'weekly_agenda')}>
        {renderCardResizeHandles('weekly_agenda')}
        {renderCardEditControls('weekly_agenda')}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Calendar size={18} style={{ color: '#10b981' }} />
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: '800', color: 'var(--foreground)' }}>Weekly Agenda</h3>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => !isEditMode && setOverviewWeekOffset(w => w - 1)}
              disabled={isEditMode}
              style={{ padding: '0.15rem 0.35rem', fontSize: '0.7rem', height: '24px' }}
            >
              <ChevronLeft size={13} />
            </button>
            <span style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--foreground)' }}>
              {daysOfWeek[0].formattedDate} – {daysOfWeek[6].formattedDate}
            </span>
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => !isEditMode && setOverviewWeekOffset(w => w + 1)}
              disabled={isEditMode}
              style={{ padding: '0.15rem 0.35rem', fontSize: '0.7rem', height: '24px' }}
            >
              <ChevronRight size={13} />
            </button>
            {overviewWeekOffset !== 0 && (
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => !isEditMode && setOverviewWeekOffset(0)}
                disabled={isEditMode}
                style={{ padding: '0.15rem 0.45rem', fontSize: '0.65rem', height: '24px' }}
              >
                Current Week
              </button>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', flex: 1, maxHeight: '250px', overflowY: 'auto', paddingRight: '0.2rem' }}>
          {daysOfWeek.map(day => (
            <div
              key={day.dateStr}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.25rem',
                padding: '0.4rem 0.6rem',
                borderRadius: 'var(--radius-sm)',
                background: day.isToday ? 'rgba(59, 130, 246, 0.06)' : 'rgba(255,255,255,0.01)',
                border: day.isToday ? '1px solid rgba(59, 130, 246, 0.3)' : '1px solid var(--border)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: '800', color: day.isToday ? 'var(--primary)' : 'var(--foreground)' }}>
                  {day.dayName}, {day.formattedDate}
                  {day.isToday && <span style={{ marginLeft: '0.35rem', fontSize: '0.6rem', fontWeight: '700', background: 'var(--primary)', color: '#fff', padding: '0.05rem 0.35rem', borderRadius: '8px' }}>Today</span>}
                </span>
                <span style={{ fontSize: '0.65rem', color: 'var(--muted-foreground)' }}>
                  {day.items.length} {day.items.length === 1 ? 'item' : 'items'}
                </span>
              </div>

              {day.items.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                  {day.items.map(item => (
                    <div
                      key={item.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '0.4rem',
                        padding: '0.2rem 0.35rem',
                        borderRadius: '3px',
                        background: 'rgba(255,255,255,0.02)',
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

        <button 
          onClick={() => !isEditMode && onNavigateTab('calendar')}
          className="btn btn-outline"
          style={{ width: '100%', fontSize: '0.75rem', marginTop: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem', cursor: isEditMode ? 'default' : 'pointer' }}
          disabled={isEditMode}
        >
          View Full Calendar <ArrowRight size={12} />
        </button>
      </div>
    );
  };

  /* 3. MONTHLY AGENDA CARD */
  const renderMonthlyAgendaCard = (idx) => {
    const year = overviewMonthDate.getFullYear();
    const month = overviewMonthDate.getMonth();
    const { itemsByDate, todayStr } = getProcessedCalendar(year, month);
    const monthName = overviewMonthDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
    const monthPrefix = `${year}-${String(month + 1).padStart(2, '0')}`;

    const monthDates = Object.keys(itemsByDate)
      .filter(d => d.startsWith(monthPrefix) && itemsByDate[d]?.length > 0)
      .sort();

    const totalMonthItems = monthDates.reduce((acc, d) => acc + (itemsByDate[d]?.length || 0), 0);

    return (
      <div key="monthly_agenda" {...cardDragProps(idx, 'monthly_agenda')}>
        {renderCardResizeHandles('monthly_agenda')}
        {renderCardEditControls('monthly_agenda')}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Calendar size={18} style={{ color: '#8b5cf6' }} />
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: '800', color: 'var(--foreground)' }}>Monthly Agenda</h3>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => !isEditMode && setOverviewMonthDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1))}
              disabled={isEditMode}
              style={{ padding: '0.15rem 0.35rem', fontSize: '0.7rem', height: '24px' }}
            >
              <ChevronLeft size={13} />
            </button>
            <span style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--foreground)' }}>
              {monthName}
            </span>
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => !isEditMode && setOverviewMonthDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1))}
              disabled={isEditMode}
              style={{ padding: '0.15rem 0.35rem', fontSize: '0.7rem', height: '24px' }}
            >
              <ChevronRight size={13} />
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', flex: 1, maxHeight: '250px', overflowY: 'auto', paddingRight: '0.2rem' }}>
          {monthDates.length === 0 ? (
            <div style={{ color: 'var(--muted-foreground)', fontStyle: 'italic', fontSize: '0.8125rem', textAlign: 'center', padding: '1.5rem 0' }}>
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
                    gap: '0.25rem',
                    padding: '0.4rem 0.6rem',
                    borderRadius: 'var(--radius-sm)',
                    background: isToday ? 'rgba(59, 130, 246, 0.06)' : 'rgba(255,255,255,0.01)',
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

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                    {items.map(item => (
                      <div
                        key={item.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '0.4rem',
                          padding: '0.2rem 0.35rem',
                          borderRadius: '3px',
                          background: 'rgba(255,255,255,0.02)',
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
                </div>
              );
            })
          )}
        </div>

        <button 
          onClick={() => !isEditMode && onNavigateTab('calendar')}
          className="btn btn-outline"
          style={{ width: '100%', fontSize: '0.75rem', marginTop: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem', cursor: isEditMode ? 'default' : 'pointer' }}
          disabled={isEditMode}
        >
          Open Calendar View <ArrowRight size={12} />
        </button>
      </div>
    );
  };

  /* 4. FULL MONTHLY CALENDAR CARD (12-COLUMNS / FILLS OVERVIEW) */
  const renderMonthlyCalendarCard = (idx) => {
    const year = overviewMonthDate.getFullYear();
    const month = overviewMonthDate.getMonth();
    const { itemsByDate, todayStr, colors } = getProcessedCalendar(year, month);
    const monthName = overviewMonthDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

    const firstDayIndex = new Date(year, month, 1).getDay();
    const numDaysInMonth = new Date(year, month + 1, 0).getDate();
    const prevMonthNumDays = new Date(year, month, 0).getDate();

    const daysGrid = [];
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const day = prevMonthNumDays - i;
      const m = month === 0 ? 11 : month - 1;
      const y = month === 0 ? year - 1 : year;
      const dateStr = `${y}-${String(m + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      daysGrid.push({ day, dateStr, isCurrentMonth: false, isToday: dateStr === todayStr, items: itemsByDate[dateStr] || [] });
    }
    for (let d = 1; d <= numDaysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      daysGrid.push({ day: d, dateStr, isCurrentMonth: true, isToday: dateStr === todayStr, items: itemsByDate[dateStr] || [] });
    }
    const remaining = (daysGrid.length > 35 ? 42 : 35) - daysGrid.length;
    for (let d = 1; d <= remaining; d++) {
      const m = month === 11 ? 0 : month + 1;
      const y = month === 11 ? year + 1 : year;
      const dateStr = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      daysGrid.push({ day: d, dateStr, isCurrentMonth: false, isToday: dateStr === todayStr, items: itemsByDate[dateStr] || [] });
    }

    const inspectedItems = calendarInspectDay ? (itemsByDate[calendarInspectDay] || []) : [];

    return (
      <div key="monthly_calendar" {...cardDragProps(idx, 'monthly_calendar')}>
        {renderCardResizeHandles('monthly_calendar')}
        {renderCardEditControls('monthly_calendar')}
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Calendar size={18} style={{ color: 'var(--primary)' }} />
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: '800', color: 'var(--foreground)' }}>Household Calendar</h3>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => !isEditMode && setOverviewMonthDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1))}
              disabled={isEditMode}
              style={{ padding: '0.15rem 0.35rem', fontSize: '0.7rem', height: '26px' }}
            >
              <ChevronLeft size={13} />
            </button>
            <span style={{ fontSize: '0.85rem', fontWeight: '800', color: 'var(--foreground)', minWidth: '110px', textAlign: 'center' }}>
              {monthName}
            </span>
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => !isEditMode && setOverviewMonthDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1))}
              disabled={isEditMode}
              style={{ padding: '0.15rem 0.35rem', fontSize: '0.7rem', height: '26px' }}
            >
              <ChevronRight size={13} />
            </button>
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => !isEditMode && setOverviewMonthDate(new Date(new Date().getFullYear(), new Date().getMonth(), 1))}
              disabled={isEditMode}
              style={{ padding: '0.15rem 0.45rem', fontSize: '0.65rem', height: '26px' }}
            >
              This Month
            </button>
          </div>
        </div>

        {/* Category color dots legend */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap', marginTop: '0.4rem', padding: '0.25rem 0.4rem', background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-sm)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.65rem' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: colors.event || '#3b82f6' }}></span>
            <span style={{ color: 'var(--muted-foreground)' }}>Events</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.65rem' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: colors.holiday || '#f97316' }}></span>
            <span style={{ color: 'var(--muted-foreground)' }}>Holidays</span>
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
            <span style={{ color: 'var(--muted-foreground)' }}>Contact Events</span>
          </div>
        </div>

        {/* Weekday headers */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: '2px', textAlign: 'center', marginTop: '0.25rem' }}>
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
            <div key={d} style={{ fontSize: '0.7rem', fontWeight: '700', color: 'var(--muted-foreground)', padding: '0.15rem 0' }}>
              {d}
            </div>
          ))}
        </div>

        {/* Days Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gridAutoRows: 'minmax(52px, 1fr)', gap: '3px', flex: 1, minHeight: 0, overflowY: 'auto' }}>
          {daysGrid.map(dayCell => {
            const isSelected = calendarInspectDay === dayCell.dateStr;
            return (
              <div
                key={dayCell.dateStr}
                onClick={() => !isEditMode && setCalendarInspectDay(isSelected ? null : dayCell.dateStr)}
                style={{
                  border: isSelected ? '1.5px solid var(--primary)' : (dayCell.isToday ? '1px solid rgba(59, 130, 246, 0.5)' : '1px solid var(--border)'),
                  borderRadius: 'var(--radius-sm)',
                  padding: '0.2rem',
                  background: dayCell.isToday ? 'rgba(59, 130, 246, 0.08)' : (dayCell.isCurrentMonth ? 'rgba(255,255,255,0.01)' : 'transparent'),
                  opacity: dayCell.isCurrentMonth ? 1 : 0.4,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.1rem',
                  cursor: isEditMode ? 'default' : 'pointer',
                  overflow: 'hidden'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span
                    style={{
                      fontSize: '0.65rem',
                      fontWeight: dayCell.isToday ? '800' : '600',
                      width: '16px',
                      height: '16px',
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

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.1rem', overflow: 'hidden' }}>
                  {dayCell.items.slice(0, 2).map((item, i) => (
                    <div
                      key={i}
                      style={{
                        fontSize: '0.55rem',
                        fontWeight: '600',
                        padding: '0.05rem 0.15rem',
                        borderRadius: '2px',
                        background: 'rgba(255,255,255,0.03)',
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
                  {dayCell.items.length > 2 && (
                    <span style={{ fontSize: '0.5rem', color: 'var(--muted-foreground)', paddingLeft: '0.1rem' }}>
                      +{dayCell.items.length - 2} more
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Selected Day Agenda Drawer / Inline Popup */}
        {calendarInspectDay && (
          <div style={{ marginTop: '0.5rem', padding: '0.5rem', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--foreground)' }}>
                Agenda for {new Date(`${calendarInspectDay}T12:00:00`).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
              </span>
              <button
                type="button"
                onClick={() => setCalendarInspectDay(null)}
                style={{ background: 'none', border: 'none', color: 'var(--muted-foreground)', cursor: 'pointer', fontSize: '0.9rem', padding: '0 0.2rem' }}
              >
                ×
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', maxHeight: '120px', overflowY: 'auto' }}>
              {inspectedItems.length === 0 ? (
                <span style={{ fontSize: '0.7rem', color: 'var(--muted-foreground)', fontStyle: 'italic' }}>
                  No scheduled items on this date.
                </span>
              ) : (
                inspectedItems.map(item => (
                  <div
                    key={item.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '0.4rem',
                      padding: '0.2rem 0.4rem',
                      borderRadius: '3px',
                      background: 'var(--card)',
                      borderLeft: `3px solid ${item.color}`,
                      fontSize: '0.7rem'
                    }}
                  >
                    <span style={{ fontWeight: '600', color: 'var(--foreground)' }}>
                      {item.icon} {item.title}
                    </span>
                    <span style={{ fontSize: '0.65rem', fontWeight: '700', color: item.color }}>
                      {item.timeStr || item.typeLabel}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        <button 
          onClick={() => !isEditMode && onNavigateTab('calendar')}
          className="btn btn-outline"
          style={{ width: '100%', fontSize: '0.75rem', marginTop: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem', cursor: isEditMode ? 'default' : 'pointer' }}
          disabled={isEditMode}
        >
          Open Calendar Section <ArrowRight size={12} />
        </button>
      </div>
    );
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', paddingBottom: '3rem' }}>
      
      {/* Merged Welcome & What's Happening Today Card */}
      <div 
        className="card animate-fade-in" 
        style={{ 
          padding: '2rem', 
          background: 'linear-gradient(135deg, var(--primary-light) 0%, color-mix(in srgb, var(--card) calc(var(--navbar-opacity, 0.75) * 100%), transparent) 100%)', 
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius)',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.5rem',
          position: 'relative',
          overflow: 'visible'
        }}
      >
        {/* Welcome Section / Header of merged card */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h2 style={{ fontSize: '1.75rem', fontWeight: '800', margin: 0, letterSpacing: '-0.5px', color: 'var(--foreground)' }}>
              {getGreeting()}, {user?.display_name || user?.username}!
            </h2>
            <p style={{ color: 'var(--muted-foreground)', marginTop: '0.35rem', fontSize: '0.875rem', marginBottom: 0 }}>
              Here is a summary of what's happening in your household today.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            {isEditMode && (
              <button 
                type="button" 
                onClick={handleResetLayout}
                className="btn btn-outline"
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '0.375rem', 
                  fontSize: '0.8125rem', 
                  padding: '0.5rem 0.85rem', 
                  height: '38px',
                  cursor: 'pointer',
                  borderRadius: 'var(--radius)',
                  border: '1px solid var(--border)',
                  background: 'rgba(255, 255, 255, 0.02)'
                }}
                title="Reset layout and card sizes to default"
              >
                <RotateCcw size={14} /> Reset Layout
              </button>
            )}

            <button 
              onClick={() => setIsEditMode(!isEditMode)}
              className={`btn ${isEditMode ? 'btn-primary' : 'btn-outline'}`}
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.375rem', 
                fontSize: '0.8125rem', 
                padding: '0.5rem 0.85rem', 
                height: '38px',
                cursor: 'pointer',
                borderRadius: 'var(--radius)',
                border: '1px solid var(--border)',
                background: isEditMode ? 'var(--primary)' : 'rgba(255, 255, 255, 0.02)'
              }}
            >
              {isEditMode ? (
                <>💾 Done Editing</>
              ) : (
                <>⚙️ Edit Layout</>
              )}
            </button>

            <div ref={notificationsRef} style={{ position: 'relative' }}>
              <button 
                type="button" 
                onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                className="btn btn-outline"
                style={{ 
                  padding: '0.6rem 0.85rem', 
                  borderRadius: 'var(--radius)', 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '0.5rem',
                  border: '1px solid var(--border)',
                  background: isNotificationsOpen ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.02)',
                  cursor: 'pointer'
                }}
                title="Notifications"
              >
                <Bell size={18} style={{ color: unreadNotifications.length > 0 ? 'var(--primary)' : 'var(--muted-foreground)' }} />
                {unreadNotifications.length > 0 && (
                  <span style={{ 
                    background: 'var(--destructive, #ef4444)', 
                    color: '#ffffff', 
                    borderRadius: '10px', 
                    padding: '2px 6px', 
                    fontSize: '0.7rem', 
                    fontWeight: '800', 
                    lineHeight: '1',
                    minWidth: '15px',
                    textAlign: 'center'
                  }}>
                    {unreadNotifications.length}
                  </span>
                )}
              </button>

              {/* Notifications Popout Dropdown */}
              {isNotificationsOpen && (
                <div 
                  className="animate-slide-up"
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 8px)',
                    right: 0,
                    width: '380px',
                    maxWidth: 'calc(100vw - 32px)',
                    background: 'color-mix(in srgb, var(--card) 98%, black)',
                    backdropFilter: 'blur(20px)',
                    WebkitBackdropFilter: 'blur(20px)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius)',
                    boxShadow: '0 20px 30px -5px rgba(0, 0, 0, 0.5), 0 10px 15px -5px rgba(0, 0, 0, 0.4)',
                    zIndex: 1000,
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column'
                  }}
                >
                  <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255, 255, 255, 0.03)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <strong style={{ fontSize: '0.875rem' }}>Notifications</strong>
                      <span className="badge badge-secondary" style={{ fontSize: '0.7rem', padding: '0.1rem 0.4rem' }}>
                        {unreadNotifications.length} unread
                      </span>
                    </div>
                    {unreadNotifications.length > 0 && (
                      <button 
                        onClick={handleMarkAllAsRead}
                        style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: '0.75rem', fontWeight: '600', cursor: 'pointer', padding: '0.2rem 0.4rem' }}
                      >
                        Mark all as read
                      </button>
                    )}
                  </div>
                  
                  <div style={{ maxHeight: '380px', overflowY: 'auto' }}>
                    {unreadNotifications.length > 0 ? (
                      unreadNotifications.map(n => (
                        <div 
                          key={n.id} 
                          style={{ 
                            padding: '0.75rem 1rem', 
                            borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                            display: 'flex',
                            alignItems: 'flex-start',
                            justifyContent: 'space-between',
                            gap: '0.75rem',
                            background: 'rgba(255, 255, 255, 0.01)'
                          }}
                        >
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: '0.8125rem', fontWeight: 'bold', color: 'var(--foreground)' }}>{n.title}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)', marginTop: '0.2rem', wordBreak: 'break-word', whiteSpace: 'pre-wrap', lineHeight: '1.4' }}>{n.body}</div>
                            <div style={{ fontSize: '0.65rem', color: 'var(--muted-foreground)', marginTop: '0.35rem' }}>
                              {new Date(n.created_at).toLocaleDateString()} {new Date(n.created_at).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </div>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMarkAsRead(n.id);
                            }}
                            className="btn btn-outline"
                            style={{ padding: '0.25rem', minWidth: '26px', height: '26px', border: '1px solid var(--border)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', borderRadius: '4px', flexShrink: 0 }}
                            title="Mark as Read"
                          >
                            <Check size={14} strokeWidth={3} />
                          </button>
                        </div>
                      ))
                    ) : (
                      <div style={{ padding: '2.5rem 1rem', textAlign: 'center', color: 'var(--muted-foreground)', fontSize: '0.8125rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                        <Bell size={24} style={{ opacity: 0.3 }} />
                        <span>No Unread Notifications</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* What's Happening Today Section */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: '800', margin: 0, color: 'var(--foreground)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span>📅</span> What's Happening Today
            </h3>
            <p style={{ color: 'var(--muted-foreground)', margin: '0.25rem 0 0 0', fontSize: '0.85rem' }}>
              {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1.5rem', marginTop: '0.5rem' }}>
            
            {/* Column: Today's Meals */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: '700', color: '#ec4899', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.35rem' }}>
                Today's Meals
              </h4>
              {todaysMeals.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {todaysMeals.map(meal => (
                    <div key={meal.id} style={{ fontSize: '0.8125rem', padding: '0.35rem 0.5rem', background: 'rgba(236, 72, 153, 0.05)', borderRadius: '4px', borderLeft: '3px solid #ec4899' }}>
                      <span style={{ fontSize: '0.65rem', color: '#f472b6', fontWeight: '700', textTransform: 'uppercase', display: 'block' }}>{meal.meal_type}</span>
                      <strong style={{ color: 'var(--foreground)' }}>{meal.recipe_title || meal.custom_meal || 'Leftovers'}</strong>
                    </div>
                  ))}
                </div>
              ) : (
                <span style={{ fontSize: '0.8125rem', color: 'var(--muted-foreground)', fontStyle: 'italic' }}>No meals planned today.</span>
              )}
            </div>

            {/* Column 1: Today's Schedule */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: '700', color: 'var(--primary)', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.35rem' }}>
                Today's Schedule
              </h4>
              {todayEvents.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {todayEvents.map(e => (
                    <div key={e.id} style={{ fontSize: '0.8125rem', padding: '0.35rem 0.5rem', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '4px', borderLeft: '3px solid var(--primary)' }}>
                      <strong style={{ display: 'block', color: 'var(--foreground)' }}>{e.title}</strong>
                      <span style={{ color: 'var(--muted-foreground)', fontSize: '0.7rem' }}>
                        {e.all_day ? 'All Day' : new Date(e.start_time).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <span style={{ fontSize: '0.8125rem', color: 'var(--muted-foreground)', fontStyle: 'italic' }}>No events scheduled today.</span>
              )}
            </div>

            {/* Column 2: Tasks Due Today */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: '700', color: '#10b981', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.35rem' }}>
                Tasks Due Today
              </h4>
              {todayTasks.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {todayTasks.map(t => (
                    <div key={t.id} style={{ fontSize: '0.8125rem', padding: '0.35rem 0.5rem', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '4px', borderLeft: '3px solid #10b981' }}>
                      <span style={{ color: 'var(--foreground)' }}>{t.title}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <span style={{ fontSize: '0.8125rem', color: 'var(--muted-foreground)', fontStyle: 'italic' }}>No tasks due today.</span>
              )}
            </div>

            {/* Column 3: Celebrations */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: '700', color: '#ef4444', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.35rem' }}>
                Celebrations
              </h4>
              {(todayBirthdays.length > 0 || todayAnniversaries.length > 0) ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {todayBirthdays.map((b, idx) => (
                    <div key={`bday-${idx}`} style={{ fontSize: '0.8125rem', padding: '0.35rem 0.5rem', background: 'rgba(239, 68, 68, 0.05)', borderRadius: '4px', borderLeft: '3px solid #ef4444', color: '#fca5a5' }}>
                      <strong>🎂 {b.name}</strong> (turning {b.age} today!)
                    </div>
                  ))}
                  {todayAnniversaries.map(a => (
                    <div key={a.id} style={{ fontSize: '0.8125rem', padding: '0.35rem 0.5rem', background: 'rgba(245, 158, 11, 0.05)', borderRadius: '4px', borderLeft: '3px solid #f59e0b', color: '#fde047' }}>
                      <strong>🥂 {a.title}</strong>
                    </div>
                  ))}
                </div>
              ) : (
                <span style={{ fontSize: '0.8125rem', color: 'var(--muted-foreground)', fontStyle: 'italic' }}>No birthdays or anniversaries today.</span>
              )}
            </div>

            {/* Column 4: Bills & Subscriptions */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: '700', color: '#3b82f6', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.35rem' }}>
                Bills & Subscriptions
              </h4>
              {(todayBills.length > 0 || todaySubs.length > 0) ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {todayBills.map(b => (
                    <div key={b.id} style={{ fontSize: '0.8125rem', padding: '0.35rem 0.5rem', background: 'rgba(59, 130, 246, 0.05)', borderRadius: '4px', borderLeft: '3px solid #3b82f6' }}>
                      <span style={{ color: 'var(--foreground)' }}>💸 {b.name} (${b.amount})</span>
                    </div>
                  ))}
                  {todaySubs.map(s => (
                    <div key={s.id} style={{ fontSize: '0.8125rem', padding: '0.35rem 0.5rem', background: 'rgba(139, 92, 246, 0.05)', borderRadius: '4px', borderLeft: '3px solid #8b5cf6' }}>
                      <span style={{ color: 'var(--foreground)' }}>🔁 {s.name} (${s.amount})</span>
                    </div>
                  ))}
                </div>
              ) : (
                <span style={{ fontSize: '0.8125rem', color: 'var(--muted-foreground)', fontStyle: 'italic' }}>No bills or subscriptions due today.</span>
              )}
            </div>

          </div>
        </div>
      </div>

      {/* Edit Mode Instruction & Grid Guide Banner */}
      {isEditMode && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0.75rem 1.25rem',
          background: 'color-mix(in srgb, var(--primary) 10%, transparent)',
          border: '1px solid var(--primary)',
          borderRadius: 'var(--radius)',
          fontSize: '0.8125rem',
          color: 'var(--foreground)',
          gap: '1rem',
          flexWrap: 'wrap',
          animation: 'fadeIn 0.2s ease'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <LayoutGrid size={16} style={{ color: 'var(--primary)', flexShrink: 0 }} />
            <span>
              <strong>12-Column Grid Layout Mode Active:</strong> Drag card headers to reorder. Grab and drag any card's left/right edges or bottom-right corner to stretch or shrink width across the grid.
            </span>
          </div>
          <button 
            type="button" 
            onClick={() => setIsEditMode(false)}
            className="btn btn-primary"
            style={{ fontSize: '0.75rem', padding: '0.25rem 0.75rem', height: '28px' }}
          >
            Done
          </button>
        </div>
      )}

      {/* Overview Cards 12-Column Grid */}
      <div 
        ref={gridRef}
        className={`overview-grid ${isEditMode ? 'overview-grid-editing' : ''}`}
        style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(12, 1fr)', 
          gap: '1.5rem', 
          marginTop: '0.5rem',
          position: 'relative'
        }}
      >
        {dashboardCards.map((cardType, idx) => {
          if (cardType === 'events') return renderEventsCard(idx);
          if (cardType === 'tasks') return renderTasksCard(idx);
          if (cardType === 'finances') return renderFinancesCard(idx);
          if (cardType === 'meals') return renderMealsCard(idx);
          if (cardType === 'weather') return renderWeatherCard(idx);
          if (cardType === 'daily_agenda') return renderDailyAgendaCard(idx);
          if (cardType === 'weekly_agenda') return renderWeeklyAgendaCard(idx);
          if (cardType === 'monthly_agenda') return renderMonthlyAgendaCard(idx);
          if (cardType === 'monthly_calendar') return renderMonthlyCalendarCard(idx);
          return null;
        })}
      </div>

      {/* Available / Hidden Cards Manager Tray */}
      {isEditMode && ALL_AVAILABLE_OVERVIEW_CARDS.filter(c => !dashboardCards.includes(c)).length > 0 && (
        <div style={{ 
          background: 'rgba(255, 255, 255, 0.02)', 
          border: '1px dashed var(--border)', 
          borderRadius: '12px', 
          padding: '1.25rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem',
          marginTop: '1rem',
          animation: 'fadeIn 0.2s ease'
        }}>
          <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: '700', color: 'var(--foreground)' }}>Add Cards to Overview</h4>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            {ALL_AVAILABLE_OVERVIEW_CARDS.filter(c => !dashboardCards.includes(c)).map(cardType => (
              <button
                key={cardType}
                onClick={() => handleShowCard(cardType)}
                className="btn btn-outline"
                style={{ fontSize: '0.75rem', padding: '0.4rem 0.75rem', display: 'flex', alignItems: 'center', gap: '0.25rem', cursor: 'pointer' }}
              >
                ➕ Add {getCardLabel(cardType)}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
