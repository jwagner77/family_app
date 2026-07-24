import React, { useState, useEffect } from 'react';
import { 
  Sliders, 
  Settings,
  LayoutDashboard,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Menu,
  ChevronDown,
  Users,
  Shield,
  Lock,
  Palette,
  Calendar,
  FileCheck,
  Bell,
  Key,
  CheckCircle,
  AlertCircle,
  Sun,
  Moon,
  Lightbulb,
  Bug,
  CreditCard,
  Receipt,
  Gamepad2
} from 'lucide-react';

// Global fetch interceptor for auth token injection
const originalFetch = window.fetch;
window.fetch = async (url, options = {}) => {
  const token = localStorage.getItem('token');
  if (token) {
    if (!options.headers) {
      options.headers = {};
    }
    if (options.headers instanceof Headers) {
      options.headers.set('Authorization', `Bearer ${token}`);
    } else {
      options.headers['Authorization'] = `Bearer ${token}`;
    }
  }
  const response = await originalFetch(url, options);
  if (response.status === 401 && !url.includes('/api/auth/login') && !url.includes('/api/auth/me')) {
    try {
      const clone = response.clone();
      const body = await clone.json();
      if (body && body.needs_auth) {
        return response;
      }
    } catch (e) {}
    localStorage.removeItem('token');
    window.location.reload();
  }
  return response;
};

// Components
import SettingsView from './components/SettingsView';
import HomeView from './components/HomeView';
import FeatureRequestsView from './components/FeatureRequestsView';
import BugReportsView from './components/BugReportsView';
import TasksView from './components/TasksView';
import CalendarView from './components/CalendarView';
import SubscriptionsView from './components/SubscriptionsView';
import BillsView from './components/BillsView';
import GamesView from './components/GamesView';

// Contrast checking function using relative luminance
function getContrastColor(hexColor) {
  if (!hexColor) return '#ffffff';
  let hex = hexColor.replace('#', '');
  if (hex.length === 3) {
    hex = hex.split('').map(char => char + char).join('');
  }
  if (hex.length !== 6) return '#ffffff';
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  if (isNaN(r) || isNaN(g) || isNaN(b)) return '#ffffff';

  const normalize = (val) => {
    const s = val / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };

  const R = normalize(r);
  const G = normalize(g);
  const B = normalize(b);

  const luminance = 0.2126 * R + 0.7152 * G + 0.0722 * B;
  return luminance > 0.179 ? '#09090b' : '#ffffff';
}

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [user, setUser] = useState(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(
    localStorage.getItem('sidebar_collapsed') === 'true'
  );

  const [activeTab, setActiveTab] = useState('home');
  const isIframe = window.self !== window.top;
  const APP_NAV_LINKS = [
  {
    "id": "home",
    "label": "Dashboard",
    "icon": "LayoutDashboard"
  },
  {
    "id": "todo",
    "label": "To-Do List",
    "icon": "CheckSquare"
  },
  {
    "id": "calendar",
    "label": "Calendar",
    "icon": "Calendar"
  },
  {
    "id": "subscriptions",
    "label": "Subscriptions",
    "icon": "RefreshCw"
  },
  {
    "id": "bills",
    "label": "Bills",
    "icon": "DollarSign"
  }
];

  useEffect(() => {
    if (isIframe) {
      window.parent.postMessage({
        type: 'REGISTER_NAV_LINKS',
        links: APP_NAV_LINKS,
        activeTab: activeTab
      }, '*');
    }
  }, [activeTab]);

  useEffect(() => {
    const handleSetTab = (e) => {
      if (e.data && e.data.type === 'SET_TAB') {
        setActiveTab(e.data.tab);
      }
    };
    window.addEventListener('message', handleSetTab);
    return () => window.removeEventListener('message', handleSetTab);
  }, []);

  useEffect(() => {
    if (isIframe) {
      const styleId = 'one-app-iframe-styles';
      let style = document.getElementById(styleId);
      if (!style) {
        style = document.createElement('style');
        style.id = styleId;
        style.innerHTML = `
          .sidebar, .sidebar-container, aside, .sidebar-collapsed, [class*="sidebar"] { display: none !important; }
          .main-content, .main-container, .content-area, .app-content, .layout-main, [class*="main-content"], [class*="layout-main"] { margin-left: 0 !important; padding-left: 0 !important; width: 100% !important; max-width: 100% !important; }
          .header, .top-bar, .navbar, .header-container { display: none !important; }
        `;
        document.head.appendChild(style);
      }
      return () => {
        const el = document.getElementById(styleId);
        if (el) el.remove();
      };
    }
  }, []);



  const [settingsSubTab, setSettingsSubTab] = useState('general');
  const [lastTab, setLastTab] = useState('home');

  useEffect(() => {
    if (activeTab !== 'settings') {
      setLastTab(activeTab);
    }
  }, [activeTab]);

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [toast, setToast] = useState(null);
  
  // Settings / Branding states
  const [appName, setAppName] = useState('Base App');
  const [primaryColor, setPrimaryColor] = useState(localStorage.getItem('last_primary_color') || '#2c3e50');
  const [theme, setTheme] = useState(localStorage.getItem('last_theme') || 'system');
  const [brandingIcon, setBrandingIcon] = useState('⚙️');
  const [brandingLogo, setBrandingLogo] = useState('');
  const [brandingLogoLight, setBrandingLogoLight] = useState('');
  const [brandingLogoDark, setBrandingLogoDark] = useState('');
  const [brandingFavicon, setBrandingFavicon] = useState('');

  const isSystemDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  const resolvedTheme = theme === 'system' ? (isSystemDark ? 'dark' : 'light') : theme;
  const currentLogo = resolvedTheme === 'dark' 
    ? (brandingLogoDark || brandingLogoLight || brandingLogo) 
    : (brandingLogoLight || brandingLogoDark || brandingLogo);
  const isTextWhite = getContrastColor(primaryColor) === '#ffffff';
  const currentNavBarLogo = isTextWhite
    ? (brandingLogoLight || brandingLogo)
    : (brandingLogoDark || brandingLogo);

  // Demo Modal state
  const [isDemoModalOpen, setIsDemoModalOpen] = useState(false);
  const [isModalRendered, setIsModalRendered] = useState(false);
  const [isModalClosing, setIsModalClosing] = useState(false);

  useEffect(() => {
    if (isDemoModalOpen) {
      setIsModalRendered(true);
      setIsModalClosing(false);
    } else if (isModalRendered) {
      setIsModalClosing(true);
      const timer = setTimeout(() => {
        setIsModalRendered(false);
        setIsModalClosing(false);
      }, 250); // Match CSS animation duration

  

  return () => clearTimeout(timer);
    }
  }, [isDemoModalOpen]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlToken = params.get('token');
    if (urlToken) {
      localStorage.setItem('token', urlToken);
      setToken(urlToken);
    }
    
    const syncStatus = params.get('calendar_sync');
    if (syncStatus === 'success') {
      showToast('Events synced successfully to your Microsoft Calendar!', 'success');
    } else if (syncStatus === 'error') {
      const details = params.get('details') || '';
      showToast(`Failed to sync to Microsoft Calendar: ${details}`, 'error');
    }

    const calendarsListStatus = params.get('calendars_list');
    if (calendarsListStatus === 'success') {
      const dataStr = params.get('calendars_data');
      if (dataStr) {
        sessionStorage.setItem('temp_calendars_list', dataStr);
        setActiveTab('settings');
        sessionStorage.setItem('temp_settings_subtab', 'calendar');
        showToast('Successfully loaded available calendars from Microsoft!', 'success');
      }
    } else if (calendarsListStatus === 'error') {
      const details = params.get('details') || '';
      showToast(`Failed to load calendars: ${details}`, 'error');
    }
    
    if (urlToken || syncStatus || calendarsListStatus) {
      const url = new URL(window.location.href);
      url.searchParams.delete('token');
      url.searchParams.delete('calendar_sync');
      url.searchParams.delete('details');
      url.searchParams.delete('calendars_list');
      url.searchParams.delete('calendars_data');
      window.history.replaceState({}, document.title, url.pathname + url.search);
    }
  }, []);

  useEffect(() => {
    applyPrimaryColor(primaryColor);
    applyTheme(theme);
    fetchSettings();
  }, []);

  useEffect(() => {
    const favicon = document.querySelector('link[rel="icon"]');
    if (favicon) {
      if (brandingFavicon) {
        favicon.href = brandingFavicon;
        favicon.type = 'image/png';
      } else if (brandingIcon && brandingIcon !== 'none') {
        favicon.href = `data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>${brandingIcon}</text></svg>`;
        favicon.type = 'image/svg+xml';
      } else {
        favicon.href = 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>⚙️</text></svg>';
        favicon.type = 'image/svg+xml';
      }
    }
  }, [brandingFavicon, brandingIcon]);

  useEffect(() => {
    document.title = appName;
  }, [appName]);

  const goBack = () => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      setActiveTab('home');
    }
  };

  // Synchronize hash with active tab state
  useEffect(() => {
    if (!token || !user) {
      if (window.location.hash) {
        window.location.hash = '';
      }
      return;
    }
    const targetHash = activeTab === 'settings' ? `#/settings/${settingsSubTab}` : `#/${activeTab}`;
    if (window.location.hash !== targetHash) {
      window.location.hash = targetHash;
    }
  }, [activeTab, settingsSubTab, token, user]);

  // Listen for browser back/forward navigation
  useEffect(() => {
    const handleHashChange = () => {
      if (!token || !user) return;
      const hash = window.location.hash || '#/home';
      const parts = hash.replace(/^#\/?/, '').split('/');
      const tab = parts[0] || 'home';
      const subTab = parts[1] || 'general';
      
      const validTabs = ['home', 'settings', 'features', 'bugs', 'todo', 'calendar', 'subscriptions', 'bills', 'games'];
      if (validTabs.includes(tab)) {
        setActiveTab(tab);
        if (tab === 'settings') {
          setSettingsSubTab(subTab);
        }
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    if (token && user) {
      handleHashChange();
    }

    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [token, user]);

  const toggleSidebar = () => {
    const nextState = !isSidebarCollapsed;
    setIsSidebarCollapsed(nextState);
    localStorage.setItem('sidebar_collapsed', String(nextState));
  };

  const handleLoginSuccess = (newToken, loggedUser) => {
    localStorage.setItem('token', newToken);
    if (loggedUser.primary_color) {
      applyPrimaryColor(loggedUser.primary_color);
      localStorage.setItem('last_primary_color', loggedUser.primary_color);
    }
    if (loggedUser.theme) {
      setTheme(loggedUser.theme);
      applyTheme(loggedUser.theme);
      localStorage.setItem('last_theme', loggedUser.theme);
    }
    setToken(newToken);
    setUser(loggedUser);
    setActiveTab('home');
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setToken('');
    setUser(null);
  };

  const applyPrimaryColor = (color) => {
    if (color) {
      document.documentElement.style.setProperty('--primary', color);
      try {
        const contrastColor = getContrastColor(color);
        document.documentElement.style.setProperty('--primary-foreground', contrastColor);
      } catch (err) {
        console.error('Error setting primary foreground contrast:', err);
      }
    }
  };

  const applyTheme = (themeValue) => {
    const root = document.documentElement;
    root.classList.remove('theme-light', 'theme-dark');
    if (themeValue === 'light') {
      root.classList.add('theme-light');
    } else if (themeValue === 'dark') {
      root.classList.add('theme-dark');
    }
  };

  const toggleTheme = async () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    applyTheme(nextTheme);
    localStorage.setItem('last_theme', nextTheme);

    if (token && user) {
      try {
        const res = await fetch('/api/users/profile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            primary_color: user.primary_color || primaryColor, 
            theme: nextTheme, 
            display_name: user.display_name || user.username, 
            timezone: user.timezone || 'US/New_York' 
          })
        });
        if (res.ok) {
          setUser(prev => {
            if (!prev) return null;
            return { ...prev, theme: nextTheme };
          });
        }
      } catch (err) {
        console.error('Failed to update theme in profile:', err);
      }
    }
  };

  const handleSettingsChange = ({ appName, primaryColor, theme, brandingIcon, brandingLogo, brandingLogoLight, brandingLogoDark, brandingFavicon, displayName, calendarGuid, timezone }) => {
    if (appName !== undefined) setAppName(appName);
    if (brandingIcon !== undefined) setBrandingIcon(brandingIcon);
    if (brandingLogo !== undefined) setBrandingLogo(brandingLogo);
    if (brandingLogoLight !== undefined) setBrandingLogoLight(brandingLogoLight);
    if (brandingLogoDark !== undefined) setBrandingLogoDark(brandingLogoDark);
    if (brandingFavicon !== undefined) setBrandingFavicon(brandingFavicon);
    if (primaryColor !== undefined) {
      setPrimaryColor(primaryColor);
      applyPrimaryColor(primaryColor);
      localStorage.setItem('last_primary_color', primaryColor);
    }
    if (theme !== undefined) {
      setTheme(theme);
      applyTheme(theme);
      localStorage.setItem('last_theme', theme);
    }
    setUser(prev => {
      if (!prev) return null;
      const updated = { ...prev };
      if (primaryColor !== undefined) updated.primary_color = primaryColor;
      if (theme !== undefined) updated.theme = theme;
      if (displayName !== undefined) updated.display_name = displayName;
      if (calendarGuid !== undefined) updated.calendar_guid = calendarGuid;
      if (timezone !== undefined) updated.timezone = timezone;
      return updated;
    });
  };

  const showToast = (text, type = 'success') => {
    setToast({ text, type });
  };

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/settings/public');
      if (res.ok) {
        const data = await res.json();
        if (data.app_name) setAppName(data.app_name);
        setBrandingIcon(data.branding_icon !== undefined ? data.branding_icon : '⚙️');
        setBrandingLogo(data.branding_logo || '');
        setBrandingLogoLight(data.branding_logo_light || '');
        setBrandingLogoDark(data.branding_logo_dark || '');
        setBrandingFavicon(data.branding_favicon || '');
      }
    } catch (err) {
      console.error('Failed to load settings:', err);
    }
  };

  // Verify token and fetch profile details
  useEffect(() => {
    if (token) {
      fetch('/api/auth/me')
        .then(res => {
          if (!res.ok) throw new Error('Session invalid');
          return res.json();
        })
        .then(data => {
          setUser(data.user);
          if (data.user?.primary_color) {
            applyPrimaryColor(data.user.primary_color);
            localStorage.setItem('last_primary_color', data.user.primary_color);
          }
          if (data.user?.theme) {
            setTheme(data.user.theme);
            applyTheme(data.user.theme);
            localStorage.setItem('last_theme', data.user.theme);
          }
        })
        .catch(err => {
          console.error('Session verify failed:', err);
          localStorage.removeItem('token');
          setToken('');
          setUser(null);
        });
    } else {
      setUser(null);
    }
  }, [token]);

  useEffect(() => {
    if (token && user) {
      fetchSettings();
    }
  }, [token, user]);

  if (!token || !user) {
    return <LoginView onLoginSuccess={handleLoginSuccess} />;
  }

  const canReadGeneral = user?.permissions?.settings_general !== 'none';
  const canReadUsers = (user?.permissions?.settings_users !== 'none') || (user?.permissions?.users !== 'none');
  const canReadRoles = (user?.permissions?.settings_roles !== 'none') || (user?.permissions?.roles !== 'none');
  const canReadSSO = (user?.permissions?.settings_sso !== 'none') || (user?.permissions?.roles === 'full');
  const canReadBranding = (user?.permissions?.settings_branding !== 'none') || (user?.permissions?.roles === 'full');
  const canReadCalendar = (user?.permissions?.settings_calendar !== 'none');

  return (
    <div className="app-container">
      {/* Mobile Header Bar */}
      <header className="mobile-header">
        <button className="mobile-menu-btn" onClick={() => setIsMobileMenuOpen(true)} title="Open Menu">
          <Menu size={20} />
        </button>
        <span className="mobile-header-title">
          {currentNavBarLogo ? (
            <img src={currentNavBarLogo} alt={appName} style={{ maxHeight: '24px', maxWidth: '140px', objectFit: 'contain', display: 'block' }} />
          ) : (
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--primary-foreground)' }}>
              {brandingIcon !== 'none' && brandingIcon} {appName}
            </span>
          )}
        </span>
      </header>

      {/* Backdrop overlay for mobile menu */}
      {isMobileMenuOpen && (
        <div className="mobile-backdrop" onClick={() => setIsMobileMenuOpen(false)} />
      )}

      {/* Sidebar Navigation */}
      <aside className={`sidebar ${isSidebarCollapsed ? 'collapsed' : ''} ${isMobileMenuOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-brand" style={{ position: 'relative', width: '100%', paddingBottom: '0.5rem' }}>
          {!isSidebarCollapsed && (
            <div className="sidebar-logo-text" style={{ width: '100%', paddingRight: '2rem', boxSizing: 'border-box' }}>
              {currentNavBarLogo ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <img src={currentNavBarLogo} alt={appName} style={{ maxHeight: '28px', maxWidth: '120px', objectFit: 'contain', display: 'block' }} />
                  <span style={{ fontSize: '0.875rem', fontWeight: '600', color: 'var(--primary-foreground)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block', maxWidth: '100px' }}>{appName}</span>
                </div>
              ) : (
                <h1 style={{ fontSize: '1rem', fontWeight: '700', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--primary-foreground)' }}>
                  {brandingIcon !== 'none' && brandingIcon} {appName}
                </h1>
              )}
            </div>
          )}
          {isSidebarCollapsed && (
            <h1 className="sidebar-logo-collapsed" style={{ margin: 0 }}>
              {brandingFavicon && (
                <img src={brandingFavicon} alt="" style={{ maxHeight: '24px', maxWidth: '24px', objectFit: 'contain' }} />
              )}
            </h1>
          )}
          <button 
            className="sidebar-toggle-btn" 
            onClick={toggleSidebar} 
            title={isSidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"} 
            style={{ 
              position: isSidebarCollapsed ? 'relative' : 'absolute', 
              right: isSidebarCollapsed ? 'auto' : '-0.25rem', 
              top: isSidebarCollapsed ? 'auto' : '50%', 
              transform: isSidebarCollapsed ? 'none' : 'translateY(-50%)', 
              marginTop: isSidebarCollapsed ? '0.75rem' : '0' 
            }}
          >
            {isSidebarCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>
        
        <nav className="sidebar-nav" style={{ flex: 1, overflowY: 'auto', minHeight: 0, marginTop: '1rem' }}>
          {activeTab !== 'settings' ? (
            <>
              <a 
                className={`nav-link ${activeTab === 'home' ? 'active' : ''}`}
                onClick={() => { setActiveTab('home'); setIsMobileMenuOpen(false); }}
              >
                <LayoutDashboard />
                <span>Home</span>
              </a>
              <a 
                className={`nav-link ${activeTab === 'todo' ? 'active' : ''}`}
                onClick={() => { setActiveTab('todo'); setIsMobileMenuOpen(false); }}
              >
                <FileCheck />
                <span>Todo List</span>
              </a>
              <a 
                className={`nav-link ${activeTab === 'calendar' ? 'active' : ''}`}
                onClick={() => { setActiveTab('calendar'); setIsMobileMenuOpen(false); }}
              >
                <Calendar />
                <span>Calendar</span>
              </a>
              <a 
                className={`nav-link ${activeTab === 'subscriptions' ? 'active' : ''}`}
                onClick={() => { setActiveTab('subscriptions'); setIsMobileMenuOpen(false); }}
              >
                <CreditCard />
                <span>Subscriptions</span>
              </a>
              <a 
                className={`nav-link ${activeTab === 'bills' ? 'active' : ''}`}
                onClick={() => { setActiveTab('bills'); setIsMobileMenuOpen(false); }}
              >
                <Receipt />
                <span>Bills</span>
              </a>
              <a 
                className={`nav-link ${activeTab === 'games' ? 'active' : ''}`}
                onClick={() => { setActiveTab('games'); setIsMobileMenuOpen(false); }}
              >
                <Gamepad2 />
                <span>Games</span>
              </a>
            </>
          ) : (
            <>
              <a 
                className="nav-link" 
                onClick={() => {
                  setActiveTab(lastTab);
                  setIsMobileMenuOpen(false);
                }} 
                style={{ marginBottom: '0.75rem', fontWeight: '600' }}
              >
                <ChevronLeft />
                <span>Back to Menu</span>
              </a>
              
              <a 
                className={`nav-link ${settingsSubTab === 'general' ? 'active' : ''}`}
                onClick={() => { setSettingsSubTab('general'); setIsMobileMenuOpen(false); }}
                title="General Settings"
              >
                <Sliders />
                <span>General Settings</span>
              </a>
              {canReadUsers && (
                <a 
                  className={`nav-link ${settingsSubTab === 'users' ? 'active' : ''}`}
                  onClick={() => { setSettingsSubTab('users'); setIsMobileMenuOpen(false); }}
                  title="User Management"
                >
                  <Users />
                  <span>User Management</span>
                </a>
              )}
              {user.auth_provider === 'sso' && canReadCalendar && (
                <a 
                  className={`nav-link ${settingsSubTab === 'calendar' ? 'active' : ''}`}
                  onClick={() => { setSettingsSubTab('calendar'); setIsMobileMenuOpen(false); }}
                  title="Calendar Settings"
                >
                  <Calendar />
                  <span>Calendar Settings</span>
                </a>
              )}
              {canReadRoles && (
                <a 
                  className={`nav-link ${settingsSubTab === 'roles' ? 'active' : ''}`}
                  onClick={() => { setSettingsSubTab('roles'); setIsMobileMenuOpen(false); }}
                  title="Role & RBAC Settings"
                >
                  <Shield />
                  <span>Role & RBAC Settings</span>
                </a>
              )}
              {canReadSSO && (
                <a 
                  className={`nav-link ${settingsSubTab === 'sso' ? 'active' : ''}`}
                  onClick={() => { setSettingsSubTab('sso'); setIsMobileMenuOpen(false); }}
                  title="SSO Configuration"
                >
                  <Lock />
                  <span>SSO Configuration</span>
                </a>
              )}
              {canReadBranding && (
                <a 
                  className={`nav-link ${settingsSubTab === 'branding' ? 'active' : ''}`}
                  onClick={() => { setSettingsSubTab('branding'); setIsMobileMenuOpen(false); }}
                  title="Branding Settings"
                >
                  <Palette />
                  <span>Branding Settings</span>
                </a>
              )}

              {user.role_name === 'Administrator' && (
                <a 
                  className={`nav-link ${settingsSubTab === 'notifications' ? 'active' : ''}`}
                  onClick={() => { setSettingsSubTab('notifications'); setIsMobileMenuOpen(false); }}
                  title="Notifications"
                >
                  <Bell />
                  <span>Notifications</span>
                </a>
              )}
              {user.role_name === 'Administrator' && (
                <a 
                  className={`nav-link ${settingsSubTab === 'integrations' ? 'active' : ''}`}
                  onClick={() => { setSettingsSubTab('integrations'); setIsMobileMenuOpen(false); }}
                  title="Integrations"
                >
                  <Key />
                  <span>Integrations</span>
                </a>
              )}
            </>
          )}
        </nav>

        <div className="sidebar-footer">
          {activeTab !== 'settings' && (
            <>
              {(localStorage.getItem('one_app_url') || window.self !== window.top) && (
                <a 
                  className="nav-link return-oneapp-btn"
                  onClick={() => {
                    const url = localStorage.getItem('one_app_url');
                    if (window.self !== window.top) {
                      window.parent.postMessage({ type: 'RETURN_TO_ONE_APP' }, '*');
                    } else if (url) {
                      window.location.href = url;
                    }
                  }}
                  title="Return to One App"
                  style={{ marginBottom: '0.25rem', backgroundColor: 'var(--primary)', color: 'var(--primary-foreground)' }}
                >
                  <ChevronLeft />
                  <span>Return to One App</span>
                </a>
              )}
              <a 
                className={`nav-link ${activeTab === 'features' ? 'active' : ''}`}
                onClick={() => { setActiveTab('features'); setIsMobileMenuOpen(false); }}
                title="Feature Requests"
                style={{ marginBottom: '0.25rem' }}
              >
                <Lightbulb />
                <span>Feature Requests</span>
              </a>
              <a 
                className={`nav-link ${activeTab === 'bugs' ? 'active' : ''}`}
                onClick={() => { setActiveTab('bugs'); setIsMobileMenuOpen(false); }}
                title="Report Bug"
                style={{ marginBottom: '0.25rem' }}
              >
                <Bug />
                <span>Report Bug</span>
              </a>
              <a 
                className={`nav-link ${activeTab === 'settings' ? 'active' : ''}`}
                onClick={() => { setActiveTab('settings'); setSettingsSubTab('general'); setIsMobileMenuOpen(false); }}
                title="Settings"
                style={{ marginBottom: '0.25rem' }}
              >
                <Settings />
                <span>Settings</span>
              </a>
            </>
          )}
          <div style={{ display: 'flex', flexDirection: isSidebarCollapsed ? 'column' : 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: '0.25rem' }}>
            <a 
              className="nav-link" 
              onClick={() => { handleLogout(); setIsMobileMenuOpen(false); }} 
              style={{ flex: 1, minWidth: 0 }}
              title="Logout"
            >
              <LogOut />
              <span>Logout</span>
            </a>
            <button 
              onClick={toggleTheme}
              className="theme-toggle-btn"
              style={{ 
                marginLeft: isSidebarCollapsed ? '0' : '0.25rem'
              }}
              title={theme === 'dark' ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            </button>
          </div>
        </div>
      </aside>

      {/* Main Viewport */}
      <main className={`main-content ${isSidebarCollapsed ? 'expanded' : ''}`}>

        {/* Global Toast Alert Banner */}
        {toast && (
          <div className={`alert-banner ${toast.type === 'success' ? 'alert-success' : 'alert-error'}`}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {toast.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
              {toast.text}
            </span>
            <button className="close-btn" onClick={() => setToast(null)}>×</button>
          </div>
        )}

        {/* Main tabs routing */}
        {activeTab === 'home' && (
          <HomeView 
            onOpenModal={() => setIsDemoModalOpen(true)}
            onNavigateTab={(tab) => {
              setActiveTab(tab);
            }}
            user={user} 
          />
        )}

        {activeTab === 'todo' && (
          <TasksView 
            showToast={showToast} 
            currentUser={user} 
          />
        )}

        {activeTab === 'calendar' && (
          <CalendarView 
            showToast={showToast} 
            currentUser={user} 
          />
        )}

        {activeTab === 'subscriptions' && (
          <SubscriptionsView 
            showToast={showToast} 
          />
        )}

        {activeTab === 'bills' && (
          <BillsView 
            showToast={showToast} 
          />
        )}

        {activeTab === 'features' && (
          <FeatureRequestsView 
            showToast={showToast}
            currentUser={user}
          />
        )}

        {activeTab === 'bugs' && (
          <BugReportsView 
            showToast={showToast}
            currentUser={user}
          />
        )}

        {activeTab === 'games' && (
          <GamesView 
            showToast={showToast}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsView 
            showToast={showToast} 
            onSettingsChange={handleSettingsChange} 
            currentUser={user} 
            activeSubTab={settingsSubTab}
            setActiveSubTab={setSettingsSubTab}
          />
        )}
      </main>

      {/* Showcase Modal Dialog Reference */}
      {isModalRendered && (
        <div className={`modal-overlay ${isModalClosing ? 'closing' : ''}`} onClick={() => setIsDemoModalOpen(false)}>
          <div className={`modal-content ${isModalClosing ? 'closing' : ''}`} onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px' }}>
            <div className="modal-header">
              <h2>Reference Modal Showcase</h2>
              <button className="close-btn" onClick={() => setIsDemoModalOpen(false)}>×</button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <p style={{ margin: 0, color: 'var(--muted-foreground)', lineHeight: '1.5', fontSize: '0.875rem' }}>
                This modal showcases the standard dialog overlay styling used throughout the application. Notice the soft background blur backdrop, content padding, crisp borders, and subtle corner radiuses (`--radius` of 0.5rem).
              </p>
              
              <div className="form-group">
                <label htmlFor="ref-input-val">Sample Form Input Field</label>
                <input id="ref-input-val" type="text" className="input-control" placeholder="Sample input field..." />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button className="btn btn-outline" onClick={() => setIsDemoModalOpen(false)}>
                  Cancel
                </button>
                <button className="btn btn-primary" onClick={() => { setIsDemoModalOpen(false); showToast('Sample Modal action triggered!', 'success'); }}>
                  Confirm Action
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Premium Login Screen UI Overlay
function LoginView({ onLoginSuccess }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [oidcEnabled, setOidcEnabled] = useState(false);
  
  const [appName, setAppName] = useState('Base App');
  const [brandingIcon, setBrandingIcon] = useState('⚙️');
  const [brandingLogo, setBrandingLogo] = useState('');
  const [brandingLogoLight, setBrandingLogoLight] = useState('');
  const [brandingLogoDark, setBrandingLogoDark] = useState('');

  const isSystemDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  const lastTheme = localStorage.getItem('last_theme') || 'system';
  const resolvedTheme = lastTheme === 'system' ? (isSystemDark ? 'dark' : 'light') : lastTheme;
  const currentLogo = resolvedTheme === 'dark' 
    ? (brandingLogoDark || brandingLogoLight || brandingLogo) 
    : (brandingLogoLight || brandingLogoDark || brandingLogo);

  useEffect(() => {
    const lastColor = localStorage.getItem('last_primary_color');
    if (lastColor) {
      document.documentElement.style.setProperty('--primary', lastColor);
      try {
        document.documentElement.style.setProperty('--primary-foreground', getContrastColor(lastColor));
      } catch (err) {
        console.error('Error setting login view primary foreground:', err);
      }
    } else {
      document.documentElement.style.setProperty('--primary', '#0f172a');
      document.documentElement.style.setProperty('--primary-foreground', '#ffffff');
    }

    const lastTheme = localStorage.getItem('last_theme') || 'system';
    const root = document.documentElement;
    root.classList.remove('theme-light', 'theme-dark');
    if (lastTheme === 'light') {
      root.classList.add('theme-light');
    } else if (lastTheme === 'dark') {
      root.classList.add('theme-dark');
    }

    // Fetch public settings for branding
    fetch('/api/settings/public')
      .then(res => res.json())
      .then(data => {
        if (data.app_name) setAppName(data.app_name);
        setBrandingIcon(data.branding_icon !== undefined ? data.branding_icon : '⚙️');
        setBrandingLogo(data.branding_logo || '');
        setBrandingLogoLight(data.branding_logo_light || '');
        setBrandingLogoDark(data.branding_logo_dark || '');
        
        // Dynamically update favicon on mount
        const favicon = document.querySelector('link[rel="icon"]');
        if (favicon) {
          if (data.branding_favicon) {
            favicon.href = data.branding_favicon;
            favicon.type = 'image/png';
          } else if (data.branding_icon && data.branding_icon !== 'none') {
            favicon.href = `data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>${data.branding_icon}</text></svg>`;
            favicon.type = 'image/svg+xml';
          }
        }
      })
      .catch(err => console.error('Failed to load public settings:', err));

    // Check OIDC Status
    fetch('/api/auth/oidc/config')
      .then(res => res.json())
      .then(data => {
        if (data.oidc_enabled) {
          setOidcEnabled(true);
        }
      })
      .catch(err => console.error('Failed to load OIDC config:', err));
  }, []);

  useEffect(() => {
    document.title = appName;
  }, [appName]);

  const handleOidcLogin = () => {
    window.location.href = '/api/auth/oidc/login';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Login failed');
      }
      onLoginSuccess(data.token, data.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  
  const lastColor = localStorage.getItem('last_primary_color') || '#0f172a';
  const isCardDark = getContrastColor(lastColor) === '#ffffff';

  let buttonStyle = {};
  let microsoftButtonStyle = {};
  let separatorStyle = {};
  let borderLineColor = 'rgba(0, 0, 0, 0.15)';

  if (resolvedTheme === 'light') {
    buttonStyle = isCardDark
      ? { backgroundColor: '#ffffff', color: lastColor, border: 'none' }
      : { backgroundColor: '#09090b', color: '#ffffff', border: 'none' };
    microsoftButtonStyle = isCardDark
      ? { backgroundColor: 'transparent', color: '#ffffff', borderColor: 'rgba(255, 255, 255, 0.4)' }
      : { backgroundColor: 'transparent', color: '#09090b', borderColor: 'rgba(9, 9, 11, 0.4)' };
    separatorStyle = { color: isCardDark ? 'rgba(255, 255, 255, 0.6)' : 'rgba(9, 9, 11, 0.6)' };
    borderLineColor = isCardDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(9, 9, 11, 0.15)';
  } else {
    buttonStyle = isCardDark
      ? { backgroundColor: '#27272a', color: '#fafafa', border: '1px solid rgba(255, 255, 255, 0.1)' }
      : { backgroundColor: '#18181b', color: '#fafafa', border: '1px solid rgba(255, 255, 255, 0.1)' };
    microsoftButtonStyle = { backgroundColor: 'transparent', color: '#ffffff', borderColor: 'rgba(255, 255, 255, 0.2)' };
    separatorStyle = { color: 'rgba(255, 255, 255, 0.4)' };
    borderLineColor = 'rgba(255, 255, 255, 0.15)';
  }

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          {currentLogo ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <img src={currentLogo} alt={appName} style={{ maxHeight: '48px', maxWidth: '100%', objectFit: 'contain' }} />
              <h2 style={{ fontSize: '1.25rem', fontWeight: '700', color: 'var(--primary-foreground)', margin: 0 }}>{appName}</h2>
            </div>
          ) : (
            <h2 style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', color: 'var(--primary-foreground)', fontSize: '1.25rem', fontWeight: '700' }}>
              {brandingIcon !== 'none' && brandingIcon} {appName}
            </h2>
          )}
          <p style={{ marginTop: '0.25rem', color: 'var(--primary-foreground)', opacity: 0.8, fontSize: '0.875rem' }}>
            Sign in to access the system and configure settings.
          </p>
        </div>
        
        {error && (
          <div className="alert-banner alert-error" style={{ padding: '0.5rem 0.75rem', marginBottom: '1rem', fontSize: '0.8125rem' }}>
            <span>{error}</span>
          </div>
        )}
        
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div className="form-group">
            <label htmlFor="login-username" style={{ fontSize: '0.75rem', fontWeight: '600' }}>Username</label>
            <input 
              id="login-username"
              type="text" 
              className="input-control" 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
              required 
              autoFocus
            />
          </div>

          <div className="form-group">
            <label htmlFor="login-password" style={{ fontSize: '0.75rem', fontWeight: '600' }}>Password</label>
            <input 
              id="login-password"
              type="password" 
              className="input-control" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required 
            />
          </div>

          <button type="submit" className="btn" style={{ width: '100%', marginTop: '0.5rem', ...buttonStyle }} disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
        {oidcEnabled && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', margin: '1.25rem 0', gap: '0.5rem' }}>
              <div style={{ flex: 1, height: '1px', background: borderLineColor }} />
              <span style={{ fontSize: '0.6875rem', ...separatorStyle, textTransform: 'uppercase', letterSpacing: '0.05em' }}>or</span>
              <div style={{ flex: 1, height: '1px', background: borderLineColor }} />
            </div>
            <button 
              type="button" 
              className="btn" 
              onClick={handleOidcLogin}
              style={{ 
                width: '100%', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                gap: '0.5rem',
                ...microsoftButtonStyle
              }}
            >
              <svg width="16" height="16" viewBox="0 0 23 23">
                <path fill="#f35325" d="M0 0h11v11H0z"/>
                <path fill="#81bc06" d="M12 0h11v11H12z"/>
                <path fill="#05a6f0" d="M0 12h11v11H0z"/>
                <path fill="#ffba08" d="M12 12h11v11H12z"/>
              </svg>
              Sign in with Microsoft
            </button>
          </>
        )}
      </div>
    </div>
  );
}
