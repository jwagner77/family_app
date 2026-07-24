import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import nodemailer from 'nodemailer';

import {
  getDb,
  getSettings,
  saveSettings,
  getUserByUsername,
  getUserById,
  getAllUsers,
  createUser,
  updateUser,
  deleteUser,
  getAllRoles,
  getRoleById,
  createRole,
  updateRole,
  deleteRole,
  verifyPassword
} from './db.js';


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.enable('trust proxy');

const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(32).toString('hex');

// Generate custom signed token (session expires in 24 hours)
function generateToken(payload) {
  const payloadStr = Buffer.from(JSON.stringify({ ...payload, exp: Date.now() + 24 * 60 * 60 * 1000 })).toString('base64');
  const signature = crypto.createHmac('sha256', JWT_SECRET).update(payloadStr).digest('hex');
  return `${payloadStr}.${signature}`;
}

// Verify custom signed token
function verifyToken(token) {
  try {
    const [payloadStr, signature] = token.split('.');
    if (!payloadStr || !signature) return null;
    const expectedSignature = crypto.createHmac('sha256', JWT_SECRET).update(payloadStr).digest('hex');
    if (signature !== expectedSignature) return null;
    const payload = JSON.parse(Buffer.from(payloadStr, 'base64').toString('utf8'));
    if (payload.exp < Date.now()) return null; // Expired
    return payload;
  } catch (error) {
    return null;
  }
}

// Authentication middleware
async function authenticate(req, res, next) {
  const apiKeyHeader = req.headers['x-api-key'];
  const apiKeyQuery = req.query.api_key;
  const apiKey = apiKeyHeader || apiKeyQuery;

  if (apiKey) {
    try {
      const settings = await getSettings();
      if (settings.api_key && settings.api_key === apiKey) {
        let user = await getUserById(1);
        if (!user) {
          const db = await getDb();
          const adminRow = await db.get(`
            SELECT u.id FROM users u 
            JOIN roles r ON u.role_id = r.id 
            WHERE r.name = 'Administrator' LIMIT 1
          `);
          if (adminRow) {
            user = await getUserById(adminRow.id);
          }
        }
        if (!user) {
          return res.status(401).json({ error: 'Administrator user not found' });
        }
        
        let permissions = {};
        if (user.role_permissions) {
          try {
            permissions = JSON.parse(user.role_permissions);
          } catch (e) {
            console.error('Failed to parse role permissions:', e);
          }
        }
        
        req.user = {
          id: user.id,
          username: user.username,
          display_name: user.display_name || user.username,
          role_name: user.role_name,
          primary_color: user.primary_color || '#2c3e50',
          theme: user.theme || 'system',
          auth_provider: user.auth_provider || 'local',
          calendar_guid: user.calendar_guid || '',
          timezone: user.timezone || 'US/New_York',
          permissions
        };
        return next();
      } else {
        return res.status(401).json({ error: 'Invalid API Key' });
      }
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  let token = null;
  const authHeader = req.headers['authorization'];
  if (authHeader) {
    token = authHeader.split(' ')[1];
  } else if (req.query.token) {
    token = req.query.token;
  }

  if (!token) return res.status(401).json({ error: 'Authorization header or token missing' });

  const payload = verifyToken(token);
  if (!payload) return res.status(401).json({ error: 'Invalid or expired token' });

  try {
    const user = await getUserById(payload.id);
    if (!user) return res.status(401).json({ error: 'User not found' });
    
    // Parse role permissions
    let permissions = {};
    if (user.role_permissions) {
      try {
        permissions = JSON.parse(user.role_permissions);
      } catch (e) {
        console.error('Failed to parse role permissions:', e);
      }
    }
    
    req.user = {
      id: user.id,
      username: user.username,
      display_name: user.display_name || user.username,
      role_name: user.role_name,
      primary_color: user.primary_color || '#2c3e50',
      theme: user.theme || 'system',
      auth_provider: user.auth_provider || 'local',
      calendar_guid: user.calendar_guid || '',
      timezone: user.timezone || 'US/New_York',
      permissions
    };
    next();
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

// Timezone normalizer for Microsoft Graph API
function normalizeTimezone(tz) {
  const mapping = {
    'US/New_York': 'America/New_York',
    'US/Eastern': 'America/New_York',
    'US/Central': 'America/Chicago',
    'US/Mountain': 'America/Denver',
    'US/Pacific': 'America/Los_Angeles',
    'US/Alaska': 'America/Anchorage',
    'US/Hawaii': 'Pacific/Honolulu'
  };
  return mapping[tz] || tz || 'America/New_York';
}

// Timezone-aware helper to calculate remaining days until a billing date string (YYYY-MM-DD)
function getDaysRemaining(nextBillingDateStr, userTimezone = 'America/New_York') {
  if (!nextBillingDateStr) return null;
  
  try {
    const [year, month, day] = nextBillingDateStr.split('-').map(Number);
    const now = new Date();
    
    // Format current date components in user's timezone
    const tzTodayStr = new Intl.DateTimeFormat('en-US', {
      timeZone: normalizeTimezone(userTimezone),
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(now);
    
    const [tMonth, tDay, tYear] = tzTodayStr.split('/').map(Number);
    
    const targetDate = new Date(year, month - 1, day);
    const todayAtMidnight = new Date(tYear, tMonth - 1, tDay);
    
    const diffTime = targetDate - todayAtMidnight;
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  } catch (error) {
    console.error('Error calculating days remaining:', error);
    return null;
  }
}

// Timezone-aware helper to get today's date in YYYY-MM-DD format
function getTzTodayStr(userTimezone = 'America/New_York') {
  try {
    const now = new Date();
    const tzTodayStr = new Intl.DateTimeFormat('en-US', {
      timeZone: normalizeTimezone(userTimezone),
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(now);
    const [tMonth, tDay, tYear] = tzTodayStr.split('/').map(Number);
    const m = String(tMonth).padStart(2, '0');
    const d = String(tDay).padStart(2, '0');
    return `${tYear}-${m}-${d}`;
  } catch (error) {
    console.error('Error getting timezone today string:', error);
    const fallback = new Date();
    const y = fallback.getFullYear();
    const m = String(fallback.getMonth() + 1).padStart(2, '0');
    const d = String(fallback.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
}

// Recurrence-aware helper to calculate the next billing date (preserving the target day or capping to month-end)
function getNextBillingDate(dateStr, billingCycle) {
  try {
    const [year, month, day] = dateStr.split('-').map(Number);
    if (billingCycle === 'annual') {
      let nextYear = year + 1;
      let nextMonth = month;
      let nextDay = day;
      if (month === 2 && day === 29) {
        const isLeap = (nextYear % 4 === 0 && nextYear % 100 !== 0) || (nextYear % 400 === 0);
        if (!isLeap) {
          nextDay = 28;
        }
      }
      const m = String(nextMonth).padStart(2, '0');
      const d = String(nextDay).padStart(2, '0');
      return `${nextYear}-${m}-${d}`;
    } else {
      // monthly
      let nextMonth = month + 1;
      let nextYear = year;
      if (nextMonth > 12) {
        nextMonth = 1;
        nextYear += 1;
      }
      const maxDays = new Date(nextYear, nextMonth, 0).getDate();
      let nextDay = day;
      if (nextDay > maxDays) {
        nextDay = maxDays;
      }
      const m = String(nextMonth).padStart(2, '0');
      const d = String(nextDay).padStart(2, '0');
      return `${nextYear}-${m}-${d}`;
    }
  } catch (error) {
    console.error('Error calculating next billing date:', error);
    return dateStr;
  }
}

// Normalizes any datetime string to YYYY-MM-DDTHH:mm format (minute precision)
function formatToMinutes(dtStr) {
  if (!dtStr) return '';
  return dtStr.includes('T') ? dtStr.substring(0, 16) : dtStr;
}



// Helper to retrieve a valid M365 access token from database, refreshing silently if expired
async function getValidM365Token(userId) {
  const user = await getUserById(userId);
  if (!user || !user.m365_access_token) return null;
  
  const now = Date.now();
  if (user.m365_token_expires_at && user.m365_token_expires_at > now + 120000) {
    return user.m365_access_token;
  }
  
  if (user.m365_refresh_token) {
    try {
      const settings = await getSettings();
      const tokenUrl = `https://login.microsoftonline.com/${settings.oidc_tenant_id}/oauth2/v2.0/token`;
      const tokenBody = new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: user.m365_refresh_token,
        client_id: settings.oidc_client_id,
        client_secret: settings.oidc_client_secret,
        scope: 'offline_access https://graph.microsoft.com/Calendars.ReadWrite https://graph.microsoft.com/Tasks.ReadWrite'
      });
      
      const res = await fetch(tokenUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: tokenBody.toString()
      });
      
      if (res.ok) {
        const data = await res.json();
        const accessToken = data.access_token;
        const refreshToken = data.refresh_token || user.m365_refresh_token;
        const expiresAt = Date.now() + (data.expires_in * 1000);
        
        const db = await getDb();
        await db.run(
          'UPDATE users SET m365_access_token = ?, m365_refresh_token = ?, m365_token_expires_at = ? WHERE id = ?',
          [accessToken, refreshToken || null, expiresAt, userId]
        );
        return accessToken;
      }
    } catch (err) {
      console.error('Error refreshing M365 token:', err);
    }
  }
  return null;
}

// Permission checking helper factory
function requirePermission(func, level) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthenticated' });
    
    let userPerm = req.user.permissions[func];
    
    if (func === 'users') {
      userPerm = req.user.permissions.settings_users || req.user.permissions.users;
    } else if (func === 'roles') {
      userPerm = req.user.permissions.settings_roles || req.user.permissions.roles;
    }
    
    if (level === 'full' && userPerm !== 'full') {
      return res.status(403).json({ error: `Permission denied. Full access required for ${func}.` });
    }
    if (level === 'read' && userPerm !== 'full' && userPerm !== 'read') {
      return res.status(403).json({ error: `Permission denied. Read access required for ${func}.` });
    }
    
    next();
  };
}

// Send a notification via configured channels
async function sendNotification(title, body, eventType) {
  try {
    const db = await getDb();
    
    await db.run(
      'INSERT INTO notification_logs (title, body, event_type) VALUES (?, ?, ?)',
      [title, body, eventType]
    );

    const settings = await getSettings();

    // Map setting toggles
    const toggleMapping = {
      'System Alert': 'notify_system_alert',
      'User Managed': 'notify_user_managed',
      'Subscription Due Today': 'notify_subscription_due_today',
      'Bill Due Today': 'notify_bill_due_today'
    };

    const settingKey = toggleMapping[eventType] || 'notify_system_alert';
    if (settings[settingKey] !== 'true') {
      return;
    }

    console.log(`Dispatching notification "${title}": ${body}`);

    // SMTP Email
    if (settings.notify_smtp_host && settings.notify_smtp_to) {
      try {
        const isSecure = settings.notify_smtp_secure === 'true';
        const transporter = nodemailer.createTransport({
          host: settings.notify_smtp_host,
          port: parseInt(settings.notify_smtp_port, 10) || 587,
          secure: isSecure,
          auth: settings.notify_smtp_user ? {
            user: settings.notify_smtp_user,
            pass: settings.notify_smtp_pass || ''
          } : undefined
        });

        await transporter.sendMail({
          from: settings.notify_smtp_from || settings.notify_smtp_user || 'no-reply@baseapp.local',
          to: settings.notify_smtp_to,
          subject: `[Base App] ${title}`,
          text: body
        });
        console.log('SMTP email notification sent.');
      } catch (err) {
        console.error('SMTP email error:', err.message);
      }
    }

    // Discord Webhook
    if (settings.notify_discord_webhook_url) {
      try {
        const res = await fetch(settings.notify_discord_webhook_url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: `**[Base App] ${title}**\n${body}`
          })
        });
      } catch (err) {
        console.error('Discord error:', err.message);
      }
    }

    // General Webhook
    if (settings.notify_webhook_url) {
      try {
        const payload = JSON.stringify({
          title,
          body,
          event_type: eventType,
          timestamp: new Date().toISOString()
        });

        const headers = { 'Content-Type': 'application/json' };
        
        if (settings.notify_webhook_secret) {
          const signature = crypto
            .createHmac('sha256', settings.notify_webhook_secret)
            .update(payload)
            .digest('hex');
          headers['X-Signature'] = signature;
        }

        await fetch(settings.notify_webhook_url, {
          method: 'POST',
          headers,
          body: payload
        });
      } catch (err) {
        console.error('Webhook error:', err.message);
      }
    }

  } catch (error) {
    console.error('Notification engine error:', error.message);
  }
}

// Enable CORS and JSON body parser
app.use(cors());
app.use(express.json());

// Set up storage folders
const DATA_DIR = process.env.DATA_DIR || './data';
const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');

if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

// Expose uploaded files static directories
app.use('/uploads', express.static(UPLOADS_DIR));

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

const upload = multer({ storage });

// Initialize database
async function bootstrap() {
  await getDb();
  console.log('Database initialized.');
}
bootstrap();

// --- AUTHENTICATION ENDPOINTS ---


// POST /api/auth/passthrough - SSO passthrough login from One_App
app.post('/api/auth/passthrough', async (req, res) => {
  try {
    const apiKeyHeader = req.headers['x-api-key'] || req.headers['authorization']?.split(' ')[1];
    const apiKeyQuery = req.query.api_key;
    const apiKey = apiKeyHeader || apiKeyQuery;

    const settings = await getSettings();
    if (!settings.api_key || settings.api_key !== apiKey) {
      return res.status(401).json({ error: 'Unauthorized: Invalid or missing API key' });
    }

    const { username, display_name, role_name } = req.body;
    if (!username) {
      return res.status(400).json({ error: 'Missing username in request body' });
    }

    let user = await getUserByUsername(username);
    if (!user) {
      // Find role
      const roles = await getAllRoles();
      const targetRoleName = role_name || 'Viewer';
      let role = roles.find(r => r.name.toLowerCase() === targetRoleName.toLowerCase()) || roles[0];
      if (!role) {
        return res.status(500).json({ error: 'No roles found in system to associate user.' });
      }
      
      const randomPassword = crypto.randomBytes(16).toString('hex');
      const newUserId = await createUser(username, randomPassword, role.id, display_name || username, 'sso');
      user = await getUserById(newUserId);
    } else {
      // Update display name if changed
      if (display_name && user.display_name !== display_name) {
        const db = await getDb();
        await db.run('UPDATE users SET display_name = ? WHERE id = ?', [display_name, user.id]);
        user = await getUserById(user.id);
      }
    }

    const token = generateToken({ id: user.id, username: user.username });
    res.json({ token });
  } catch (error) {
    console.error('Passthrough login failed:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }

  try {
    const user = await getUserByUsername(username);
    if (!user || user.auth_provider !== 'local') {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const valid = verifyPassword(password, user.password);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const token = generateToken({ id: user.id, username: user.username });
    
    // Format response
    let permissions = {};
    if (user.role_permissions) {
      try {
        permissions = JSON.parse(user.role_permissions);
      } catch (e) {}
    }

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        display_name: user.display_name || user.username,
        role_name: user.role_name,
        primary_color: user.primary_color || '#2c3e50',
        theme: user.theme || 'system',
        auth_provider: user.auth_provider || 'local',
        calendar_guid: user.calendar_guid || '',
        timezone: user.timezone || 'US/New_York',
        permissions
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/auth/me', authenticate, (req, res) => {
  res.json({ user: req.user });
});

// --- USER MANAGEMENT ENDPOINTS ---

app.post('/api/users/profile', authenticate, async (req, res) => {
  try {
    const { primary_color, theme, display_name, timezone, calendar_guid } = req.body;
    const db = await getDb();
    
    const updates = [];
    const values = [];
    
    if (primary_color !== undefined) {
      updates.push('primary_color = ?');
      values.push(primary_color);
    }
    if (theme !== undefined) {
      updates.push('theme = ?');
      values.push(theme);
    }
    if (display_name !== undefined) {
      updates.push('display_name = ?');
      values.push(display_name);
    }
    if (timezone !== undefined) {
      updates.push('timezone = ?');
      values.push(timezone);
    }
    if (calendar_guid !== undefined) {
      updates.push('calendar_guid = ?');
      values.push(calendar_guid === '' ? null : calendar_guid);
    }
    
    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }
    
    values.push(req.user.id);
    
    await db.run(
      `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
      values
    );
    
    res.json({ message: 'Profile updated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/users/reset-password', authenticate, async (req, res) => {
  try {
    const { userId, newPassword } = req.body;
    if (!newPassword || !newPassword.trim()) {
      return res.status(400).json({ error: 'New password cannot be empty' });
    }

    const user = await getUserById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (req.user.role_name !== 'Administrator' && req.user.id !== user.id) {
      return res.status(403).json({ error: 'Permission denied. Cannot reset other user\'s password.' });
    }

    const db = await getDb();
    const hashed = crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(newPassword, hashed, 1000, 64, 'sha512').toString('hex');
    const newHashedPassword = `${hashed}:${hash}`;

    await db.run("UPDATE users SET password = ? WHERE id = ?", [newHashedPassword, userId]);
    
    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/users', authenticate, requirePermission('users', 'read'), async (req, res) => {
  try {
    const users = await getAllUsers();
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/users', authenticate, requirePermission('users', 'full'), async (req, res) => {
  try {
    const { username, password, role_id, display_name } = req.body;
    if (!username || !password || !role_id) {
      return res.status(400).json({ error: 'Username, password, and role are required' });
    }
    const id = await createUser(username.trim(), password, role_id, display_name ? display_name.trim() : null);
    sendNotification('User Created', `A new user account was created: "${username}".`, 'User Managed');
    res.status(201).json({ id, message: 'User created successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/users/:id', authenticate, requirePermission('users', 'full'), async (req, res) => {
  try {
    const { username, password, role_id } = req.body;
    await updateUser(req.params.id, username, password, role_id);
    res.json({ message: 'User updated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/users/:id', authenticate, requirePermission('users', 'full'), async (req, res) => {
  try {
    await deleteUser(req.params.id);
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- ROLE MANAGEMENT ENDPOINTS ---

app.get('/api/roles', authenticate, requirePermission('roles', 'read'), async (req, res) => {
  try {
    const roles = await getAllRoles();
    res.json(roles);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/roles', authenticate, requirePermission('roles', 'full'), async (req, res) => {
  try {
    const { name, permissions } = req.body;
    if (!name || !permissions) {
      return res.status(400).json({ error: 'Role name and permissions are required' });
    }
    const id = await createRole(name, permissions);
    res.status(201).json({ id, message: 'Role created successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/roles/:id', authenticate, requirePermission('roles', 'full'), async (req, res) => {
  try {
    const { name, permissions } = req.body;
    await updateRole(req.params.id, name, permissions);
    res.json({ message: 'Role updated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/roles/:id', authenticate, requirePermission('roles', 'full'), async (req, res) => {
  try {
    await deleteRole(req.params.id);
    res.json({ message: 'Role deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- SETTINGS ENDPOINTS ---

app.get('/api/settings/public', async (req, res) => {
  try {
    const settings = await getSettings();
    res.json({
      app_name: settings.app_name || 'Base App',
      branding_icon: settings.branding_icon || '⚙️',
      branding_logo: settings.branding_logo || '',
      branding_logo_light: settings.branding_logo_light || '',
      branding_logo_dark: settings.branding_logo_dark || '',
      branding_favicon: settings.branding_favicon || ''
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/settings', authenticate, requirePermission('settings_general', 'read'), async (req, res) => {
  try {
    const settings = await getSettings();
    if (req.user.role_name !== 'Administrator') {
      delete settings.notify_smtp_pass;
      delete settings.oidc_client_secret;
      delete settings.notify_webhook_secret;
    }
    res.json(settings);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/settings', authenticate, requirePermission('settings_general', 'full'), async (req, res) => {
  try {
    const rawSettings = req.body;
    const settings = { ...rawSettings };
    
    if (settings.notify_smtp_pass === '••••••••' || settings.notify_smtp_pass === '') {
      delete settings.notify_smtp_pass;
    }
    if (settings.oidc_client_secret === '••••••••' || settings.oidc_client_secret === '') {
      delete settings.oidc_client_secret;
    }
    if (settings.notify_webhook_secret === '••••••••' || settings.notify_webhook_secret === '') {
      delete settings.notify_webhook_secret;
    }

    await saveSettings(settings);
    res.json({ message: 'Settings saved successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/settings/branding/logo/:type?', authenticate, requirePermission('settings_branding', 'full'), upload.single('logo'), async (req, res) => {
  try {
    const type = req.params.type || 'general';
    if (!['light', 'dark', 'general'].includes(type)) {
      return res.status(400).json({ error: 'Invalid logo type. Must be light or dark' });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'No logo file provided' });
    }
    
    const logoUrl = `/uploads/${req.file.filename}`;
    const settingKey = type === 'general' ? 'branding_logo' : `branding_logo_${type}`;
    await saveSettings({ [settingKey]: logoUrl });
    
    res.json({ 
      logoUrl, 
      branding_logo: settingKey === 'branding_logo' ? logoUrl : undefined,
      branding_logo_light: settingKey === 'branding_logo_light' ? logoUrl : undefined,
      branding_logo_dark: settingKey === 'branding_logo_dark' ? logoUrl : undefined,
      message: 'Logo uploaded successfully' 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/settings/branding/logo/:type?', authenticate, requirePermission('settings_branding', 'full'), async (req, res) => {
  try {
    const type = req.params.type || 'general';
    if (!['light', 'dark', 'general'].includes(type)) {
      return res.status(400).json({ error: 'Invalid logo type. Must be light or dark' });
    }
    const settings = await getSettings();
    const settingKey = type === 'general' ? 'branding_logo' : `branding_logo_${type}`;
    const logoPath = settings[settingKey];
    if (logoPath) {
      const fullPath = path.join(DATA_DIR, logoPath.replace(/^\//, ''));
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
      }
    }
    await saveSettings({ [settingKey]: '' });
    res.json({ message: 'Branding logo deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/settings/branding/favicon', authenticate, requirePermission('settings_branding', 'full'), upload.single('favicon'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No favicon file provided' });
    }
    
    const faviconUrl = `/uploads/${req.file.filename}`;
    await saveSettings({ branding_favicon: faviconUrl });
    
    res.json({ faviconUrl, message: 'Favicon uploaded successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/settings/branding/favicon', authenticate, requirePermission('settings_branding', 'full'), async (req, res) => {
  try {
    const settings = await getSettings();
    if (settings.branding_favicon) {
      const fullPath = path.join(DATA_DIR, settings.branding_favicon.replace(/^\//, ''));
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
      }
    }
    await saveSettings({ branding_favicon: '' });
    res.json({ message: 'Favicon deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/settings/api-key', authenticate, requirePermission('settings_general', 'read'), async (req, res) => {
  try {
    const settings = await getSettings();
    res.json({ api_key: settings.api_key || '' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/settings/api-key', authenticate, requirePermission('settings_general', 'full'), async (req, res) => {
  try {
    const newKey = crypto.randomBytes(32).toString('hex');
    await saveSettings({ api_key: newKey });
    res.json({ api_key: newKey, message: 'API key generated/rotated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- NOTIFICATIONS MANAGEMENT ENDPOINTS ---

app.post('/api/notifications/settings', authenticate, async (req, res) => {
  try {
    if (req.user.role_name !== 'Administrator') {
      return res.status(403).json({ error: 'Permission denied. Administrator access required.' });
    }
    const settings = req.body;
    if (settings.notify_smtp_pass === '••••••••') {
      delete settings.notify_smtp_pass;
    }
    await saveSettings(settings);
    res.json({ message: 'Notification settings updated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/notifications/active', authenticate, async (req, res) => {
  try {
    if (req.user.role_name !== 'Administrator') {
      return res.status(403).json({ error: 'Permission denied' });
    }
    const db = await getDb();
    const logs = await db.all('SELECT * FROM notification_logs ORDER BY created_at DESC LIMIT 100');
    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/notifications/clear', authenticate, async (req, res) => {
  try {
    if (req.user.role_name !== 'Administrator') {
      return res.status(403).json({ error: 'Permission denied' });
    }
    const db = await getDb();
    await db.run('DELETE FROM notification_logs');
    res.json({ message: 'Notification log cleared' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- GET NOTIFICATION SETTINGS ---
app.get('/api/notifications/settings', authenticate, async (req, res) => {
  if (req.user.role_name !== 'Administrator') {
    return res.status(403).json({ error: 'Permission denied: Administrator role required.' });
  }
  try {
    const settings = await getSettings();
    const keys = [
      'notify_smtp_host', 'notify_smtp_port', 'notify_smtp_secure', 'notify_smtp_user', 'notify_smtp_pass', 'notify_smtp_from', 'notify_smtp_to',
      'notify_discord_webhook_url',
      'notify_webhook_url', 'notify_webhook_secret',
      'notify_subscription_due_today', 'notify_bill_due_today',
      'fr_notify_smtp_enabled', 'fr_notify_smtp_to', 'fr_notify_discord_enabled', 'fr_notify_discord_webhook_url', 'fr_notify_webhook_enabled', 'fr_notify_webhook_url',
      'bug_notify_smtp_enabled', 'bug_notify_smtp_to', 'bug_notify_discord_enabled', 'bug_notify_discord_webhook_url', 'bug_notify_webhook_enabled', 'bug_notify_webhook_url'
    ];
    const notifyConfig = {};
    keys.forEach(k => {
      notifyConfig[k] = settings[k] !== undefined ? settings[k] : '';
    });
    if (notifyConfig.notify_smtp_pass) {
      notifyConfig.notify_smtp_pass = '••••••••';
    }
    res.json(notifyConfig);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- NOTIFICATION UTILITIES FOR BUGS & FEATURES ---
async function sendFeatureOrBugNotification(type, title, body, item, originUrl) {
  try {
    const settings = await getSettings();
    const appName = settings.app_name || 'Home Hub';
    const prefix = type === 'feature' ? 'fr_' : 'bug_';
    
    // SMTP Email
    if (settings[`${prefix}notify_smtp_enabled`] === 'true') {
      const toEmail = settings[`${prefix}notify_smtp_to`] || settings.notify_smtp_to;
      if (settings.notify_smtp_host && toEmail) {
        try {
          const isSecure = settings.notify_smtp_secure === 'true';
          const transporter = nodemailer.createTransport({
            host: settings.notify_smtp_host,
            port: parseInt(settings.notify_smtp_port, 10) || 587,
            secure: isSecure,
            auth: settings.notify_smtp_user ? {
              user: settings.notify_smtp_user,
              pass: settings.notify_smtp_pass || ''
            } : undefined
          });

          await transporter.sendMail({
            from: settings.notify_smtp_from || settings.notify_smtp_user || 'no-reply@homehub.local',
            to: toEmail,
            subject: `[${appName}] ${title}`,
            text: `Origin App: ${appName}\nLink: ${originUrl || 'N/A'}\n\n${body}\n\nDetails:\n${JSON.stringify(item, null, 2)}`
          });
          console.log(`SMTP ${type} email notification sent to ${toEmail}.`);
        } catch (err) {
          console.error(`SMTP ${type} email error:`, err.message);
        }
      }
    }

    // Discord Webhook
    if (settings[`${prefix}notify_discord_enabled`] === 'true') {
      const webhookUrl = settings[`${prefix}notify_discord_webhook_url`];
      if (webhookUrl) {
        try {
          let fields = [];
          if (type === 'bug') {
            fields = [
              { name: 'Severity', value: (item.severity || 'Medium').toUpperCase(), inline: true },
              { name: 'Status', value: (item.status || 'Open').toUpperCase(), inline: true },
              { name: 'Steps to Reproduce', value: item.steps_to_reproduce || 'N/A' }
            ];
          } else {
            fields = [
              { name: 'Status', value: (item.status || 'Pending').toUpperCase(), inline: true }
            ];
          }

          const fieldsCopy = [
            { name: 'Origin', value: appName, inline: true },
            ...fields
          ];
          if (originUrl) {
            fieldsCopy.push({ name: 'View Page', value: `[Click Here to View](${originUrl})` });
          }

          const embed = {
            title: title,
            description: body,
            color: type === 'bug' ? 16711680 : 65280, // red for bugs, green for features
            fields: fieldsCopy,
            timestamp: new Date().toISOString()
          };

          await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              embeds: [embed]
            })
          });
          console.log(`Discord ${type} webhook notification sent.`);
        } catch (err) {
          console.error(`Discord ${type} error:`, err.message);
        }
      }
    }

    // General Webhook
    if (settings[`${prefix}notify_webhook_enabled`] === 'true') {
      const webhookUrl = settings[`${prefix}notify_webhook_url`];
      if (webhookUrl) {
        try {
          let callbackUrl = '';
          if (originUrl) {
            try {
              const urlObj = new URL(originUrl);
              callbackUrl = `${urlObj.origin}/api/webhooks/incoming-status?api_key=${settings.api_key || ''}`;
            } catch (e) {}
          }

          const payload = JSON.stringify({
            event_type: type === 'feature' ? 'feature_request' : 'bug_report',
            app_name: appName,
            url: originUrl,
            title,
            body,
            item,
            timestamp: new Date().toISOString(),
            callback_url: callbackUrl || null
          });

          const headers = { 'Content-Type': 'application/json' };
          
          if (settings.notify_webhook_secret) {
            const signature = crypto
              .createHmac('sha256', settings.notify_webhook_secret)
              .update(payload)
              .digest('hex');
            headers['X-Signature'] = signature;
          }

          await fetch(webhookUrl, {
            method: 'POST',
            headers,
            body: payload
          });
          console.log(`General ${type} webhook notification sent.`);
        } catch (err) {
          console.error(`Webhook ${type} error:`, err.message);
        }
      }
    }

    // Insert into notification logs as well
    const db = await getDb();
    await db.run(
      'INSERT INTO notification_logs (title, body, event_type) VALUES (?, ?, ?)',
      [title, body, type === 'feature' ? 'feature_request' : 'bug_report']
    );
  } catch (error) {
    console.error('Notification dispatch failed:', error.message);
  }
}

// --- FEATURE REQUESTS ENDPOINTS ---
app.get('/api/features', authenticate, async (req, res) => {
  try {
    const db = await getDb();
    const features = await db.all(`
      SELECT f.*, u.username as creator_username, u.display_name as creator_display_name
      FROM feature_requests f
      LEFT JOIN users u ON f.user_id = u.id
      ORDER BY f.created_at DESC
    `);
    res.json(features);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/features', authenticate, async (req, res) => {
  try {
    const { title, description } = req.body;
    if (!title || !title.trim() || !description || !description.trim()) {
      return res.status(400).json({ error: 'Title and description are required' });
    }

    const db = await getDb();
    const result = await db.run(
      'INSERT INTO feature_requests (title, description, user_id) VALUES (?, ?, ?)',
      [title.trim(), description.trim(), req.user.id]
    );

    const newFeature = await db.get('SELECT * FROM feature_requests WHERE id = ?', [result.lastID]);
    
    // Construct base URL from referrer or host header
    const referer = req.headers.referer;
    let baseOrigin = '';
    if (referer) {
      try {
        const refUrl = new URL(referer);
        baseOrigin = refUrl.origin;
      } catch (e) {}
    }
    if (!baseOrigin) {
      baseOrigin = req.headers.origin || `${req.protocol}://${req.get('host')}`;
    }
    const linkUrl = `${baseOrigin}/#/features`;

    // Trigger notification
    const creatorName = req.user.display_name || req.user.username;
    await sendFeatureOrBugNotification(
      'feature',
      `New Feature Request: "${title.trim()}"`,
      `Submitted by ${creatorName}:\n\n${description.trim()}`,
      newFeature,
      linkUrl
    );

    res.status(201).json({ id: result.lastID, message: 'Feature request submitted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/features/:id', authenticate, async (req, res) => {
  try {
    if (req.user.role_name !== 'Administrator') {
      return res.status(403).json({ error: 'Permission denied. Administrator access required.' });
    }
    const { status } = req.body;
    const validStatuses = ['pending', 'under_review', 'planned', 'completed', 'rejected'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Valid status is required' });
    }

    const db = await getDb();
    await db.run('UPDATE feature_requests SET status = ? WHERE id = ?', [status, req.params.id]);
    res.json({ message: 'Feature request updated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/features/:id', authenticate, async (req, res) => {
  try {
    if (req.user.role_name !== 'Administrator') {
      return res.status(403).json({ error: 'Permission denied. Administrator access required.' });
    }
    const db = await getDb();
    await db.run('DELETE FROM feature_requests WHERE id = ?', [req.params.id]);
    res.json({ message: 'Feature request deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- BUG REPORTS ENDPOINTS ---
app.get('/api/bugs', authenticate, async (req, res) => {
  try {
    const db = await getDb();
    const bugs = await db.all(`
      SELECT b.*, u.username as creator_username, u.display_name as creator_display_name
      FROM bug_reports b
      LEFT JOIN users u ON b.user_id = u.id
      ORDER BY b.created_at DESC
    `);
    res.json(bugs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/bugs', authenticate, async (req, res) => {
  try {
    const { title, description, steps_to_reproduce, severity } = req.body;
    if (!title || !title.trim() || !description || !description.trim()) {
      return res.status(400).json({ error: 'Title and description are required' });
    }

    const validSeverities = ['low', 'medium', 'high', 'critical'];
    const finalSeverity = severity && validSeverities.includes(severity.toLowerCase()) ? severity.toLowerCase() : 'medium';

    const db = await getDb();
    const result = await db.run(
      'INSERT INTO bug_reports (title, description, steps_to_reproduce, severity, user_id) VALUES (?, ?, ?, ?, ?)',
      [title.trim(), description.trim(), steps_to_reproduce ? steps_to_reproduce.trim() : '', finalSeverity, req.user.id]
    );

    const newBug = await db.get('SELECT * FROM bug_reports WHERE id = ?', [result.lastID]);

    // Construct base URL from referrer or host header
    const referer = req.headers.referer;
    let baseOrigin = '';
    if (referer) {
      try {
        const refUrl = new URL(referer);
        baseOrigin = refUrl.origin;
      } catch (e) {}
    }
    if (!baseOrigin) {
      baseOrigin = req.headers.origin || `${req.protocol}://${req.get('host')}`;
    }
    const linkUrl = `${baseOrigin}/#/bugs`;

    // Trigger notification
    const creatorName = req.user.display_name || req.user.username;
    let notificationBody = `Submitted by ${creatorName}\nSeverity: ${finalSeverity.toUpperCase()}\n\nDescription:\n${description.trim()}`;
    if (steps_to_reproduce && steps_to_reproduce.trim()) {
      notificationBody += `\n\nSteps to Reproduce:\n${steps_to_reproduce.trim()}`;
    }

    await sendFeatureOrBugNotification(
      'bug',
      `New Bug Report: "${title.trim()}"`,
      notificationBody,
      newBug,
      linkUrl
    );

    res.status(201).json({ id: result.lastID, message: 'Bug report submitted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/bugs/:id', authenticate, async (req, res) => {
  try {
    if (req.user.role_name !== 'Administrator') {
      return res.status(403).json({ error: 'Permission denied. Administrator access required.' });
    }
    const { status, severity } = req.body;
    
    const db = await getDb();
    const updates = [];
    const values = [];

    if (status) {
      const validStatuses = ['open', 'in_progress', 'resolved', 'closed'];
      if (validStatuses.includes(status)) {
        updates.push('status = ?');
        values.push(status);
      }
    }

    if (severity) {
      const validSeverities = ['low', 'medium', 'high', 'critical'];
      if (validSeverities.includes(severity.toLowerCase())) {
        updates.push('severity = ?');
        values.push(severity.toLowerCase());
      }
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    values.push(req.params.id);
    await db.run(`UPDATE bug_reports SET ${updates.join(', ')} WHERE id = ?`, values);
    res.json({ message: 'Bug report updated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/bugs/:id', authenticate, async (req, res) => {
  try {
    if (req.user.role_name !== 'Administrator') {
      return res.status(403).json({ error: 'Permission denied. Administrator access required.' });
    }
    const db = await getDb();
    await db.run('DELETE FROM bug_reports WHERE id = ?', [req.params.id]);
    res.json({ message: 'Bug report deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- WEBHOOK CALLBACK FOR STATUS UPDATES FROM HOMELAB KANBAN ---
app.post('/api/webhooks/incoming-status', async (req, res) => {
  try {
    const apiKeyHeader = req.headers['x-api-key'];
    const apiKeyQuery = req.query.api_key;
    const apiKey = apiKeyHeader || apiKeyQuery;

    const db = await getDb();
    const settings = await getSettings();
    
    if (settings.api_key && settings.api_key !== apiKey) {
      return res.status(401).json({ error: 'Unauthorized: Invalid or missing API key' });
    }

    const { external_id, link_type, status } = req.body;
    const targetId = external_id || req.body.id;
    if (!targetId || !link_type || !status) {
      return res.status(400).json({ error: 'external_id/id, link_type, and status are required' });
    }

    if (link_type === 'bug') {
      let bugStatus = 'open';
      if (status === 'in_progress') bugStatus = 'in_progress';
      else if (status === 'testing') bugStatus = 'in_progress';
      else if (status === 'completed' || status === 'done') bugStatus = 'resolved';
      else if (status === 'failed') bugStatus = 'open';
      
      await db.run('UPDATE bug_reports SET status = ? WHERE id = ?', [bugStatus, targetId]);
      console.log(`[Callback] Updated local bug ${targetId} status to ${bugStatus}`);
    } else if (link_type === 'feature') {
      let featureStatus = 'pending';
      if (status === 'approved') featureStatus = 'approved';
      else if (status === 'in_progress') featureStatus = 'under_review';
      else if (status === 'testing') featureStatus = 'planned';
      else if (status === 'completed' || status === 'done') featureStatus = 'completed';
      else if (status === 'failed') featureStatus = 'pending';
      
      await db.run('UPDATE feature_requests SET status = ? WHERE id = ?', [featureStatus, targetId]);
      console.log(`[Callback] Updated local feature ${targetId} status to ${featureStatus}`);
    }

    res.json({ success: true, message: 'Status updated successfully' });
  } catch (error) {
    console.error('Webhook callback error:', error);
    res.status(500).json({ error: error.message });
  }
});

// --- OIDC SSO ENDPOINTS ---

app.get('/api/auth/oidc/config', async (req, res) => {
  try {
    const settings = await getSettings();
    res.json({
      oidc_enabled: settings.oidc_enabled === 'true',
      oidc_client_id: settings.oidc_client_id || '',
      oidc_discovery_url: settings.oidc_discovery_url || ''
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/auth/oidc/login', async (req, res) => {
  try {
    const settings = await getSettings();
    if (settings.oidc_enabled !== 'true') {
      return res.status(400).send('OIDC authentication is disabled.');
    }
    
    const rootUrl = `${req.protocol}://${req.get('host')}`;
    const redirectUri = encodeURIComponent(`${rootUrl}/api/auth/oidc/callback`);
    const state = crypto.randomBytes(16).toString('hex');
    
    const scope = encodeURIComponent('openid profile email');
    const authUrl = `https://login.microsoftonline.com/${settings.oidc_tenant_id}/oauth2/v2.0/authorize?client_id=${settings.oidc_client_id}&response_type=code&redirect_uri=${redirectUri}&response_mode=query&scope=${scope}&state=${state}`;
    
    res.redirect(authUrl);
  } catch (error) {
    res.status(500).send('OIDC login redirection failed: ' + error.message);
  }
});

app.get('/api/auth/oidc/callback', async (req, res) => {
  const code = req.query.code;
  if (!code) {
    return res.status(400).send('Authorization code missing from SSO callback');
  }

  try {
    const settings = await getSettings();
    const rootUrl = `${req.protocol}://${req.get('host')}`;
    const redirectUri = `${rootUrl}/api/auth/oidc/callback`;
    
    const tokenUrl = `https://login.microsoftonline.com/${settings.oidc_tenant_id}/oauth2/v2.0/token`;
    const tokenBody = new URLSearchParams({
      client_id: settings.oidc_client_id,
      scope: 'openid profile email',
      code: code,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
      client_secret: settings.oidc_client_secret
    });

    const tokenRes = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: tokenBody.toString()
    });

    if (!tokenRes.ok) {
      throw new Error(`Token endpoint responded with status ${tokenRes.status}: ${await tokenRes.text()}`);
    }

    const tokenData = await tokenRes.json();
    const idToken = tokenData.id_token;
    
    // Simple JWT parser for payload extraction
    const base64Url = idToken.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const idPayload = JSON.parse(Buffer.from(base64, 'base64').toString('utf8'));
    
    const email = idPayload.email || idPayload.preferred_username || idPayload.upn;
    if (!email) {
      return res.status(400).send('SSO login payload did not contain email/username identifier');
    }

    const db = await getDb();
    let user = await getUserByUsername(email);
    
    if (!user) {
      if (settings.oidc_auto_provision !== 'true') {
        return res.status(403).send('Auto-provisioning is disabled and no local account matches this email.');
      }
      
      const roleName = settings.oidc_default_role || 'Viewer';
      const role = await db.get('SELECT id FROM roles WHERE name = ?', [roleName]);
      const roleId = role ? role.id : null;
      
      const dummyPassword = crypto.randomBytes(32).toString('hex');
      const displayName = idPayload.name || email.split('@')[0];
      
      const userId = await createUser(email, dummyPassword, roleId, displayName, 'sso');
      user = await getUserById(userId);
    }

    const appToken = generateToken({ id: user.id, username: user.username });
    res.redirect(`/?token=${appToken}`);
  } catch (error) {
    console.error('SSO callback failed:', error);
    res.status(500).send('SSO authentication callback failed: ' + error.message);
  }
});

// --- MICROSOFT CALENDAR INTEGRATION ---

app.get('/api/auth/ms-calendar/list-login', authenticate, async (req, res) => {
  try {
    const settings = await getSettings();
    if (!settings.oidc_tenant_id || !settings.oidc_client_id) {
      return res.status(400).send('Microsoft 365 SSO settings are not configured. Please configure them in Settings > SSO.');
    }
    const rootUrl = `${req.protocol}://${req.get('host')}`;
    const redirectUri = encodeURIComponent(`${rootUrl}/api/auth/ms-calendar/callback`);
    
    // We send user ID encoded in the state parameter
    const state = Buffer.from(JSON.stringify({ userId: req.user.id, action: 'list_calendars' })).toString('base64');
    const scope = encodeURIComponent('offline_access https://graph.microsoft.com/Calendars.ReadWrite https://graph.microsoft.com/Tasks.ReadWrite');
    
    const authUrl = `https://login.microsoftonline.com/${settings.oidc_tenant_id}/oauth2/v2.0/authorize?client_id=${settings.oidc_client_id}&response_type=code&redirect_uri=${redirectUri}&response_mode=query&scope=${scope}&state=${state}`;
    
    res.redirect(authUrl);
  } catch (error) {
    res.status(500).send('Microsoft Calendar redirect failed: ' + error.message);
  }
});

app.get('/api/auth/ms-calendar/login', authenticate, async (req, res) => {
  try {
    const settings = await getSettings();
    if (!settings.oidc_tenant_id || !settings.oidc_client_id) {
      return res.status(400).send('Microsoft 365 SSO settings are not configured. Please configure them in Settings > SSO.');
    }
    const rootUrl = `${req.protocol}://${req.get('host')}`;
    const redirectUri = encodeURIComponent(`${rootUrl}/api/auth/ms-calendar/callback`);
    
    const state = Buffer.from(JSON.stringify({ userId: req.user.id, action: 'sync_menu' })).toString('base64');
    const scope = encodeURIComponent('offline_access https://graph.microsoft.com/Calendars.ReadWrite https://graph.microsoft.com/Tasks.ReadWrite');
    
    const authUrl = `https://login.microsoftonline.com/${settings.oidc_tenant_id}/oauth2/v2.0/authorize?client_id=${settings.oidc_client_id}&response_type=code&redirect_uri=${redirectUri}&response_mode=query&scope=${scope}&state=${state}`;
    
    res.redirect(authUrl);
  } catch (error) {
    res.status(500).send('Microsoft Calendar redirect failed: ' + error.message);
  }
});

app.get('/api/auth/ms-calendar/callback', async (req, res) => {
  const code = req.query.code;
  const stateStr = req.query.state;
  if (!code || !stateStr) {
    return res.status(400).send('Authorization code or state query param missing.');
  }

  try {
    const state = JSON.parse(Buffer.from(stateStr, 'base64').toString('utf8'));
    const { userId, action } = state;
    
    const settings = await getSettings();
    const rootUrl = `${req.protocol}://${req.get('host')}`;
    const redirectUri = `${rootUrl}/api/auth/ms-calendar/callback`;
    
    const tokenUrl = `https://login.microsoftonline.com/${settings.oidc_tenant_id}/oauth2/v2.0/token`;
    const tokenBody = new URLSearchParams({
      client_id: settings.oidc_client_id,
      scope: 'offline_access https://graph.microsoft.com/Calendars.ReadWrite https://graph.microsoft.com/Tasks.ReadWrite',
      code: code,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
      client_secret: settings.oidc_client_secret
    });

    const tokenRes = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: tokenBody.toString()
    });

    if (!tokenRes.ok) {
      throw new Error(`Token endpoint responded with status ${tokenRes.status}`);
    }

    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;
    const refreshToken = tokenData.refresh_token;
    const expiresAt = Date.now() + (tokenData.expires_in * 1000);

    const db = await getDb();
    await db.run(
      'UPDATE users SET m365_access_token = ?, m365_refresh_token = ?, m365_token_expires_at = ? WHERE id = ?',
      [accessToken, refreshToken || null, expiresAt, userId]
    );

    // If callback is for listing calendars
    if (action === 'list_calendars') {
      const graphRes = await fetch('https://graph.microsoft.com/v1.0/me/calendars?$select=id,name,canEdit', {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      if (graphRes.ok) {
        const calData = await graphRes.json();
        const writableCalendars = (calData.value || []).filter(c => c.canEdit);
        
        res.redirect(`/?calendars_list=success&calendars_data=${encodeURIComponent(JSON.stringify(writableCalendars))}`);
      } else {
        res.redirect(`/?calendars_list=error&details=graph_failed`);
      }
    } else {
      res.redirect(`/?calendar_sync=success`);
    }
  } catch (error) {
    console.error('MS Calendar callback error:', error);
    res.redirect(`/?calendar_sync=error&details=${encodeURIComponent(error.message)}`);
  }
});

app.get('/api/users/calendars', authenticate, async (req, res) => {
  try {
    const settings = await getSettings();
    if (!settings.oidc_tenant_id || !settings.oidc_client_id) {
      return res.status(400).json({ error: 'Microsoft 365 SSO settings are not configured. Please configure them in Settings > SSO.' });
    }

    const token = await getValidM365Token(req.user.id);
    if (!token) {
      return res.status(401).json({ needs_auth: true, login_type: 'ms-calendar' });
    }

    const graphRes = await fetch('https://graph.microsoft.com/v1.0/me/calendars?$select=id,name,canEdit', {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (graphRes.ok) {
      const data = await graphRes.json();
      const writable = (data.value || []).filter(c => c.canEdit);
      res.json({ calendars: writable });
    } else {
      const text = await graphRes.text();
      res.status(graphRes.status).json({ error: text });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/users/calendar-sync', authenticate, async (req, res) => {
  try {
    const { calendarId } = req.body;
    const db = await getDb();
    await db.run('UPDATE users SET calendar_guid = ? WHERE id = ?', [calendarId || null, req.user.id]);
    res.json({ message: 'Calendar sync configuration updated' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});



// --- TODO LISTS & TASKS API ---

app.get('/api/todo/all-tasks', authenticate, async (req, res) => {
  try {
    const db = await getDb();
    const tasks = await db.all(`
      SELECT t.*, l.name as list_name, l.list_type 
      FROM todo_tasks t
      JOIN todo_lists l ON t.list_id = l.id
      ORDER BY t.due_date ASC, t.id DESC
    `);
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/todo/assignees', authenticate, async (req, res) => {
  try {
    const db = await getDb();
    const users = await db.all("SELECT id, username, display_name FROM users ORDER BY username ASC");
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/todo/lists', authenticate, async (req, res) => {
  try {
    const db = await getDb();
    const lists = await db.all("SELECT * FROM todo_lists ORDER BY name ASC");
    res.json(lists);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/todo/lists', authenticate, async (req, res) => {
  try {
    const { name, description, list_type } = req.body;
    if (!name) return res.status(400).json({ error: 'List name is required' });
    const db = await getDb();
    const result = await db.run(
      "INSERT INTO todo_lists (name, description, list_type) VALUES (?, ?, ?)",
      [name, description || '', list_type || 'local']
    );
    res.status(201).json({ id: result.lastID, name, description, list_type: list_type || 'local' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/todo/lists/:id', authenticate, async (req, res) => {
  try {
    const db = await getDb();
    await db.run("DELETE FROM todo_lists WHERE id = ?", [req.params.id]);
    res.json({ message: 'List deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/todo/lists/:listId/tasks', authenticate, async (req, res) => {
  try {
    const db = await getDb();
    const tasks = await db.all(`
      SELECT t.*, u.display_name as assignee_name, u.username as assignee_username
      FROM todo_tasks t
      LEFT JOIN users u ON t.assigned_to = u.id
      WHERE t.list_id = ?
      ORDER BY t.status DESC, t.due_date ASC, t.id DESC
    `, [req.params.listId]);
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/todo/lists/:listId/tasks', authenticate, async (req, res) => {
  try {
    const { title, description, assigned_to, due_date } = req.body;
    const listId = req.params.listId;
    if (!title) return res.status(400).json({ error: 'Task title is required' });
    
    const db = await getDb();
    const list = await db.get("SELECT * FROM todo_lists WHERE id = ?", [listId]);
    if (!list) return res.status(404).json({ error: 'List not found' });
    
    // For M365 synced lists, auto assign to the authenticated user
    const assignedUser = list.list_type === 'm365' ? req.user.id : (assigned_to || null);
    
    const result = await db.run(
      "INSERT INTO todo_tasks (list_id, title, description, assigned_to, due_date) VALUES (?, ?, ?, ?, ?)",
      [listId, title, description || '', assignedUser, due_date || null]
    );
    res.status(201).json({ id: result.lastID, title, description, assigned_to: assignedUser, due_date });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/todo/tasks/:id', authenticate, async (req, res) => {
  try {
    const { title, description, assigned_to, status, due_date } = req.body;
    const db = await getDb();
    
    const task = await db.get("SELECT t.*, l.list_type FROM todo_tasks t JOIN todo_lists l ON t.list_id = l.id WHERE t.id = ?", [req.params.id]);
    if (!task) return res.status(404).json({ error: 'Task not found' });
    
    const assignedUser = task.list_type === 'm365' ? req.user.id : (assigned_to !== undefined ? assigned_to : task.assigned_to);
    
    await db.run(
      "UPDATE todo_tasks SET title = ?, description = ?, assigned_to = ?, status = ?, due_date = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      [
        title !== undefined ? title : task.title,
        description !== undefined ? description : task.description,
        assignedUser,
        status !== undefined ? status : task.status,
        due_date !== undefined ? due_date : task.due_date,
        req.params.id
      ]
    );
    res.json({ message: 'Task updated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/todo/tasks/:id', authenticate, async (req, res) => {
  try {
    const db = await getDb();
    const task = await db.get("SELECT t.*, l.list_type, l.m365_list_id FROM todo_tasks t JOIN todo_lists l ON t.list_id = l.id WHERE t.id = ?", [req.params.id]);
    if (!task) return res.status(404).json({ error: 'Task not found' });
    
    // Delete local task
    await db.run("DELETE FROM todo_tasks WHERE id = ?", [req.params.id]);
    
    // If it's a synced M365 task, delete it in Microsoft Graph too!
    if (task.list_type === 'm365' && task.m365_task_id) {
      const token = await getValidM365Token(req.user.id);
      if (token) {
        await fetch(`https://graph.microsoft.com/v1.0/me/todo/lists/${task.m365_list_id}/tasks/${task.m365_task_id}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        });
      }
    }
    
    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/todo/sync', authenticate, async (req, res) => {
  try {
    await syncTasksForUser(req.user.id);
    const db = await getDb();
    const user = await db.get("SELECT calendar_guid FROM users WHERE id = ?", [req.user.id]);
    if (user && user.calendar_guid) {
      await syncCalendarForUser(req.user.id);
    }
    res.json({ message: 'Synchronization triggered successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// --- CALENDAR EVENTS API ---

app.get('/api/calendar/events', authenticate, async (req, res) => {
  try {
    const db = await getDb();
    const events = await db.all("SELECT * FROM calendar_events ORDER BY start_time ASC");
    res.json(events);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/calendar/events', authenticate, async (req, res) => {
  try {
    const { title, description, start_time, end_time, location } = req.body;
    if (!title || !start_time || !end_time) {
      return res.status(400).json({ error: 'Title, start time, and end time are required' });
    }
    const db = await getDb();
    const result = await db.run(
      "INSERT INTO calendar_events (title, description, start_time, end_time, location) VALUES (?, ?, ?, ?, ?)",
      [title, description || '', start_time, end_time, location || '']
    );
    res.status(201).json({ id: result.lastID, title, description, start_time, end_time, location });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/calendar/events/:id', authenticate, async (req, res) => {
  try {
    const { title, description, start_time, end_time, location } = req.body;
    const db = await getDb();
    const event = await db.get("SELECT * FROM calendar_events WHERE id = ?", [req.params.id]);
    if (!event) return res.status(404).json({ error: 'Event not found' });
    
    await db.run(
      "UPDATE calendar_events SET title = ?, description = ?, start_time = ?, end_time = ?, location = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      [
        title !== undefined ? title : event.title,
        description !== undefined ? description : event.description,
        start_time !== undefined ? start_time : event.start_time,
        end_time !== undefined ? end_time : event.end_time,
        location !== undefined ? location : event.location,
        req.params.id
      ]
    );
    res.json({ message: 'Event updated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/calendar/events/:id', authenticate, async (req, res) => {
  try {
    const db = await getDb();
    const event = await db.get("SELECT * FROM calendar_events WHERE id = ?", [req.params.id]);
    if (!event) return res.status(404).json({ error: 'Event not found' });
    
    await db.run("DELETE FROM calendar_events WHERE id = ?", [req.params.id]);
    
    if (event.m365_event_id) {
      const token = await getValidM365Token(req.user.id);
      if (token) {
        await fetch(`https://graph.microsoft.com/v1.0/me/events/${event.m365_event_id}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        });
      }
    }
    
    res.json({ message: 'Event deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// --- SUBSCRIPTIONS API ---

app.get('/api/subscriptions', authenticate, async (req, res) => {
  try {
    const db = await getDb();
    const subs = await db.all("SELECT * FROM subscriptions ORDER BY next_billing_date ASC");
    const userTz = req.user?.timezone || 'America/New_York';
    const todayStr = getTzTodayStr(userTz);

    // Auto-update past active subscriptions
    for (let sub of subs) {
      if (sub.next_billing_date < todayStr && sub.active === 1) {
        let newDate = sub.next_billing_date;
        while (newDate < todayStr) {
          newDate = getNextBillingDate(newDate, sub.billing_cycle);
        }
        await db.run("UPDATE subscriptions SET next_billing_date = ? WHERE id = ?", [newDate, sub.id]);
        sub.next_billing_date = newDate;
      }
    }

    const mappedSubs = subs.map(sub => ({
      ...sub,
      due_in_days: getDaysRemaining(sub.next_billing_date, userTz)
    }));
    res.json(mappedSubs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/subscriptions', authenticate, async (req, res) => {
  try {
    const { name, amount, billing_cycle, next_billing_date, category, active, payment_method } = req.body;
    if (!name || amount === undefined || !next_billing_date) {
      return res.status(400).json({ error: 'Name, amount, and next billing date are required' });
    }
    const db = await getDb();
    const result = await db.run(
      "INSERT INTO subscriptions (name, amount, billing_cycle, next_billing_date, category, active, payment_method) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [name, amount, billing_cycle || 'monthly', next_billing_date, category || 'Entertainment', active !== undefined ? active : 1, payment_method || '']
    );
    res.status(201).json({ id: result.lastID, name, amount, billing_cycle, next_billing_date, category, active, payment_method });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/subscriptions/:id', authenticate, async (req, res) => {
  try {
    const { name, amount, billing_cycle, next_billing_date, category, active, payment_method } = req.body;
    const db = await getDb();
    const sub = await db.get("SELECT * FROM subscriptions WHERE id = ?", [req.params.id]);
    if (!sub) return res.status(404).json({ error: 'Subscription not found' });
    
    await db.run(
      "UPDATE subscriptions SET name = ?, amount = ?, billing_cycle = ?, next_billing_date = ?, category = ?, active = ?, payment_method = ? WHERE id = ?",
      [
        name !== undefined ? name : sub.name,
        amount !== undefined ? amount : sub.amount,
        billing_cycle !== undefined ? billing_cycle : sub.billing_cycle,
        next_billing_date !== undefined ? next_billing_date : sub.next_billing_date,
        category !== undefined ? category : sub.category,
        active !== undefined ? active : sub.active,
        payment_method !== undefined ? payment_method : sub.payment_method,
        req.params.id
      ]
    );
    res.json({ message: 'Subscription updated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/subscriptions/:id', authenticate, async (req, res) => {
  try {
    const db = await getDb();
    await db.run("DELETE FROM subscriptions WHERE id = ?", [req.params.id]);
    res.json({ message: 'Subscription deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// --- RECURRING BILLS API ---

app.get('/api/bills', authenticate, async (req, res) => {
  try {
    const db = await getDb();
    const bills = await db.all("SELECT * FROM recurring_bills ORDER BY next_billing_date ASC");
    const userTz = req.user?.timezone || 'America/New_York';
    const todayStr = getTzTodayStr(userTz);

    // Auto-update past active recurring bills
    for (let bill of bills) {
      if (bill.next_billing_date < todayStr && bill.active === 1) {
        let newDate = bill.next_billing_date;
        while (newDate < todayStr) {
          newDate = getNextBillingDate(newDate, bill.billing_cycle);
        }
        await db.run("UPDATE recurring_bills SET next_billing_date = ? WHERE id = ?", [newDate, bill.id]);
        bill.next_billing_date = newDate;
      }
    }

    const mappedBills = bills.map(bill => ({
      ...bill,
      due_in_days: getDaysRemaining(bill.next_billing_date, userTz)
    }));
    res.json(mappedBills);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/bills', authenticate, async (req, res) => {
  try {
    const { name, amount, billing_cycle, next_billing_date, tag, active, payment_method } = req.body;
    if (!name || amount === undefined || !next_billing_date) {
      return res.status(400).json({ error: 'Name, amount, and next billing date are required' });
    }
    const db = await getDb();
    
    // Auto-save the custom tag in bill_tags if provided
    if (tag && tag.trim()) {
      await db.run("INSERT OR IGNORE INTO bill_tags (name) VALUES (?)", [tag.trim()]);
    }

    const result = await db.run(
      "INSERT INTO recurring_bills (name, amount, billing_cycle, next_billing_date, tag, active, payment_method) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [name, amount, billing_cycle || 'monthly', next_billing_date, tag || '', active !== undefined ? active : 1, payment_method || '']
    );
    res.status(201).json({ id: result.lastID, name, amount, billing_cycle, next_billing_date, tag, active, payment_method });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/bills/:id', authenticate, async (req, res) => {
  try {
    const { name, amount, billing_cycle, next_billing_date, tag, active, payment_method } = req.body;
    const db = await getDb();
    const bill = await db.get("SELECT * FROM recurring_bills WHERE id = ?", [req.params.id]);
    if (!bill) return res.status(404).json({ error: 'Recurring bill not found' });
    
    // Auto-save the custom tag in bill_tags if updated
    if (tag && tag.trim()) {
      await db.run("INSERT OR IGNORE INTO bill_tags (name) VALUES (?)", [tag.trim()]);
    }

    await db.run(
      "UPDATE recurring_bills SET name = ?, amount = ?, billing_cycle = ?, next_billing_date = ?, tag = ?, active = ?, payment_method = ? WHERE id = ?",
      [
        name !== undefined ? name : bill.name,
        amount !== undefined ? amount : bill.amount,
        billing_cycle !== undefined ? billing_cycle : bill.billing_cycle,
        next_billing_date !== undefined ? next_billing_date : bill.next_billing_date,
        tag !== undefined ? tag : bill.tag,
        active !== undefined ? active : bill.active,
        payment_method !== undefined ? payment_method : bill.payment_method,
        req.params.id
      ]
    );
    res.json({ message: 'Recurring bill updated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/bills/:id', authenticate, async (req, res) => {
  try {
    const db = await getDb();
    await db.run("DELETE FROM recurring_bills WHERE id = ?", [req.params.id]);
    res.json({ message: 'Recurring bill deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/bills/tags', authenticate, async (req, res) => {
  try {
    const db = await getDb();
    const tags = await db.all("SELECT name FROM bill_tags ORDER BY name ASC");
    res.json(tags.map(t => t.name));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// --- M365 BACKGROUND SYNC IMPLEMENTATION ---

async function syncTasksForUser(userId) {
  const token = await getValidM365Token(userId);
  if (!token) return;

  const db = await getDb();

  try {
    const listRes = await fetch('https://graph.microsoft.com/v1.0/me/todo/lists', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!listRes.ok) {
      console.error(`Failed to fetch todo lists from MS Graph for user ${userId}:`, await listRes.text());
      return;
    }
    const listData = await listRes.json();
    const msLists = listData.value || [];

    for (const ml of msLists) {
      let localList = await db.get("SELECT * FROM todo_lists WHERE m365_list_id = ?", [ml.id]);
      if (!localList) {
        const res = await db.run(
          "INSERT INTO todo_lists (name, description, list_type, m365_list_id) VALUES (?, ?, 'm365', ?)",
          [ml.displayName, 'Synced from Microsoft To-Do', ml.id]
        );
        localList = { id: res.lastID, name: ml.displayName, m365_list_id: ml.id, list_type: 'm365' };
      } else if (localList.name !== ml.displayName) {
        await db.run("UPDATE todo_lists SET name = ? WHERE id = ?", [ml.displayName, localList.id]);
      }

      const taskRes = await fetch(`https://graph.microsoft.com/v1.0/me/todo/lists/${ml.id}/tasks`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!taskRes.ok) continue;
      const taskData = await taskRes.json();
      const msTasks = taskData.value || [];

      for (const mt of msTasks) {
        let localTask = await db.get("SELECT * FROM todo_tasks WHERE m365_task_id = ?", [mt.id]);
        const isCompleted = mt.status === 'completed' ? 'completed' : 'pending';
        
        let dueDate = null;
        if (mt.dueDateTime && mt.dueDateTime.dateTime) {
          dueDate = mt.dueDateTime.dateTime.split('T')[0];
        }

        const bodyContent = mt.body?.content || '';

        if (!localTask) {
          await db.run(
            "INSERT INTO todo_tasks (list_id, title, description, assigned_to, status, due_date, m365_task_id) VALUES (?, ?, ?, ?, ?, ?, ?)",
            [localList.id, mt.title, bodyContent, userId, isCompleted, dueDate, mt.id]
          );
        } else {
          if (localTask.status !== isCompleted || localTask.due_date !== dueDate || localTask.title !== mt.title || localTask.description !== bodyContent) {
            await db.run(
              "UPDATE todo_tasks SET status = ?, due_date = ?, title = ?, description = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
              [isCompleted, dueDate, mt.title, bodyContent, localTask.id]
            );
          }
        }
      }
    }

    const unsyncedTasks = await db.all(`
      SELECT t.*, l.m365_list_id 
      FROM todo_tasks t
      JOIN todo_lists l ON t.list_id = l.id
      WHERE l.list_type = 'm365' AND t.m365_task_id IS NULL
    `);

    for (const ut of unsyncedTasks) {
      if (!ut.m365_list_id) continue;

      const body = {
        title: ut.title,
        body: {
          contentType: "text",
          content: ut.description || ""
        }
      };

      if (ut.due_date) {
        body.dueDateTime = {
          dateTime: ut.due_date + "T12:00:00",
          timeZone: "UTC"
        };
      }

      const res = await fetch(`https://graph.microsoft.com/v1.0/me/todo/lists/${ut.m365_list_id}/tasks`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });

      if (res.ok) {
        const data = await res.json();
        await db.run("UPDATE todo_tasks SET m365_task_id = ? WHERE id = ?", [data.id, ut.id]);
      }
    }

    const updatedTasks = await db.all(`
      SELECT t.*, l.m365_list_id 
      FROM todo_tasks t
      JOIN todo_lists l ON t.list_id = l.id
      WHERE l.list_type = 'm365' AND t.m365_task_id IS NOT NULL AND t.updated_at > t.created_at
    `);

    for (const ut of updatedTasks) {
      const statusStr = ut.status === 'completed' ? 'completed' : 'notStarted';
      const body = {
        status: statusStr,
        title: ut.title,
        body: {
          contentType: "text",
          content: ut.description || ""
        }
      };

      if (ut.due_date) {
        body.dueDateTime = {
          dateTime: ut.due_date + "T12:00:00",
          timeZone: "UTC"
        };
      }

      await fetch(`https://graph.microsoft.com/v1.0/me/todo/lists/${ut.m365_list_id}/tasks/${ut.m365_task_id}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });
    }

  } catch (err) {
    console.error("Error in syncTasksForUser:", err);
  }
}

async function syncCalendarForUser(userId) {
  const user = await getUserById(userId);
  if (!user || !user.calendar_guid) return;

  const token = await getValidM365Token(userId);
  if (!token) return;

  const db = await getDb();

  try {
    const userTz = normalizeTimezone(user.timezone);
    const calRes = await fetch(`https://graph.microsoft.com/v1.0/me/calendars/${user.calendar_guid}/events?$top=100`, {
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Prefer': `outlook.timezone="${userTz}"`
      }
    });

    if (!calRes.ok) {
      console.error(`Failed to fetch events from MS Graph calendar ${user.calendar_guid}:`, await calRes.text());
      return;
    }

    const calData = await calRes.json();
    const msEvents = calData.value || [];

    for (const me of msEvents) {
      let localEvent = await db.get("SELECT * FROM calendar_events WHERE m365_event_id = ?", [me.id]);
      
      const title = me.subject || 'No Title';
      const description = me.body?.content || '';
      const start = formatToMinutes(me.start?.dateTime);
      const end = formatToMinutes(me.end?.dateTime);
      const location = me.location?.displayName || '';

      if (!localEvent) {
        await db.run(
          "INSERT INTO calendar_events (title, description, start_time, end_time, location, m365_event_id) VALUES (?, ?, ?, ?, ?, ?)",
          [title, description, start, end, location, me.id]
        );
      } else {
        if (localEvent.title !== title || localEvent.description !== description || formatToMinutes(localEvent.start_time) !== start || formatToMinutes(localEvent.end_time) !== end || localEvent.location !== location) {
          await db.run(
            "UPDATE calendar_events SET title = ?, description = ?, start_time = ?, end_time = ?, location = ?, updated_at = created_at WHERE id = ?",
            [title, description, start, end, location, localEvent.id]
          );
        }
      }
    }

    const unsyncedEvents = await db.all("SELECT * FROM calendar_events WHERE m365_event_id IS NULL");
    
    for (const ue of unsyncedEvents) {
      const body = {
        subject: ue.title,
        body: {
          contentType: "html",
          content: ue.description || ""
        },
        start: {
          dateTime: ue.start_time.includes('T') ? ue.start_time : ue.start_time + "T09:00:00",
          timeZone: normalizeTimezone(user.timezone)
        },
        end: {
          dateTime: ue.end_time.includes('T') ? ue.end_time : ue.end_time + "T10:00:00",
          timeZone: normalizeTimezone(user.timezone)
        },
        location: {
          displayName: ue.location || ""
        }
      };

      const res = await fetch(`https://graph.microsoft.com/v1.0/me/calendars/${user.calendar_guid}/events`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });

      if (res.ok) {
        const data = await res.json();
        await db.run("UPDATE calendar_events SET m365_event_id = ? WHERE id = ?", [data.id, ue.id]);
      }
    }

    const updatedEvents = await db.all("SELECT * FROM calendar_events WHERE m365_event_id IS NOT NULL AND updated_at > created_at");
    
    for (const ue of updatedEvents) {
      const body = {
        subject: ue.title,
        body: {
          contentType: "html",
          content: ue.description || ""
        },
        start: {
          dateTime: ue.start_time.includes('T') ? ue.start_time : ue.start_time + "T09:00:00",
          timeZone: normalizeTimezone(user.timezone)
        },
        end: {
          dateTime: ue.end_time.includes('T') ? ue.end_time : ue.end_time + "T10:00:00",
          timeZone: normalizeTimezone(user.timezone)
        },
        location: {
          displayName: ue.location || ""
        }
      };

      const patchRes = await fetch(`https://graph.microsoft.com/v1.0/me/events/${ue.m365_event_id}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });

      if (patchRes.ok) {
        await db.run("UPDATE calendar_events SET updated_at = created_at WHERE id = ?", [ue.id]);
      } else {
        console.error(`Failed to patch event ${ue.id} to MS Graph:`, await patchRes.text());
      }
    }

  } catch (err) {
    console.error("Error in syncCalendarForUser:", err);
  }
}

async function checkDueTodayNotifications() {
  try {
    const db = await getDb();
    const userTz = 'America/New_York';
    const todayStr = getTzTodayStr(userTz);
    
    // 1. Check Subscriptions
    const activeSubs = await db.all("SELECT * FROM subscriptions WHERE active = 1 AND next_billing_date = ?", [todayStr]);
    for (const sub of activeSubs) {
      const title = `Subscription Due: ${sub.name}`;
      const alreadySent = await db.get(
        "SELECT id FROM notification_logs WHERE event_type = 'Subscription Due Today' AND title = ? AND created_at > datetime('now', '-24 hours')",
        [title]
      );
      if (!alreadySent) {
        await sendNotification(
          title,
          `Your subscription "${sub.name}" for $${sub.amount} is due today (${todayStr}).`,
          'Subscription Due Today'
        );
      }
    }

    // 2. Check Recurring Bills
    const activeBills = await db.all("SELECT * FROM recurring_bills WHERE active = 1 AND next_billing_date = ?", [todayStr]);
    for (const bill of activeBills) {
      const title = `Bill Due: ${bill.name}`;
      const alreadySent = await db.get(
        "SELECT id FROM notification_logs WHERE event_type = 'Bill Due Today' AND title = ? AND created_at > datetime('now', '-24 hours')",
        [title]
      );
      if (!alreadySent) {
        await sendNotification(
          title,
          `Your bill "${bill.name}" for $${bill.amount} is due today (${todayStr}).`,
          'Bill Due Today'
        );
      }
    }
  } catch (err) {
    console.error("Error checking due today notifications:", err);
  }
}

async function syncAllUsersM365() {
  try {
    const db = await getDb();
    
    // Run due today notifications check
    await checkDueTodayNotifications();
    
    const users = await db.all("SELECT id, username, calendar_guid FROM users WHERE m365_access_token IS NOT NULL");
    for (const u of users) {
      console.log(`Running background M365 sync for user: ${u.username}`);
      await syncTasksForUser(u.id);
      if (u.calendar_guid) {
        await syncCalendarForUser(u.id);
      }
    }
  } catch (err) {
    console.error("Scheduled background sync failed:", err);
  }
}

// Run background sync every 1 hour (3,600,000 ms)
setInterval(syncAllUsersM365, 3600000);


// Serve frontend build static files (production ready)
const FRONTEND_BUILD_DIR = fs.existsSync(path.join(__dirname, '../frontend/dist'))
  ? path.join(__dirname, '../frontend/dist')
  : path.join(process.cwd(), './public');

if (fs.existsSync(FRONTEND_BUILD_DIR)) {
  app.use(express.static(FRONTEND_BUILD_DIR));
}

// Fallback to index.html for React SPA Routing
app.get('*', (req, res, next) => {
  const isApiRequest = req.path.startsWith('/api') || req.path.startsWith('/uploads');
  if (isApiRequest) {
    return next();
  }
  const indexPath = path.join(FRONTEND_BUILD_DIR, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).send(`Vite build folder is missing. Expected index.html in "${FRONTEND_BUILD_DIR}".`);
  }
});

// Start Express Server
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server started on http://localhost:${PORT}`);
  checkDueTodayNotifications().catch(console.error);
});
