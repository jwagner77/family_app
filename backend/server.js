import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import csv from 'csv-parser';
import { fileURLToPath } from 'url';
import PizZip from 'pizzip';
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
  verifyPassword,
  getShoppingListsForUser,
  createShoppingList,
  renameShoppingList,
  deleteShoppingList,
  getShoppingListDetails,
  addRecipeToShoppingList,
  removeRecipeFromShoppingList,
  addCustomShoppingListItem,
  updateShoppingListItem,
  deleteShoppingListItem,
  shareShoppingList,
  removeShoppingListShare,
  clearShoppingListItems,
  getAllRecipes,
  getRecipeById,
  createRecipe,
  updateRecipe,
  deleteRecipe,
  toggleRecipeFavorite,
  getWeeklyMenu,
  saveCustomMeal,
  saveReusableTags,
  getCustomMeals,
  getAllProjects,
  getProjectById,
  createProject,
  updateProject,
  deleteProject,
  getAllTasks,
  getTaskById,
  createTask,
  updateTask,
  deleteTask,
  completeTask,
  startTimeLog,
  stopTimeLog,
  getActiveTimeLog,
  getTimeLogsForTask,
  createFocusSession,
  getFocusSessionsForUser,
  checkAndResetStreak,
  updateUserStreak,
  getReusableTags,
  clearWeeklyMenu,
  addWeeklyMenuEntry,
  updateWeeklyMenuEntry,
  deleteWeeklyMenuEntry,
  updateWeeklyMenu,
  getAllTemplates,
  getTemplateById,
  getDefaultTemplate,
  addTemplate,
  setDefaultTemplate,
  deleteTemplate,
  getAllLeftovers,
  createLeftover,
  deleteLeftover,
  getRecentRecipes,
  getAllInventory,
  getInventoryItemById,
  createInventoryItem,
  updateInventoryItem,
  deleteInventoryItem,
  deleteInventoryItemsBulk,
  updateInventoryItemsBulk,
  getAllBooks,
  getBookById,
  createBook,
  updateBook,
  deleteBook,
  bulkDeleteBooks,
  bulkArchiveBooks,
  bulkTagBooks,
  getRecentBooks,
  getReadingListForUser,
  addBookToReadingList,
  removeBookFromReadingList,
  getRandomRecommendation,
  getReadingLogsForUser,
  getBooksLogSummaryForUser,
  createReadingLogEntry,
  deleteReadingLogEntry,
  getReadingListsForUser,
  getReadingListById,
  createReadingList,
  updateReadingList,
  deleteReadingList,
  getReadingListItems,
  getSharedReadingList,
  addBookComment,
  getBookComments,
  deleteBookComment,
  addBookRecommendation,
  getRecommendationsForUser,
  deleteRecommendation
} from './db.js';

import { parseRecipeImage, parseIngredientLine } from './ocr.js';
import { initDefaultTemplate, renderRecipeDocx } from './templates.js';


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
          calendar_sync_mappings: user.calendar_sync_mappings ? JSON.parse(user.calendar_sync_mappings) : {},
          timezone: user.timezone || 'US/New_York',
          birthday: user.birthday || '',
          phone: user.phone || '',
          email: user.email || '',
          picture_url: user.picture_url || '',
          navbar_bg: user.navbar_bg || '',
          navbar_opacity: user.navbar_opacity !== null && user.navbar_opacity !== undefined ? user.navbar_opacity : 0.75,
          app_bg: user.app_bg || '',
          theme_info_cards: user.theme_info_cards !== null && user.theme_info_cards !== undefined ? user.theme_info_cards : 0,
          text_color: user.text_color || 'white',
          dynamic_text_color: user.dynamic_text_color !== null && user.dynamic_text_color !== undefined ? user.dynamic_text_color : 0,
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
      calendar_sync_mappings: user.calendar_sync_mappings ? JSON.parse(user.calendar_sync_mappings) : {},
      timezone: user.timezone || 'US/New_York',
      birthday: user.birthday || '',
      phone: user.phone || '',
      email: user.email || '',
      picture_url: user.picture_url || '',
      navbar_bg: user.navbar_bg || '',
      navbar_opacity: user.navbar_opacity !== null && user.navbar_opacity !== undefined ? user.navbar_opacity : 0.75,
      app_bg: user.app_bg || '',
      theme_info_cards: user.theme_info_cards !== null && user.theme_info_cards !== undefined ? user.theme_info_cards : 0,
      text_color: user.text_color || 'white',
      dynamic_text_color: user.dynamic_text_color !== null && user.dynamic_text_color !== undefined ? user.dynamic_text_color : 0,
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
    const appName = settings.app_name || 'Home Hub';

    // Map setting toggles
    const toggleMapping = {
      'System Alert': 'notify_system_alert',
      'User Managed': 'notify_user_managed',
      'Subscription Due Today': 'notify_subscription_due_today',
      'Bill Due Today': 'notify_bill_due_today',
      'Recipe Added': 'notify_recipe_added',
      'Recipe Deleted': 'notify_recipe_deleted',
      'Meal Plan Updated': 'notify_meal_plan_updated',
      'Meal Added to Leftovers': 'notify_leftovers_added',
      'Leftovers Expiring': 'notify_leftovers_expiring',
      'Inventory Item Expiring': 'notify_inventory_expiring',
      'Book Added': 'notify_book_added',
      'Book Deleted': 'notify_book_deleted',
      'Log Entry Added': 'notify_log_added',
      'Book Started': 'notify_book_started',
      'Book Completed': 'notify_book_completed'
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
          subject: `[${appName}] ${title}`,
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
            content: `**[${appName}] ${title}**\n${body}`
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

async function checkExpiringItems() {
  try {
    const db = await getDb();
    const settings = await getSettings();

    // 1. Process Expiring Leftovers
    if (settings.notify_leftovers_expiring === 'true') {
      const daysThreshold = parseInt(settings.notify_leftovers_expiry_days, 10) || 2;
      
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + daysThreshold);
      const targetDateStr = targetDate.toISOString().split('T')[0];
      const todayStr = new Date().toISOString().split('T')[0];

      const expiringLeftovers = await db.all(
        'SELECT * FROM leftovers WHERE expiration_date <= ? AND expiration_date >= ?',
        [targetDateStr, todayStr]
      );

      for (const leftover of expiringLeftovers) {
        const logCheck = await db.get(
          "SELECT COUNT(*) as cnt FROM notification_logs WHERE event_type = 'Leftovers Expiring' AND body LIKE ? AND datetime(created_at) > datetime('now', '-1 day')",
          [`%"${leftover.name}"%`]
        );

        if (logCheck.cnt === 0) {
          const diffTime = new Date(leftover.expiration_date) - new Date(todayStr);
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          const daysText = diffDays === 0 ? 'today' : `in ${diffDays} day(s)`;
          
          await sendNotification(
            'Leftovers Expiring',
            `The leftover "${leftover.name}" is expiring ${daysText} (expiration date: ${leftover.expiration_date}).`,
            'Leftovers Expiring'
          );
        }
      }
    }

    // 2. Process Expiring Inventory Items
    if (settings.notify_inventory_expiring === 'true') {
      const daysThreshold = parseInt(settings.notify_inventory_expiry_days, 10) || 3;
      
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + daysThreshold);
      const targetDateStr = targetDate.toISOString().split('T')[0];
      const todayStr = new Date().toISOString().split('T')[0];

      const expiringInventory = await db.all(
        'SELECT * FROM inventory WHERE expiration_date <= ? AND expiration_date >= ?',
        [targetDateStr, todayStr]
      );

      for (const item of expiringInventory) {
        const logCheck = await db.get(
          "SELECT COUNT(*) as cnt FROM notification_logs WHERE event_type = 'Inventory Item Expiring' AND body LIKE ? AND datetime(created_at) > datetime('now', '-1 day')",
          [`%"${item.title}"%`]
        );

        if (logCheck.cnt === 0) {
          const diffTime = new Date(item.expiration_date) - new Date(todayStr);
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          const daysText = diffDays === 0 ? 'today' : `in ${diffDays} day(s)`;

          await sendNotification(
            'Inventory Item Expiring',
            `The inventory item "${item.title}" is expiring ${daysText} (expiration date: ${item.expiration_date}).`,
            'Inventory Item Expiring'
          );
        }
      }
    }

  } catch (error) {
    console.error('Error checking expiring items:', error.message);
  }
}


// Enable CORS and JSON body parser
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Set up storage folders
const DATA_DIR = process.env.DATA_DIR || './data';
const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');
const TEMPLATES_DIR = path.join(DATA_DIR, 'templates');

if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
if (!fs.existsSync(TEMPLATES_DIR)) fs.mkdirSync(TEMPLATES_DIR, { recursive: true });

// Expose uploaded files static directories
app.use('/uploads', express.static(UPLOADS_DIR));

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (file.fieldname === 'template') {
      cb(null, TEMPLATES_DIR);
    } else {
      cb(null, UPLOADS_DIR);
    }
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
        calendar_sync_mappings: user.calendar_sync_mappings ? JSON.parse(user.calendar_sync_mappings) : {},
        timezone: user.timezone || 'US/New_York',
        birthday: user.birthday || '',
        phone: user.phone || '',
        email: user.email || '',
        picture_url: user.picture_url || '',
        navbar_bg: user.navbar_bg || '',
        navbar_opacity: user.navbar_opacity !== null && user.navbar_opacity !== undefined ? user.navbar_opacity : 0.75,
        app_bg: user.app_bg || '',
        theme_info_cards: user.theme_info_cards || 0,
        text_color: user.text_color || 'white',
        dynamic_text_color: user.dynamic_text_color || 0,
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

async function syncUserAsContact(user) {
  const db = await getDb();
  const contact = await db.get('SELECT id FROM contacts WHERE user_id = ?', [user.id]);
  if (!contact) {
    await db.run(
      'INSERT INTO contacts (name, email, phone, birthday, user_id, relationship) VALUES (?, ?, ?, ?, ?, ?)',
      [user.display_name || user.username, user.email || user.username, user.phone || null, user.birthday || null, user.id, 'Family']
    );
  } else {
    await db.run(
      'UPDATE contacts SET name = ?, email = ?, phone = ?, birthday = ? WHERE user_id = ?',
      [user.display_name || user.username, user.email || user.username, user.phone || null, user.birthday || null, user.id]
    );
  }
}

app.post('/api/users/profile', authenticate, async (req, res) => {
  try {
    const { primary_color, theme, display_name, timezone, calendar_guid, calendar_sync_mappings, birthday, phone, email, picture_url, navbar_bg, navbar_opacity, app_bg, theme_info_cards, text_color, dynamic_text_color } = req.body;
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
    if (calendar_sync_mappings !== undefined) {
      updates.push('calendar_sync_mappings = ?');
      values.push(typeof calendar_sync_mappings === 'string' ? calendar_sync_mappings : JSON.stringify(calendar_sync_mappings));
    }
    if (birthday !== undefined) {
      updates.push('birthday = ?');
      values.push(birthday === '' ? null : birthday);
    }
    if (phone !== undefined) {
      updates.push('phone = ?');
      values.push(phone === '' ? null : phone);
    }
    if (email !== undefined) {
      updates.push('email = ?');
      values.push(email === '' ? null : email);
    }
    if (picture_url !== undefined) {
      updates.push('picture_url = ?');
      values.push(picture_url === '' ? null : picture_url);
    }
    if (navbar_bg !== undefined) {
      updates.push('navbar_bg = ?');
      values.push(navbar_bg === '' ? null : navbar_bg);
    }
    if (navbar_opacity !== undefined) {
      updates.push('navbar_opacity = ?');
      values.push(navbar_opacity === '' ? null : navbar_opacity);
    }
    if (app_bg !== undefined) {
      updates.push('app_bg = ?');
      values.push(app_bg === '' ? null : app_bg);
    }
    if (theme_info_cards !== undefined) {
      updates.push('theme_info_cards = ?');
      values.push(theme_info_cards ? 1 : 0);
    }
    if (text_color !== undefined) {
      updates.push('text_color = ?');
      values.push(text_color);
    }
    if (dynamic_text_color !== undefined) {
      updates.push('dynamic_text_color = ?');
      values.push(dynamic_text_color ? 1 : 0);
    }
    
    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }
    
    values.push(req.user.id);
    
    await db.run(
      `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
      values
    );

    // Fetch updated user details
    const updatedUserRaw = await getUserById(req.user.id);
    
    // Parse role permissions
    let permissions = {};
    if (updatedUserRaw.role_permissions) {
      try {
        permissions = JSON.parse(updatedUserRaw.role_permissions);
      } catch (e) {
        console.error('Failed to parse role permissions:', e);
      }
    }
    
    const updatedUser = {
      id: updatedUserRaw.id,
      username: updatedUserRaw.username,
      display_name: updatedUserRaw.display_name || updatedUserRaw.username,
      role_name: updatedUserRaw.role_name,
      primary_color: updatedUserRaw.primary_color || '#2c3e50',
      theme: updatedUserRaw.theme || 'system',
      auth_provider: updatedUserRaw.auth_provider || 'local',
      calendar_guid: updatedUserRaw.calendar_guid || '',
      calendar_sync_mappings: updatedUserRaw.calendar_sync_mappings ? JSON.parse(updatedUserRaw.calendar_sync_mappings) : {},
      timezone: updatedUserRaw.timezone || 'US/New_York',
      birthday: updatedUserRaw.birthday || '',
      phone: updatedUserRaw.phone || '',
      email: updatedUserRaw.email || '',
      picture_url: updatedUserRaw.picture_url || '',
      navbar_bg: updatedUserRaw.navbar_bg || '',
      navbar_opacity: updatedUserRaw.navbar_opacity !== null && updatedUserRaw.navbar_opacity !== undefined ? updatedUserRaw.navbar_opacity : 0.75,
      app_bg: updatedUserRaw.app_bg || '',
      theme_info_cards: updatedUserRaw.theme_info_cards || 0,
      text_color: updatedUserRaw.text_color || 'white',
      dynamic_text_color: updatedUserRaw.dynamic_text_color || 0,
      permissions
    };

    // Auto sync user as contact
    await syncUserAsContact(updatedUser);
    
    res.json({ message: 'Profile updated successfully', user: updatedUser });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/users/profile/wallpaper', authenticate, upload.single('wallpaper'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No wallpaper file provided' });
    }
    const wallpaperUrl = `/uploads/${req.file.filename}`;
    const db = await getDb();
    await db.run('UPDATE users SET app_bg = ? WHERE id = ?', [wallpaperUrl, req.user.id]);
    const updatedUser = await getUserById(req.user.id);
    res.json({ url: wallpaperUrl, user: updatedUser });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/users/profile/navbar-bg', authenticate, upload.single('navbar_bg'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No navbar background file provided' });
    }
    const navbarBgUrl = `/uploads/${req.file.filename}`;
    const db = await getDb();
    await db.run('UPDATE users SET navbar_bg = ? WHERE id = ?', [navbarBgUrl, req.user.id]);
    const updatedUser = await getUserById(req.user.id);
    res.json({ url: navbarBgUrl, user: updatedUser });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- USER IMPORTANT DATES ENDPOINTS ---
app.get('/api/users/profile/important-dates', authenticate, async (req, res) => {
  try {
    const db = await getDb();
    const dates = await db.all('SELECT * FROM user_important_dates WHERE user_id = ?', [req.user.id]);
    res.json(dates);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/users/important-dates', authenticate, async (req, res) => {
  try {
    const { name, date, shared_with_type, shared_with_user_id, shared_with_contact_id } = req.body;
    if (!name || !date) {
      return res.status(400).json({ error: 'Name and Date are required' });
    }
    const db = await getDb();
    const result = await db.run(
      'INSERT INTO user_important_dates (user_id, name, date, shared_with_type, shared_with_user_id, shared_with_contact_id) VALUES (?, ?, ?, ?, ?, ?)',
      [req.user.id, name, date, shared_with_type || 'none', shared_with_user_id || null, shared_with_contact_id || null]
    );
    const newDate = await db.get('SELECT * FROM user_important_dates WHERE id = ?', [result.lastID]);
    res.status(201).json(newDate);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/users/important-dates/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, date, shared_with_type, shared_with_user_id, shared_with_contact_id } = req.body;
    if (!name || !date) {
      return res.status(400).json({ error: 'Name and Date are required' });
    }
    const db = await getDb();
    const existing = await db.get('SELECT * FROM user_important_dates WHERE id = ? AND user_id = ?', [id, req.user.id]);
    if (!existing) {
      return res.status(404).json({ error: 'Date entry not found' });
    }
    await db.run(
      'UPDATE user_important_dates SET name = ?, date = ?, shared_with_type = ?, shared_with_user_id = ?, shared_with_contact_id = ? WHERE id = ?',
      [name, date, shared_with_type || 'none', shared_with_user_id || null, shared_with_contact_id || null, id]
    );
    const updatedDate = await db.get('SELECT * FROM user_important_dates WHERE id = ?', [id]);
    res.json(updatedDate);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/users/important-dates/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const db = await getDb();
    const existing = await db.get('SELECT * FROM user_important_dates WHERE id = ? AND user_id = ?', [id, req.user.id]);
    if (!existing) {
      return res.status(404).json({ error: 'Date entry not found' });
    }
    await db.run('DELETE FROM user_important_dates WHERE id = ?', [id]);
    res.json({ message: 'Date entry deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- RELATIONSHIPS ENDPOINTS ---
app.get('/api/relationships', authenticate, async (req, res) => {
  try {
    const db = await getDb();
    const rels = await db.all('SELECT * FROM relationships');
    res.json(rels);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/relationships', authenticate, async (req, res) => {
  try {
    const { from_person_type, from_person_id, to_person_type, to_person_id, relationship_type } = req.body;
    if (!from_person_type || !from_person_id || !to_person_type || !to_person_id || !relationship_type) {
      return res.status(400).json({ error: 'All relationship fields are required' });
    }
    const db = await getDb();
    await db.run(
      'INSERT OR REPLACE INTO relationships (from_person_type, from_person_id, to_person_type, to_person_id, relationship_type) VALUES (?, ?, ?, ?, ?)',
      [from_person_type, from_person_id, to_person_type, to_person_id, relationship_type]
    );
    const savedRel = await db.get(
      'SELECT * FROM relationships WHERE from_person_type = ? AND from_person_id = ? AND to_person_type = ? AND to_person_id = ?',
      [from_person_type, from_person_id, to_person_type, to_person_id]
    );
    res.status(201).json(savedRel);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/relationships/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const db = await getDb();
    await db.run('DELETE FROM relationships WHERE id = ?', [id]);
    res.json({ message: 'Relationship deleted successfully' });
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
      branding_favicon: settings.branding_favicon || '',
      dashboard_refresh_interval: settings.dashboard_refresh_interval || 'disabled',
      dashboard_bg_type: settings.dashboard_bg_type || 'theme',
      dashboard_bg_value: settings.dashboard_bg_value || '',
      dashboard_bg_unsplash_keywords: settings.dashboard_bg_unsplash_keywords || '',
      dashboard_rotation_enabled: settings.dashboard_rotation_enabled || 'false',
      dashboard_rotation_interval: settings.dashboard_rotation_interval || '30',
      dashboard_rotation_dashboards: settings.dashboard_rotation_dashboards || '["default"]',
      calendar_event_color: settings.calendar_event_color || '#3b82f6',
      calendar_holiday_color: settings.calendar_holiday_color || '#f97316',
      calendar_task_color: settings.calendar_task_color || '#10b981',
      calendar_bill_color: settings.calendar_bill_color || '#ef4444',
      calendar_sub_color: settings.calendar_sub_color || '#8b5cf6',
      calendar_contact_event_color: settings.calendar_contact_event_color || '#ec4899',
      mtg_url: settings.mtg_url || ''
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
      delete settings.mtg_key;
      delete settings.library_key;
      delete settings.task_key;
      delete settings.unsplash_key;
      delete settings.unsplash_app_id;
      delete settings.unsplash_secret;
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
    if (settings.mtg_key === '••••••••' || settings.mtg_key === '') {
      delete settings.mtg_key;
    }
    if (settings.library_key === '••••••••' || settings.library_key === '') {
      delete settings.library_key;
    }
    if (settings.task_key === '••••••••' || settings.task_key === '') {
      delete settings.task_key;
    }
    if (settings.unsplash_key === '••••••••' || settings.unsplash_key === '') {
      delete settings.unsplash_key;
    }
    if (settings.unsplash_app_id === '••••••••' || settings.unsplash_app_id === '') {
      delete settings.unsplash_app_id;
    }
    if (settings.unsplash_secret === '••••••••' || settings.unsplash_secret === '') {
      delete settings.unsplash_secret;
    }
    if (settings.github_token === '••••••••' || settings.github_token === '') {
      delete settings.github_token;
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

app.post('/api/settings/dashboard/background', authenticate, requirePermission('settings_general', 'full'), upload.single('background'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No background file provided' });
    }
    
    const backgroundUrl = `/uploads/${req.file.filename}`;
    await saveSettings({ dashboard_bg_value: backgroundUrl, dashboard_bg_type: 'upload' });
    
    res.json({ backgroundUrl, message: 'Background uploaded successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/settings/dashboard/background', authenticate, requirePermission('settings_general', 'full'), async (req, res) => {
  try {
    const settings = await getSettings();
    if (settings.dashboard_bg_value && settings.dashboard_bg_value.startsWith('/uploads/')) {
      const fullPath = path.join(DATA_DIR, settings.dashboard_bg_value.replace(/^\//, ''));
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
      }
    }
    await saveSettings({ dashboard_bg_value: '', dashboard_bg_type: 'theme' });
    res.json({ message: 'Background deleted successfully' });
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

app.get('/api/settings/share-token', authenticate, requirePermission('settings_general', 'read'), async (req, res) => {
  try {
    const settings = await getSettings();
    res.json({ share_token: settings.dashboard_share_token || '' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/settings/share-token', authenticate, requirePermission('settings_general', 'full'), async (req, res) => {
  try {
    const newToken = 'dash_' + crypto.randomBytes(32).toString('hex');
    await saveSettings({ dashboard_share_token: newToken });
    res.json({ share_token: newToken, message: 'Share token generated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/settings/share-token', authenticate, requirePermission('settings_general', 'full'), async (req, res) => {
  try {
    await saveSettings({ dashboard_share_token: '' });
    res.json({ message: 'Share token revoked successfully' });
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

app.get('/api/notifications/unread', authenticate, async (req, res) => {
  try {
    const db = await getDb();
    const logs = await db.all('SELECT * FROM notification_logs WHERE is_read = 0 OR is_read IS NULL ORDER BY created_at DESC LIMIT 50');
    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/notifications/:id/read', authenticate, async (req, res) => {
  try {
    const db = await getDb();
    await db.run('UPDATE notification_logs SET is_read = 1 WHERE id = ?', req.params.id);
    res.json({ success: true });
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
      'notify_recipe_added', 'notify_recipe_deleted', 'notify_meal_plan_updated', 'notify_leftovers_added', 'notify_leftovers_expiring', 'notify_inventory_expiring',
      'notify_leftovers_expiry_days', 'notify_inventory_expiry_days',
      'notify_book_added', 'notify_book_deleted', 'notify_log_added', 'notify_book_started', 'notify_book_completed',
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

    // GitHub Integration
    if (settings.github_integration_enabled === 'true') {
      const githubOwner = settings.github_owner;
      const githubRepo = settings.github_repo;
      const githubToken = settings.github_token;

      if (githubOwner && githubRepo && githubToken) {
        try {
          const label = type === 'feature' ? 'enhancement' : 'bug';
          const bodyMarkdown = `
### Description
${body}

---
*Reported via Family App portal.*
*Local Reference: [View details locally](${originUrl || '#'})*
          `;

          const response = await fetch(`https://api.github.com/repos/${githubOwner}/${githubRepo}/issues`, {
            method: 'POST',
            headers: {
              'Authorization': `token ${githubToken}`,
              'Accept': 'application/vnd.github.v3+json',
              'Content-Type': 'application/json',
              'User-Agent': 'Family-App-Server'
            },
            body: JSON.stringify({
              title: title,
              body: bodyMarkdown.trim(),
              labels: [label, 'portal']
            })
          });

          if (response.ok) {
            const githubData = await response.json();
            console.log(`GitHub issue created: ${githubData.html_url}`);
            
            // Save the Github Issue URL on our local record for easy reference
            const dbInstance = await getDb();
            const tableName = type === 'feature' ? 'feature_requests' : 'bug_reports';
            await dbInstance.run(
              `UPDATE ${tableName} SET github_issue_url = ?, github_issue_number = ? WHERE id = ?`,
              [githubData.html_url, githubData.number, item.id]
            );
          } else {
            console.error('GitHub API error:', await response.text());
          }
        } catch (err) {
          console.error('GitHub Sync error:', err.message);
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

// --- GOOGLE SSO ENDPOINTS ---

app.get('/api/auth/google/config', async (req, res) => {
  try {
    const settings = await getSettings();
    res.json({
      google_sso_enabled: settings.google_sso_enabled === 'true',
      google_client_id: settings.google_client_id || ''
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/auth/google/login', async (req, res) => {
  try {
    const settings = await getSettings();
    if (settings.google_sso_enabled !== 'true') {
      return res.status(400).send('Google authentication is disabled.');
    }
    
    const rootUrl = `${req.protocol}://${req.get('host')}`;
    const redirectUri = encodeURIComponent(`${rootUrl}/api/auth/google/callback`);
    const state = crypto.randomBytes(16).toString('hex');
    
    const scope = encodeURIComponent('openid profile email');
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${settings.google_client_id}&response_type=code&redirect_uri=${redirectUri}&scope=${scope}&state=${state}`;
    
    res.redirect(authUrl);
  } catch (error) {
    res.status(500).send('Google login redirection failed: ' + error.message);
  }
});

app.get('/api/auth/google/callback', async (req, res) => {
  const code = req.query.code;
  if (!code) {
    return res.status(400).send('Authorization code missing from Google SSO callback');
  }

  try {
    const settings = await getSettings();
    const rootUrl = `${req.protocol}://${req.get('host')}`;
    const redirectUri = `${rootUrl}/api/auth/google/callback`;
    
    const tokenUrl = 'https://oauth2.googleapis.com/token';
    const tokenBody = new URLSearchParams({
      client_id: settings.google_client_id,
      client_secret: settings.google_client_secret,
      code: code,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code'
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
    
    const email = idPayload.email;
    if (!email) {
      return res.status(400).send('Google SSO login payload did not contain email identifier');
    }

    const db = await getDb();
    let user = await getUserByUsername(email);
    
    if (!user) {
      if (settings.google_auto_provision !== 'true') {
        return res.status(403).send('Auto-provisioning is disabled and no local account matches this email.');
      }
      
      const roleName = settings.google_default_role || 'Viewer';
      const role = await db.get('SELECT id FROM roles WHERE name = ?', [roleName]);
      const roleId = role ? role.id : null;
      
      const dummyPassword = crypto.randomBytes(32).toString('hex');
      const displayName = idPayload.name || email.split('@')[0];
      const pictureUrl = idPayload.picture || null;
      
      const newUserId = await createUser(email, dummyPassword, roleId, displayName, 'google');
      if (pictureUrl) {
        await db.run("UPDATE users SET picture_url = ?, email = ? WHERE id = ?", [pictureUrl, email, newUserId]);
      } else {
        await db.run("UPDATE users SET email = ? WHERE id = ?", [email, newUserId]);
      }
      user = await getUserById(newUserId);
    }

    // Auto sync user as contact
    await syncUserAsContact(user);

    const appToken = generateToken({ id: user.id, username: user.username });
    res.redirect(`/?token=${appToken}`);
  } catch (error) {
    console.error('Google SSO callback failed:', error);
    res.status(500).send('Google SSO authentication callback failed: ' + error.message);
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

app.get('/api/users/calendar-sync-mappings', authenticate, async (req, res) => {
  try {
    const db = await getDb();
    const user = await db.get('SELECT calendar_guid, calendar_sync_mappings FROM users WHERE id = ?', [req.user.id]);
    let mappings = {};
    if (user?.calendar_sync_mappings) {
      try {
        mappings = JSON.parse(user.calendar_sync_mappings);
      } catch (e) {}
    }
    if (!mappings.events && user?.calendar_guid) {
      mappings.events = user.calendar_guid;
    }
    res.json({ mappings, calendar_guid: user?.calendar_guid || '' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/users/calendar-sync', authenticate, async (req, res) => {
  try {
    const { calendarId, mappings } = req.body;
    const db = await getDb();
    const mappingsStr = mappings ? (typeof mappings === 'string' ? mappings : JSON.stringify(mappings)) : null;
    const primaryGuid = mappings?.events !== undefined ? (mappings.events || null) : (calendarId || null);

    await db.run(
      'UPDATE users SET calendar_guid = ?, calendar_sync_mappings = ? WHERE id = ?',
      [primaryGuid, mappingsStr, req.user.id]
    );
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

async function getUnifiedUpcomingEventsList(userId) {
  const db = await getDb();
  
  // 1. Fetch standard events from calendar_events
  const calendarEvents = await db.all("SELECT * FROM calendar_events");
  
  // 2. Fetch contacts (for birthdays)
  const contacts = await db.all("SELECT id, name, birthday FROM contacts WHERE birthday IS NOT NULL AND birthday != ''");
  
  // 3. Fetch contact important dates
  const contactDates = await db.all(`
    SELECT cid.id, cid.contact_id, cid.name, cid.date, c.name as contact_name 
    FROM contact_important_dates cid
    JOIN contacts c ON cid.contact_id = c.id
    WHERE cid.date IS NOT NULL AND cid.date != ''
  `);
  
  // 4. Fetch user important dates
  const userDates = await db.all("SELECT * FROM user_important_dates WHERE user_id = ? AND date IS NOT NULL AND date != ''", [userId]);
  
  const today = new Date();
  const currentYear = today.getFullYear();
  const todayStr = today.toISOString().split('T')[0];
  
  const unifiedEvents = [];
  
  // Process standard calendar events
  calendarEvents.forEach(e => {
    if (e.start_time) {
      unifiedEvents.push({
        id: `calendar-${e.id}`,
        title: e.title,
        start_time: e.start_time,
        end_time: e.end_time || e.start_time,
        all_day: e.all_day || 0,
        location: e.location || '',
        description: e.description || '',
        calendar_type: e.event_type === 'holiday' ? 'holiday' : 'event'
      });
    }
  });
  
  // Process birthdays
  contacts.forEach(c => {
    const parts = c.birthday.split('-');
    if (parts.length === 3) {
      const birthYear = parseInt(parts[0], 10);
      const birthMonth = parts[1];
      const birthDay = parts[2];
      
      // Project to current year and next year
      [currentYear, currentYear + 1].forEach(year => {
        const projectedDate = `${year}-${birthMonth}-${birthDay}`;
        const age = year - birthYear;
        const titleSuffix = age > 0 ? ` (${age} Birthday)` : ' Birthday';
        
        unifiedEvents.push({
          id: `contact-birthday-${c.id}-${year}`,
          title: `🎂 ${c.name}${titleSuffix}`,
          start_time: `${projectedDate}T00:00:00`,
          end_time: `${projectedDate}T23:59:59`,
          all_day: 1,
          location: '',
          description: `${c.name}'s Birthday. Born ${c.birthday}.`,
          calendar_type: 'contact_event'
        });
      });
    }
  });
  
  // Process contact important dates
  contactDates.forEach(d => {
    const parts = d.date.split('-');
    if (parts.length === 3) {
      const startYear = parseInt(parts[0], 10);
      const startMonth = parts[1];
      const startDay = parts[2];
      
      [currentYear, currentYear + 1].forEach(year => {
        const projectedDate = `${year}-${startMonth}-${startDay}`;
        const years = year - startYear;
        const titleSuffix = years > 0 ? ` (${years} Years)` : '';
        
        unifiedEvents.push({
          id: `contact-date-${d.id}-${year}`,
          title: `✨ ${d.contact_name}'s ${d.name}${titleSuffix}`,
          start_time: `${projectedDate}T00:00:00`,
          end_time: `${projectedDate}T23:59:59`,
          all_day: 1,
          location: '',
          description: `${d.contact_name}'s ${d.name}. Date: ${d.date}.`,
          calendar_type: 'contact_event'
        });
      });
    }
  });
  
  // Process user important dates
  userDates.forEach(d => {
    const parts = d.date.split('-');
    if (parts.length === 3) {
      const startYear = parseInt(parts[0], 10);
      const startMonth = parts[1];
      const startDay = parts[2];
      
      [currentYear, currentYear + 1].forEach(year => {
        const projectedDate = `${year}-${startMonth}-${startDay}`;
        const years = year - startYear;
        const titleSuffix = years > 0 ? ` (${years} Years)` : '';
        
        unifiedEvents.push({
          id: `user-date-${d.id}-${year}`,
          title: `✨ ${d.name}${titleSuffix}`,
          start_time: `${projectedDate}T00:00:00`,
          end_time: `${projectedDate}T23:59:59`,
          all_day: 1,
          location: '',
          description: `${d.name}. Date: ${d.date}.`,
          calendar_type: 'user_event'
        });
      });
    }
  });
  
  // Filter to only future events (start_time or end_time >= today) and sort ASC
  return unifiedEvents
    .filter(e => {
      const eventDay = e.start_time.split('T')[0];
      return eventDay >= todayStr;
    })
    .sort((a, b) => a.start_time.localeCompare(b.start_time));
}

async function getCalendarFullData(userId) {
  const db = await getDb();
  const settings = await getSettings();
  
  const user = userId ? await getUserById(userId) : null;
  const userTz = user?.timezone || 'America/New_York';
  const todayStr = getTzTodayStr(userTz);

  // 1. Calendar Events
  const calendarEvents = await db.all("SELECT * FROM calendar_events ORDER BY start_time ASC");

  // 2. FocusFlow Tasks (with due_date)
  const tasksRaw = await getAllTasks(userId, {}, todayStr);
  const tasks = (tasksRaw || []).filter(t => t.due_date);

  // 3. Recurring Bills
  const billsRaw = await db.all("SELECT * FROM recurring_bills WHERE active = 1 ORDER BY next_billing_date ASC");
  const bills = [];
  for (let bill of billsRaw) {
    let newDate = bill.next_billing_date;
    if (newDate && newDate < todayStr) {
      while (newDate < todayStr) {
        newDate = getNextBillingDate(newDate, bill.billing_cycle);
      }
      await db.run("UPDATE recurring_bills SET next_billing_date = ? WHERE id = ?", [newDate, bill.id]);
    }
    bills.push({
      ...bill,
      due_date: newDate || bill.next_billing_date,
      calendar_type: 'bill'
    });
  }

  // 4. Subscriptions
  const subsRaw = await db.all("SELECT * FROM subscriptions WHERE active = 1 ORDER BY next_billing_date ASC");
  const subscriptions = [];
  for (let sub of subsRaw) {
    let newDate = sub.next_billing_date;
    if (newDate && newDate < todayStr) {
      while (newDate < todayStr) {
        newDate = getNextBillingDate(newDate, sub.billing_cycle);
      }
      await db.run("UPDATE subscriptions SET next_billing_date = ? WHERE id = ?", [newDate, sub.id]);
    }
    subscriptions.push({
      ...sub,
      next_billing_date: newDate || sub.next_billing_date,
      due_date: newDate || sub.next_billing_date,
      calendar_type: 'subscription'
    });
  }

  // 5. Contacts (Birthdays & Important dates)
  const contacts = await db.all("SELECT id, name, birthday FROM contacts");
  const contactImportantDates = await db.all(`
    SELECT cid.id, cid.contact_id, cid.name, cid.date, c.name as contact_name 
    FROM contact_important_dates cid
    JOIN contacts c ON cid.contact_id = c.id
    WHERE cid.date IS NOT NULL AND cid.date != ''
  `);
  const userImportantDates = userId ? await db.all("SELECT * FROM user_important_dates WHERE user_id = ? AND date IS NOT NULL AND date != ''", [userId]) : [];

  const colors = {
    event: settings.calendar_event_color || '#3b82f6',
    holiday: settings.calendar_holiday_color || '#f97316',
    task: settings.calendar_task_color || '#10b981',
    bill: settings.calendar_bill_color || '#ef4444',
    subscription: settings.calendar_sub_color || '#8b5cf6',
    contact_event: settings.calendar_contact_event_color || '#ec4899'
  };

  return {
    todayStr,
    timezone: userTz,
    events: calendarEvents,
    tasks,
    bills,
    subscriptions,
    contacts,
    contactImportantDates,
    userImportantDates,
    colors
  };
}

app.get('/api/calendar/overview-data', authenticate, async (req, res) => {
  try {
    const data = await getCalendarFullData(req.user.id);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/calendar/events/upcoming', authenticate, async (req, res) => {
  try {
    const list = await getUnifiedUpcomingEventsList(req.user.id);
    res.json(list);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


app.post('/api/calendar/events', authenticate, async (req, res) => {
  try {
    const { title, description, start_time, end_time, location, event_type, all_day } = req.body;
    if (!title || !start_time || !end_time) {
      return res.status(400).json({ error: 'Title, start time, and end time are required' });
    }
    const db = await getDb();
    const result = await db.run(
      "INSERT INTO calendar_events (title, description, start_time, end_time, location, event_type, all_day) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [title, description || '', start_time, end_time, location || '', event_type || 'event', all_day ? 1 : 0]
    );
    res.status(201).json({ id: result.lastID, title, description, start_time, end_time, location, event_type: event_type || 'event', all_day: all_day ? 1 : 0 });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/calendar/events/:id', authenticate, async (req, res) => {
  try {
    const { title, description, start_time, end_time, location, event_type, all_day } = req.body;
    const db = await getDb();
    const event = await db.get("SELECT * FROM calendar_events WHERE id = ?", [req.params.id]);
    if (!event) return res.status(404).json({ error: 'Event not found' });
    
    await db.run(
      "UPDATE calendar_events SET title = ?, description = ?, start_time = ?, end_time = ?, location = ?, event_type = ?, all_day = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      [
        title !== undefined ? title : event.title,
        description !== undefined ? description : event.description,
        start_time !== undefined ? start_time : event.start_time,
        end_time !== undefined ? end_time : event.end_time,
        location !== undefined ? location : event.location,
        event_type !== undefined ? event_type : (event.event_type || 'event'),
        all_day !== undefined ? (all_day ? 1 : 0) : (event.all_day || 0),
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
// --- CONTACTS API ---

// GET all contacts
app.get('/api/contacts', authenticate, async (req, res) => {
  try {
    const db = await getDb();
    
    // Auto sync all users as contacts
    const users = await db.all('SELECT * FROM users');
    for (const u of users) {
      await syncUserAsContact(u);
    }
    
    const contacts = await db.all(`
      SELECT c.*, 
             (SELECT COUNT(*) FROM game_play_history h WHERE h.winner = c.name) as game_wins 
      FROM contacts c 
      ORDER BY c.name ASC
    `);

    const allDates = await db.all('SELECT * FROM contact_important_dates');
    for (const c of contacts) {
      c.important_dates = allDates.filter(d => d.contact_id === c.id);
    }

    res.json(contacts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST contact important date
app.post('/api/contacts/:contactId/important-dates', authenticate, async (req, res) => {
  try {
    const { contactId } = req.params;
    const { name, date } = req.body;
    if (!name || !date) {
      return res.status(400).json({ error: 'Name and Date are required' });
    }
    const db = await getDb();
    const result = await db.run(
      'INSERT INTO contact_important_dates (contact_id, name, date) VALUES (?, ?, ?)',
      [parseInt(contactId, 10), name, date]
    );
    const newDate = await db.get('SELECT * FROM contact_important_dates WHERE id = ?', [result.lastID]);
    res.status(201).json(newDate);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE contact important date
app.delete('/api/contacts/important-dates/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const db = await getDb();
    await db.run('DELETE FROM contact_important_dates WHERE id = ?', [id]);
    res.json({ message: 'Important date deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST a new contact
app.post('/api/contacts', authenticate, async (req, res) => {
  const { name, phone, email, birthday, relationship, notes } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'Name is required' });
  }
  try {
    const db = await getDb();
    const result = await db.run(
      'INSERT INTO contacts (name, phone, email, birthday, relationship, notes) VALUES (?, ?, ?, ?, ?, ?)',
      [name, phone, email, birthday, relationship, notes]
    );
    const newContact = await db.get('SELECT * FROM contacts WHERE id = ?', [result.lastID]);
    res.status(201).json(newContact);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT (update) a contact
app.put('/api/contacts/:id', authenticate, async (req, res) => {
  const { id } = req.params;
  const { name, phone, email, birthday, relationship, notes } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'Name is required' });
  }
  try {
    const db = await getDb();
    const existing = await db.get('SELECT * FROM contacts WHERE id = ?', [id]);
    if (!existing) {
      return res.status(404).json({ error: 'Contact not found' });
    }
    await db.run(
      'UPDATE contacts SET name = ?, phone = ?, email = ?, birthday = ?, relationship = ?, notes = ? WHERE id = ?',
      [name, phone, email, birthday, relationship, notes, id]
    );
    const updatedContact = await db.get('SELECT * FROM contacts WHERE id = ?', [id]);
    res.json(updatedContact);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE a contact
app.delete('/api/contacts/:id', authenticate, async (req, res) => {
  const { id } = req.params;
  try {
    const db = await getDb();
    const existing = await db.get('SELECT * FROM contacts WHERE id = ?', [id]);
    if (!existing) {
      return res.status(404).json({ error: 'Contact not found' });
    }
    await db.run('DELETE FROM contacts WHERE id = ?', [id]);
    res.json({ message: 'Contact deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// --- HEALTH LOGS API ---

// GET all health logs for current user
app.get('/api/health-logs', authenticate, async (req, res) => {
  try {
    const db = await getDb();
    const logs = await db.all('SELECT * FROM health_logs WHERE user_id = ? ORDER BY log_date DESC', [req.user.id]);
    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET health log for specific date
app.get('/api/health-logs/:date', authenticate, async (req, res) => {
  const { date } = req.params;
  try {
    const db = await getDb();
    const log = await db.get('SELECT * FROM health_logs WHERE user_id = ? AND log_date = ?', [req.user.id, date]);
    res.json(log || null);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST or update health log for a date
app.post('/api/health-logs', authenticate, async (req, res) => {
  const { log_date, steps, water_ml, sleep_hours, mood, weight, notes } = req.body;
  if (!log_date) {
    return res.status(400).json({ error: 'log_date is required' });
  }
  try {
    const db = await getDb();
    const existing = await db.get('SELECT * FROM health_logs WHERE user_id = ? AND log_date = ?', [req.user.id, log_date]);
    if (existing) {
      await db.run(
        'UPDATE health_logs SET steps = ?, water_ml = ?, sleep_hours = ?, mood = ?, weight = ?, notes = ? WHERE user_id = ? AND log_date = ?',
        [steps, water_ml, sleep_hours, mood, weight, notes, req.user.id, log_date]
      );
    } else {
      await db.run(
        'INSERT INTO health_logs (user_id, log_date, steps, water_ml, sleep_hours, mood, weight, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [req.user.id, log_date, steps, water_ml, sleep_hours, mood, weight, notes]
      );
    }
    const updated = await db.get('SELECT * FROM health_logs WHERE user_id = ? AND log_date = ?', [req.user.id, log_date]);
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});// --- MEDICATIONS API ---

// GET all medications for current user
app.get('/api/medications', authenticate, async (req, res) => {
  try {
    const db = await getDb();
    const meds = await db.all('SELECT * FROM medications WHERE user_id = ? ORDER BY name ASC', [req.user.id]);
    res.json(meds);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST a new medication
app.post('/api/medications', authenticate, async (req, res) => {
  const { name, dosage, frequency, time_of_day, notes } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'Medication name is required' });
  }
  try {
    const db = await getDb();
    const result = await db.run(
      'INSERT INTO medications (user_id, name, dosage, frequency, time_of_day, notes) VALUES (?, ?, ?, ?, ?, ?)',
      [req.user.id, name, dosage, frequency, time_of_day, notes]
    );
    const newMed = await db.get('SELECT * FROM medications WHERE id = ?', [result.lastID]);
    res.status(201).json(newMed);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT (update) a medication
app.put('/api/medications/:id', authenticate, async (req, res) => {
  const { id } = req.params;
  const { name, dosage, frequency, time_of_day, notes } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'Medication name is required' });
  }
  try {
    const db = await getDb();
    const existing = await db.get('SELECT * FROM medications WHERE id = ? AND user_id = ?', [id, req.user.id]);
    if (!existing) {
      return res.status(404).json({ error: 'Medication not found' });
    }
    await db.run(
      'UPDATE medications SET name = ?, dosage = ?, frequency = ?, time_of_day = ?, notes = ? WHERE id = ? AND user_id = ?',
      [name, dosage, frequency, time_of_day, notes, id, req.user.id]
    );
    const updatedMed = await db.get('SELECT * FROM medications WHERE id = ?', [id]);
    res.json(updatedMed);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE a medication
app.delete('/api/medications/:id', authenticate, async (req, res) => {
  const { id } = req.params;
  try {
    const db = await getDb();
    const existing = await db.get('SELECT * FROM medications WHERE id = ? AND user_id = ?', [id, req.user.id]);
    if (!existing) {
      return res.status(404).json({ error: 'Medication not found' });
    }
    await db.run('DELETE FROM medications WHERE id = ? AND user_id = ?', [id, req.user.id]);
    res.json({ message: 'Medication deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// --- DOCTOR APPOINTMENTS API ---

// GET all doctor appointments for current user
app.get('/api/appointments', authenticate, async (req, res) => {
  try {
    const db = await getDb();
    const appts = await db.all('SELECT * FROM doctor_appointments WHERE user_id = ? ORDER BY appointment_date ASC', [req.user.id]);
    res.json(appts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST a new doctor appointment
app.post('/api/appointments', authenticate, async (req, res) => {
  const { provider, specialty, appointment_date, appointment_time, notes } = req.body;
  if (!provider || !appointment_date) {
    return res.status(400).json({ error: 'Provider and appointment date are required' });
  }
  try {
    const db = await getDb();
    const result = await db.run(
      'INSERT INTO doctor_appointments (user_id, provider, specialty, appointment_date, appointment_time, notes) VALUES (?, ?, ?, ?, ?, ?)',
      [req.user.id, provider, specialty, appointment_date, appointment_time, notes]
    );
    const newAppt = await db.get('SELECT * FROM doctor_appointments WHERE id = ?', [result.lastID]);
    res.status(201).json(newAppt);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT (update) a doctor appointment
app.put('/api/appointments/:id', authenticate, async (req, res) => {
  const { id } = req.params;
  const { provider, specialty, appointment_date, appointment_time, notes } = req.body;
  if (!provider || !appointment_date) {
    return res.status(400).json({ error: 'Provider and appointment date are required' });
  }
  try {
    const db = await getDb();
    const existing = await db.get('SELECT * FROM doctor_appointments WHERE id = ? AND user_id = ?', [id, req.user.id]);
    if (!existing) {
      return res.status(404).json({ error: 'Appointment not found' });
    }
    await db.run(
      'UPDATE doctor_appointments SET provider = ?, specialty = ?, appointment_date = ?, appointment_time = ?, notes = ? WHERE id = ? AND user_id = ?',
      [provider, specialty, appointment_date, appointment_time, notes, id, req.user.id]
    );
    const updatedAppt = await db.get('SELECT * FROM doctor_appointments WHERE id = ?', [id]);
    res.json(updatedAppt);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE a doctor appointment
app.delete('/api/appointments/:id', authenticate, async (req, res) => {
  const { id } = req.params;
  try {
    const db = await getDb();
    const existing = await db.get('SELECT * FROM doctor_appointments WHERE id = ? AND user_id = ?', [id, req.user.id]);
    if (!existing) {
      return res.status(404).json({ error: 'Appointment not found' });
    }
    await db.run('DELETE FROM doctor_appointments WHERE id = ? AND user_id = ?', [id, req.user.id]);
    res.json({ message: 'Appointment deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});// --- PETS API ---

// GET all pets
app.get('/api/pets', authenticate, async (req, res) => {
  try {
    const db = await getDb();
    const pets = await db.all('SELECT * FROM pets ORDER BY name ASC');
    res.json(pets);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST a new pet
app.post('/api/pets', authenticate, upload.single('picture'), async (req, res) => {
  try {
    const petData = JSON.parse(req.body.pet);
    const { name, type, breed, birthdate, weight, notes } = petData;
    if (!name) {
      return res.status(400).json({ error: 'Pet name is required' });
    }
    const picture_url = req.file ? `/uploads/${req.file.filename}` : null;
    
    const db = await getDb();
    const result = await db.run(
      'INSERT INTO pets (name, type, breed, birthdate, weight, picture_url, notes) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [name, type, breed, birthdate, weight ? Number(weight) : null, picture_url, notes]
    );
    const newPet = await db.get('SELECT * FROM pets WHERE id = ?', [result.lastID]);
    res.status(201).json(newPet);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT (update) a pet
app.put('/api/pets/:id', authenticate, upload.single('picture'), async (req, res) => {
  const { id } = req.params;
  try {
    const petData = JSON.parse(req.body.pet);
    const { name, type, breed, birthdate, weight, notes, keepExistingPicture } = petData;
    if (!name) {
      return res.status(400).json({ error: 'Pet name is required' });
    }
    
    const db = await getDb();
    const existing = await db.get('SELECT * FROM pets WHERE id = ?', [id]);
    if (!existing) {
      return res.status(404).json({ error: 'Pet not found' });
    }
    
    let picture_url = existing.picture_url;
    if (req.file) {
      picture_url = `/uploads/${req.file.filename}`;
    } else if (keepExistingPicture === false) {
      picture_url = null;
    }
    
    await db.run(
      'UPDATE pets SET name = ?, type = ?, breed = ?, birthdate = ?, weight = ?, picture_url = ?, notes = ? WHERE id = ?',
      [name, type, breed, birthdate, weight ? Number(weight) : null, picture_url, notes, id]
    );
    const updatedPet = await db.get('SELECT * FROM pets WHERE id = ?', [id]);
    res.json(updatedPet);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE a pet
app.delete('/api/pets/:id', authenticate, async (req, res) => {
  const { id } = req.params;
  try {
    const db = await getDb();
    const existing = await db.get('SELECT * FROM pets WHERE id = ?', [id]);
    if (!existing) {
      return res.status(404).json({ error: 'Pet not found' });
    }
    await db.run('DELETE FROM pets WHERE id = ?', [id]);
    res.json({ message: 'Pet deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- VET VISITS API ---

// GET all vet visits for a pet
app.get('/api/pets/:petId/vet-visits', authenticate, async (req, res) => {
  const { petId } = req.params;
  try {
    const db = await getDb();
    const visits = await db.all('SELECT * FROM pet_vet_visits WHERE pet_id = ? ORDER BY visit_date DESC', [petId]);
    res.json(visits);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST a new vet visit
app.post('/api/pets/:petId/vet-visits', authenticate, async (req, res) => {
  const { petId } = req.params;
  const { visit_date, provider, reason, weight_logged, notes } = req.body;
  if (!visit_date) {
    return res.status(400).json({ error: 'Visit date is required' });
  }
  try {
    const db = await getDb();
    const result = await db.run(
      'INSERT INTO pet_vet_visits (pet_id, visit_date, provider, reason, weight_logged, notes) VALUES (?, ?, ?, ?, ?, ?)',
      [petId, visit_date, provider, reason, weight_logged ? Number(weight_logged) : null, notes]
    );
    
    if (weight_logged) {
      await db.run('UPDATE pets SET weight = ? WHERE id = ?', [Number(weight_logged), petId]);
    }
    
    const newVisit = await db.get('SELECT * FROM pet_vet_visits WHERE id = ?', [result.lastID]);
    res.status(201).json(newVisit);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE a vet visit
app.delete('/api/pets/vet-visits/:id', authenticate, async (req, res) => {
  const { id } = req.params;
  try {
    const db = await getDb();
    await db.run('DELETE FROM pet_vet_visits WHERE id = ?', [id]);
    res.json({ message: 'Vet visit deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- PET MEDICATIONS API ---

// GET all medications for a pet
app.get('/api/pets/:petId/medications', authenticate, async (req, res) => {
  const { petId } = req.params;
  try {
    const db = await getDb();
    const meds = await db.all(`
      SELECT m.*, MAX(l.given_at) as last_given 
      FROM pet_medications m 
      LEFT JOIN pet_medication_logs l ON m.id = l.medication_id 
      WHERE m.pet_id = ? 
      GROUP BY m.id 
      ORDER BY m.name ASC
    `, [petId]);
    res.json(meds);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST a new medication for a pet
app.post('/api/pets/:petId/medications', authenticate, async (req, res) => {
  const { petId } = req.params;
  const { name, dosage, frequency, instructions } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'Medication name is required' });
  }
  try {
    const db = await getDb();
    const result = await db.run(
      'INSERT INTO pet_medications (pet_id, name, dosage, frequency, instructions) VALUES (?, ?, ?, ?, ?)',
      [petId, name, dosage, frequency, instructions]
    );
    const newMed = await db.get('SELECT * FROM pet_medications WHERE id = ?', [result.lastID]);
    res.status(201).json(newMed);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE a pet medication
app.delete('/api/pets/medications/:id', authenticate, async (req, res) => {
  const { id } = req.params;
  try {
    const db = await getDb();
    await db.run('DELETE FROM pet_medications WHERE id = ?', [id]);
    res.json({ message: 'Pet medication deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST log medication administration
app.post('/api/pets/medications/:medId/log', authenticate, async (req, res) => {
  const { medId } = req.params;
  const { given_at } = req.body;
  const timeVal = given_at || new Date().toISOString();
  try {
    const db = await getDb();
    await db.run('INSERT INTO pet_medication_logs (medication_id, given_at) VALUES (?, ?)', [medId, timeVal]);
    res.json({ message: 'Medication administration logged successfully', given_at: timeVal });
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


// --- GAMES API ---

// 1. List games
// Sync Magic: The Gathering game info from MTG App if configured
async function syncMtgGame() {
  try {
    const db = await getDb();
    const settings = await getSettings();
    if (!settings.mtg_url || !settings.mtg_url.trim()) return;

    // Check if game entry already exists
    const existing = await db.get("SELECT * FROM games WHERE title = 'Magic: The Gathering'");
    if (existing) {
      if (existing.min_players !== 2 || existing.max_players !== 2 || existing.recommended_ages !== '13+') {
        await db.run(
          "UPDATE games SET min_players = 2, max_players = 2, recommended_ages = '13+' WHERE id = ?",
          [existing.id]
        );
      }
      return;
    }

    const baseUrl = settings.mtg_url.trim().replace(/\/$/, '');
    const url = `${baseUrl}/api/game`;
    const headers = { 'Accept': 'application/json' };
    if (settings.mtg_key) {
      headers['x-api-key'] = settings.mtg_key;
    }

    let gameData = {
      title: 'Magic: The Gathering',
      game_type: 'Card Game',
      min_players: 2,
      max_players: 2,
      recommended_ages: '13+',
      rating: 5
    };

    try {
      const response = await fetch(url, { headers, timeout: 5000 });
      if (response.ok) {
        const remoteData = await response.json();
        gameData = { ...gameData, ...remoteData, min_players: 2, max_players: 2, recommended_ages: '13+' };
      }
    } catch (e) {
      console.log(`[MTG Sync] API fetch failed, using default info: ${e.message}`);
    }

    await db.run(
      `INSERT INTO games (title, game_type, min_players, max_players, recommended_ages, rating) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [gameData.title, gameData.game_type, gameData.min_players, gameData.max_players, gameData.recommended_ages, gameData.rating]
    );
    console.log(`[MTG Sync] Auto-populated "Magic: The Gathering" in games database.`);
  } catch (err) {
    console.error(`[MTG Sync] Failed:`, err);
  }
}

app.get('/api/games', authenticate, async (req, res) => {
  try {
    await syncMtgGame();
    const db = await getDb();
    const games = await db.all("SELECT * FROM games ORDER BY title ASC");
    res.json(games);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 2. Add a game
app.post('/api/games', authenticate, async (req, res) => {
  const { title, game_type, min_players, max_players, recommended_ages, rating } = req.body;
  if (!title) {
    return res.status(400).json({ error: 'Game title is required' });
  }
  try {
    const db = await getDb();
    const result = await db.run(
      `INSERT INTO games (title, game_type, min_players, max_players, recommended_ages, rating) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        title, 
        game_type || 'Board', 
        parseInt(min_players, 10) || 1, 
        parseInt(max_players, 10) || 4, 
        recommended_ages || '', 
        parseInt(rating, 10) || 5
      ]
    );
    res.json({ id: result.lastID, title, game_type, min_players, max_players, recommended_ages, rating });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 3. Delete a game
app.delete('/api/games/:id', authenticate, async (req, res) => {
  try {
    const db = await getDb();
    await db.run("DELETE FROM games WHERE id = ?", [req.params.id]);
    res.json({ message: 'Game deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 4. List play history
app.get('/api/games/history', authenticate, async (req, res) => {
  try {
    const db = await getDb();
    const history = await db.all(
      `SELECT h.*, g.title as game_title, g.game_type 
       FROM game_play_history h
       JOIN games g ON h.game_id = g.id
       ORDER BY h.played_at DESC`
    );
    res.json(history);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 5. Add a play history entry
app.post('/api/games/history', authenticate, async (req, res) => {
  const { game_id, players_count, winner, played_at, notes_content } = req.body;
  if (!game_id) {
    return res.status(400).json({ error: 'game_id is required' });
  }
  try {
    const db = await getDb();
    const logDate = played_at || new Date().toISOString();
    
    let notes_file = null;
    if (notes_content !== undefined && notes_content !== null) {
      const notesDir = path.join(__dirname, 'public', 'game_notes');
      if (!fs.existsSync(notesDir)) {
        fs.mkdirSync(notesDir, { recursive: true });
      }
      const filename = `game_play_${Date.now()}_${Math.floor(Math.random() * 1000)}.md`;
      fs.writeFileSync(path.join(notesDir, filename), notes_content, 'utf8');
      notes_file = `/game_notes/${filename}`;
    }

    const result = await db.run(
      `INSERT INTO game_play_history (game_id, players_count, winner, played_at, notes_file)
       VALUES (?, ?, ?, ?, ?)`,
      [
        parseInt(game_id, 10),
        players_count ? parseInt(players_count, 10) : null,
        winner || 'Pending',
        logDate,
        notes_file
      ]
    );
    res.json({ id: result.lastID, game_id, players_count, winner: winner || 'Pending', played_at: logDate, notes_file });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 6. Update a play history entry
app.put('/api/games/history/:id', authenticate, async (req, res) => {
  const { winner, players_count, played_at, notes_content } = req.body;
  try {
    const db = await getDb();
    const existing = await db.get("SELECT * FROM game_play_history WHERE id = ?", [req.params.id]);
    if (!existing) {
      return res.status(404).json({ error: 'Play history log not found' });
    }
    const updatedWinner = winner !== undefined ? winner : existing.winner;
    const updatedPlayers = players_count !== undefined ? (players_count ? parseInt(players_count, 10) : null) : existing.players_count;
    const updatedDate = played_at !== undefined ? played_at : existing.played_at;

    let notes_file = existing.notes_file;
    if (notes_content !== undefined) {
      const notesDir = path.join(__dirname, 'public', 'game_notes');
      if (!fs.existsSync(notesDir)) {
        fs.mkdirSync(notesDir, { recursive: true });
      }
      let filename;
      if (notes_file && notes_file.startsWith('/game_notes/')) {
        filename = notes_file.replace('/game_notes/', '');
      } else {
        filename = `game_play_${Date.now()}_${Math.floor(Math.random() * 1000)}.md`;
        notes_file = `/game_notes/${filename}`;
      }
      fs.writeFileSync(path.join(notesDir, filename), notes_content || '', 'utf8');
    }

    await db.run(
      `UPDATE game_play_history 
       SET winner = ?, players_count = ?, played_at = ?, notes_file = ? 
       WHERE id = ?`,
      [updatedWinner, updatedPlayers, updatedDate, notes_file, req.params.id]
    );
    res.json({ id: req.params.id, winner: updatedWinner, players_count: updatedPlayers, played_at: updatedDate, notes_file });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 6.5. Get markdown notes content for a play history entry
app.get('/api/games/history/:id/notes', authenticate, async (req, res) => {
  try {
    const db = await getDb();
    const log = await db.get("SELECT notes_file FROM game_play_history WHERE id = ?", [req.params.id]);
    if (!log || !log.notes_file) {
      return res.status(404).json({ error: 'Notes file not found' });
    }
    
    const filename = log.notes_file.replace('/game_notes/', '');
    const notesPath = path.join(__dirname, 'public', 'game_notes', filename);
    
    if (!fs.existsSync(notesPath)) {
      return res.status(404).json({ error: 'Notes file does not exist on disk' });
    }
    
    const content = fs.readFileSync(notesPath, 'utf8');
    res.setHeader('Content-Type', 'text/plain');
    res.send(content);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 7. Delete a play history entry
app.delete('/api/games/history/:id', authenticate, async (req, res) => {
  if (req.user.role_name !== 'Administrator') {
    return res.status(403).json({ error: 'Only administrators can delete game play logs.' });
  }
  try {
    const db = await getDb();
    await db.run("DELETE FROM game_play_history WHERE id = ?", [req.params.id]);
    res.json({ message: 'Play log deleted successfully' });
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
  if (!user) return;

  let mappings = {};
  if (user.calendar_sync_mappings) {
    try {
      mappings = JSON.parse(user.calendar_sync_mappings);
    } catch (e) {}
  }
  if (!mappings.events && user.calendar_guid) {
    mappings.events = user.calendar_guid;
  }

  // If no calendars are mapped to any M365 calendar, skip
  const hasAnyMapping = Object.values(mappings).some(v => Boolean(v && v.trim()));
  if (!hasAnyMapping) return;

  const token = await getValidM365Token(userId);
  if (!token) return;

  const db = await getDb();

  const getCalendarEventsUrl = (calId) => {
    if (!calId || calId === 'default') {
      return 'https://graph.microsoft.com/v1.0/me/events';
    }
    return `https://graph.microsoft.com/v1.0/me/calendars/${calId}/events`;
  };

  try {
    const userTz = normalizeTimezone(user.timezone);

    // 1. SYNC EVENTS (Standard Events)
    if (mappings.events && mappings.events.trim()) {
      const targetCalId = mappings.events.trim();
      const calUrl = getCalendarEventsUrl(targetCalId);
      
      const calRes = await fetch(`${calUrl}?$top=100`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Prefer': `outlook.timezone="${userTz}"`
        }
      });

      if (calRes.ok) {
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
              "INSERT INTO calendar_events (title, description, start_time, end_time, location, event_type, m365_event_id) VALUES (?, ?, ?, ?, ?, 'event', ?)",
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
      }

      const unsyncedEvents = await db.all("SELECT * FROM calendar_events WHERE (event_type = 'event' OR event_type IS NULL) AND m365_event_id IS NULL");
      for (const ue of unsyncedEvents) {
        const body = {
          subject: ue.title,
          body: { contentType: "html", content: ue.description || "" },
          start: {
            dateTime: ue.start_time.includes('T') ? ue.start_time : ue.start_time + "T09:00:00",
            timeZone: userTz
          },
          end: {
            dateTime: ue.end_time.includes('T') ? ue.end_time : ue.end_time + "T10:00:00",
            timeZone: userTz
          },
          location: { displayName: ue.location || "" }
        };

        const res = await fetch(calUrl, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        });
        if (res.ok) {
          const data = await res.json();
          await db.run("UPDATE calendar_events SET m365_event_id = ? WHERE id = ?", [data.id, ue.id]);
        }
      }

      const updatedEvents = await db.all("SELECT * FROM calendar_events WHERE (event_type = 'event' OR event_type IS NULL) AND m365_event_id IS NOT NULL AND updated_at > created_at");
      for (const ue of updatedEvents) {
        const body = {
          subject: ue.title,
          body: { contentType: "html", content: ue.description || "" },
          start: {
            dateTime: ue.start_time.includes('T') ? ue.start_time : ue.start_time + "T09:00:00",
            timeZone: userTz
          },
          end: {
            dateTime: ue.end_time.includes('T') ? ue.end_time : ue.end_time + "T10:00:00",
            timeZone: userTz
          },
          location: { displayName: ue.location || "" }
        };

        const patchRes = await fetch(`https://graph.microsoft.com/v1.0/me/events/${ue.m365_event_id}`, {
          method: 'PATCH',
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        });
        if (patchRes.ok) {
          await db.run("UPDATE calendar_events SET updated_at = created_at WHERE id = ?", [ue.id]);
        }
      }
    }

    // 2. SYNC HOLIDAYS (if mapped)
    if (mappings.holidays && mappings.holidays.trim()) {
      const targetCalId = mappings.holidays.trim();
      const calUrl = getCalendarEventsUrl(targetCalId);
      const unsyncedHolidays = await db.all("SELECT * FROM calendar_events WHERE event_type = 'holiday' AND m365_event_id IS NULL");

      for (const uh of unsyncedHolidays) {
        const dateOnly = uh.start_time.split('T')[0];
        const body = {
          subject: `🎉 ${uh.title}`,
          isAllDay: true,
          body: { contentType: "html", content: uh.description || "US Holiday" },
          start: { dateTime: `${dateOnly}T00:00:00`, timeZone: userTz },
          end: { dateTime: `${dateOnly}T23:59:59`, timeZone: userTz }
        };

        const res = await fetch(calUrl, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        });
        if (res.ok) {
          const data = await res.json();
          await db.run("UPDATE calendar_events SET m365_event_id = ? WHERE id = ?", [data.id, uh.id]);
        }
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
    
    const users = await db.all("SELECT id, username, calendar_guid, calendar_sync_mappings FROM users WHERE m365_access_token IS NOT NULL");
    for (const u of users) {
      console.log(`Running background M365 sync for user: ${u.username}`);
      await syncTasksForUser(u.id);
      if (u.calendar_guid || u.calendar_sync_mappings) {
        await syncCalendarForUser(u.id);
      }
    }
  } catch (err) {
    console.error("Scheduled background sync failed:", err);
  }
}

// Run background sync every 1 hour (3,600,000 ms)
setInterval(syncAllUsersM365, 3600000);



// --- RECIPE ENDPOINTS ---

// GET /api/recipes - Search and list recipes
app.get('/api/recipes', authenticate, requirePermission('recipes', 'read'), async (req, res) => {
  try {
    const search = req.query.q || '';
    const recipes = await getAllRecipes(search);
    res.json(recipes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/recipes/recent - Get most recently added recipes (up to 10)
app.get('/api/recipes/recent', authenticate, async (req, res) => {
  try {
    const list = await getRecentRecipes(10);
    res.json(list);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/recipes/:id - Get specific recipe details
app.get('/api/recipes/:id', authenticate, requirePermission('recipes', 'read'), async (req, res) => {
  try {
    const recipe = await getRecipeById(req.params.id);
    if (!recipe) {
      return res.status(404).json({ error: 'Recipe not found' });
    }
    res.json(recipe);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/recipes - Create recipe manually
app.post('/api/recipes', authenticate, requirePermission('recipes', 'full'), upload.single('image'), async (req, res) => {
  try {
    const recipeData = JSON.parse(req.body.recipe);
    if (req.file) {
      recipeData.image_path = `/uploads/${req.file.filename}`;
    }
    const id = await createRecipe(recipeData);
    sendNotification('Recipe Added', `A new recipe has been added: "${recipeData.title}".`, 'Recipe Added');
    res.status(201).json({ id, message: 'Recipe created successfully' });
  } catch (error) {
    console.error('Error creating recipe:', error);
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/recipes/:id - Update recipe
app.put('/api/recipes/:id', authenticate, requirePermission('recipes', 'full'), upload.single('image'), async (req, res) => {
  try {
    const recipeData = JSON.parse(req.body.recipe);
    if (req.file) {
      recipeData.image_path = `/uploads/${req.file.filename}`;
    }
    await updateRecipe(req.params.id, recipeData);
    res.json({ message: 'Recipe updated successfully' });
  } catch (error) {
    console.error('Error updating recipe:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/recipes/:id - Delete recipe
app.delete('/api/recipes/:id', authenticate, requirePermission('recipes', 'full'), async (req, res) => {
  try {
    const recipe = await getRecipeById(req.params.id);
    if (recipe && recipe.image_path) {
      const fullPath = path.join(DATA_DIR, recipe.image_path.replace(/^\//, ''));
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
      }
    }
    const success = await deleteRecipe(req.params.id);
    if (!success) {
      return res.status(404).json({ error: 'Recipe not found' });
    }
    if (recipe) {
      sendNotification('Recipe Deleted', `The recipe "${recipe.title}" has been deleted.`, 'Recipe Deleted');
    }
    res.json({ message: 'Recipe deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/recipes/:id/toggle-favorite - Toggle recipe favorite status
app.post('/api/recipes/:id/toggle-favorite', authenticate, requirePermission('recipes', 'full'), async (req, res) => {
  try {
    const { id } = req.params;
    const favorite = await toggleRecipeFavorite(id);
    res.json({ favorite, message: 'Recipe favorite status updated' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- BULK ACTION RECIPES ENDPOINTS ---

// POST /api/recipes/bulk-delete
app.post('/api/recipes/bulk-delete', authenticate, requirePermission('recipes', 'full'), async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'No recipe IDs provided' });
    }

    const db = await getDb();
    await db.run('BEGIN TRANSACTION');
    try {
      for (const id of ids) {
        const recipe = await getRecipeById(id);
        if (recipe && recipe.image_path) {
          const fullPath = path.join(DATA_DIR, recipe.image_path.replace(/^\//, ''));
          if (fs.existsSync(fullPath)) {
            fs.unlinkSync(fullPath);
          }
        }
        await deleteRecipe(id);
        if (recipe) {
          sendNotification('Recipe Deleted', `The recipe "${recipe.title}" has been deleted.`, 'Recipe Deleted');
        }
      }
      await db.run('COMMIT');
      res.json({ message: `Successfully deleted ${ids.length} recipes.` });
    } catch (error) {
      await db.run('ROLLBACK');
      throw error;
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/recipes/bulk-export
app.post('/api/recipes/bulk-export', authenticate, requirePermission('recipes', 'read'), async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'No recipe IDs provided' });
    }

    const templateId = req.query.templateId;
    let templateRecord;
    if (templateId) {
      templateRecord = await getTemplateById(templateId);
    } else {
      templateRecord = await getDefaultTemplate();
    }

    if (!templateRecord) {
      return res.status(404).json({ error: 'No document template found.' });
    }

    const templateFullPath = path.join(DATA_DIR, templateRecord.file_path.replace(/^\//, ''));
    if (!fs.existsSync(templateFullPath)) {
      return res.status(404).json({ error: 'Template file not found on disk' });
    }

    const zip = new PizZip();
    for (const id of ids) {
      const recipe = await getRecipeById(id);
      if (recipe) {
        const docBuffer = renderRecipeDocx(templateFullPath, recipe);
        const safeTitle = recipe.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        zip.file(`${safeTitle}.docx`, docBuffer);
      }
    }

    const zipBuffer = zip.generate({
      type: 'nodebuffer',
      compression: 'DEFLATE',
    });

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename="recipes_export.zip"');
    res.send(zipBuffer);
  } catch (error) {
    console.error('Bulk export failed:', error);
    res.status(500).json({ error: 'Bulk export failed: ' + error.message });
  }
});

// --- OCR SCREENSHOT ENDPOINT ---

// POST /api/recipes/ocr - Upload and parse screenshot
app.post('/api/recipes/ocr', authenticate, requirePermission('recipes', 'full'), upload.single('screenshot'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file uploaded' });
    }
    
    console.log(`Running OCR on file: ${req.file.path}`);
    const parsedRecipe = await parseRecipeImage(req.file.path);
    
    // We keep the file in uploads so it can be associated with the recipe image if desired
    parsedRecipe.image_path = `/uploads/${req.file.filename}`;
    
    res.json(parsedRecipe);
  } catch (error) {
    console.error('OCR parsing failed:', error);
    res.status(500).json({ error: error.message });
  }
});

// --- CSV IMPORT ENDPOINT ---

// POST /api/recipes/csv - Bulk upload recipes via CSV
app.post('/api/recipes/csv', authenticate, requirePermission('recipes', 'full'), upload.single('csvfile'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No CSV file uploaded' });
  }

  const results = [];
  fs.createReadStream(req.file.path)
    .pipe(csv())
    .on('data', (data) => results.push(data))
    .on('end', async () => {
      // Clean up uploaded CSV file
      fs.unlinkSync(req.file.path);

      try {
        let importedCount = 0;
        for (const row of results) {
          // Required field: Title
          if (!row.title || !row.title.trim()) continue;

          // Parse ingredients: format separated by semicolon
          const ingredients = [];
          if (row.ingredients) {
            const rawIngs = row.ingredients.split(';');
            for (const raw of rawIngs) {
              if (raw.trim()) {
                ingredients.push(parseIngredientLine(raw));
              }
            }
          }

          // Parse instructions: format separated by semicolon
          const instructions = [];
          if (row.instructions) {
            const rawInsts = row.instructions.split(';');
            rawInsts.forEach((inst, index) => {
              if (inst.trim()) {
                instructions.push({
                  step_number: index + 1,
                  instruction_text: inst.trim()
                });
              }
            });
          }

          await createRecipe({
            title: row.title.trim(),
            description: row.description || '',
            prep_time: parseInt(row.prep_time, 10) || null,
            cook_time: parseInt(row.cook_time, 10) || null,
            servings: parseInt(row.servings, 10) || null,
            ingredients,
            instructions,
            image_path: row.image_path || '',
            source_url: row.source_url || ''
          });
          importedCount++;
        }

        res.json({ message: `Successfully imported ${importedCount} recipes.` });
      } catch (error) {
        console.error('Failed to import CSV:', error);
        res.status(500).json({ error: 'Failed to parse and save recipes from CSV: ' + error.message });
      }
    });
});

// GET /api/dashboard/stats - Fetch counts and expiring item stats for home dashboard widgets
app.get('/api/dashboard/stats', authenticate, async (req, res) => {
  try {
    const db = await getDb();
    
    // Helper to parse date locally
    const parseLocalDate = (dateStr) => {
      if (!dateStr) return null;
      const cleanStr = dateStr.split('T')[0].split(' ')[0];
      const parts = cleanStr.split('-');
      if (parts.length === 3) {
        const year = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const day = parseInt(parts[2], 10);
        if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
          return new Date(year, month, day);
        }
      }
      const d = new Date(dateStr);
      d.setHours(0, 0, 0, 0);
      return d;
    };

    // 1. Recipes Count
    const recipesCountRow = await db.get('SELECT COUNT(*) as count FROM recipes');
    const recipesCount = recipesCountRow ? recipesCountRow.count : 0;

    // 2. Shopping List Items Count (unchecked, using bulletproof subquery UNION)
    const shoppingItemsCountRow = await db.get(`
      SELECT COUNT(*) as count
      FROM shopping_list_items
      WHERE list_id IN (
        SELECT id FROM shopping_lists WHERE owner_id = ?
        UNION
        SELECT list_id FROM shopping_list_shares WHERE shared_with_user_id = ?
      ) AND (is_checked = 0 OR is_checked IS NULL)
    `, [req.user.id, req.user.id]);
    const shoppingItemsCount = shoppingItemsCountRow ? shoppingItemsCountRow.count : 0;

    // 3. Expiring Inventory (<= 5 days)
    const inventoryItems = await db.all('SELECT expiration_date, percentage_used FROM inventory');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expiringInventoryCount = inventoryItems.filter(item => {
      if (!item.expiration_date) return false;
      if (item.percentage_used >= 100) return false;
      const expDate = parseLocalDate(item.expiration_date);
      if (!expDate) return false;
      const diffTime = expDate - today;
      const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
      return diffDays <= 5;
    }).length;

    // 4. Expiring Leftovers (<= 3 days)
    const leftoversItems = await db.all('SELECT expiration_date FROM leftovers');
    const expiringLeftoversCount = leftoversItems.filter(item => {
      if (!item.expiration_date) return false;
      const expDate = parseLocalDate(item.expiration_date);
      if (!expDate) return false;
      const diffTime = expDate - today;
      const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
      return diffDays <= 3;
    }).length;

    res.json({
      shoppingItemsCount,
      recipesCount,
      expiringInventoryCount,
      expiringLeftoversCount
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- WEEKLY MENU PLANNERS ---

// GET /api/menu - Get current plan
app.get('/api/menu', authenticate, requirePermission('planner', 'read'), async (req, res) => {
  try {
    const menu = await getWeeklyMenu();
    res.json(menu);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/menu - Add or update a menu entry
app.post('/api/menu', authenticate, requirePermission('planner', 'full'), async (req, res) => {
  try {
    const { id, day_of_week, meal_type, recipe_id, leftover_id, has_leftovers, custom_meal, servings, tags, assigned_people } = req.body;
    
    let entryId = id;
    if (id) {
      // Update existing entry
      await updateWeeklyMenuEntry(id, recipe_id || null, leftover_id || null, has_leftovers || 0, custom_meal || null, servings || null, tags || null, assigned_people || null);
    } else {
      // Create new entry
      if (!day_of_week || !meal_type) {
        return res.status(400).json({ error: 'Missing day_of_week or meal_type' });
      }
      entryId = await addWeeklyMenuEntry(day_of_week, meal_type, recipe_id || null, leftover_id || null, has_leftovers || 0, custom_meal || null, servings || null, tags || null, assigned_people || null);
    }
    
    try {
      let mealName = 'Cleared';
      if (custom_meal) {
        mealName = custom_meal;
      } else if (recipe_id) {
        const recipe = await getRecipeById(recipe_id);
        if (recipe) mealName = recipe.title;
      } else if (leftover_id) {
        const db = await getDb();
        const leftover = await db.get("SELECT name FROM leftovers WHERE id = ?", [leftover_id]);
        if (leftover) mealName = `Leftover: ${leftover.name}`;
      }
      
      let finalDay = day_of_week;
      let finalMeal = meal_type;
      if (id && (!finalDay || !finalMeal)) {
        const db = await getDb();
        const existing = await db.get("SELECT day_of_week, meal_type FROM weekly_menu WHERE id = ?", [id]);
        if (existing) {
          finalDay = existing.day_of_week;
          finalMeal = existing.meal_type;
        }
      }
      sendNotification(
        'Meal Plan Updated',
        `The meal plan for ${finalDay || ''} ${finalMeal || ''} has been updated to "${mealName}".`,
        'Meal Plan Updated'
      );
    } catch (err) {
      console.error('Failed to trigger Meal Plan Updated notification:', err.message);
    }

    res.json({ message: 'Menu updated successfully', id: entryId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/menu/:id - Delete a menu entry
app.delete('/api/menu/:id', authenticate, requirePermission('planner', 'full'), async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get entry info first for notification
    let finalDay = '';
    let finalMeal = '';
    let mealName = '';
    try {
      const db = await getDb();
      const existing = await db.get("SELECT * FROM weekly_menu WHERE id = ?", [id]);
      if (existing) {
        finalDay = existing.day_of_week;
        finalMeal = existing.meal_type;
        if (existing.custom_meal) {
          mealName = existing.custom_meal;
        } else if (existing.recipe_id) {
          const recipe = await getRecipeById(existing.recipe_id);
          if (recipe) mealName = recipe.title;
        } else if (existing.leftover_id) {
          const leftover = await db.get("SELECT name FROM leftovers WHERE id = ?", [existing.leftover_id]);
          if (leftover) mealName = `Leftover: ${leftover.name}`;
        }
      }
    } catch (e) {
      console.error("Failed to query deleted entry info:", e);
    }

    await deleteWeeklyMenuEntry(id);

    if (finalDay && finalMeal) {
      try {
        sendNotification(
          'Meal Plan Updated',
          `The meal "${mealName}" has been removed from the plan for ${finalDay} ${finalMeal}.`,
          'Meal Plan Updated'
        );
      } catch (err) {
        console.error('Failed to trigger Meal Plan Updated notification:', err.message);
      }
    }

    res.json({ message: 'Menu entry deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/menu - Clear all menu entries
app.delete('/api/menu', authenticate, requirePermission('planner', 'full'), async (req, res) => {
  try {
    await clearWeeklyMenu();
    try {
      sendNotification(
        'Meal Plan Cleared',
        'The entire weekly meal plan has been cleared.',
        'Meal Plan Updated'
      );
    } catch (err) {
      console.error('Failed to trigger Meal Plan Cleared notification:', err.message);
    }
    res.json({ message: 'Entire weekly menu cleared successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/custom-meals - Get retained custom meals
app.get('/api/custom-meals', authenticate, requirePermission('planner', 'read'), async (req, res) => {
  try {
    const meals = await getCustomMeals();
    res.json(meals);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/tags - Get retained tags
app.get('/api/tags', authenticate, requirePermission('planner', 'read'), async (req, res) => {
  try {
    const tags = await getReusableTags();
    res.json(tags);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- SHOPPING LIST ENDPOINT ---

// Helpers for shopping list merges
function parseAmount(amountStr) {
  if (!amountStr) return 0;
  let str = String(amountStr).trim();
  
  // Convert standard unicode fractions to ascii fractions
  const uniFractions = { '½': '0.5', '⅓': '0.33', '⅔': '0.66', '¼': '0.25', '¾': '0.75' };
  for (const [uni, asc] of Object.entries(uniFractions)) {
    str = str.replace(uni, asc);
  }

  // Handle formats like "1 1/2" or "1-2" (take average or lower bound)
  if (str.includes('-')) {
    str = str.split('-')[0].trim();
  }
  
  if (str.includes('/')) {
    const parts = str.split(/\s+/);
    let val = 0;
    for (const part of parts) {
      if (part.includes('/')) {
        const [num, den] = part.split('/').map(Number);
        if (den) val += num / den;
      } else {
        val += Number(part) || 0;
      }
    }
    return val;
  }
  return Number(str) || 0;
}

function formatAmount(value) {
  if (value % 1 === 0) return String(value);
  const decimals = value % 1;
  const integerPart = Math.floor(value);
  
  let frac = '';
  // Check common fractions
  if (Math.abs(decimals - 0.5) < 0.05) frac = '1/2';
  else if (Math.abs(decimals - 0.25) < 0.05) frac = '1/4';
  else if (Math.abs(decimals - 0.75) < 0.05) frac = '3/4';
  else if (Math.abs(decimals - 0.33) < 0.05) frac = '1/3';
  else if (Math.abs(decimals - 0.66) < 0.05) frac = '2/3';

  if (frac) {
    return integerPart > 0 ? `${integerPart} ${frac}` : frac;
  }
  return value.toFixed(2).replace(/\.?0+$/, '');
}

function categorizeIngredient(name) {
  const nameLower = name.toLowerCase();
  
  const produce = ['onion', 'garlic', 'tomato', 'cilantro', 'spinach', 'lettuce', 'lemon', 'lime', 'potato', 'apple', 'banana', 'ginger', 'pepper', 'carrot', 'basil', 'parsley', 'herb', 'cucumber', 'avocado', 'cabbage', 'broccoli', 'mushroom', 'celery', 'zucchini', 'squash', 'shallot', 'scallion', 'chive', 'rosemary', 'thyme', 'oregano', 'mint', 'berry', 'strawberry', 'blueberry', 'raspberry', 'fruit', 'vegetable', 'greens', 'asparagus', 'kale', 'cilantro'];
  const meat = ['chicken', 'beef', 'pork', 'bacon', 'sausage', 'steak', 'shrimp', 'fish', 'salmon', 'turkey', 'breast', 'thigh', 'ground', 'lamb', 'ham', 'rib', 'meat', 'seafood', 'crab', 'lobster', 'tuna', 'veal', 'venison', 'pepperoni'];
  const dairy = ['milk', 'cheese', 'butter', 'cream', 'yogurt', 'egg', 'sour cream', 'cheddar', 'parmesan', 'mozzarella', 'ricotta', 'ghee', 'half-and-half', 'buttermilk', 'margarine', 'feta', 'provolone'];
  const bakery = ['bread', 'bun', 'roll', 'tortilla', 'pita', 'baguette', 'loaf', 'crust', 'naan', 'wrap'];
  const pantry = ['flour', 'sugar', 'salt', 'pepper', 'oil', 'vinegar', 'sauce', 'rice', 'pasta', 'noodle', 'bean', 'spice', 'powder', 'extract', 'honey', 'maple', 'broth', 'stock', 'can', 'canned', 'soy sauce', 'mayo', 'mustard', 'ketchup', 'vanilla', 'soda', 'yeast', 'cinnamon', 'cumin', 'chili', 'oregano', 'paprika', 'bouillon', 'chickpea', 'lentil', 'nut', 'almond', 'peanut', 'cashew', 'seed', 'dressing', 'syrup', 'tahini', 'cocoa', 'chocolate', 'chips', 'breadcrumbs', 'caper', 'olives', 'jam', 'jelly', 'broth', 'marinade'];
  const frozen = ['frozen', 'ice cream', 'ice', 'waffles', 'veggies'];

  if (meat.some(k => nameLower.includes(k))) return 'Meat & Seafood';
  if (produce.some(k => nameLower.includes(k))) return 'Produce';
  if (dairy.some(k => nameLower.includes(k))) return 'Dairy & Eggs';
  if (bakery.some(k => nameLower.includes(k))) return 'Bakery';
  if (pantry.some(k => nameLower.includes(k))) return 'Pantry';
  if (frozen.some(k => nameLower.includes(k))) return 'Frozen';
  
  return 'Other';
}

// --- SHOPPING LIST ENDPOINTS (MULTIPLE LISTS & PER-USER LIST SHARING) ---

// Verify helper function to check permission/access
async function verifyListAccess(listId, userId, requiredAccess = 'read') {
  const db = await getDb();
  const listInfo = await db.get(`
    SELECT sl.id, sl.name, sl.owner_id,
           CASE WHEN sl.owner_id = ? THEN 'owner'
                ELSE (SELECT permission FROM shopping_list_shares WHERE list_id = ? AND shared_with_user_id = ?)
           END as permission
    FROM shopping_lists sl WHERE sl.id = ?
  `, [userId, listId, userId, listId]);

  if (!listInfo) return { allowed: false, status: 404, error: 'Shopping list not found' };
  
  if (requiredAccess === 'write') {
    if (listInfo.permission === 'owner' || listInfo.permission === 'edit') {
      return { allowed: true, permission: listInfo.permission, ownerId: listInfo.owner_id };
    }
    return { allowed: false, status: 403, error: 'Forbidden: You do not have write access to this list' };
  } else if (requiredAccess === 'owner') {
    if (listInfo.permission === 'owner') {
      return { allowed: true, permission: 'owner', ownerId: listInfo.owner_id };
    }
    return { allowed: false, status: 403, error: 'Forbidden: Only the list owner can perform this action' };
  } else {
    // read access
    if (listInfo.permission) {
      return { allowed: true, permission: listInfo.permission, ownerId: listInfo.owner_id };
    }
    return { allowed: false, status: 403, error: 'Forbidden: You do not have access to this list' };
  }
}

// GET /api/users/list-sharing - Returns list of users to select for sharing (exclude self)
app.get('/api/users/list-sharing', authenticate, async (req, res) => {
  try {
    const users = await getAllUsers();
    const otherUsers = users
      .filter(u => u.id !== req.user.id)
      .map(u => ({ id: u.id, username: u.username }));
    res.json(otherUsers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/users/assignable - Returns list of all users for assignment in meal planner
app.get('/api/users/assignable', authenticate, async (req, res) => {
  try {
    const users = await getAllUsers();
    const mapped = users.map(u => ({
      id: u.id,
      username: u.username,
      display_name: u.display_name || u.username
    }));
    res.json(mapped);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/shopping-lists - List all accessible shopping lists
app.get('/api/shopping-lists', authenticate, requirePermission('shopping_list', 'read'), async (req, res) => {
  try {
    const lists = await getShoppingListsForUser(req.user.id);
    res.json(lists);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/shopping-lists - Create a new shopping list
app.post('/api/shopping-lists', authenticate, requirePermission('shopping_list', 'full'), async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Missing or empty list name' });
    }
    const listId = await createShoppingList(name.trim(), req.user.id);
    res.status(201).json({ id: listId, message: 'Shopping list created successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/shopping-lists/:id - Rename a shopping list (Owner only)
app.put('/api/shopping-lists/:id', authenticate, requirePermission('shopping_list', 'full'), async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Missing or empty list name' });
    }
    const access = await verifyListAccess(req.params.id, req.user.id, 'owner');
    if (!access.allowed) {
      return res.status(access.status).json({ error: access.error });
    }
    await renameShoppingList(req.params.id, name.trim());
    res.json({ message: 'Shopping list renamed successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/shopping-lists/:id - Delete a shopping list (Owner only)
app.delete('/api/shopping-lists/:id', authenticate, requirePermission('shopping_list', 'full'), async (req, res) => {
  try {
    const access = await verifyListAccess(req.params.id, req.user.id, 'owner');
    if (!access.allowed) {
      return res.status(access.status).json({ error: access.error });
    }
    await deleteShoppingList(req.params.id);
    res.json({ message: 'Shopping list deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/shopping-lists/:id - Fetch specific list details (read access)
app.get('/api/shopping-lists/:id', authenticate, requirePermission('shopping_list', 'read'), async (req, res) => {
  try {
    const details = await getShoppingListDetails(req.params.id, req.user.id);
    if (!details) {
      return res.status(404).json({ error: 'Shopping list not found or no access' });
    }
    res.json(details);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/shopping-lists/:id/recipes - Link a recipe and copy ingredients (write access)
app.post('/api/shopping-lists/:id/recipes', authenticate, requirePermission('shopping_list', 'full'), async (req, res) => {
  try {
    const { recipe_id } = req.body;
    if (!recipe_id) {
      return res.status(400).json({ error: 'Missing recipe_id' });
    }
    const access = await verifyListAccess(req.params.id, req.user.id, 'write');
    if (!access.allowed) {
      return res.status(access.status).json({ error: access.error });
    }
    await addRecipeToShoppingList(req.params.id, recipe_id);
    res.json({ message: 'Recipe ingredients added to shopping list successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/shopping-lists/:id/recipes/:recipeId - Remove recipe from shopping list (write access)
app.delete('/api/shopping-lists/:id/recipes/:recipeId', authenticate, requirePermission('shopping_list', 'full'), async (req, res) => {
  try {
    const access = await verifyListAccess(req.params.id, req.user.id, 'write');
    if (!access.allowed) {
      return res.status(access.status).json({ error: access.error });
    }
    await removeRecipeFromShoppingList(req.params.id, req.params.recipeId);
    res.json({ message: 'Recipe ingredients removed from shopping list' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/shopping-lists/:id/items - Add custom manual item (write access)
app.post('/api/shopping-lists/:id/items', authenticate, requirePermission('shopping_list', 'full'), async (req, res) => {
  try {
    const { name, amount, unit, category, is_checked } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Missing item name' });
    }
    const access = await verifyListAccess(req.params.id, req.user.id, 'write');
    if (!access.allowed) {
      return res.status(access.status).json({ error: access.error });
    }
    const itemId = await addCustomShoppingListItem(req.params.id, {
      name: name.trim(),
      amount: amount || '',
      unit: unit || '',
      category: category || 'Other',
      is_checked: is_checked ? 1 : 0
    });
    res.status(201).json({ id: itemId, message: 'Custom item added successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/shopping-lists/:id/items/:itemId - Update custom/copied item (check/edit) (write access)
app.put('/api/shopping-lists/:id/items/:itemId', authenticate, requirePermission('shopping_list', 'full'), async (req, res) => {
  try {
    const { name, amount, unit, category, is_checked } = req.body;
    const access = await verifyListAccess(req.params.id, req.user.id, 'write');
    if (!access.allowed) {
      return res.status(access.status).json({ error: access.error });
    }
    const updates = {};
    if (name !== undefined) updates.name = name.trim();
    if (amount !== undefined) updates.amount = amount;
    if (unit !== undefined) updates.unit = unit;
    if (category !== undefined) updates.category = category;
    if (is_checked !== undefined) updates.is_checked = is_checked ? 1 : 0;

    await updateShoppingListItem(req.params.itemId, updates);
    res.json({ message: 'Item updated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/shopping-lists/:id/items/:itemId - Delete item from list (write access)
app.delete('/api/shopping-lists/:id/items/:itemId', authenticate, requirePermission('shopping_list', 'full'), async (req, res) => {
  try {
    const access = await verifyListAccess(req.params.id, req.user.id, 'write');
    if (!access.allowed) {
      return res.status(access.status).json({ error: access.error });
    }
    await deleteShoppingListItem(req.params.itemId);
    res.json({ message: 'Item deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/shopping-lists/:id/shares - Share list with another user (Owner only)
app.post('/api/shopping-lists/:id/shares', authenticate, requirePermission('shopping_list', 'full'), async (req, res) => {
  try {
    const { shared_with_user_id, permission } = req.body;
    if (!shared_with_user_id) {
      return res.status(400).json({ error: 'Missing shared_with_user_id' });
    }
    const access = await verifyListAccess(req.params.id, req.user.id, 'owner');
    if (!access.allowed) {
      return res.status(access.status).json({ error: access.error });
    }
    if (parseInt(shared_with_user_id) === req.user.id) {
      return res.status(400).json({ error: 'Cannot share a list with yourself' });
    }
    await shareShoppingList(req.params.id, shared_with_user_id, permission || 'view');
    res.json({ message: 'Shopping list shared successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/shopping-lists/:id/shares/:shareId - Revoke sharing permission (Owner only)
app.delete('/api/shopping-lists/:id/shares/:shareId', authenticate, requirePermission('shopping_list', 'full'), async (req, res) => {
  try {
    const access = await verifyListAccess(req.params.id, req.user.id, 'owner');
    if (!access.allowed) {
      return res.status(access.status).json({ error: access.error });
    }
    await removeShoppingListShare(req.params.id, req.params.shareId);
    res.json({ message: 'Sharing permission revoked successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/shopping-lists/:id/reset - Clear all items and recipes from a list (write access)
app.post('/api/shopping-lists/:id/reset', authenticate, requirePermission('shopping_list', 'full'), async (req, res) => {
  try {
    const access = await verifyListAccess(req.params.id, req.user.id, 'write');
    if (!access.allowed) {
      return res.status(access.status).json({ error: access.error });
    }
    await clearShoppingListItems(req.params.id);
    res.json({ message: 'Shopping list cleared successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- WORD TEMPLATE ENDPOINTS ---

// GET /api/templates - List word templates
app.get('/api/templates', authenticate, async (req, res) => {
  try {
    const templates = await getAllTemplates();
    res.json(templates);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/templates - Upload a word template
app.post('/api/templates', authenticate, requirePermission('recipes', 'full'), upload.single('template'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No template file uploaded' });
    }
    const name = req.body.name || req.file.originalname.replace(/\.[^/.]+$/, '');
    const id = await addTemplate(name, `/templates/${req.file.filename}`, 0);
    res.status(201).json({ id, message: 'Template uploaded successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/templates/:id/default - Set template as default
app.post('/api/templates/:id/default', authenticate, requirePermission('recipes', 'full'), async (req, res) => {
  try {
    const success = await setDefaultTemplate(req.params.id);
    if (!success) {
      return res.status(404).json({ error: 'Template not found' });
    }
    res.json({ message: 'Default template set successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/templates/:id - Delete template
app.delete('/api/templates/:id', authenticate, requirePermission('recipes', 'full'), async (req, res) => {
  try {
    const filePath = await deleteTemplate(req.params.id);
    if (!filePath) {
      return res.status(404).json({ error: 'Template not found' });
    }

    // Attempt to delete physical file
    const fullPath = path.join(DATA_DIR, filePath.replace(/^\//, ''));
    if (fs.existsSync(fullPath) && !fullPath.includes('default_template.docx')) {
      fs.unlinkSync(fullPath);
    }
    res.json({ message: 'Template deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/recipes/:id/export - Export recipe to Word Document
app.get('/api/recipes/:id/export', authenticate, requirePermission('recipes', 'read'), async (req, res) => {
  try {
    const recipeId = req.params.id;
    const templateId = req.query.templateId;

    const recipe = await getRecipeById(recipeId);
    if (!recipe) {
      return res.status(404).json({ error: 'Recipe not found' });
    }

    let templateRecord;
    if (templateId) {
      templateRecord = await getTemplateById(templateId);
    } else {
      templateRecord = await getDefaultTemplate();
    }

    if (!templateRecord) {
      return res.status(404).json({ error: 'No document template found.' });
    }

    const templateFullPath = path.join(DATA_DIR, templateRecord.file_path.replace(/^\//, ''));
    if (!fs.existsSync(templateFullPath)) {
      return res.status(404).json({ error: `Template file not found on disk at: ${templateRecord.file_path}` });
    }

    console.log(`Generating DOCX for recipe "${recipe.title}" using template "${templateRecord.name}"`);
    const docBuffer = renderRecipeDocx(templateFullPath, recipe);

    // Set download headers
    const safeTitle = recipe.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="recipe_${safeTitle}.docx"`);
    res.send(docBuffer);

  } catch (error) {
    console.error('Word export failed:', error);
    res.status(500).json({ error: 'Failed to export Word document: ' + error.message });
  }
});


// --- LEFTOVERS ENDPOINTS ---

app.get('/api/leftovers', authenticate, async (req, res) => {
  try {
    const list = await getAllLeftovers();
    res.json(list);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/leftovers', authenticate, requirePermission('planner', 'full'), async (req, res) => {
  try {
    const { name, recipe_id, servings, expiration_date } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Missing leftover name' });
    }
    const id = await createLeftover(name, recipe_id, servings || 1, expiration_date);
    sendNotification(
      'Meal Added to Leftovers',
      `A new leftover has been recorded: "${name}" with ${servings || 1} servings.`,
      'Meal Added to Leftovers'
    );
    res.status(201).json({ id, message: 'Leftover recorded successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/leftovers/:id', authenticate, requirePermission('planner', 'full'), async (req, res) => {
  try {
    const success = await deleteLeftover(req.params.id);
    if (!success) {
      return res.status(404).json({ error: 'Leftover not found' });
    }
    res.json({ message: 'Leftover consumed/deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- INVENTORY ENDPOINTS ---

// GET /api/inventory/lookup-barcode/:barcode - Look up barcode info via server-side APIs to bypass CORS
app.get('/api/inventory/lookup-barcode/:barcode', authenticate, async (req, res) => {
  const { barcode } = req.params;
  
  // 1. Try Open Food Facts
  try {
    const offRes = await fetch(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`, {
      headers: {
        'User-Agent': 'FamilyCookbookApp/1.0 (Node.js)'
      }
    });
    if (offRes.ok) {
      const offData = await offRes.json();
      if (offData.status === 1 && offData.product) {
        const prod = offData.product;
        const name = prod.product_name || prod.product_name_en || '';
        const brand = prod.brands ? prod.brands.split(',')[0].trim() : '';
        const displayName = brand ? `${brand} ${name}` : name;
        
        let mappedCategory = 'Other';
        const catText = ((prod.categories || '') + ' ' + (prod.categories_tags || []).join(' ')).toLowerCase();
        if (catText.includes('produce') || catText.includes('fruit') || catText.includes('vegetable')) {
          mappedCategory = 'Produce';
        } else if (catText.includes('meat') || catText.includes('seafood') || catText.includes('fish') || catText.includes('poultry') || catText.includes('beef') || catText.includes('chicken') || catText.includes('pork')) {
          mappedCategory = 'Meat & Seafood';
        } else if (catText.includes('dairy') || catText.includes('egg') || catText.includes('cheese') || catText.includes('milk') || catText.includes('yogurt')) {
          mappedCategory = 'Dairy & Eggs';
        } else if (catText.includes('bakery') || catText.includes('bread') || catText.includes('cake') || catText.includes('pastry')) {
          mappedCategory = 'Bakery';
        } else if (catText.includes('frozen') || catText.includes('ice cream')) {
          mappedCategory = 'Frozen';
        } else if (catText.includes('pantry') || catText.includes('groceries') || catText.includes('snack') || catText.includes('beverage') || catText.includes('sauce') || catText.includes('condiment') || catText.includes('canned') || catText.includes('cereal') || catText.includes('pasta') || catText.includes('spice')) {
          mappedCategory = 'Pantry';
        }

        let sizeNumVal = '';
        let sizeUnitVal = '';
        const quantityStr = prod.quantity || '';
        if (quantityStr) {
          const match = quantityStr.trim().match(/^([\d.,]+)\s*(.*)$/);
          if (match) {
            sizeNumVal = match[1].replace(',', '.');
            sizeUnitVal = match[2];
          }
        }

        return res.json({
          source: 'openfoodfacts',
          title: displayName || barcode,
          category: mappedCategory,
          size_number: sizeNumVal,
          size_unit: sizeUnitVal
        });
      }
    }
  } catch (err) {
    console.error("Open Food Facts lookup failed in backend:", err.message);
  }

  // 2. Try UPCitemdb
  try {
    const upcRes = await fetch(`https://api.upcitemdb.com/prod/trial/lookup?upc=${barcode}`);
    if (upcRes.ok) {
      const upcData = await upcRes.json();
      if (upcData.code === 'OK' && upcData.items && upcData.items.length > 0) {
        const item = upcData.items[0];
        const name = item.title || '';
        const brand = item.brand || '';
        const displayName = brand && !name.toLowerCase().includes(brand.toLowerCase()) 
          ? `${brand} ${name}` 
          : name;

        let mappedCategory = 'Other';
        const catText = (item.category || '').toLowerCase();
        if (catText.includes('produce') || catText.includes('fruit') || catText.includes('vegetable')) {
          mappedCategory = 'Produce';
        } else if (catText.includes('meat') || catText.includes('seafood') || catText.includes('fish') || catText.includes('poultry') || catText.includes('beef') || catText.includes('chicken') || catText.includes('pork')) {
          mappedCategory = 'Meat & Seafood';
        } else if (catText.includes('dairy') || catText.includes('egg') || catText.includes('cheese') || catText.includes('milk') || catText.includes('yogurt')) {
          mappedCategory = 'Dairy & Eggs';
        } else if (catText.includes('bakery') || catText.includes('bread') || catText.includes('cake') || catText.includes('pastry')) {
          mappedCategory = 'Bakery';
        } else if (catText.includes('frozen') || catText.includes('ice cream')) {
          mappedCategory = 'Frozen';
        } else if (catText.includes('pantry') || catText.includes('groceries') || catText.includes('snack') || catText.includes('beverage') || catText.includes('sauce') || catText.includes('condiment') || catText.includes('canned') || catText.includes('cereal') || catText.includes('pasta') || catText.includes('spice')) {
          mappedCategory = 'Pantry';
        }

        let sizeNumVal = '';
        let sizeUnitVal = '';
        const titleQuantityMatch = (displayName + ' ' + (item.description || '')).match(/([\d.,]+)\s*(oz|ounce|lbs|pound|g|gram|kg|kilogram|ml|liter|l|pack|ct|count)/i);
        if (titleQuantityMatch) {
          sizeNumVal = titleQuantityMatch[1].replace(',', '.');
          sizeUnitVal = titleQuantityMatch[2].toLowerCase();
        }

        return res.json({
          source: 'upcitemdb',
          title: displayName || barcode,
          category: mappedCategory,
          size_number: sizeNumVal,
          size_unit: sizeUnitVal
        });
      }
    }
  } catch (err) {
    console.error("UPCitemdb lookup failed in backend:", err.message);
  }

  // Not found in either, return 404
  res.status(404).json({ error: 'Product not found' });
});

// GET /api/inventory - Retrieve all inventory items
app.get('/api/inventory', authenticate, async (req, res) => {
  try {
    const list = await getAllInventory();
    res.json(list);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/inventory - Add a new inventory item
app.post('/api/inventory', authenticate, async (req, res) => {
  try {
    const { title, category, date_added, expiration_date, percentage_used, size_number, size_unit } = req.body;
    if (!title || !category || !date_added) {
      return res.status(400).json({ error: 'Missing title, category, or date_added' });
    }
    const id = await createInventoryItem({
      title,
      category,
      date_added,
      expiration_date,
      percentage_used,
      size_number,
      size_unit
    });
    res.status(201).json({ id, message: 'Inventory item created successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/inventory/:id - Update an inventory item
app.put('/api/inventory/:id', authenticate, async (req, res) => {
  try {
    const { title, category, date_added, expiration_date, percentage_used, size_number, size_unit } = req.body;
    const success = await updateInventoryItem(req.params.id, {
      title,
      category,
      date_added,
      expiration_date,
      percentage_used,
      size_number,
      size_unit
    });
    if (!success) {
      return res.status(404).json({ error: 'Inventory item not found or no changes made' });
    }
    res.json({ message: 'Inventory item updated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/inventory/:id - Delete an inventory item
app.delete('/api/inventory/:id', authenticate, async (req, res) => {
  try {
    const success = await deleteInventoryItem(req.params.id);
    if (!success) {
      return res.status(404).json({ error: 'Inventory item not found' });
    }
    res.json({ message: 'Inventory item deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/inventory/bulk-delete - Bulk delete inventory items
app.post('/api/inventory/bulk-delete', authenticate, async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'No inventory item IDs provided' });
    }
    const count = await deleteInventoryItemsBulk(ids);
    res.json({ message: `Successfully deleted ${count} inventory items.` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/inventory/bulk-update - Bulk update inventory items
app.post('/api/inventory/bulk-update', authenticate, async (req, res) => {
  try {
    const { ids, updates } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0 || !updates) {
      return res.status(400).json({ error: 'Missing ids or updates' });
    }
    const count = await updateInventoryItemsBulk(ids, updates);
    res.json({ message: `Successfully updated ${count} inventory items.` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// --- LIBRARY / BOOK API ENDPOINTS ---
// ============================================================================

function getLocalDateString(utcDateStr, timezone) {
  const date = new Date(utcDateStr);
  try {
    const dtf = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone || 'UTC',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    return dtf.format(date);
  } catch (e) {
    return utcDateStr.substring(0, 10);
  }
}

// GET /api/books - Search, sort and filter library catalogue
app.get('/api/books', authenticate, async (req, res) => {
  try {
    const search = req.query.q || '';
    const tag = req.query.tag || '';
    const status = req.query.status || 'library'; // library, archived, all
    const books = await getAllBooks(search, tag, status);
    res.json(books);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/books/recent - Recently added books
app.get('/api/books/recent', authenticate, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 4;
    const books = await getRecentBooks(limit);
    res.json(books);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/books/:id - Details of a book
app.get('/api/books/:id', authenticate, async (req, res) => {
  try {
    const book = await getBookById(req.params.id);
    if (!book) {
      return res.status(404).json({ error: 'Book not found' });
    }
    res.json(book);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/books - Add book manually
app.post('/api/books', authenticate, upload.single('cover'), async (req, res) => {
  try {
    const bookData = JSON.parse(req.body.book);
    if (req.file) {
      bookData.cover_url = `/uploads/${req.file.filename}`;
    }
    bookData.added_by = req.user.id;
    const id = await createBook(bookData);
    sendNotification('Book Added', `A new book has been added to the library: "${bookData.title}" by ${bookData.author || 'Unknown'}.`, 'Book Added');
    res.status(201).json({ id, message: 'Book created successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/books/:id - Update book details
app.put('/api/books/:id', authenticate, upload.single('cover'), async (req, res) => {
  try {
    const bookData = JSON.parse(req.body.book);
    if (req.file) {
      bookData.cover_url = `/uploads/${req.file.filename}`;
    }
    await updateBook(req.params.id, bookData);
    res.json({ message: 'Book updated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/books/:id - Delete book
app.delete('/api/books/:id', authenticate, async (req, res) => {
  try {
    const book = await getBookById(req.params.id);
    if (book && book.cover_url && book.cover_url.startsWith('/uploads/')) {
      const fullPath = path.join(DATA_DIR, book.cover_url.replace(/^\//, ''));
      if (fs.existsSync(fullPath)) {
        try { fs.unlinkSync(fullPath); } catch (e) {}
      }
    }
    const success = await deleteBook(req.params.id);
    if (!success) {
      return res.status(404).json({ error: 'Book not found' });
    }
    if (book) {
      sendNotification('Book Deleted', `The book "${book.title}" was deleted.`, 'Book Deleted');
    }
    res.json({ message: 'Book deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/books/isbn-lookup - Fetch details by ISBN
app.post('/api/books/isbn-lookup', authenticate, async (req, res) => {
  try {
    const { isbn } = req.body;
    if (!isbn) {
      return res.status(400).json({ error: 'Missing ISBN' });
    }
    const cleanIsbn = isbn.replace(/[^0-9X]/gi, '');
    if (!cleanIsbn) {
      return res.status(400).json({ error: 'Invalid ISBN format' });
    }

    let bookDetails = null;

    // Primary: Open Library Data API
    if (!bookDetails) {
      try {
        console.log(`Querying Open Library for ISBN: ${cleanIsbn}`);
        const response = await fetch(`https://openlibrary.org/api/books?bibkeys=ISBN:${cleanIsbn}&format=json&jscmd=data`);
        if (response.ok) {
          const data = await response.json();
          const bibKey = `ISBN:${cleanIsbn}`;
          if (data && data[bibKey]) {
            const b = data[bibKey];
            bookDetails = {
              isbn: cleanIsbn,
              title: b.title,
              author: Array.isArray(b.authors) ? b.authors.map(a => a.name).join(', ') : '',
              publisher: Array.isArray(b.publishers) ? b.publishers.map(p => p.name).join(', ') : '',
              published_date: b.publish_date || '',
              description: b.notes || '',
              cover_url: b.cover ? (b.cover.large || b.cover.medium || b.cover.small || '') : '',
              total_pages: b.number_of_pages || 0
            };
          }
        }
      } catch (e) {
        console.error('Error fetching from Open Library Data API:', e);
      }
    }

    // Fallback 2: Open Library ISBN JSON API
    if (!bookDetails) {
      try {
        const response = await fetch(`https://openlibrary.org/isbn/${cleanIsbn}.json`);
        if (response.ok) {
          const b = await response.json();
          bookDetails = {
            isbn: cleanIsbn,
            title: b.title,
            author: '',
            publisher: Array.isArray(b.publishers) ? b.publishers.join(', ') : '',
            published_date: b.publish_date || '',
            description: b.description ? (typeof b.description === 'string' ? b.description : b.description.value) : '',
            cover_url: b.covers && b.covers.length > 0 ? `https://covers.openlibrary.org/b/id/${b.covers[0]}-L.jpg` : '',
            total_pages: b.number_of_pages || 0
          };
          
          if (b.authors && b.authors.length > 0) {
            const authorKey = b.authors[0].key || b.authors[0].author?.key;
            if (authorKey) {
              const authorRes = await fetch(`https://openlibrary.org${authorKey}.json`);
              if (authorRes.ok) {
                const authorData = await authorRes.json();
                bookDetails.author = authorData.name;
              }
            }
          }
        }
      } catch (e) {
        console.error('Error fetching from Open Library ISBN API:', e);
      }
    }

    if (!bookDetails) {
      return res.status(404).json({ error: 'Book details not found for this ISBN. You can still enter details manually.' });
    }

    res.json(bookDetails);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/books/bulk-delete
app.post('/api/books/bulk-delete', authenticate, async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'No IDs provided' });
    }
    
    // Clean up files first
    for (const id of ids) {
      const book = await getBookById(id);
      if (book && book.cover_url && book.cover_url.startsWith('/uploads/')) {
        const fullPath = path.join(DATA_DIR, book.cover_url.replace(/^\//, ''));
        if (fs.existsSync(fullPath)) {
          try { fs.unlinkSync(fullPath); } catch (e) {}
        }
      }
    }

    const count = await bulkDeleteBooks(ids);
    sendNotification('Book Deleted', `Bulk deleted ${count} books from the library.`, 'Book Deleted');
    res.json({ message: `Successfully deleted ${count} books.` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/books/bulk-archive
app.post('/api/books/bulk-archive', authenticate, async (req, res) => {
  try {
    const { ids, archive } = req.body; // archive = true/false
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'No IDs provided' });
    }
    const status = archive ? 'archived' : 'library';
    const count = await bulkArchiveBooks(ids, status);
    res.json({ message: `Successfully ${archive ? 'archived' : 'unarchived'} ${count} books.` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/books/bulk-tag
app.post('/api/books/bulk-tag', authenticate, async (req, res) => {
  try {
    const { ids, tags, action } = req.body; // action = 'add' / 'remove' / 'set'
    if (!ids || !Array.isArray(ids) || ids.length === 0 || tags === undefined) {
      return res.status(400).json({ error: 'Missing ids or tags parameter' });
    }
    const count = await bulkTagBooks(ids, tags, action || 'add');
    res.json({ message: `Successfully updated tags for ${count} books.` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- READING LIST ENDPOINTS ---

// GET /api/reading-lists - Get user's reading lists
app.get('/api/reading-lists', authenticate, async (req, res) => {
  try {
    const lists = await getReadingListsForUser(req.user.id);
    res.json(lists);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/reading-lists - Create a new reading list
app.post('/api/reading-lists', authenticate, async (req, res) => {
  try {
    const { name, description, is_public } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Name is required' });
    }
    const id = await createReadingList(req.user.id, name.trim(), description || '', is_public);
    res.status(201).json({ id, message: 'Reading list created successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/reading-lists/:id - Update reading list details
app.put('/api/reading-lists/:id', authenticate, async (req, res) => {
  try {
    const { name, description, is_public } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Name is required' });
    }
    // Verify ownership
    const list = await getReadingListById(req.params.id);
    if (!list || list.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }
    await updateReadingList(req.params.id, name.trim(), description || '', is_public);
    res.json({ message: 'Reading list updated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/reading-lists/:id - Delete a reading list
app.delete('/api/reading-lists/:id', authenticate, async (req, res) => {
  try {
    const list = await getReadingListById(req.params.id);
    if (!list || list.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }
    await deleteReadingList(req.params.id);
    res.json({ message: 'Reading list deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/reading-lists/share/:token - Public view of shared list (NO auth required)
app.get('/api/reading-lists/share/:token', async (req, res) => {
  try {
    const result = await getSharedReadingList(req.params.token);
    if (!result) {
      return res.status(404).json({ error: 'Shared reading list not found or is private' });
    }
    
    // Get user's display name or username
    const db = await getDb();
    const listOwner = await db.get('SELECT username, display_name FROM users WHERE id = ?', [result.list.user_id]);
    result.owner_name = listOwner ? (listOwner.display_name || listOwner.username) : 'Unknown User';
    
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/reading-list - Get items of a reading list
app.get('/api/reading-list', authenticate, async (req, res) => {
  try {
    const listId = req.query.reading_list_id;
    if (listId) {
      const list = await getReadingListById(listId);
      if (!list || (list.user_id !== req.user.id && list.is_public !== 1)) {
        return res.status(403).json({ error: 'Access denied' });
      }
      const items = await getReadingListItems(listId);
      return res.json(items);
    }
    
    // Fallback: Get first list or create a default one
    const userLists = await getReadingListsForUser(req.user.id);
    let targetListId;
    if (userLists.length === 0) {
      targetListId = await createReadingList(req.user.id, 'My Reading List', 'My default reading list.', 0);
    } else {
      const sorted = [...userLists].sort((a, b) => a.id - b.id);
      targetListId = sorted[0].id;
    }
    const items = await getReadingListItems(targetListId);
    res.json(items);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/reading-list - Add item to reading list
app.post('/api/reading-list', authenticate, async (req, res) => {
  try {
    const { book_id, manualBook, reading_list_id } = req.body;
    if (!book_id && !manualBook) {
      return res.status(400).json({ error: 'Missing book details' });
    }
    
    let targetListId = reading_list_id;
    if (!targetListId) {
      const userLists = await getReadingListsForUser(req.user.id);
      if (userLists.length === 0) {
        targetListId = await createReadingList(req.user.id, 'My Reading List', 'My default reading list.', 0);
      } else {
        const sorted = [...userLists].sort((a, b) => a.id - b.id);
        targetListId = sorted[0].id;
      }
    } else {
      const list = await getReadingListById(targetListId);
      if (!list || list.user_id !== req.user.id) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }
    
    const id = await addBookToReadingList(req.user.id, book_id, manualBook, targetListId);
    res.status(201).json({ id, message: 'Added to reading list successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/reading-list/:id - Remove item from reading list
app.delete('/api/reading-list/:id', authenticate, async (req, res) => {
  try {
    const success = await removeBookFromReadingList(req.user.id, req.params.id);
    if (!success) {
      return res.status(404).json({ error: 'Item not found in reading list' });
    }
    res.json({ message: 'Removed from reading list successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/reading-list/recommendation - Get random recommendation from list
app.get('/api/reading-list/recommendation', authenticate, async (req, res) => {
  try {
    const userLists = await getReadingListsForUser(req.user.id);
    let recommendation = null;
    
    for (const list of userLists) {
      const items = await getReadingListItems(list.id);
      if (items.length > 0) {
        const randomIndex = Math.floor(Math.random() * items.length);
        const rec = items[randomIndex];
        if (rec.book_id) {
          const detail = await getBookById(rec.book_id);
          if (detail) {
            recommendation = { 
              ...rec, 
              description: detail.description, 
              publisher: detail.publisher, 
              published_date: detail.published_date 
            };
            break;
          }
        }
        recommendation = rec;
        break;
      }
    }
    
    if (!recommendation) {
      return res.status(404).json({ error: 'Reading list is empty. Add some books first!' });
    }
    res.json(recommendation);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- DID NOT FINISH (DNF) ENDPOINTS ---

// GET /api/reading-log/dnf - Get paused books
app.get('/api/reading-log/dnf', authenticate, async (req, res) => {
  try {
    const db = await getDb();
    const dnfList = await db.all(`
      SELECT d.*, b.cover_url as lib_cover_url, rl.cover_url as list_cover_url
      FROM dnf_books d
      LEFT JOIN books b ON d.book_id = b.id
      LEFT JOIN reading_list rl ON d.reading_list_id = rl.id
      WHERE d.user_id = ?
      ORDER BY d.created_at DESC
    `, [req.user.id]);
    
    for (const item of dnfList) {
      let latestLog = null;
      if (item.book_id) {
        latestLog = await db.get('SELECT progress_percent FROM reading_log WHERE user_id = ? AND book_id = ? ORDER BY entry_date DESC, id DESC LIMIT 1', [req.user.id, item.book_id]);
      } else if (item.reading_list_id) {
        latestLog = await db.get('SELECT progress_percent FROM reading_log WHERE user_id = ? AND reading_list_id = ? ORDER BY entry_date DESC, id DESC LIMIT 1', [req.user.id, item.reading_list_id]);
      } else {
        latestLog = await db.get('SELECT progress_percent FROM reading_log WHERE user_id = ? AND book_title = ? AND book_id IS NULL AND reading_list_id IS NULL ORDER BY entry_date DESC, id DESC LIMIT 1', [req.user.id, item.book_title]);
      }
      item.latest_progress = latestLog ? latestLog.progress_percent : 0;
    }
    
    res.json(dnfList);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/reading-log/dnf - Mark a book as DNF
app.post('/api/reading-log/dnf', authenticate, async (req, res) => {
  try {
    const { book_id, reading_list_id, book_title, book_author, reason } = req.body;
    const db = await getDb();
    
    if (!book_title) {
      return res.status(400).json({ error: 'Book title is required' });
    }
    
    let existing = null;
    if (book_id) {
      existing = await db.get('SELECT id FROM dnf_books WHERE user_id = ? AND book_id = ?', [req.user.id, book_id]);
    } else if (reading_list_id) {
      existing = await db.get('SELECT id FROM dnf_books WHERE user_id = ? AND reading_list_id = ?', [req.user.id, reading_list_id]);
    } else {
      existing = await db.get('SELECT id FROM dnf_books WHERE user_id = ? AND book_title = ? AND book_id IS NULL AND reading_list_id IS NULL', [req.user.id, book_title]);
    }
    
    if (existing) {
      await db.run('UPDATE dnf_books SET reason = ?, created_at = CURRENT_TIMESTAMP WHERE id = ?', [reason || null, existing.id]);
      return res.json({ id: existing.id, message: 'Updated DNF reason' });
    }
    
    const result = await db.run(`
      INSERT INTO dnf_books (user_id, book_id, reading_list_id, book_title, book_author, reason)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [
      req.user.id,
      book_id || null,
      reading_list_id || null,
      book_title,
      book_author || null,
      reason || null
    ]);
    res.status(201).json({ id: result.lastID, message: 'Book marked as Did Not Finish' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/reading-log/dnf/:id - Resume reading (remove DNF)
app.delete('/api/reading-log/dnf/:id', authenticate, async (req, res) => {
  try {
    const db = await getDb();
    const result = await db.run('DELETE FROM dnf_books WHERE user_id = ? AND id = ?', [req.user.id, req.params.id]);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'DNF entry not found' });
    }
    res.json({ message: 'Resumed book successfully (removed from DNF)' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- READING LOG ENDPOINTS ---

// GET /api/reading-log
app.get('/api/reading-log', authenticate, async (req, res) => {
  try {
    const logs = await getReadingLogsForUser(req.user.id);
    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/reading-log/summary
app.get('/api/reading-log/summary', authenticate, async (req, res) => {
  try {
    const summary = await getBooksLogSummaryForUser(req.user.id);
    res.json(summary);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/reading-log
app.post('/api/reading-log', authenticate, async (req, res) => {
  try {
    const entryData = req.body;
    if (!entryData.book_title && !entryData.book_id && !entryData.reading_list_id) {
      return res.status(400).json({ error: 'Missing book association or title' });
    }

    const db = await getDb();
    const userId = req.user.id;
    const bookId = entryData.book_id || null;
    const bookTitle = entryData.book_title || 'a book';

    let startedBefore = false;
    let completedBefore = false;

    if (bookId) {
      const priorProgress = await db.all(
        'SELECT progress_percent FROM reading_log WHERE user_id = ? AND book_id = ?',
        [userId, bookId]
      );
      startedBefore = priorProgress.some(p => p.progress_percent > 0);
      completedBefore = priorProgress.some(p => p.progress_percent >= 100);
    } else {
      const priorProgress = await db.all(
        'SELECT progress_percent FROM reading_log WHERE user_id = ? AND book_title = ?',
        [userId, bookTitle]
      );
      startedBefore = priorProgress.some(p => p.progress_percent > 0);
      completedBefore = priorProgress.some(p => p.progress_percent >= 100);
    }

    const id = await createReadingLogEntry(userId, entryData);

    sendNotification('Log Entry Added', `A new journal entry was added for: "${bookTitle}" (${entryData.progress_percent || 0}% read).`, 'Log Entry Added');

    const currentProgress = entryData.progress_percent !== undefined ? Number(entryData.progress_percent) : 0;
    if (currentProgress > 0 && !startedBefore) {
      sendNotification('Book Started', `You started reading "${bookTitle}".`, 'Book Started');
    }

    if (currentProgress >= 100 && !completedBefore) {
      sendNotification('Book Completed', `You completed reading "${bookTitle}"!`, 'Book Completed');
    }

    res.status(201).json({ id, message: 'Log entry added successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/reading-log/:id
app.delete('/api/reading-log/:id', authenticate, async (req, res) => {
  try {
    const success = await deleteReadingLogEntry(req.user.id, req.params.id);
    if (!success) {
      return res.status(404).json({ error: 'Log entry not found' });
    }
    res.json({ message: 'Log entry deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/streak
app.get('/api/streak', authenticate, async (req, res) => {
  try {
    const db = await getDb();
    const logs = await db.all(
      'SELECT entry_date FROM reading_log WHERE user_id = ? ORDER BY entry_date DESC',
      [req.user.id]
    );

    if (logs.length === 0) {
      return res.json({ streak: 0 });
    }

    const timezone = req.user.timezone || 'US/New_York';
    
    // Get unique local date strings in descending order
    const localDatesSet = new Set();
    logs.forEach(l => {
      localDatesSet.add(getLocalDateString(l.entry_date, timezone));
    });

    const localDates = Array.from(localDatesSet);

    // Get today and yesterday in user's local timezone
    const now = new Date();
    const todayStr = getLocalDateString(now.toISOString(), timezone);
    
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = getLocalDateString(yesterday.toISOString(), timezone);

    // If neither today nor yesterday has a reading log entry, streak is 0
    if (!localDates.includes(todayStr) && !localDates.includes(yesterdayStr)) {
      return res.json({ streak: 0 });
    }

    // Compute streak
    let streak = 0;
    let checkDate = null;

    for (let i = 0; i < localDates.length; i++) {
      const dateStr = localDates[i];
      if (i === 0) {
        streak = 1;
        checkDate = new Date(dateStr + 'T12:00:00');
        continue;
      }

      // Check if this date is exactly 1 day prior to the checkDate
      const nextExpected = new Date(checkDate);
      nextExpected.setDate(nextExpected.getDate() - 1);
      const nextExpectedStr = getLocalDateString(nextExpected.toISOString(), timezone);

      if (dateStr === nextExpectedStr) {
        streak += 1;
        checkDate = new Date(dateStr + 'T12:00:00');
      } else {
        break;
      }
    }

    res.json({ streak });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/books/:id/comments
app.get('/api/books/:id/comments', authenticate, async (req, res) => {
  try {
    const comments = await getBookComments(req.params.id);
    res.json(comments);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/books/:id/comments
app.post('/api/books/:id/comments', authenticate, async (req, res) => {
  try {
    const { comment } = req.body;
    if (!comment || !comment.trim()) {
      return res.status(400).json({ error: 'Comment content is required' });
    }
    const id = await addBookComment(req.params.id, req.user.id, comment.trim());
    res.status(201).json({ id, message: 'Comment posted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/books/:id/comments/:commentId
app.delete('/api/books/:id/comments/:commentId', authenticate, async (req, res) => {
  try {
    const db = await getDb();
    const comment = await db.get('SELECT user_id FROM book_comments WHERE id = ?', [req.params.commentId]);
    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }
    if (comment.user_id !== req.user.id && req.user.role_name !== 'Administrator') {
      return res.status(403).json({ error: 'Permission denied' });
    }
    await db.run('DELETE FROM book_comments WHERE id = ?', [req.params.commentId]);
    res.json({ message: 'Comment deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/users/list
app.get('/api/users/list', authenticate, async (req, res) => {
  try {
    const db = await getDb();
    const users = await db.all('SELECT id, username, display_name FROM users ORDER BY username ASC');
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/books/:id/recommend
app.post('/api/books/:id/recommend', authenticate, async (req, res) => {
  try {
    const { to_user_id, notes } = req.body;
    if (!to_user_id) {
      return res.status(400).json({ error: 'Target user ID is required' });
    }
    const id = await addBookRecommendation(req.params.id, req.user.id, to_user_id, notes);
    res.status(201).json({ id, message: 'Book recommended successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/recommendations
app.get('/api/recommendations', authenticate, async (req, res) => {
  try {
    const recs = await getRecommendationsForUser(req.user.id);
    res.json(recs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/recommendations/:id
app.delete('/api/recommendations/:id', authenticate, async (req, res) => {
  try {
    const success = await deleteRecommendation(req.params.id, req.user.id);
    if (!success) {
      return res.status(404).json({ error: 'Recommendation not found or access denied' });
    }
    res.json({ message: 'Recommendation deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Helper to fetch from external integrations
async function fetchFromIntegration(appType, endpoint) {
  const db = await getDb();
  const settings = await getSettings();
  let baseUrl = '';
  let apiKey = '';

  if (appType === 'mtg') {
    baseUrl = settings.mtg_url;
    apiKey = settings.mtg_key;
  } else if (appType === 'library') {
    baseUrl = settings.library_url;
    apiKey = settings.library_key;
  }

  // Self-reference defaults for consolidated app
  if (!baseUrl || !baseUrl.trim()) {
    baseUrl = `http://127.0.0.1:${process.env.PORT || 8282}`;
  }
  if (!apiKey || !apiKey.trim()) {
    const keyRow = await db.get("SELECT value FROM settings WHERE key = 'api_key'");
    apiKey = keyRow ? keyRow.value : '';
    if (!apiKey) {
      // Auto-generate general api_key if missing
      const newKey = crypto.randomBytes(32).toString('hex');
      await saveSettings({ api_key: newKey });
      apiKey = newKey;
    }
  }

  // Build full URL
  const trimmedBase = baseUrl.trim().replace(/\/$/, '');
  const url = `${trimmedBase}${endpoint}`;

  console.log(`[Integration Proxy] Fetching from ${appType}: ${url}`);

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'x-api-key': apiKey.trim(),
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      const text = await response.text();
      console.error(`[Integration Proxy] Error status ${response.status} from ${appType}: ${text}`);
      const errMsg = `Integration App returned status ${response.status}: ${text}`;
      await sendNotification('Integration API Error', errMsg, 'Integration Error');
      throw new Error(errMsg);
    }

    return await response.json();
  } catch (error) {
    console.error(`[Integration Proxy] Failed to connect to ${appType}:`, error.message);
    const errMsg = `Failed to connect to ${appType} App: ${error.message}`;
    await sendNotification('Integration API Error', errMsg, 'Integration Error');
    throw new Error(errMsg);
  }
}

let weatherCache = {
  data: null,
  timestamp: 0,
  location: null,
  unit: null
};

async function fetchWeather(location, unit) {
  // 1. Geocode location/zip
  const geocodeUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(location)}&count=1&language=en&format=json`;
  const geoRes = await fetch(geocodeUrl);
  if (!geoRes.ok) {
    throw new Error('Failed to geocode location');
  }
  const geoData = await geoRes.json();
  if (!geoData.results || geoData.results.length === 0) {
    throw new Error(`Location not found: ${location}`);
  }
  const { latitude, longitude, name, admin1, country } = geoData.results[0];
  const locationName = `${name}${admin1 ? `, ${admin1}` : ''} (${country})`;

  // 2. Fetch weather forecast
  const tempUnitParam = unit === 'celsius' ? '' : '&temperature_unit=fahrenheit';
  const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true&hourly=temperature_2m,weathercode&daily=weathercode,temperature_2m_max,temperature_2m_min&timezone=auto${tempUnitParam}`;
  
  const weatherRes = await fetch(weatherUrl);
  if (!weatherRes.ok) {
    throw new Error('Failed to fetch weather forecast');
  }
  const weatherData = await weatherRes.json();
  return {
    locationName,
    latitude,
    longitude,
    current: weatherData.current_weather,
    hourly: weatherData.hourly,
    daily: weatherData.daily,
    unit: unit || 'fahrenheit'
  };
}

async function getCachedWeather(location, unit) {
  const now = Date.now();
  const cacheDuration = 10 * 60 * 1000; // 10 minutes
  
  if (weatherCache.data && 
      weatherCache.location === location && 
      weatherCache.unit === unit && 
      (now - weatherCache.timestamp) < cacheDuration) {
    return weatherCache.data;
  }
  
  const data = await fetchWeather(location, unit);
  weatherCache = {
    data,
    timestamp: now,
    location,
    unit
  };
  return data;
}

// Map widget requests to integration endpoints
async function getWidgetData(widget, userId) {
  const config = widget.config ? (typeof widget.config === 'string' ? JSON.parse(widget.config) : widget.config) : {};
  const limit = config.limit || 5;

  switch (widget.type) {
    case 'cookbook_leftovers':
      return await getAllLeftovers();
    case 'cookbook_menu':
    case 'cookbook_menu_3day':
    case 'cookbook_menu_5day':
      return await getWeeklyMenu();
    case 'cookbook_recent':
      return await getRecentRecipes(limit);
    case 'cookbook_shopping':
      return await getShoppingListsForUser(userId);
      
    case 'library_recent':
      return await getRecentBooks(limit);
    case 'library_summary':
      return userId ? await getBooksLogSummaryForUser(userId) : { total_books: 0, total_pages: 0, logs: [] };
    case 'library_reading_list':
      return userId ? await getReadingListForUser(userId) : [];
      
    case 'home_tasks': {
      const todayStr = new Date().toISOString().split('T')[0];
      return await getAllTasks(userId, {}, todayStr);
    }
    case 'home_calendar':
      return await getUnifiedUpcomingEventsList(userId);
    case 'calendar_daily':
    case 'calendar_weekly':
    case 'calendar_monthly':
    case 'calendar_month_grid':
    case 'calendar_agenda':
      return await getCalendarFullData(userId);
    case 'home_subscriptions': {
      const db = await getDb();
      const subs = await db.all("SELECT * FROM subscriptions ORDER BY next_billing_date ASC");
      const user = userId ? await getUserById(userId) : null;
      const userTz = user?.timezone || 'America/New_York';
      const todayStr = getTzTodayStr(userTz);
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
      return subs.map(sub => ({
        ...sub,
        due_in_days: getDaysRemaining(sub.next_billing_date, userTz)
      }));
    }
    case 'home_bills':
    case 'home_recurring_bills': {
      const db = await getDb();
      const bills = await db.all("SELECT * FROM recurring_bills ORDER BY next_billing_date ASC");
      const user = userId ? await getUserById(userId) : null;
      const userTz = user?.timezone || 'America/New_York';
      const todayStr = getTzTodayStr(userTz);
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
      return bills.map(bill => ({
        ...bill,
        due_in_days: getDaysRemaining(bill.next_billing_date, userTz)
      }));
    }
      
    case 'clock':
      return { serverTime: new Date().toISOString() };
    case 'text':
      return { text: config.text || '' };
    case 'weather_current':
    case 'weather_hourly':
    case 'weather_daily':
    case 'weather_combo': {
      const settings = await getSettings();
      const weatherLoc = settings.weather_location || '10001';
      const weatherUnit = settings.weather_unit || 'fahrenheit';
      return await getCachedWeather(weatherLoc, weatherUnit);
    }
    default:
      throw new Error(`Invalid widget type: ${widget.type}`);
  }
}

// --- DASHBOARDS MANAGEMENT ENDPOINTS ---

app.get('/api/dashboards', authenticate, async (req, res) => {
  try {
    const db = await getDb();
    const dashboards = await db.all(`
      SELECT d.*, COUNT(w.id) as widget_count 
      FROM dashboards d 
      LEFT JOIN dashboard_widgets w ON d.id = w.dashboard_id 
      GROUP BY d.id 
      ORDER BY d.is_default DESC, d.name ASC
    `);
    res.json(dashboards);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/dashboards', authenticate, async (req, res) => {
  try {
    const { name, clone_from_id } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Dashboard name is required' });
    }
    const db = await getDb();
    const id = 'dash_' + Date.now();
    await db.run(
      'INSERT INTO dashboards (id, name, is_default) VALUES (?, ?, 0)',
      [id, name.trim()]
    );

    // If cloning from an existing dashboard, duplicate its widgets
    if (clone_from_id) {
      const sourceWidgets = await db.all('SELECT * FROM dashboard_widgets WHERE dashboard_id = ?', [clone_from_id]);
      for (const w of sourceWidgets) {
        const newWidgetId = 'w_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
        await db.run(
          'INSERT INTO dashboard_widgets (id, dashboard_id, type, x, y, w, h, config) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          [newWidgetId, id, w.type, w.x, w.y, w.w, w.h, w.config]
        );
      }
    }

    res.status(201).json({ id, name: name.trim(), message: 'Dashboard created successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/dashboards/:id', authenticate, async (req, res) => {
  try {
    const { name, is_default } = req.body;
    const db = await getDb();
    const dashboard = await db.get('SELECT * FROM dashboards WHERE id = ?', [req.params.id]);
    if (!dashboard) {
      return res.status(404).json({ error: 'Dashboard not found' });
    }

    if (name !== undefined) {
      await db.run('UPDATE dashboards SET name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [name.trim(), req.params.id]);
    }

    if (is_default === 1 || is_default === true) {
      await db.run('UPDATE dashboards SET is_default = 0');
      await db.run('UPDATE dashboards SET is_default = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [req.params.id]);
    }

    res.json({ message: 'Dashboard updated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/dashboards/:id', authenticate, async (req, res) => {
  try {
    const db = await getDb();
    const totalCount = await db.get('SELECT COUNT(*) as count FROM dashboards');
    if (totalCount.count <= 1) {
      return res.status(400).json({ error: 'Cannot delete the only remaining dashboard' });
    }

    const dashboard = await db.get('SELECT * FROM dashboards WHERE id = ?', [req.params.id]);
    if (!dashboard) {
      return res.status(404).json({ error: 'Dashboard not found' });
    }

    // If deleting default, assign default to another dashboard
    if (dashboard.is_default) {
      const nextDash = await db.get('SELECT id FROM dashboards WHERE id != ? LIMIT 1', [req.params.id]);
      if (nextDash) {
        await db.run('UPDATE dashboards SET is_default = 1 WHERE id = ?', [nextDash.id]);
      }
    }

    await db.run('DELETE FROM dashboard_widgets WHERE dashboard_id = ?', [req.params.id]);
    await db.run('DELETE FROM dashboard_shares WHERE dashboard_id = ?', [req.params.id]);
    await db.run('DELETE FROM dashboards WHERE id = ?', [req.params.id]);

    res.json({ message: 'Dashboard deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- DASHBOARD WIDGETS ENDPOINTS ---

app.get('/api/dashboard/widgets', authenticate, async (req, res) => {
  try {
    const db = await getDb();
    const dashboardId = req.query.dashboard_id || 'default';
    const rows = await db.all('SELECT * FROM dashboard_widgets WHERE dashboard_id = ?', [dashboardId]);
    const widgets = rows.map(r => ({
      ...r,
      config: r.config ? JSON.parse(r.config) : {}
    }));
    res.json(widgets);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/dashboard/widgets', authenticate, async (req, res) => {
  try {
    const { id, dashboard_id, type, x, y, w, h, config } = req.body;
    if (!id || !type) {
      return res.status(400).json({ error: 'Missing widget ID or type' });
    }
    const targetDashboardId = dashboard_id || 'default';
    const db = await getDb();
    await db.run(
      'INSERT INTO dashboard_widgets (id, dashboard_id, type, x, y, w, h, config) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [id, targetDashboardId, type, Number(x || 0), Number(y || 0), Number(w || 2), Number(h || 2), JSON.stringify(config || {})]
    );
    res.status(201).json({ id, message: 'Widget added successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/dashboard/widgets/layout', authenticate, async (req, res) => {
  try {
    const items = Array.isArray(req.body) ? req.body : (Array.isArray(req.body.layout) ? req.body.layout : []);
    if (!Array.isArray(items)) {
      return res.status(400).json({ error: 'Layout data must be an array' });
    }
    const db = await getDb();
    await db.run('BEGIN TRANSACTION');
    for (const w of items) {
      await db.run(
        'UPDATE dashboard_widgets SET x = ?, y = ?, w = ?, h = ? WHERE id = ?',
        [Number(w.x), Number(w.y), Number(w.w), Number(w.h), w.id]
      );
    }
    await db.run('COMMIT');
    res.json({ message: 'Widgets layout updated successfully' });
  } catch (error) {
    try {
      const db = await getDb();
      await db.run('ROLLBACK');
    } catch (e) {}
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/dashboard/widgets/:id', authenticate, async (req, res) => {
  try {
    const { type, x, y, w, h, config } = req.body;
    const db = await getDb();
    const widget = await db.get('SELECT * FROM dashboard_widgets WHERE id = ?', [req.params.id]);
    if (!widget) {
      return res.status(404).json({ error: 'Widget not found' });
    }

    const updates = [];
    const values = [];

    if (type !== undefined) { updates.push('type = ?'); values.push(type); }
    if (x !== undefined) { updates.push('x = ?'); values.push(Number(x)); }
    if (y !== undefined) { updates.push('y = ?'); values.push(Number(y)); }
    if (w !== undefined) { updates.push('w = ?'); values.push(Number(w)); }
    if (h !== undefined) { updates.push('h = ?'); values.push(Number(h)); }
    if (config !== undefined) { updates.push('config = ?'); values.push(JSON.stringify(config)); }

    if (updates.length > 0) {
      values.push(req.params.id);
      await db.run(`UPDATE dashboard_widgets SET ${updates.join(', ')} WHERE id = ?`, values);
    }

    res.json({ message: 'Widget updated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/dashboard/widgets/:id', authenticate, async (req, res) => {
  try {
    const db = await getDb();
    const result = await db.run('DELETE FROM dashboard_widgets WHERE id = ?', [req.params.id]);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Widget not found' });
    }
    res.json({ message: 'Widget deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/dashboard/widget-data/:id', authenticate, async (req, res) => {
  try {
    const db = await getDb();
    const widget = await db.get('SELECT * FROM dashboard_widgets WHERE id = ?', [req.params.id]);
    if (!widget) {
      return res.status(404).json({ error: 'Widget not found' });
    }
    const data = await getWidgetData(widget, req.user.id);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- DASHBOARD PUBLIC SHARES MANAGEMENT ---

app.get('/api/dashboard/shares', authenticate, requirePermission('settings_general', 'read'), async (req, res) => {
  try {
    const db = await getDb();
    const rows = await db.all(`
      SELECT s.*, d.name as dashboard_name 
      FROM dashboard_shares s 
      LEFT JOIN dashboards d ON s.dashboard_id = d.id 
      ORDER BY s.created_at DESC
    `);
    const shares = rows.map(r => ({
      ...r,
      rotation_dashboards: r.rotation_dashboards ? JSON.parse(r.rotation_dashboards) : []
    }));
    res.json(shares);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/dashboard/shares', authenticate, requirePermission('settings_general', 'full'), async (req, res) => {
  try {
    const { name, target_type, dashboard_id, rotation_interval, rotation_dashboards } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Share link name is required' });
    }
    const token = 'dash_' + crypto.randomBytes(24).toString('hex');
    const id = 'share_' + Date.now();
    const db = await getDb();
    
    await db.run(
      `INSERT INTO dashboard_shares (id, name, token, target_type, dashboard_id, rotation_interval, rotation_dashboards, active) 
       VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
      [
        id,
        name.trim(),
        token,
        target_type === 'rotation' ? 'rotation' : 'single',
        target_type === 'rotation' ? null : (dashboard_id || 'default'),
        Number(rotation_interval || 30),
        rotation_dashboards ? JSON.stringify(rotation_dashboards) : null
      ]
    );

    res.status(201).json({ id, token, message: 'Share link created successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/dashboard/shares/:id', authenticate, requirePermission('settings_general', 'full'), async (req, res) => {
  try {
    const { name, target_type, dashboard_id, rotation_interval, rotation_dashboards, active } = req.body;
    const db = await getDb();
    const share = await db.get('SELECT * FROM dashboard_shares WHERE id = ?', [req.params.id]);
    if (!share) {
      return res.status(404).json({ error: 'Share link not found' });
    }

    const updates = [];
    const values = [];

    if (name !== undefined) { updates.push('name = ?'); values.push(name.trim()); }
    if (target_type !== undefined) { updates.push('target_type = ?'); values.push(target_type); }
    if (dashboard_id !== undefined) { updates.push('dashboard_id = ?'); values.push(dashboard_id); }
    if (rotation_interval !== undefined) { updates.push('rotation_interval = ?'); values.push(Number(rotation_interval)); }
    if (rotation_dashboards !== undefined) { updates.push('rotation_dashboards = ?'); values.push(JSON.stringify(rotation_dashboards)); }
    if (active !== undefined) { updates.push('active = ?'); values.push(active ? 1 : 0); }

    if (updates.length > 0) {
      values.push(req.params.id);
      await db.run(`UPDATE dashboard_shares SET ${updates.join(', ')} WHERE id = ?`, values);
    }

    res.json({ message: 'Share link updated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/dashboard/shares/:id', authenticate, requirePermission('settings_general', 'full'), async (req, res) => {
  try {
    const db = await getDb();
    const result = await db.run('DELETE FROM dashboard_shares WHERE id = ?', [req.params.id]);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Share link not found' });
    }
    res.json({ message: 'Share link deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/dashboard/shared/:token', async (req, res) => {
  try {
    const db = await getDb();
    const settings = await getSettings();

    // Check in dashboard_shares table
    let share = await db.get('SELECT * FROM dashboard_shares WHERE token = ? AND active = 1', [req.params.token]);
    
    // Fallback to legacy single settings token if matching
    if (!share && settings.dashboard_share_token && settings.dashboard_share_token === req.params.token) {
      share = {
        name: 'Main Dashboard',
        target_type: 'single',
        dashboard_id: 'default'
      };
    }

    if (!share) {
      return res.status(401).json({ error: 'Invalid or expired dashboard share token' });
    }

    const adminUser = await db.get("SELECT timezone FROM users WHERE role_id = (SELECT id FROM roles WHERE name = 'Administrator' LIMIT 1) LIMIT 1");
    const timezone = adminUser?.timezone || 'America/New_York';

    const baseResponse = {
      appName: settings.app_name || 'Dashboard App',
      brandingIcon: settings.branding_icon || '📊',
      brandingLogo: settings.branding_logo || '',
      dashboard_refresh_interval: settings.dashboard_refresh_interval || 'disabled',
      dashboard_bg_type: settings.dashboard_bg_type || 'theme',
      dashboard_bg_value: settings.dashboard_bg_value || '',
      dashboard_bg_unsplash_keywords: settings.dashboard_bg_unsplash_keywords || '',
      weather_location: settings.weather_location || '10001',
      weather_unit: settings.weather_unit || 'fahrenheit',
      timezone,
      share_name: share.name,
      target_type: share.target_type
    };

    if (share.target_type === 'rotation') {
      let dashIds = [];
      if (share.rotation_dashboards) {
        try {
          dashIds = JSON.parse(share.rotation_dashboards);
        } catch (e) {}
      }
      
      if (!dashIds || dashIds.length === 0) {
        try {
          dashIds = JSON.parse(settings.dashboard_rotation_dashboards || '["default"]');
        } catch (e) {
          dashIds = ['default'];
        }
      }

      const allDashboards = await db.all('SELECT * FROM dashboards');
      const filteredDashboards = allDashboards.filter(d => dashIds.includes(d.id));
      const rotationList = (filteredDashboards.length > 0 ? filteredDashboards : allDashboards);

      const rotationData = [];
      for (const d of rotationList) {
        const rows = await db.all('SELECT * FROM dashboard_widgets WHERE dashboard_id = ?', [d.id]);
        rotationData.push({
          id: d.id,
          name: d.name,
          widgets: rows.map(r => ({
            ...r,
            config: r.config ? JSON.parse(r.config) : {}
          }))
        });
      }

      return res.json({
        ...baseResponse,
        rotation_interval: share.rotation_interval || parseInt(settings.dashboard_rotation_interval, 10) || 30,
        dashboards: rotationData
      });
    } else {
      const targetDashId = share.dashboard_id || 'default';
      const targetDash = await db.get('SELECT * FROM dashboards WHERE id = ?', [targetDashId]) || { id: 'default', name: 'Main Dashboard' };
      const rows = await db.all('SELECT * FROM dashboard_widgets WHERE dashboard_id = ?', [targetDash.id]);
      const widgets = rows.map(r => ({
        ...r,
        config: r.config ? JSON.parse(r.config) : {}
      }));

      return res.json({
        ...baseResponse,
        dashboard_id: targetDash.id,
        dashboard_name: targetDash.name,
        widgets
      });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/dashboard/shared-widget-data/:token/:id', async (req, res) => {
  try {
    const db = await getDb();
    const settings = await getSettings();

    let share = await db.get('SELECT * FROM dashboard_shares WHERE token = ? AND active = 1', [req.params.token]);
    if (!share && settings.dashboard_share_token && settings.dashboard_share_token === req.params.token) {
      share = { target_type: 'single', dashboard_id: 'default' };
    }

    if (!share) {
      return res.status(401).json({ error: 'Invalid or expired dashboard share token' });
    }

    const widget = await db.get('SELECT * FROM dashboard_widgets WHERE id = ?', [req.params.id]);
    if (!widget) {
      return res.status(404).json({ error: 'Widget not found' });
    }
    const data = await getWidgetData(widget, null);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/weather - Get today's weather forecast
app.get('/api/weather', authenticate, async (req, res) => {
  try {
    const settings = await getSettings();
    const weatherLoc = settings.weather_location || '10001';
    const weatherUnit = settings.weather_unit || 'fahrenheit';
    const weather = await getCachedWeather(weatherLoc, weatherUnit);
    res.json(weather);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/dashboard/background/unsplash', async (req, res) => {
  try {
    const settings = await getSettings();
    const unsplashKey = settings.unsplash_key;
    const keywords = req.query.keywords || '';

    if (!unsplashKey || !unsplashKey.trim()) {
      return res.json({ 
        url: `https://images.unsplash.com/featured/1920x1080?sig=${req.query.sig || Date.now()}&${encodeURIComponent(keywords)}`,
        attribution: {
          photographerName: 'Unsplash Community',
          photographerUrl: 'https://unsplash.com?utm_source=dashboard_app&utm_medium=referral',
          photoUrl: 'https://unsplash.com?utm_source=dashboard_app&utm_medium=referral'
        }
      });
    }

    const query = keywords ? `&query=${encodeURIComponent(keywords)}` : '';
    const url = `https://api.unsplash.com/photos/random?orientation=landscape${query}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Client-ID ${unsplashKey.trim()}`,
        'Accept-Version': 'v1'
      }
    });

    if (!response.ok) {
      const text = await response.text();
      const errMsg = `Unsplash API returned status ${response.status}: ${text}`;
      await sendNotification('Unsplash API Error', errMsg, 'Integration Error');
      throw new Error(errMsg);
    }

    const data = await response.json();
    const imageUrl = data.urls?.regular || data.urls?.full;
    
    if (data.links?.download_location) {
      try {
        await fetch(data.links.download_location, {
          method: 'GET',
          headers: {
            'Authorization': `Client-ID ${unsplashKey.trim()}`,
            'Accept-Version': 'v1'
          }
        });
      } catch (dlErr) {
        console.error('[Unsplash Integration] Failed to trigger download location:', dlErr.message);
      }
    }

    const photographerUrl = data.user?.links?.html
      ? `${data.user.links.html}?utm_source=dashboard_app&utm_medium=referral`
      : 'https://unsplash.com?utm_source=dashboard_app&utm_medium=referral';
    const photoUrl = data.links?.html
      ? `${data.links.html}?utm_source=dashboard_app&utm_medium=referral`
      : 'https://unsplash.com?utm_source=dashboard_app&utm_medium=referral';

    res.json({ 
      url: imageUrl,
      attribution: {
        photographerName: data.user?.name || data.user?.username || 'Unsplash Photographer',
        photographerUrl: photographerUrl,
        photoUrl: photoUrl
      }
    });
  } catch (error) {
    console.error('[Unsplash Integration] Error:', error.message);
    await sendNotification('Unsplash API Error', `Unsplash integration error: ${error.message}`, 'Integration Error');
    const keywords = req.query.keywords || '';
    res.json({ 
      url: `https://images.unsplash.com/featured/1920x1080?sig=${req.query.sig || Date.now()}&${encodeURIComponent(keywords)}`,
      attribution: {
        photographerName: 'Unsplash Community',
        photographerUrl: 'https://unsplash.com?utm_source=dashboard_app&utm_medium=referral',
        photoUrl: 'https://unsplash.com?utm_source=dashboard_app&utm_medium=referral'
      },
      error: error.message
    });
  }
});

app.get('/api/unsplash/search', authenticate, async (req, res) => {
  try {
    const settings = await getSettings();
    const unsplashKey = settings.unsplash_key;
    const query = req.query.query || 'nature';

    if (!unsplashKey || !unsplashKey.trim()) {
      const mockImages = Array.from({ length: 9 }).map((_, i) => ({
        id: `mock-${i}`,
        urls: {
          regular: `https://images.unsplash.com/featured/800x600?sig=${i}&q=${encodeURIComponent(query)}`,
          thumb: `https://images.unsplash.com/featured/200x150?sig=${i}&q=${encodeURIComponent(query)}`
        },
        user: {
          name: 'Unsplash Community',
          links: { html: 'https://unsplash.com' }
        },
        links: { html: 'https://unsplash.com' }
      }));
      return res.json({ results: mockImages });
    }

    const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&orientation=landscape&per_page=12`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Client-ID ${unsplashKey.trim()}`,
        'Accept-Version': 'v1'
      }
    });

    if (!response.ok) {
      const text = await response.text();
      return res.status(response.status).json({ error: `Unsplash API error: ${text}` });
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/dashboard/shared/:token', async (req, res) => {
  try {
    const settings = await getSettings();
    if (!settings.dashboard_share_token || settings.dashboard_share_token !== req.params.token) {
      return res.status(401).json({ error: 'Invalid or missing dashboard share token' });
    }
    const db = await getDb();
    const rows = await db.all('SELECT * FROM dashboard_widgets');
    const widgets = rows.map(r => ({
      ...r,
      config: r.config ? JSON.parse(r.config) : {}
    }));
    const adminUser = await db.get("SELECT timezone FROM users WHERE role_id = (SELECT id FROM roles WHERE name = 'Administrator' LIMIT 1) LIMIT 1");
    const timezone = adminUser?.timezone || 'America/New_York';
    res.json({
      appName: settings.app_name || 'Dashboard App',
      brandingIcon: settings.branding_icon || '📊',
      brandingLogo: settings.branding_logo || '',
      dashboard_refresh_interval: settings.dashboard_refresh_interval || 'disabled',
      dashboard_bg_type: settings.dashboard_bg_type || 'theme',
      dashboard_bg_value: settings.dashboard_bg_value || '',
      dashboard_bg_unsplash_keywords: settings.dashboard_bg_unsplash_keywords || '',
      weather_location: settings.weather_location || '10001',
      weather_unit: settings.weather_unit || 'fahrenheit',
      timezone,
      widgets
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/dashboard/shared-widget-data/:token/:id', async (req, res) => {
  try {
    const settings = await getSettings();
    if (!settings.dashboard_share_token || settings.dashboard_share_token !== req.params.token) {
      return res.status(401).json({ error: 'Invalid or missing dashboard share token' });
    }
    const db = await getDb();
    const widget = await db.get('SELECT * FROM dashboard_widgets WHERE id = ?', [req.params.id]);
    if (!widget) {
      return res.status(404).json({ error: 'Widget not found' });
    }
    const data = await getWidgetData(widget, null);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
// --- HOUSEKEEPING ENDPOINTS ---

function getNextWeeklyOccurrence(currentDate, daysStr) {
  const targetDays = daysStr.split(',').map(Number).filter(n => !isNaN(n));
  if (targetDays.length === 0) {
    const d = new Date(currentDate);
    d.setDate(d.getDate() + 7);
    return d;
  }
  let bestDate = null;
  for (let i = 1; i <= 7; i++) {
    const nextDate = new Date(currentDate);
    nextDate.setDate(nextDate.getDate() + i);
    if (targetDays.includes(nextDate.getDay())) {
      bestDate = nextDate;
      break;
    }
  }
  return bestDate || new Date(currentDate.getTime() + 7 * 24 * 60 * 60 * 1000);
}

function getNextYearlyOccurrence(currentDate, monthsStr) {
  const targetMonths = monthsStr.split(',').map(Number).filter(n => !isNaN(n));
  if (targetMonths.length === 0) {
    const d = new Date(currentDate);
    d.setFullYear(d.getFullYear() + 1);
    return d;
  }
  let bestDate = null;
  for (let i = 1; i <= 12; i++) {
    const nextDate = new Date(currentDate);
    nextDate.setMonth(nextDate.getMonth() + i);
    if (targetMonths.includes(nextDate.getMonth())) {
      bestDate = nextDate;
      break;
    }
  }
  return bestDate || new Date(currentDate.getFullYear() + 1, currentDate.getMonth(), currentDate.getDate());
}

function calculateNextDueDate(currentDueDateStr, interval, reoccurrenceDays, reoccurrenceMonths) {
  if (!currentDueDateStr) return new Date().toISOString().split('T')[0];
  const date = new Date(currentDueDateStr + 'T12:00:00');
  switch (interval.toLowerCase()) {
    case 'daily':
      date.setDate(date.getDate() + 1);
      break;
    case 'weekly':
      if (reoccurrenceDays) {
        return getNextWeeklyOccurrence(date, reoccurrenceDays).toISOString().split('T')[0];
      }
      date.setDate(date.getDate() + 7);
      break;
    case 'bi-weekly':
      date.setDate(date.getDate() + 14);
      break;
    case 'monthly':
      date.setMonth(date.getMonth() + 1);
      break;
    case 'yearly':
      if (reoccurrenceMonths) {
        return getNextYearlyOccurrence(date, reoccurrenceMonths).toISOString().split('T')[0];
      }
      date.setFullYear(date.getFullYear() + 1);
      break;
    default:
      break;
  }
  return date.toISOString().split('T')[0];
}

// GET /api/housekeeping/tasks
app.get('/api/housekeeping/tasks', authenticate, async (req, res) => {
  try {
    const db = await getDb();
    const tasks = await db.all(`
      SELECT t.*, u.username as assigned_username, u.display_name as assigned_display_name
      FROM housekeeping_tasks t
      LEFT JOIN users u ON t.assigned_to_user_id = u.id
      ORDER BY t.due_date ASC, t.title ASC
    `);
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/housekeeping/tasks
app.post('/api/housekeeping/tasks', authenticate, async (req, res) => {
  try {
    const { title, description, due_date, reoccurrence, reoccurrence_days, reoccurrence_months, assigned_to_user_id } = req.body;
    if (!title || !title.trim() || !due_date) {
      return res.status(400).json({ error: 'Title and due date are required' });
    }
    const db = await getDb();
    const result = await db.run(`
      INSERT INTO housekeeping_tasks (title, description, due_date, reoccurrence, reoccurrence_days, reoccurrence_months, assigned_to_user_id)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [title.trim(), description, due_date, reoccurrence || 'none', reoccurrence_days || null, reoccurrence_months || null, assigned_to_user_id || null]);
    res.status(201).json({ id: result.lastID, message: 'Housekeeping task created successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/housekeeping/tasks/:id
app.put('/api/housekeeping/tasks/:id', authenticate, async (req, res) => {
  try {
    const { title, description, due_date, reoccurrence, reoccurrence_days, reoccurrence_months, assigned_to_user_id, status } = req.body;
    if (!title || !title.trim() || !due_date) {
      return res.status(400).json({ error: 'Title and due date are required' });
    }
    const db = await getDb();
    await db.run(`
      UPDATE housekeeping_tasks
      SET title = ?, description = ?, due_date = ?, reoccurrence = ?, reoccurrence_days = ?, reoccurrence_months = ?, assigned_to_user_id = ?, status = ?
      WHERE id = ?
    `, [title.trim(), description, due_date, reoccurrence || 'none', reoccurrence_days || null, reoccurrence_months || null, assigned_to_user_id || null, status || 'pending', req.params.id]);
    res.json({ message: 'Housekeeping task updated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/housekeeping/tasks/:id
app.delete('/api/housekeeping/tasks/:id', authenticate, async (req, res) => {
  try {
    const db = await getDb();
    await db.run('DELETE FROM housekeeping_tasks WHERE id = ?', [req.params.id]);
    res.json({ message: 'Housekeeping task deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/housekeeping/tasks/:id/complete
app.post('/api/housekeeping/tasks/:id/complete', authenticate, async (req, res) => {
  try {
    const db = await getDb();
    const task = await db.get('SELECT * FROM housekeeping_tasks WHERE id = ?', [req.params.id]);
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // Insert into housekeeping logs
    await db.run(`
      INSERT INTO housekeeping_logs (task_id, task_title, completed_by_user_id)
      VALUES (?, ?, ?)
    `, [task.id, task.title, req.user.id]);

    if (task.reoccurrence && task.reoccurrence !== 'none') {
      // Calculate next due date
      const nextDue = calculateNextDueDate(task.due_date, task.reoccurrence, task.reoccurrence_days, task.reoccurrence_months);
      await db.run(`
        UPDATE housekeeping_tasks
        SET due_date = ?, status = 'pending'
        WHERE id = ?
      `, [nextDue, task.id]);
      res.json({ message: 'Task logged and scheduled for next occurrence', next_due_date: nextDue });
    } else {
      // Mark as completed
      await db.run(`
        UPDATE housekeeping_tasks
        SET status = 'completed'
        WHERE id = ?
      `, [task.id]);
      res.json({ message: 'Task marked as completed' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/housekeeping/tasks/:id/grab
app.post('/api/housekeeping/tasks/:id/grab', authenticate, async (req, res) => {
  try {
    const db = await getDb();
    await db.run(`
      UPDATE housekeeping_tasks
      SET assigned_to_user_id = ?
      WHERE id = ?
    `, [req.user.id, req.params.id]);
    res.json({ message: 'Task grabbed successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/housekeeping/logs
app.get('/api/housekeeping/logs', authenticate, async (req, res) => {
  try {
    const db = await getDb();
    const logs = await db.all(`
      SELECT l.*, u.username as completed_by_username, u.display_name as completed_by_display_name
      FROM housekeeping_logs l
      LEFT JOIN users u ON l.completed_by_user_id = u.id
      ORDER BY l.completed_at DESC
      LIMIT 50
    `);
    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- FOCUSFLOW LOCAL INTEGRATION ENDPOINTS ---

function getUserToday(user) {
  const tz = normalizeTimezone(user?.timezone || 'America/New_York');
  return new Date().toLocaleDateString('sv', { timeZone: tz });
}

// PROJECTS
app.get('/api/focusflow/projects', authenticate, async (req, res) => {
  try {
    const projects = await getAllProjects();
    res.json(projects);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/focusflow/projects', authenticate, async (req, res) => {
  try {
    const projectId = await createProject(req.body);
    res.status(201).json({ id: projectId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/focusflow/projects/:id', authenticate, async (req, res) => {
  try {
    await updateProject(req.params.id, req.body);
    res.json({ message: 'Project updated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/focusflow/projects/:id', authenticate, async (req, res) => {
  try {
    await deleteProject(req.params.id);
    res.json({ message: 'Project deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// TASKS
app.get('/api/focusflow/tasks', authenticate, async (req, res) => {
  try {
    const todayStr = getUserToday(req.user);
    const db = await getDb();
    
    // Auto-update tasks due today to status = 'today' if they are pending
    await db.run(
      "UPDATE tasks SET status = 'today' WHERE user_id = ? AND due_date = ? AND status NOT IN ('completed', 'archived')",
      [req.user.id, todayStr]
    );

    const filters = {
      search: req.query.q || null,
      project_id: req.query.project_id || null,
      status: req.query.status || null,
      priority: req.query.priority || null,
      due_date: req.query.due_date || null,
      routine_id: req.query.routine_id || null,
      habit_id: req.query.habit_id || null,
      include_routines: req.query.include_routines === 'true' || null,
      include_habits: req.query.include_habits === 'true' || null
    };
    const tasks = await getAllTasks(req.user.id, filters, todayStr);
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

async function canAccessTask(userId, task) {
  if (!task) return false;
  if (task.user_id === userId) return true;
  if (task.project_id) {
    const project = await getProjectById(task.project_id);
    if (project && project.is_shared === 1) {
      return true;
    }
  }
  return false;
}

app.get('/api/focusflow/tasks/:id', authenticate, async (req, res) => {
  try {
    const taskIdStr = String(req.params.id);
    if (taskIdStr.startsWith('housekeeping-')) {
      const hkId = parseInt(taskIdStr.split('-')[1]);
      const db = await getDb();
      const task = await db.get(`
        SELECT 'housekeeping-' || h.id as id, h.assigned_to_user_id as user_id, h.title, h.description, h.status, h.due_date
        FROM housekeeping_tasks h
        WHERE h.id = ?
      `, [hkId]);
      if (!task) return res.status(404).json({ error: 'Task not found' });
      return res.json(task);
    }
    const task = await getTaskById(req.params.id);
    const hasAccess = await canAccessTask(req.user.id, task);
    if (!hasAccess) {
      return res.status(404).json({ error: 'Task not found' });
    }
    res.json(task);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/focusflow/tasks', authenticate, async (req, res) => {
  try {
    const taskId = await createTask(req.user.id, req.body);
    await sendNotification('New Task Created', `Task "${req.body.title}" has been created.`, 'Task Created');
    res.status(201).json({ id: taskId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/focusflow/tasks/:id', authenticate, async (req, res) => {
  try {
    const taskIdStr = String(req.params.id);
    if (taskIdStr.startsWith('housekeeping-')) {
      const hkId = parseInt(taskIdStr.split('-')[1]);
      const { title, description, due_date, reoccurrence, assigned_to_user_id, status } = req.body;
      const db = await getDb();
      await db.run(`
        UPDATE housekeeping_tasks
        SET title = ?, description = ?, due_date = ?, reoccurrence = ?, assigned_to_user_id = ?, status = ?
        WHERE id = ?
      `, [title.trim(), description, due_date, reoccurrence || 'none', assigned_to_user_id || null, status || 'pending', hkId]);
      return res.json({ message: 'Housekeeping task updated successfully' });
    }
    const existing = await getTaskById(req.params.id);
    const hasAccess = await canAccessTask(req.user.id, existing);
    if (!hasAccess) {
      return res.status(404).json({ error: 'Task not found' });
    }
    const assignedUserId = req.body.user_id || existing.user_id;
    await updateTask(req.params.id, { ...req.body, user_id: assignedUserId });
    res.json({ message: 'Task updated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/focusflow/tasks/:id', authenticate, async (req, res) => {
  try {
    const taskIdStr = String(req.params.id);
    if (taskIdStr.startsWith('housekeeping-')) {
      const hkId = parseInt(taskIdStr.split('-')[1]);
      const db = await getDb();
      await db.run('DELETE FROM housekeeping_tasks WHERE id = ?', [hkId]);
      return res.json({ message: 'Housekeeping task deleted successfully' });
    }
    const existing = await getTaskById(req.params.id);
    const hasAccess = await canAccessTask(req.user.id, existing);
    if (!hasAccess) {
      return res.status(404).json({ error: 'Task not found' });
    }
    await deleteTask(req.params.id);
    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/focusflow/tasks/:id/complete', authenticate, async (req, res) => {
  try {
    const taskIdStr = String(req.params.id);
    if (taskIdStr.startsWith('housekeeping-')) {
      const hkId = parseInt(taskIdStr.split('-')[1]);
      const db = await getDb();
      const task = await db.get('SELECT * FROM housekeeping_tasks WHERE id = ?', [hkId]);
      if (!task) {
        return res.status(404).json({ error: 'Task not found' });
      }

      // Insert into housekeeping logs
      await db.run(`
        INSERT INTO housekeeping_logs (task_id, task_title, completed_by_user_id)
        VALUES (?, ?, ?)
      `, [task.id, task.title, req.user.id]);

      if (task.reoccurrence && task.reoccurrence !== 'none') {
        // Calculate next due date
        const nextDue = calculateNextDueDate(task.due_date, task.reoccurrence, task.reoccurrence_days, task.reoccurrence_months);
        await db.run(`
          UPDATE housekeeping_tasks
          SET due_date = ?, status = 'pending'
          WHERE id = ?
        `, [nextDue, task.id]);
        return res.json({ message: 'Task logged and scheduled for next occurrence', next_due_date: nextDue });
      } else {
        await db.run(`
          UPDATE housekeeping_tasks
          SET status = 'completed'
          WHERE id = ?
        `, [task.id]);
        return res.json({ message: 'Task marked as completed' });
      }
    }
    const success = await completeTask(req.user.id, req.params.id, req.body.completed);
    if (!success) {
      return res.status(404).json({ error: 'Task not found or update failed' });
    }
    if (req.body.completed) {
      await sendNotification('Task Completed', `Task "${req.body.title || 'Untitled'}" was completed! 🎯`, 'Task Completed');
    }
    res.json({ message: 'Task status updated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// TIMELOGS
app.get('/api/focusflow/timelogs/active', authenticate, async (req, res) => {
  try {
    const activeLog = await getActiveTimeLog(req.user.id);
    if (!activeLog) {
      return res.status(404).json({ error: 'No active time log' });
    }
    res.json(activeLog);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/focusflow/timelogs/start', authenticate, async (req, res) => {
  try {
    const { task_id } = req.body;
    if (!task_id) {
      return res.status(400).json({ error: 'Task ID is required' });
    }
    const task = await getTaskById(task_id);
    if (!task || task.user_id !== req.user.id) {
      return res.status(404).json({ error: 'Task not found' });
    }
    const logId = await startTimeLog(task_id);
    res.status(201).json({ id: logId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/focusflow/timelogs/stop', authenticate, async (req, res) => {
  try {
    const { log_id } = req.body;
    if (!log_id) {
      return res.status(400).json({ error: 'Log ID is required' });
    }
    const success = await stopTimeLog(log_id);
    if (!success) {
      return res.status(404).json({ error: 'Log entry not found or already stopped' });
    }
    res.json({ message: 'Time tracking stopped successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// FOCUS SESSIONS
app.post('/api/focusflow/focus', authenticate, async (req, res) => {
  try {
    const { task_id, type, duration, completed } = req.body;
    if (!duration) {
      return res.status(400).json({ error: 'Duration is required' });
    }
    const sessionId = await createFocusSession(req.user.id, { task_id, type, duration, completed });
    if (completed) {
      await sendNotification('Focus Session Completed', `Completed a ${type} session (${Math.round(duration / 60)} minutes)! ⏱️`, 'Focus Session Completed');
    }
    res.status(201).json({ id: sessionId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// STREAKS
app.get('/api/focusflow/streaks', authenticate, async (req, res) => {
  try {
    const stats = await checkAndResetStreak(req.user.id);
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PROJECT SCHEDULES
app.get('/api/focusflow/projects/:id/schedules', authenticate, async (req, res) => {
  try {
    const db = await getDb();
    const schedules = await db.all('SELECT * FROM project_schedules WHERE project_id = ? ORDER BY day_of_week, start_time', [req.params.id]);
    res.json(schedules);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/focusflow/projects/:id/schedules', authenticate, async (req, res) => {
  try {
    const { schedule_enabled, blocks } = req.body;
    const db = await getDb();
    await db.run('BEGIN TRANSACTION');
    await db.run('UPDATE projects SET schedule_enabled = ? WHERE id = ?', [schedule_enabled ? 1 : 0, req.params.id]);
    await db.run('DELETE FROM project_schedules WHERE project_id = ?', [req.params.id]);
    if (Array.isArray(blocks)) {
      for (const b of blocks) {
        await db.run('INSERT INTO project_schedules (project_id, day_of_week, all_day, start_time, end_time) VALUES (?, ?, ?, ?, ?)',
          [req.params.id, b.day_of_week, b.all_day ? 1 : 0, b.start_time || null, b.end_time || null]);
      }
    }
    await db.run('COMMIT');
    res.json({ message: 'Schedule saved' });
  } catch (error) {
    try { const db2 = await getDb(); await db2.run('ROLLBACK'); } catch(_) {}
    res.status(500).json({ error: error.message });
  }
});

// ROUTINES
app.get('/api/focusflow/routines', authenticate, async (req, res) => {
  try {
    const db = await getDb();
    const today = getUserToday(req.user);
    const routines = await db.all('SELECT * FROM routines WHERE user_id = ? ORDER BY sort_order, created_at', [req.user.id]);
    const result = await Promise.all(routines.map(async (r) => {
      const todayLog = await db.get('SELECT id FROM routine_logs WHERE routine_id = ? AND completed_date = ?', [r.id, today]);
      const logs = await db.all('SELECT completed_date FROM routine_logs WHERE routine_id = ? AND user_id = ? ORDER BY completed_date DESC', [r.id, req.user.id]);
      let streak = 0; let checkDate = new Date();
      if (!todayLog) checkDate.setDate(checkDate.getDate() - 1);
      const userTz = normalizeTimezone(req.user.timezone || 'America/New_York');
      for (const log of logs) {
        if (log.completed_date === checkDate.toLocaleDateString('sv', { timeZone: userTz })) {
          streak++;
          checkDate.setDate(checkDate.getDate() - 1);
        } else {
          break;
        }
      }
      const tasks = await db.all('SELECT * FROM tasks WHERE routine_id = ?', [r.id]);
      for (const t of tasks) {
        const taskLog = await db.get('SELECT id FROM routine_task_logs WHERE task_id = ? AND completed_date = ?', [t.id, today]);
        t.completed_today = !!taskLog;
        const subtasks = await db.all("SELECT id, title, status FROM tasks WHERE parent_id = ? AND is_micro_step = 1", [t.id]);
        t.subtasks = subtasks;
      }
      return { ...r, completed_today: !!todayLog, streak, tasks };
    }));
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/focusflow/routines', authenticate, async (req, res) => {
  try {
    const { title, description, frequency, custom_days, time_of_day, estimated_time } = req.body;
    if (!title) return res.status(400).json({ error: 'Title is required' });
    const db = await getDb();
    const result = await db.run('INSERT INTO routines (user_id, title, description, frequency, custom_days, time_of_day, estimated_time) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [req.user.id, title, description || null, frequency || 'daily', custom_days ? JSON.stringify(custom_days) : null, time_of_day || null, estimated_time || 0]);
    res.status(201).json({ id: result.lastID, message: 'Routine created' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/focusflow/routines/:id', authenticate, async (req, res) => {
  try {
    const { title, description, frequency, custom_days, time_of_day, estimated_time, is_active, sort_order } = req.body;
    const db = await getDb();
    await db.run('UPDATE routines SET title=?, description=?, frequency=?, custom_days=?, time_of_day=?, estimated_time=?, is_active=?, sort_order=? WHERE id=? AND user_id=?',
      [title, description || null, frequency || 'daily', custom_days ? JSON.stringify(custom_days) : null, time_of_day || null, estimated_time || 0, is_active !== undefined ? (is_active ? 1 : 0) : 1, sort_order || 0, req.params.id, req.user.id]);
    res.json({ message: 'Routine updated' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/focusflow/routines/:id', authenticate, async (req, res) => {
  try {
    const db = await getDb();
    await db.run('DELETE FROM routines WHERE id=? AND user_id=?', [req.params.id, req.user.id]);
    res.json({ message: 'Routine deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/focusflow/routines/:id/complete', authenticate, async (req, res) => {
  try {
    const db = await getDb();
    const today = getUserToday(req.user);
    await db.run('INSERT OR IGNORE INTO routine_logs (routine_id, user_id, completed_date) VALUES (?, ?, ?)', [req.params.id, req.user.id, today]);
    res.json({ message: 'Routine marked complete' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/focusflow/routines/:id/complete', authenticate, async (req, res) => {
  try {
    const db = await getDb();
    const today = getUserToday(req.user);
    await db.run('DELETE FROM routine_logs WHERE routine_id=? AND user_id=? AND completed_date=?', [req.params.id, req.user.id, today]);
    res.json({ message: 'Routine unmarked' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/focusflow/routines/tasks/:taskId/complete', authenticate, async (req, res) => {
  try {
    const db = await getDb();
    const today = getUserToday(req.user);
    const taskId = req.params.taskId;
    await db.run('INSERT OR IGNORE INTO routine_task_logs (task_id, user_id, completed_date) VALUES (?, ?, ?)',
      [taskId, req.user.id, today]);
    const task = await db.get('SELECT routine_id FROM tasks WHERE id = ?', [taskId]);
    if (task && task.routine_id) {
      const allTasks = await db.all('SELECT id FROM tasks WHERE routine_id = ?', [task.routine_id]);
      if (allTasks.length > 0) {
        const completedTasks = await db.all('SELECT task_id FROM routine_task_logs WHERE completed_date = ? AND task_id IN (' + allTasks.map(() => '?').join(',') + ')', [today, ...allTasks.map(t => t.id)]);
        if (completedTasks.length === allTasks.length) {
          await db.run('INSERT OR IGNORE INTO routine_logs (routine_id, user_id, completed_date) VALUES (?, ?, ?)',
            [task.routine_id, req.user.id, today]);
        }
      }
    }
    res.json({ message: 'Routine task marked complete' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/focusflow/routines/tasks/:taskId/complete', authenticate, async (req, res) => {
  try {
    const db = await getDb();
    const today = getUserToday(req.user);
    const taskId = req.params.taskId;
    await db.run('DELETE FROM routine_task_logs WHERE task_id = ? AND user_id = ? AND completed_date = ?',
      [taskId, req.user.id, today]);
    const task = await db.get('SELECT routine_id FROM tasks WHERE id = ?', [taskId]);
    if (task && task.routine_id) {
      await db.run('DELETE FROM routine_logs WHERE routine_id = ? AND user_id = ? AND completed_date = ?',
        [task.routine_id, req.user.id, today]);
    }
    res.json({ message: 'Routine task unmarked' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// HABITS
app.get('/api/focusflow/habits', authenticate, async (req, res) => {
  try {
    const db = await getDb();
    const today = getUserToday(req.user);
    const habits = await db.all('SELECT * FROM habits WHERE user_id=? ORDER BY sort_order, created_at', [req.user.id]);
    const result = await Promise.all(habits.map(async (h) => {
      const todayLog = await db.get('SELECT id FROM habit_logs WHERE habit_id=? AND completed_date=?', [h.id, today]);
      const logs = await db.all('SELECT completed_date FROM habit_logs WHERE habit_id=? AND user_id=? ORDER BY completed_date DESC', [h.id, req.user.id]);
      let streak = 0; let checkDate = new Date();
      if (!todayLog) checkDate.setDate(checkDate.getDate() - 1);
      const userTz = normalizeTimezone(req.user.timezone || 'America/New_York');
      for (const log of logs) {
        if (log.completed_date === checkDate.toLocaleDateString('sv', { timeZone: userTz })) {
          streak++;
          checkDate.setDate(checkDate.getDate() - 1);
        } else {
          break;
        }
      }
      const thirtyAgo = new Date();
      thirtyAgo.setDate(thirtyAgo.getDate() - 29);
      const recent = await db.get('SELECT COUNT(*) as cnt FROM habit_logs WHERE habit_id=? AND user_id=? AND completed_date>=?', [h.id, req.user.id, thirtyAgo.toLocaleDateString('sv', { timeZone: userTz })]);
      const tasks = await db.all('SELECT * FROM tasks WHERE habit_id = ?', [h.id]);
      for (const t of tasks) {
        if (t.habit_task_type === 'recurring') {
          const taskLog = await db.get('SELECT id FROM habit_task_logs WHERE task_id = ? AND completed_date = ?', [t.id, today]);
          t.completed_today = !!taskLog;
        } else {
          t.completed_today = t.status === 'completed';
        }
        const subtasks = await db.all("SELECT id, title, status FROM tasks WHERE parent_id = ? AND is_micro_step = 1", [t.id]);
        t.subtasks = subtasks;
      }
      return { ...h, completed_today: !!todayLog, streak, completion_rate: Math.round((recent.cnt / 30) * 100), tasks };
    }));
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/focusflow/habits', authenticate, async (req, res) => {
  try {
    const { title, description, color, icon, target_frequency, custom_days } = req.body;
    if (!title) return res.status(400).json({ error: 'Title is required' });
    const db = await getDb();
    const result = await db.run('INSERT INTO habits (user_id, title, description, color, icon, target_frequency, custom_days) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [req.user.id, title, description || null, color || '#3b82f6', icon || 'star', target_frequency || 'daily', custom_days ? JSON.stringify(custom_days) : null]);
    res.status(201).json({ id: result.lastID, message: 'Habit created' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/focusflow/habits/:id', authenticate, async (req, res) => {
  try {
    const { title, description, color, icon, target_frequency, custom_days, is_active, sort_order } = req.body;
    const db = await getDb();
    await db.run('UPDATE habits SET title=?, description=?, color=?, icon=?, target_frequency=?, custom_days=?, is_active=?, sort_order=? WHERE id=? AND user_id=?',
      [title, description || null, color || '#3b82f6', icon || 'star', target_frequency || 'daily', custom_days ? JSON.stringify(custom_days) : null, is_active !== undefined ? (is_active ? 1 : 0) : 1, sort_order || 0, req.params.id, req.user.id]);
    res.json({ message: 'Habit updated' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/focusflow/habits/:id', authenticate, async (req, res) => {
  try {
    const db = await getDb();
    await db.run('DELETE FROM habits WHERE id=? AND user_id=?', [req.params.id, req.user.id]);
    res.json({ message: 'Habit deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/focusflow/habits/:id/complete', authenticate, async (req, res) => {
  try {
    const db = await getDb();
    const today = getUserToday(req.user);
    await db.run('INSERT OR IGNORE INTO habit_logs (habit_id, user_id, completed_date) VALUES (?, ?, ?)', [req.params.id, req.user.id, today]);
    res.json({ message: 'Habit marked complete' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/focusflow/habits/:id/complete', authenticate, async (req, res) => {
  try {
    const db = await getDb();
    const today = getUserToday(req.user);
    await db.run('DELETE FROM habit_logs WHERE habit_id=? AND user_id=? AND completed_date=?', [req.params.id, req.user.id, today]);
    res.json({ message: 'Habit unmarked' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/focusflow/habits/tasks/:taskId/complete', authenticate, async (req, res) => {
  try {
    const db = await getDb();
    const today = getUserToday(req.user);
    const taskId = req.params.taskId;
    const task = await db.get('SELECT habit_id, habit_task_type FROM tasks WHERE id = ?', [taskId]);
    if (!task) return res.status(404).json({ error: 'Task not found' });
    if (task.habit_task_type === 'recurring') {
      await db.run('INSERT OR IGNORE INTO habit_task_logs (task_id, user_id, completed_date) VALUES (?, ?, ?)',
        [taskId, req.user.id, today]);
    } else {
      await db.run("UPDATE tasks SET status = 'completed', completed_at = CURRENT_TIMESTAMP WHERE id = ?",
        [taskId]);
    }
    if (task.habit_id) {
      const allTasks = await db.all('SELECT id, habit_task_type, status FROM tasks WHERE habit_id = ?', [task.habit_id]);
      if (allTasks.length > 0) {
        let allDone = true;
        for (const t of allTasks) {
          if (t.habit_task_type === 'recurring') {
            const log = await db.get('SELECT id FROM habit_task_logs WHERE task_id = ? AND completed_date = ?', [t.id, today]);
            if (!log) { allDone = false; break; }
          } else {
            if (t.status !== 'completed') { allDone = false; break; }
          }
        }
        if (allDone) {
          await db.run('INSERT OR IGNORE INTO habit_logs (habit_id, user_id, completed_date) VALUES (?, ?, ?)',
            [task.habit_id, req.user.id, today]);
        }
      }
    }
    res.json({ message: 'Habit task marked complete' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/focusflow/habits/tasks/:taskId/complete', authenticate, async (req, res) => {
  try {
    const db = await getDb();
    const today = getUserToday(req.user);
    const taskId = req.params.taskId;
    const task = await db.get('SELECT habit_id, habit_task_type FROM tasks WHERE id = ?', [taskId]);
    if (!task) return res.status(404).json({ error: 'Task not found' });
    if (task.habit_task_type === 'recurring') {
      await db.run('DELETE FROM habit_task_logs WHERE task_id = ? AND user_id = ? AND completed_date = ?',
        [taskId, req.user.id, today]);
    } else {
      await db.run("UPDATE tasks SET status = 'backlog', completed_at = NULL WHERE id = ?",
        [taskId]);
    }
    if (task.habit_id) {
      await db.run('DELETE FROM habit_logs WHERE habit_id = ? AND user_id = ? AND completed_date = ?',
        [task.habit_id, req.user.id, today]);
    }
    res.json({ message: 'Habit task unmarked' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/focusflow/habits/:id/history', authenticate, async (req, res) => {
  try {
    const db = await getDb();
    const ninetyAgo = new Date();
    ninetyAgo.setDate(ninetyAgo.getDate() - 89);
    const userTz = normalizeTimezone(req.user.timezone || 'America/New_York');
    const logs = await db.all('SELECT completed_date FROM habit_logs WHERE habit_id=? AND user_id=? AND completed_date>=? ORDER BY completed_date',
      [req.params.id, req.user.id, ninetyAgo.toLocaleDateString('sv', { timeZone: userTz })]);
    res.json(logs.map(l => l.completed_date));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// SETTINGS
app.get('/api/focusflow/settings', authenticate, async (req, res) => {
  try {
    const settings = await getSettings();
    delete settings.api_key;
    delete settings.notify_smtp_pass;
    delete settings.notify_webhook_secret;
    res.json(settings);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Serve frontend static files in production
const staticPath = path.join(process.cwd(), './public');
app.use(express.static(staticPath));

// Fallback: serve React frontend index.html for all other routes

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
const server = app.listen(PORT, '0.0.0.0', async () => {
  console.log(`Server started on http://localhost:${PORT}`);
  
  // Bootstrap templates folder
  try {
    await initDefaultTemplate();
    console.log('Default Word templates initialized successfully.');
  } catch (err) {
    console.error('Error initializing default templates:', err.message);
  }

  // Check due today notifications
  checkDueTodayNotifications().catch(console.error);

  // Check expiring ingredients/leftovers
  setTimeout(() => {
    checkExpiringItems().catch(console.error);
  }, 5000);

  // Schedule expiring items checks (every 12 hours)
  setInterval(() => {
    checkExpiringItems().catch(console.error);
  }, 12 * 60 * 60 * 1000);
});

