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
  const [showResetPasswords, setShowResetPasswords] = useState(false);

  // App Settings states
  const [appName, setAppName] = useState('');
  const [primaryColor, setPrimaryColor] = useState(currentUser?.primary_color || '#d35400');
  const [theme, setTheme] = useState(currentUser?.theme || 'system');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // OIDC Settings states
  const [oidcEnabled, setOidcEnabled] = useState(false);
  const [oidcClientId, setOidcClientId] = useState('');
  const [oidcClientSecret, setOidcClientSecret] = useState('');
  const [oidcTenantId, setOidcTenantId] = useState('');
  const [oidcRedirectUri, setOidcRedirectUri] = useState('');
  const [oidcAutoProvision, setOidcAutoProvision] = useState(true);
  const [oidcDefaultRole, setOidcDefaultRole] = useState('Viewer');
  const [showSSOSecret, setShowSSOSecret] = useState(false);

  // Branding Settings states
  const [brandingIcon, setBrandingIcon] = useState('🍳');
  const [brandingLogo, setBrandingLogo] = useState('');
  const [brandingFavicon, setBrandingFavicon] = useState('');

  // User Management states
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [userFormOpen, setUserFormOpen] = useState(false);
  const [editUser, setEditUser] = useState(null); // { id, username, role_id } or null
  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [roleSelectInput, setRoleSelectInput] = useState('');
  const [showUserPassword, setShowUserPassword] = useState(false);

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
  const [showSMTPPassword, setShowSMTPPassword] = useState(false);
  const [showWebhookSecret, setShowWebhookSecret] = useState(false);
  
  // Toggles
  const [notifyRecipeAdded, setNotifyRecipeAdded] = useState(false);
  const [notifyRecipeDeleted, setNotifyRecipeDeleted] = useState(false);
  const [notifyMealPlanUpdated, setNotifyMealPlanUpdated] = useState(false);
  const [notifyLeftoversAdded, setNotifyLeftoversAdded] = useState(false);
  const [notifyLeftoversExpiring, setNotifyLeftoversExpiring] = useState(false);
  const [notifyInventoryExpiring, setNotifyInventoryExpiring] = useState(false);
  
  // Days settings
  const [notifyLeftoversExpiryDays, setNotifyLeftoversExpiryDays] = useState(2);
  const [notifyInventoryExpiryDays, setNotifyInventoryExpiryDays] = useState(3);
  
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
        setNotifyRecipeAdded(data.notify_recipe_added === 'true');
        setNotifyRecipeDeleted(data.notify_recipe_deleted === 'true');
        setNotifyMealPlanUpdated(data.notify_meal_plan_updated === 'true');
        setNotifyLeftoversAdded(data.notify_leftovers_added === 'true');
        setNotifyLeftoversExpiring(data.notify_leftovers_expiring === 'true');
        setNotifyInventoryExpiring(data.notify_inventory_expiring === 'true');
        setNotifyLeftoversExpiryDays(parseInt(data.notify_leftovers_expiry_days, 10) || 2);
        setNotifyInventoryExpiryDays(parseInt(data.notify_inventory_expiry_days, 10) || 3);
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
        notify_recipe_added: String(notifyRecipeAdded),
        notify_recipe_deleted: String(notifyRecipeDeleted),
        notify_meal_plan_updated: String(notifyMealPlanUpdated),
        notify_leftovers_added: String(notifyLeftoversAdded),
        notify_leftovers_expiring: String(notifyLeftoversExpiring),
        notify_inventory_expiring: String(notifyInventoryExpiring),
        notify_leftovers_expiry_days: String(notifyLeftoversExpiryDays),
        notify_inventory_expiry_days: String(notifyInventoryExpiryDays)
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
        setAppName(data.app_name || 'Family Cookbook');
        setOidcEnabled(data.oidc_enabled === 'true');
        setOidcClientId(data.oidc_client_id || '');
        setOidcClientSecret(data.oidc_client_secret || '');
        setOidcTenantId(data.oidc_tenant_id || '');
        setOidcRedirectUri(data.oidc_redirect_uri || '');
        setOidcAutoProvision(data.oidc_auto_provision !== 'false');
        setOidcDefaultRole(data.oidc_default_role || 'Viewer');
        setBrandingIcon(data.branding_icon !== undefined ? data.branding_icon : '🍳');
        setBrandingLogo(data.branding_logo || '');
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
      // 1. Update personal profile primary color, theme, display name, and timezone
      const profileRes = await fetch('/api/users/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ primary_color: primaryColor, theme: theme, display_name: displayName, timezone: timezone })
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
        primaryColor: primaryColor,
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

  const handleUploadLogo = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const formData = new FormData();
    formData.append('logo', file);
    
    setSaving(true);
    try {
      const res = await fetch('/api/settings/branding/logo', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to upload logo');
      setBrandingLogo(data.branding_logo);
      showToast('Logo uploaded successfully!', 'success');
      if (onSettingsChange) {
        onSettingsChange({ brandingLogo: data.branding_logo });
      }
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveLogo = async () => {
    if (!window.confirm('Are you sure you want to remove the logo?')) return;
    setSaving(true);
    try {
      const res = await fetch('/api/settings/branding/logo', {
        method: 'DELETE'
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to remove logo');
      setBrandingLogo('');
      showToast('Logo removed successfully!', 'success');
      if (onSettingsChange) {
        onSettingsChange({ brandingLogo: '' });
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
    setAppName('Family Cookbook');
    setPrimaryColor('#d35400');
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
      setShowUserPassword(false);
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
    setShowUserPassword(false);
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
    <div className="animate-fade-in" style={{ maxWidth: '850px', margin: '0 auto' }}>
      <div className="content-header" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '0.25rem' }}>
        <h2 style={{ margin: 0 }}>Settings Dashboard</h2>
        <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-muted)' }}>
          Configure app behavior, manage access roles, Single Sign-On configurations and notification dispatching.
        </p>
      </div>



      {/* GENERAL APP SETTINGS TAB */}
      {activeSubTab === 'general' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <div className="card" style={{ padding: '2rem' }}>
            <form onSubmit={handleSaveSettings} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            
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
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
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
                style={{ background: 'var(--bg-app)', color: 'var(--text-main)', cursor: 'pointer' }}
              >
                <option value="US/New_York">Eastern Time (US/New_York)</option>
                <option value="US/Central">Central Time (US/Central)</option>
                <option value="US/Mountain">Mountain Time (US/Mountain)</option>
                <option value="US/Pacific">Pacific Time (US/Pacific)</option>
                <option value="US/Alaska">Alaska/Anchorage Time (US/Alaska)</option>
                <option value="US/Hawaii">Hawaii Time (US/Hawaii)</option>
                <option value="UTC">Coordinated Universal Time (UTC)</option>
              </select>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                This time zone is used to schedule meals on your synchronized Microsoft 365 Calendar.
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
                placeholder="e.g. Grandma's Recipe Vault"
                required 
                disabled={!canManageGeneral && currentUser?.permissions?.roles !== 'full'} // settings save endpoint mapped to roles write access
              />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                This modifies the application title displayed in the sidebar.
              </span>
            </div>

            <div className="form-group">
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Palette size={16} /> Theme Primary Color
              </label>
              <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
                <div 
                  style={{ 
                    position: 'relative',
                    width: '60px', 
                    height: '60px', 
                    borderRadius: '50%', 
                    overflow: 'hidden',
                    border: '3px solid var(--border-color)',
                    boxShadow: 'var(--shadow-sm)'
                  }}
                >
                  <input 
                    type="color" 
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    style={{ 
                      position: 'absolute', 
                      top: '-10px', 
                      left: '-10px', 
                      width: '80px', 
                      height: '80px', 
                      border: 'none',
                      cursor: 'pointer'
                    }}
                    title="Choose accent color"
                  />
                </div>
                <div>
                  <strong style={{ fontSize: '1rem', display: 'block' }}>Accent Color: {primaryColor.toUpperCase()}</strong>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Use the color selector to customize the primary highlights, badges, and button accents.
                  </span>
                </div>
              </div>
            </div>

            <div className="form-group">
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                Theme Settings
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginTop: '0.25rem' }}>
                <div 
                  onClick={() => setTheme('system')}
                  style={{ 
                    padding: '1rem', 
                    border: `2px solid ${theme === 'system' ? 'var(--primary)' : 'var(--border-color)'}`,
                    borderRadius: 'var(--radius-sm)',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '0.5rem',
                    background: theme === 'system' ? 'var(--primary-light)' : 'var(--bg-app)',
                    transition: 'var(--transition-fast)'
                  }}
                >
                  <Laptop size={20} style={{ color: theme === 'system' ? 'var(--primary)' : 'var(--text-muted)' }} />
                  <span style={{ fontSize: '0.85rem', fontWeight: '600' }}>System Default</span>
                </div>

                <div 
                  onClick={() => setTheme('light')}
                  style={{ 
                    padding: '1rem', 
                    border: `2px solid ${theme === 'light' ? 'var(--primary)' : 'var(--border-color)'}`,
                    borderRadius: 'var(--radius-sm)',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '0.5rem',
                    background: theme === 'light' ? 'var(--primary-light)' : 'var(--bg-app)',
                    transition: 'var(--transition-fast)'
                  }}
                >
                  <Sun size={20} style={{ color: theme === 'light' ? 'var(--primary)' : 'var(--text-muted)' }} />
                  <span style={{ fontSize: '0.85rem', fontWeight: '600' }}>Light Theme</span>
                </div>

                <div 
                  onClick={() => setTheme('dark')}
                  style={{ 
                    padding: '1rem', 
                    border: `2px solid ${theme === 'dark' ? 'var(--primary)' : 'var(--border-color)'}`,
                    borderRadius: 'var(--radius-sm)',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '0.5rem',
                    background: theme === 'dark' ? 'var(--primary-light)' : 'var(--bg-app)',
                    transition: 'var(--transition-fast)'
                  }}
                >
                  <Moon size={20} style={{ color: theme === 'dark' ? 'var(--primary)' : 'var(--text-muted)' }} />
                  <span style={{ fontSize: '0.85rem', fontWeight: '600' }}>Dark Theme</span>
                </div>
              </div>
            </div>

            <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: '0.5rem 0' }} />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button 
                type="button" 
                className="btn btn-outline" 
                onClick={handleResetSettings} 
                style={{ gap: '0.25rem' }}
                disabled={saving}
              >
                <RotateCcw size={16} /> Reset defaults
              </button>
              <button 
                type="submit" 
                className="btn btn-primary" 
                style={{ gap: '0.5rem' }}
                disabled={saving}
              >
                <Save size={18} /> {saving ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </form>
        </div>

        {/* Local User Password Reset Form */}
        {currentUser?.auth_provider === 'local' && (
          <div className="card" style={{ padding: '2rem' }}>
            <h3 style={{ marginBottom: '1rem', fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Lock size={20} /> Reset Your Password
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
              Change the password you use to log in to the application.
            </p>
            
            <form onSubmit={handleResetPassword} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div className="form-group">
                <label htmlFor="current-password">Current Password *</label>
                <input 
                  id="current-password"
                  type={showResetPasswords ? "text" : "password"} 
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
                  type={showResetPasswords ? "text" : "password"} 
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
                  type={showResetPasswords ? "text" : "password"} 
                  className="input-control" 
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
                  <input 
                    id="show-reset-passwords"
                    type="checkbox"
                    checked={showResetPasswords}
                    onChange={(e) => setShowResetPasswords(e.target.checked)}
                    style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                  />
                  <label htmlFor="show-reset-passwords" style={{ fontSize: '0.85rem', cursor: 'pointer', userSelect: 'none', margin: 0 }}>
                    Show Passwords
                  </label>
                </div>
              </div>
              
              <button 
                type="submit" 
                className="btn btn-primary" 
                style={{ alignSelf: 'flex-start', marginTop: '0.5rem' }} 
                disabled={resettingPassword}
              >
                {resettingPassword ? 'Updating...' : 'Update Password'}
              </button>
            </form>
          </div>
        )}

        {/* SSO User Notice */}
        {currentUser?.auth_provider === 'sso' && (
          <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
            <Shield size={36} style={{ color: 'var(--primary)', margin: '0 auto 1rem auto' }} />
            <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>M365 Single Sign-On Active</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Your account is managed via Microsoft 365 Single Sign-On. 
              Passwords and directory settings must be managed by your organization's IT department.
            </p>
          </div>
        )}
      </div>
    )}

      {/* USER MANAGEMENT TAB */}
      {activeSubTab === 'users' && canReadUsers && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* User management panel card */}
          {canManageUsers && (
            <>
              {userFormOpen ? (
                <div className="card" style={{ padding: '2rem' }}>
                  <h3 style={{ marginBottom: '1.5rem', fontSize: '1.25rem' }}>
                    {editUser ? `Edit User: ${editUser.username}` : 'Add New User'}
                  </h3>
                  <form onSubmit={handleSaveUser} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
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
                        type={showUserPassword ? "text" : "password"} 
                        className="input-control" 
                        value={passwordInput}
                        onChange={(e) => setPasswordInput(e.target.value)}
                        required={!editUser}
                      />
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
                        <input 
                          id="show-user-password"
                          type="checkbox"
                          checked={showUserPassword}
                          onChange={(e) => setShowUserPassword(e.target.checked)}
                          style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                        />
                        <label htmlFor="show-user-password" style={{ fontSize: '0.85rem', cursor: 'pointer', userSelect: 'none', margin: 0 }}>
                          Show Password
                        </label>
                      </div>
                    </div>
                    <div className="form-group">
                      <label htmlFor="user-role">Role</label>
                      <select 
                        id="user-role"
                        className="input-control"
                        value={roleSelectInput}
                        onChange={(e) => setRoleSelectInput(e.target.value)}
                        style={{ background: 'var(--bg-app)', color: 'var(--text-main)' }}
                        disabled={editUser?.username === 'admin'} // Admin user role locked to Administrator
                      >
                        <option value="">No Role (None)</option>
                        {roles.map(role => (
                          <option key={role.id} value={role.id}>{role.name}</option>
                        ))}
                      </select>
                    </div>
                    
                    <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                      <button type="submit" className="btn btn-primary">
                        {editUser ? 'Save Changes' : 'Create User'}
                      </button>
                      <button 
                        type="button" 
                        className="btn btn-outline" 
                        onClick={() => { setUserFormOpen(false); setEditUser(null); setShowUserPassword(false); }}
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
                      setShowUserPassword(false);
                      setRoleSelectInput('');
                      setUserFormOpen(true);
                    }}
                  >
                    <Plus size={20} /> Add User
                  </button>
                </div>
              )}

              <div className="card" style={{ padding: '0.5rem 0', overflowX: 'auto' }}>
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
                        <td><strong>{u.username}</strong> {u.id === currentUser?.id && <span className="badge badge-primary">You</span>}</td>
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
                          <div style={{ display: 'inline-flex', gap: '0.5rem' }}>
                            <button 
                              className="btn btn-outline" 
                              style={{ padding: '0.35rem 0.5rem' }}
                              onClick={() => handleEditUserClick(u)}
                              title="Edit User"
                            >
                              <Edit2 size={14} />
                            </button>
                            <button 
                              className="btn btn-secondary" 
                              style={{ padding: '0.35rem 0.5rem', color: 'var(--danger)' }}
                              onClick={() => handleDeleteUser(u.id, u.username)}
                              title="Delete User"
                              disabled={u.username === 'admin' || u.id === currentUser?.id}
                            >
                              <Trash2 size={14} />
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {roleFormOpen && canManageRoles ? (
            <div className="card" style={{ padding: '2rem' }}>
              <h3 style={{ marginBottom: '1.5rem', fontSize: '1.25rem' }}>
                {editRole ? `Edit Role: ${editRole.name}` : 'Add New Role'}
              </h3>
              <form onSubmit={handleSaveRole} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
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
                  <label>Assign Function Permissions</label>
                  <div style={{ overflowX: 'auto', width: '100%', marginBottom: '1rem' }}>
                    <table className="permission-matrix">
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
                                  Full Access
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
                                  Read Only
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

                <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                  <button type="submit" className="btn btn-primary">
                    {editRole ? 'Save Changes' : 'Create Role'}
                  </button>
                  <button 
                    type="button" 
                    className="btn btn-outline" 
                    onClick={() => { setRoleFormOpen(false); setEditRole(null); }}
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
                      recipes: 'none',
                      planner: 'none',
                      shopping_list: 'none',
                      users: 'none',
                      roles: 'none'
                    });
                    setRoleFormOpen(true);
                  }}
                >
                  <Plus size={20} /> Add Role
                </button>
              </div>
            )
          )}

          <div className="card" style={{ padding: '0.5rem 0', overflowX: 'auto' }}>
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
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                          {Object.entries(perms).map(([k, v]) => (
                            <span 
                              key={k} 
                              className={`badge ${v === 'full' ? 'badge-primary' : 'badge-secondary'}`}
                              style={{ opacity: v === 'none' ? 0.4 : 1, fontSize: '0.7rem' }}
                            >
                              {k.replace('_', ' ')}: {v}
                            </span>
                          ))}
                        </div>
                      </td>
                      {canManageRoles && (
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: '0.5rem' }}>
                            <button 
                              className="btn btn-outline" 
                              style={{ padding: '0.35rem 0.5rem' }}
                              onClick={() => handleEditRoleClick(r)}
                              title="Edit Role"
                            >
                              <Edit2 size={14} />
                            </button>
                            <button 
                              className="btn btn-secondary" 
                              style={{ padding: '0.35rem 0.5rem', color: 'var(--danger)' }}
                              onClick={() => handleDeleteRole(r.id, r.name)}
                              title="Delete Role"
                              disabled={r.name === 'Administrator'}
                            >
                              <Trash2 size={14} />
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
        <div className="card" style={{ padding: '2rem' }}>
          <form onSubmit={handleSaveSSOSettings} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', borderBottom: '2px solid var(--border-color)', paddingBottom: '0.5rem' }}>
              Microsoft 365 Single Sign-On (OIDC)
            </h3>
            
            <div className="form-group" style={{ flexDirection: 'row', alignItems: 'center', gap: '0.5rem' }}>
              <input 
                id="sso-enabled"
                type="checkbox"
                checked={oidcEnabled}
                onChange={(e) => setOidcEnabled(e.target.checked)}
                style={{ width: '20px', height: '20px', cursor: 'pointer' }}
              />
              <label htmlFor="sso-enabled" style={{ cursor: 'pointer', fontWeight: 'bold', margin: 0 }}>
                Enable Microsoft 365 OIDC SSO
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
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
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
                type={showSSOSecret ? "text" : "password"} 
                className="input-control" 
                value={oidcClientSecret}
                onChange={(e) => setOidcClientSecret(e.target.value)}
                placeholder="Enter client secret value"
                required={oidcEnabled} 
              />
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
                <input 
                  id="show-sso-secret"
                  type="checkbox"
                  checked={showSSOSecret}
                  onChange={(e) => setShowSSOSecret(e.target.checked)}
                  style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                />
                <label htmlFor="show-sso-secret" style={{ fontSize: '0.85rem', cursor: 'pointer', userSelect: 'none', margin: 0 }}>
                  Show Secret
                </label>
              </div>
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
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Must match exactly one of the Redirect URIs configured in the Azure App Registration. Recommended: <strong>{window.location.origin}/api/auth/oidc/callback</strong>
              </span>
            </div>

            <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: '0.5rem 0' }} />

            <h4 style={{ fontSize: '1.05rem', margin: 0 }}>User Provisioning & Roles</h4>

            <div className="form-group" style={{ flexDirection: 'row', alignItems: 'center', gap: '0.5rem' }}>
              <input 
                id="sso-provision"
                type="checkbox"
                checked={oidcAutoProvision}
                onChange={(e) => setOidcAutoProvision(e.target.checked)}
                style={{ width: '20px', height: '20px', cursor: 'pointer' }}
              />
              <label htmlFor="sso-provision" style={{ cursor: 'pointer', fontWeight: 'bold', margin: 0 }}>
                Auto-provision new users on first login
              </label>
            </div>

            <div className="form-group">
              <label htmlFor="sso-default-role">Default Assigned Role</label>
              <select 
                id="sso-default-role"
                className="input-control"
                value={oidcDefaultRole}
                onChange={(e) => setOidcDefaultRole(e.target.value)}
                style={{ background: 'var(--bg-app)', color: 'var(--text-main)', cursor: 'pointer' }}
                disabled={!oidcAutoProvision}
              >
                {roles.map(role => (
                  <option key={role.id} value={role.name}>{role.name}</option>
                ))}
              </select>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                New accounts created via SSO login will automatically be assigned this role.
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
              <button 
                type="submit" 
                className="btn btn-primary" 
                style={{ gap: '0.5rem' }}
                disabled={saving}
              >
                <Save size={18} /> {saving ? 'Saving...' : 'Save SSO Settings'}
              </button>
            </div>
          </form>
        </div>
      )}
      {/* BRANDING CONFIGURATION TAB */}
      {activeSubTab === 'branding' && canManageRoles && (
        <div className="card" style={{ padding: '2rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            
            {/* Title Icon Customization */}
            <form onSubmit={handleSaveBrandingIcon} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '2rem' }}>
              <h3 style={{ fontSize: '1.25rem', margin: 0 }}>App Title Icon</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>
                Customize or remove the emoji/icon shown in the application title (e.g. in the sidebar and mobile header).
              </p>
              
              <div className="form-group" style={{ maxWidth: '400px' }}>
                <label htmlFor="branding-icon-input">Title Icon / Emoji</label>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <input 
                    id="branding-icon-input"
                    type="text" 
                    className="input-control" 
                    value={brandingIcon}
                    onChange={(e) => setBrandingIcon(e.target.value)}
                    placeholder="Enter an emoji or text (e.g. 🍳)"
                    style={{ fontSize: '1.2rem', textAlign: 'center', width: '100px', flex: '0 0 auto' }}
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
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '2rem' }}>
              <h3 style={{ fontSize: '1.25rem', margin: 0 }}>App Logo</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>
                Upload a custom logo to replace the app title text in the sidebar / mobile headers, and display on the login page.
              </p>
              
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2rem', alignItems: 'center' }}>
                <div style={{ flex: '1 1 300px' }}>
                  <input 
                    type="file" 
                    id="logo-upload-input" 
                    accept="image/*" 
                    onChange={handleUploadLogo} 
                    style={{ display: 'none' }}
                  />
                  <label 
                    htmlFor="logo-upload-input" 
                    className="btn btn-secondary" 
                    style={{ cursor: 'pointer', display: 'inline-flex', width: 'auto' }}
                  >
                    Choose Logo Image
                  </label>
                  <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                    Supported formats: PNG, JPG, WEBP, SVG. Replaces text headers when uploaded.
                  </span>
                </div>

                {brandingLogo && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'center', border: '1px solid var(--border-color)', padding: '1rem', borderRadius: 'var(--radius-md)', background: 'var(--bg-app)' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--text-muted)' }}>Current Logo Preview</span>
                    <img 
                      src={brandingLogo} 
                      alt="App Logo" 
                      style={{ maxHeight: '60px', maxWidth: '200px', objectFit: 'contain' }}
                    />
                    <button 
                      type="button" 
                      className="btn btn-danger" 
                      style={{ padding: '0.4rem 1rem', fontSize: '0.8rem', marginTop: '0.5rem' }} 
                      onClick={handleRemoveLogo}
                      disabled={saving}
                    >
                      Remove Logo
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Custom Favicon Upload */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <h3 style={{ fontSize: '1.25rem', margin: 0 }}>Favicon</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>
                Upload a custom favicon image (.ico, .png, or .svg) to replace the default browser tab icon.
              </p>
              
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2rem', alignItems: 'center' }}>
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
                  <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                    Supported formats: ICO, PNG, SVG.
                  </span>
                </div>

                {brandingFavicon && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'center', border: '1px solid var(--border-color)', padding: '1rem', borderRadius: 'var(--radius-md)', background: 'var(--bg-app)' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--text-muted)' }}>Current Favicon Preview</span>
                    <img 
                      src={brandingFavicon} 
                      alt="Favicon" 
                      style={{ height: '32px', width: '32px', objectFit: 'contain' }}
                    />
                    <button 
                      type="button" 
                      className="btn btn-danger" 
                      style={{ padding: '0.4rem 1rem', fontSize: '0.8rem', marginTop: '0.5rem' }} 
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
        <div className="card" style={{ padding: '2rem' }}>
          <form onSubmit={handleSaveCalendarSettings} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '500px' }}>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Calendar size={20} /> Microsoft Calendar Sync Settings
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Configure which Microsoft 365 calendar you want your weekly meal plans to sync to.
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
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Leave this field blank to use your default <strong>M365 Calendar</strong>.
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
              <button 
                type="submit" 
                className="btn btn-primary" 
                style={{ gap: '0.5rem' }}
                disabled={saving}
              >
                <Save size={18} /> {saving ? 'Saving...' : 'Save Calendar Settings'}
              </button>
            </div>

            {/* Available Calendars Section */}
            <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h4 style={{ fontSize: '1.05rem', margin: 0 }}>Available M365 Calendars</h4>
                <button 
                  type="button" 
                  className="btn btn-outline" 
                  style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}
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
                        const calendars = Array.isArray(data) ? data : (data.calendars || []);
                        setAvailableCalendars(calendars);
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
                  {availableCalendars.length > 0 ? 'Refresh Calendar List' : 'Load Calendars from Microsoft'}
                </button>
              </div>

              {availableCalendars.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.5rem' }}>
                  {availableCalendars.map(cal => (
                    <div 
                      key={cal.id} 
                      style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center', 
                        padding: '0.75rem 1rem', 
                        border: '1px solid var(--border-color)', 
                        borderRadius: 'var(--radius-sm)',
                        background: 'var(--bg-app)',
                        gap: '1rem'
                      }}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem', overflow: 'hidden' }}>
                        <span style={{ fontWeight: '600', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          {cal.name}
                          {cal.isDefault && (
                            <span className="badge badge-primary" style={{ fontSize: '0.65rem', padding: '0.1rem 0.35rem' }}>Default</span>
                          )}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '350px' }} title={cal.id}>
                          ID: {cal.id}
                        </span>
                      </div>
                      <button 
                        type="button" 
                        className="btn btn-outline" 
                        style={{ fontSize: '0.75rem', padding: '0.35rem 0.65rem', flexShrink: 0 }}
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
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '0.25rem 0' }}>
                  Connect your Microsoft 365 account to list and select from your custom calendars.
                </p>
              )}
            </div>
          </form>
        </div>
      )}

      {/* INTEGRATIONS & API KEY TAB */}
      {activeSubTab === 'integrations' && currentUser?.role_name === 'Administrator' && (
        <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {/* Key Management Card */}
          <div className="card" style={{ padding: '2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <Cpu size={24} style={{ color: 'var(--primary)' }} />
              <h3 style={{ fontSize: '1.25rem', margin: 0 }}>API Key Integration</h3>
            </div>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
              Generate an API key to securely integrate this cookbook with external applications, browser extensions, or automated tools. 
              API requests using this key will authenticate with Administrator-level privileges.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div className="form-group">
                <label htmlFor="api-key-input">Active API Key</label>
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                  <div style={{ position: 'relative', flex: 1 }}>
                    <input 
                      id="api-key-input"
                      type={revealKey ? "text" : "password"} 
                      className="input-control" 
                      value={apiKey || ''}
                      placeholder={loadingApiKey ? "Loading key..." : "No API key generated yet"}
                      readOnly
                      style={{ 
                        fontFamily: apiKey ? 'monospace' : 'inherit', 
                        paddingRight: '3rem',
                        background: 'var(--bg-app-dark, rgba(0,0,0,0.05))',
                        color: apiKey ? 'var(--text-main)' : 'var(--text-muted)'
                      }}
                    />
                    {apiKey && (
                      <button
                        type="button"
                        onClick={() => setRevealKey(!revealKey)}
                        style={{
                          position: 'absolute',
                          right: '0.75rem',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          background: 'none',
                          border: 'none',
                          color: 'var(--text-muted)',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: '0.25rem'
                        }}
                        title={revealKey ? "Hide API Key" : "Reveal API Key"}
                      >
                        {revealKey ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    )}
                  </div>

                  {apiKey && (
                    <button
                      type="button"
                      className="btn btn-outline"
                      onClick={() => handleCopyText(apiKey, 'API Key')}
                      style={{ padding: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}
                      title="Copy API Key to Clipboard"
                    >
                      <Copy size={16} /> Copy
                    </button>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleGenerateApiKey}
                  disabled={loadingApiKey}
                  style={{ gap: '0.5rem', display: 'flex', alignItems: 'center' }}
                >
                  <Key size={16} />
                  {apiKey ? 'Regenerate API Key' : 'Generate API Key'}
                </button>

                {apiKey && (
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={handleRevokeApiKey}
                    disabled={loadingApiKey}
                    style={{ gap: '0.5rem', display: 'flex', alignItems: 'center', color: 'var(--danger)' }}
                  >
                    <Trash2 size={16} />
                    Revoke API Key
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Documentation Card */}
          <div className="card" style={{ padding: '2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
              <Code size={24} style={{ color: 'var(--primary)' }} />
              <h3 style={{ fontSize: '1.25rem', margin: 0 }}>API Documentation</h3>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', margin: 0 }}>
                Integrations authenticate via standard HTTP requests. You can pass the API key using either the 
                <code>X-API-Key</code> request header, or the <code>api_key</code> query parameter.
              </p>

              {/* API Endpoints */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                
                {/* Endpoint 1: List Recipes */}
                <div style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', background: 'var(--bg-app-dark, rgba(0,0,0,0.02))', borderBottom: '1px solid var(--border-color)', flexWrap: 'wrap' }}>
                    <span style={{ background: '#10b981', color: '#fff', fontSize: '0.75rem', fontWeight: 'bold', padding: '0.25rem 0.5rem', borderRadius: 'var(--radius-sm)' }}>GET</span>
                    <code style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>/api/recipes</code>
                    <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginLeft: 'auto' }}>List and search recipes</span>
                  </div>
                  <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <p style={{ fontSize: '0.875rem', margin: 0 }}>
                      Retrieves a list of all recipes. You can optionally filter by search query using the <code>q</code> query parameter.
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--text-muted)' }}>Example Request (Header):</span>
                      <div style={{ display: 'flex', position: 'relative' }}>
                        <pre style={{ margin: 0, padding: '0.75rem 1rem', background: '#1e1e2e', color: '#cdd6f4', borderRadius: 'var(--radius-sm)', width: '100%', overflowX: 'auto', fontSize: '0.8rem', fontFamily: 'monospace' }}>
                          {`curl -H "X-API-Key: ${apiKey || 'YOUR_API_KEY'}" ${window.location.origin}/api/recipes`}
                        </pre>
                        <button
                          type="button"
                          onClick={() => handleCopyText(`curl -H "X-API-Key: ${apiKey || 'YOUR_API_KEY'}" ${window.location.origin}/api/recipes`, 'curl command')}
                          style={{ position: 'absolute', right: '0.5rem', top: '50%', transform: 'translateY(-50%)', background: 'var(--bg-app)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', color: 'var(--text-main)', cursor: 'pointer', padding: '0.25rem 0.5rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                        >
                          <Copy size={12} /> Copy
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Endpoint 2: Get Recipe Details */}
                <div style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', background: 'var(--bg-app-dark, rgba(0,0,0,0.02))', borderBottom: '1px solid var(--border-color)', flexWrap: 'wrap' }}>
                    <span style={{ background: '#10b981', color: '#fff', fontSize: '0.75rem', fontWeight: 'bold', padding: '0.25rem 0.5rem', borderRadius: 'var(--radius-sm)' }}>GET</span>
                    <code style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>/api/recipes/:id</code>
                    <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginLeft: 'auto' }}>Get single recipe details</span>
                  </div>
                  <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <p style={{ fontSize: '0.875rem', margin: 0 }}>
                      Fetches details for a specific recipe, including its full ingredients list and step-by-step instructions.
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--text-muted)' }}>Example Request (Query Parameter):</span>
                      <div style={{ display: 'flex', position: 'relative' }}>
                        <pre style={{ margin: 0, padding: '0.75rem 1rem', background: '#1e1e2e', color: '#cdd6f4', borderRadius: 'var(--radius-sm)', width: '100%', overflowX: 'auto', fontSize: '0.8rem', fontFamily: 'monospace' }}>
                          {`curl "${window.location.origin}/api/recipes/1?api_key=${apiKey || 'YOUR_API_KEY'}"`}
                        </pre>
                        <button
                          type="button"
                          onClick={() => handleCopyText(`curl "${window.location.origin}/api/recipes/1?api_key=${apiKey || 'YOUR_API_KEY'}"`, 'curl command')}
                          style={{ position: 'absolute', right: '0.5rem', top: '50%', transform: 'translateY(-50%)', background: 'var(--bg-app)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', color: 'var(--text-main)', cursor: 'pointer', padding: '0.25rem 0.5rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                        >
                          <Copy size={12} /> Copy
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Endpoint 3: Retrieve Menu */}
                <div style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', background: 'var(--bg-app-dark, rgba(0,0,0,0.02))', borderBottom: '1px solid var(--border-color)', flexWrap: 'wrap' }}>
                    <span style={{ background: '#10b981', color: '#fff', fontSize: '0.75rem', fontWeight: 'bold', padding: '0.25rem 0.5rem', borderRadius: 'var(--radius-sm)' }}>GET</span>
                    <code style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>/api/menu</code>
                    <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginLeft: 'auto' }}>Get current weekly menu</span>
                  </div>
                  <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <p style={{ fontSize: '0.875rem', margin: 0 }}>
                      Retrieves all meals scheduled on the weekly planner.
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--text-muted)' }}>Example Request:</span>
                      <div style={{ display: 'flex', position: 'relative' }}>
                        <pre style={{ margin: 0, padding: '0.75rem 1rem', background: '#1e1e2e', color: '#cdd6f4', borderRadius: 'var(--radius-sm)', width: '100%', overflowX: 'auto', fontSize: '0.8rem', fontFamily: 'monospace' }}>
                          {`curl -H "X-API-Key: ${apiKey || 'YOUR_API_KEY'}" ${window.location.origin}/api/menu`}
                        </pre>
                        <button
                          type="button"
                          onClick={() => handleCopyText(`curl -H "X-API-Key: ${apiKey || 'YOUR_API_KEY'}" ${window.location.origin}/api/menu`, 'curl command')}
                          style={{ position: 'absolute', right: '0.5rem', top: '50%', transform: 'translateY(-50%)', background: 'var(--bg-app)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', color: 'var(--text-main)', cursor: 'pointer', padding: '0.25rem 0.5rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                        >
                          <Copy size={12} /> Copy
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Endpoint 4: Create/Update Menu Item */}
                <div style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', background: 'var(--bg-app-dark, rgba(0,0,0,0.02))', borderBottom: '1px solid var(--border-color)', flexWrap: 'wrap' }}>
                    <span style={{ background: '#3b82f6', color: '#fff', fontSize: '0.75rem', fontWeight: 'bold', padding: '0.25rem 0.5rem', borderRadius: 'var(--radius-sm)' }}>POST</span>
                    <code style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>/api/menu</code>
                    <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginLeft: 'auto' }}>Update day meal plan</span>
                  </div>
                  <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <p style={{ fontSize: '0.875rem', margin: 0 }}>
                      Schedules a recipe, leftover, or custom meal for a given day and meal type.
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--text-muted)' }}>Example Request:</span>
                      <div style={{ display: 'flex', position: 'relative' }}>
                        <pre style={{ margin: 0, padding: '0.75rem 1rem', background: '#1e1e2e', color: '#cdd6f4', borderRadius: 'var(--radius-sm)', width: '100%', overflowX: 'auto', fontSize: '0.8rem', fontFamily: 'monospace' }}>
                          {`curl -X POST -H "X-API-Key: ${apiKey || 'YOUR_API_KEY'}" -H "Content-Type: application/json" -d '{"day_of_week": "Monday", "meal_type": "Dinner", "custom_meal": "Tacos"}' ${window.location.origin}/api/menu`}
                        </pre>
                        <button
                          type="button"
                          onClick={() => handleCopyText(`curl -X POST -H "X-API-Key: ${apiKey || 'YOUR_API_KEY'}" -H "Content-Type: application/json" -d '{"day_of_week": "Monday", "meal_type": "Dinner", "custom_meal": "Tacos"}' ${window.location.origin}/api/menu`, 'curl command')}
                          style={{ position: 'absolute', right: '0.5rem', top: '50%', transform: 'translateY(-50%)', background: 'var(--bg-app)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', color: 'var(--text-main)', cursor: 'pointer', padding: '0.25rem 0.5rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                        >
                          <Copy size={12} /> Copy
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Endpoint 5: Get Leftovers */}
                <div style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', background: 'var(--bg-app-dark, rgba(0,0,0,0.02))', borderBottom: '1px solid var(--border-color)', flexWrap: 'wrap' }}>
                    <span style={{ background: '#10b981', color: '#fff', fontSize: '0.75rem', fontWeight: 'bold', padding: '0.25rem 0.5rem', borderRadius: 'var(--radius-sm)' }}>GET</span>
                    <code style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>/api/leftovers</code>
                    <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginLeft: 'auto' }}>List leftovers in fridge</span>
                  </div>
                  <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <p style={{ fontSize: '0.875rem', margin: 0 }}>
                      Retrieves all active leftovers recorded in the fridge.
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--text-muted)' }}>Example Request:</span>
                      <div style={{ display: 'flex', position: 'relative' }}>
                        <pre style={{ margin: 0, padding: '0.75rem 1rem', background: '#1e1e2e', color: '#cdd6f4', borderRadius: 'var(--radius-sm)', width: '100%', overflowX: 'auto', fontSize: '0.8rem', fontFamily: 'monospace' }}>
                          {`curl -H "X-API-Key: ${apiKey || 'YOUR_API_KEY'}" ${window.location.origin}/api/leftovers`}
                        </pre>
                        <button
                          type="button"
                          onClick={() => handleCopyText(`curl -H "X-API-Key: ${apiKey || 'YOUR_API_KEY'}" ${window.location.origin}/api/leftovers`, 'curl command')}
                          style={{ position: 'absolute', right: '0.5rem', top: '50%', transform: 'translateY(-50%)', background: 'var(--bg-app)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', color: 'var(--text-main)', cursor: 'pointer', padding: '0.25rem 0.5rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                        >
                          <Copy size={12} /> Copy
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Endpoint 6: List Active Notifications */}
                <div style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', background: 'var(--bg-app-dark, rgba(0,0,0,0.02))', borderBottom: '1px solid var(--border-color)', flexWrap: 'wrap' }}>
                    <span style={{ background: '#10b981', color: '#fff', fontSize: '0.75rem', fontWeight: 'bold', padding: '0.25rem 0.5rem', borderRadius: 'var(--radius-sm)' }}>GET</span>
                    <code style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>/api/notifications/active</code>
                    <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginLeft: 'auto' }}>List active/sent notifications</span>
                  </div>
                  <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <p style={{ fontSize: '0.875rem', margin: 0 }}>
                      Retrieves a list of the 100 most recently triggered and sent notifications.
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--text-muted)' }}>Example Request:</span>
                      <div style={{ display: 'flex', position: 'relative' }}>
                        <pre style={{ margin: 0, padding: '0.75rem 1rem', background: '#1e1e2e', color: '#cdd6f4', borderRadius: 'var(--radius-sm)', width: '100%', overflowX: 'auto', fontSize: '0.8rem', fontFamily: 'monospace' }}>
                          {`curl -H "X-API-Key: ${apiKey || 'YOUR_API_KEY'}" ${window.location.origin}/api/notifications/active`}
                        </pre>
                        <button
                          type="button"
                          onClick={() => handleCopyText(`curl -H "X-API-Key: ${apiKey || 'YOUR_API_KEY'}" ${window.location.origin}/api/notifications/active`, 'curl command')}
                          style={{ position: 'absolute', right: '0.5rem', top: '50%', transform: 'translateY(-50%)', background: 'var(--bg-app)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', color: 'var(--text-main)', cursor: 'pointer', padding: '0.25rem 0.5rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                        >
                          <Copy size={12} /> Copy
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Endpoint 7: Toggle Notification Rule */}
                <div style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', background: 'var(--bg-app-dark, rgba(0,0,0,0.02))', borderBottom: '1px solid var(--border-color)', flexWrap: 'wrap' }}>
                    <span style={{ background: '#3b82f6', color: '#fff', fontSize: '0.75rem', fontWeight: 'bold', padding: '0.25rem 0.5rem', borderRadius: 'var(--radius-sm)' }}>POST</span>
                    <code style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>/api/notifications/toggle</code>
                    <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginLeft: 'auto' }}>Enable/Disable notification rule</span>
                  </div>
                  <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <p style={{ fontSize: '0.875rem', margin: 0 }}>
                      Enables or disables a specific notification event rule (e.g., "Recipe Added", "Recipe Deleted", "Meal Plan Updated", "Meal Added to Leftovers", "Leftovers Expiring", "Inventory Item Expiring").
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--text-muted)' }}>Example Request:</span>
                      <div style={{ display: 'flex', position: 'relative' }}>
                        <pre style={{ margin: 0, padding: '0.75rem 1rem', background: '#1e1e2e', color: '#cdd6f4', borderRadius: 'var(--radius-sm)', width: '100%', overflowX: 'auto', fontSize: '0.8rem', fontFamily: 'monospace' }}>
                          {`curl -X POST -H "X-API-Key: ${apiKey || 'YOUR_API_KEY'}" -H "Content-Type: application/json" -d '{"event": "Recipe Added", "enabled": true}' ${window.location.origin}/api/notifications/toggle`}
                        </pre>
                        <button
                          type="button"
                          onClick={() => handleCopyText(`curl -X POST -H "X-API-Key: ${apiKey || 'YOUR_API_KEY'}" -H "Content-Type: application/json" -d '{"event": "Recipe Added", "enabled": true}' ${window.location.origin}/api/notifications/toggle`, 'curl command')}
                          style={{ position: 'absolute', right: '0.5rem', top: '50%', transform: 'translateY(-50%)', background: 'var(--bg-app)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', color: 'var(--text-main)', cursor: 'pointer', padding: '0.25rem 0.5rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                        >
                          <Copy size={12} /> Copy
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Endpoint 8: Trigger Expiration Check */}
                <div style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', background: 'var(--bg-app-dark, rgba(0,0,0,0.02))', borderBottom: '1px solid var(--border-color)', flexWrap: 'wrap' }}>
                    <span style={{ background: '#3b82f6', color: '#fff', fontSize: '0.75rem', fontWeight: 'bold', padding: '0.25rem 0.5rem', borderRadius: 'var(--radius-sm)' }}>POST</span>
                    <code style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>/api/notifications/check-expiry</code>
                    <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginLeft: 'auto' }}>Trigger manual expiration check</span>
                  </div>
                  <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <p style={{ fontSize: '0.875rem', margin: 0 }}>
                      Manually triggers an immediate scan of expiring leftovers and inventory items, sending any configured notification alerts.
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--text-muted)' }}>Example Request:</span>
                      <div style={{ display: 'flex', position: 'relative' }}>
                        <pre style={{ margin: 0, padding: '0.75rem 1rem', background: '#1e1e2e', color: '#cdd6f4', borderRadius: 'var(--radius-sm)', width: '100%', overflowX: 'auto', fontSize: '0.8rem', fontFamily: 'monospace' }}>
                          {`curl -X POST -H "X-API-Key: ${apiKey || 'YOUR_API_KEY'}" ${window.location.origin}/api/notifications/check-expiry`}
                        </pre>
                        <button
                          type="button"
                          onClick={() => handleCopyText(`curl -X POST -H "X-API-Key: ${apiKey || 'YOUR_API_KEY'}" ${window.location.origin}/api/notifications/check-expiry`, 'curl command')}
                          style={{ position: 'absolute', right: '0.5rem', top: '50%', transform: 'translateY(-50%)', background: 'var(--bg-app)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', color: 'var(--text-main)', cursor: 'pointer', padding: '0.25rem 0.5rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                        >
                          <Copy size={12} /> Copy
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
        <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          <form onSubmit={handleSaveNotificationSettings} style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            
            {/* Notification Channels Card */}
            <div className="card" style={{ padding: '2rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
                <Bell size={24} style={{ color: 'var(--primary)' }} />
                <h3 style={{ fontSize: '1.25rem', margin: 0 }}>Notification Channels</h3>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                
                {/* SMTP Config */}
                <div style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '1.5rem', background: 'var(--bg-app-dark, rgba(0,0,0,0.02))' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
                    <Mail size={18} style={{ color: 'var(--primary)' }} />
                    <h4 style={{ margin: 0, fontSize: '1.05rem' }}>SMTP Email Configuration</h4>
                  </div>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
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
                    <div className="form-group" style={{ flexDirection: 'row', alignItems: 'center', gap: '0.5rem', marginTop: '1.5rem' }}>
                      <input 
                        id="smtp-secure"
                        type="checkbox" 
                        checked={notifySmtpSecure} 
                        onChange={(e) => setNotifySmtpSecure(e.target.checked)} 
                        style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                      />
                      <label htmlFor="smtp-secure" style={{ margin: 0, cursor: 'pointer', fontWeight: '600' }}>Use SSL/TLS (Port 465)</label>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
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
                        type={showSMTPPassword ? "text" : "password"} 
                        className="input-control" 
                        value={notifySmtpPass} 
                        onChange={(e) => setNotifySmtpPass(e.target.value)} 
                        placeholder="Enter SMTP password" 
                      />
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
                        <input 
                          id="show-smtp-password"
                          type="checkbox"
                          checked={showSMTPPassword}
                          onChange={(e) => setShowSMTPPassword(e.target.checked)}
                          style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                        />
                        <label htmlFor="show-smtp-password" style={{ fontSize: '0.85rem', cursor: 'pointer', userSelect: 'none', margin: 0 }}>
                          Show Password
                        </label>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
                    <div className="form-group">
                      <label htmlFor="smtp-from">From Email Address</label>
                      <input 
                        id="smtp-from"
                        type="email" 
                        className="input-control" 
                        value={notifySmtpFrom} 
                        onChange={(e) => setNotifySmtpFrom(e.target.value)} 
                        placeholder="e.g. no-reply@cookbook.com" 
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
                <div style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '1.5rem', background: 'var(--bg-app-dark, rgba(0,0,0,0.02))' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
                    <MessageSquare size={18} style={{ color: 'var(--primary)' }} />
                    <h4 style={{ margin: 0, fontSize: '1.05rem' }}>Discord Integration</h4>
                  </div>
                  <div className="form-group">
                    <label htmlFor="discord-url">Discord Webhook URL</label>
                    <input 
                      id="discord-url"
                      type="text" 
                      className="input-control" 
                      value={notifyDiscordWebhookUrl} 
                      onChange={(e) => setNotifyDiscordWebhookUrl(e.target.value)} 
                      placeholder="e.g. https://discord.com/api/webhooks/..." 
                    />
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      Incoming alerts will be pushed as rich message embeds into the linked Discord channel.
                    </span>
                  </div>
                </div>

                {/* Webhook Config */}
                <div style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '1.5rem', background: 'var(--bg-app-dark, rgba(0,0,0,0.02))' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
                    <Webhook size={18} style={{ color: 'var(--primary)' }} />
                    <h4 style={{ margin: 0, fontSize: '1.05rem' }}>HTTP Webhook Notifications</h4>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                    <div className="form-group">
                      <label htmlFor="webhook-url">Webhook URL</label>
                      <input 
                        id="webhook-url"
                        type="text" 
                        className="input-control" 
                        value={notifyWebhookUrl} 
                        onChange={(e) => setNotifyWebhookUrl(e.target.value)} 
                        placeholder="e.g. https://api.myhouse.com/cookbook-alert" 
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="webhook-secret">Webhook Secret Signature Token</label>
                      <input 
                        id="webhook-secret"
                        type={showWebhookSecret ? "text" : "password"} 
                        className="input-control" 
                        value={notifyWebhookSecret} 
                        onChange={(e) => setNotifyWebhookSecret(e.target.value)} 
                        placeholder="Enter secret token for HMAC validation" 
                      />
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
                        <input 
                          id="show-webhook-secret"
                          type="checkbox"
                          checked={showWebhookSecret}
                          onChange={(e) => setShowWebhookSecret(e.target.checked)}
                          style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                        />
                        <label htmlFor="show-webhook-secret" style={{ fontSize: '0.85rem', cursor: 'pointer', userSelect: 'none', margin: 0 }}>
                          Show Secret
                        </label>
                      </div>
                    </div>
                  </div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginTop: '0.5rem' }}>
                    Posts a JSON body containing event data. Requests are signed using HMAC-SHA256 in the <code>X-Signature</code> header.
                  </span>
                </div>

              </div>
            </div>

            {/* Notification Rules & Events Card */}
            <div className="card" style={{ padding: '2rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
                <Settings size={24} style={{ color: 'var(--primary)' }} />
                <h3 style={{ fontSize: '1.25rem', margin: 0 }}>Notification Rules</h3>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                
                {/* Event toggles */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
                  
                  <div className="form-group" style={{ flexDirection: 'row', alignItems: 'center', gap: '0.5rem' }}>
                    <input 
                      id="rule-recipe-added"
                      type="checkbox" 
                      checked={notifyRecipeAdded} 
                      onChange={(e) => setNotifyRecipeAdded(e.target.checked)} 
                      style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                    />
                    <label htmlFor="rule-recipe-added" style={{ margin: 0, cursor: 'pointer', fontWeight: '600' }}>Recipe Added</label>
                  </div>

                  <div className="form-group" style={{ flexDirection: 'row', alignItems: 'center', gap: '0.5rem' }}>
                    <input 
                      id="rule-recipe-deleted"
                      type="checkbox" 
                      checked={notifyRecipeDeleted} 
                      onChange={(e) => setNotifyRecipeDeleted(e.target.checked)} 
                      style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                    />
                    <label htmlFor="rule-recipe-deleted" style={{ margin: 0, cursor: 'pointer', fontWeight: '600' }}>Recipe Deleted</label>
                  </div>

                  <div className="form-group" style={{ flexDirection: 'row', alignItems: 'center', gap: '0.5rem' }}>
                    <input 
                      id="rule-meal-plan"
                      type="checkbox" 
                      checked={notifyMealPlanUpdated} 
                      onChange={(e) => setNotifyMealPlanUpdated(e.target.checked)} 
                      style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                    />
                    <label htmlFor="rule-meal-plan" style={{ margin: 0, cursor: 'pointer', fontWeight: '600' }}>Meal Plan Updated</label>
                  </div>

                  <div className="form-group" style={{ flexDirection: 'row', alignItems: 'center', gap: '0.5rem' }}>
                    <input 
                      id="rule-leftover-added"
                      type="checkbox" 
                      checked={notifyLeftoversAdded} 
                      onChange={(e) => setNotifyLeftoversAdded(e.target.checked)} 
                      style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                    />
                    <label htmlFor="rule-leftover-added" style={{ margin: 0, cursor: 'pointer', fontWeight: '600' }}>Meal Added to Leftovers</label>
                  </div>

                  <div className="form-group" style={{ flexDirection: 'row', alignItems: 'center', gap: '0.5rem' }}>
                    <input 
                      id="rule-leftover-expiring"
                      type="checkbox" 
                      checked={notifyLeftoversExpiring} 
                      onChange={(e) => setNotifyLeftoversExpiring(e.target.checked)} 
                      style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                    />
                    <label htmlFor="rule-leftover-expiring" style={{ margin: 0, cursor: 'pointer', fontWeight: '600' }}>Leftovers Expiring</label>
                  </div>

                  <div className="form-group" style={{ flexDirection: 'row', alignItems: 'center', gap: '0.5rem' }}>
                    <input 
                      id="rule-inventory-expiring"
                      type="checkbox" 
                      checked={notifyInventoryExpiring} 
                      onChange={(e) => setNotifyInventoryExpiring(e.target.checked)} 
                      style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                    />
                    <label htmlFor="rule-inventory-expiring" style={{ margin: 0, cursor: 'pointer', fontWeight: '600' }}>Inventory Item Expiring</label>
                  </div>

                </div>

                <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: '0.5rem 0' }} />

                {/* Lead Days Setup */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
                  
                  <div className="form-group">
                    <label htmlFor="leftover-lead-days" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <Info size={14} style={{ color: 'var(--primary)' }} /> Leftovers Expiry Lead Days
                    </label>
                    <input 
                      id="leftover-lead-days"
                      type="number" 
                      className="input-control" 
                      value={notifyLeftoversExpiryDays} 
                      onChange={(e) => setNotifyLeftoversExpiryDays(Math.max(1, parseInt(e.target.value, 10) || 1))} 
                      min="1" 
                      disabled={!notifyLeftoversExpiring} 
                    />
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      Send an alert this many days before leftovers expire.
                    </span>
                  </div>

                  <div className="form-group">
                    <label htmlFor="inventory-lead-days" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <Info size={14} style={{ color: 'var(--primary)' }} /> Inventory Expiry Lead Days
                    </label>
                    <input 
                      id="inventory-lead-days"
                      type="number" 
                      className="input-control" 
                      value={notifyInventoryExpiryDays} 
                      onChange={(e) => setNotifyInventoryExpiryDays(Math.max(1, parseInt(e.target.value, 10) || 1))} 
                      min="1" 
                      disabled={!notifyInventoryExpiring} 
                    />
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      Send an alert this many days before inventory items expire.
                    </span>
                  </div>

                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
                  <button 
                    type="submit" 
                    className="btn btn-primary" 
                    style={{ gap: '0.5rem' }} 
                    disabled={savingNotifications}
                  >
                    <Save size={18} /> {savingNotifications ? 'Saving...' : 'Save Configuration'}
                  </button>
                </div>

              </div>
            </div>

          </form>

          {/* Active Notifications Log History Card */}
          <div className="card" style={{ padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <Bell size={24} style={{ color: 'var(--primary)' }} />
                <h3 style={{ fontSize: '1.25rem', margin: 0 }}>Active Notification History</h3>
              </div>
              {notificationLogs.length > 0 && (
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={handleClearNotificationLogs} 
                  style={{ color: 'var(--danger)', fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}
                >
                  Clear History
                </button>
              )}
            </div>

            {loadingNotifications ? (
              <div style={{ textAlign: 'center', padding: '2rem' }}>
                <RotateCcw size={24} className="spinner" style={{ margin: '0 auto' }} />
                <p style={{ marginTop: '0.5rem', fontSize: '0.9rem' }}>Loading notification logs...</p>
              </div>
            ) : notificationLogs.length > 0 ? (
              <div style={{ overflowX: 'auto' }}>
                <table className="table" style={{ width: '100%', fontSize: '0.9rem' }}>
                  <thead>
                    <tr>
                      <th style={{ width: '150px' }}>Date</th>
                      <th style={{ width: '150px' }}>Event Title</th>
                      <th>Notification Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {notificationLogs.map(log => (
                      <tr key={log.id}>
                        <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                          {new Date(log.created_at).toLocaleString()}
                        </td>
                        <td>
                          <span 
                            className={`badge ${
                              log.event_type.includes('Recipe') ? 'badge-primary' : 
                              log.event_type.includes('Meal') ? 'badge-info' : 
                              'badge-secondary'
                            }`}
                            style={{ fontSize: '0.7rem' }}
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
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', margin: 0, textAlign: 'center', padding: '2rem' }}>
                No active notifications have been recorded yet.
              </p>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
