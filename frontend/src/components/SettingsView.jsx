import React, { useState, useEffect } from 'react';
import { Settings, Save, RotateCcw, Palette, Laptop, Sun, Moon, Users, Shield, Plus, Trash2, Edit2, Calendar, Lock, User, Clock, Key, Copy, Eye, EyeOff, Code, Cpu, Bell, Mail, MessageSquare, Webhook, Info } from 'lucide-react';

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
  }, []);

  // Local user password reset states
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resettingPassword, setResettingPassword] = useState(false);

  // App Settings states
  const [appName, setAppName] = useState('');
  const [primaryColor, setPrimaryColor] = useState(currentUser?.primary_color || '#d35400');
  const [theme, setTheme] = useState(currentUser?.theme || 'system');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

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

  useEffect(() => {
    if (activeSubTab === 'integrations' && currentUser?.role_name === 'Administrator') {
      fetchApiKey();
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
        setBrandingIcon(data.branding_icon !== undefined ? data.branding_icon : '🍳');
        setBrandingLogo(data.branding_logo || '');
        setBrandingLogoLight(data.branding_logo_light || '');
        setBrandingLogoDark(data.branding_logo_dark || '');
        setBrandingFavicon(data.branding_favicon || '');
      }

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
      // Normalize and validate primaryColor hex code
      let validatedColor = primaryColor.trim();
      if (!validatedColor) {
        validatedColor = '#d35400';
      } else {
        if (!validatedColor.startsWith('#')) {
          validatedColor = '#' + validatedColor;
        }
        // Expand 3-digit hex to 6-digit hex if needed
        if (/^#[0-9A-Fa-f]{3}$/.test(validatedColor)) {
          validatedColor = '#' + validatedColor[1] + validatedColor[1] + validatedColor[2] + validatedColor[2] + validatedColor[3] + validatedColor[3];
        }
        const hexRegex = /^#[0-9A-Fa-f]{6}$/;
        if (!hexRegex.test(validatedColor)) {
          throw new Error('Please enter a valid hex color code (e.g. #7B0000 or #333).');
        }
      }

      // Update local state to show the validated, normalized color code
      setPrimaryColor(validatedColor);

      // 1. Update personal profile primary color, theme, display name, and timezone
      const profileRes = await fetch('/api/users/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ primary_color: validatedColor, theme: theme, display_name: displayName, timezone: timezone })
      });
      if (!profileRes.ok) throw new Error('Failed to save personal settings');

      // 2. Update global settings if user has permission
      const canSaveGlobal = canManageGeneral || currentUser?.permissions?.roles === 'full';
      if (canSaveGlobal) {
        if (!appName.trim()) {
          throw new Error('App Name cannot be empty.');
        }
        const globalPayload = {
          app_name: appName.trim(),
          theme: theme
        };
        const globalRes = await fetch('/api/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(globalPayload)
        });
        if (!globalRes.ok) throw new Error('Failed to save global branding settings');
      }

      showToast('Settings saved successfully!');
      onSettingsChange({
        appName: canSaveGlobal ? appName.trim() : undefined,
        primaryColor: validatedColor,
        theme: theme,
        displayName: displayName,
        timezone: timezone
      });
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSaving(false);
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
        oidc_default_role: oidcDefaultRole
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
        role_id: roleSelectInput ? Number(roleSelectInput) : null
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
      const res = await fetch('/api/users/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ calendar_guid: calendarGuid.trim() })
      });
      if (!res.ok) throw new Error('Failed to save calendar GUID');
      
      showToast('Calendar settings saved successfully!');
      onSettingsChange({ calendarGuid: calendarGuid.trim() });
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



      {/* GENERAL APP SETTINGS TAB */}
      {activeSubTab === 'general' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="card">
            <form onSubmit={handleSaveSettings} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            
            <div className="form-group">
              <label htmlFor="settings-display-name" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <User size={16} /> Display Name
              </label>
              <input 
                id="settings-display-name"
                type="text" 
                className="input-control" 
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="e.g. Joshua"
              />
              <span style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>
                This is how your name will appear throughout the application (e.g. in greetings).
              </span>
            </div>

            <div className="form-group">
              <label htmlFor="settings-timezone" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Clock size={16} /> Preferred Time Zone
              </label>
              <select 
                id="settings-timezone"
                className="input-control" 
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
              >
                <option value="US/New_York">Eastern Time (US/New_York)</option>
                <option value="US/Central">Central Time (US/Central)</option>
                <option value="US/Mountain">Mountain Time (US/Mountain)</option>
                <option value="US/Pacific">Pacific Time (US/Pacific)</option>
                <option value="US/Alaska">Alaska/Anchorage Time (US/Alaska)</option>
                <option value="US/Hawaii">Hawaii Time (US/Hawaii)</option>
                <option value="UTC">Coordinated Universal Time (UTC)</option>
              </select>
              <span style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>
                This time zone is used to schedule events on your synchronized Microsoft 365 Calendar.
              </span>
            </div>

            <div className="form-group">
              <label htmlFor="settings-app-name" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Settings size={16} /> Custom App Name
              </label>
              <input 
                id="settings-app-name"
                type="text" 
                className="input-control" 
                value={appName}
                onChange={(e) => setAppName(e.target.value)}
                placeholder="e.g. WagnerTech Portal"
                required 
                disabled={!canManageGeneral && currentUser?.permissions?.roles !== 'full'} // settings save endpoint mapped to roles write access
              />
              <span style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>
                This modifies the application title displayed in the sidebar.
              </span>
            </div>

            <div className="form-group">
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Palette size={16} /> Theme Accent Color
              </label>
              <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <div 
                  style={{ 
                    position: 'relative',
                    width: '44px', 
                    height: '44px', 
                    borderRadius: '50%', 
                    overflow: 'hidden',
                    border: '1px solid var(--border)',
                    boxShadow: 'var(--shadow-sm)',
                    flexShrink: 0
                  }}
                >
                  <input 
                    type="color" 
                    value={getValidColorPickerValue(primaryColor)}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    style={{ 
                      position: 'absolute', 
                      top: '-10px', 
                      left: '-10px', 
                      width: '64px', 
                      height: '64px', 
                      border: 'none',
                      cursor: 'pointer'
                    }}
                    title="Choose accent color"
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.875rem', fontWeight: '500' }}>Accent Color Hex:</span>
                    <input 
                      type="text" 
                      value={primaryColor} 
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      placeholder="#d35400"
                      maxLength={7}
                      style={{ 
                        width: '90px', 
                        padding: '0.25rem 0.5rem', 
                        borderRadius: 'var(--radius)', 
                        border: '1px solid var(--border)', 
                        background: 'var(--background)', 
                        color: 'var(--foreground)', 
                        fontFamily: 'monospace',
                        fontWeight: '600',
                        fontSize: '0.8125rem' 
                      }}
                      title="Accent Color hex code"
                    />
                  </div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>
                    Use the color selector or enter a hex code to customize highlights, badges, and accents.
                  </span>
                </div>
              </div>
            </div>

            <div className="form-group">
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>
                Theme Mode
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem', marginTop: '0.125rem' }}>
                <div 
                  onClick={() => setTheme('system')}
                  style={{ 
                    padding: '0.75rem', 
                    border: `1px solid ${theme === 'system' ? 'var(--primary)' : 'var(--border)'}`,
                    borderRadius: 'var(--radius)',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '0.375rem',
                    background: theme === 'system' ? 'var(--accent)' : 'transparent',
                    transition: 'var(--transition-fast)'
                  }}
                >
                  <Laptop size={16} style={{ color: 'var(--foreground)' }} />
                  <span style={{ fontSize: '0.8125rem', fontWeight: '500' }}>System</span>
                </div>

                <div 
                  onClick={() => setTheme('light')}
                  style={{ 
                    padding: '0.75rem', 
                    border: `1px solid ${theme === 'light' ? 'var(--primary)' : 'var(--border)'}`,
                    borderRadius: 'var(--radius)',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '0.375rem',
                    background: theme === 'light' ? 'var(--accent)' : 'transparent',
                    transition: 'var(--transition-fast)'
                  }}
                >
                  <Sun size={16} style={{ color: 'var(--foreground)' }} />
                  <span style={{ fontSize: '0.8125rem', fontWeight: '500' }}>Light</span>
                </div>

                <div 
                  onClick={() => setTheme('dark')}
                  style={{ 
                    padding: '0.75rem', 
                    border: `1px solid ${theme === 'dark' ? 'var(--primary)' : 'var(--border)'}`,
                    borderRadius: 'var(--radius)',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '0.375rem',
                    background: theme === 'dark' ? 'var(--accent)' : 'transparent',
                    transition: 'var(--transition-fast)'
                  }}
                >
                  <Moon size={16} style={{ color: 'var(--foreground)' }} />
                  <span style={{ fontSize: '0.8125rem', fontWeight: '500' }}>Dark</span>
                </div>
              </div>
            </div>

            <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '0.25rem 0' }} />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button 
                type="button" 
                className="btn btn-outline" 
                onClick={handleResetSettings} 
                style={{ gap: '0.25rem' }}
                disabled={saving}
              >
                <RotateCcw size={14} /> Reset defaults
              </button>
              <button 
                type="submit" 
                className="btn btn-primary" 
                style={{ gap: '0.5rem' }}
                disabled={saving}
              >
                <Save size={16} /> {saving ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </form>
        </div>

        {/* Local User Password Reset Form */}
        {currentUser?.auth_provider === 'local' && (
          <div className="card">
            <h3 style={{ marginBottom: '0.5rem', fontSize: '1.125rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: '600' }}>
              <Lock size={18} /> Reset Your Password
            </h3>
            <p style={{ fontSize: '0.8125rem', color: 'var(--muted-foreground)', marginBottom: '1.25rem' }}>
              Change the password you use to log in to the application.
            </p>
            
            <form onSubmit={handleResetPassword} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group">
                <label htmlFor="current-password">Current Password *</label>
                <input 
                  id="current-password"
                  type="password" 
                  className="input-control" 
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="new-password">New Password *</label>
                <input 
                  id="new-password"
                  type="password" 
                  className="input-control" 
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="confirm-password">Confirm New Password *</label>
                <input 
                  id="confirm-password"
                  type="password" 
                  className="input-control" 
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>
              
              <button 
                type="submit" 
                className="btn btn-primary" 
                style={{ alignSelf: 'flex-start', marginTop: '0.25rem' }} 
                disabled={resettingPassword}
              >
                {resettingPassword ? 'Updating...' : 'Update Password'}
              </button>
            </form>
          </div>
        )}

        {/* SSO User Notice */}
        {currentUser?.auth_provider === 'sso' && (
          <div className="card" style={{ padding: '2rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
            <Shield size={28} style={{ color: 'var(--primary)' }} />
            <h3 style={{ fontSize: '1.125rem', margin: 0, fontWeight: '600' }}>M365 Single Sign-On Active</h3>
            <p style={{ fontSize: '0.8125rem', color: 'var(--muted-foreground)', maxWidth: '460px', margin: 0, lineHeight: '1.5' }}>
              Your account is managed via Microsoft 365 Single Sign-On. 
              Passwords and directory settings must be managed by your organization's IT department.
            </p>
          </div>
        )}
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
                    
                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
                      <button type="submit" className="btn btn-primary">
                        {editUser ? 'Save Changes' : 'Create User'}
                      </button>
                      <button 
                        type="button" 
                        className="btn btn-outline" 
                        onClick={() => { setUserFormOpen(false); setEditUser(null); setUsernameInput(''); setPasswordInput(''); setRoleSelectInput(''); }}
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

      {/* CALENDAR SETTINGS TAB */}
      {activeSubTab === 'calendar' && currentUser?.auth_provider === 'sso' && canReadCalendar && (
        <div className="card">
          <form onSubmit={handleSaveCalendarSettings} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', maxWidth: '500px' }}>
            <h3 style={{ fontSize: '1.125rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: '600' }}>
              <Calendar size={18} /> Microsoft Calendar Sync Settings
            </h3>
            <p style={{ fontSize: '0.8125rem', color: 'var(--muted-foreground)' }}>
              Configure which Microsoft 365 calendar you want your events to sync to.
            </p>

            <div className="form-group">
              <label htmlFor="calendar-guid-input">Calendar GUID / ID</label>
              <input 
                id="calendar-guid-input"
                type="text" 
                className="input-control" 
                value={calendarGuid}
                onChange={(e) => setCalendarGuid(e.target.value)}
                placeholder="e.g. AAMkAGI2TAAA="
              />
              <span style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>
                Leave this field blank to use your default <strong>M365 Calendar</strong>.
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.25rem' }}>
              <button 
                type="submit" 
                className="btn btn-primary" 
                style={{ gap: '0.5rem' }}
                disabled={saving}
              >
                <Save size={16} /> {saving ? 'Saving...' : 'Save Calendar Settings'}
              </button>
            </div>

            {/* Available Calendars Section */}
            <div style={{ marginTop: '1.5rem', paddingTop: '1.25rem', borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
                <h4 style={{ fontSize: '0.95rem', margin: 0, fontWeight: '600' }}>Available M365 Calendars</h4>
                <button 
                  type="button" 
                  className="btn btn-outline" 
                  style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem', height: '1.75rem' }}
                  onClick={async () => {
                    const tokenVal = localStorage.getItem('token') || '';
                    try {
                      const res = await fetch('/api/users/calendars', {
                        headers: {
                          'Authorization': `Bearer ${tokenVal}`
                        }
                      });
                      if (res.ok) {
                        const data = await res.json();
                        setAvailableCalendars(data.calendars || []);
                        showToast('Successfully loaded available calendars!', 'success');
                      } else if (res.status === 401) {
                        // Redirect as fallback
                        window.location.href = `/api/auth/ms-calendar/list-login?token=${encodeURIComponent(tokenVal)}`;
                      } else {
                        const errData = await res.json();
                        throw new Error(errData.error || 'Failed to load calendars');
                      }
                    } catch (err) {
                      showToast('Failed to load calendars: ' + err.message, 'error');
                    }
                  }}
                >
                  {availableCalendars.length > 0 ? 'Refresh List' : 'Load Calendars from Microsoft'}
                </button>
              </div>

              {availableCalendars.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.25rem' }}>
                  {availableCalendars.map(cal => (
                    <div 
                      key={cal.id} 
                      style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center', 
                        padding: '0.5rem 0.75rem', 
                        border: '1px solid var(--border)', 
                        borderRadius: 'var(--radius)',
                        background: 'var(--muted)',
                        gap: '0.75rem'
                      }}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.125rem', overflow: 'hidden' }}>
                        <span style={{ fontWeight: '600', fontSize: '0.8125rem', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                          {cal.name}
                          {cal.isDefault && (
                            <span className="badge badge-primary" style={{ fontSize: '0.5625rem', padding: '0.05rem 0.3rem' }}>Default</span>
                          )}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '300px' }} title={cal.id}>
                          ID: {cal.id}
                        </span>
                      </div>
                      <button 
                        type="button" 
                        className="btn btn-outline" 
                        style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem', height: '1.75rem', flexShrink: 0 }}
                        onClick={() => {
                          setCalendarGuid(cal.id);
                          showToast(`Selected "${cal.name}" calendar. Don't forget to click Save!`, 'success');
                        }}
                      >
                        Select
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ fontSize: '0.8125rem', color: 'var(--muted-foreground)', margin: '0.125rem 0' }}>
                  Connect your Microsoft 365 account to list and select from your custom calendars.
                </p>
              )}
            </div>
          </form>
        </div>
      )}

      {/* INTEGRATIONS & API KEY TAB */}
      {activeSubTab === 'integrations' && currentUser?.role_name === 'Administrator' && (
        <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
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

          {/* Documentation Card */}
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
              <Code size={20} />
              <h3 style={{ fontSize: '1.125rem', margin: 0, fontWeight: '600' }}>API Documentation</h3>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <p style={{ fontSize: '0.8125rem', color: 'var(--muted-foreground)', margin: 0, lineHeight: '1.5' }}>
                Integrations authenticate via standard HTTP requests. You can pass the API key using either the 
                <code>X-API-Key</code> request header, or the <code>api_key</code> query parameter.
              </p>

              {/* API Endpoints */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                
                {/* Endpoint 1: List Users */}
                <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem 0.75rem', background: 'var(--muted)', borderBottom: '1px solid var(--border)', flexWrap: 'wrap' }}>
                    <span style={{ background: '#10b981', color: '#fff', fontSize: '0.625rem', fontWeight: 'bold', padding: '0.125rem 0.35rem', borderRadius: 'var(--radius)' }}>GET</span>
                    <code style={{ fontWeight: 'bold', fontSize: '0.8125rem' }}>/api/users</code>
                    <span style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)', marginLeft: 'auto' }}>List all users</span>
                  </div>
                  <div style={{ padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <p style={{ fontSize: '0.8125rem', margin: 0, color: 'var(--foreground)' }}>
                      Retrieves a list of all user accounts, display names, authentication providers, and assigned role IDs.
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                      <span style={{ fontSize: '0.6875rem', fontWeight: 'bold', color: 'var(--muted-foreground)' }}>Example Request:</span>
                      <div style={{ display: 'flex', position: 'relative' }}>
                        <pre style={{ margin: 0, padding: '0.5rem 0.75rem', background: '#1e1e2e', color: '#cdd6f4', borderRadius: 'var(--radius)', width: '100%', overflowX: 'auto', fontSize: '0.75rem', fontFamily: 'var(--font-mono)' }}>
                          {`curl -H "X-API-Key: ${apiKey || 'YOUR_API_KEY'}" ${window.location.origin}/api/users`}
                        </pre>
                        <button
                          type="button"
                          onClick={() => handleCopyText(`curl -H "X-API-Key: ${apiKey || 'YOUR_API_KEY'}" ${window.location.origin}/api/users`, 'curl command')}
                          style={{ position: 'absolute', right: '0.35rem', top: '50%', transform: 'translateY(-50%)', background: 'var(--background)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--foreground)', cursor: 'pointer', padding: '0.125rem 0.35rem', fontSize: '0.6875rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                        >
                          <Copy size={10} /> Copy
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Endpoint 2: Create User */}
                <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem 0.75rem', background: 'var(--muted)', borderBottom: '1px solid var(--border)', flexWrap: 'wrap' }}>
                    <span style={{ background: '#3b82f6', color: '#fff', fontSize: '0.625rem', fontWeight: 'bold', padding: '0.125rem 0.35rem', borderRadius: 'var(--radius)' }}>POST</span>
                    <code style={{ fontWeight: 'bold', fontSize: '0.8125rem' }}>/api/users</code>
                    <span style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)', marginLeft: 'auto' }}>Create user account</span>
                  </div>
                  <div style={{ padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <p style={{ fontSize: '0.8125rem', margin: 0, color: 'var(--foreground)' }}>
                      Creates a new local user credentials account. The `role_id` should correspond to an active role.
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                      <span style={{ fontSize: '0.6875rem', fontWeight: 'bold', color: 'var(--muted-foreground)' }}>Example Request:</span>
                      <div style={{ display: 'flex', position: 'relative' }}>
                        <pre style={{ margin: 0, padding: '0.5rem 0.75rem', background: '#1e1e2e', color: '#cdd6f4', borderRadius: 'var(--radius)', width: '100%', overflowX: 'auto', fontSize: '0.75rem', fontFamily: 'var(--font-mono)' }}>
                          {`curl -X POST -H "X-API-Key: ${apiKey || 'YOUR_API_KEY'}" -H "Content-Type: application/json" -d '{"username": "johndoe", "password": "securepassword", "role_id": 2}' ${window.location.origin}/api/users`}
                        </pre>
                        <button
                          type="button"
                          onClick={() => handleCopyText(`curl -X POST -H "X-API-Key: ${apiKey || 'YOUR_API_KEY'}" -H "Content-Type: application/json" -d '{"username": "johndoe", "password": "securepassword", "role_id": 2}' ${window.location.origin}/api/users`, 'curl command')}
                          style={{ position: 'absolute', right: '0.35rem', top: '50%', transform: 'translateY(-50%)', background: 'var(--background)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--foreground)', cursor: 'pointer', padding: '0.125rem 0.35rem', fontSize: '0.6875rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                        >
                          <Copy size={10} /> Copy
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Endpoint 3: List Roles */}
                <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem 0.75rem', background: 'var(--muted)', borderBottom: '1px solid var(--border)', flexWrap: 'wrap' }}>
                    <span style={{ background: '#10b981', color: '#fff', fontSize: '0.625rem', fontWeight: 'bold', padding: '0.125rem 0.35rem', borderRadius: 'var(--radius)' }}>GET</span>
                    <code style={{ fontWeight: 'bold', fontSize: '0.8125rem' }}>/api/roles</code>
                    <span style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)', marginLeft: 'auto' }}>List roles</span>
                  </div>
                  <div style={{ padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <p style={{ fontSize: '0.8125rem', margin: 0, color: 'var(--foreground)' }}>
                      Retrieves all configured access control roles and their permission matrix mappings.
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                      <span style={{ fontSize: '0.6875rem', fontWeight: 'bold', color: 'var(--muted-foreground)' }}>Example Request:</span>
                      <div style={{ display: 'flex', position: 'relative' }}>
                        <pre style={{ margin: 0, padding: '0.5rem 0.75rem', background: '#1e1e2e', color: '#cdd6f4', borderRadius: 'var(--radius)', width: '100%', overflowX: 'auto', fontSize: '0.75rem', fontFamily: 'var(--font-mono)' }}>
                          {`curl -H "X-API-Key: ${apiKey || 'YOUR_API_KEY'}" ${window.location.origin}/api/roles`}
                        </pre>
                        <button
                          type="button"
                          onClick={() => handleCopyText(`curl -H "X-API-Key: ${apiKey || 'YOUR_API_KEY'}" ${window.location.origin}/api/roles`, 'curl command')}
                          style={{ position: 'absolute', right: '0.35rem', top: '50%', transform: 'translateY(-50%)', background: 'var(--background)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--foreground)', cursor: 'pointer', padding: '0.125rem 0.35rem', fontSize: '0.6875rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                        >
                          <Copy size={10} /> Copy
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Endpoint 4: Toggle Notification Rule */}
                <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem 0.75rem', background: 'var(--muted)', borderBottom: '1px solid var(--border)', flexWrap: 'wrap' }}>
                    <span style={{ background: '#3b82f6', color: '#fff', fontSize: '0.625rem', fontWeight: 'bold', padding: '0.125rem 0.35rem', borderRadius: 'var(--radius)' }}>POST</span>
                    <code style={{ fontWeight: 'bold', fontSize: '0.8125rem' }}>/api/notifications/toggle</code>
                    <span style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)', marginLeft: 'auto' }}>Toggle notification event</span>
                  </div>
                  <div style={{ padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <p style={{ fontSize: '0.8125rem', margin: 0, color: 'var(--foreground)' }}>
                      Enables or disables a specific notification event rule (e.g. Subscription Due Today, Bill Due Today).
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                      <span style={{ fontSize: '0.6875rem', fontWeight: 'bold', color: 'var(--muted-foreground)' }}>Example Request:</span>
                      <div style={{ display: 'flex', position: 'relative' }}>
                        <pre style={{ margin: 0, padding: '0.5rem 0.75rem', background: '#1e1e2e', color: '#cdd6f4', borderRadius: 'var(--radius)', width: '100%', overflowX: 'auto', fontSize: '0.75rem', fontFamily: 'var(--font-mono)' }}>
                          {`curl -X POST -H "X-API-Key: ${apiKey || 'YOUR_API_KEY'}" -H "Content-Type: application/json" -d '{"event": "Subscription Due Today", "enabled": true}' ${window.location.origin}/api/notifications/toggle`}
                        </pre>
                        <button
                          type="button"
                          onClick={() => handleCopyText(`curl -X POST -H "X-API-Key: ${apiKey || 'YOUR_API_KEY'}" -H "Content-Type: application/json" -d '{"event": "Subscription Due Today", "enabled": true}' ${window.location.origin}/api/notifications/toggle`, 'curl command')}
                          style={{ position: 'absolute', right: '0.35rem', top: '50%', transform: 'translateY(-50%)', background: 'var(--background)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--foreground)', cursor: 'pointer', padding: '0.125rem 0.35rem', fontSize: '0.6875rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                        >
                          <Copy size={10} /> Copy
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </div>
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
                  
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem' }}>
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
                  </div>

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

    </div>
  );
}
