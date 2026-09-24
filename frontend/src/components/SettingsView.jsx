import React, { useState, useEffect } from 'react';
import { 
  Settings, Save, RotateCcw, Palette, Laptop, Sun, Moon, Users, Shield, Plus, 
  Trash2, Edit2, Calendar, Lock, User, Clock, Key, Copy, Eye, EyeOff, Code, 
  Cpu, Bell, Mail, MessageSquare, Webhook, Info, Layers, ExternalLink, Play, 
  CheckCircle2, DollarSign, CreditCard, Receipt, AlertCircle, Check, CheckSquare, 
  Square, RefreshCw, Landmark, ArrowRightLeft, LogIn, LogOut, KeyRound, Radio, 
  Bookmark, Sparkles, Github, GitBranch, ChevronDown, ChevronRight, Search, 
  ChefHat, ShoppingCart, ListTodo, BookOpen, Heart, Terminal, FileText, Database,
  Sliders, Server, Globe, ShieldCheck
} from 'lucide-react';
import WordTemplateExport from './WordTemplateExport';

const CATEGORIES_LABELS = {
  recipes: 'Create/Manage Recipes',
  planner: 'Weekly Meal Plan',
  shopping_list: 'Shopping List',
  users: 'User Management',
  roles: 'Role Management',
  settings_general: 'Settings: General',
  settings_users: 'Settings: User List/Admin',
  settings_roles: 'Settings: Role & RBAC',
  settings_sso: 'Settings: SSO Config',
  settings_branding: 'Settings: Branding Config',
  settings_calendar: 'Settings: Calendar Sync'
};

export default function SettingsView({ showToast, onSettingsChange, currentUser, activeSubTab, setActiveSubTab }) {
  
  // User Profile personal settings states
  const [displayName, setDisplayName] = useState(currentUser?.display_name || '');
  const [calendarGuid, setCalendarGuid] = useState(currentUser?.calendar_guid || '');
  const [timezone, setTimezone] = useState(currentUser?.timezone || 'US/New_York');
  const [availableCalendars, setAvailableCalendars] = useState([]);
  const [calendarSyncMappings, setCalendarSyncMappings] = useState({
    events: currentUser?.calendar_sync_mappings?.events || currentUser?.calendar_guid || '',
    holidays: currentUser?.calendar_sync_mappings?.holidays || '',
    tasks: currentUser?.calendar_sync_mappings?.tasks || '',
    bills: currentUser?.calendar_sync_mappings?.bills || '',
    subscriptions: currentUser?.calendar_sync_mappings?.subscriptions || '',
    birthdays: currentUser?.calendar_sync_mappings?.birthdays || '',
    meals: currentUser?.calendar_sync_mappings?.meals || ''
  });

  const fetchCalendarSyncMappings = async () => {
    try {
      const res = await fetch('/api/users/calendar-sync-mappings');
      if (res.ok) {
        const data = await res.json();
        if (data.mappings) {
          setCalendarSyncMappings(prev => ({
            ...prev,
            ...data.mappings
          }));
        }
      }
    } catch (err) {
      console.error('Failed to fetch calendar sync mappings:', err);
    }
  };

  useEffect(() => {
    const targetSubTab = sessionStorage.getItem('temp_settings_subtab');
    if (targetSubTab) {
      setActiveSubTab(targetSubTab);
      sessionStorage.removeItem('temp_settings_subtab');
    }
    const calendarsData = sessionStorage.getItem('temp_calendars_list');
    if (calendarsData) {
      try {
        setAvailableCalendars(JSON.parse(calendarsData));
      } catch (e) {
        console.error('Failed to parse available calendars:', e);
      }
    }
    if (currentUser?.auth_provider === 'sso') {
      fetchCalendarSyncMappings();
    }
  }, []);

  // Local user password reset states
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resettingPassword, setResettingPassword] = useState(false);

  // App Settings states
  const [appName, setAppName] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#2c3e50');
  const [theme, setTheme] = useState('system');
  const [accentColor, setAccentColor] = useState('#3498db');
  const [borderRadius, setBorderRadius] = useState('medium');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  // Helper to expand and format accent color for HTML color picker
  const getValidColorPickerValue = (colorStr) => {
    if (!colorStr) return '#d35400';
    let s = colorStr.trim();
    if (!s.startsWith('#')) {
      s = '#' + s;
    }
    // Expand 3-digit hex (#rgb) to 6-digit hex (#rrggbb)
    if (/^#[0-9A-Fa-f]{3}$/.test(s)) {
      return '#' + s[1] + s[1] + s[2] + s[2] + s[3] + s[3];
    }
    if (/^#[0-9A-Fa-f]{6}$/.test(s)) {
      return s;
    }
    return '#d35400';
  };

  // OIDC Settings states
  const [oidcEnabled, setOidcEnabled] = useState(false);
  const [oidcClientId, setOidcClientId] = useState('');
  const [oidcClientSecret, setOidcClientSecret] = useState('');
  const [oidcTenantId, setOidcTenantId] = useState('');
  const [oidcRedirectUri, setOidcRedirectUri] = useState('');
  const [oidcAutoProvision, setOidcAutoProvision] = useState(true);
  const [oidcDefaultRole, setOidcDefaultRole] = useState('Viewer');

  // Google SSO Settings states
  const [googleSsoEnabled, setGoogleSsoEnabled] = useState(false);
  const [googleClientId, setGoogleClientId] = useState('');
  const [googleClientSecret, setGoogleClientSecret] = useState('');
  const [googleAutoProvision, setGoogleAutoProvision] = useState(true);
  const [googleDefaultRole, setGoogleDefaultRole] = useState('Viewer');

  // Branding Settings states
  const [brandingIcon, setBrandingIcon] = useState('🍳');
  const [brandingLogo, setBrandingLogo] = useState('');
  const [brandingLogoLight, setBrandingLogoLight] = useState('');
  const [brandingLogoDark, setBrandingLogoDark] = useState('');
  const [brandingFavicon, setBrandingFavicon] = useState('');

  // User Management states
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [userFormOpen, setUserFormOpen] = useState(false);
  const [editUser, setEditUser] = useState(null); // { id, username, role_id } or null
  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [roleSelectInput, setRoleSelectInput] = useState('');
  const [hideFromContactsInput, setHideFromContactsInput] = useState(false);

  // Role Management states
  const [roleFormOpen, setRoleFormOpen] = useState(false);
  const [editRole, setEditRole] = useState(null); // { id, name, permissions } or null
  const [roleNameInput, setRoleNameInput] = useState('');
  const [rolePermsInput, setRolePermsInput] = useState({
    recipes: 'none',
    planner: 'none',
    shopping_list: 'none',
    users: 'none',
    roles: 'none',
    settings_general: 'none',
    settings_users: 'none',
    settings_roles: 'none',
    settings_sso: 'none',
    settings_branding: 'none',
    settings_calendar: 'none'
  });

  // Integrations states
  const [apiKey, setApiKey] = useState(null);
  const [revealKey, setRevealKey] = useState(false);
  const [loadingApiKey, setLoadingApiKey] = useState(false);
  
  // Dashboard & Multi-Link Sharing states
  const [dashboardsList, setDashboardsList] = useState([]);
  const [dashboardShares, setDashboardShares] = useState([]);
  const [loadingShares, setLoadingShares] = useState(false);
  const [isCreateShareModalOpen, setIsCreateShareModalOpen] = useState(false);
  const [newShareName, setNewShareName] = useState('');
  const [newShareTargetType, setNewShareTargetType] = useState('single');
  const [newShareDashboardId, setNewShareDashboardId] = useState('default');
  const [newShareRotationInterval, setNewShareRotationInterval] = useState(30);
  const [newShareRotationDashboards, setNewShareRotationDashboards] = useState([]);
  const [revealedShareTokens, setRevealedShareTokens] = useState({});

  // Legacy single share token state for backward compatibility
  const [shareToken, setShareToken] = useState('');
  const [revealShareToken, setRevealShareToken] = useState(false);
  const [loadingShareToken, setLoadingShareToken] = useState(false);

  // About Page & API Documentation states
  const [versionInfo, setVersionInfo] = useState({
    version: '1.0.0',
    commit: '',
    build: '',
    repository: 'https://github.com/jwagner77/family_app',
    node_version: ''
  });
  const [loadingVersion, setLoadingVersion] = useState(false);
  const [isApiDocsOpen, setIsApiDocsOpen] = useState(false);
  const [apiDocsFilter, setApiDocsFilter] = useState('all');
  const [apiDocsSearch, setApiDocsSearch] = useState('');
  const [expandedEndpoints, setExpandedEndpoints] = useState({});

  const toggleEndpointExpand = (idx) => {
    setExpandedEndpoints(prev => ({
      ...prev,
      [idx]: !prev[idx]
    }));
  };

  const fetchVersionInfo = async () => {
    setLoadingVersion(true);
    try {
      const res = await fetch('/api/version');
      if (res.ok) {
        const data = await res.json();
        setVersionInfo(data);
      }
    } catch (err) {
      console.error('Failed to fetch app version:', err);
    } finally {
      setLoadingVersion(false);
    }
  };

  const [mtgUrl, setMtgUrl] = useState('');
  const [mtgKey, setMtgKey] = useState('');
  const [libraryUrl, setLibraryUrl] = useState('');
  const [libraryKey, setLibraryKey] = useState('');
  const [taskUrl, setTaskUrl] = useState('');
  const [taskKey, setTaskKey] = useState('');
  const [unsplashKey, setUnsplashKey] = useState('');
  const [unsplashAppId, setUnsplashAppId] = useState('');
  const [unsplashSecret, setUnsplashSecret] = useState('');
  const [weatherLocation, setWeatherLocation] = useState('10001');
  const [weatherUnit, setWeatherUnit] = useState('fahrenheit');
  const [githubIntegrationEnabled, setGithubIntegrationEnabled] = useState(false);
  const [githubOwner, setGithubOwner] = useState('');
  const [githubRepo, setGithubRepo] = useState('');
  const [githubToken, setGithubToken] = useState('');
  const [googleBooksApiKey, setGoogleBooksApiKey] = useState('');
  const [isbndbApiKey, setIsbndbApiKey] = useState('');
  const [monarchToken, setMonarchToken] = useState('');
  const [revealMonarchToken, setRevealMonarchToken] = useState(false);
  const [editingMonarchToken, setEditingMonarchToken] = useState(false);
  const [editedTokenInput, setEditedTokenInput] = useState('');
  const [testingMonarchConnection, setTestingMonarchConnection] = useState(false);
  const [monarchPairId, setMonarchPairId] = useState('');
  const [monarchListening, setMonarchListening] = useState(false);
  const [monarchStartingPair, setMonarchStartingPair] = useState(false);
  const [manualTokenInput, setManualTokenInput] = useState('');
  const [showManualTokenInput, setShowManualTokenInput] = useState(false);
  const [monarchEmail, setMonarchEmail] = useState('');
  const [monarchPassword, setMonarchPassword] = useState('');
  const [revealMonarchPassword, setRevealMonarchPassword] = useState(false);
  const [monarchTotp, setMonarchTotp] = useState('');
  const [monarchRequiresMfa, setMonarchRequiresMfa] = useState(false);
  const [monarchAuthenticating, setMonarchAuthenticating] = useState(false);
  const [monarchConnected, setMonarchConnected] = useState(null);
  const [monarchStatusMsg, setMonarchStatusMsg] = useState('');
  const [monarchAccounts, setMonarchAccounts] = useState([]);
  const [monarchEnabledAccountIds, setMonarchEnabledAccountIds] = useState([]);
  const [monarchRecurringList, setMonarchRecurringList] = useState([]);
  const [monarchRecurringMappings, setMonarchRecurringMappings] = useState({});
  const [loadingMonarchData, setLoadingMonarchData] = useState(false);
  const [syncingMonarch, setSyncingMonarch] = useState(false);
  const [savingIntegrations, setSavingIntegrations] = useState(false);

  const [dashboardRefreshInterval, setDashboardRefreshInterval] = useState('disabled');
  const [dashboardBgType, setDashboardBgType] = useState('theme');
  const [dashboardBgValue, setDashboardBgValue] = useState('');
  const [dashboardBgUnsplashKeywords, setDashboardBgUnsplashKeywords] = useState('');
  const [dashboardRotationEnabled, setDashboardRotationEnabled] = useState(false);
  const [dashboardRotationInterval, setDashboardRotationInterval] = useState('30');
  const [dashboardRotationDashboards, setDashboardRotationDashboards] = useState([]);
  const [uploadingBg, setUploadingBg] = useState(false);

  const [calendarEventColor, setCalendarEventColor] = useState('#3b82f6');
  const [calendarHolidayColor, setCalendarHolidayColor] = useState('#f97316');
  const [calendarTaskColor, setCalendarTaskColor] = useState('#10b981');
  const [calendarBillColor, setCalendarBillColor] = useState('#ef4444');
  const [calendarSubColor, setCalendarSubColor] = useState('#8b5cf6');
  const [calendarContactEventColor, setCalendarContactEventColor] = useState('#ec4899');

  const fetchDashboardsList = async () => {
    try {
      const res = await fetch('/api/dashboards');
      if (res.ok) {
        const data = await res.json();
        setDashboardsList(data);
        if (data.length > 0 && (!newShareDashboardId || newShareDashboardId === 'default')) {
          const def = data.find(d => d.is_default) || data[0];
          setNewShareDashboardId(def.id);
        }
      }
    } catch (e) {
      console.error('Error fetching dashboards list:', e);
    }
  };

  const fetchDashboardShares = async () => {
    setLoadingShares(true);
    try {
      const res = await fetch('/api/dashboard/shares');
      if (res.ok) {
        const data = await res.json();
        setDashboardShares(data);
      }
    } catch (e) {
      console.error('Error fetching dashboard shares:', e);
    } finally {
      setLoadingShares(false);
    }
  };

  const handleCreateShareLink = async (e) => {
    e.preventDefault();
    if (!newShareName.trim()) return;

    try {
      const res = await fetch('/api/dashboard/shares', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newShareName.trim(),
          target_type: newShareTargetType,
          dashboard_id: newShareTargetType === 'single' ? (newShareDashboardId || 'default') : null,
          rotation_interval: Number(newShareRotationInterval || 30),
          rotation_dashboards: newShareTargetType === 'rotation' ? (newShareRotationDashboards.length > 0 ? newShareRotationDashboards : null) : null
        })
      });
      if (res.ok) {
        showToast('Public dashboard share link created successfully!', 'success');
        setIsCreateShareModalOpen(false);
        setNewShareName('');
        fetchDashboardShares();
      } else {
        const err = await res.json().catch(() => ({}));
        showToast(err.error || 'Failed to create share link', 'error');
      }
    } catch (e) {
      showToast('Failed to create share link', 'error');
    }
  };

  const handleDeleteShareLink = async (id, name) => {
    if (!window.confirm(`Are you sure you want to revoke and delete the share link "${name}"? Anyone using this link will lose access immediately.`)) return;

    try {
      const res = await fetch(`/api/dashboard/shares/${id}`, { method: 'DELETE' });
      if (res.ok) {
        showToast(`Share link "${name}" deleted.`, 'success');
        fetchDashboardShares();
      } else {
        const err = await res.json().catch(() => ({}));
        showToast(err.error || 'Failed to delete share link', 'error');
      }
    } catch (e) {
      showToast('Failed to delete share link', 'error');
    }
  };

  const fetchShareToken = async () => {
    setLoadingShareToken(true);
    try {
      const res = await fetch('/api/settings/share-token');
      if (res.ok) {
        const data = await res.json();
        setShareToken(data.share_token || '');
      }
    } catch (e) {
      console.error('Error fetching share token:', e);
    } finally {
      setLoadingShareToken(false);
    }
  };

  const handleGenerateShareToken = async () => {
    setLoadingShareToken(true);
    try {
      const res = await fetch('/api/settings/share-token', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setShareToken(data.share_token);
        showToast('Shared dashboard token generated successfully!', 'success');
        fetchDashboardShares();
      } else {
        throw new Error(data.error || 'Failed to generate token');
      }
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoadingShareToken(false);
    }
  };

  const handleRevokeShareToken = async () => {
    if (!window.confirm('Are you sure you want to revoke the shared dashboard token? The public read-only link will stop working immediately.')) return;
    setLoadingShareToken(true);
    try {
      const res = await fetch('/api/settings/share-token', { method: 'DELETE' });
      if (res.ok) {
        setShareToken('');
        showToast('Shared dashboard token revoked successfully!', 'success');
        fetchDashboardShares();
      } else {
        const data = await res.json();
        throw new Error(data.error || 'Failed to revoke token');
      }
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoadingShareToken(false);
    }
  };

  // Fetch API key helper
  const fetchApiKey = async () => {
    setLoadingApiKey(true);
    try {
      const res = await fetch('/api/settings/api-key');
      if (res.ok) {
        const data = await res.json();
        setApiKey(data.api_key || null);
      } else {
        const err = await res.json().catch(() => ({}));
        console.error('Failed to fetch API key:', err.error);
      }
    } catch (e) {
      console.error('Error fetching API key:', e);
    } finally {
      setLoadingApiKey(false);
    }
  };

  const handleGenerateApiKey = async () => {
    const confirmMsg = apiKey 
      ? 'Are you sure you want to regenerate the API key? Any existing integrations using the current key will stop working immediately.'
      : 'Are you sure you want to generate a new API key?';
    if (!window.confirm(confirmMsg)) return;

    setLoadingApiKey(true);
    try {
      const res = await fetch('/api/settings/api-key', {
        method: 'POST',
      });
      const data = await res.json();
      if (res.ok) {
        setApiKey(data.api_key);
        showToast('API key generated successfully!', 'success');
      } else {
        throw new Error(data.error || 'Failed to generate API key');
      }
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoadingApiKey(false);
    }
  };

  const handleRevokeApiKey = async () => {
    if (!window.confirm('Are you sure you want to revoke the API key? Any existing integrations using this key will fail.')) return;

    setLoadingApiKey(true);
    try {
      const res = await fetch('/api/settings/api-key', {
        method: 'DELETE',
      });
      const data = await res.json();
      if (res.ok) {
        setApiKey(null);
        showToast('API key revoked successfully!', 'success');
      } else {
        throw new Error(data.error || 'Failed to revoke API key');
      }
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoadingApiKey(false);
    }
  };

  const handleCopyText = (text, label) => {
    navigator.clipboard.writeText(text);
    showToast(`${label} copied to clipboard!`, 'success');
  };

  const fetchMonarchDetails = async () => {
    setLoadingMonarchData(true);
    setMonarchStatusMsg('');
    try {
      const [accRes, recRes] = await Promise.all([
        fetch('/api/monarch/accounts'),
        fetch('/api/monarch/recurring')
      ]);

      if (accRes.ok) {
        const accData = await accRes.json();
        const accs = accData.accounts || [];
        setMonarchAccounts(accs);
        setMonarchConnected(true);
        setMonarchStatusMsg(`Successfully loaded ${accs.length} account${accs.length === 1 ? '' : 's'} from Monarch.`);
        if (accData.enabledAccountIds && accData.enabledAccountIds.length > 0) {
          setMonarchEnabledAccountIds(accData.enabledAccountIds);
        } else {
          setMonarchEnabledAccountIds(accs.map(a => a.id));
        }
      } else {
        const err = await accRes.json().catch(() => ({}));
        if (accRes.status === 400 || accRes.status === 401 || accRes.status === 500) {
          setMonarchStatusMsg(err.error || 'Monarch authentication failed or token expired.');
        }
      }

      if (recRes.ok) {
        const recData = await recRes.json();
        setMonarchRecurringList(recData.recurring || []);
        setMonarchRecurringMappings(recData.mappings || {});
      }
    } catch (err) {
      console.error('Failed to load Monarch details:', err);
      setMonarchStatusMsg('Connection error: ' + err.message);
    } finally {
      setLoadingMonarchData(false);
    }
  };

  const handleTestMonarchConnection = async () => {
    if (!monarchToken) {
      showToast('No active Monarch token to test.', 'error');
      return;
    }
    setTestingMonarchConnection(true);
    try {
      const res = await fetch('/api/monarch/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: monarchToken })
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        showToast(data.message || `Connected! Found ${data.accountCount} accounts.`, 'success');
        setMonarchStatusMsg(`Active connection verified: ${data.accountCount} accounts detected.`);
        await fetchMonarchDetails();
      } else {
        throw new Error(data.error || 'Connection failed');
      }
    } catch (err) {
      showToast('Monarch Connection Failed: ' + err.message, 'error');
      setMonarchStatusMsg('Authentication error: ' + err.message);
    } finally {
      setTestingMonarchConnection(false);
    }
  };

  const handleUpdateExistingToken = async () => {
    if (!editedTokenInput.trim()) {
      showToast('Please enter a valid Monarch token.', 'error');
      return;
    }
    try {
      const res = await fetch('/api/monarch/capture-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: editedTokenInput.trim() })
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setMonarchToken(editedTokenInput.trim());
        setEditingMonarchToken(false);
        setMonarchConnected(true);
        showToast('Monarch token updated successfully!', 'success');
        await fetchMonarchDetails();
      } else {
        throw new Error(data.error || 'Failed to update token');
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleStartMonarchLogin = async () => {
    setMonarchStartingPair(true);
    setMonarchStatusMsg('');
    try {
      const res = await fetch('/api/monarch/pair-init', { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.pairId) {
        setMonarchPairId(data.pairId);
        setMonarchListening(true);
        window.open('https://app.monarchmoney.com/login', '_blank');
        showToast('Monarch Login opened in new tab. Waiting for token pass-through...', 'info');
      } else {
        throw new Error(data.error || 'Failed to initialize Monarch login session');
      }
    } catch (err) {
      showToast('Error starting Monarch login: ' + err.message, 'error');
    } finally {
      setMonarchStartingPair(false);
    }
  };

  const handleStopListening = () => {
    setMonarchListening(false);
    setMonarchPairId('');
  };

  // Poll for pairing status and listen for window postMessage
  useEffect(() => {
    if (!monarchListening || !monarchPairId) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/monarch/pairing-status/${monarchPairId}`);
        if (res.ok) {
          const data = await res.json();
          if (data.paired || data.tokenReceived) {
            clearInterval(interval);
            setMonarchListening(false);
            setMonarchConnected(true);
            showToast('Monarch Money linked successfully! Token captured.', 'success');
            // Refresh settings to get newly captured token
            const setRes = await fetch('/api/settings');
            if (setRes.ok) {
              const setData = await setRes.json();
              if (setData.monarch_token) setMonarchToken(setData.monarch_token);
            }
            await fetchMonarchDetails();
          } else if (data.expired) {
            clearInterval(interval);
            setMonarchListening(false);
            showToast('Monarch login session expired. Please click to open again.', 'info');
          }
        }
      } catch (err) {
        console.error('Error checking pairing status:', err);
      }
    }, 2500);

    const onMessage = async (event) => {
      if (event.data && (event.data.type === 'MONARCH_TOKEN_CAPTURED' || event.data.type === 'MONARCH_TOKEN')) {
        clearInterval(interval);
        setMonarchListening(false);
        setMonarchConnected(true);
        if (event.data.token) setMonarchToken(event.data.token);
        showToast('Monarch Money linked successfully! Token captured.', 'success');
        await fetchMonarchDetails();
      }
    };

    window.addEventListener('message', onMessage);

    return () => {
      clearInterval(interval);
      window.removeEventListener('message', onMessage);
    };
  }, [monarchListening, monarchPairId]);

  const handleSaveManualToken = async (e) => {
    if (e) e.preventDefault();
    if (!manualTokenInput.trim()) {
      showToast('Please enter a valid Monarch token.', 'error');
      return;
    }
    try {
      const res = await fetch('/api/monarch/capture-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: manualTokenInput.trim() })
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setMonarchToken(manualTokenInput.trim());
        setMonarchConnected(true);
        setShowManualTokenInput(false);
        setManualTokenInput('');
        showToast('Monarch token saved and connected!', 'success');
        await fetchMonarchDetails();
      } else {
        throw new Error(data.error || 'Failed to save token');
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleDisconnectMonarch = async () => {
    if (!window.confirm('Are you sure you want to disconnect Monarch Money? Live data sync will be paused until re-authenticated.')) return;
    try {
      const res = await fetch('/api/monarch/disconnect', { method: 'POST' });
      if (res.ok) {
        setMonarchToken('');
        setMonarchConnected(false);
        setMonarchAccounts([]);
        setMonarchRecurringList([]);
        setMonarchStatusMsg('Monarch Money disconnected.');
        showToast('Monarch Money disconnected successfully.', 'success');
      }
    } catch (err) {
      showToast('Failed to disconnect Monarch: ' + err.message, 'error');
    }
  };

  const handleSyncMonarch = async () => {
    setSyncingMonarch(true);
    try {
      const res = await fetch('/api/monarch/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enabledAccountIds: monarchEnabledAccountIds,
          mappings: monarchRecurringMappings
        })
      });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message || 'Monarch recurring items synced successfully!', 'success');
      } else {
        throw new Error(data.error || 'Failed to sync Monarch data');
      }
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSyncingMonarch(false);
    }
  };

  const toggleAllMonarchAccounts = (selectAll) => {
    if (selectAll) {
      setMonarchEnabledAccountIds(monarchAccounts.map(a => a.id));
    } else {
      setMonarchEnabledAccountIds([]);
    }
  };

  const toggleMonarchAccount = (accId) => {
    setMonarchEnabledAccountIds(prev => 
      prev.includes(accId) ? prev.filter(id => id !== accId) : [...prev, accId]
    );
  };

  const updateRecurringMapping = (item, type, customFields = {}) => {
    setMonarchRecurringMappings(prev => ({
      ...prev,
      [item.id]: {
        type, // 'bill' | 'subscription' | 'none'
        name: customFields.name !== undefined ? customFields.name : (prev[item.id]?.name || item.merchantName),
        amount: customFields.amount !== undefined ? customFields.amount : (prev[item.id]?.amount !== undefined ? prev[item.id].amount : item.amount),
        cycle: customFields.cycle !== undefined ? customFields.cycle : (prev[item.id]?.cycle || (item.frequency === 'ANNUAL' ? 'annual' : 'monthly')),
        nextDate: customFields.nextDate !== undefined ? customFields.nextDate : (prev[item.id]?.nextDate || item.nextDate),
        tag: customFields.tag !== undefined ? customFields.tag : (prev[item.id]?.tag || item.categoryName || 'Utilities'),
        category: customFields.category !== undefined ? customFields.category : (prev[item.id]?.category || item.categoryName || 'Entertainment'),
        accountName: item.accountName || ''
      }
    }));
  };

  useEffect(() => {
    if (activeSubTab === 'integrations' && currentUser?.role_name === 'Administrator') {
      fetchApiKey();
      fetchShareToken();
      if (monarchToken) {
        fetchMonarchDetails();
      }
    }
    if (activeSubTab === 'about') {
      fetchVersionInfo();
      if (currentUser?.role_name === 'Administrator' && !apiKey) {
        fetchApiKey();
      }
    }
  }, [activeSubTab]);

  // Notification states
  const [notifySmtpHost, setNotifySmtpHost] = useState('');
  const [notifySmtpPort, setNotifySmtpPort] = useState('');
  const [notifySmtpSecure, setNotifySmtpSecure] = useState(false);
  const [notifySmtpUser, setNotifySmtpUser] = useState('');
  const [notifySmtpPass, setNotifySmtpPass] = useState('');
  const [notifySmtpFrom, setNotifySmtpFrom] = useState('');
  const [notifySmtpTo, setNotifySmtpTo] = useState('');
  
  const [notifyDiscordWebhookUrl, setNotifyDiscordWebhookUrl] = useState('');
  
  const [notifyWebhookUrl, setNotifyWebhookUrl] = useState('');
  const [notifyWebhookSecret, setNotifyWebhookSecret] = useState('');
  
  const [frNotifySmtpEnabled, setFrNotifySmtpEnabled] = useState(false);
  const [frNotifySmtpTo, setFrNotifySmtpTo] = useState('');
  const [frNotifyDiscordEnabled, setFrNotifyDiscordEnabled] = useState(false);
  const [frNotifyDiscordWebhookUrl, setFrNotifyDiscordWebhookUrl] = useState('');
  const [frNotifyWebhookEnabled, setFrNotifyWebhookEnabled] = useState(false);
  const [frNotifyWebhookUrl, setFrNotifyWebhookUrl] = useState('');

  const [bugNotifySmtpEnabled, setBugNotifySmtpEnabled] = useState(false);
  const [bugNotifySmtpTo, setBugNotifySmtpTo] = useState('');
  const [bugNotifyDiscordEnabled, setBugNotifyDiscordEnabled] = useState(false);
  const [bugNotifyDiscordWebhookUrl, setBugNotifyDiscordWebhookUrl] = useState('');
  const [bugNotifyWebhookEnabled, setBugNotifyWebhookEnabled] = useState(false);
  const [bugNotifyWebhookUrl, setBugNotifyWebhookUrl] = useState('');

  // Toggles
  const [notifySubscriptionDueToday, setNotifySubscriptionDueToday] = useState(false);
  const [notifyBillDueToday, setNotifyBillDueToday] = useState(false);
  const [notifyRecipeAdded, setNotifyRecipeAdded] = useState(false);
  const [notifyRecipeDeleted, setNotifyRecipeDeleted] = useState(false);
  const [notifyMealPlanUpdated, setNotifyMealPlanUpdated] = useState(false);
  const [notifyLeftoversAdded, setNotifyLeftoversAdded] = useState(false);
  const [notifyLeftoversExpiring, setNotifyLeftoversExpiring] = useState(false);
  const [notifyInventoryExpiring, setNotifyInventoryExpiring] = useState(false);
  const [notifyLeftoversExpiryDays, setNotifyLeftoversExpiryDays] = useState(2);
  const [notifyInventoryExpiryDays, setNotifyInventoryExpiryDays] = useState(3);
  const [notifyBookAdded, setNotifyBookAdded] = useState(false);
  const [notifyBookDeleted, setNotifyBookDeleted] = useState(false);
  const [notifyLogAdded, setNotifyLogAdded] = useState(false);
  const [notifyBookStarted, setNotifyBookStarted] = useState(false);
  const [notifyBookCompleted, setNotifyBookCompleted] = useState(false);
  
  // Log list
  const [notificationLogs, setNotificationLogs] = useState([]);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const [savingNotifications, setSavingNotifications] = useState(false);

  const fetchNotificationSettings = async () => {
    try {
      const res = await fetch('/api/notifications/settings');
      if (res.ok) {
        const data = await res.json();
        setNotifySmtpHost(data.notify_smtp_host || '');
        setNotifySmtpPort(data.notify_smtp_port || '');
        setNotifySmtpSecure(data.notify_smtp_secure === 'true');
        setNotifySmtpUser(data.notify_smtp_user || '');
        setNotifySmtpPass(data.notify_smtp_pass || '');
        setNotifySmtpFrom(data.notify_smtp_from || '');
        setNotifySmtpTo(data.notify_smtp_to || '');
        setNotifyDiscordWebhookUrl(data.notify_discord_webhook_url || '');
        setNotifyWebhookUrl(data.notify_webhook_url || '');
        setNotifyWebhookSecret(data.notify_webhook_secret || '');
        setNotifySubscriptionDueToday(data.notify_subscription_due_today === 'true');
        setNotifyBillDueToday(data.notify_bill_due_today === 'true');
        setNotifyRecipeAdded(data.notify_recipe_added === 'true');
        setNotifyRecipeDeleted(data.notify_recipe_deleted === 'true');
        setNotifyMealPlanUpdated(data.notify_meal_plan_updated === 'true');
        setNotifyLeftoversAdded(data.notify_leftovers_added === 'true');
        setNotifyLeftoversExpiring(data.notify_leftovers_expiring === 'true');
        setNotifyInventoryExpiring(data.notify_inventory_expiring === 'true');
        setNotifyLeftoversExpiryDays(parseInt(data.notify_leftovers_expiry_days, 10) || 2);
        setNotifyInventoryExpiryDays(parseInt(data.notify_inventory_expiry_days, 10) || 3);
        setNotifyBookAdded(data.notify_book_added === 'true');
        setNotifyBookDeleted(data.notify_book_deleted === 'true');
        setNotifyLogAdded(data.notify_log_added === 'true');
        setNotifyBookStarted(data.notify_book_started === 'true');
        setNotifyBookCompleted(data.notify_book_completed === 'true');

        setFrNotifySmtpEnabled(data.fr_notify_smtp_enabled === 'true');
        setFrNotifySmtpTo(data.fr_notify_smtp_to || '');
        setFrNotifyDiscordEnabled(data.fr_notify_discord_enabled === 'true');
        setFrNotifyDiscordWebhookUrl(data.fr_notify_discord_webhook_url || '');
        setFrNotifyWebhookEnabled(data.fr_notify_webhook_enabled === 'true');
        setFrNotifyWebhookUrl(data.fr_notify_webhook_url || '');

        setBugNotifySmtpEnabled(data.bug_notify_smtp_enabled === 'true');
        setBugNotifySmtpTo(data.bug_notify_smtp_to || '');
        setBugNotifyDiscordEnabled(data.bug_notify_discord_enabled === 'true');
        setBugNotifyDiscordWebhookUrl(data.bug_notify_discord_webhook_url || '');
        setBugNotifyWebhookEnabled(data.bug_notify_webhook_enabled === 'true');
        setBugNotifyWebhookUrl(data.bug_notify_webhook_url || '');
      }
    } catch (err) {
      console.error('Failed to fetch notification settings:', err);
    }
  };

  const fetchNotificationLogs = async () => {
    setLoadingNotifications(true);
    try {
      const res = await fetch('/api/notifications/active');
      if (res.ok) {
        const logs = await res.json();
        setNotificationLogs(logs || []);
      }
    } catch (err) {
      console.error('Failed to fetch notification logs:', err);
    } finally {
      setLoadingNotifications(false);
    }
  };

  const handleSaveNotificationSettings = async (e) => {
    e.preventDefault();
    setSavingNotifications(true);
    try {
      const payload = {
        notify_smtp_host: notifySmtpHost.trim(),
        notify_smtp_port: notifySmtpPort.trim(),
        notify_smtp_secure: String(notifySmtpSecure),
        notify_smtp_user: notifySmtpUser.trim(),
        notify_smtp_pass: notifySmtpPass,
        notify_smtp_from: notifySmtpFrom.trim(),
        notify_smtp_to: notifySmtpTo.trim(),
        notify_discord_webhook_url: notifyDiscordWebhookUrl.trim(),
        notify_webhook_url: notifyWebhookUrl.trim(),
        notify_webhook_secret: notifyWebhookSecret.trim(),
        notify_subscription_due_today: String(notifySubscriptionDueToday),
        notify_bill_due_today: String(notifyBillDueToday),
        notify_recipe_added: String(notifyRecipeAdded),
        notify_recipe_deleted: String(notifyRecipeDeleted),
        notify_meal_plan_updated: String(notifyMealPlanUpdated),
        notify_leftovers_added: String(notifyLeftoversAdded),
        notify_leftovers_expiring: String(notifyLeftoversExpiring),
        notify_inventory_expiring: String(notifyInventoryExpiring),
        notify_leftovers_expiry_days: String(notifyLeftoversExpiryDays),
        notify_inventory_expiry_days: String(notifyInventoryExpiryDays),
        notify_book_added: String(notifyBookAdded),
        notify_book_deleted: String(notifyBookDeleted),
        notify_log_added: String(notifyLogAdded),
        notify_book_started: String(notifyBookStarted),
        notify_book_completed: String(notifyBookCompleted),
        
        fr_notify_smtp_enabled: String(frNotifySmtpEnabled),
        fr_notify_smtp_to: frNotifySmtpTo.trim(),
        fr_notify_discord_enabled: String(frNotifyDiscordEnabled),
        fr_notify_discord_webhook_url: frNotifyDiscordWebhookUrl.trim(),
        fr_notify_webhook_enabled: String(frNotifyWebhookEnabled),
        fr_notify_webhook_url: frNotifyWebhookUrl.trim(),

        bug_notify_smtp_enabled: String(bugNotifySmtpEnabled),
        bug_notify_smtp_to: bugNotifySmtpTo.trim(),
        bug_notify_discord_enabled: String(bugNotifyDiscordEnabled),
        bug_notify_discord_webhook_url: bugNotifyDiscordWebhookUrl.trim(),
        bug_notify_webhook_enabled: String(bugNotifyWebhookEnabled),
        bug_notify_webhook_url: bugNotifyWebhookUrl.trim()
      };

      const res = await fetch('/api/notifications/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        showToast('Notification settings saved successfully!', 'success');
      } else {
        const err = await res.json();
        throw new Error(err.error || 'Failed to save notification settings');
      }
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSavingNotifications(false);
    }
  };

  const handleClearNotificationLogs = async () => {
    if (!window.confirm('Are you sure you want to clear the notification log history?')) return;
    try {
      const res = await fetch('/api/notifications/clear', { method: 'POST' });
      if (res.ok) {
        setNotificationLogs([]);
        showToast('Notification log history cleared.', 'success');
      } else {
        const err = await res.json();
        throw new Error(err.error || 'Failed to clear logs');
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  useEffect(() => {
    if (activeSubTab === 'notifications' && currentUser?.role_name === 'Administrator') {
      fetchNotificationSettings();
      fetchNotificationLogs();
    }
  }, [activeSubTab]);

  // Granular settings page permissions
  const canReadGeneral = currentUser?.permissions?.settings_general !== 'none';
  const canManageGeneral = currentUser?.permissions?.settings_general === 'full';
  
  const canReadUsers = (currentUser?.permissions?.settings_users !== 'none') || (currentUser?.permissions?.users !== 'none');
  const canManageUsers = (currentUser?.permissions?.settings_users === 'full') || (currentUser?.permissions?.users === 'full');
  
  const canReadRoles = (currentUser?.permissions?.settings_roles !== 'none') || (currentUser?.permissions?.roles !== 'none');
  const canManageRoles = (currentUser?.permissions?.settings_roles === 'full') || (currentUser?.permissions?.roles === 'full');
  
  const canReadSSO = (currentUser?.permissions?.settings_sso !== 'none') || (currentUser?.permissions?.roles === 'full');
  const canManageSSO = (currentUser?.permissions?.settings_sso === 'full') || (currentUser?.permissions?.roles === 'full');
  
  const canReadBranding = (currentUser?.permissions?.settings_branding !== 'none') || (currentUser?.permissions?.roles === 'full');
  const canManageBranding = (currentUser?.permissions?.settings_branding === 'full') || (currentUser?.permissions?.roles === 'full');
  
  const canReadCalendar = (currentUser?.permissions?.settings_calendar !== 'none');

  // Fetch all settings, users, and roles
  const fetchData = async () => {
    setLoading(true);
    try {
      const settingsRes = await fetch('/api/settings');
      if (settingsRes.ok) {
        const data = await settingsRes.json();
        setAppName(data.app_name || 'Base App');
        setOidcEnabled(data.oidc_enabled === 'true');
        setOidcClientId(data.oidc_client_id || '');
        setOidcClientSecret(data.oidc_client_secret || '');
        setOidcTenantId(data.oidc_tenant_id || '');
        setOidcRedirectUri(data.oidc_redirect_uri || '');
        setOidcAutoProvision(data.oidc_auto_provision !== 'false');
        setOidcDefaultRole(data.oidc_default_role || 'Viewer');

        setGoogleSsoEnabled(data.google_sso_enabled === 'true');
        setGoogleClientId(data.google_client_id || '');
        setGoogleClientSecret(data.google_client_secret || '');
        setGoogleAutoProvision(data.google_auto_provision !== 'false');
        setGoogleDefaultRole(data.google_default_role || 'Viewer');

        setBrandingIcon(data.branding_icon !== undefined ? data.branding_icon : '🍳');
        setBrandingLogo(data.branding_logo || '');
        setBrandingLogoLight(data.branding_logo_light || '');
        setBrandingLogoDark(data.branding_logo_dark || '');
        setBrandingFavicon(data.branding_favicon || '');

        setMtgUrl(data.mtg_url || '');
        setMtgKey(data.mtg_key || '');
        setLibraryUrl(data.library_url || '');
        setLibraryKey(data.library_key || '');
        setTaskUrl(data.task_url || '');
        setTaskKey(data.task_key || '');
        setUnsplashKey(data.unsplash_key || '');
        setUnsplashAppId(data.unsplash_app_id || '');
        setUnsplashSecret(data.unsplash_secret || '');
        setWeatherLocation(data.weather_location || '10001');
        setWeatherUnit(data.weather_unit || 'fahrenheit');
        setGithubIntegrationEnabled(data.github_integration_enabled === 'true');
        setGithubOwner(data.github_owner || '');
        setGithubRepo(data.github_repo || '');
        setGithubToken(data.github_token || '');
        setGoogleBooksApiKey(data.google_books_api_key || '');
        setIsbndbApiKey(data.isbndb_api_key || '');
        setMonarchToken(data.monarch_token || '');
        if (data.monarch_token) {
          fetchMonarchDetails();
        }

        setDashboardRefreshInterval(data.dashboard_refresh_interval || 'disabled');
        setDashboardBgType(data.dashboard_bg_type || 'theme');
        setDashboardBgValue(data.dashboard_bg_value || '');
        setDashboardBgUnsplashKeywords(data.dashboard_bg_unsplash_keywords || '');

        setDashboardRotationEnabled(data.dashboard_rotation_enabled === 'true');
        setDashboardRotationInterval(data.dashboard_rotation_interval || '30');
        if (data.dashboard_rotation_dashboards) {
          try {
            setDashboardRotationDashboards(JSON.parse(data.dashboard_rotation_dashboards));
          } catch (e) {
            setDashboardRotationDashboards([]);
          }
        }

        setCalendarEventColor(data.calendar_event_color || '#3b82f6');
        setCalendarHolidayColor(data.calendar_holiday_color || '#f97316');
        setCalendarTaskColor(data.calendar_task_color || '#10b981');
        setCalendarBillColor(data.calendar_bill_color || '#ef4444');
        setCalendarSubColor(data.calendar_sub_color || '#8b5cf6');
        setCalendarContactEventColor(data.calendar_contact_event_color || '#ec4899');
      }

      await fetchDashboardsList();
      await fetchDashboardShares();

      if (canReadUsers) {
        const usersRes = await fetch('/api/users');
        if (usersRes.ok) {
          const data = await usersRes.json();
          setUsers(data);
        }
      }

      if (canReadRoles || canReadUsers) {
        const rolesRes = await fetch('/api/roles');
        if (rolesRes.ok) {
          const data = await rolesRes.json();
          setRoles(data);
        }
      }
    } catch (err) {
      showToast('Failed to load settings data.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Save general app settings
  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      const canSaveGlobal = canManageGeneral || currentUser?.permissions?.roles === 'full';
      if (canSaveGlobal) {
        if (!appName.trim()) {
          throw new Error('App Name cannot be empty.');
        }
        const globalPayload = {
          app_name: appName.trim()
        };
        const globalRes = await fetch('/api/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(globalPayload)
        });
        if (!globalRes.ok) throw new Error('Failed to save global app settings');

        showToast('System settings saved successfully!');
        if (onSettingsChange) {
          onSettingsChange({
            appName: appName.trim()
          });
        }
      } else {
        throw new Error('You do not have permission to modify system-wide settings.');
      }
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveIntegrations = async (e) => {
    e.preventDefault();
    setSavingIntegrations(true);
    try {
      const payload = {
        mtg_url: mtgUrl.trim(),
        mtg_key: mtgKey,
        library_url: libraryUrl.trim(),
        library_key: libraryKey,
        task_url: taskUrl.trim(),
        task_key: taskKey,
        unsplash_key: unsplashKey,
        unsplash_app_id: unsplashAppId.trim(),
        unsplash_secret: unsplashSecret,
        weather_location: weatherLocation.trim(),
        weather_unit: weatherUnit,
        github_integration_enabled: githubIntegrationEnabled ? 'true' : 'false',
        github_owner: githubOwner.trim(),
        github_repo: githubRepo.trim(),
        github_token: githubToken,
        google_books_api_key: googleBooksApiKey,
        isbndb_api_key: isbndbApiKey,
        monarch_token: monarchToken
      };

      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        showToast('Integration settings saved successfully!', 'success');
      } else {
        const err = await res.json();
        throw new Error(err.error || 'Failed to save integration settings');
      }
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSavingIntegrations(false);
    }
  };

  const handleSaveDashboardSettings = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        dashboard_refresh_interval: dashboardRefreshInterval,
        dashboard_bg_type: dashboardBgType,
        dashboard_bg_value: dashboardBgValue,
        dashboard_bg_unsplash_keywords: dashboardBgUnsplashKeywords,
        dashboard_rotation_enabled: String(dashboardRotationEnabled),
        dashboard_rotation_interval: String(dashboardRotationInterval),
        dashboard_rotation_dashboards: JSON.stringify(dashboardRotationDashboards)
      };

      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        showToast('Dashboard settings saved successfully!', 'success');
        onSettingsChange({});
      } else {
        const err = await res.json();
        throw new Error(err.error || 'Failed to save settings');
      }
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleUploadBgImage = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('background', file);

    setUploadingBg(true);
    try {
      const res = await fetch('/api/settings/dashboard/background', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (res.ok) {
        setDashboardBgValue(data.backgroundUrl);
        showToast('Background image uploaded successfully! Save settings to apply.');
      } else {
        throw new Error(data.error || 'Upload failed');
      }
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setUploadingBg(false);
    }
  };

  const handleDeleteBgImage = async () => {
    if (!window.confirm('Are you sure you want to delete the custom background image?')) return;
    try {
      const res = await fetch('/api/settings/dashboard/background', { method: 'DELETE' });
      if (res.ok) {
        setDashboardBgValue('');
        showToast('Custom background image removed.');
      } else {
        const data = await res.json();
        throw new Error(data.error || 'Delete failed');
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleSaveSSOSettings = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        oidc_enabled: String(oidcEnabled),
        oidc_client_id: oidcClientId.trim(),
        oidc_client_secret: oidcClientSecret.trim(),
        oidc_tenant_id: oidcTenantId.trim(),
        oidc_redirect_uri: oidcRedirectUri.trim(),
        oidc_auto_provision: String(oidcAutoProvision),
        oidc_default_role: oidcDefaultRole,
        google_sso_enabled: String(googleSsoEnabled),
        google_client_id: googleClientId.trim(),
        google_client_secret: googleClientSecret.trim(),
        google_auto_provision: String(googleAutoProvision),
        google_default_role: googleDefaultRole
      };
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error('Failed to save SSO settings');
      showToast('SSO settings saved successfully!');
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleUploadLogo = async (e, type) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const formData = new FormData();
    formData.append('logo', file);
    
    setSaving(true);
    try {
      const res = await fetch(`/api/settings/branding/logo/${type}`, {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to upload logo');
      
      const logoUrl = data.logoUrl;
      if (type === 'light') {
        setBrandingLogoLight(logoUrl);
        showToast('Light theme logo uploaded successfully!', 'success');
        if (onSettingsChange) {
          onSettingsChange({ brandingLogoLight: logoUrl });
        }
      } else {
        setBrandingLogoDark(logoUrl);
        showToast('Dark theme logo uploaded successfully!', 'success');
        if (onSettingsChange) {
          onSettingsChange({ brandingLogoDark: logoUrl });
        }
      }
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveLogo = async (type) => {
    if (!window.confirm(`Are you sure you want to remove the ${type} theme logo?`)) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/settings/branding/logo/${type}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to remove logo');
      
      if (type === 'light') {
        setBrandingLogoLight('');
        showToast('Light theme logo removed successfully!', 'success');
        if (onSettingsChange) {
          onSettingsChange({ brandingLogoLight: '' });
        }
      } else {
        setBrandingLogoDark('');
        showToast('Dark theme logo removed successfully!', 'success');
        if (onSettingsChange) {
          onSettingsChange({ brandingLogoDark: '' });
        }
      }
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleUploadFavicon = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const formData = new FormData();
    formData.append('favicon', file);
    
    setSaving(true);
    try {
      const res = await fetch('/api/settings/branding/favicon', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to upload favicon');
      setBrandingFavicon(data.branding_favicon);
      showToast('Favicon uploaded successfully!', 'success');
      if (onSettingsChange) {
        onSettingsChange({ brandingFavicon: data.branding_favicon });
      }
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveFavicon = async () => {
    if (!window.confirm('Are you sure you want to remove the favicon?')) return;
    setSaving(true);
    try {
      const res = await fetch('/api/settings/branding/favicon', {
        method: 'DELETE'
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to remove favicon');
      setBrandingFavicon('');
      showToast('Favicon removed successfully!', 'success');
      if (onSettingsChange) {
        onSettingsChange({ brandingFavicon: '' });
      }
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveBrandingIcon = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ branding_icon: brandingIcon.trim() })
      });
      if (!res.ok) throw new Error('Failed to save title icon');
      showToast('Title icon saved successfully!', 'success');
      if (onSettingsChange) {
        onSettingsChange({ brandingIcon: brandingIcon.trim() });
      }
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleResetSettings = () => {
    if (!window.confirm('Reset all settings to default values?')) return;
    setAppName('Base App');
    setPrimaryColor('#2c3e50');
    setTheme('system');
  };

  // User CRUD handlers
  const handleSaveUser = async (e) => {
    e.preventDefault();
    if (!usernameInput.trim()) return;
    if (!editUser && !passwordInput.trim()) {
      showToast('Password is required for new users.', 'error');
      return;
    }

    try {
      const url = editUser ? `/api/users/${editUser.id}` : '/api/users';
      const method = editUser ? 'PUT' : 'POST';
      const body = {
        username: usernameInput.trim(),
        role_id: roleSelectInput ? Number(roleSelectInput) : null,
        hide_from_contacts: hideFromContactsInput
      };
      if (passwordInput.trim()) {
        body.password = passwordInput.trim();
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save user');

      showToast(editUser ? 'User updated successfully!' : 'User created successfully!');
      setUserFormOpen(false);
      setEditUser(null);
      setUsernameInput('');
      setPasswordInput('');
      setRoleSelectInput('');
      setHideFromContactsInput(false);
      
      // Reload users list
      const usersRes = await fetch('/api/users');
      if (usersRes.ok) setUsers(await usersRes.json());
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleEditUserClick = (user) => {
    setEditUser(user);
    setUsernameInput(user.username);
    setPasswordInput('');
    setRoleSelectInput(user.role_id || '');
    setHideFromContactsInput(user.hide_from_contacts === 1 || user.hide_from_contacts === true);
    setUserFormOpen(true);
  };

  const handleDeleteUser = async (userId, username) => {
    if (userId === currentUser?.id) {
      showToast('You cannot delete your own account.', 'error');
      return;
    }
    if (username === 'admin') {
      showToast('Cannot delete default admin user.', 'error');
      return;
    }
    if (!window.confirm(`Are you sure you want to delete user "${username}"?`)) return;

    try {
      const res = await fetch(`/api/users/${userId}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete user');

      showToast(`User "${username}" deleted.`);
      const usersRes = await fetch('/api/users');
      if (usersRes.ok) setUsers(await usersRes.json());
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // Role CRUD handlers
  const handleSaveRole = async (e) => {
    e.preventDefault();
    if (!roleNameInput.trim()) return;

    try {
      const url = editRole ? `/api/roles/${editRole.id}` : '/api/roles';
      const method = editRole ? 'PUT' : 'POST';
      const body = {
        name: roleNameInput.trim(),
        permissions: rolePermsInput
      };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save role');

      showToast(editRole ? 'Role updated successfully!' : 'Role created successfully!');
      setRoleFormOpen(false);
      setEditRole(null);
      setRoleNameInput('');
      setRolePermsInput({
        users: 'none',
        roles: 'none',
        settings_general: 'none',
        settings_users: 'none',
        settings_roles: 'none',
        settings_sso: 'none',
        settings_branding: 'none',
        settings_calendar: 'none'
      });

      // Reload roles list
      const rolesRes = await fetch('/api/roles');
      if (rolesRes.ok) setRoles(await rolesRes.json());
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleEditRoleClick = (role) => {
    setEditRole(role);
    setRoleNameInput(role.name);
    let perms = {
      users: 'none',
      roles: 'none',
      settings_general: 'none',
      settings_users: 'none',
      settings_roles: 'none',
      settings_sso: 'none',
      settings_branding: 'none',
      settings_calendar: 'none'
    };
    if (role.permissions) {
      try {
        const parsed = typeof role.permissions === 'string' ? JSON.parse(role.permissions) : role.permissions;
        perms = { ...perms, ...parsed };
      } catch (e) {
        console.error('Failed to parse role permissions:', e);
      }
    }
    setRolePermsInput(perms);
    setRoleFormOpen(true);
  };

  const handlePermChange = (category, level) => {
    setRolePermsInput(prev => ({
      ...prev,
      [category]: level
    }));
  };

  const handleDeleteRole = async (roleId, name) => {
    if (name === 'Administrator') {
      showToast('Cannot delete Administrator role.', 'error');
      return;
    }
    if (!window.confirm(`Are you sure you want to delete role "${name}"?`)) return;

    try {
      const res = await fetch(`/api/roles/${roleId}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete role');

      showToast(`Role "${name}" deleted.`);
      const rolesRes = await fetch('/api/roles');
      if (rolesRes.ok) setRoles(await rolesRes.json());
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleSaveCalendarSettings = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (currentUser?.auth_provider === 'sso') {
        const primaryGuid = calendarSyncMappings.events || calendarGuid.trim();
        const res = await fetch('/api/users/calendar-sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            calendarId: primaryGuid,
            mappings: calendarSyncMappings
          })
        });
        if (!res.ok) throw new Error('Failed to save calendar sync mappings');
      }

      const colorPayload = {
        calendar_event_color: calendarEventColor,
        calendar_holiday_color: calendarHolidayColor,
        calendar_task_color: calendarTaskColor,
        calendar_bill_color: calendarBillColor,
        calendar_sub_color: calendarSubColor,
        calendar_contact_event_color: calendarContactEventColor
      };

      const settingsRes = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(colorPayload)
      });
      if (!settingsRes.ok) throw new Error('Failed to save calendar color settings');

      showToast('Calendar sync settings saved successfully!', 'success');
      onSettingsChange({ calendarGuid: (calendarSyncMappings.events || calendarGuid).trim() });
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!newPassword.trim()) {
      showToast('New password cannot be empty.', 'error');
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast('Passwords do not match.', 'error');
      return;
    }
    
    setResettingPassword(true);
    try {
      const res = await fetch('/api/users/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: currentPassword,
          newPassword: newPassword.trim()
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to reset password');
      
      showToast('Password reset successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setResettingPassword(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem' }}>
        <RotateCcw size={36} className="spinner" style={{ margin: '0 auto 1rem auto' }} />
        <p>Loading settings...</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in" style={{ width: '100%' }}>
      <div className="content-header">
        <div>
          <h2>Settings Dashboard</h2>
          <p>
            Configure app behavior, manage access roles, Single Sign-On configurations and notification dispatching.
          </p>
        </div>
      </div>


      {/* DASHBOARD LAYOUT TAB */}
      {activeSubTab === 'dashboard' && canReadGeneral && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <Settings size={18} style={{ color: 'var(--primary)' }} />
              <h3 style={{ fontSize: '1.125rem', margin: 0, fontWeight: '600' }}>Dashboard Layout Settings</h3>
            </div>
            
            <form onSubmit={handleSaveDashboardSettings} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div className="form-group">
                <label htmlFor="dashboard-refresh-interval">Auto-Refresh Interval</label>
                <select
                  id="dashboard-refresh-interval"
                  className="input-control"
                  value={dashboardRefreshInterval}
                  onChange={(e) => setDashboardRefreshInterval(e.target.value)}
                  disabled={!canManageGeneral}
                >
                  <option value="disabled">Disabled</option>
                  <option value="10">10 Seconds</option>
                  <option value="30">30 Seconds</option>
                  <option value="60">1 Minute</option>
                  <option value="120">2 Minutes</option>
                  <option value="300">5 Minutes</option>
                  <option value="600">10 Minutes</option>
                  <option value="1800">30 Minutes</option>
                </select>
                <span style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>
                  Set how often widgets automatically refresh their data.
                </span>
              </div>

              <div className="form-group">
                <label style={{ marginBottom: '0.5rem' }}>Dashboard Background</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.5rem' }}>
                    {[
                      { value: 'theme', label: 'Theme Default' },
                      { value: 'light', label: 'Solid Light' },
                      { value: 'dark', label: 'Solid Dark' },
                      { value: 'unsplash', label: 'Unsplash Random' },
                      { value: 'upload', label: 'Custom Upload' }
                    ].map(opt => (
                      <button
                        key={opt.value}
                        type="button"
                        className={`btn ${dashboardBgType === opt.value ? 'btn-primary' : 'btn-outline'}`}
                        onClick={() => setDashboardBgType(opt.value)}
                        style={{ padding: '0.5rem', fontSize: '0.8rem' }}
                        disabled={!canManageGeneral}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>

                  {dashboardBgType === 'unsplash' && (
                    <div className="card" style={{ padding: '1rem', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '0.75rem', background: 'var(--muted)' }}>
                      <div className="form-group">
                        <label htmlFor="unsplash-keywords" style={{ fontSize: '0.8rem' }}>Unsplash Keywords</label>
                        <input
                          id="unsplash-keywords"
                          type="text"
                          className="input-control"
                          placeholder="e.g. nature, space, minimalist"
                          value={dashboardBgUnsplashKeywords}
                          onChange={(e) => setDashboardBgUnsplashKeywords(e.target.value)}
                          disabled={!canManageGeneral}
                        />
                        <span style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>
                          Comma-separated keywords to filter random backgrounds.
                        </span>
                      </div>
                      
                      <button
                        type="button"
                        className="btn btn-outline"
                        style={{ alignSelf: 'flex-start', padding: '0.35rem 0.75rem', display: 'flex', gap: '0.35rem', alignItems: 'center', fontSize: '0.75rem' }}
                        onClick={() => {
                          const newSig = Date.now().toString();
                          setDashboardBgValue(newSig);
                          showToast('Unsplash signature rotated. Save settings to apply.');
                        }}
                        disabled={!canManageGeneral}
                      >
                        <RotateCcw size={12} /> Force Next Image
                      </button>
                    </div>
                  )}

                  {dashboardBgType === 'upload' && (
                    <div className="card" style={{ padding: '1rem', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '0.75rem', background: 'var(--muted)' }}>
                      {dashboardBgValue && dashboardBgValue.startsWith('/uploads/') ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                          <span style={{ fontSize: '0.8rem' }}>Current Background Image:</span>
                          <div style={{ position: 'relative', width: '100%', maxHeight: '150px', borderRadius: 'var(--radius)', overflow: 'hidden', border: '1px solid var(--border)' }}>
                            <img src={dashboardBgValue} alt="Custom Background" style={{ width: '100%', height: '150px', objectFit: 'cover' }} />
                            <button
                              type="button"
                              className="btn btn-outline"
                              onClick={handleDeleteBgImage}
                              style={{ position: 'absolute', top: '0.5rem', right: '0.5rem', background: 'var(--popover)', color: 'var(--destructive)', padding: '0.25rem 0.5rem', fontSize: '0.7rem', borderColor: 'var(--destructive)' }}
                              disabled={!canManageGeneral}
                            >
                              <Trash2 size={10} /> Delete Image
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                          <label htmlFor="bg-image-upload" style={{ fontSize: '0.8rem' }}>Upload Background Image</label>
                          <input
                            id="bg-image-upload"
                            type="file"
                            accept="image/*"
                            onChange={handleUploadBgImage}
                            disabled={uploadingBg || !canManageGeneral}
                            style={{ fontSize: '0.8rem' }}
                          />
                          {uploadingBg && <span style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>Uploading background...</span>}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Dashboard Rotation Configuration */}
              <div className="card" style={{ padding: '1.25rem', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '1rem', background: 'var(--muted)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <RotateCcw size={16} style={{ color: 'var(--primary)' }} />
                    <label htmlFor="dashboard-rotation-toggle" style={{ fontWeight: '600', margin: 0, fontSize: '0.95rem', cursor: 'pointer' }}>
                      Dashboard Auto-Rotation
                    </label>
                  </div>
                  <input
                    id="dashboard-rotation-toggle"
                    type="checkbox"
                    checked={dashboardRotationEnabled}
                    onChange={(e) => setDashboardRotationEnabled(e.target.checked)}
                    disabled={!canManageGeneral}
                    style={{ width: '1.15rem', height: '1.15rem', cursor: 'pointer' }}
                  />
                </div>
                <span style={{ fontSize: '0.8rem', color: 'var(--muted-foreground)' }}>
                  Automatically cycle through selected dashboards on an active display or kiosk screen.
                </span>

                {dashboardRotationEnabled && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '0.25rem', borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
                    <div className="form-group">
                      <label htmlFor="dashboard-rotation-interval">Rotation Frequency</label>
                      <select
                        id="dashboard-rotation-interval"
                        className="input-control"
                        value={dashboardRotationInterval}
                        onChange={(e) => setDashboardRotationInterval(e.target.value)}
                        disabled={!canManageGeneral}
                      >
                        <option value="10">10 Seconds</option>
                        <option value="15">15 Seconds</option>
                        <option value="30">30 Seconds</option>
                        <option value="60">1 Minute</option>
                        <option value="120">2 Minutes</option>
                        <option value="300">5 Minutes</option>
                        <option value="600">10 Minutes</option>
                        <option value="900">15 Minutes</option>
                        <option value="1800">30 Minutes</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label style={{ marginBottom: '0.4rem', display: 'block' }}>Dashboards Included in Rotation</label>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '200px', overflowY: 'auto' }}>
                        {dashboardsList.map(dash => {
                          const isIncluded = dashboardRotationDashboards.length === 0 || dashboardRotationDashboards.includes(dash.id);
                          return (
                            <label
                              key={dash.id}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.6rem',
                                padding: '0.5rem 0.75rem',
                                borderRadius: 'var(--radius)',
                                background: 'var(--card)',
                                border: '1px solid var(--border)',
                                cursor: canManageGeneral ? 'pointer' : 'default',
                                fontSize: '0.85rem'
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={isIncluded}
                                onChange={(e) => {
                                  if (!canManageGeneral) return;
                                  let current = dashboardRotationDashboards.length === 0
                                    ? dashboardsList.map(d => d.id)
                                    : [...dashboardRotationDashboards];
                                  if (e.target.checked) {
                                    if (!current.includes(dash.id)) current.push(dash.id);
                                  } else {
                                    current = current.filter(id => id !== dash.id);
                                  }
                                  setDashboardRotationDashboards(current);
                                }}
                                disabled={!canManageGeneral}
                              />
                              <span style={{ fontWeight: '600' }}>{dash.name}</span>
                              {dash.is_default ? <span style={{ fontSize: '0.7rem', color: '#eab308' }}>★ (Default)</span> : null}
                              <span style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)', marginLeft: 'auto' }}>
                                {dash.widget_count || 0} widgets
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {canManageGeneral && (
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ alignSelf: 'flex-start', display: 'flex', gap: '0.35rem', alignItems: 'center' }}
                  disabled={saving}
                >
                  <Save size={14} /> Save Dashboard Settings
                </button>
              )}
            </form>
          </div>
        </div>
      )}

      {/* USER MANAGEMENT TAB */}
      {activeSubTab === 'users' && canReadUsers && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* User management panel card */}
          {canManageUsers && (
            <>
              {userFormOpen ? (
                <div className="card">
                  <h3 style={{ marginBottom: '1rem', fontSize: '1.125rem', fontWeight: '600' }}>
                    {editUser ? `Edit User: ${editUser.username}` : 'Add New User'}
                  </h3>
                  <form onSubmit={handleSaveUser} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div className="form-group">
                      <label htmlFor="user-username">Username *</label>
                      <input 
                        id="user-username"
                        type="text" 
                        className="input-control" 
                        value={usernameInput}
                        onChange={(e) => setUsernameInput(e.target.value)}
                        required
                        disabled={editUser?.username === 'admin'} // Cannot rename default admin
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="user-password">{editUser ? 'New Password (Leave blank to keep current)' : 'Password *'}</label>
                      <input 
                        id="user-password"
                        type="password" 
                        className="input-control" 
                        value={passwordInput}
                        onChange={(e) => setPasswordInput(e.target.value)}
                        required={!editUser}
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="user-role">Role</label>
                      <select 
                        id="user-role"
                        className="input-control"
                        value={roleSelectInput}
                        onChange={(e) => setRoleSelectInput(e.target.value)}
                        disabled={editUser?.username === 'admin'} // Admin user role locked to Administrator
                      >
                        <option value="">No Role (None)</option>
                        {roles.map(role => (
                          <option key={role.id} value={role.id}>{role.name}</option>
                        ))}
                      </select>
                    </div>
                    
                    <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginTop: '0.25rem' }}>
                      <label htmlFor="user-hide-contacts" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.85rem' }}>
                        <input
                          id="user-hide-contacts"
                          type="checkbox"
                          checked={hideFromContactsInput}
                          onChange={(e) => setHideFromContactsInput(e.target.checked)}
                          style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                        />
                        <span>Hide user from Contact List</span>
                      </label>
                    </div>
                    
                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
                      <button type="submit" className="btn btn-primary">
                        {editUser ? 'Save Changes' : 'Create User'}
                      </button>
                      <button 
                        type="button" 
                        className="btn btn-outline" 
                        onClick={() => { setUserFormOpen(false); setEditUser(null); setUsernameInput(''); setPasswordInput(''); setRoleSelectInput(''); setHideFromContactsInput(false); }}
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              ) : (
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button 
                    className="btn btn-primary" 
                    onClick={() => {
                      setEditUser(null);
                      setUsernameInput('');
                      setPasswordInput('');
                      setRoleSelectInput('');
                      setHideFromContactsInput(false);
                      setUserFormOpen(true);
                    }}
                  >
                    <Plus size={16} /> Add User
                  </button>
                </div>
              )}

              <div className="card" style={{ padding: '0.25rem 0', overflowX: 'auto' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Username</th>
                      <th>Display Name</th>
                      <th>Auth Method</th>
                      <th>Assigned Role</th>
                      <th>Contact List</th>
                      <th>Created Date</th>
                      <th style={{ textAlign: 'right', width: '120px' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map(u => (
                      <tr key={u.id}>
                        <td><strong>{u.username}</strong> {u.id === currentUser?.id && <span className="badge badge-primary" style={{ fontSize: '0.625rem', padding: '0.05rem 0.35rem' }}>You</span>}</td>
                        <td>{u.display_name || '-'}</td>
                        <td>
                          <span className={`badge ${u.auth_provider === 'sso' ? 'badge-primary' : 'badge-secondary'}`}>
                            {u.auth_provider === 'sso' ? 'SSO' : 'Local'}
                          </span>
                        </td>
                        <td>
                          <span className="badge badge-secondary">
                            {u.role_name || 'No Role Assigned'}
                          </span>
                        </td>
                        <td>
                          <span className={`badge ${u.hide_from_contacts ? 'badge-secondary' : 'badge-primary'}`} style={{ fontSize: '0.75rem' }}>
                            {u.hide_from_contacts ? 'Hidden' : 'Visible'}
                          </span>
                        </td>
                        <td>{new Date(u.created_at).toLocaleDateString()}</td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: '0.25rem' }}>
                            <button 
                              className="btn btn-outline" 
                              style={{ padding: '0.35rem 0.5rem', height: '1.75rem', width: '1.75rem' }}
                              onClick={() => handleEditUserClick(u)}
                              title="Edit User"
                            >
                              <Edit2 size={12} />
                            </button>
                            <button 
                              className="btn btn-secondary" 
                              style={{ padding: '0.35rem 0.5rem', height: '1.75rem', width: '1.75rem', color: 'var(--destructive)' }}
                              onClick={() => handleDeleteUser(u.id, u.username)}
                              title="Delete User"
                              disabled={u.username === 'admin' || u.id === currentUser?.id}
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {/* ROLE MANAGEMENT TAB */}
      {activeSubTab === 'roles' && canReadRoles && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {roleFormOpen && canManageRoles ? (
            <div className="card">
              <h3 style={{ marginBottom: '1rem', fontSize: '1.125rem', fontWeight: '600' }}>
                {editRole ? `Edit Role: ${editRole.name}` : 'Add New Role'}
              </h3>
              <form onSubmit={handleSaveRole} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div className="form-group">
                  <label htmlFor="role-name">Role Name *</label>
                  <input 
                    id="role-name"
                    type="text" 
                    className="input-control" 
                    value={roleNameInput}
                    onChange={(e) => setRoleNameInput(e.target.value)}
                    required
                    disabled={editRole?.name === 'Administrator'} // Cannot rename Administrator role
                  />
                </div>
                
                <div className="form-group">
                  <label style={{ fontWeight: '600', fontSize: '0.875rem' }}>Assign Function Permissions</label>
                  <div style={{ overflowX: 'auto', width: '100%', border: '1px solid var(--border)', borderRadius: 'var(--radius)', marginTop: '0.25rem' }}>
                    <table className="permission-matrix" style={{ marginTop: 0 }}>
                      <thead>
                        <tr>
                          <th>Function</th>
                          <th>Full Access</th>
                          <th>Read Only</th>
                          <th>None</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(CATEGORIES_LABELS).map(([catKey, catLabel]) => {
                          const currentLevel = rolePermsInput[catKey] || 'none';
                          return (
                            <tr key={catKey}>
                              <td><strong>{catLabel}</strong></td>
                              <td>
                                <label className="permission-radio-label">
                                  <input 
                                    type="radio" 
                                    name={`perm_${catKey}`} 
                                    checked={currentLevel === 'full'}
                                    onChange={() => handlePermChange(catKey, 'full')}
                                    disabled={editRole?.name === 'Administrator'} // Administrator permissions are locked
                                  />
                                  Full
                                </label>
                              </td>
                              <td>
                                <label className="permission-radio-label">
                                  <input 
                                    type="radio" 
                                    name={`perm_${catKey}`} 
                                    checked={currentLevel === 'read'}
                                    onChange={() => handlePermChange(catKey, 'read')}
                                    disabled={editRole?.name === 'Administrator'}
                                  />
                                  Read
                                </label>
                              </td>
                              <td>
                                <label className="permission-radio-label">
                                  <input 
                                    type="radio" 
                                    name={`perm_${catKey}`} 
                                    checked={currentLevel === 'none'}
                                    onChange={() => handlePermChange(catKey, 'none')}
                                    disabled={editRole?.name === 'Administrator'}
                                  />
                                  None
                                </label>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
                  <button type="submit" className="btn btn-primary">
                    {editRole ? 'Save Changes' : 'Create Role'}
                  </button>
                  <button 
                    type="button" 
                    className="btn btn-outline" 
                    onClick={() => { setRoleFormOpen(false); setEditRole(null); setRoleNameInput(''); }}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          ) : (
            canManageRoles && (
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button 
                  className="btn btn-primary" 
                  onClick={() => {
                    setEditRole(null);
                    setRoleNameInput('');
                    setRolePermsInput({
                      users: 'none',
                      roles: 'none',
                      settings_general: 'none',
                      settings_users: 'none',
                      settings_roles: 'none',
                      settings_sso: 'none',
                      settings_branding: 'none',
                      settings_calendar: 'none'
                    });
                    setRoleFormOpen(true);
                  }}
                >
                  <Plus size={16} /> Add Role
                </button>
              </div>
            )
          )}

          <div className="card" style={{ padding: '0.25rem 0', overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Role Name</th>
                  <th>Permissions Assigned</th>
                  {canManageRoles && <th style={{ textAlign: 'right', width: '120px' }}>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {roles.map(r => {
                  let perms = {};
                  try {
                    perms = typeof r.permissions === 'string' ? JSON.parse(r.permissions) : r.permissions;
                  } catch (e) {
                    console.error(e);
                  }
                  return (
                    <tr key={r.id}>
                      <td><strong>{r.name}</strong></td>
                      <td>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                          {Object.entries(perms).map(([k, v]) => (
                            <span 
                              key={k} 
                              className={`badge ${v === 'full' ? 'badge-primary' : 'badge-secondary'}`}
                              style={{ opacity: v === 'none' ? 0.35 : 1, fontSize: '0.6875rem', padding: '0.05rem 0.4rem' }}
                            >
                              {k.replace('_', ' ')}: {v}
                            </span>
                          ))}
                        </div>
                      </td>
                      {canManageRoles && (
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: '0.25rem' }}>
                            <button 
                              className="btn btn-outline" 
                              style={{ padding: '0.35rem 0.5rem', height: '1.75rem', width: '1.75rem' }}
                              onClick={() => handleEditRoleClick(r)}
                              title="Edit Role"
                            >
                              <Edit2 size={12} />
                            </button>
                            <button 
                              className="btn btn-secondary" 
                              style={{ padding: '0.35rem 0.5rem', height: '1.75rem', width: '1.75rem', color: 'var(--destructive)' }}
                              onClick={() => handleDeleteRole(r.id, r.name)}
                              title="Delete Role"
                              disabled={r.name === 'Administrator'}
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* OIDC SSO SETTINGS TAB */}
      {activeSubTab === 'sso' && canManageRoles && (
        <div className="card">
          <form onSubmit={handleSaveSSOSettings} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <h3 style={{ fontSize: '1.125rem', marginBottom: '0.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem', fontWeight: '600' }}>
              Microsoft 365 Single Sign-On (OIDC)
            </h3>
            
            <div className="form-group">
              <label className="switch-container">
                <input 
                  id="sso-enabled"
                  type="checkbox"
                  className="switch-input"
                  checked={oidcEnabled}
                  onChange={(e) => setOidcEnabled(e.target.checked)}
                />
                <div className="switch-control" />
                <span style={{ fontWeight: '500', fontSize: '0.875rem' }}>Enable Microsoft 365 OIDC SSO</span>
              </label>
            </div>

            <div className="form-group">
              <label htmlFor="sso-tenant">Tenant ID *</label>
              <input 
                id="sso-tenant"
                type="text" 
                className="input-control" 
                value={oidcTenantId}
                onChange={(e) => setOidcTenantId(e.target.value)}
                placeholder="e.g. common, organizations, or Azure Directory Tenant GUID"
                required={oidcEnabled} 
              />
              <span style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>
                Use 'common' for multi-tenant applications or your specific Entra ID Directory (Tenant) ID GUID.
              </span>
            </div>

            <div className="form-group">
              <label htmlFor="sso-client-id">Application (Client) ID *</label>
              <input 
                id="sso-client-id"
                type="text" 
                className="input-control" 
                value={oidcClientId}
                onChange={(e) => setOidcClientId(e.target.value)}
                placeholder="Enter client ID GUID"
                required={oidcEnabled} 
              />
            </div>

            <div className="form-group">
              <label htmlFor="sso-secret">Client Secret *</label>
              <input 
                id="sso-secret"
                type="password" 
                className="input-control" 
                value={oidcClientSecret}
                onChange={(e) => setOidcClientSecret(e.target.value)}
                placeholder="Enter client secret value"
                required={oidcEnabled} 
              />
            </div>

            <div className="form-group">
              <label htmlFor="sso-redirect">Redirect URI *</label>
              <input 
                id="sso-redirect"
                type="text" 
                className="input-control" 
                value={oidcRedirectUri}
                onChange={(e) => setOidcRedirectUri(e.target.value)}
                placeholder="e.g. http://localhost:5000/api/auth/oidc/callback"
                required={oidcEnabled} 
              />
              <span style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>
                Must match exactly one of the Redirect URIs configured in the Azure App Registration. Recommended: <strong>{window.location.origin}/api/auth/oidc/callback</strong>
              </span>
            </div>

            <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '0.25rem 0' }} />

            <h4 style={{ fontSize: '1rem', margin: 0, fontWeight: '600' }}>User Provisioning & Roles</h4>

            <div className="form-group">
              <label className="switch-container">
                <input 
                  id="sso-provision"
                  type="checkbox"
                  className="switch-input"
                  checked={oidcAutoProvision}
                  onChange={(e) => setOidcAutoProvision(e.target.checked)}
                />
                <div className="switch-control" />
                <span style={{ fontWeight: '500', fontSize: '0.875rem' }}>Auto-provision new users on first login</span>
              </label>
            </div>

            <div className="form-group">
              <label htmlFor="sso-default-role">Default Assigned Role</label>
              <select 
                id="sso-default-role"
                className="input-control"
                value={oidcDefaultRole}
                onChange={(e) => setOidcDefaultRole(e.target.value)}
                disabled={!oidcAutoProvision}
              >
                {roles.map(role => (
                  <option key={role.id} value={role.name}>{role.name}</option>
                ))}
              </select>
              <span style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>
                New accounts created via SSO login will automatically be assigned this role.
              </span>
            </div>

            <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '1.25rem 0' }} />

            <h3 style={{ fontSize: '1.125rem', marginBottom: '0.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem', fontWeight: '600' }}>
              Google Single Sign-On (OAuth 2.0)
            </h3>

            <div className="form-group">
              <label className="switch-container">
                <input 
                  id="google-sso-enabled"
                  type="checkbox"
                  className="switch-input"
                  checked={googleSsoEnabled}
                  onChange={(e) => setGoogleSsoEnabled(e.target.checked)}
                />
                <div className="switch-control" />
                <span style={{ fontWeight: '500', fontSize: '0.875rem' }}>Enable Google OAuth SSO</span>
              </label>
            </div>

            <div className="form-group">
              <label htmlFor="google-client-id">Client ID *</label>
              <input 
                id="google-client-id"
                type="text" 
                className="input-control" 
                value={googleClientId}
                onChange={(e) => setGoogleClientId(e.target.value)}
                placeholder="Enter Google OAuth Client ID"
                required={googleSsoEnabled} 
              />
            </div>

            <div className="form-group">
              <label htmlFor="google-secret">Client Secret *</label>
              <input 
                id="google-secret"
                type="password" 
                className="input-control" 
                value={googleClientSecret}
                onChange={(e) => setGoogleClientSecret(e.target.value)}
                placeholder="Enter Google OAuth Client Secret"
                required={googleSsoEnabled} 
              />
            </div>

            <div className="form-group">
              <span style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>
                Configure redirect URI in Google API Console. Authorized redirect URI: <strong>{window.location.origin}/api/auth/google/callback</strong>
              </span>
            </div>

            <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '0.25rem 0' }} />

            <h4 style={{ fontSize: '1rem', margin: 0, fontWeight: '600' }}>Google User Provisioning & Roles</h4>

            <div className="form-group">
              <label className="switch-container">
                <input 
                  id="google-provision"
                  type="checkbox"
                  className="switch-input"
                  checked={googleAutoProvision}
                  onChange={(e) => setGoogleAutoProvision(e.target.checked)}
                />
                <div className="switch-control" />
                <span style={{ fontWeight: '500', fontSize: '0.875rem' }}>Auto-provision new users on Google login</span>
              </label>
            </div>

            <div className="form-group">
              <label htmlFor="google-default-role">Default Assigned Role</label>
              <select 
                id="google-default-role"
                className="input-control"
                value={googleDefaultRole}
                onChange={(e) => setGoogleDefaultRole(e.target.value)}
                disabled={!googleAutoProvision}
              >
                {roles.map(role => (
                  <option key={role.id} value={role.name}>{role.name}</option>
                ))}
              </select>
              <span style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>
                New accounts created via Google login will automatically be assigned this role.
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
              <button 
                type="submit" 
                className="btn btn-primary" 
                style={{ gap: '0.5rem' }}
                disabled={saving}
              >
                <Save size={16} /> {saving ? 'Saving...' : 'Save SSO Settings'}
              </button>
            </div>
          </form>
        </div>
      )}
      {/* BRANDING CONFIGURATION TAB */}
      {activeSubTab === 'branding' && canManageRoles && (
        <div className="card">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
            
            {/* Custom App Name */}
            <form onSubmit={handleSaveSettings} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.125rem', margin: 0, fontWeight: '600' }}>App Name Settings</h3>
              
              <div className="form-group" style={{ maxWidth: '400px' }}>
                <label htmlFor="settings-app-name">Custom App Name</label>
                <input 
                  id="settings-app-name"
                  type="text" 
                  className="input-control" 
                  value={appName}
                  onChange={(e) => setAppName(e.target.value)}
                  placeholder="e.g. WagnerTech Portal"
                  required 
                  disabled={!canManageGeneral && currentUser?.permissions?.roles !== 'full'}
                />
                <span style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>
                  This modifies the application title displayed in the sidebar.
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button 
                  type="submit" 
                  className="btn btn-primary" 
                  disabled={saving || (!canManageGeneral && currentUser?.permissions?.roles !== 'full')}
                >
                  Save App Name
                </button>
              </div>
            </form>
            
            {/* Title Icon Customization */}
            <form onSubmit={handleSaveBrandingIcon} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.125rem', margin: 0, fontWeight: '600' }}>App Title Icon</h3>
              <p style={{ fontSize: '0.8125rem', color: 'var(--muted-foreground)', margin: 0 }}>
                Customize or remove the emoji/icon shown in the application title (e.g. in the sidebar and mobile header).
              </p>
              
              <div className="form-group" style={{ maxWidth: '400px' }}>
                <label htmlFor="branding-icon-input">Title Icon / Emoji</label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input 
                    id="branding-icon-input"
                    type="text" 
                    className="input-control" 
                    value={brandingIcon}
                    onChange={(e) => setBrandingIcon(e.target.value)}
                    placeholder="Enter an emoji or text (e.g. 🍳)"
                    style={{ fontSize: '1.15rem', textAlign: 'center', width: '90px', flex: '0 0 auto' }}
                  />
                  <button 
                    type="button" 
                    className="btn btn-secondary"
                    onClick={() => setBrandingIcon('none')}
                    disabled={brandingIcon === 'none'}
                    style={{ flex: '1' }}
                  >
                    Remove Icon
                  </button>
                </div>
                <span style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)', marginTop: '0.125rem' }}>
                  Setting to 'none' will hide the icon completely.
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  Save Icon
                </button>
              </div>
            </form>

            {/* Custom Logo Upload */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.125rem', margin: 0, fontWeight: '600' }}>App Logos</h3>
              <p style={{ fontSize: '0.8125rem', color: 'var(--muted-foreground)', margin: 0 }}>
                Upload custom logos for Light and Dark themes to replace the app title text in the sidebar / mobile headers, and display on the login page.
              </p>
              
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.25rem' }}>
                {/* Light Theme Logo */}
                <div style={{ flex: '1 1 300px', display: 'flex', flexDirection: 'column', gap: '0.75rem', border: '1px solid var(--border)', padding: '1rem', borderRadius: 'var(--radius)', background: 'var(--muted)' }}>
                  <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--foreground)' }}>
                    <Sun size={14} style={{ color: '#f39c12' }} /> Light Theme Logo
                  </h4>
                  <div>
                    <input 
                      type="file" 
                      id="logo-light-upload-input" 
                      accept="image/*" 
                      onChange={(e) => handleUploadLogo(e, 'light')} 
                      style={{ display: 'none' }}
                    />
                    <label 
                      htmlFor="logo-light-upload-input" 
                      className="btn btn-secondary" 
                      style={{ cursor: 'pointer', display: 'inline-flex', width: 'auto' }}
                    >
                      Choose Light Logo
                    </label>
                    <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--muted-foreground)', marginTop: '0.375rem' }}>
                      Supported formats: PNG, JPG, WEBP, SVG.
                    </span>
                  </div>

                  {brandingLogoLight && (
                     <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'center', border: '1px solid var(--border)', padding: '0.5rem', borderRadius: 'var(--radius)', background: 'white' }}>
                      <span style={{ fontSize: '0.625rem', fontWeight: 'bold', color: '#7f8c8d' }}>Light Theme Preview</span>
                      <img 
                        src={brandingLogoLight} 
                        alt="Light Logo" 
                        style={{ maxHeight: '44px', maxWidth: '100%', objectFit: 'contain' }}
                      />
                      <button 
                        type="button" 
                        className="btn btn-danger" 
                        style={{ padding: '0.25rem 0.5rem', height: '1.75rem', fontSize: '0.75rem', marginTop: '0.25rem' }} 
                        onClick={() => handleRemoveLogo('light')}
                        disabled={saving}
                      >
                        Remove Light Logo
                      </button>
                    </div>
                  )}
                </div>

                {/* Dark Theme Logo */}
                <div style={{ flex: '1 1 300px', display: 'flex', flexDirection: 'column', gap: '0.75rem', border: '1px solid var(--border)', padding: '1rem', borderRadius: 'var(--radius)', background: 'var(--muted)' }}>
                  <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--foreground)' }}>
                    <Moon size={14} style={{ color: '#9b59b6' }} /> Dark Theme Logo
                  </h4>
                  <div>
                    <input 
                      type="file" 
                      id="logo-dark-upload-input" 
                      accept="image/*" 
                      onChange={(e) => handleUploadLogo(e, 'dark')} 
                      style={{ display: 'none' }}
                    />
                    <label 
                      htmlFor="logo-dark-upload-input" 
                      className="btn btn-secondary" 
                      style={{ cursor: 'pointer', display: 'inline-flex', width: 'auto' }}
                    >
                      Choose Dark Logo
                    </label>
                    <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--muted-foreground)', marginTop: '0.375rem' }}>
                      Supported formats: PNG, JPG, WEBP, SVG.
                    </span>
                  </div>

                  {brandingLogoDark && (
                     <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'center', border: '1px solid var(--border)', padding: '0.5rem', borderRadius: 'var(--radius)', background: '#18181b' }}>
                      <span style={{ fontSize: '0.625rem', fontWeight: 'bold', color: '#bdc3c7' }}>Dark Theme Preview</span>
                      <img 
                        src={brandingLogoDark} 
                        alt="Dark Logo" 
                        style={{ maxHeight: '44px', maxWidth: '100%', objectFit: 'contain' }}
                      />
                      <button 
                        type="button" 
                        className="btn btn-danger" 
                        style={{ padding: '0.25rem 0.5rem', height: '1.75rem', fontSize: '0.75rem', marginTop: '0.25rem' }} 
                        onClick={() => handleRemoveLogo('dark')}
                        disabled={saving}
                      >
                        Remove Dark Logo
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Custom Favicon Upload */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <h3 style={{ fontSize: '1.125rem', margin: 0, fontWeight: '600' }}>Favicon</h3>
              <p style={{ fontSize: '0.8125rem', color: 'var(--muted-foreground)', margin: 0 }}>
                Upload a custom favicon image (.ico, .png, or .svg) to replace the default browser tab icon.
              </p>
              
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem', alignItems: 'center' }}>
                <div style={{ flex: '1 1 300px' }}>
                  <input 
                    type="file" 
                    id="favicon-upload-input" 
                    accept="image/*,.ico" 
                    onChange={handleUploadFavicon} 
                    style={{ display: 'none' }}
                  />
                  <label 
                    htmlFor="favicon-upload-input" 
                    className="btn btn-secondary" 
                    style={{ cursor: 'pointer', display: 'inline-flex', width: 'auto' }}
                  >
                    Choose Favicon Image
                  </label>
                  <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--muted-foreground)', marginTop: '0.375rem' }}>
                    Supported formats: ICO, PNG, SVG.
                  </span>
                </div>

                {brandingFavicon && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'center', border: '1px solid var(--border)', padding: '0.75rem', borderRadius: 'var(--radius)', background: 'var(--muted)' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--muted-foreground)' }}>Current Favicon</span>
                    <img 
                      src={brandingFavicon} 
                      alt="Favicon" 
                      style={{ height: '24px', width: '24px', objectFit: 'contain' }}
                    />
                    <button 
                      type="button" 
                      className="btn btn-danger" 
                      style={{ padding: '0.25rem 0.5rem', height: '1.75rem', fontSize: '0.75rem', marginTop: '0.25rem' }} 
                      onClick={handleRemoveFavicon}
                      disabled={saving}
                    >
                      Remove Favicon
                    </button>
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* INTEGRATIONS & API KEY TAB */}
      {activeSubTab === 'integrations' && currentUser?.role_name === 'Administrator' && (
        <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Application Integrations Card */}
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <Settings size={20} style={{ color: 'var(--primary)' }} />
              <h3 style={{ fontSize: '1.125rem', margin: 0, fontWeight: '600' }}>Application Integrations</h3>
            </div>
            <p style={{ fontSize: '0.8125rem', color: 'var(--muted-foreground)', marginBottom: '1.25rem', lineHeight: '1.5' }}>
              Configure the connection URLs and API keys for the Cookbook, Library, Task App, and external integrations. 
              These settings enable widgets on your custom dashboard to reflect your personal data in real time.
            </p>

            <form onSubmit={handleSaveIntegrations} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.25rem' }}>
                
                {/* Magic: The Gathering App Integration */}
                <div style={{ border: '1px solid var(--border)', padding: '1rem', borderRadius: 'var(--radius)', background: 'var(--muted)' }}>
                  <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0 0 0.75rem 0', color: 'var(--primary)', fontWeight: 'bold', fontSize: '0.9rem' }}>
                    <span>🔮</span> MTG App
                  </h4>
                  <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                    <label style={{ fontSize: '0.75rem', fontWeight: '600' }}>App URL</label>
                    <input
                      type="text"
                      className="input-control"
                      value={mtgUrl}
                      onChange={(e) => setMtgUrl(e.target.value)}
                      placeholder="e.g. http://localhost:8080"
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label style={{ fontSize: '0.75rem', fontWeight: '600' }}>API Key</label>
                    <input
                      type="password"
                      className="input-control"
                      value={mtgKey}
                      onChange={(e) => setMtgKey(e.target.value)}
                      placeholder={mtgKey ? "••••••••" : "Enter API key"}
                    />
                  </div>
                </div>

                {/* Unsplash Integration */}
                <div style={{ border: '1px solid var(--border)', padding: '1rem', borderRadius: 'var(--radius)', background: 'var(--muted)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0 0 0.25rem 0', color: 'var(--primary)', fontWeight: 'bold', fontSize: '0.9rem' }}>
                    <span>📷</span> Unsplash API
                  </h4>
                  <div className="form-group">
                    <label style={{ fontSize: '0.7rem', fontWeight: '600' }}>App ID / Client Name</label>
                    <input
                      type="text"
                      className="input-control"
                      value={unsplashAppId}
                      onChange={(e) => setUnsplashAppId(e.target.value)}
                      placeholder="Enter Unsplash App ID"
                    />
                  </div>
                  <div className="form-group">
                    <label style={{ fontSize: '0.7rem', fontWeight: '600' }}>Access Key</label>
                    <input
                      type="password"
                      className="input-control"
                      value={unsplashKey}
                      onChange={(e) => setUnsplashKey(e.target.value)}
                      placeholder={unsplashKey ? "••••••••" : "Enter Access key"}
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label style={{ fontSize: '0.7rem', fontWeight: '600' }}>Secret Key</label>
                    <input
                      type="password"
                      className="input-control"
                      value={unsplashSecret}
                      onChange={(e) => setUnsplashSecret(e.target.value)}
                      placeholder={unsplashSecret ? "••••••••" : "Enter Secret key"}
                    />
                  </div>
                </div>

                {/* Weather Widgets Integration */}
                <div style={{ border: '1px solid var(--border)', padding: '1rem', borderRadius: 'var(--radius)', background: 'var(--muted)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0 0 0.25rem 0', color: 'var(--primary)', fontWeight: 'bold', fontSize: '0.9rem' }}>
                    <span>🌤️</span> Weather Widgets
                  </h4>
                  <div className="form-group">
                    <label style={{ fontSize: '0.7rem', fontWeight: '600' }}>Zip Code / Location</label>
                    <input
                      type="text"
                      className="input-control"
                      value={weatherLocation}
                      onChange={(e) => setWeatherLocation(e.target.value)}
                      placeholder="e.g. 10001 or New York"
                      required
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label style={{ fontSize: '0.7rem', fontWeight: '600' }}>Temperature Unit</label>
                    <select
                      className="input-control"
                      value={weatherUnit}
                      onChange={(e) => setWeatherUnit(e.target.value)}
                      style={{ padding: '0.35rem 0.5rem' }}
                    >
                      <option value="fahrenheit">Fahrenheit (°F)</option>
                      <option value="celsius">Celsius (°C)</option>
                    </select>
                  </div>
                </div>

                {/* GitHub Issues Integration */}
                <div style={{ border: '1px solid var(--border)', padding: '1rem', borderRadius: 'var(--radius)', background: 'var(--muted)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0 0 0.25rem 0', color: 'var(--primary)', fontWeight: 'bold', fontSize: '0.9rem' }}>
                    <span>🐙</span> GitHub Issues Sync
                  </h4>
                  <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                    <label className="switch-container">
                      <input 
                        type="checkbox"
                        className="switch-input"
                        checked={githubIntegrationEnabled}
                        onChange={(e) => setGithubIntegrationEnabled(e.target.checked)}
                      />
                      <div className="switch-control" />
                      <span style={{ fontWeight: '500', fontSize: '0.75rem' }}>Enable Issues Integration</span>
                    </label>
                  </div>
                  <div className="form-group">
                    <label htmlFor="github-owner" style={{ fontSize: '0.7rem', fontWeight: '600' }}>Repo Owner *</label>
                    <input
                      id="github-owner"
                      type="text"
                      className="input-control"
                      value={githubOwner}
                      onChange={(e) => setGithubOwner(e.target.value)}
                      placeholder="e.g. jwagner77"
                      required={githubIntegrationEnabled}
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="github-repo" style={{ fontSize: '0.7rem', fontWeight: '600' }}>Repo Name *</label>
                    <input
                      id="github-repo"
                      type="text"
                      className="input-control"
                      value={githubRepo}
                      onChange={(e) => setGithubRepo(e.target.value)}
                      placeholder="e.g. family_app"
                      required={githubIntegrationEnabled}
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label htmlFor="github-token" style={{ fontSize: '0.7rem', fontWeight: '600' }}>Personal Access Token *</label>
                    <input
                      id="github-token"
                      type="password"
                      className="input-control"
                      value={githubToken}
                      onChange={(e) => setGithubToken(e.target.value)}
                      placeholder={githubToken ? "••••••••" : "Enter access token"}
                      required={githubIntegrationEnabled}
                    />
                  </div>
                </div>

                {/* Book Database & ISBN Lookup Services */}
                <div style={{ border: '1px solid var(--border)', padding: '1rem', borderRadius: 'var(--radius)', background: 'var(--muted)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0 0 0.25rem 0', color: 'var(--primary)', fontWeight: 'bold', fontSize: '0.9rem' }}>
                    <span>📚</span> Book Database Services
                  </h4>
                  <p style={{ fontSize: '0.725rem', color: 'var(--muted-foreground)', margin: '0 0 0.25rem 0', lineHeight: '1.4' }}>
                    ISBN lookups automatically cascade across Google Books, ISBNdb, and Open Library.
                  </p>
                  <div className="form-group">
                    <label htmlFor="google-books-key" style={{ fontSize: '0.7rem', fontWeight: '600' }}>Google Books API Key (Optional)</label>
                    <input
                      id="google-books-key"
                      type="password"
                      className="input-control"
                      value={googleBooksApiKey}
                      onChange={(e) => setGoogleBooksApiKey(e.target.value)}
                      placeholder={googleBooksApiKey ? "••••••••" : "Enter Google Books API key"}
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label htmlFor="isbndb-key" style={{ fontSize: '0.7rem', fontWeight: '600' }}>ISBNdb API Key (Optional)</label>
                    <input
                      id="isbndb-key"
                      type="password"
                      className="input-control"
                      value={isbndbApiKey}
                      onChange={(e) => setIsbndbApiKey(e.target.value)}
                      placeholder={isbndbApiKey ? "••••••••" : "Enter ISBNdb API key"}
                    />
                  </div>
                </div>

                {/* Monarch Money Integration */}
                <div style={{ border: '1px solid var(--border)', padding: '1.25rem', borderRadius: 'var(--radius)', background: 'var(--muted)', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0, color: 'var(--primary)', fontWeight: 'bold', fontSize: '0.95rem' }}>
                      <span>💵</span> Monarch Money Integration
                    </h4>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {monarchConnected === true && (
                        <span style={{ fontSize: '0.75rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: '0.25rem', fontWeight: '600', background: 'rgba(16, 185, 129, 0.1)', padding: '0.25rem 0.6rem', borderRadius: '4px' }}>
                          <CheckCircle2 size={13} /> Connected {monarchAccounts.length > 0 ? `(${monarchAccounts.length} accounts)` : ''}
                        </span>
                      )}
                      {monarchConnected === false && (
                        <span style={{ fontSize: '0.75rem', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '0.25rem', fontWeight: '600', background: 'rgba(239, 68, 68, 0.1)', padding: '0.25rem 0.6rem', borderRadius: '4px' }}>
                          <AlertCircle size={13} /> Disconnected
                        </span>
                      )}
                    </div>
                  </div>

                  {monarchConnected ? (
                    /* Connected State */
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', background: 'var(--background)', padding: '1rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
                      <p style={{ fontSize: '0.8rem', color: 'var(--foreground)', margin: 0, lineHeight: '1.5' }}>
                        Your Monarch Money account is securely connected. Balances, transactions, and recurring streams are synchronized with the app.
                      </p>

                      {/* Active Token Display Box */}
                      <div style={{
                        background: 'var(--card)',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius)',
                        padding: '0.75rem 0.85rem',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.5rem'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <label style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--foreground)', display: 'flex', alignItems: 'center', gap: '0.35rem', margin: 0 }}>
                            <Key size={13} style={{ color: 'var(--primary)' }} /> Active Monarch Token
                          </label>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                            <button
                              type="button"
                              className="btn btn-secondary"
                              style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                              onClick={() => setRevealMonarchToken(!revealMonarchToken)}
                              title={revealMonarchToken ? 'Hide token' : 'Reveal token'}
                            >
                              {revealMonarchToken ? <EyeOff size={12} /> : <Eye size={12} />}
                              {revealMonarchToken ? 'Hide' : 'Reveal'}
                            </button>
                            <button
                              type="button"
                              className="btn btn-secondary"
                              style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                              onClick={() => handleCopyText(monarchToken, 'Monarch Token')}
                              disabled={!monarchToken}
                              title="Copy token to clipboard"
                            >
                              <Copy size={12} /> Copy
                            </button>
                            <button
                              type="button"
                              className="btn btn-secondary"
                              style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                              onClick={() => {
                                setEditingMonarchToken(!editingMonarchToken);
                                setEditedTokenInput(monarchToken);
                              }}
                              title="Update token manually"
                            >
                              <Edit2 size={12} /> {editingMonarchToken ? 'Cancel' : 'Edit'}
                            </button>
                          </div>
                        </div>

                        {!editingMonarchToken ? (
                          <div style={{
                            fontFamily: 'monospace',
                            fontSize: '0.75rem',
                            padding: '0.4rem 0.6rem',
                            background: 'var(--background)',
                            borderRadius: '4px',
                            border: '1px solid var(--border)',
                            color: 'var(--foreground)',
                            wordBreak: 'break-all',
                            userSelect: 'all'
                          }}>
                            {revealMonarchToken 
                              ? (monarchToken || '(No token captured)')
                              : (monarchToken ? (monarchToken.length > 16 ? monarchToken.slice(0, 6) + '••••••••••••••••••••••••' + monarchToken.slice(-6) : '••••••••••••••••') : '(No token)')
                            }
                          </div>
                        ) : (
                          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginTop: '0.25rem' }}>
                            <input
                              type={revealMonarchToken ? "text" : "password"}
                              className="input-control"
                              value={editedTokenInput}
                              onChange={(e) => setEditedTokenInput(e.target.value)}
                              placeholder="Enter updated Monarch token"
                              style={{ fontSize: '0.75rem', flex: 1 }}
                            />
                            <button
                              type="button"
                              className="btn btn-primary"
                              style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem' }}
                              onClick={handleUpdateExistingToken}
                              disabled={!editedTokenInput.trim()}
                            >
                              Update
                            </button>
                          </div>
                        )}
                      </div>

                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap', marginTop: '0.25rem' }}>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                          onClick={fetchMonarchDetails}
                          disabled={loadingMonarchData}
                        >
                          <RefreshCw size={13} className={loadingMonarchData ? 'spin' : ''} />
                          {loadingMonarchData ? 'Refreshing...' : 'Refresh Monarch Data'}
                        </button>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                          onClick={handleTestMonarchConnection}
                          disabled={testingMonarchConnection || !monarchToken}
                        >
                          <CheckCircle2 size={13} />
                          {testingMonarchConnection ? 'Testing...' : 'Test Connection'}
                        </button>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.3)' }}
                          onClick={handleDisconnectMonarch}
                        >
                          <LogOut size={13} /> Sign Out / Disconnect
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Monarch Login Link & Token Listener View */
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', background: 'var(--background)', padding: '1rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
                      <p style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)', margin: 0, lineHeight: '1.4' }}>
                        Click below to open the Monarch Login page. Sign in to your Monarch account, and the app will monitor for your session token and automatically pass it through to complete authentication.
                      </p>

                      {monarchListening ? (
                        /* Active Monitoring Pulse Box */
                        <div style={{
                          background: 'rgba(59, 130, 246, 0.06)',
                          border: '1px solid rgba(59, 130, 246, 0.25)',
                          borderRadius: 'var(--radius)',
                          padding: '1rem',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.75rem'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                            <div style={{
                              width: '10px',
                              height: '10px',
                              borderRadius: '50%',
                              background: '#3b82f6',
                              boxShadow: '0 0 0 4px rgba(59, 130, 246, 0.2)'
                            }} className="pulse" />
                            <span style={{ fontWeight: '600', fontSize: '0.825rem', color: 'var(--primary)' }}>
                              Monitoring for Monarch Authentication & Token Pass-Through...
                            </span>
                          </div>

                          <div style={{ fontSize: '0.75rem', color: 'var(--foreground)', lineHeight: '1.5', background: 'var(--card)', padding: '0.65rem 0.85rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
                            <div style={{ fontWeight: '600', marginBottom: '0.25rem', color: 'var(--primary)' }}>Easy 2-Step Pass-Through:</div>
                            <ol style={{ margin: 0, paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                              <li>Complete your sign-in in the opened <strong>Monarch Login tab</strong>.</li>
                              <li>Click the <strong>"Monarch Token Beam"</strong> bookmarklet from your bookmarks bar while on Monarch's tab to pass your token directly to this app.</li>
                            </ol>
                          </div>

                          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                            <a
                              href={`javascript:(function(){try{let t=null;try{const root=JSON.parse(localStorage.getItem('persist:root')||'{}');for(const k of['auth','user','session']){if(root[k]){try{const p=typeof root[k]==='string'?JSON.parse(root[k]):root[k];if(p.token){t=p.token;break;}if(p.accessToken){t=p.accessToken;break;}if(p.sessionToken){t=p.sessionToken;break;}}catch(e){}}}}catch(e){}if(!t){const directKeys=['monarch_token','token','authToken','accessToken','session_token','jwt'];for(const k of directKeys){const v=localStorage.getItem(k)||sessionStorage.getItem(k);if(v&&v.length>15){t=v;break;}}}if(!t){for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);const val=localStorage.getItem(k);if(val&&(val.includes('token')||val.includes('Token'))){try{const p=JSON.parse(val);if(p.token){t=p.token;break;}}catch(e){}}}}if(!t){alert('Please make sure you are signed into Monarch Money in this tab first.');return;}fetch('${window.location.origin}/api/monarch/capture-token',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({pairId:'${monarchPairId||''}',token:t}),mode:'cors'}).then(r=>r.json()).then(d=>{try{if(window.opener)window.opener.postMessage({type:'MONARCH_TOKEN_CAPTURED',token:t},'*');}catch(e){}alert('✅ Monarch Money token captured & linked to Family App!');}).catch(err=>{window.open('${window.location.origin}/api/monarch/callback?pairId=${monarchPairId||''}&token='+encodeURIComponent(t),'_blank');});}catch(e){alert('Error: '+e.message);}})();`}
                              className="btn btn-primary"
                              style={{ fontSize: '0.75rem', padding: '0.4rem 0.85rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem', textDecoration: 'none', cursor: 'grab' }}
                              onClick={(e) => {
                                showToast('Drag this button to your Bookmarks bar, then click it on the Monarch tab!', 'info');
                              }}
                              title="Drag this button to your Bookmarks bar"
                            >
                              <Sparkles size={13} /> ⭐ Monarch Token Beam (Drag to Bookmarks)
                            </a>
                            <button
                              type="button"
                              className="btn btn-secondary"
                              style={{ fontSize: '0.75rem', padding: '0.4rem 0.75rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                              onClick={() => window.open('https://app.monarchmoney.com/login', '_blank')}
                            >
                              <ExternalLink size={13} /> Open Monarch Tab
                            </button>
                            <button
                              type="button"
                              className="btn btn-secondary"
                              style={{ fontSize: '0.75rem', padding: '0.4rem 0.75rem', color: 'var(--muted-foreground)' }}
                              onClick={handleStopListening}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        /* Initial Action Button to Start Login & Listener */
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                            <button
                              type="button"
                              className="btn btn-primary"
                              style={{ fontSize: '0.8rem', padding: '0.5rem 1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: '600' }}
                              onClick={handleStartMonarchLogin}
                              disabled={monarchStartingPair}
                            >
                              <ExternalLink size={15} />
                              {monarchStartingPair ? 'Starting Listener...' : 'Sign In to Monarch (Open Login Page)'}
                            </button>

                            <a
                              href={`javascript:(function(){try{let t=null;try{const root=JSON.parse(localStorage.getItem('persist:root')||'{}');for(const k of['auth','user','session']){if(root[k]){try{const p=typeof root[k]==='string'?JSON.parse(root[k]):root[k];if(p.token){t=p.token;break;}if(p.accessToken){t=p.accessToken;break;}if(p.sessionToken){t=p.sessionToken;break;}}catch(e){}}}}catch(e){}if(!t){const directKeys=['monarch_token','token','authToken','accessToken','session_token','jwt'];for(const k of directKeys){const v=localStorage.getItem(k)||sessionStorage.getItem(k);if(v&&v.length>15){t=v;break;}}}if(!t){for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);const val=localStorage.getItem(k);if(val&&(val.includes('token')||val.includes('Token'))){try{const p=JSON.parse(val);if(p.token){t=p.token;break;}}catch(e){}}}}if(!t){alert('Please make sure you are signed into Monarch Money in this tab first.');return;}fetch('${window.location.origin}/api/monarch/capture-token',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({pairId:'${monarchPairId||''}',token:t}),mode:'cors'}).then(r=>r.json()).then(d=>{try{if(window.opener)window.opener.postMessage({type:'MONARCH_TOKEN_CAPTURED',token:t},'*');}catch(e){}alert('✅ Monarch Money token captured & linked to Family App!');}).catch(err=>{window.open('${window.location.origin}/api/monarch/callback?pairId=${monarchPairId||''}&token='+encodeURIComponent(t),'_blank');});}catch(e){alert('Error: '+e.message);}})();`}
                              className="btn btn-secondary"
                              style={{ fontSize: '0.75rem', padding: '0.45rem 0.85rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem', textDecoration: 'none', cursor: 'grab' }}
                              onClick={(e) => {
                                showToast('Drag this button to your Bookmarks bar, then click it on the Monarch tab!', 'info');
                              }}
                              title="Drag this button to your Bookmarks bar"
                            >
                              <Bookmark size={13} /> ⭐ Monarch Token Beam (Drag to Bookmarks)
                            </a>
                          </div>

                          <div style={{ marginTop: '0.25rem' }}>
                            <button
                              type="button"
                              style={{ background: 'none', border: 'none', padding: 0, color: 'var(--muted-foreground)', fontSize: '0.7rem', cursor: 'pointer', textDecoration: 'underline' }}
                              onClick={() => setShowManualTokenInput(!showManualTokenInput)}
                            >
                              {showManualTokenInput ? 'Hide manual token input' : 'Or enter raw token manually...'}
                            </button>

                            {showManualTokenInput && (
                              <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                <input
                                  type="password"
                                  className="input-control"
                                  value={manualTokenInput}
                                  onChange={(e) => setManualTokenInput(e.target.value)}
                                  placeholder="Paste Monarch auth token"
                                  style={{ fontSize: '0.75rem', maxWidth: '320px' }}
                                />
                                <button
                                  type="button"
                                  className="btn btn-secondary"
                                  style={{ fontSize: '0.75rem', padding: '0.35rem 0.65rem' }}
                                  onClick={handleSaveManualToken}
                                  disabled={!manualTokenInput.trim()}
                                >
                                  Save & Connect
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {monarchStatusMsg && (
                    <div style={{
                      fontSize: '0.75rem',
                      padding: '0.45rem 0.75rem',
                      borderRadius: 'var(--radius)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      background: monarchConnected ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)',
                      color: monarchConnected ? '#10b981' : '#ef4444',
                      border: `1px solid ${monarchConnected ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`
                    }}>
                      {monarchConnected ? <CheckCircle2 size={13} /> : <AlertCircle size={13} />}
                      <span>{monarchStatusMsg}</span>
                    </div>
                  )}
                </div>

              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <button type="submit" className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }} disabled={savingIntegrations}>
                  <Save size={14} /> {savingIntegrations ? 'Saving...' : 'Save Integration Settings'}
                </button>
              </div>
            </form>
          </div>

          {/* Monarch Integration Management Panel */}
          {monarchToken && (monarchConnected || monarchAccounts.length > 0) && (
            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>
                <div>
                  <h3 style={{ fontSize: '1.125rem', margin: '0 0 0.25rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: '600' }}>
                    <Landmark size={18} style={{ color: 'var(--primary)' }} /> Monarch Integration & Recurring Sync
                  </h3>
                  <p style={{ fontSize: '0.8125rem', color: 'var(--muted-foreground)', margin: 0 }}>
                    Select which accounts to include in the Money overview and classify recurring transactions into Bills or Subscriptions.
                  </p>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className="btn btn-outline"
                    style={{ fontSize: '0.75rem', padding: '0.4rem 0.75rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                    onClick={fetchMonarchDetails}
                    disabled={loadingMonarchData}
                  >
                    <RefreshCw size={13} className={loadingMonarchData ? 'spin' : ''} />
                    {loadingMonarchData ? 'Refreshing...' : 'Refresh from Monarch'}
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    style={{ fontSize: '0.75rem', padding: '0.4rem 0.75rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                    onClick={handleSyncMonarch}
                    disabled={syncingMonarch}
                  >
                    <Save size={13} />
                    {syncingMonarch ? 'Syncing...' : 'Save & Sync to App'}
                  </button>
                </div>
              </div>

              {/* Section 1: Included Accounts */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div>
                    <h4 style={{ fontSize: '0.95rem', fontWeight: '600', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <CreditCard size={16} /> Accounts to Include ({monarchEnabledAccountIds.length} of {monarchAccounts.length} selected)
                    </h4>
                    <span style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>
                      Selected accounts will be displayed in balances and transaction history on the Money page.
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      type="button"
                      className="btn btn-ghost"
                      style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                      onClick={() => toggleAllMonarchAccounts(true)}
                    >
                      Select All
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost"
                      style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                      onClick={() => toggleAllMonarchAccounts(false)}
                    >
                      Deselect All
                    </button>
                  </div>
                </div>

                {loadingMonarchData && monarchAccounts.length === 0 ? (
                  <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--muted-foreground)', fontSize: '0.875rem' }}>
                    Loading accounts from Monarch...
                  </div>
                ) : monarchAccounts.length === 0 ? (
                  <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--muted-foreground)', fontSize: '0.875rem', border: '1px dashed var(--border)', borderRadius: 'var(--radius)' }}>
                    No Monarch accounts found. Please test your connection.
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '0.75rem' }}>
                    {monarchAccounts.map(acc => {
                      const isEnabled = monarchEnabledAccountIds.includes(acc.id);
                      return (
                        <div
                          key={acc.id}
                          onClick={() => toggleMonarchAccount(acc.id)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '0.75rem 1rem',
                            borderRadius: 'var(--radius)',
                            border: isEnabled ? '1px solid var(--primary)' : '1px solid var(--border)',
                            background: isEnabled ? 'var(--card)' : 'var(--muted)',
                            opacity: isEnabled ? 1 : 0.65,
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                            userSelect: 'none'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', overflow: 'hidden' }}>
                            <div style={{ color: isEnabled ? 'var(--primary)' : 'var(--muted-foreground)', display: 'flex', alignItems: 'center' }}>
                              {isEnabled ? <CheckSquare size={18} /> : <Square size={18} />}
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                              <span style={{ fontWeight: '600', fontSize: '0.85rem', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                                {acc.displayName}
                              </span>
                              <span style={{ fontSize: '0.725rem', color: 'var(--muted-foreground)' }}>
                                {acc.institutionName ? `${acc.institutionName} • ` : ''}{acc.typeDisplay || acc.type} {acc.mask ? `(••${acc.mask})` : ''}
                              </span>
                            </div>
                          </div>
                          <div style={{ textAlign: 'right', flexShrink: 0 }}>
                            <span style={{ fontWeight: '700', fontSize: '0.875rem', color: acc.currentBalance < 0 ? '#ef4444' : 'var(--foreground)' }}>
                              ${Number(acc.currentBalance || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Section 2: Recurring Transactions Classifier */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
                <div>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: '600', margin: '0 0 0.25rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <ArrowRightLeft size={16} /> Recurring Transactions Sync ({monarchRecurringList.length} detected)
                  </h4>
                  <p style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)', margin: 0 }}>
                    Classify each recurring merchant stream as a <strong>Bill</strong> or <strong>Subscription</strong> to automatically sync its details into the app. Excluded items will not sync.
                  </p>
                </div>

                {loadingMonarchData && monarchRecurringList.length === 0 ? (
                  <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--muted-foreground)', fontSize: '0.875rem' }}>
                    Loading recurring streams from Monarch...
                  </div>
                ) : monarchRecurringList.length === 0 ? (
                  <div style={{ padding: '1.25rem', textAlign: 'center', color: 'var(--muted-foreground)', fontSize: '0.875rem', border: '1px dashed var(--border)', borderRadius: 'var(--radius)' }}>
                    No recurring transaction patterns detected in Monarch yet.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                    {monarchRecurringList.map(item => {
                      const currentMapping = monarchRecurringMappings[item.id] || { type: 'none' };
                      const currentType = currentMapping.type || 'none';

                      return (
                        <div
                          key={item.id}
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0.625rem',
                            padding: '0.875rem 1rem',
                            borderRadius: 'var(--radius)',
                            border: currentType !== 'none' ? '1px solid var(--primary)' : '1px solid var(--border)',
                            background: currentType !== 'none' ? 'var(--card)' : 'var(--muted)'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', minWidth: '200px' }}>
                              <span style={{ fontWeight: '700', fontSize: '0.9rem' }}>{item.merchantName}</span>
                              <span style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>
                                {item.accountName ? `${item.accountName} • ` : ''}Category: {item.categoryName || 'General'}
                                {item.nextDate ? ` • Next: ${item.nextDate}` : ''} • {item.frequency || 'Monthly'}
                              </span>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                              <div style={{ fontSize: '1rem', fontWeight: 'bold' }}>
                                ${Number(item.amount || 0).toFixed(2)}
                              </div>

                              {/* 3-Way Classification Toggle */}
                              <div style={{ display: 'flex', background: 'var(--background)', borderRadius: 'var(--radius)', padding: '0.2rem', border: '1px solid var(--border)', gap: '0.2rem' }}>
                                <button
                                  type="button"
                                  onClick={() => updateRecurringMapping(item, 'none')}
                                  style={{
                                    border: 'none',
                                    padding: '0.3rem 0.6rem',
                                    fontSize: '0.75rem',
                                    fontWeight: '600',
                                    borderRadius: 'calc(var(--radius) - 2px)',
                                    cursor: 'pointer',
                                    background: currentType === 'none' ? 'var(--muted-foreground)' : 'transparent',
                                    color: currentType === 'none' ? '#fff' : 'var(--muted-foreground)'
                                  }}
                                >
                                  Excluded
                                </button>
                                <button
                                  type="button"
                                  onClick={() => updateRecurringMapping(item, 'bill')}
                                  style={{
                                    border: 'none',
                                    padding: '0.3rem 0.6rem',
                                    fontSize: '0.75rem',
                                    fontWeight: '600',
                                    borderRadius: 'calc(var(--radius) - 2px)',
                                    cursor: 'pointer',
                                    background: currentType === 'bill' ? '#ef4444' : 'transparent',
                                    color: currentType === 'bill' ? '#fff' : 'var(--foreground)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.25rem'
                                  }}
                                >
                                  <Receipt size={12} /> Bill
                                </button>
                                <button
                                  type="button"
                                  onClick={() => updateRecurringMapping(item, 'subscription')}
                                  style={{
                                    border: 'none',
                                    padding: '0.3rem 0.6rem',
                                    fontSize: '0.75rem',
                                    fontWeight: '600',
                                    borderRadius: 'calc(var(--radius) - 2px)',
                                    cursor: 'pointer',
                                    background: currentType === 'subscription' ? '#8b5cf6' : 'transparent',
                                    color: currentType === 'subscription' ? '#fff' : 'var(--foreground)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.25rem'
                                  }}
                                >
                                  <CreditCard size={12} /> Subscription
                                </button>
                              </div>
                            </div>
                          </div>

                          {/* Detail inputs when classified */}
                          {currentType !== 'none' && (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.5rem', paddingTop: '0.5rem', borderTop: '1px dashed var(--border)' }}>
                              <div className="form-group" style={{ margin: 0 }}>
                                <label style={{ fontSize: '0.675rem', color: 'var(--muted-foreground)' }}>Display Name</label>
                                <input
                                  type="text"
                                  className="input-control"
                                  style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                                  value={currentMapping.name !== undefined ? currentMapping.name : item.merchantName}
                                  onChange={(e) => updateRecurringMapping(item, currentType, { name: e.target.value })}
                                />
                              </div>
                              <div className="form-group" style={{ margin: 0 }}>
                                <label style={{ fontSize: '0.675rem', color: 'var(--muted-foreground)' }}>Amount ($)</label>
                                <input
                                  type="number"
                                  step="0.01"
                                  className="input-control"
                                  style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                                  value={currentMapping.amount !== undefined ? currentMapping.amount : item.amount}
                                  onChange={(e) => updateRecurringMapping(item, currentType, { amount: e.target.value })}
                                />
                              </div>
                              <div className="form-group" style={{ margin: 0 }}>
                                <label style={{ fontSize: '0.675rem', color: 'var(--muted-foreground)' }}>Billing Cycle</label>
                                <select
                                  className="input-control"
                                  style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                                  value={currentMapping.cycle || (item.frequency === 'ANNUAL' ? 'annual' : 'monthly')}
                                  onChange={(e) => updateRecurringMapping(item, currentType, { cycle: e.target.value })}
                                >
                                  <option value="monthly">Monthly</option>
                                  <option value="annual">Annual</option>
                                </select>
                              </div>
                              <div className="form-group" style={{ margin: 0 }}>
                                <label style={{ fontSize: '0.675rem', color: 'var(--muted-foreground)' }}>Next Date</label>
                                <input
                                  type="date"
                                  className="input-control"
                                  style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                                  value={currentMapping.nextDate || item.nextDate || ''}
                                  onChange={(e) => updateRecurringMapping(item, currentType, { nextDate: e.target.value })}
                                />
                              </div>
                              {currentType === 'bill' && (
                                <div className="form-group" style={{ margin: 0 }}>
                                  <label style={{ fontSize: '0.675rem', color: 'var(--muted-foreground)' }}>Bill Tag</label>
                                  <input
                                    type="text"
                                    className="input-control"
                                    style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                                    value={currentMapping.tag || item.categoryName || 'Utilities'}
                                    onChange={(e) => updateRecurringMapping(item, currentType, { tag: e.target.value })}
                                  />
                                </div>
                              )}
                              {currentType === 'subscription' && (
                                <div className="form-group" style={{ margin: 0 }}>
                                  <label style={{ fontSize: '0.675rem', color: 'var(--muted-foreground)' }}>Category</label>
                                  <input
                                    type="text"
                                    className="input-control"
                                    style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                                    value={currentMapping.category || item.categoryName || 'Entertainment'}
                                    onChange={(e) => updateRecurringMapping(item, currentType, { category: e.target.value })}
                                  />
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '0.5rem', borderTop: '1px solid var(--border)' }}>
                <button
                  type="button"
                  className="btn btn-primary"
                  style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                  onClick={handleSyncMonarch}
                  disabled={syncingMonarch}
                >
                  <Save size={15} />
                  {syncingMonarch ? 'Syncing to Bills & Subscriptions...' : 'Save & Sync to App'}
                </button>
              </div>
            </div>
          )}

          {/* Microsoft Calendar Sync Settings Card */}
          {(() => {
            const isSSO = currentUser?.auth_provider === 'sso';
            const appCalendars = [
              { key: 'events', label: 'Events', description: 'Standard events and scheduled calendar items', color: calendarEventColor },
              { key: 'holidays', label: 'Holidays', description: 'US Federal Holidays and prominent cultural observances', color: calendarHolidayColor },
              { key: 'tasks', label: 'Tasks', description: 'FocusFlow tasks with assigned due dates', color: calendarTaskColor },
              { key: 'bills', label: 'Bills', description: 'Active recurring bill payment dates', color: calendarBillColor },
              { key: 'subscriptions', label: 'Subscriptions', description: 'Subscription renewals and billing dates', color: calendarSubColor },
              { key: 'birthdays', label: 'Birthdays & Important Dates', description: 'Contact birthdays, anniversaries, and custom milestones', color: calendarContactEventColor },
              { key: 'meals', label: 'Meal Plan', description: 'Weekly breakfast, lunch, and dinner planned meals', color: '#ec4899' }
            ];

            return (
              <div 
                className="card" 
                style={{ 
                  opacity: isSSO ? 1 : 0.6, 
                  position: 'relative',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1.25rem'
                }}
              >
                {!isSSO && (
                  <div style={{
                    marginBottom: '0.5rem',
                    padding: '0.75rem 1rem',
                    background: 'var(--muted)',
                    borderRadius: 'var(--radius)',
                    border: '1px solid var(--border)',
                    fontSize: '0.8125rem',
                    color: 'var(--muted-foreground)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}>
                    <Info size={16} style={{ color: 'var(--primary)', flexShrink: 0 }} />
                    <span>Microsoft Calendar Sync Settings are only available for accounts authenticated via Microsoft 365 Single Sign-On.</span>
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>
                  <div>
                    <h3 style={{ fontSize: '1.125rem', margin: '0 0 0.25rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: '600' }}>
                      <Calendar size={18} style={{ color: 'var(--primary)' }} /> Microsoft Calendar Sync Settings
                    </h3>
                    <p style={{ fontSize: '0.8125rem', color: 'var(--muted-foreground)', margin: 0 }}>
                      Choose which Microsoft 365 calendar each app calendar syncs with. Calendars left as <em>"Do Not Sync"</em> stay local only in this app.
                    </p>
                  </div>

                  <button 
                    type="button" 
                    className="btn btn-outline" 
                    style={{ fontSize: '0.75rem', padding: '0.4rem 0.75rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                    disabled={!isSSO}
                    onClick={async () => {
                      const tokenVal = localStorage.getItem('token') || '';
                      try {
                        const res = await fetch('/api/users/calendars', {
                          headers: { 'Authorization': `Bearer ${tokenVal}` }
                        });
                        if (res.ok) {
                          const data = await res.json();
                          setAvailableCalendars(data.calendars || []);
                          showToast(`Loaded ${data.calendars?.length || 0} Microsoft calendars!`, 'success');
                        } else if (res.status === 401) {
                          window.location.href = `/api/auth/ms-calendar/list-login?token=${encodeURIComponent(tokenVal)}`;
                        } else {
                          const errData = await res.json().catch(() => ({}));
                          throw new Error(errData.error || 'Failed to load calendars');
                        }
                      } catch (err) {
                        showToast('Failed to load calendars: ' + err.message, 'error');
                      }
                    }}
                  >
                    <RotateCcw size={12} /> {availableCalendars.length > 0 ? 'Refresh M365 Calendars' : 'Load Calendars from M365'}
                  </button>
                </div>

                <form onSubmit={handleSaveCalendarSettings} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', pointerEvents: isSSO ? 'auto' : 'none' }}>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {appCalendars.map(calItem => {
                      const currentVal = calendarSyncMappings[calItem.key] || '';
                      const isCustomIdNotInList = currentVal && currentVal !== 'default' && !availableCalendars.some(c => c.id === currentVal);

                      return (
                        <div 
                          key={calItem.key}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '0.875rem 1rem',
                            border: '1px solid var(--border)',
                            borderRadius: 'var(--radius)',
                            background: 'var(--card)',
                            gap: '1rem',
                            flexWrap: 'wrap'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: '220px', flex: 1 }}>
                            <span 
                              style={{ 
                                width: '14px', 
                                height: '14px', 
                                borderRadius: '50%', 
                                background: calItem.color,
                                flexShrink: 0,
                                boxShadow: `0 0 6px ${calItem.color}88`
                              }} 
                            />
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                              <span style={{ fontWeight: '700', fontSize: '0.875rem' }}>{calItem.label}</span>
                              <span style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>{calItem.description}</span>
                            </div>
                          </div>

                          <div style={{ minWidth: '240px', flex: '0 1 300px' }}>
                            <select
                              className="input-control"
                              value={currentVal}
                              onChange={(e) => {
                                const val = e.target.value;
                                setCalendarSyncMappings(prev => ({
                                  ...prev,
                                  [calItem.key]: val
                                }));
                                if (calItem.key === 'events') {
                                  setCalendarGuid(val);
                                }
                              }}
                              disabled={!isSSO}
                              style={{ fontSize: '0.8125rem' }}
                            >
                              <option value="">🚫 Do Not Sync (App Only)</option>
                              <option value="default">📅 Default M365 Calendar</option>
                              {availableCalendars.map(ac => (
                                <option key={ac.id} value={ac.id}>
                                  🗓️ {ac.name} {ac.isDefault ? '(Default)' : ''}
                                </option>
                              ))}
                              {isCustomIdNotInList && (
                                <option value={currentVal}>
                                  🔗 Custom ID: {currentVal.substring(0, 16)}...
                                </option>
                              )}
                            </select>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem', borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>
                      Changes will take effect during the next periodic background sync or manual sync trigger.
                    </span>
                    <button 
                      type="submit" 
                      className="btn btn-primary" 
                      style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                      disabled={saving || !isSSO}
                    >
                      <Save size={16} /> {saving ? 'Saving...' : 'Save Calendar Sync Settings'}
                    </button>
                  </div>
                </form>
              </div>
            );
          })()}

          {/* Key Management Card */}
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <Cpu size={20} style={{ color: 'var(--primary)' }} />
              <h3 style={{ fontSize: '1.125rem', margin: 0, fontWeight: '600' }}>API Key Integration</h3>
            </div>
            <p style={{ fontSize: '0.8125rem', color: 'var(--muted-foreground)', marginBottom: '1.25rem', lineHeight: '1.5' }}>
              Generate an API key to securely integrate this application with external applications, browser extensions, or automated tools. 
              API requests using this key will authenticate with Administrator-level privileges.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group">
                <label htmlFor="api-key-input">Active API Key</label>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <div style={{ position: 'relative', flex: 1 }}>
                    <input 
                      id="api-key-input"
                      type={revealKey ? "text" : "password"} 
                      className="input-control" 
                      value={apiKey || ''}
                      placeholder={loadingApiKey ? "Loading key..." : "No API key generated yet"}
                      readOnly
                      style={{ 
                        fontFamily: apiKey ? 'var(--font-mono)' : 'inherit', 
                        paddingRight: '2.5rem',
                        background: 'var(--muted)',
                        color: apiKey ? 'var(--foreground)' : 'var(--muted-foreground)'
                      }}
                    />
                    {apiKey && (
                      <button
                        type="button"
                        onClick={() => setRevealKey(!revealKey)}
                        style={{
                          position: 'absolute',
                          right: '0.5rem',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          background: 'none',
                          border: 'none',
                          color: 'var(--muted-foreground)',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: '0.25rem'
                        }}
                        title={revealKey ? "Hide API Key" : "Reveal API Key"}
                      >
                        {revealKey ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    )}
                  </div>

                  {apiKey && (
                    <button
                      type="button"
                      className="btn btn-outline"
                      onClick={() => handleCopyText(apiKey, 'API Key')}
                      style={{ padding: '0 0.75rem', display: 'flex', alignItems: 'center', gap: '0.35rem', flexShrink: 0 }}
                      title="Copy API Key to Clipboard"
                    >
                      <Copy size={14} /> Copy
                    </button>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.25rem' }}>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleGenerateApiKey}
                  disabled={loadingApiKey}
                  style={{ gap: '0.35rem', display: 'flex', alignItems: 'center' }}
                >
                  <Key size={14} />
                  {apiKey ? 'Regenerate Key' : 'Generate Key'}
                </button>

                {apiKey && (
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={handleRevokeApiKey}
                    disabled={loadingApiKey}
                    style={{ gap: '0.35rem', display: 'flex', alignItems: 'center', color: 'var(--destructive)' }}
                  >
                    <Trash2 size={14} />
                    Revoke Key
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Multi-Link Public Dashboard Sharing Card */}
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Eye size={20} style={{ color: 'var(--primary)' }} />
                <h3 style={{ fontSize: '1.125rem', margin: 0, fontWeight: '600' }}>Public Dashboard Sharing</h3>
              </div>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  setNewShareName('');
                  setNewShareTargetType('single');
                  setNewShareDashboardId(dashboardsList[0]?.id || 'default');
                  setNewShareRotationInterval(parseInt(dashboardRotationInterval, 10) || 30);
                  setNewShareRotationDashboards(dashboardRotationDashboards.length > 0 ? [...dashboardRotationDashboards] : dashboardsList.map(d => d.id));
                  setIsCreateShareModalOpen(true);
                }}
                style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
              >
                <Plus size={14} /> Create Share Link
              </button>
            </div>
            
            <p style={{ fontSize: '0.8125rem', color: 'var(--muted-foreground)', marginBottom: '1.25rem', lineHeight: '1.5' }}>
              Generate secure, read-only links to host different dashboards or auto-rotating views across multiple screens, wall tablets, and kiosks without requiring a login.
            </p>

            {loadingShares ? (
              <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--muted-foreground)', fontSize: '0.85rem' }}>
                Loading shared links...
              </div>
            ) : dashboardShares.length === 0 ? (
              <div style={{ padding: '2rem 1rem', textAlign: 'center', border: '1px dashed var(--border)', borderRadius: 'var(--radius)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ fontSize: '1.5rem' }}>🔗</span>
                <span style={{ fontSize: '0.9rem', fontWeight: '600' }}>No Public Share Links Configured</span>
                <span style={{ fontSize: '0.8rem', color: 'var(--muted-foreground)', maxWidth: '400px' }}>
                  Create links for individual dashboards or rotating displays to display around your home.
                </span>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => {
                    setNewShareName('Home Tablet Screen');
                    setNewShareTargetType('single');
                    setNewShareDashboardId(dashboardsList[0]?.id || 'default');
                    setIsCreateShareModalOpen(true);
                  }}
                  style={{ fontSize: '0.8rem', marginTop: '0.25rem' }}
                >
                  <Plus size={14} /> Create Your First Share Link
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {dashboardShares.map((share) => {
                  const shareUrl = `${window.location.origin}/shared/${share.token}`;
                  const isRevealed = Boolean(revealedShareTokens[share.id]);

                  return (
                    <div
                      key={share.id}
                      style={{
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius)',
                        padding: '1rem',
                        background: 'var(--muted)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.75rem'
                      }}
                    >
                      {/* Top Header: DASHBOARD BEING SHARED LISTED PROMINENTLY ABOVE LINK */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: '700', letterSpacing: '0.05em', color: 'var(--muted-foreground)' }}>
                            Dashboard being shared:
                          </span>
                          {share.target_type === 'rotation' ? (
                            <span style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.35rem', background: 'rgba(59, 130, 246, 0.12)', padding: '0.2rem 0.55rem', borderRadius: '12px' }}>
                              <RotateCcw size={13} /> Auto-Rotating ({share.rotation_dashboards?.length || dashboardsList.length} Dashboards - {share.rotation_interval || 30}s)
                            </span>
                          ) : (
                            <span style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--foreground)', display: 'flex', alignItems: 'center', gap: '0.35rem', background: 'var(--card)', padding: '0.2rem 0.55rem', borderRadius: '12px', border: '1px solid var(--border)' }}>
                              <Layers size={13} style={{ color: 'var(--primary)' }} /> {share.dashboard_name || 'Main Dashboard'}
                            </span>
                          )}
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ fontSize: '0.85rem', fontWeight: '600' }}>{share.name}</span>
                          <button
                            type="button"
                            className="btn btn-outline danger"
                            onClick={() => handleDeleteShareLink(share.id, share.name)}
                            style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', color: '#ef4444', borderColor: '#ef4444' }}
                            title="Revoke and delete this public share link"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>

                      {/* Middle: Link Input Box and Copy / Open buttons */}
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <div style={{ position: 'relative', flex: 1 }}>
                          <input
                            type={isRevealed ? "text" : "password"}
                            className="input-control"
                            value={shareUrl}
                            readOnly
                            style={{
                              fontFamily: 'var(--font-mono)',
                              paddingRight: '2.5rem',
                              background: 'var(--card)',
                              color: 'var(--foreground)',
                              fontSize: '0.8rem'
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => setRevealedShareTokens(p => ({ ...p, [share.id]: !p[share.id] }))}
                            style={{
                              position: 'absolute',
                              right: '0.5rem',
                              top: '50%',
                              transform: 'translateY(-50%)',
                              background: 'none',
                              border: 'none',
                              color: 'var(--muted-foreground)',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              padding: '0.25rem'
                            }}
                            title={isRevealed ? "Hide Share Link" : "Reveal Share Link"}
                          >
                            {isRevealed ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                        </div>

                        <button
                          type="button"
                          className="btn btn-outline"
                          onClick={() => handleCopyText(shareUrl, `Link for "${share.name}"`)}
                          style={{ padding: '0 0.75rem', display: 'flex', alignItems: 'center', gap: '0.35rem', flexShrink: 0, height: '2.4rem' }}
                          title="Copy Share Link to Clipboard"
                        >
                          <Copy size={14} /> Copy
                        </button>

                        <button
                          type="button"
                          className="btn btn-outline"
                          onClick={() => window.open(shareUrl, '_blank')}
                          style={{ padding: '0 0.75rem', display: 'flex', alignItems: 'center', gap: '0.35rem', flexShrink: 0, height: '2.4rem' }}
                          title="Open link in new tab"
                        >
                          <ExternalLink size={14} /> Open
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Create Share Link Modal */}
          {isCreateShareModalOpen && (
            <div className="modal-overlay" onClick={() => setIsCreateShareModalOpen(false)}>
              <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '520px' }}>
                <div className="modal-header">
                  <h2 style={{ fontSize: '1.25rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Eye size={18} style={{ color: 'var(--primary)' }} /> Create Public Share Link
                  </h2>
                  <button className="close-btn" style={{ fontSize: '1.5rem' }} onClick={() => setIsCreateShareModalOpen(false)}>×</button>
                </div>
                
                <form onSubmit={handleCreateShareLink}>
                  <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    <div className="form-group">
                      <label style={{ fontWeight: '600', marginBottom: '0.35rem', display: 'block' }}>Link Label / Device Name *</label>
                      <input
                        type="text"
                        className="input-control"
                        value={newShareName}
                        onChange={e => setNewShareName(e.target.value)}
                        placeholder="e.g. Kitchen Wall Tablet, Office Secondary Screen"
                        autoFocus
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label style={{ fontWeight: '600', marginBottom: '0.5rem', display: 'block' }}>What would you like to share?</label>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                        <button
                          type="button"
                          className={`btn ${newShareTargetType === 'single' ? 'btn-primary' : 'btn-outline'}`}
                          onClick={() => setNewShareTargetType('single')}
                          style={{ padding: '0.6rem', fontSize: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.2rem', alignItems: 'center' }}
                        >
                          <span style={{ fontWeight: '700' }}>Single Dashboard</span>
                          <span style={{ fontSize: '0.7rem', opacity: 0.8 }}>Share 1 specific dashboard</span>
                        </button>
                        <button
                          type="button"
                          className={`btn ${newShareTargetType === 'rotation' ? 'btn-primary' : 'btn-outline'}`}
                          onClick={() => setNewShareTargetType('rotation')}
                          style={{ padding: '0.6rem', fontSize: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.2rem', alignItems: 'center' }}
                        >
                          <span style={{ fontWeight: '700' }}>Dashboard Rotation</span>
                          <span style={{ fontSize: '0.7rem', opacity: 0.8 }}>Auto-cycle multiple views</span>
                        </button>
                      </div>
                    </div>

                    {newShareTargetType === 'single' ? (
                      <div className="form-group">
                        <label style={{ fontWeight: '600', marginBottom: '0.35rem', display: 'block' }}>Select Dashboard to Share</label>
                        <select
                          className="input-control"
                          value={newShareDashboardId}
                          onChange={e => setNewShareDashboardId(e.target.value)}
                        >
                          {dashboardsList.map(d => (
                            <option key={d.id} value={d.id}>
                              {d.name} {d.is_default ? '★ (Default)' : ''} ({d.widget_count || 0} widgets)
                            </option>
                          ))}
                        </select>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', background: 'var(--muted)', padding: '1rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
                        <div className="form-group">
                          <label htmlFor="modal-rot-interval" style={{ fontWeight: '600', marginBottom: '0.35rem', display: 'block' }}>Rotation Frequency</label>
                          <select
                            id="modal-rot-interval"
                            className="input-control"
                            value={newShareRotationInterval}
                            onChange={e => setNewShareRotationInterval(Number(e.target.value))}
                          >
                            <option value="10">10 Seconds</option>
                            <option value="15">15 Seconds</option>
                            <option value="30">30 Seconds</option>
                            <option value="60">1 Minute</option>
                            <option value="120">2 Minutes</option>
                            <option value="300">5 Minutes</option>
                            <option value="600">10 Minutes</option>
                          </select>
                        </div>

                        <div className="form-group">
                          <label style={{ fontWeight: '600', marginBottom: '0.4rem', display: 'block' }}>Dashboards in this Share Rotation</label>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', maxHeight: '160px', overflowY: 'auto' }}>
                            {dashboardsList.map(dash => {
                              const isChecked = newShareRotationDashboards.length === 0 || newShareRotationDashboards.includes(dash.id);
                              return (
                                <label
                                  key={dash.id}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                    padding: '0.4rem 0.6rem',
                                    borderRadius: 'var(--radius)',
                                    background: 'var(--card)',
                                    border: '1px solid var(--border)',
                                    cursor: 'pointer',
                                    fontSize: '0.8rem'
                                  }}
                                >
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={(e) => {
                                      let current = newShareRotationDashboards.length === 0
                                        ? dashboardsList.map(d => d.id)
                                        : [...newShareRotationDashboards];
                                      if (e.target.checked) {
                                        if (!current.includes(dash.id)) current.push(dash.id);
                                      } else {
                                        current = current.filter(id => id !== dash.id);
                                      }
                                      setNewShareRotationDashboards(current);
                                    }}
                                  />
                                  <span style={{ fontWeight: '600' }}>{dash.name}</span>
                                  {dash.is_default ? <span style={{ fontSize: '0.7rem', color: '#eab308' }}>★</span> : null}
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                      <button type="button" className="btn btn-outline" onClick={() => setIsCreateShareModalOpen(false)}>Cancel</button>
                      <button type="submit" className="btn btn-primary" disabled={!newShareName.trim()}>
                        <Plus size={14} /> Generate Share Link
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* NOTIFICATIONS TAB */}
      {activeSubTab === 'notifications' && currentUser?.role_name === 'Administrator' && (
        <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          <form onSubmit={handleSaveNotificationSettings} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            
            {/* Notification Channels Card */}
            <div className="card">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
                <Bell size={20} style={{ color: 'var(--primary)' }} />
                <h3 style={{ fontSize: '1.125rem', margin: 0, fontWeight: '600' }}>Notification Channels</h3>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                
                {/* SMTP Config */}
                <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '1rem', background: 'var(--muted)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', marginBottom: '1rem' }}>
                    <Mail size={16} />
                    <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: '600' }}>SMTP Email Configuration</h4>
                  </div>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
                    <div className="form-group">
                      <label htmlFor="smtp-host">SMTP Host</label>
                      <input 
                        id="smtp-host"
                        type="text" 
                        className="input-control" 
                        value={notifySmtpHost} 
                        onChange={(e) => setNotifySmtpHost(e.target.value)} 
                        placeholder="e.g. smtp.gmail.com" 
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="smtp-port">SMTP Port</label>
                      <input 
                        id="smtp-port"
                        type="text" 
                        className="input-control" 
                        value={notifySmtpPort} 
                        onChange={(e) => setNotifySmtpPort(e.target.value)} 
                        placeholder="e.g. 587 or 465" 
                      />
                    </div>
                    <div className="form-group" style={{ justifyContent: 'center', marginTop: '1.25rem' }}>
                      <label className="switch-container">
                        <input 
                          id="smtp-secure"
                          type="checkbox" 
                          className="switch-input"
                          checked={notifySmtpSecure} 
                          onChange={(e) => setNotifySmtpSecure(e.target.checked)} 
                        />
                        <div className="switch-control" />
                        <span style={{ fontSize: '0.875rem', fontWeight: '500' }}>Use SSL/TLS (Port 465)</span>
                      </label>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem', marginTop: '0.5rem' }}>
                    <div className="form-group">
                      <label htmlFor="smtp-user">Username</label>
                      <input 
                        id="smtp-user"
                        type="text" 
                        className="input-control" 
                        value={notifySmtpUser} 
                        onChange={(e) => setNotifySmtpUser(e.target.value)} 
                        placeholder="e.g. user@gmail.com" 
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="smtp-pass">Password</label>
                      <input 
                        id="smtp-pass"
                        type="password" 
                        className="input-control" 
                        value={notifySmtpPass} 
                        onChange={(e) => setNotifySmtpPass(e.target.value)} 
                        placeholder="Enter SMTP password" 
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem', marginTop: '0.5rem' }}>
                    <div className="form-group">
                      <label htmlFor="smtp-from">From Email Address</label>
                      <input 
                        id="smtp-from"
                        type="email" 
                        className="input-control" 
                        value={notifySmtpFrom} 
                        onChange={(e) => setNotifySmtpFrom(e.target.value)} 
                        placeholder="e.g. no-reply@baseapp.com" 
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="smtp-to">To Email Address (Recipient)</label>
                      <input 
                        id="smtp-to"
                        type="email" 
                        className="input-control" 
                        value={notifySmtpTo} 
                        onChange={(e) => setNotifySmtpTo(e.target.value)} 
                        placeholder="e.g. family@email.com" 
                      />
                    </div>
                  </div>
                </div>

                {/* Discord Config */}
                <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '1rem', background: 'var(--muted)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', marginBottom: '1rem' }}>
                    <MessageSquare size={16} />
                    <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: '600' }}>Discord Integration</h4>
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label htmlFor="discord-url">Discord Webhook URL</label>
                    <input 
                      id="discord-url"
                      type="text" 
                      className="input-control" 
                      value={notifyDiscordWebhookUrl} 
                      onChange={(e) => setNotifyDiscordWebhookUrl(e.target.value)} 
                      placeholder="e.g. https://discord.com/api/webhooks/..." 
                    />
                    <span style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)', marginTop: '0.125rem' }}>
                      Incoming alerts will be pushed as rich message embeds into the linked Discord channel.
                    </span>
                  </div>
                </div>

                {/* Webhook Config */}
                <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '1rem', background: 'var(--muted)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', marginBottom: '1rem' }}>
                    <Webhook size={16} />
                    <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: '600' }}>HTTP Webhook Notifications</h4>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
                    <div className="form-group">
                      <label htmlFor="webhook-url">Webhook URL</label>
                      <input 
                        id="webhook-url"
                        type="text" 
                        className="input-control" 
                        value={notifyWebhookUrl} 
                        onChange={(e) => setNotifyWebhookUrl(e.target.value)} 
                        placeholder="e.g. https://api.myhouse.com/baseapp-alert" 
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="webhook-secret">Webhook Secret Signature Token</label>
                      <input 
                        id="webhook-secret"
                        type="password" 
                        className="input-control" 
                        value={notifyWebhookSecret} 
                        onChange={(e) => setNotifyWebhookSecret(e.target.value)} 
                        placeholder="Enter secret token for HMAC validation" 
                      />
                    </div>
                  </div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)', display: 'block', marginTop: '0.375rem' }}>
                    Posts a JSON body containing event data. Requests are signed using HMAC-SHA256 in the <code>X-Signature</code> header.
                  </span>
                </div>

              </div>
            </div>

            {/* Notification Rules & Events Card */}
            <div className="card">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
                <Settings size={20} />
                <h3 style={{ fontSize: '1.125rem', margin: 0, fontWeight: '600' }}>Notification Rules</h3>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                
                {/* Event toggles */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1.25rem' }}>
                    <div className="form-group">
                      <label className="switch-container">
                        <input 
                          id="rule-subscription-due-today"
                          type="checkbox" 
                          className="switch-input"
                          checked={notifySubscriptionDueToday} 
                          onChange={(e) => setNotifySubscriptionDueToday(e.target.checked)} 
                        />
                        <div className="switch-control" />
                        <span style={{ fontWeight: '500', fontSize: '0.875rem' }}>Subscription Due Today</span>
                      </label>
                    </div>

                    <div className="form-group">
                      <label className="switch-container">
                        <input 
                          id="rule-bill-due-today"
                          type="checkbox" 
                          className="switch-input"
                          checked={notifyBillDueToday} 
                          onChange={(e) => setNotifyBillDueToday(e.target.checked)} 
                        />
                        <div className="switch-control" />
                        <span style={{ fontWeight: '500', fontSize: '0.875rem' }}>Bill Due Today</span>
                      </label>
                    </div>

                    <div className="form-group">
                      <label className="switch-container">
                        <input 
                          id="rule-recipe-added"
                          type="checkbox" 
                          className="switch-input"
                          checked={notifyRecipeAdded} 
                          onChange={(e) => setNotifyRecipeAdded(e.target.checked)} 
                        />
                        <div className="switch-control" />
                        <span style={{ fontWeight: '500', fontSize: '0.875rem' }}>Recipe Added</span>
                      </label>
                    </div>

                    <div className="form-group">
                      <label className="switch-container">
                        <input 
                          id="rule-recipe-deleted"
                          type="checkbox" 
                          className="switch-input"
                          checked={notifyRecipeDeleted} 
                          onChange={(e) => setNotifyRecipeDeleted(e.target.checked)} 
                        />
                        <div className="switch-control" />
                        <span style={{ fontWeight: '500', fontSize: '0.875rem' }}>Recipe Deleted</span>
                      </label>
                    </div>

                    <div className="form-group">
                      <label className="switch-container">
                        <input 
                          id="rule-meal-plan-updated"
                          type="checkbox" 
                          className="switch-input"
                          checked={notifyMealPlanUpdated} 
                          onChange={(e) => setNotifyMealPlanUpdated(e.target.checked)} 
                        />
                        <div className="switch-control" />
                        <span style={{ fontWeight: '500', fontSize: '0.875rem' }}>Meal Plan Updated</span>
                      </label>
                    </div>

                    <div className="form-group">
                      <label className="switch-container">
                        <input 
                          id="rule-leftovers-added"
                          type="checkbox" 
                          className="switch-input"
                          checked={notifyLeftoversAdded} 
                          onChange={(e) => setNotifyLeftoversAdded(e.target.checked)} 
                        />
                        <div className="switch-control" />
                        <span style={{ fontWeight: '500', fontSize: '0.875rem' }}>Leftover Added</span>
                      </label>
                    </div>

                    <div className="form-group">
                      <label className="switch-container">
                        <input 
                          id="rule-leftovers-expiring"
                          type="checkbox" 
                          className="switch-input"
                          checked={notifyLeftoversExpiring} 
                          onChange={(e) => setNotifyLeftoversExpiring(e.target.checked)} 
                        />
                        <div className="switch-control" />
                        <span style={{ fontWeight: '500', fontSize: '0.875rem' }}>Leftovers Expiring</span>
                      </label>
                    </div>

                    <div className="form-group">
                      <label className="switch-container">
                        <input 
                          id="rule-inventory-expiring"
                          type="checkbox" 
                          className="switch-input"
                          checked={notifyInventoryExpiring} 
                          onChange={(e) => setNotifyInventoryExpiring(e.target.checked)} 
                        />
                        <div className="switch-control" />
                        <span style={{ fontWeight: '500', fontSize: '0.875rem' }}>Inventory Item Expiring</span>
                      </label>
                    </div>

                    <div className="form-group">
                      <label className="switch-container">
                        <input 
                          id="rule-book-added"
                          type="checkbox" 
                          className="switch-input"
                          checked={notifyBookAdded} 
                          onChange={(e) => setNotifyBookAdded(e.target.checked)} 
                        />
                        <div className="switch-control" />
                        <span style={{ fontWeight: '500', fontSize: '0.875rem' }}>Book Added</span>
                      </label>
                    </div>

                    <div className="form-group">
                      <label className="switch-container">
                        <input 
                          id="rule-book-deleted"
                          type="checkbox" 
                          className="switch-input"
                          checked={notifyBookDeleted} 
                          onChange={(e) => setNotifyBookDeleted(e.target.checked)} 
                        />
                        <div className="switch-control" />
                        <span style={{ fontWeight: '500', fontSize: '0.875rem' }}>Book Deleted</span>
                      </label>
                    </div>

                    <div className="form-group">
                      <label className="switch-container">
                        <input 
                          id="rule-log-added"
                          type="checkbox" 
                          className="switch-input"
                          checked={notifyLogAdded} 
                          onChange={(e) => setNotifyLogAdded(e.target.checked)} 
                        />
                        <div className="switch-control" />
                        <span style={{ fontWeight: '500', fontSize: '0.875rem' }}>Reading Log Added</span>
                      </label>
                    </div>

                    <div className="form-group">
                      <label className="switch-container">
                        <input 
                          id="rule-book-started"
                          type="checkbox" 
                          className="switch-input"
                          checked={notifyBookStarted} 
                          onChange={(e) => setNotifyBookStarted(e.target.checked)} 
                        />
                        <div className="switch-control" />
                        <span style={{ fontWeight: '500', fontSize: '0.875rem' }}>Book Started</span>
                      </label>
                    </div>

                    <div className="form-group">
                      <label className="switch-container">
                        <input 
                          id="rule-book-completed"
                          type="checkbox" 
                          className="switch-input"
                          checked={notifyBookCompleted} 
                          onChange={(e) => setNotifyBookCompleted(e.target.checked)} 
                        />
                        <div className="switch-control" />
                        <span style={{ fontWeight: '500', fontSize: '0.875rem' }}>Book Completed</span>
                      </label>
                    </div>
                  </div>

                  {(notifyLeftoversExpiring || notifyInventoryExpiring) && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginTop: '0.5rem', borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
                      {notifyLeftoversExpiring && (
                        <div className="form-group">
                          <label htmlFor="leftover-lead-days">Leftovers Expiry Lead Days</label>
                          <input 
                            id="leftover-lead-days"
                            type="number" 
                            className="input-control" 
                            min="1" 
                            max="30"
                            value={notifyLeftoversExpiryDays} 
                            onChange={(e) => setNotifyLeftoversExpiryDays(parseInt(e.target.value, 10) || 2)} 
                          />
                        </div>
                      )}
                      
                      {notifyInventoryExpiring && (
                        <div className="form-group">
                          <label htmlFor="inventory-lead-days">Inventory Expiry Lead Days</label>
                          <input 
                            id="inventory-lead-days"
                            type="number" 
                            className="input-control" 
                            min="1" 
                            max="30"
                            value={notifyInventoryExpiryDays} 
                            onChange={(e) => setNotifyInventoryExpiryDays(parseInt(e.target.value, 10) || 3)} 
                          />
                        </div>
                      )}
                    </div>
                  )}

                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                  <button 
                    type="submit" 
                    className="btn btn-primary" 
                    style={{ gap: '0.5rem' }} 
                    disabled={savingNotifications}
                  >
                    <Save size={16} /> {savingNotifications ? 'Saving...' : 'Save Configuration'}
                  </button>
                </div>

              </div>
            </div>

            {/* Feature Requests & Bug Reports Admin Notifications */}
            <div className="card">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
                <Bell size={20} style={{ color: 'var(--primary)' }} />
                <h3 style={{ fontSize: '1.125rem', margin: 0, fontWeight: '600' }}>Feature Requests & Bug Reports Alerts</h3>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                
                {/* Feature Requests Admin Alerts */}
                <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '1rem', background: 'var(--muted)' }}>
                  <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: '600', marginBottom: '1rem' }}>Feature Request Notifications</h4>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    
                    {/* SMTP */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <label className="switch-container">
                        <input 
                          id="fr-notify-smtp"
                          type="checkbox" 
                          className="switch-input"
                          checked={frNotifySmtpEnabled} 
                          onChange={(e) => setFrNotifySmtpEnabled(e.target.checked)} 
                        />
                        <div className="switch-control" />
                        <span style={{ fontSize: '0.875rem', fontWeight: '500' }}>Email Notifications (SMTP)</span>
                      </label>
                      {frNotifySmtpEnabled && (
                        <div className="form-group" style={{ marginLeft: '2.5rem' }}>
                          <label htmlFor="fr-smtp-to">Recipient Email Address</label>
                          <input 
                            id="fr-smtp-to"
                            type="email" 
                            className="input-control" 
                            value={frNotifySmtpTo} 
                            onChange={(e) => setFrNotifySmtpTo(e.target.value)} 
                            placeholder="e.g. features@mycompany.com" 
                            required={frNotifySmtpEnabled}
                          />
                        </div>
                      )}
                    </div>

                    {/* Discord */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <label className="switch-container">
                        <input 
                          id="fr-notify-discord"
                          type="checkbox" 
                          className="switch-input"
                          checked={frNotifyDiscordEnabled} 
                          onChange={(e) => setFrNotifyDiscordEnabled(e.target.checked)} 
                        />
                        <div className="switch-control" />
                        <span style={{ fontSize: '0.875rem', fontWeight: '500' }}>Discord Webhook Notifications</span>
                      </label>
                      {frNotifyDiscordEnabled && (
                        <div className="form-group" style={{ marginLeft: '2.5rem' }}>
                          <label htmlFor="fr-discord-url">Discord Webhook URL</label>
                          <input 
                            id="fr-discord-url"
                            type="text" 
                            className="input-control" 
                            value={frNotifyDiscordWebhookUrl} 
                            onChange={(e) => setFrNotifyDiscordWebhookUrl(e.target.value)} 
                            placeholder="e.g. https://discord.com/api/webhooks/..." 
                            required={frNotifyDiscordEnabled}
                          />
                        </div>
                      )}
                    </div>

                    {/* Webhook */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <label className="switch-container">
                        <input 
                          id="fr-notify-webhook"
                          type="checkbox" 
                          className="switch-input"
                          checked={frNotifyWebhookEnabled} 
                          onChange={(e) => setFrNotifyWebhookEnabled(e.target.checked)} 
                        />
                        <div className="switch-control" />
                        <span style={{ fontSize: '0.875rem', fontWeight: '500' }}>HTTP Webhook Notifications</span>
                      </label>
                      {frNotifyWebhookEnabled && (
                        <div className="form-group" style={{ marginLeft: '2.5rem' }}>
                          <label htmlFor="fr-webhook-url">Webhook URL</label>
                          <input 
                            id="fr-webhook-url"
                            type="text" 
                            className="input-control" 
                            value={frNotifyWebhookUrl} 
                            onChange={(e) => setFrNotifyWebhookUrl(e.target.value)} 
                            placeholder="e.g. https://api.myhouse.com/features-hook" 
                            required={frNotifyWebhookEnabled}
                          />
                        </div>
                      )}
                    </div>

                  </div>
                </div>

                {/* Bug Reports Admin Alerts */}
                <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '1rem', background: 'var(--muted)' }}>
                  <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: '600', marginBottom: '1rem' }}>Bug Report Notifications</h4>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    
                    {/* SMTP */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <label className="switch-container">
                        <input 
                          id="bug-notify-smtp"
                          type="checkbox" 
                          className="switch-input"
                          checked={bugNotifySmtpEnabled} 
                          onChange={(e) => setBugNotifySmtpEnabled(e.target.checked)} 
                        />
                        <div className="switch-control" />
                        <span style={{ fontSize: '0.875rem', fontWeight: '500' }}>Email Notifications (SMTP)</span>
                      </label>
                      {bugNotifySmtpEnabled && (
                        <div className="form-group" style={{ marginLeft: '2.5rem' }}>
                          <label htmlFor="bug-smtp-to">Recipient Email Address</label>
                          <input 
                            id="bug-smtp-to"
                            type="email" 
                            className="input-control" 
                            value={bugNotifySmtpTo} 
                            onChange={(e) => setBugNotifySmtpTo(e.target.value)} 
                            placeholder="e.g. bugs@mycompany.com" 
                            required={bugNotifySmtpEnabled}
                          />
                        </div>
                      )}
                    </div>

                    {/* Discord */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <label className="switch-container">
                        <input 
                          id="bug-notify-discord"
                          type="checkbox" 
                          className="switch-input"
                          checked={bugNotifyDiscordEnabled} 
                          onChange={(e) => setBugNotifyDiscordEnabled(e.target.checked)} 
                        />
                        <div className="switch-control" />
                        <span style={{ fontSize: '0.875rem', fontWeight: '500' }}>Discord Webhook Notifications</span>
                      </label>
                      {bugNotifyDiscordEnabled && (
                        <div className="form-group" style={{ marginLeft: '2.5rem' }}>
                          <label htmlFor="bug-discord-url">Discord Webhook URL</label>
                          <input 
                            id="bug-discord-url"
                            type="text" 
                            className="input-control" 
                            value={bugNotifyDiscordWebhookUrl} 
                            onChange={(e) => setBugNotifyDiscordWebhookUrl(e.target.value)} 
                            placeholder="e.g. https://discord.com/api/webhooks/..." 
                            required={bugNotifyDiscordEnabled}
                          />
                        </div>
                      )}
                    </div>

                    {/* Webhook */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <label className="switch-container">
                        <input 
                          id="bug-notify-webhook"
                          type="checkbox" 
                          className="switch-input"
                          checked={bugNotifyWebhookEnabled} 
                          onChange={(e) => setBugNotifyWebhookEnabled(e.target.checked)} 
                        />
                        <div className="switch-control" />
                        <span style={{ fontSize: '0.875rem', fontWeight: '500' }}>HTTP Webhook Notifications</span>
                      </label>
                      {bugNotifyWebhookEnabled && (
                        <div className="form-group" style={{ marginLeft: '2.5rem' }}>
                          <label htmlFor="bug-webhook-url">Webhook URL</label>
                          <input 
                            id="bug-webhook-url"
                            type="text" 
                            className="input-control" 
                            value={bugNotifyWebhookUrl} 
                            onChange={(e) => setBugNotifyWebhookUrl(e.target.value)} 
                            placeholder="e.g. https://api.myhouse.com/bugs-hook" 
                            required={bugNotifyWebhookEnabled}
                          />
                        </div>
                      )}
                    </div>

                  </div>
                </div>

              </div>
            </div>

          </form>

          {/* Active Notifications Log History Card */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Bell size={20} />
                <h3 style={{ fontSize: '1.125rem', margin: 0, fontWeight: '600' }}>Active Notification History</h3>
              </div>
              {notificationLogs.length > 0 && (
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={handleClearNotificationLogs} 
                  style={{ color: 'var(--destructive)', fontSize: '0.75rem', padding: '0.25rem 0.5rem', height: '1.75rem' }}
                >
                  Clear History
                </button>
              )}
            </div>

            {loadingNotifications ? (
              <div style={{ textAlign: 'center', padding: '1.5rem' }}>
                <RotateCcw size={20} className="spinner" style={{ margin: '0 auto' }} />
                <p style={{ marginTop: '0.375rem', fontSize: '0.8125rem', color: 'var(--muted-foreground)' }}>Loading logs...</p>
              </div>
            ) : notificationLogs.length > 0 ? (
              <div style={{ overflowX: 'auto', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>
                <table className="table" style={{ width: '100%', fontSize: '0.875rem' }}>
                  <thead>
                    <tr>
                      <th style={{ width: '150px' }}>Date</th>
                      <th style={{ width: '120px' }}>Event</th>
                      <th>Notification Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {notificationLogs.map(log => (
                      <tr key={log.id}>
                        <td style={{ color: 'var(--muted-foreground)', fontSize: '0.75rem', whiteSpace: 'nowrap' }}>
                          {new Date(log.created_at).toLocaleString()}
                        </td>
                        <td>
                          <span 
                            className={`badge ${
                              log.event_type === 'System Alert' ? 'badge-danger' : 
                              log.event_type === 'User Managed' ? 'badge-info' : 
                              'badge-secondary'
                            }`}
                            style={{ fontSize: '0.625rem', padding: '0.05rem 0.35rem' }}
                          >
                            {log.title}
                          </span>
                        </td>
                        <td style={{ fontWeight: '500' }}>{log.body}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p style={{ fontSize: '0.8125rem', color: 'var(--muted-foreground)', margin: 0, textAlign: 'center', padding: '1.5rem' }}>
                No active notifications have been recorded yet.
              </p>
            )}
          </div>
        </div>
      )}

      {activeSubTab === 'templates' && currentUser?.permissions?.recipes !== 'none' && (
        <WordTemplateExport showToast={showToast} user={currentUser} />
      )}

      {/* ABOUT TAB */}
      {activeSubTab === 'about' && (
        <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Main App & Build Version Card */}
          <div className="card" style={{
            background: 'linear-gradient(135deg, var(--card) 0%, var(--muted) 100%)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            padding: '1.75rem',
            boxShadow: 'var(--shadow-sm)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1.25rem' }}>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', minWidth: '280px' }}>
                <div style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '16px',
                  background: 'var(--primary)',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '2rem',
                  boxShadow: '0 8px 16px -4px rgba(0,0,0,0.2)'
                }}>
                  {brandingIcon || '🏡'}
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: '700', margin: 0, color: 'var(--foreground)' }}>
                      {appName || 'Family Hub'}
                    </h2>
                    <span style={{
                      background: 'rgba(59, 130, 246, 0.15)',
                      color: '#3b82f6',
                      fontSize: '0.75rem',
                      fontWeight: '700',
                      padding: '0.2rem 0.6rem',
                      borderRadius: '9999px',
                      border: '1px solid rgba(59, 130, 246, 0.3)',
                      letterSpacing: '0.03em'
                    }}>
                      v{versionInfo.version || '1.0.0'}
                    </span>
                  </div>
                  <p style={{ fontSize: '0.875rem', color: 'var(--muted-foreground)', margin: '0.25rem 0 0 0' }}>
                    Your all-in-one self-hosted family management, recipes, planning, and finance hub.
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <a
                  href={versionInfo.repository || 'https://github.com/jwagner77/family_app'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-secondary"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    textDecoration: 'none',
                    fontWeight: '600',
                    fontSize: '0.85rem',
                    padding: '0.5rem 0.9rem'
                  }}
                >
                  <Github size={16} />
                  <span>GitHub Repository</span>
                  <ExternalLink size={13} style={{ opacity: 0.7 }} />
                </a>
              </div>

            </div>

            {/* Build & Metadata Details */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '1rem',
              marginTop: '1.5rem',
              paddingTop: '1.25rem',
              borderTop: '1px solid var(--border)'
            }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Release Version
                </span>
                <span style={{ fontSize: '0.9rem', fontWeight: '600', color: 'var(--foreground)' }}>
                  {versionInfo.version ? `v${versionInfo.version}` : '1.0.0 (Release)'}
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Git Commit / Build
                </span>
                <span style={{ fontSize: '0.85rem', fontFamily: 'var(--font-mono)', fontWeight: '500', color: 'var(--foreground)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <GitBranch size={13} style={{ color: 'var(--primary)' }} />
                  {versionInfo.commit ? versionInfo.commit.substring(0, 7) : 'main'}
                  {versionInfo.build ? ` (#${versionInfo.build})` : ''}
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Runtime Environment
                </span>
                <span style={{ fontSize: '0.85rem', fontWeight: '500', color: 'var(--foreground)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <Database size={13} style={{ color: '#10b981' }} />
                  Node.js {versionInfo.node_version || 'v18'} • SQLite
                </span>
              </div>
            </div>
          </div>

          {/* Authors, Credits & Technology Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
            
            {/* Author Credit Card */}
            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <div style={{
                  padding: '0.45rem',
                  borderRadius: '10px',
                  background: 'rgba(244, 63, 94, 0.1)',
                  color: '#f43f5e',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Heart size={18} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1rem', fontWeight: '600', margin: 0 }}>Author & Creator</h3>
                  <p style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)', margin: 0 }}>Development & Project Lead</p>
                </div>
              </div>
              <div style={{ padding: '0.75rem', background: 'var(--muted)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
                <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--foreground)', lineHeight: '1.5' }}>
                  Designed and created by <strong>Joshua Wagner</strong>, with help from <strong>Google's Gemini</strong> AI assistant.
                </p>
              </div>
            </div>

            {/* Antigravity Powered Card */}
            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <div style={{
                  padding: '0.45rem',
                  borderRadius: '10px',
                  background: 'rgba(99, 102, 241, 0.1)',
                  color: '#6366f1',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Sparkles size={18} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1rem', fontWeight: '600', margin: 0 }}>Built With Google Antigravity</h3>
                  <p style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)', margin: 0 }}>Agentic Pair-Programming</p>
                </div>
              </div>
              <div style={{ padding: '0.75rem', background: 'var(--muted)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
                <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--foreground)', lineHeight: '1.5' }}>
                  Engineered and continuously enhanced using <strong>Google Antigravity</strong> agentic coding workflows and tooling.
                </p>
              </div>
            </div>

          </div>

          {/* TECHNOLOGY STACK & COMPONENT VERSIONS SECTION */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{
                padding: '0.5rem',
                borderRadius: '10px',
                background: 'rgba(59, 130, 246, 0.1)',
                color: '#3b82f6',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Cpu size={20} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: '600', margin: 0, color: 'var(--foreground)' }}>
                  Technology Stack & Component Versions
                </h3>
                <p style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)', margin: '0.15rem 0 0 0' }}>
                  Core frameworks, libraries, database engines, and runtime infrastructure powering Family Hub
                </p>
              </div>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
              gap: '1rem'
            }}>
              {/* Frontend Client */}
              <div style={{
                background: 'var(--muted)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius)',
                padding: '1rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.65rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
                  <Laptop size={16} style={{ color: '#06b6d4' }} />
                  <strong style={{ fontSize: '0.85rem', color: 'var(--foreground)' }}>Frontend Client</strong>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.785rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--muted-foreground)' }}>React Framework:</span>
                    <span style={{ fontWeight: '600', fontFamily: 'var(--font-mono)' }}>v18.3.1</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--muted-foreground)' }}>Vite Build Tool:</span>
                    <span style={{ fontWeight: '600', fontFamily: 'var(--font-mono)' }}>v5.2.11</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--muted-foreground)' }}>Lucide React Icons:</span>
                    <span style={{ fontWeight: '600', fontFamily: 'var(--font-mono)' }}>v0.378.0</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--muted-foreground)' }}>QR / Barcode Scanner:</span>
                    <span style={{ fontWeight: '600', fontFamily: 'var(--font-mono)' }}>v2.3.8</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--muted-foreground)' }}>Design System:</span>
                    <span style={{ fontWeight: '600' }}>Glassmorphism & CSS3</span>
                  </div>
                </div>
              </div>

              {/* Backend Server */}
              <div style={{
                background: 'var(--muted)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius)',
                padding: '1rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.65rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
                  <Server size={16} style={{ color: '#10b981' }} />
                  <strong style={{ fontSize: '0.85rem', color: 'var(--foreground)' }}>Backend API Server</strong>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.785rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--muted-foreground)' }}>Node.js Runtime:</span>
                    <span style={{ fontWeight: '600', fontFamily: 'var(--font-mono)' }}>{versionInfo.node_version || 'v20+ LTS'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--muted-foreground)' }}>Express REST Framework:</span>
                    <span style={{ fontWeight: '600', fontFamily: 'var(--font-mono)' }}>v4.19.2</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--muted-foreground)' }}>Docxtemplater & PizZip:</span>
                    <span style={{ fontWeight: '600', fontFamily: 'var(--font-mono)' }}>v3.45.0</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--muted-foreground)' }}>Tesseract.js (OCR):</span>
                    <span style={{ fontWeight: '600', fontFamily: 'var(--font-mono)' }}>v5.0.5</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--muted-foreground)' }}>Nodemailer (SMTP):</span>
                    <span style={{ fontWeight: '600', fontFamily: 'var(--font-mono)' }}>v6.9.13</span>
                  </div>
                </div>
              </div>

              {/* Database & Persistence */}
              <div style={{
                background: 'var(--muted)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius)',
                padding: '1rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.65rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
                  <Database size={16} style={{ color: '#f59e0b' }} />
                  <strong style={{ fontSize: '0.85rem', color: 'var(--foreground)' }}>Database & Storage</strong>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.785rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--muted-foreground)' }}>Database Engine:</span>
                    <span style={{ fontWeight: '600' }}>SQLite 3</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--muted-foreground)' }}>Journal Mode:</span>
                    <span style={{ fontWeight: '600', color: '#10b981' }}>WAL (Write-Ahead Log)</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--muted-foreground)' }}>Node Driver (sqlite3):</span>
                    <span style={{ fontWeight: '600', fontFamily: 'var(--font-mono)' }}>v5.1.7</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--muted-foreground)' }}>SQLite Async Wrapper:</span>
                    <span style={{ fontWeight: '600', fontFamily: 'var(--font-mono)' }}>v5.1.1</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--muted-foreground)' }}>Persistence Path:</span>
                    <span style={{ fontWeight: '500', fontFamily: 'var(--font-mono)', fontSize: '0.7rem' }}>/data/base.db</span>
                  </div>
                </div>
              </div>

              {/* Deployment & DevOps */}
              <div style={{
                background: 'var(--muted)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius)',
                padding: '1rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.65rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
                  <Layers size={16} style={{ color: '#8b5cf6' }} />
                  <strong style={{ fontSize: '0.85rem', color: 'var(--foreground)' }}>DevOps & Deployment</strong>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.785rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--muted-foreground)' }}>Container Engine:</span>
                    <span style={{ fontWeight: '600' }}>Docker Multi-stage</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--muted-foreground)' }}>Orchestrator:</span>
                    <span style={{ fontWeight: '600' }}>Portainer CE / Compose</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--muted-foreground)' }}>CI/CD Pipeline:</span>
                    <span style={{ fontWeight: '600' }}>GitHub Actions</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--muted-foreground)' }}>Image Registry:</span>
                    <span style={{ fontWeight: '600', fontFamily: 'var(--font-mono)', fontSize: '0.7rem' }}>ghcr.io (GHCR)</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--muted-foreground)' }}>Base Image:</span>
                    <span style={{ fontWeight: '500', fontFamily: 'var(--font-mono)' }}>node:20-alpine</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* SITE HTTP & SECURITY HEADERS SECTION */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{
                padding: '0.5rem',
                borderRadius: '10px',
                background: 'rgba(16, 185, 129, 0.1)',
                color: '#10b981',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <ShieldCheck size={20} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: '600', margin: 0, color: 'var(--foreground)' }}>
                  Site HTTP & Security Headers
                </h3>
                <p style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)', margin: '0.15rem 0 0 0' }}>
                  Standard HTTP request headers, authentication headers, and transport security policies utilized by Family Hub
                </p>
              </div>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
              gap: '1rem'
            }}>
              {/* Inbound Request Headers */}
              <div style={{
                background: 'var(--muted)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius)',
                padding: '1rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
                  <Globe size={16} style={{ color: 'var(--primary)' }} />
                  <strong style={{ fontSize: '0.85rem', color: 'var(--foreground)' }}>Client Request Headers (Inbound)</strong>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', fontSize: '0.785rem' }}>
                  <div style={{ background: 'var(--background)', padding: '0.6rem 0.75rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.2rem' }}>
                      <code style={{ fontWeight: 'bold', color: 'var(--primary)', fontSize: '0.8rem' }}>Authorization</code>
                      <span style={{ fontSize: '0.65rem', background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6', padding: '0.1rem 0.35rem', borderRadius: '4px' }}>Session Auth</span>
                    </div>
                    <span style={{ color: 'var(--muted-foreground)', display: 'block', fontSize: '0.725rem' }}>
                      <code>Bearer &lt;jwt_session_token&gt;</code> - Used for active interactive user browser sessions.
                    </span>
                  </div>

                  <div style={{ background: 'var(--background)', padding: '0.6rem 0.75rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.2rem' }}>
                      <code style={{ fontWeight: 'bold', color: 'var(--primary)', fontSize: '0.8rem' }}>X-API-Key</code>
                      <span style={{ fontSize: '0.65rem', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', padding: '0.1rem 0.35rem', borderRadius: '4px' }}>External API</span>
                    </div>
                    <span style={{ color: 'var(--muted-foreground)', display: 'block', fontSize: '0.725rem' }}>
                      <code>&lt;configured_secret_api_key&gt;</code> - Required for external automation, scripts, and mobile integrations.
                    </span>
                  </div>

                  <div style={{ background: 'var(--background)', padding: '0.6rem 0.75rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.2rem' }}>
                      <code style={{ fontWeight: 'bold', color: 'var(--primary)', fontSize: '0.8rem' }}>Content-Type</code>
                      <span style={{ fontSize: '0.65rem', background: 'rgba(107, 114, 128, 0.15)', color: 'var(--foreground)', padding: '0.1rem 0.35rem', borderRadius: '4px' }}>Payload Format</span>
                    </div>
                    <span style={{ color: 'var(--muted-foreground)', display: 'block', fontSize: '0.725rem' }}>
                      <code>application/json</code> (or <code>multipart/form-data</code> for picture/template uploads).
                    </span>
                  </div>

                  <div style={{ background: 'var(--background)', padding: '0.6rem 0.75rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.2rem' }}>
                      <code style={{ fontWeight: 'bold', color: 'var(--primary)', fontSize: '0.8rem' }}>X-Signature</code>
                      <span style={{ fontSize: '0.65rem', background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', padding: '0.1rem 0.35rem', borderRadius: '4px' }}>Webhook HMAC</span>
                    </div>
                    <span style={{ color: 'var(--muted-foreground)', display: 'block', fontSize: '0.725rem' }}>
                      <code>sha256=&lt;hmac_hex&gt;</code> - Attached to outgoing webhook event dispatches for tamper verification.
                    </span>
                  </div>
                </div>
              </div>

              {/* Outbound Response & Security Headers */}
              <div style={{
                background: 'var(--muted)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius)',
                padding: '1rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
                  <Shield size={16} style={{ color: '#10b981' }} />
                  <strong style={{ fontSize: '0.85rem', color: 'var(--foreground)' }}>Security & CORS Headers (Outbound)</strong>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', fontSize: '0.785rem' }}>
                  <div style={{ background: 'var(--background)', padding: '0.6rem 0.75rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.2rem' }}>
                      <code style={{ fontWeight: 'bold', color: '#10b981', fontSize: '0.8rem' }}>Access-Control-Allow-Origin</code>
                      <span style={{ fontSize: '0.65rem', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', padding: '0.1rem 0.35rem', borderRadius: '4px' }}>CORS</span>
                    </div>
                    <span style={{ color: 'var(--muted-foreground)', display: 'block', fontSize: '0.725rem' }}>
                      Configured to allow authorized cross-origin requests from companion tools, dashboards, and mobile clients.
                    </span>
                  </div>

                  <div style={{ background: 'var(--background)', padding: '0.6rem 0.75rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.2rem' }}>
                      <code style={{ fontWeight: 'bold', color: '#10b981', fontSize: '0.8rem' }}>Cache-Control</code>
                      <span style={{ fontSize: '0.65rem', background: 'rgba(107, 114, 128, 0.15)', color: 'var(--foreground)', padding: '0.1rem 0.35rem', borderRadius: '4px' }}>Caching Policy</span>
                    </div>
                    <span style={{ color: 'var(--muted-foreground)', display: 'block', fontSize: '0.725rem' }}>
                      <code>no-cache, no-store, must-revalidate</code> on dynamic JSON APIs; immutable content hashing on static assets.
                    </span>
                  </div>

                  <div style={{ background: 'var(--background)', padding: '0.6rem 0.75rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.2rem' }}>
                      <code style={{ fontWeight: 'bold', color: '#10b981', fontSize: '0.8rem' }}>X-Content-Type-Options</code>
                      <span style={{ fontSize: '0.65rem', background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6', padding: '0.1rem 0.35rem', borderRadius: '4px' }}>MIME Defense</span>
                    </div>
                    <span style={{ color: 'var(--muted-foreground)', display: 'block', fontSize: '0.725rem' }}>
                      <code>nosniff</code> - Prevents the browser from MIME-sniffing a response away from the declared Content-Type.
                    </span>
                  </div>

                  <div style={{ background: 'var(--background)', padding: '0.6rem 0.75rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.2rem' }}>
                      <code style={{ fontWeight: 'bold', color: '#10b981', fontSize: '0.8rem' }}>X-Frame-Options</code>
                      <span style={{ fontSize: '0.65rem', background: 'rgba(244, 63, 94, 0.15)', color: '#f43f5e', padding: '0.1rem 0.35rem', borderRadius: '4px' }}>Clickjacking</span>
                    </div>
                    <span style={{ color: 'var(--muted-foreground)', display: 'block', fontSize: '0.725rem' }}>
                      <code>SAMEORIGIN</code> - Restricts frame embedding to protect against clickjacking attacks.
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* COLLAPSIBLE API DOCUMENTATION SUB-SECTION */}
          <div className="card" style={{ border: '1px solid var(--border)', padding: 0, overflow: 'hidden' }}>
            
            {/* Collapsible Accordion Header */}
            <div
              onClick={() => setIsApiDocsOpen(!isApiDocsOpen)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '1.25rem 1.5rem',
                cursor: 'pointer',
                background: isApiDocsOpen ? 'var(--muted)' : 'var(--card)',
                borderBottom: isApiDocsOpen ? '1px solid var(--border)' : 'none',
                transition: 'background 0.2s ease'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '8px',
                  background: 'rgba(16, 185, 129, 0.1)',
                  color: '#10b981',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Code size={20} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: '600', margin: 0, color: 'var(--foreground)' }}>
                    API Documentation
                  </h3>
                  <p style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)', margin: '0.15rem 0 0 0' }}>
                    REST API endpoints for Recipes, Shopping, Tasks, Calendar, Bills, Subscriptions, Inventory, Books, and Settings
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)', fontWeight: '500' }}>
                  {isApiDocsOpen ? 'Collapse' : 'Expand API Docs'}
                </span>
                <div style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'var(--background)',
                  border: '1px solid var(--border)'
                }}>
                  {isApiDocsOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                </div>
              </div>
            </div>

            {/* Collapsible Content */}
            {isApiDocsOpen && (
              <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                
                {/* Authentication Overview */}
                <div style={{
                  background: 'var(--muted)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius)',
                  padding: '1.25rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Key size={18} style={{ color: 'var(--primary)' }} />
                    <h4 style={{ fontSize: '0.95rem', fontWeight: '600', margin: 0 }}>Authentication Methods</h4>
                  </div>
                  <p style={{ fontSize: '0.8125rem', color: 'var(--foreground)', margin: 0, lineHeight: '1.5' }}>
                    All endpoints require authentication. You can authenticate HTTP requests using one of the following methods:
                  </p>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '0.75rem' }}>
                    <div style={{ background: 'var(--background)', padding: '0.75rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
                      <strong style={{ fontSize: '0.75rem', color: 'var(--primary)', display: 'block', marginBottom: '0.25rem' }}>1. HTTP Header (Recommended)</strong>
                      <code style={{ fontSize: '0.75rem', color: 'var(--foreground)' }}>X-API-Key: YOUR_API_KEY</code>
                    </div>
                    <div style={{ background: 'var(--background)', padding: '0.75rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
                      <strong style={{ fontSize: '0.75rem', color: 'var(--primary)', display: 'block', marginBottom: '0.25rem' }}>2. Query Parameter</strong>
                      <code style={{ fontSize: '0.75rem', color: 'var(--foreground)' }}>?api_key=YOUR_API_KEY</code>
                    </div>
                    <div style={{ background: 'var(--background)', padding: '0.75rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
                      <strong style={{ fontSize: '0.75rem', color: 'var(--primary)', display: 'block', marginBottom: '0.25rem' }}>3. JWT Bearer Token</strong>
                      <code style={{ fontSize: '0.75rem', color: 'var(--foreground)' }}>Authorization: Bearer &lt;token&gt;</code>
                    </div>
                  </div>

                  {currentUser?.role_name === 'Administrator' && apiKey && (
                    <div style={{
                      marginTop: '0.5rem',
                      padding: '0.75rem',
                      background: 'var(--card)',
                      borderRadius: 'var(--radius)',
                      border: '1px solid var(--border)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '0.5rem'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: '600' }}>Your Active Admin API Key:</span>
                        <code style={{ fontSize: '0.75rem', background: 'var(--background)', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>
                          {revealKey ? apiKey : '••••••••••••••••••••••••'}
                        </code>
                      </div>
                      <div style={{ display: 'flex', gap: '0.35rem' }}>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem' }}
                          onClick={() => setRevealKey(!revealKey)}
                        >
                          {revealKey ? <EyeOff size={12} /> : <Eye size={12} />}
                          <span style={{ marginLeft: '0.25rem' }}>{revealKey ? 'Hide' : 'Reveal'}</span>
                        </button>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem' }}
                          onClick={() => handleCopyText(apiKey, 'API Key')}
                        >
                          <Copy size={12} />
                          <span style={{ marginLeft: '0.25rem' }}>Copy Key</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Filter and Search Bar */}
                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
                  
                  {/* Category Pills */}
                  <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                    {[
                      { id: 'all', label: 'All Endpoints' },
                      { id: 'recipes', label: 'Recipes' },
                      { id: 'shopping', label: 'Shopping Lists' },
                      { id: 'todos', label: 'Tasks & Todos' },
                      { id: 'calendar', label: 'Calendar' },
                      { id: 'money', label: 'Money & Bills' },
                      { id: 'kitchen', label: 'Kitchen & Leftovers' },
                      { id: 'library', label: 'Books & Library' },
                      { id: 'contacts', label: 'Contacts' },
                      { id: 'health', label: 'Health & Pets' },
                      { id: 'games', label: 'Games' },
                      { id: 'housekeeping', label: 'Housekeeping' },
                      { id: 'focus', label: 'Focus & ADHD' },
                      { id: 'mobile', label: 'Mobile & Devices' },
                      { id: 'system', label: 'System & Admin' }
                    ].map(cat => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setApiDocsFilter(cat.id)}
                        className={`btn ${apiDocsFilter === cat.id ? 'btn-primary' : 'btn-secondary'}`}
                        style={{
                          fontSize: '0.725rem',
                          padding: '0.25rem 0.6rem',
                          borderRadius: '9999px'
                        }}
                      >
                        {cat.label}
                      </button>
                    ))}
                  </div>

                  {/* Search input */}
                  <div style={{ position: 'relative', width: '220px' }}>
                    <Search size={14} style={{ position: 'absolute', left: '0.6rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted-foreground)' }} />
                    <input
                      type="text"
                      className="input-control"
                      value={apiDocsSearch}
                      onChange={(e) => setApiDocsSearch(e.target.value)}
                      placeholder="Search endpoints..."
                      style={{ fontSize: '0.75rem', paddingLeft: '1.8rem', height: '1.85rem' }}
                    />
                  </div>

                </div>

                {/* Endpoints List */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                  {[
                    // RECIPES
                    {
                      categoryKey: 'recipes',
                      categoryName: 'Recipes & Cookbooks',
                      method: 'GET',
                      path: '/api/recipes',
                      title: 'List Recipes',
                      desc: 'Retrieve all recipes in the cookbook, including title, tags, favorite flag, notes, prep/cook times, and ratings.',
                      curl: `curl -H "X-API-Key: ${apiKey || 'YOUR_API_KEY'}" "${window.location.origin}/api/recipes"`
                    },
                    {
                      categoryKey: 'recipes',
                      categoryName: 'Recipes & Cookbooks',
                      method: 'POST',
                      path: '/api/recipes',
                      title: 'Create Recipe',
                      desc: 'Create a new recipe with ingredients, instructions, notes, cooking times, tags, and servings.',
                      payload: JSON.stringify({
                        title: "Homemade Lasagna",
                        prep_time: "30 mins",
                        cook_time: "45 mins",
                        servings: 6,
                        tags: ["Italian", "Dinner", "Pasta"],
                        ingredients: [{ item: "Lasagna noodles", amount: "12", unit: "sheets" }],
                        instructions: [{ step: "Boil noodles until al dente." }],
                        notes: [{ note: "Can be prepared ahead of time and refrigerated overnight." }]
                      }, null, 2),
                      curl: `curl -X POST -H "X-API-Key: ${apiKey || 'YOUR_API_KEY'}" -H "Content-Type: application/json" -d '{"title":"Homemade Lasagna","prep_time":"30 mins","cook_time":"45 mins","servings":6,"tags":["Italian"],"ingredients":[{"item":"Noodles","amount":"12","unit":"sheets"}],"instructions":[{"step":"Boil noodles."}],"notes":[{"note":"Preheat oven to 375°F."}]}' "${window.location.origin}/api/recipes"`
                    },
                    {
                      categoryKey: 'recipes',
                      categoryName: 'Recipes & Cookbooks',
                      method: 'GET',
                      path: '/api/recipes/:id',
                      title: 'Get Recipe Details',
                      desc: 'Retrieve full recipe details including structured ingredients, instructions, tags, and bulleted notes.',
                      curl: `curl -H "X-API-Key: ${apiKey || 'YOUR_API_KEY'}" "${window.location.origin}/api/recipes/1"`
                    },
                    {
                      categoryKey: 'recipes',
                      categoryName: 'Recipes & Cookbooks',
                      method: 'PUT',
                      path: '/api/recipes/:id',
                      title: 'Update Recipe',
                      desc: 'Update an existing recipe including its title, ingredients, instructions, notes, and metadata.',
                      payload: JSON.stringify({
                        title: "Updated Recipe Title",
                        notes: [{ note: "Add fresh chopped basil right before serving." }]
                      }, null, 2),
                      curl: `curl -X PUT -H "X-API-Key: ${apiKey || 'YOUR_API_KEY'}" -H "Content-Type: application/json" -d '{"title":"Updated Recipe Title","notes":[{"note":"Add fresh chopped basil."}]}' "${window.location.origin}/api/recipes/1"`
                    },
                    {
                      categoryKey: 'recipes',
                      categoryName: 'Recipes & Cookbooks',
                      method: 'DELETE',
                      path: '/api/recipes/:id',
                      title: 'Delete Recipe',
                      desc: 'Delete a recipe permanently from the cookbook database.',
                      curl: `curl -X DELETE -H "X-API-Key: ${apiKey || 'YOUR_API_KEY'}" "${window.location.origin}/api/recipes/1"`
                    },
                    {
                      categoryKey: 'recipes',
                      categoryName: 'Recipes & Cookbooks',
                      method: 'POST',
                      path: '/api/recipes/:id/favorite',
                      title: 'Toggle Recipe Favorite',
                      desc: 'Toggle the favorite status for a recipe in the user cookbook.',
                      curl: `curl -X POST -H "X-API-Key: ${apiKey || 'YOUR_API_KEY'}" "${window.location.origin}/api/recipes/1/favorite"`
                    },
                    {
                      categoryKey: 'recipes',
                      categoryName: 'Recipes & Cookbooks',
                      method: 'GET',
                      path: '/api/recipes/:id/export',
                      title: 'Export Recipe to Word (.docx)',
                      desc: 'Export a recipe to a Microsoft Word document including ingredients, instructions, and notes.',
                      curl: `curl -H "X-API-Key: ${apiKey || 'YOUR_API_KEY'}" -O -J "${window.location.origin}/api/recipes/1/export"`
                    },

                    // SHOPPING LISTS
                    {
                      categoryKey: 'shopping',
                      categoryName: 'Shopping Lists & Items',
                      method: 'GET',
                      path: '/api/shopping-lists',
                      title: 'List Shopping Lists',
                      desc: 'Retrieve all shopping lists for the authenticated user and any lists shared with them.',
                      curl: `curl -H "X-API-Key: ${apiKey || 'YOUR_API_KEY'}" "${window.location.origin}/api/shopping-lists"`
                    },
                    {
                      categoryKey: 'shopping',
                      categoryName: 'Shopping Lists & Items',
                      method: 'POST',
                      path: '/api/shopping-lists',
                      title: 'Create Shopping List',
                      desc: 'Create a new custom shopping list.',
                      payload: JSON.stringify({ name: "Costco Weekly Run" }, null, 2),
                      curl: `curl -X POST -H "X-API-Key: ${apiKey || 'YOUR_API_KEY'}" -H "Content-Type: application/json" -d '{"name":"Costco Weekly Run"}' "${window.location.origin}/api/shopping-lists"`
                    },
                    {
                      categoryKey: 'shopping',
                      categoryName: 'Shopping Lists & Items',
                      method: 'GET',
                      path: '/api/shopping-lists/:id',
                      title: 'Get Shopping List Items',
                      desc: 'Retrieve all items inside a shopping list categorized by store aisle / department.',
                      curl: `curl -H "X-API-Key: ${apiKey || 'YOUR_API_KEY'}" "${window.location.origin}/api/shopping-lists/1"`
                    },
                    {
                      categoryKey: 'shopping',
                      categoryName: 'Shopping Lists & Items',
                      method: 'POST',
                      path: '/api/shopping-lists/:id/items',
                      title: 'Add Item to Shopping List',
                      desc: 'Add an item with department, quantity, unit, and item name to a shopping list.',
                      payload: JSON.stringify({ name: "Organic Whole Milk", quantity: 2, unit: "gallons", department: "Dairy" }, null, 2),
                      curl: `curl -X POST -H "X-API-Key: ${apiKey || 'YOUR_API_KEY'}" -H "Content-Type: application/json" -d '{"name":"Organic Whole Milk","quantity":2,"unit":"gallons","department":"Dairy"}' "${window.location.origin}/api/shopping-lists/1/items"`
                    },
                    {
                      categoryKey: 'shopping',
                      categoryName: 'Shopping Lists & Items',
                      method: 'PUT',
                      path: '/api/shopping-lists/:id/items/:itemId',
                      title: 'Update Shopping Item',
                      desc: 'Update item name, quantity, unit, or toggle checked status.',
                      payload: JSON.stringify({ checked: true, quantity: 3 }, null, 2),
                      curl: `curl -X PUT -H "X-API-Key: ${apiKey || 'YOUR_API_KEY'}" -H "Content-Type: application/json" -d '{"checked":true}' "${window.location.origin}/api/shopping-lists/1/items/10"`
                    },
                    {
                      categoryKey: 'shopping',
                      categoryName: 'Shopping Lists & Items',
                      method: 'DELETE',
                      path: '/api/shopping-lists/:id/items/:itemId',
                      title: 'Delete Shopping Item',
                      desc: 'Remove an item from a shopping list.',
                      curl: `curl -X DELETE -H "X-API-Key: ${apiKey || 'YOUR_API_KEY'}" "${window.location.origin}/api/shopping-lists/1/items/10"`
                    },

                    // TODOS & TASKS
                    {
                      categoryKey: 'todos',
                      categoryName: 'Todo Lists & Tasks',
                      method: 'GET',
                      path: '/api/todos/lists',
                      title: 'List Todo Lists',
                      desc: 'List all task lists and groups created by or shared with the user.',
                      curl: `curl -H "X-API-Key: ${apiKey || 'YOUR_API_KEY'}" "${window.location.origin}/api/todos/lists"`
                    },
                    {
                      categoryKey: 'todos',
                      categoryName: 'Todo Lists & Tasks',
                      method: 'GET',
                      path: '/api/todos/tasks',
                      title: 'List Tasks',
                      desc: 'Retrieve tasks with optional filters for list_id, completed status, priority, and date range.',
                      curl: `curl -H "X-API-Key: ${apiKey || 'YOUR_API_KEY'}" "${window.location.origin}/api/todos/tasks?completed=false"`
                    },
                    {
                      categoryKey: 'todos',
                      categoryName: 'Todo Lists & Tasks',
                      method: 'POST',
                      path: '/api/todos/tasks',
                      title: 'Create Task',
                      desc: 'Create a new task with due date, priority, category, and list assignment.',
                      payload: JSON.stringify({ title: "Replace furnace filter", due_date: "2026-10-01", priority: "high", list_id: 1 }, null, 2),
                      curl: `curl -X POST -H "X-API-Key: ${apiKey || 'YOUR_API_KEY'}" -H "Content-Type: application/json" -d '{"title":"Replace furnace filter","due_date":"2026-10-01","priority":"high","list_id":1}' "${window.location.origin}/api/todos/tasks"`
                    },
                    {
                      categoryKey: 'todos',
                      categoryName: 'Todo Lists & Tasks',
                      method: 'PUT',
                      path: '/api/todos/tasks/:id',
                      title: 'Update / Complete Task',
                      desc: 'Update task properties or toggle task completion status.',
                      payload: JSON.stringify({ completed: 1 }, null, 2),
                      curl: `curl -X PUT -H "X-API-Key: ${apiKey || 'YOUR_API_KEY'}" -H "Content-Type: application/json" -d '{"completed":1}' "${window.location.origin}/api/todos/tasks/1"`
                    },

                    // CALENDAR & EVENTS
                    {
                      categoryKey: 'calendar',
                      categoryName: 'Calendar & Events',
                      method: 'GET',
                      path: '/api/calendar/events',
                      title: 'Get Calendar Events',
                      desc: 'Retrieve calendar events, holidays, task deadlines, and bill due dates across date ranges.',
                      curl: `curl -H "X-API-Key: ${apiKey || 'YOUR_API_KEY'}" "${window.location.origin}/api/calendar/events?start=2026-09-01&end=2026-09-30"`
                    },
                    {
                      categoryKey: 'calendar',
                      categoryName: 'Calendar & Events',
                      method: 'POST',
                      path: '/api/calendar/events',
                      title: 'Create Calendar Event',
                      desc: 'Create a calendar event with start/end time, location, notes, and reminders.',
                      payload: JSON.stringify({ title: "Dentist Appointment", start_time: "2026-09-28T14:00:00Z", end_time: "2026-09-28T15:00:00Z", location: "Downtown Dental" }, null, 2),
                      curl: `curl -X POST -H "X-API-Key: ${apiKey || 'YOUR_API_KEY'}" -H "Content-Type: application/json" -d '{"title":"Dentist Appointment","start_time":"2026-09-28T14:00:00Z","end_time":"2026-09-28T15:00:00Z"}' "${window.location.origin}/api/calendar/events"`
                    },
                    {
                      categoryKey: 'calendar',
                      categoryName: 'Calendar & Events',
                      method: 'GET',
                      path: '/api/users/profile/important-dates',
                      title: 'List Important Family Dates',
                      desc: 'List personal and family important dates (birthdays, anniversaries, special events).',
                      curl: `curl -H "X-API-Key: ${apiKey || 'YOUR_API_KEY'}" "${window.location.origin}/api/users/profile/important-dates"`
                    },

                    // MONEY & MONARCH
                    {
                      categoryKey: 'money',
                      categoryName: 'Money, Bills & Monarch',
                      method: 'GET',
                      path: '/api/money/bills',
                      title: 'Get Upcoming Bills',
                      desc: 'Retrieve upcoming and recurring bills with due dates, amounts, and paid status.',
                      curl: `curl -H "X-API-Key: ${apiKey || 'YOUR_API_KEY'}" "${window.location.origin}/api/money/bills"`
                    },
                    {
                      categoryKey: 'money',
                      categoryName: 'Money, Bills & Monarch',
                      method: 'POST',
                      path: '/api/money/bills',
                      title: 'Create Bill',
                      desc: 'Add an upcoming bill entry.',
                      payload: JSON.stringify({ title: "Electric Utility", amount: 145.50, due_date: "2026-10-05", category: "Utilities" }, null, 2),
                      curl: `curl -X POST -H "X-API-Key: ${apiKey || 'YOUR_API_KEY'}" -H "Content-Type: application/json" -d '{"title":"Electric Utility","amount":145.50,"due_date":"2026-10-05","category":"Utilities"}' "${window.location.origin}/api/money/bills"`
                    },
                    {
                      categoryKey: 'money',
                      categoryName: 'Money, Bills & Monarch',
                      method: 'GET',
                      path: '/api/money/subscriptions',
                      title: 'Get Subscriptions',
                      desc: 'List all recurring subscriptions, renewal cadences, and monthly costs.',
                      curl: `curl -H "X-API-Key: ${apiKey || 'YOUR_API_KEY'}" "${window.location.origin}/api/money/subscriptions"`
                    },
                    {
                      categoryKey: 'money',
                      categoryName: 'Money, Bills & Monarch',
                      method: 'GET',
                      path: '/api/monarch/accounts',
                      title: 'Get Monarch Accounts & Balances',
                      desc: 'Retrieve synchronized accounts, bank balances, and asset/liability summaries from Monarch Money.',
                      curl: `curl -H "X-API-Key: ${apiKey || 'YOUR_API_KEY'}" "${window.location.origin}/api/monarch/accounts"`
                    },

                    // KITCHEN & INVENTORY
                    {
                      categoryKey: 'kitchen',
                      categoryName: 'Kitchen, Pantry & Meal Planner',
                      method: 'GET',
                      path: '/api/inventory',
                      title: 'Get Pantry Inventory',
                      desc: 'List all pantry, refrigerator, freezer, and spice items with quantities and expiration dates.',
                      curl: `curl -H "X-API-Key: ${apiKey || 'YOUR_API_KEY'}" "${window.location.origin}/api/inventory"`
                    },
                    {
                      categoryKey: 'kitchen',
                      categoryName: 'Kitchen, Pantry & Meal Planner',
                      method: 'POST',
                      path: '/api/inventory',
                      title: 'Add Inventory Item',
                      desc: 'Add an item to pantry, freezer, or fridge inventory.',
                      payload: JSON.stringify({ item_name: "Olive Oil", location: "Pantry", quantity: 2, unit: "bottles", expires_at: "2027-01-01" }, null, 2),
                      curl: `curl -X POST -H "X-API-Key: ${apiKey || 'YOUR_API_KEY'}" -H "Content-Type: application/json" -d '{"item_name":"Olive Oil","location":"Pantry","quantity":2,"unit":"bottles"}' "${window.location.origin}/api/inventory"`
                    },
                    {
                      categoryKey: 'kitchen',
                      categoryName: 'Kitchen, Pantry & Meal Planner',
                      method: 'GET',
                      path: '/api/leftovers',
                      title: 'Get Leftovers',
                      desc: 'Retrieve active refrigerated leftovers and safe consumption dates.',
                      curl: `curl -H "X-API-Key: ${apiKey || 'YOUR_API_KEY'}" "${window.location.origin}/api/leftovers"`
                    },
                    {
                      categoryKey: 'kitchen',
                      categoryName: 'Kitchen, Pantry & Meal Planner',
                      method: 'GET',
                      path: '/api/menu',
                      title: 'Get Weekly Meal Plan',
                      desc: 'Retrieve scheduled breakfast, lunch, and dinner recipes for each day of the week.',
                      curl: `curl -H "X-API-Key: ${apiKey || 'YOUR_API_KEY'}" "${window.location.origin}/api/menu"`
                    },

                    // LIBRARY & BOOKS
                    {
                      categoryKey: 'library',
                      categoryName: 'Library, Books & Reading',
                      method: 'GET',
                      path: '/api/books',
                      title: 'Get Books Catalog',
                      desc: 'Retrieve books in the family catalog with search, tags, genre, and reading status.',
                      curl: `curl -H "X-API-Key: ${apiKey || 'YOUR_API_KEY'}" "${window.location.origin}/api/books?search=tolkien"`
                    },
                    {
                      categoryKey: 'library',
                      categoryName: 'Library, Books & Reading',
                      method: 'POST',
                      path: '/api/books',
                      title: 'Add Book to Catalog',
                      desc: 'Add a new book manually or with ISBN metadata.',
                      payload: JSON.stringify({ title: "The Hobbit", author: "J.R.R. Tolkien", isbn: "9780547928227", total_pages: 310, status: "completed", rating: 5 }, null, 2),
                      curl: `curl -X POST -H "X-API-Key: ${apiKey || 'YOUR_API_KEY'}" -H "Content-Type: application/json" -d '{"title":"The Hobbit","author":"J.R.R. Tolkien","isbn":"9780547928227","total_pages":310}' "${window.location.origin}/api/books"`
                    },
                    {
                      categoryKey: 'library',
                      categoryName: 'Library, Books & Reading',
                      method: 'GET',
                      path: '/api/reading-lists',
                      title: 'Get Reading Lists',
                      desc: 'Retrieve custom reading lists for family members.',
                      curl: `curl -H "X-API-Key: ${apiKey || 'YOUR_API_KEY'}" "${window.location.origin}/api/reading-lists"`
                    },

                    // CONTACTS
                    {
                      categoryKey: 'contacts',
                      categoryName: 'Contacts & Family Relationships',
                      method: 'GET',
                      path: '/api/contacts',
                      title: 'List Contacts',
                      desc: 'Retrieve family and friend contacts, phone numbers, emails, addresses, and birthdays.',
                      curl: `curl -H "X-API-Key: ${apiKey || 'YOUR_API_KEY'}" "${window.location.origin}/api/contacts"`
                    },
                    {
                      categoryKey: 'contacts',
                      categoryName: 'Contacts & Family Relationships',
                      method: 'POST',
                      path: '/api/contacts',
                      title: 'Create Contact',
                      desc: 'Add a new contact entry with contact details and birthday.',
                      payload: JSON.stringify({ name: "Jane Smith", email: "jane@example.com", phone: "555-123-4567", birthday: "1990-05-12" }, null, 2),
                      curl: `curl -X POST -H "X-API-Key: ${apiKey || 'YOUR_API_KEY'}" -H "Content-Type: application/json" -d '{"name":"Jane Smith","email":"jane@example.com","phone":"555-123-4567"}' "${window.location.origin}/api/contacts"`
                    },
                    {
                      categoryKey: 'contacts',
                      categoryName: 'Contacts & Family Relationships',
                      method: 'GET',
                      path: '/api/relationships',
                      title: 'Get Family Relationships',
                      desc: 'Retrieve mapped relationships (e.g. spouse, child, parent) between users and contacts.',
                      curl: `curl -H "X-API-Key: ${apiKey || 'YOUR_API_KEY'}" "${window.location.origin}/api/relationships"`
                    },

                    // HEALTH & PETS
                    {
                      categoryKey: 'health',
                      categoryName: 'Health, Medications & Pets',
                      method: 'GET',
                      path: '/api/health-logs',
                      title: 'List Health Logs',
                      desc: 'Retrieve all logged daily health records (steps, water, sleep, mood, weight, notes) for the authenticated user.',
                      curl: `curl -H "X-API-Key: ${apiKey || 'YOUR_API_KEY'}" "${window.location.origin}/api/health-logs"`
                    },
                    {
                      categoryKey: 'health',
                      categoryName: 'Health, Medications & Pets',
                      method: 'POST',
                      path: '/api/health-logs',
                      title: 'Log Daily Health Metrics',
                      desc: 'Create or update daily wellness log for a specific date.',
                      payload: JSON.stringify({ log_date: "2026-09-24", steps: 8500, water_ml: 2500, sleep_hours: 7.5, mood: "Great", weight: 172.5, notes: "Felt energized" }, null, 2),
                      curl: `curl -X POST -H "X-API-Key: ${apiKey || 'YOUR_API_KEY'}" -H "Content-Type: application/json" -d '{"log_date":"2026-09-24","steps":8500,"water_ml":2500,"sleep_hours":7.5,"mood":"Great","weight":172.5}' "${window.location.origin}/api/health-logs"`
                    },
                    {
                      categoryKey: 'health',
                      categoryName: 'Health, Medications & Pets',
                      method: 'GET',
                      path: '/api/medications',
                      title: 'List Medications',
                      desc: 'Retrieve all prescribed and active medications with dosages and frequencies.',
                      curl: `curl -H "X-API-Key: ${apiKey || 'YOUR_API_KEY'}" "${window.location.origin}/api/medications"`
                    },
                    {
                      categoryKey: 'health',
                      categoryName: 'Health, Medications & Pets',
                      method: 'POST',
                      path: '/api/medications',
                      title: 'Add Medication',
                      desc: 'Register a new medication prescription with dosage and administration timing.',
                      payload: JSON.stringify({ name: "Amoxicillin", dosage: "500mg", frequency: "Twice daily", time_of_day: "Morning, Evening", notes: "Take with food" }, null, 2),
                      curl: `curl -X POST -H "X-API-Key: ${apiKey || 'YOUR_API_KEY'}" -H "Content-Type: application/json" -d '{"name":"Amoxicillin","dosage":"500mg","frequency":"Twice daily","time_of_day":"Morning, Evening"}' "${window.location.origin}/api/medications"`
                    },
                    {
                      categoryKey: 'health',
                      categoryName: 'Health, Medications & Pets',
                      method: 'GET',
                      path: '/api/appointments',
                      title: 'List Doctor Appointments',
                      desc: 'Retrieve upcoming and historical medical appointments.',
                      curl: `curl -H "X-API-Key: ${apiKey || 'YOUR_API_KEY'}" "${window.location.origin}/api/appointments"`
                    },
                    {
                      categoryKey: 'health',
                      categoryName: 'Health, Medications & Pets',
                      method: 'POST',
                      path: '/api/appointments',
                      title: 'Schedule Doctor Appointment',
                      desc: 'Add a new doctor or specialist appointment.',
                      payload: JSON.stringify({ provider: "Dr. Smith", specialty: "Dentist", appointment_date: "2026-10-15", appointment_time: "10:30 AM", notes: "Routine cleaning" }, null, 2),
                      curl: `curl -X POST -H "X-API-Key: ${apiKey || 'YOUR_API_KEY'}" -H "Content-Type: application/json" -d '{"provider":"Dr. Smith","specialty":"Dentist","appointment_date":"2026-10-15","appointment_time":"10:30 AM"}' "${window.location.origin}/api/appointments"`
                    },
                    {
                      categoryKey: 'health',
                      categoryName: 'Health, Medications & Pets',
                      method: 'GET',
                      path: '/api/pets',
                      title: 'List Pets',
                      desc: 'Retrieve all family pets with breed, birthdates, weights, and pictures.',
                      curl: `curl -H "X-API-Key: ${apiKey || 'YOUR_API_KEY'}" "${window.location.origin}/api/pets"`
                    },
                    {
                      categoryKey: 'health',
                      categoryName: 'Health, Medications & Pets',
                      method: 'POST',
                      path: '/api/pets',
                      title: 'Add Pet Profile',
                      desc: 'Register a new pet profile (supports JSON or multipart picture upload).',
                      payload: JSON.stringify({ name: "Max", type: "Dog", breed: "Golden Retriever", birthdate: "2022-04-10", weight: 65.5, notes: "Loves tennis balls" }, null, 2),
                      curl: `curl -X POST -H "X-API-Key: ${apiKey || 'YOUR_API_KEY'}" -H "Content-Type: application/json" -d '{"name":"Max","type":"Dog","breed":"Golden Retriever","birthdate":"2022-04-10","weight":65.5}' "${window.location.origin}/api/pets"`
                    },
                    {
                      categoryKey: 'health',
                      categoryName: 'Health, Medications & Pets',
                      method: 'POST',
                      path: '/api/pets/:petId/vet-visits',
                      title: 'Log Vet Visit',
                      desc: 'Record a veterinary clinic checkup or medical visit for a pet.',
                      payload: JSON.stringify({ visit_date: "2026-09-20", provider: "Oak Animal Hospital", reason: "Annual Rabies Vaccine", weight_logged: 66.0, notes: "Healthy checkup" }, null, 2),
                      curl: `curl -X POST -H "X-API-Key: ${apiKey || 'YOUR_API_KEY'}" -H "Content-Type: application/json" -d '{"visit_date":"2026-09-20","provider":"Oak Animal Hospital","reason":"Annual Rabies Vaccine","weight_logged":66.0}' "${window.location.origin}/api/pets/1/vet-visits"`
                    },
                    {
                      categoryKey: 'health',
                      categoryName: 'Health, Medications & Pets',
                      method: 'POST',
                      path: '/api/pets/medications/:medId/log',
                      title: 'Log Pet Medication Given',
                      desc: 'Timestamp a pet medication administration event.',
                      payload: JSON.stringify({ given_at: "2026-09-24T08:00:00Z" }, null, 2),
                      curl: `curl -X POST -H "X-API-Key: ${apiKey || 'YOUR_API_KEY'}" -H "Content-Type: application/json" -d '{"given_at":"2026-09-24T08:00:00Z"}' "${window.location.origin}/api/pets/medications/1/log"`
                    },

                    // GAMES & GAME NIGHTS
                    {
                      categoryKey: 'games',
                      categoryName: 'Board Games & Play History',
                      method: 'GET',
                      path: '/api/games',
                      title: 'List Game Collection',
                      desc: 'Retrieve board and card game catalog with player counts, age recommendations, and ratings.',
                      curl: `curl -H "X-API-Key: ${apiKey || 'YOUR_API_KEY'}" "${window.location.origin}/api/games"`
                    },
                    {
                      categoryKey: 'games',
                      categoryName: 'Board Games & Play History',
                      method: 'POST',
                      path: '/api/games',
                      title: 'Add Game to Collection',
                      desc: 'Add a new board or card game to the family library.',
                      payload: JSON.stringify({ title: "Catan", game_type: "Board", min_players: 3, max_players: 4, recommended_ages: "10+", rating: 5 }, null, 2),
                      curl: `curl -X POST -H "X-API-Key: ${apiKey || 'YOUR_API_KEY'}" -H "Content-Type: application/json" -d '{"title":"Catan","game_type":"Board","min_players":3,"max_players":4,"recommended_ages":"10+","rating":5}' "${window.location.origin}/api/games"`
                    },
                    {
                      categoryKey: 'games',
                      categoryName: 'Board Games & Play History',
                      method: 'POST',
                      path: '/api/games/history',
                      title: 'Log Game Play Session',
                      desc: 'Record a played game session with player counts, winner, and optional Markdown notes.',
                      payload: JSON.stringify({ game_id: 1, players_count: 4, winner: "Joshua", played_at: "2026-09-23T20:00:00Z", notes_content: "# Great match!\nJoshua won with longest road." }, null, 2),
                      curl: `curl -X POST -H "X-API-Key: ${apiKey || 'YOUR_API_KEY'}" -H "Content-Type: application/json" -d '{"game_id":1,"players_count":4,"winner":"Joshua"}' "${window.location.origin}/api/games/history"`
                    },

                    // HOUSEKEEPING & CHORES
                    {
                      categoryKey: 'housekeeping',
                      categoryName: 'Housekeeping & Chores',
                      method: 'GET',
                      path: '/api/housekeeping/tasks',
                      title: 'List Housekeeping Tasks',
                      desc: 'Retrieve household chores, due dates, reoccurrence rules, and assignees.',
                      curl: `curl -H "X-API-Key: ${apiKey || 'YOUR_API_KEY'}" "${window.location.origin}/api/housekeeping/tasks"`
                    },
                    {
                      categoryKey: 'housekeeping',
                      categoryName: 'Housekeeping & Chores',
                      method: 'POST',
                      path: '/api/housekeeping/tasks',
                      title: 'Create Housekeeping Task',
                      desc: 'Add a new household chore or cleaning task.',
                      payload: JSON.stringify({ title: "Clean Refrigerator", description: "Wipe down shelves and toss expired condiments", due_date: "2026-09-28", reoccurrence: "monthly", assigned_to_user_id: 1 }, null, 2),
                      curl: `curl -X POST -H "X-API-Key: ${apiKey || 'YOUR_API_KEY'}" -H "Content-Type: application/json" -d '{"title":"Clean Refrigerator","due_date":"2026-09-28","reoccurrence":"monthly"}' "${window.location.origin}/api/housekeeping/tasks"`
                    },
                    {
                      categoryKey: 'housekeeping',
                      categoryName: 'Housekeeping & Chores',
                      method: 'POST',
                      path: '/api/housekeeping/tasks/:id/complete',
                      title: 'Complete Housekeeping Task',
                      desc: 'Mark a chore as completed and auto-advance its due date based on recurrence rules.',
                      curl: `curl -X POST -H "X-API-Key: ${apiKey || 'YOUR_API_KEY'}" "${window.location.origin}/api/housekeeping/tasks/1/complete"`
                    },

                    // FOCUSFLOW & ADHD
                    {
                      categoryKey: 'focus',
                      categoryName: 'FocusFlow, Routines & Habits',
                      method: 'GET',
                      path: '/api/focusflow/tasks',
                      title: 'List FocusFlow Tasks',
                      desc: 'Retrieve FocusFlow tasks across backlog, in-progress, and completed states.',
                      curl: `curl -H "X-API-Key: ${apiKey || 'YOUR_API_KEY'}" "${window.location.origin}/api/focusflow/tasks"`
                    },
                    {
                      categoryKey: 'focus',
                      categoryName: 'FocusFlow, Routines & Habits',
                      method: 'POST',
                      path: '/api/focusflow/tasks',
                      title: 'Create FocusFlow Task',
                      desc: 'Create a new focus task with micro-steps and priority.',
                      payload: JSON.stringify({ title: "Build Mobile App Dashboard", project_id: 1, priority: "high", estimated_time: 45, status: "in_progress" }, null, 2),
                      curl: `curl -X POST -H "X-API-Key: ${apiKey || 'YOUR_API_KEY'}" -H "Content-Type: application/json" -d '{"title":"Build Mobile App Dashboard","priority":"high","estimated_time":45}' "${window.location.origin}/api/focusflow/tasks"`
                    },
                    {
                      categoryKey: 'focus',
                      categoryName: 'FocusFlow, Routines & Habits',
                      method: 'GET',
                      path: '/api/focusflow/habits',
                      title: 'List Habits',
                      desc: 'Retrieve daily and weekly habit streaks and completion status.',
                      curl: `curl -H "X-API-Key: ${apiKey || 'YOUR_API_KEY'}" "${window.location.origin}/api/focusflow/habits"`
                    },
                    {
                      categoryKey: 'focus',
                      categoryName: 'FocusFlow, Routines & Habits',
                      method: 'POST',
                      path: '/api/focusflow/habits/:id/complete',
                      title: 'Toggle Habit Completion',
                      desc: 'Mark a habit complete for today and advance user streak counter.',
                      payload: JSON.stringify({ date: "2026-09-24" }, null, 2),
                      curl: `curl -X POST -H "X-API-Key: ${apiKey || 'YOUR_API_KEY'}" -H "Content-Type: application/json" -d '{"date":"2026-09-24"}' "${window.location.origin}/api/focusflow/habits/1/complete"`
                    },
                    {
                      categoryKey: 'focus',
                      categoryName: 'FocusFlow, Routines & Habits',
                      method: 'POST',
                      path: '/api/focusflow/timelogs/start',
                      title: 'Start Time Tracker',
                      desc: 'Start active focus session time tracking on a specific task.',
                      payload: JSON.stringify({ task_id: 1 }, null, 2),
                      curl: `curl -X POST -H "X-API-Key: ${apiKey || 'YOUR_API_KEY'}" -H "Content-Type: application/json" -d '{"task_id":1}' "${window.location.origin}/api/focusflow/timelogs/start"`
                    },

                    // MOBILE & DEVICES
                    {
                      categoryKey: 'mobile',
                      categoryName: 'Native Mobile App & Push Tokens',
                      method: 'POST',
                      path: '/api/users/push-token',
                      title: 'Register Push Notification Token',
                      desc: 'Register an iOS (APNs/Expo) or Android (FCM/Expo) push device token for native push notifications.',
                      payload: JSON.stringify({ token: "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]", platform: "ios", device_name: "iPhone 15 Pro" }, null, 2),
                      curl: `curl -X POST -H "X-API-Key: ${apiKey || 'YOUR_API_KEY'}" -H "Content-Type: application/json" -d '{"token":"ExponentPushToken[xxxxxxxxxxxx]","platform":"ios","device_name":"iPhone 15 Pro"}' "${window.location.origin}/api/users/push-token"`
                    },
                    {
                      categoryKey: 'mobile',
                      categoryName: 'Native Mobile App & Push Tokens',
                      method: 'DELETE',
                      path: '/api/users/push-token',
                      title: 'Unregister Push Notification Token',
                      desc: 'Remove device push token upon user sign-out from native mobile app.',
                      payload: JSON.stringify({ token: "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]" }, null, 2),
                      curl: `curl -X DELETE -H "X-API-Key: ${apiKey || 'YOUR_API_KEY'}" -H "Content-Type: application/json" -d '{"token":"ExponentPushToken[xxxxxxxxxxxx]"}' "${window.location.origin}/api/users/push-token"`
                    },

                    // SYSTEM & ADMIN
                    {
                      categoryKey: 'system',
                      categoryName: 'System, Notifications & Administration',
                      method: 'GET',
                      path: '/api/notifications/active',
                      title: 'Get Active Notifications',
                      desc: 'Retrieve active system and user alerts.',
                      curl: `curl -H "X-API-Key: ${apiKey || 'YOUR_API_KEY'}" "${window.location.origin}/api/notifications/active"`
                    },
                    {
                      categoryKey: 'system',
                      categoryName: 'System, Notifications & Administration',
                      method: 'GET',
                      path: '/api/users',
                      title: 'List Users (Admin)',
                      desc: 'Retrieves all user accounts, display names, and assigned role IDs.',
                      curl: `curl -H "X-API-Key: ${apiKey || 'YOUR_API_KEY'}" "${window.location.origin}/api/users"`
                    },
                    {
                      categoryKey: 'system',
                      categoryName: 'System, Notifications & Administration',
                      method: 'GET',
                      path: '/api/roles',
                      title: 'List Roles (Admin)',
                      desc: 'Retrieves all configured access control roles and permission matrix mappings.',
                      curl: `curl -H "X-API-Key: ${apiKey || 'YOUR_API_KEY'}" "${window.location.origin}/api/roles"`
                    },
                    {
                      categoryKey: 'system',
                      categoryName: 'System, Notifications & Administration',
                      method: 'GET',
                      path: '/api/settings/public',
                      title: 'Get Public Branding Settings',
                      desc: 'Retrieves public branding name, logo, favicon, and theme color configurations.',
                      curl: `curl "${window.location.origin}/api/settings/public"`
                    },
                    {
                      categoryKey: 'system',
                      categoryName: 'System, Notifications & Administration',
                      method: 'GET',
                      path: '/api/version',
                      title: 'Get Application Version & Build',
                      desc: 'Returns current build version, git commit hash, repository URL, and runtime information.',
                      curl: `curl "${window.location.origin}/api/version"`
                    }
                  ]
                  .filter(item => {
                    const matchCategory = apiDocsFilter === 'all' || item.categoryKey === apiDocsFilter;
                    const matchSearch = !apiDocsSearch.trim() || 
                      item.path.toLowerCase().includes(apiDocsSearch.toLowerCase()) || 
                      item.title.toLowerCase().includes(apiDocsSearch.toLowerCase()) || 
                      item.desc.toLowerCase().includes(apiDocsSearch.toLowerCase()) ||
                      item.method.toLowerCase().includes(apiDocsSearch.toLowerCase());
                    return matchCategory && matchSearch;
                  })
                  .map((ep, idx) => {
                    const isExpanded = expandedEndpoints[idx];
                    const methodColor = 
                      ep.method === 'GET' ? '#10b981' : 
                      ep.method === 'POST' ? '#3b82f6' : 
                      ep.method === 'PUT' ? '#f59e0b' : 
                      '#ef4444';

                    return (
                      <div 
                        key={idx} 
                        style={{
                          border: '1px solid var(--border)',
                          borderRadius: 'var(--radius)',
                          overflow: 'hidden',
                          background: 'var(--card)'
                        }}
                      >
                        {/* Endpoint Row Header */}
                        <div 
                          onClick={() => toggleEndpointExpand(idx)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.75rem',
                            padding: '0.65rem 0.85rem',
                            background: 'var(--muted)',
                            borderBottom: isExpanded ? '1px solid var(--border)' : 'none',
                            cursor: 'pointer',
                            flexWrap: 'wrap'
                          }}
                        >
                          <span style={{
                            background: methodColor,
                            color: '#fff',
                            fontSize: '0.625rem',
                            fontWeight: 'bold',
                            padding: '0.15rem 0.45rem',
                            borderRadius: '4px',
                            minWidth: '46px',
                            textAlign: 'center'
                          }}>
                            {ep.method}
                          </span>
                          <code style={{ fontWeight: 'bold', fontSize: '0.825rem', color: 'var(--foreground)' }}>
                            {ep.path}
                          </code>
                          <span style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)', marginLeft: 'auto' }}>
                            {ep.title}
                          </span>
                          <div style={{ color: 'var(--muted-foreground)' }}>
                            {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                          </div>
                        </div>

                        {/* Endpoint Body */}
                        {isExpanded && (
                          <div style={{ padding: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            <p style={{ fontSize: '0.8125rem', margin: 0, color: 'var(--foreground)', lineHeight: '1.4' }}>
                              {ep.desc}
                            </p>

                            {/* Payload snippet if available */}
                            {ep.payload && (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                <span style={{ fontSize: '0.6875rem', fontWeight: 'bold', color: 'var(--muted-foreground)' }}>
                                  JSON Request Body Schema:
                                </span>
                                <pre style={{
                                  margin: 0,
                                  padding: '0.5rem 0.75rem',
                                  background: '#1e1e2e',
                                  color: '#a6e3a1',
                                  borderRadius: 'var(--radius)',
                                  fontSize: '0.725rem',
                                  fontFamily: 'var(--font-mono)',
                                  overflowX: 'auto',
                                  maxHeight: '160px'
                                }}>
                                  {ep.payload}
                                </pre>
                              </div>
                            )}

                            {/* cURL Request */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                              <span style={{ fontSize: '0.6875rem', fontWeight: 'bold', color: 'var(--muted-foreground)' }}>
                                Example cURL Request:
                              </span>
                              <div style={{ display: 'flex', position: 'relative' }}>
                                <pre style={{
                                  margin: 0,
                                  padding: '0.5rem 0.75rem',
                                  paddingRight: '4rem',
                                  background: '#1e1e2e',
                                  color: '#cdd6f4',
                                  borderRadius: 'var(--radius)',
                                  width: '100%',
                                  overflowX: 'auto',
                                  fontSize: '0.725rem',
                                  fontFamily: 'var(--font-mono)'
                                }}>
                                  {ep.curl}
                                </pre>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleCopyText(ep.curl, 'curl command');
                                  }}
                                  style={{
                                    position: 'absolute',
                                    right: '0.35rem',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    background: 'var(--background)',
                                    border: '1px solid var(--border)',
                                    borderRadius: 'var(--radius)',
                                    color: 'var(--foreground)',
                                    cursor: 'pointer',
                                    padding: '0.15rem 0.4rem',
                                    fontSize: '0.6875rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.25rem'
                                  }}
                                >
                                  <Copy size={11} /> Copy
                                </button>
                              </div>
                            </div>

                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

              </div>
            )}
          </div>

        </div>
      )}

    </div>
  );
}
