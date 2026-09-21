import React, { useState, useEffect } from 'react';
import { 
  AlertTriangle, ChefHat, BookOpen, CheckSquare, Calendar, 
  DollarSign, Clock, AlignLeft, Info, RefreshCw, LayoutGrid, Sun, Moon,
  Play, Pause, Layers, RotateCcw, ChevronLeft, ChevronRight
} from 'lucide-react';

export default function SharedDashboardView({ token, onClose }) {
  const [widgets, setWidgets] = useState([]);
  const [dashboardInfo, setDashboardInfo] = useState(null);
  const [targetType, setTargetType] = useState('single');
  const [dashboards, setDashboards] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [rotationInterval, setRotationInterval] = useState(30);
  const [secondsRemaining, setSecondsRemaining] = useState(30);
  const [isPaused, setIsPaused] = useState(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [bgType, setBgType] = useState('theme');
  const [bgValue, setBgValue] = useState('');
  const [bgKeywords, setBgKeywords] = useState('');
  const [refreshInterval, setRefreshInterval] = useState('disabled');
  const [currentSig, setCurrentSig] = useState(Date.now().toString());
  const [unsplashUrl, setUnsplashUrl] = useState('');
  const [unsplashAttribution, setUnsplashAttribution] = useState(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    const loadSharedDashboard = async () => {
      try {
        const res = await fetch(`/api/dashboard/shared/${token}`);
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || `Server status ${res.status}`);
        }
        const data = await res.json();
        if (active) {
          setTargetType(data.target_type || 'single');
          setDashboardInfo({
            appName: data.appName || 'Dashboard App',
            brandingIcon: data.brandingIcon || '📊',
            brandingLogo: data.brandingLogo || '',
            dashboardName: data.dashboard_name || 'Dashboard',
            timezone: data.timezone || 'America/New_York'
          });

          if (data.target_type === 'rotation' && data.dashboards && data.dashboards.length > 0) {
            setDashboards(data.dashboards);
            const interval = Number(data.rotation_interval) || 30;
            setRotationInterval(interval);
            setSecondsRemaining(interval);
            const currentDash = data.dashboards[currentIndex] || data.dashboards[0];
            setWidgets(currentDash?.widgets || []);
          } else {
            setWidgets(data.widgets || []);
          }

          setLoading(false);
          
          // Apply settings and theme from public settings
          const colorRes = await fetch('/api/settings/public');
          if (colorRes.ok) {
            const settings = await colorRes.json();
            if (settings.primary_color) {
              document.documentElement.style.setProperty('--primary', settings.primary_color);
            }
            setBgType(settings.dashboard_bg_type || 'theme');
            setBgValue(settings.dashboard_bg_value || '');
            setBgKeywords(settings.dashboard_bg_unsplash_keywords || '');
            setRefreshInterval(settings.dashboard_refresh_interval || 'disabled');
            if (settings.dashboard_bg_type === 'unsplash' && settings.dashboard_bg_value) {
              setCurrentSig(settings.dashboard_bg_value);
            }
          }
        }
      } catch (err) {
        if (active) {
          setError(err.message);
          setLoading(false);
        }
      }
    };

    loadSharedDashboard();

    return () => { active = false; };
  }, [token, refreshTrigger]);

  // Handle active widgets update when currentIndex changes in rotation mode
  useEffect(() => {
    if (targetType === 'rotation' && dashboards.length > 0) {
      const activeDash = dashboards[currentIndex] || dashboards[0];
      setWidgets(activeDash?.widgets || []);
    }
  }, [currentIndex, dashboards, targetType]);

  // Handle countdown and rotation
  useEffect(() => {
    if (targetType !== 'rotation' || dashboards.length <= 1 || isPaused) return;

    const timer = setInterval(() => {
      setSecondsRemaining(prev => {
        if (prev <= 1) {
          setCurrentIndex(idx => (idx + 1) % dashboards.length);
          return rotationInterval;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [targetType, dashboards, rotationInterval, isPaused]);

  // Handle Unsplash background rotation when manually refreshed
  useEffect(() => {
    if (bgType === 'unsplash') {
      setCurrentSig(Date.now().toString());
    }
  }, [refreshTrigger]);

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

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: '1rem', background: 'var(--bg-app)' }}>
        <div className="spinner"></div>
        <p style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>Loading shared dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: '1rem', background: 'var(--bg-app)', textAlign: 'center', padding: '2rem', fontFamily: 'var(--font-body)' }}>
        <AlertTriangle size={48} style={{ color: 'var(--danger)' }} />
        <h2 style={{ fontSize: '1.5rem', fontWeight: '800' }}>Shared Dashboard Unavailable</h2>
        <p style={{ color: 'var(--text-muted)', maxWidth: '420px' }}>
          This shared dashboard link might have been revoked, expired, or is invalid. Please contact the administrator.
        </p>
      </div>
    );
  }

  const resolvedTheme = (bgType === 'dark' || bgType === 'unsplash' || bgType === 'upload') ? 'dark' : 'light';
  const currentDashName = targetType === 'rotation' 
    ? (dashboards[currentIndex]?.name || `Dashboard ${currentIndex + 1}`)
    : (dashboardInfo?.dashboardName || 'Main Dashboard');

  const getContainerStyle = () => {
    const base = { fontFamily: 'var(--font-body)', minHeight: '100vh', padding: '2.5rem' };
    if (bgType === 'light') {
      return { ...base, backgroundColor: '#f8fafc', color: '#1e293b' };
    }
    if (bgType === 'dark') {
      return { ...base, backgroundColor: '#0f172a', color: '#f8fafc' };
    }
    if (bgType === 'unsplash') {
      const url = unsplashUrl || `https://images.unsplash.com/featured/1920x1080?sig=${currentSig}${bgKeywords ? `&${encodeURIComponent(bgKeywords)}` : ''}`;
      return {
        ...base,
        backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.45), rgba(0, 0, 0, 0.45)), url(${url})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        backgroundAttachment: 'fixed',
        color: '#ffffff'
      };
    }
    if (bgType === 'upload' && bgValue) {
      return {
        ...base,
        backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.45), rgba(0, 0, 0, 0.45)), url(${bgValue})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        backgroundAttachment: 'fixed',
        color: '#ffffff'
      };
    }
    return base; // theme default
  };

  return (
    <div className="shared-dashboard-container animate-fade-in" style={getContainerStyle()}>
      {/* Header bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <h1 style={{ fontSize: '1.75rem', fontWeight: '800', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {dashboardInfo?.brandingIcon !== 'none' && dashboardInfo?.brandingIcon} {dashboardInfo?.appName}
          </h1>

          {/* Active Dashboard Indicator Badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(255, 255, 255, 0.1)', padding: '0.3rem 0.75rem', borderRadius: '20px', border: '1px solid rgba(255, 255, 255, 0.2)' }}>
            <Layers size={14} style={{ color: 'var(--primary)' }} />
            <span style={{ fontSize: '0.85rem', fontWeight: '700' }}>{currentDashName}</span>
            {targetType === 'rotation' && dashboards.length > 1 && (
              <span style={{ fontSize: '0.75rem', opacity: 0.8, marginLeft: '0.25rem' }}>
                ({currentIndex + 1}/{dashboards.length})
              </span>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          {/* Rotation Controls when target_type is rotation */}
          {targetType === 'rotation' && dashboards.length > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', background: 'rgba(0, 0, 0, 0.2)', padding: '0.2rem 0.5rem', borderRadius: 'var(--radius)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => {
                  setCurrentIndex(idx => (idx - 1 + dashboards.length) % dashboards.length);
                  setSecondsRemaining(rotationInterval);
                }}
                style={{ padding: '0.25rem 0.4rem', fontSize: '0.75rem' }}
                title="Previous dashboard"
              >
                <ChevronLeft size={14} />
              </button>

              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setIsPaused(!isPaused)}
                style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                title={isPaused ? "Resume rotation" : "Pause rotation"}
              >
                {isPaused ? <Play size={12} /> : <Pause size={12} />}
                <span>{isPaused ? 'Paused' : `${secondsRemaining}s`}</span>
              </button>

              <button
                type="button"
                className="btn btn-outline"
                onClick={() => {
                  setCurrentIndex(idx => (idx + 1) % dashboards.length);
                  setSecondsRemaining(rotationInterval);
                }}
                style={{ padding: '0.25rem 0.4rem', fontSize: '0.75rem' }}
                title="Next dashboard"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          )}

          <button 
            className="btn btn-outline" 
            onClick={() => setRefreshTrigger(p => p + 1)}
            style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.85rem' }}
          >
            <RefreshCw size={14} /> Refresh Data
          </button>
          {onClose && (
            <button 
              className="btn btn-outline" 
              onClick={onClose}
              style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.85rem' }}
            >
              Back to App
            </button>
          )}
        </div>
      </div>

      {/* Grid Canvas */}
      {widgets.length === 0 ? (
        <div className="card" style={{ padding: '4rem 2rem', textAlign: 'center' }}>
          <p style={{ color: 'var(--text-muted)' }}>The administrator has not added any widgets to this dashboard yet.</p>
        </div>
      ) : (
        <div className="dashboard-grid">
          {widgets.map(widget => (
            <div 
              key={widget.id}
              className={`widget-card theme-${resolvedTheme}`}
              style={{
                gridColumn: `${widget.x + 1} / span ${widget.w}`,
                gridRow: `${widget.y + 1} / span ${widget.h}`
              }}
            >
              {/* Header */}
              <div className="widget-header">
                <span className="widget-title">
                  {getWidgetIcon(widget.type)}
                  {widget.config.title || getDefaultWidgetName(widget.type)}
                </span>
              </div>

              {/* Shared Content Loader */}
              <div className="widget-body">
                 <SharedWidgetContentLoader widget={widget} token={token} refreshTrigger={refreshTrigger} timezone={dashboardInfo?.timezone} />
              </div>
            </div>
          ))}
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
    case 'weather_combo': return <SharedSunIcon />;
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

/* PUBLIC SHARED DATA CONTROLLER */
function SharedWidgetContentLoader({ widget, token, refreshTrigger, timezone }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    const loadSharedData = async () => {
      try {
        const res = await fetch(`/api/dashboard/shared-widget-data/${token}/${widget.id}`);
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

    loadSharedData();

    return () => { active = false; };
  }, [widget.id, token, refreshTrigger]);

  if (loading) {
    return (
      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
          <div className="spinner" style={{ width: '16px', height: '16px', borderWidth: '2px' }}></div>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Loading...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', color: 'var(--danger)', textAlign: 'center', gap: '0.4rem', padding: '0.5rem' }}>
        <AlertTriangle size={18} />
        <span style={{ fontSize: '0.75rem', fontWeight: 'bold' }}>Widget Unavailable</span>
      </div>
    );
  }

  // Render using standard presentations
  switch (widget.type) {
    case 'clock':
      return <ClockWidgetView />;
    case 'text':
      return <TextWidgetView text={widget.config.text || ''} />;
    case 'calendar_daily':
      return <CalendarDailyAgendaView data={data} />;
    case 'calendar_weekly':
      return <CalendarWeeklyAgendaView data={data} />;
    case 'calendar_monthly':
      return <CalendarMonthlyAgendaView data={data} />;
    case 'calendar_month_grid':
      return <CalendarMonthGridView data={data} />;
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
      return <HomeSubscriptionsView subscriptions={data} timezone={timezone} />;
    case 'home_bills':
    case 'home_recurring_bills':
      return <HomeBillsView bills={data} timezone={timezone} />;
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
      return <p style={{ fontSize: '0.7rem' }}>Unsupported widget: {widget.type}</p>;
  }
}

/* PRESENTATION VIEWS (DUMB COMPONENTS RE-IMPLEMENTED FOR DUAL USE) */

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
      <span style={{ fontSize: '1.6rem', fontWeight: '800', fontFamily: 'monospace', color: 'var(--primary)', letterSpacing: '0.5px' }}>{timeStr}</span>
      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem', fontWeight: '500' }}>{dateStr}</span>
    </div>
  );
}

function TextWidgetView({ text }) {
  return (
    <div style={{ whiteSpace: 'pre-wrap', color: 'var(--text-main)', fontSize: '0.8rem', lineHeight: '1.5', height: '100%' }}>
      {text || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>No notes content.</span>}
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
  const grouped = {};
  daysOfWeek.forEach(d => { grouped[d] = []; });
  menu.forEach(item => {
    if (grouped[item.day_of_week]) grouped[item.day_of_week].push(item);
  });
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.75rem', height: '100%', overflowY: 'auto' }}>
      {daysOfWeek.map(day => {
        const plans = grouped[day];
        return (
          <div key={day} style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', padding: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.35rem', background: 'var(--bg-app-dark, rgba(0,0,0,0.01))' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--primary)', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.15rem' }}>{day}</span>
            {plans && plans.length > 0 ? (
              plans.map((p, idx) => (
                <div key={idx} style={{ display: 'flex', flexDirection: 'column', fontSize: '0.7rem', borderBottom: idx < plans.length - 1 ? '1px dashed var(--border-color)' : 'none', paddingBottom: '0.15rem' }}>
                  <span style={{ textTransform: 'capitalize', color: 'var(--text-muted)', fontSize: '0.65rem', fontWeight: '600' }}>{p.meal_type}</span>
                  <span style={{ fontWeight: '500', color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.recipe_title || p.leftover_name || p.custom_meal}</span>
                </div>
              ))
            ) : (
              <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontStyle: 'italic', marginTop: '0.25rem' }}>No plans</span>
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
              style={{ width: '32px', height: '32px', objectFit: 'cover', borderRadius: '4px' }} 
            />
          ) : (
            <div style={{ width: '32px', height: '32px', borderRadius: '4px', background: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem' }}>🍳</div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{recipe.title}</span>
            <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Servings: {recipe.servings || 'N/A'} | Cook: {recipe.cook_time ? `${recipe.cook_time}m` : 'N/A'}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function CookbookShoppingView({ lists }) {
  if (!lists || lists.length === 0) {
    return <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.75rem', textAlign: 'center', marginTop: '1.5rem' }}>No shopping lists.</p>;
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
    return <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.75rem', textAlign: 'center', marginTop: '1.5rem' }}>No books in library.</p>;
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      {books.slice(0, 4).map(book => (
        <div key={book.id} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', padding: '0.25rem 0', borderBottom: '1px solid var(--border-color)' }}>
          {book.cover_url ? (
            <img 
              src={book.cover_url} 
              alt={book.title} 
              style={{ width: '30px', height: '40px', objectFit: 'cover', borderRadius: '2px', boxShadow: '0 1px 2px rgba(0,0,0,0.1)' }} 
            />
          ) : (
            <div style={{ width: '30px', height: '40px', borderRadius: '2px', background: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem' }}>📚</div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{book.title}</span>
            <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>By: {book.author || 'Unknown'}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function LibrarySummaryView({ summary }) {
  if (!summary || summary.length === 0) {
    return <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.75rem', textAlign: 'center', marginTop: '1.5rem' }}>No reading logs summary.</p>;
  }
  const activeBooks = summary.filter(b => b.latest_progress > 0 && b.latest_progress < 100 && !b.is_dnf).slice(0, 3);
  if (activeBooks.length === 0) {
    return <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.75rem', textAlign: 'center', marginTop: '1.5rem' }}>No active progress logged.</p>;
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
            <input type="checkbox" checked={false} readOnly style={{ cursor: 'not-allowed' }} />
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
    return <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.75rem', textAlign: 'center', marginTop: '1.5rem' }}>No upcoming events.</p>;
  }
  const upcoming = events.filter(e => new Date(e.end_time) >= new Date()).slice(0, 4);
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
              <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>📍 {event.location || 'No Location'}</span>
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

function HomeSubscriptionsView({ subscriptions, timezone }) {
  const todayStr = getTodayStrInTimezone(timezone);
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
          const billingDate = formatDateInTimezone(sub.next_billing_date, timezone);
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

function HomeBillsView({ bills, timezone }) {
  const todayStr = getTodayStrInTimezone(timezone);
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
          const billingDate = formatDateInTimezone(bill.next_billing_date, timezone);
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

// Map Sun & Moon to avoid compiler complaints since they might not be imported in SharedDashboardView
const SharedMoonIcon = () => <span>🌙</span>;
const SharedSunIcon = () => <span>☀️</span>;

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
   CALENDAR WIDGET VIEWS (SHARED)
   ======================================================== */

function processCalendarData(data, targetYear, targetMonth) {
  if (!data) return { itemsByDate: {}, allItems: [], todayStr: '', colors: {} };
  
  const today = new Date();
  const year = targetYear !== undefined ? targetYear : today.getFullYear();
  const month = targetMonth !== undefined ? targetMonth : today.getMonth();
  const todayStr = data.todayStr || today.toISOString().split('T')[0];

  const colors = {
    event: data.colors?.event || '#3b82f6',
    holiday: data.colors?.holiday || '#f97316',
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

  // 1. Events & Holidays
  (data.events || []).forEach(e => {
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
        description: e.description || '',
        color: isHoliday ? colors.holiday : colors.event,
        icon: isHoliday ? '🎉' : '📅'
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
function CalendarDailyAgendaView({ data }) {
  const today = new Date();
  const [selectedDate, setSelectedDate] = useState(today);

  const year = selectedDate.getFullYear();
  const month = selectedDate.getMonth();
  const { itemsByDate, todayStr } = processCalendarData(data, year, month);

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
    </div>
  );
}

// 2. WEEKLY AGENDA VIEW
function CalendarWeeklyAgendaView({ data }) {
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
function CalendarMonthlyAgendaView({ data }) {
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
function CalendarMonthGridView({ data }) {
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
