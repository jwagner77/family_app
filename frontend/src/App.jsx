import React, { useState, useEffect } from 'react';
import { 
  Sliders, 
  Settings,
  ChevronUp,
  User,
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
  DollarSign,
  CreditCard,
  Receipt,
  Gamepad2,
  BookOpen,
  ShoppingCart,
  ChefHat,
  Apple,
  Package,
  FileText,
  Bookmark,
  BookMarked,
  LayoutGrid,
  Flame,
  RefreshCw,
  Clock,
  Cake,
  Activity,
  Sparkles,
  PawPrint,
  Home,
  Folder
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
import ContactsView from './components/ContactsView';
import BirthdaysView from './components/BirthdaysView';
import HealthView from './components/HealthView';
import PetsView from './components/PetsView';
import FeatureRequestsView from './components/FeatureRequestsView';
import BugReportsView from './components/BugReportsView';
import FocusFlowTasksView from './components/FocusFlowTasksView';
import RoutinesView from './components/RoutinesView';
import HabitsView from './components/HabitsView';
import FocusView from './components/FocusView';
import CalendarView from './components/CalendarView';
import MoneyView from './components/MoneyView';
import SubscriptionsView from './components/SubscriptionsView';
import BillsView from './components/BillsView';
import GamesView from './components/GamesView';
import RecipesView from './components/RecipesView';
import WeeklyMenu from './components/WeeklyMenu';
import LeftoversView from './components/LeftoversView';
import ShoppingList from './components/ShoppingList';
import InventoryView from './components/InventoryView';
import CSVUpload from './components/CSVUpload';
import OCRUpload from './components/OCRUpload';
import LibraryView from './components/LibraryView';
import ReadingListView from './components/ReadingListView';
import ReadingLogView from './components/ReadingLogView';
import SharedReadingListView from './components/SharedReadingListView';
import CustomDashboardView from './components/CustomDashboardView';
import SharedDashboardView from './components/SharedDashboardView';
import HousekeepingView from './components/HousekeepingView';
import FocusAreasView from './components/FocusAreasView';
import FloatingActionButton from './components/FloatingActionButton';
import UserProfileView from './components/UserProfileView';

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

function getColoredContrastColor(hexColor, shouldBeLight) {
  if (!hexColor) return shouldBeLight ? '#e0e7ff' : '#1e1b4b';
  let hex = hexColor.replace('#', '');
  if (hex.length === 3) {
    hex = hex.split('').map(char => char + char).join('');
  }
  if (hex.length !== 6) return shouldBeLight ? '#e0e7ff' : '#1e1b4b';
  
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  
  if (isNaN(r) || isNaN(g) || isNaN(b)) return shouldBeLight ? '#e0e7ff' : '#1e1b4b';
  
  const rNorm = r / 255;
  const gNorm = g / 255;
  const bNorm = b / 255;
  const max = Math.max(rNorm, gNorm, bNorm);
  const min = Math.min(rNorm, gNorm, bNorm);
  let h, s, l = (max + min) / 2;
  
  if (max === min) {
    h = s = 0;
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case rNorm: h = (gNorm - bNorm) / d + (gNorm < bNorm ? 6 : 0); break;
      case gNorm: h = (bNorm - rNorm) / d + 2; break;
      case bNorm: h = (rNorm - gNorm) / d + 4; break;
    }
    h /= 6;
  }
  
  const newS = Math.max(s, 0.75); 
  const newL = shouldBeLight ? 0.88 : 0.15; 
  
  return hslToHex(h, newS, newL);
}

function hslToHex(h, s, l) {
  let r, g, b;
  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }
  const toHex = (x) => {
    const hex = Math.round(x * 255).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };
  return '#' + toHex(r) + toHex(g) + toHex(b);
}

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [user, setUser] = useState(null);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(
    localStorage.getItem('sidebar_collapsed') === 'true'
  );
  const [shareToken, setShareToken] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('share');
  });
  const [sharedDashboardToken, setSharedDashboardToken] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    const tokenParam = params.get('share_dashboard');
    if (tokenParam) return tokenParam;
    const path = window.location.pathname;
    if (path.startsWith('/shared/')) {
      return path.replace('/shared/', '');
    }
    return null;
  });

  const [expandedCategories, setExpandedCategories] = useState(() => {
    const saved = localStorage.getItem('sidebar_expanded_categories');
    return saved ? JSON.parse(saved) : {
      people: true,
      plans: true,
      kitchen: true,
      finance: true,
      library: true,
      entertainment: true
    };
  });

  const toggleCategory = (category) => {
    setExpandedCategories(prev => {
      const updated = { ...prev, [category]: !prev[category] };
      localStorage.setItem('sidebar_expanded_categories', JSON.stringify(updated));
      return updated;
    });
  };

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
      "id": "money",
      "label": "Money",
      "icon": "DollarSign"
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
    },
    {
      "id": "recipes",
      "label": "Recipes",
      "icon": "BookOpen"
    },
    {
      "id": "planner",
      "label": "Meal Planner",
      "icon": "ChefHat"
    },
    {
      "id": "leftovers",
      "label": "Fridge Leftovers",
      "icon": "Apple"
    },
    {
      "id": "inventory",
      "label": "Pantry Inventory",
      "icon": "Package"
    },
    {
      "id": "shopping",
      "label": "Shopping List",
      "icon": "ShoppingCart"
    },
    {
      "id": "library",
      "label": "Library Catalog",
      "icon": "BookOpen"
    },
    {
      "id": "reading_list",
      "label": "Reading List",
      "icon": "Bookmark"
    },
    {
      "id": "reading_log",
      "label": "Reading Log",
      "icon": "BookMarked"
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

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (isUserMenuOpen && !e.target.closest('.user-profile-menu-container')) {
        setIsUserMenuOpen(false);
      }
    };
    window.addEventListener('click', handleOutsideClick);
    return () => window.removeEventListener('click', handleOutsideClick);
  }, [isUserMenuOpen]);



  const [settingsSubTab, setSettingsSubTab] = useState('users');
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
  const [appBg, setAppBg] = useState(localStorage.getItem('last_app_bg') || '');

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
    const lastPrimary = localStorage.getItem('last_primary_color') || primaryColor;
    applyPrimaryColor(lastPrimary);

    const lastTheme = localStorage.getItem('last_theme') || theme;
    applyTheme(lastTheme);

    const lastNavbarBg = localStorage.getItem('last_navbar_bg') || '';
    applyNavbarBg(lastNavbarBg);

    const lastNavbarOpacity = localStorage.getItem('last_navbar_opacity');
    if (lastNavbarOpacity !== null && lastNavbarOpacity !== undefined) {
      applyNavbarOpacity(parseFloat(lastNavbarOpacity));
    }

    const lastAppBg = localStorage.getItem('last_app_bg') || '';
    applyAppBg(lastAppBg);
    
    const lastThemeInfoCards = localStorage.getItem('last_theme_info_cards') || '0';
    applyThemeInfoCards(lastThemeInfoCards);

    const lastTextColor = localStorage.getItem('last_text_color') || 'white';
    applyTextColor(lastTextColor);

    const lastDynamicTextColor = localStorage.getItem('last_dynamic_text_color') || '0';
    applyDynamicTextColor(lastDynamicTextColor);

    fetchSettings();
  }, []);

  useEffect(() => {
    const isDynamic = user?.dynamic_text_color !== undefined 
      ? (user.dynamic_text_color === 1 || user.dynamic_text_color === true)
      : (localStorage.getItem('last_dynamic_text_color') === '1');
      
    if (isDynamic) {
      applyDynamicTextColor(1, user);
    }
  }, [user, theme, primaryColor]);

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
      
      const validTabs = ['home', 'settings', 'features', 'bugs', 'todo', 'calendar', 'money', 'subscriptions', 'bills', 'games'];
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
    if (loggedUser.navbar_bg) {
      applyNavbarBg(loggedUser.navbar_bg);
    } else {
      applyNavbarBg('');
    }
    if (loggedUser.navbar_opacity !== undefined) {
      applyNavbarOpacity(loggedUser.navbar_opacity);
    } else {
      applyNavbarOpacity(0.75);
    }
    if (loggedUser.app_bg) {
      applyAppBg(loggedUser.app_bg);
    } else {
      applyAppBg('');
    }
    if (loggedUser.theme) {
      setTheme(loggedUser.theme);
      applyTheme(loggedUser.theme);
      localStorage.setItem('last_theme', loggedUser.theme);
    }
    if (loggedUser.theme_info_cards !== undefined) {
      applyThemeInfoCards(loggedUser.theme_info_cards);
    }
    if (loggedUser.text_color !== undefined) {
      applyTextColor(loggedUser.text_color);
    }
    if (loggedUser.dynamic_text_color !== undefined) {
      applyDynamicTextColor(loggedUser.dynamic_text_color, loggedUser);
    }
    setToken(newToken);
    setUser(loggedUser);
    setActiveTab('home');
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setToken('');
    setUser(null);
    applyPrimaryColor('#0f172a');
    applyNavbarBg('');
    applyNavbarOpacity(0.75);
    applyAppBg('');
    applyThemeInfoCards(0);
    applyTextColor('white');
    applyDynamicTextColor(0);
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

  const applyNavbarBg = (bg) => {
    if (bg) {
      const value = bg.startsWith('linear-gradient') || bg.startsWith('radial-gradient')
        ? bg
        : `url(${bg})`;
      document.documentElement.style.setProperty('--navbar-bg', value);
      localStorage.setItem('last_navbar_bg', bg);
    } else {
      document.documentElement.style.setProperty('--navbar-bg', 'none');
      localStorage.removeItem('last_navbar_bg');
    }
  };

  const applyNavbarOpacity = (opacity) => {
    const val = opacity !== undefined && opacity !== null ? opacity : 0.75;
    document.documentElement.style.setProperty('--navbar-opacity', String(val));
    localStorage.setItem('last_navbar_opacity', String(val));
  };

  const applyAppBg = (bg) => {
    setAppBg(bg || '');
    if (bg) {
      document.documentElement.style.setProperty('--app-bg', `url(${bg})`);
      document.documentElement.classList.add('has-app-bg');
      localStorage.setItem('last_app_bg', bg);
    } else {
      document.documentElement.style.setProperty('--app-bg', 'none');
      document.documentElement.classList.remove('has-app-bg');
      localStorage.removeItem('last_app_bg');
    }
  };

  const applyThemeInfoCards = (enabled) => {
    const root = document.documentElement;
    if (enabled === 1 || enabled === true || String(enabled) === '1') {
      root.classList.add('cards-themed');
      localStorage.setItem('last_theme_info_cards', '1');
    } else {
      root.classList.remove('cards-themed');
      localStorage.setItem('last_theme_info_cards', '0');
    }
  };

  const applyTextColor = (color) => {
    const val = color || 'white';
    const rootEl = document.documentElement;
    if (val === 'white') {
      rootEl.classList.add('force-text-white');
      rootEl.classList.remove('force-text-black');
      localStorage.setItem('last_text_color', 'white');
    } else {
      rootEl.classList.add('force-text-black');
      rootEl.classList.remove('force-text-white');
      localStorage.setItem('last_text_color', 'black');
    }
  };

  const applyDynamicTextColor = (enabled, userDetails) => {
    const rootEl = document.documentElement;
    if (enabled === 1 || enabled === true || String(enabled) === '1') {
      rootEl.classList.add('dynamic-text-active');
      localStorage.setItem('last_dynamic_text_color', '1');
      
      const lastTheme = userDetails?.theme || theme || 'system';
      const isSystemDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      const resolvedTheme = lastTheme === 'system' ? (isSystemDark ? 'dark' : 'light') : lastTheme;
      
      let shouldBeLight = resolvedTheme === 'dark';
      const hasAppBg = userDetails?.app_bg || localStorage.getItem('last_app_bg');
      if (hasAppBg) {
        shouldBeLight = true;
      }
      
      const activeAccent = userDetails?.primary_color || primaryColor || '#3f51b5';
      const calculatedColor = getColoredContrastColor(activeAccent, shouldBeLight);
      
      rootEl.style.setProperty('--dynamic-text-color', calculatedColor);
    } else {
      rootEl.classList.remove('dynamic-text-active');
      localStorage.setItem('last_dynamic_text_color', '0');
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

  const handleExportWord = async (recipeId, templateId) => {
    try {
      const res = await fetch('/api/templates');
      let tId = templateId;
      if (!tId && res.ok) {
        const templatesList = await res.json();
        const def = templatesList.find(t => t.is_default === 1);
        if (def) tId = def.id;
      }
      
      let url = `/api/recipes/${recipeId}/export`;
      const params = [];
      if (tId) params.push(`templateId=${tId}`);
      if (token) params.push(`token=${encodeURIComponent(token)}`);
      if (params.length > 0) url += `?${params.join('&')}`;
      
      window.open(url, '_blank');
    } catch (e) {
      console.error('Failed to export Word doc:', e);
      showToast('Failed to export recipe to Word doc.', 'error');
    }
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
          if (data.user?.navbar_bg) {
            applyNavbarBg(data.user.navbar_bg);
          } else {
            applyNavbarBg('');
          }
          if (data.user?.navbar_opacity !== undefined) {
            applyNavbarOpacity(data.user.navbar_opacity);
          } else {
            applyNavbarOpacity(0.75);
          }
          if (data.user?.app_bg) {
            applyAppBg(data.user.app_bg);
          } else {
            applyAppBg('');
          }
          if (data.user?.theme) {
            setTheme(data.user.theme);
            applyTheme(data.user.theme);
            localStorage.setItem('last_theme', data.user.theme);
          }
          if (data.user?.theme_info_cards !== undefined) {
            applyThemeInfoCards(data.user.theme_info_cards);
          }
          if (data.user?.text_color !== undefined) {
            applyTextColor(data.user.text_color);
          }
          if (data.user?.dynamic_text_color !== undefined) {
            applyDynamicTextColor(data.user.dynamic_text_color, data.user);
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

  if (shareToken) {
    return (
      <SharedReadingListView 
        shareToken={shareToken} 
        onClose={() => {
          setShareToken(null);
          const url = new URL(window.location.href);
          url.searchParams.delete('share');
          window.history.replaceState({}, document.title, url.pathname + url.search);
        }} 
      />
    );
  }

  if (sharedDashboardToken) {
    return (
      <SharedDashboardView 
        token={sharedDashboardToken} 
        onClose={() => {
          setSharedDashboardToken(null);
          const url = new URL(window.location.href);
          url.searchParams.delete('share_dashboard');
          if (url.pathname.startsWith('/shared/')) {
            url.pathname = '/';
          }
          window.history.replaceState({}, document.title, url.pathname + url.search);
        }} 
      />
    );
  }

  if (!token || !user) {
    return <LoginView onLoginSuccess={handleLoginSuccess} />;
  }

  const canReadGeneral = user?.permissions?.settings_general !== 'none';
  const canReadUsers = (user?.permissions?.settings_users !== 'none') || (user?.permissions?.users !== 'none');
  const canReadRoles = (user?.permissions?.settings_roles !== 'none') || (user?.permissions?.roles !== 'none');
  const canReadSSO = (user?.permissions?.settings_sso !== 'none') || (user?.permissions?.roles === 'full');
  const canReadBranding = (user?.permissions?.settings_branding !== 'none') || (user?.permissions?.roles === 'full');
  const canReadCalendar = (user?.permissions?.settings_calendar !== 'none');
  const canReadRecipes = user?.permissions?.recipes !== 'none';
  const canReadPlanner = user?.permissions?.planner !== 'none';
  const canReadShopping = user?.permissions?.shopping_list !== 'none';
  const canReadLibrary = true;
  const canReadReadingList = true;
  const canReadReadingLog = true;

  return (
    <div className="app-container">
      {/* Dynamic Organic Background Lines */}
      {!appBg && (
        <svg 
          style={{ 
            position: 'fixed', 
            top: 0, 
            left: 0, 
            width: '100%', 
            height: '100%', 
            zIndex: -1, 
            pointerEvents: 'none', 
            opacity: resolvedTheme === 'dark' ? 0.35 : 0.18 
          }} 
          viewBox="0 0 1440 900" 
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="curve-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.1" />
              <stop offset="50%" stopColor="var(--primary)" stopOpacity="0.9" />
              <stop offset="100%" stopColor="var(--primary)" stopOpacity="0.1" />
            </linearGradient>
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          
          <path d="M -100 200 C 400 -100, 800 700, 1600 300" fill="none" stroke="url(#curve-grad)" strokeWidth="3" filter="url(#glow)" />
          <path d="M -50 250 C 450 -50, 750 650, 1550 250" fill="none" stroke="url(#curve-grad)" strokeWidth="1.5" filter="url(#glow)" />
          
          <path d="M 1500 100 C 1000 800, 600 200, -100 800" fill="none" stroke="url(#curve-grad)" strokeWidth="2.5" filter="url(#glow)" />
          <path d="M 1450 80 C 950 780, 650 220, -50 780" fill="none" stroke="url(#curve-grad)" strokeWidth="1.2" filter="url(#glow)" />

          <path d="M -100 800 C 500 400, 900 1000, 1600 600" fill="none" stroke="url(#curve-grad)" strokeWidth="2" filter="url(#glow)" />
          <path d="M 200 -100 C 600 500, 1100 400, 1300 1000" fill="none" stroke="url(#curve-grad)" strokeWidth="1.5" filter="url(#glow)" />
          <path d="M 220 -120 C 580 480, 1120 420, 1280 1020" fill="none" stroke="url(#curve-grad)" strokeWidth="0.8" filter="url(#glow)" />
          
          <path d="M 1200 -50 C 800 400, 400 300, -50 950" fill="none" stroke="url(#curve-grad)" strokeWidth="2" filter="url(#glow)" />
        </svg>
      )}
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
              {/* Top-Level Page: Overview */}
              <a 
                className={`nav-link ${activeTab === 'home' ? 'active' : ''}`}
                onClick={() => { setActiveTab('home'); setIsMobileMenuOpen(false); }}
                title="Overview"
                style={{ marginBottom: '0.5rem' }}
              >
                <LayoutDashboard />
                <span>Overview</span>
              </a>

              {/* Category: People & Pets */}
              {!isSidebarCollapsed && (
                <div className="sidebar-category-header" onClick={() => toggleCategory('people')}>
                  <span>People & Pets</span>
                  <ChevronDown size={14} style={{ transform: expandedCategories.people ? 'none' : 'rotate(-90deg)' }} />
                </div>
              )}
              {isSidebarCollapsed && (
                <div style={{ height: '1px', background: 'rgba(255,255,255,0.08)', margin: '0.5rem 0' }} />
              )}
              {(expandedCategories.people || isSidebarCollapsed) && (
                <>
                  <a 
                    className={`nav-link ${activeTab === 'contacts' ? 'active' : ''}`}
                    onClick={() => { setActiveTab('contacts'); setIsMobileMenuOpen(false); }}
                    title="Contacts"
                  >
                    <Users />
                    <span>Contacts</span>
                  </a>
                  <a 
                    className={`nav-link ${activeTab === 'birthdays' ? 'active' : ''}`}
                    onClick={() => { setActiveTab('birthdays'); setIsMobileMenuOpen(false); }}
                    title="Birthdays"
                  >
                    <Cake />
                    <span>Birthdays</span>
                  </a>
                  <a 
                    className={`nav-link ${activeTab === 'health' ? 'active' : ''}`}
                    onClick={() => { setActiveTab('health'); setIsMobileMenuOpen(false); }}
                    title="Health"
                  >
                    <Activity />
                    <span>Health</span>
                  </a>
                  <a 
                    className={`nav-link ${activeTab === 'pets' ? 'active' : ''}`}
                    onClick={() => { setActiveTab('pets'); setIsMobileMenuOpen(false); }}
                    title="Pets"
                  >
                    <PawPrint />
                    <span>Pets</span>
                  </a>
                </>
              )}

              {/* Category: Plans */}
              {!isSidebarCollapsed && (
                <div className="sidebar-category-header" onClick={() => toggleCategory('plans')}>
                  <span>Plans</span>
                  <ChevronDown size={14} style={{ transform: expandedCategories.plans ? 'none' : 'rotate(-90deg)' }} />
                </div>
              )}
              {isSidebarCollapsed && (
                <div style={{ height: '1px', background: 'rgba(255,255,255,0.08)', margin: '0.5rem 0' }} />
              )}
              {(expandedCategories.plans || isSidebarCollapsed) && (
                <>
                  <a 
                    className={`nav-link ${activeTab === 'todo' ? 'active' : ''}`}
                    onClick={() => { setActiveTab('todo'); setIsMobileMenuOpen(false); }}
                  >
                    <FileCheck />
                    <span>Tasks</span>
                  </a>
                  <a 
                    className={`nav-link ${activeTab === 'focus_areas' ? 'active' : ''}`}
                    onClick={() => { setActiveTab('focus_areas'); setIsMobileMenuOpen(false); }}
                  >
                    <Folder />
                    <span>Focus Areas</span>
                  </a>
                  <a 
                    className={`nav-link ${activeTab === 'routines' ? 'active' : ''}`}
                    onClick={() => { setActiveTab('routines'); setIsMobileMenuOpen(false); }}
                  >
                    <RefreshCw />
                    <span>Routines</span>
                  </a>
                  <a 
                    className={`nav-link ${activeTab === 'habits' ? 'active' : ''}`}
                    onClick={() => { setActiveTab('habits'); setIsMobileMenuOpen(false); }}
                  >
                    <Flame />
                    <span>Habits</span>
                  </a>
                  <a 
                    className={`nav-link ${activeTab === 'focus' ? 'active' : ''}`}
                    onClick={() => { setActiveTab('focus'); setIsMobileMenuOpen(false); }}
                  >
                    <Clock />
                    <span>Focus Mode</span>
                  </a>
                  <a 
                    className={`nav-link ${activeTab === 'calendar' ? 'active' : ''}`}
                    onClick={() => { setActiveTab('calendar'); setIsMobileMenuOpen(false); }}
                  >
                    <Calendar />
                    <span>Calendar</span>
                  </a>
                </>
              )}

              {/* Category: Household */}
              {(canReadRecipes || canReadPlanner || canReadShopping) && (
                <>
                  {!isSidebarCollapsed && (
                    <div className="sidebar-category-header" onClick={() => toggleCategory('kitchen')}>
                      <span>Household</span>
                      <ChevronDown size={14} style={{ transform: expandedCategories.kitchen ? 'none' : 'rotate(-90deg)' }} />
                    </div>
                  )}
                  {isSidebarCollapsed && (
                    <div style={{ height: '1px', background: 'rgba(255,255,255,0.08)', margin: '0.5rem 0' }} />
                  )}
                  {(expandedCategories.kitchen || isSidebarCollapsed) && (
                    <>
                      <a 
                        className={`nav-link ${activeTab === 'housekeeping' ? 'active' : ''}`}
                        onClick={() => { setActiveTab('housekeeping'); setIsMobileMenuOpen(false); }}
                      >
                        <Home />
                        <span>Housekeeping</span>
                      </a>
                      {canReadRecipes && (
                        <a 
                          className={`nav-link ${activeTab === 'recipes' ? 'active' : ''}`}
                          onClick={() => { setActiveTab('recipes'); setIsMobileMenuOpen(false); }}
                        >
                          <BookOpen />
                          <span>Recipes</span>
                        </a>
                      )}
                      {canReadPlanner && (
                        <a 
                          className={`nav-link ${activeTab === 'planner' ? 'active' : ''}`}
                          onClick={() => { setActiveTab('planner'); setIsMobileMenuOpen(false); }}
                        >
                          <ChefHat />
                          <span>Meal Planner</span>
                        </a>
                      )}
                      {canReadPlanner && (
                        <a 
                          className={`nav-link ${activeTab === 'leftovers' ? 'active' : ''}`}
                          onClick={() => { setActiveTab('leftovers'); setIsMobileMenuOpen(false); }}
                        >
                          <Apple />
                          <span>Fridge Leftovers</span>
                        </a>
                      )}
                      {canReadRecipes && (
                        <a 
                          className={`nav-link ${activeTab === 'inventory' ? 'active' : ''}`}
                          onClick={() => { setActiveTab('inventory'); setIsMobileMenuOpen(false); }}
                        >
                          <Package />
                          <span>Pantry Inventory</span>
                        </a>
                      )}
                      {canReadShopping && (
                        <a 
                          className={`nav-link ${activeTab === 'shopping' ? 'active' : ''}`}
                          onClick={() => { setActiveTab('shopping'); setIsMobileMenuOpen(false); }}
                        >
                          <ShoppingCart />
                          <span>Shopping List</span>
                        </a>
                      )}
                    </>
                  )}
                </>
              )}

              {/* Category: Finance */}
              <>
                {!isSidebarCollapsed && (
                  <div className="sidebar-category-header" onClick={() => toggleCategory('finance')}>
                    <span>Finance</span>
                    <ChevronDown size={14} style={{ transform: expandedCategories.finance ? 'none' : 'rotate(-90deg)' }} />
                  </div>
                )}
                {isSidebarCollapsed && (
                  <div style={{ height: '1px', background: 'rgba(255,255,255,0.08)', margin: '0.5rem 0' }} />
                )}
                {(expandedCategories.finance || isSidebarCollapsed) && (
                  <>
                    <a 
                      className={`nav-link ${activeTab === 'money' ? 'active' : ''}`}
                      onClick={() => { setActiveTab('money'); setIsMobileMenuOpen(false); }}
                    >
                      <DollarSign />
                      <span>Money</span>
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
                  </>
                )}
              </>

              {/* Category: Library */}
              {(canReadLibrary || canReadReadingList || canReadReadingLog) && (
                <>
                  {!isSidebarCollapsed && (
                    <div className="sidebar-category-header" onClick={() => toggleCategory('library')}>
                      <span>Library</span>
                      <ChevronDown size={14} style={{ transform: expandedCategories.library ? 'none' : 'rotate(-90deg)' }} />
                    </div>
                  )}
                  {isSidebarCollapsed && (
                    <div style={{ height: '1px', background: 'rgba(255,255,255,0.08)', margin: '0.5rem 0' }} />
                  )}
                  {(expandedCategories.library || isSidebarCollapsed) && (
                    <>
                      {canReadLibrary && (
                        <a 
                          className={`nav-link ${activeTab === 'library' ? 'active' : ''}`}
                          onClick={() => { setActiveTab('library'); setIsMobileMenuOpen(false); }}
                        >
                          <BookOpen />
                          <span>Library Catalog</span>
                        </a>
                      )}
                      {canReadReadingList && (
                        <a 
                          className={`nav-link ${activeTab === 'reading_list' ? 'active' : ''}`}
                          onClick={() => { setActiveTab('reading_list'); setIsMobileMenuOpen(false); }}
                        >
                          <Bookmark />
                          <span>Reading List</span>
                        </a>
                      )}
                      {canReadReadingLog && (
                        <a 
                          className={`nav-link ${activeTab === 'reading_log' ? 'active' : ''}`}
                          onClick={() => { setActiveTab('reading_log'); setIsMobileMenuOpen(false); }}
                        >
                          <BookMarked />
                          <span>Reading Log</span>
                        </a>
                      )}
                    </>
                  )}
                </>
              )}

              {/* Category: Entertainment */}
              {!isSidebarCollapsed && (
                <div className="sidebar-category-header" onClick={() => toggleCategory('entertainment')}>
                  <span>Entertainment</span>
                  <ChevronDown size={14} style={{ transform: expandedCategories.entertainment ? 'none' : 'rotate(-90deg)' }} />
                </div>
              )}
              {isSidebarCollapsed && (
                <div style={{ height: '1px', background: 'rgba(255,255,255,0.08)', margin: '0.5rem 0' }} />
              )}
              {(expandedCategories.entertainment || isSidebarCollapsed) && (
                <>
                  <a 
                    className={`nav-link ${activeTab === 'games' ? 'active' : ''}`}
                    onClick={() => { setActiveTab('games'); setIsMobileMenuOpen(false); }}
                    title="Games"
                  >
                    <Gamepad2 />
                    <span>Games</span>
                  </a>
                </>
              )}
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
              {canReadGeneral && (
                <a 
                  className={`nav-link ${settingsSubTab === 'dashboard' ? 'active' : ''}`}
                  onClick={() => { setSettingsSubTab('dashboard'); setIsMobileMenuOpen(false); }}
                  title="Dashboard Settings"
                >
                  <LayoutDashboard />
                  <span>Dashboard Settings</span>
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
              {canReadRecipes && (
                <a 
                  className={`nav-link ${settingsSubTab === 'templates' ? 'active' : ''}`}
                  onClick={() => { setSettingsSubTab('templates'); setIsMobileMenuOpen(false); }}
                  title="Word Templates"
                >
                  <FileText />
                  <span>Word Templates</span>
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
                className={`nav-link ${activeTab === 'dashboard' ? 'active' : ''}`}
                onClick={() => { setActiveTab('dashboard'); setIsMobileMenuOpen(false); }}
                title="Dashboard Builder"
                style={{ marginBottom: '0.25rem' }}
              >
                <LayoutGrid />
                <span>Dashboard</span>
              </a>
            </>
          )}
          <div style={{ display: 'flex', flexDirection: isSidebarCollapsed ? 'column' : 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: '0.25rem' }}>
            {user && (
              <div className="user-profile-menu-container" style={{ position: 'relative', flex: 1, minWidth: 0 }}>
                <div 
                  className="user-profile-trigger"
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.5rem',
                    borderRadius: 'var(--radius)',
                    cursor: 'pointer',
                    background: isUserMenuOpen ? 'var(--accent)' : 'transparent',
                    transition: 'var(--transition-fast)',
                    border: '1px solid transparent'
                  }}
                  onMouseEnter={(e) => {
                    if (!isUserMenuOpen) e.currentTarget.style.background = 'var(--accent)';
                  }}
                  onMouseLeave={(e) => {
                    if (!isUserMenuOpen) e.currentTarget.style.background = 'transparent';
                  }}
                >
                  {user.picture_url ? (
                    <img 
                      src={user.picture_url} 
                      alt={user.display_name} 
                      style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '50%',
                        objectFit: 'cover',
                        border: '2px solid var(--primary)'
                      }}
                    />
                  ) : (
                    <div 
                      style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '50%',
                        background: 'var(--primary)',
                        color: 'var(--primary-foreground)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 'bold',
                        fontSize: '0.75rem'
                      }}
                    >
                      {(user.display_name || user.username).substring(0, 2).toUpperCase()}
                    </div>
                  )}
                  {!isSidebarCollapsed && (
                    <div style={{ flex: 1, minWidth: 0, textAlign: 'left', lineHeight: 1.2 }}>
                      <div style={{ fontWeight: '600', fontSize: '0.8125rem', color: 'color-mix(in srgb, var(--primary-foreground) 85%, transparent)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {user.display_name || user.username}
                      </div>
                    </div>
                  )}
                  {!isSidebarCollapsed && (
                    <ChevronUp size={12} style={{ color: 'var(--muted-foreground)', transform: isUserMenuOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                  )}
                </div>

                {isUserMenuOpen && (
                  <div 
                    className="user-popout-menu"
                    style={{
                      position: 'absolute',
                      bottom: 'calc(100% + 8px)',
                      left: isSidebarCollapsed ? '4px' : '0',
                      width: isSidebarCollapsed ? '200px' : '100%',
                      minWidth: '200px',
                      background: 'var(--card)',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius)',
                      boxShadow: 'var(--shadow-lg)',
                      zIndex: 1000,
                      padding: '0.375rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.125rem'
                    }}
                  >
                    <div style={{ padding: '0.375rem 0.5rem', borderBottom: '1px solid var(--border)', marginBottom: '0.25rem' }}>
                      <div style={{ fontSize: '0.6875rem', color: 'var(--muted-foreground)' }}>Logged in as</div>
                      <div style={{ fontWeight: '600', fontSize: '0.75rem', color: 'var(--foreground)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.username}</div>
                    </div>

                    <a 
                      className="popout-item" 
                      onClick={() => { setActiveTab('profile'); setIsUserMenuOpen(false); }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.375rem',
                        padding: '0.375rem 0.5rem',
                        borderRadius: 'var(--radius)',
                        cursor: 'pointer',
                        color: activeTab === 'profile' ? 'var(--primary)' : 'var(--foreground)',
                        textDecoration: 'none',
                        fontSize: '0.75rem',
                        transition: 'var(--transition-fast)'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'var(--accent)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      <User size={14} />
                      <span>User Profile</span>
                    </a>

                    <a 
                      className="popout-item" 
                      onClick={() => { setActiveTab('settings'); setSettingsSubTab('users'); setIsUserMenuOpen(false); }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.375rem',
                        padding: '0.375rem 0.5rem',
                        borderRadius: 'var(--radius)',
                        cursor: 'pointer',
                        color: activeTab === 'settings' ? 'var(--primary)' : 'var(--foreground)',
                        textDecoration: 'none',
                        fontSize: '0.75rem',
                        transition: 'var(--transition-fast)'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'var(--accent)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      <Settings size={14} />
                      <span>Settings</span>
                    </a>

                    <a 
                      className="popout-item" 
                      onClick={() => { setActiveTab('features'); setIsUserMenuOpen(false); }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.375rem',
                        padding: '0.375rem 0.5rem',
                        borderRadius: 'var(--radius)',
                        cursor: 'pointer',
                        color: activeTab === 'features' ? 'var(--primary)' : 'var(--foreground)',
                        textDecoration: 'none',
                        fontSize: '0.75rem',
                        transition: 'var(--transition-fast)'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'var(--accent)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      <Lightbulb size={14} />
                      <span>Feature Requests</span>
                    </a>

                    <a 
                      className="popout-item" 
                      onClick={() => { setActiveTab('bugs'); setIsUserMenuOpen(false); }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.375rem',
                        padding: '0.375rem 0.5rem',
                        borderRadius: 'var(--radius)',
                        cursor: 'pointer',
                        color: activeTab === 'bugs' ? 'var(--primary)' : 'var(--foreground)',
                        textDecoration: 'none',
                        fontSize: '0.75rem',
                        transition: 'var(--transition-fast)'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'var(--accent)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      <Bug size={14} />
                      <span>Bug Reports</span>
                    </a>

                    <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '0.1875rem 0' }} />

                    <a 
                      className="popout-item" 
                      onClick={() => { handleLogout(); setIsUserMenuOpen(false); }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.375rem',
                        padding: '0.375rem 0.5rem',
                        borderRadius: 'var(--radius)',
                        cursor: 'pointer',
                        color: 'var(--destructive)',
                        textDecoration: 'none',
                        fontSize: '0.75rem',
                        transition: 'var(--transition-fast)'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'var(--accent)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      <LogOut size={14} style={{ color: 'var(--destructive)' }} />
                      <span>Logout</span>
                    </a>
                  </div>
                )}
              </div>
            )}
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

        {activeTab === 'contacts' && (
          <ContactsView showToast={showToast} />
        )}

        {activeTab === 'birthdays' && (
          <BirthdaysView showToast={showToast} />
        )}

        {activeTab === 'health' && (
          <HealthView showToast={showToast} />
        )}

        {activeTab === 'pets' && (
          <PetsView showToast={showToast} />
        )}

        {activeTab === 'dashboard' && (
          <CustomDashboardView 
            onOpenModal={() => setIsDemoModalOpen(true)}
            onNavigateTab={(tab) => {
              setActiveTab(tab);
            }}
            user={user}
            resolvedTheme={resolvedTheme}
          />
        )}

        {activeTab === 'todo' && (
          <FocusFlowTasksView 
            showToast={showToast} 
            permissions={user.role_permissions ? JSON.parse(user.role_permissions).tasks || 'full' : 'full'} 
          />
        )}

        {activeTab === 'focus_areas' && (
          <FocusAreasView 
            showToast={showToast} 
            permissions={user.role_permissions ? JSON.parse(user.role_permissions).projects || 'full' : 'full'} 
          />
        )}

        {activeTab === 'routines' && (
          <RoutinesView 
            showToast={showToast} 
            permissions={user.role_permissions ? JSON.parse(user.role_permissions).tasks || 'full' : 'full'} 
          />
        )}

        {activeTab === 'habits' && (
          <HabitsView 
            showToast={showToast} 
            permissions={user.role_permissions ? JSON.parse(user.role_permissions).tasks || 'full' : 'full'} 
          />
        )}

        {activeTab === 'focus' && (
          <FocusView 
            showToast={showToast} 
            permissions={user.role_permissions ? JSON.parse(user.role_permissions).time_logs || 'full' : 'full'} 
          />
        )}

        {activeTab === 'calendar' && (
          <CalendarView 
            showToast={showToast} 
            currentUser={user} 
          />
        )}

        {activeTab === 'money' && (
          <MoneyView 
            showToast={showToast}
            onNavigateToSettings={(subTab) => {
              setActiveTab('settings');
              setSettingsSubTab(subTab || 'integrations');
            }}
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
            currentUser={user}
          />
        )}

        {activeTab === 'recipes' && (
          <RecipesView showToast={showToast} user={user} />
        )}

        {activeTab === 'planner' && (
          <WeeklyMenu showToast={showToast} handleExportWord={handleExportWord} user={user} />
        )}

        {activeTab === 'leftovers' && (
          <LeftoversView showToast={showToast} user={user} />
        )}

        {activeTab === 'inventory' && (
          <InventoryView showToast={showToast} user={user} />
        )}

        {activeTab === 'shopping' && (
          <ShoppingList showToast={showToast} user={user} />
        )}

        {activeTab === 'housekeeping' && (
          <HousekeepingView showToast={showToast} currentUser={user} />
        )}

        {activeTab === 'library' && canReadLibrary && (
          <LibraryView showToast={showToast} currentUser={user} permissions="full" />
        )}

        {activeTab === 'reading_list' && canReadReadingList && (
          <ReadingListView showToast={showToast} currentUser={user} permissions="full" />
        )}

        {activeTab === 'reading_log' && canReadReadingLog && (
          <ReadingLogView showToast={showToast} currentUser={user} permissions="full" />
        )}

        {activeTab === 'ocr' && (
          <OCRUpload showToast={showToast} onImportSuccess={() => setActiveTab('recipes')} />
        )}

        {activeTab === 'csv' && (
          <CSVUpload showToast={showToast} onImportSuccess={() => setActiveTab('recipes')} />
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

        {activeTab === 'profile' && (
          <UserProfileView 
            showToast={showToast} 
            currentUser={user} 
            onProfileUpdate={(updatedUser) => {
              setUser(updatedUser);
              if (updatedUser.primary_color) {
                applyPrimaryColor(updatedUser.primary_color);
                localStorage.setItem('last_primary_color', updatedUser.primary_color);
              }
              if (updatedUser.navbar_bg) {
                applyNavbarBg(updatedUser.navbar_bg);
              } else {
                applyNavbarBg('');
              }
              if (updatedUser.navbar_opacity !== undefined) {
                applyNavbarOpacity(updatedUser.navbar_opacity);
              }
              if (updatedUser.app_bg) {
                applyAppBg(updatedUser.app_bg);
              } else {
                applyAppBg('');
              }
              if (updatedUser.theme) {
                setTheme(updatedUser.theme);
                applyTheme(updatedUser.theme);
                localStorage.setItem('last_theme', updatedUser.theme);
              }
              if (updatedUser.theme_info_cards !== undefined) {
                applyThemeInfoCards(updatedUser.theme_info_cards);
              }
              if (updatedUser.text_color !== undefined) {
                applyTextColor(updatedUser.text_color);
              }
              if (updatedUser.dynamic_text_color !== undefined) {
                applyDynamicTextColor(updatedUser.dynamic_text_color, updatedUser);
              }
            }}
          />
        )}
      </main>

      <FloatingActionButton activeTab={activeTab} />

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
  const [googleSsoEnabled, setGoogleSsoEnabled] = useState(false);
  
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

    const lastBg = localStorage.getItem('last_navbar_bg');
    if (lastBg) {
      const value = lastBg.startsWith('linear-gradient') || lastBg.startsWith('radial-gradient')
        ? lastBg
        : `url(${lastBg})`;
      document.documentElement.style.setProperty('--navbar-bg', value);
    } else {
      document.documentElement.style.setProperty('--navbar-bg', 'none');
    }

    const lastOpacity = localStorage.getItem('last_navbar_opacity') || '0.75';
    document.documentElement.style.setProperty('--navbar-opacity', lastOpacity);

    const lastAppBg = localStorage.getItem('last_app_bg');
    if (lastAppBg) {
      document.documentElement.style.setProperty('--app-bg', `url(${lastAppBg})`);
    } else {
      document.documentElement.style.setProperty('--app-bg', 'none');
    }

    const lastThemeInfoCards = localStorage.getItem('last_theme_info_cards') || '0';
    const rootEl = document.documentElement;
    if (lastThemeInfoCards === '1' || lastThemeInfoCards === 'true') {
      rootEl.classList.add('cards-themed');
    } else {
      rootEl.classList.remove('cards-themed');
    }

    const lastTextColor = localStorage.getItem('last_text_color') || 'white';
    if (lastTextColor === 'white') {
      rootEl.classList.add('force-text-white');
      rootEl.classList.remove('force-text-black');
    } else {
      rootEl.classList.add('force-text-black');
      rootEl.classList.remove('force-text-white');
    }

    const lastDynamicTextColor = localStorage.getItem('last_dynamic_text_color') || '0';
    if (lastDynamicTextColor === '1' || lastDynamicTextColor === 'true') {
      rootEl.classList.add('dynamic-text-active');
      const isSystemDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      const resolvedTheme = lastTheme === 'system' ? (isSystemDark ? 'dark' : 'light') : lastTheme;
      let shouldBeLight = resolvedTheme === 'dark';
      if (lastAppBg) {
        shouldBeLight = true;
      }
      const lastColor = localStorage.getItem('last_primary_color') || '#2c3e50';
      const calculatedColor = getColoredContrastColor(lastColor, shouldBeLight);
      rootEl.style.setProperty('--dynamic-text-color', calculatedColor);
    } else {
      rootEl.classList.remove('dynamic-text-active');
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

    // Check Google SSO Status
    fetch('/api/auth/google/config')
      .then(res => res.json())
      .then(data => {
        if (data.google_sso_enabled) {
          setGoogleSsoEnabled(true);
        }
      })
      .catch(err => console.error('Failed to load Google SSO config:', err));
  }, []);

  useEffect(() => {
    document.title = appName;
  }, [appName]);

  const handleOidcLogin = () => {
    window.location.href = '/api/auth/oidc/login';
  };

  const handleGoogleLogin = () => {
    window.location.href = '/api/auth/google/login';
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
        {(oidcEnabled || googleSsoEnabled) && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', margin: '1.25rem 0', gap: '0.5rem' }}>
              <div style={{ flex: 1, height: '1px', background: borderLineColor }} />
              <span style={{ fontSize: '0.6875rem', ...separatorStyle, textTransform: 'uppercase', letterSpacing: '0.05em' }}>or</span>
              <div style={{ flex: 1, height: '1px', background: borderLineColor }} />
            </div>
            
            {googleSsoEnabled && (
              <button 
                type="button" 
                className="btn" 
                onClick={handleGoogleLogin}
                style={{ 
                  width: '100%', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  gap: '0.5rem',
                  marginBottom: oidcEnabled ? '0.5rem' : '0',
                  ...microsoftButtonStyle
                }}
              >
                <svg width="16" height="16" viewBox="0 0 48 48">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                  <path fill="#4285F4" d="M46.5 24c0-1.63-.15-3.2-.43-4.75H24v9h12.75c-.55 2.87-2.17 5.31-4.61 6.94l7.2 5.58C43.54 36.62 46.5 30.91 46.5 24z"/>
                  <path fill="#FBBC05" d="M10.54 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.98-6.19z"/>
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.2-5.58c-2 1.34-4.55 2.13-8.69 2.13-6.26 0-11.57-4.22-13.46-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                </svg>
                Sign in with Google
              </button>
            )}

            {oidcEnabled && (
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
            )}
          </>
        )}
      </div>
    </div>
  );
}
