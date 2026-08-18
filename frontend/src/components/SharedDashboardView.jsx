import React, { useState, useEffect } from 'react';
import { 
  AlertTriangle, ChefHat, BookOpen, CheckSquare, Calendar, 
  DollarSign, Clock, AlignLeft, Info, RefreshCw, LayoutGrid, Sun, Moon
} from 'lucide-react';

export default function SharedDashboardView({ token, onClose }) {
  const [widgets, setWidgets] = useState([]);
  const [dashboardInfo, setDashboardInfo] = useState(null);
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
          setWidgets(data.widgets || []);
          setDashboardInfo({
            appName: data.appName || 'Dashboard App',
            brandingIcon: data.brandingIcon || '📊',
            brandingLogo: data.brandingLogo || ''
          });
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
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: '800', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {dashboardInfo?.brandingIcon !== 'none' && dashboardInfo?.brandingIcon} {dashboardInfo?.appName}
          </h1>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
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
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', color: 'var(--danger)', textAlign: 'center', gap: '0.35rem', padding: '0.5rem' }}>
        <AlertTriangle size={16} />
        <span style={{ fontSize: '0.75rem', fontWeight: 'bold' }}>Widget Offline</span>
        <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', display: 'block', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {error.includes('not configured') ? 'Integration not configured' : error}
        </span>
      </div>
    );
  }

  // Render using standard presentations
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
