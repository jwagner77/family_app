import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

let dbInstance = null;

export async function getDb() {
  if (dbInstance) return dbInstance;

  const dbPath = process.env.DATABASE_PATH || './data/base.db';
  const dbDir = path.dirname(dbPath);

  // Ensure directories exist
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  dbInstance = await open({
    filename: dbPath,
    driver: sqlite3.Database
  });

  // Enable foreign keys
  await dbInstance.run('PRAGMA foreign_keys = ON');

  // Run migrations
  await dbInstance.exec(`

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );

    CREATE TABLE IF NOT EXISTS roles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      permissions TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (role_id) REFERENCES roles (id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS todo_lists (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      list_type TEXT CHECK( list_type IN ('local', 'm365') ) DEFAULT 'local',
      m365_list_id TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS todo_tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      list_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      assigned_to INTEGER,
      status TEXT CHECK( status IN ('pending', 'completed') ) DEFAULT 'pending',
      due_date TEXT,
      m365_task_id TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (list_id) REFERENCES todo_lists(id) ON DELETE CASCADE,
      FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS calendar_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      location TEXT,
      m365_event_id TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS subscriptions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      amount REAL NOT NULL,
      billing_cycle TEXT CHECK( billing_cycle IN ('monthly', 'annual') ) DEFAULT 'monthly',
      next_billing_date TEXT NOT NULL,
      category TEXT,
      active INTEGER DEFAULT 1,
      payment_method TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS recurring_bills (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      amount REAL NOT NULL,
      billing_cycle TEXT CHECK( billing_cycle IN ('monthly', 'annual') ) DEFAULT 'monthly',
      next_billing_date TEXT NOT NULL,
      tag TEXT,
      active INTEGER DEFAULT 1,
      payment_method TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS bill_tags (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    INSERT OR IGNORE INTO settings (key, value) VALUES ('app_name', 'Home Hub');
    INSERT OR IGNORE INTO settings (key, value) VALUES ('primary_color', '#3f51b5');
    INSERT OR IGNORE INTO settings (key, value) VALUES ('theme', 'system');
    INSERT OR IGNORE INTO settings (key, value) VALUES ('oidc_enabled', 'false');
    INSERT OR IGNORE INTO settings (key, value) VALUES ('oidc_auto_provision', 'true');
    INSERT OR IGNORE INTO settings (key, value) VALUES ('oidc_default_role', 'Viewer');
    INSERT OR IGNORE INTO settings (key, value) VALUES ('branding_icon', '🏠');
    INSERT OR IGNORE INTO settings (key, value) VALUES ('branding_logo', '');
    INSERT OR IGNORE INTO settings (key, value) VALUES ('branding_favicon', '');
  `);

  // Safe Migration to add primary_color column to users table if missing
  try {
    await dbInstance.run("ALTER TABLE users ADD COLUMN primary_color TEXT DEFAULT '#3f51b5'");
  } catch (err) {}

  // Safe Migration to add theme column to users table if missing
  try {
    await dbInstance.run("ALTER TABLE users ADD COLUMN theme TEXT DEFAULT 'system'");
  } catch (err) {}

  // Safe Migration to add auth_provider column to users table if missing
  try {
    await dbInstance.run("ALTER TABLE users ADD COLUMN auth_provider TEXT DEFAULT 'local'");
  } catch (err) {}

  // Safe Migration to add display_name column to users table if missing
  try {
    await dbInstance.run("ALTER TABLE users ADD COLUMN display_name TEXT");
  } catch (err) {}

  // Safe Migration to add calendar_guid column to users table if missing
  try {
    await dbInstance.run("ALTER TABLE users ADD COLUMN calendar_guid TEXT");
  } catch (err) {}

  // Safe Migration to add timezone column to users table if missing
  try {
    await dbInstance.run("ALTER TABLE users ADD COLUMN timezone TEXT DEFAULT 'US/New_York'");
  } catch (err) {}

  // Safe Migration to add m365 token columns to users table if missing
  try {
    await dbInstance.run("ALTER TABLE users ADD COLUMN m365_access_token TEXT");
  } catch (err) {}
  try {
    await dbInstance.run("ALTER TABLE users ADD COLUMN m365_refresh_token TEXT");
  } catch (err) {}
  try {
    await dbInstance.run("ALTER TABLE users ADD COLUMN m365_token_expires_at INTEGER");
  } catch (err) {}

  // Create notification logs table
  await dbInstance.exec(`
    CREATE TABLE IF NOT EXISTS notification_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      event_type TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Bootstrap default roles and admin user
  const adminRole = await dbInstance.get("SELECT id, permissions FROM roles WHERE name = 'Administrator'");
  const adminPermsObj = {
    recipes: 'full',
    planner: 'full',
    shopping_list: 'full',
    users: 'full',
    roles: 'full',
    todo: 'full',
    calendar: 'full',
    subscriptions: 'full',
    bills: 'full',
    settings_general: 'full',
    settings_users: 'full',
    settings_roles: 'full',
    settings_sso: 'full',
    settings_branding: 'full',
    settings_calendar: 'full'
  };
  let adminRoleId;
  if (!adminRole) {
    const result = await dbInstance.run(
      "INSERT INTO roles (name, permissions) VALUES ('Administrator', ?)",
      [JSON.stringify(adminPermsObj)]
    );
    adminRoleId = result.lastID;
  } else {
    adminRoleId = adminRole.id;
    await dbInstance.run(
      "UPDATE roles SET permissions = ? WHERE id = ?",
      [JSON.stringify(adminPermsObj), adminRoleId]
    );
  }

  const viewerRole = await dbInstance.get("SELECT id, permissions FROM roles WHERE name = 'Viewer'");
  const viewerPermsObj = {
    recipes: 'read',
    planner: 'read',
    shopping_list: 'read',
    users: 'none',
    roles: 'none',
    todo: 'read',
    calendar: 'read',
    subscriptions: 'read',
    bills: 'read',
    settings_general: 'read',
    settings_users: 'none',
    settings_roles: 'none',
    settings_sso: 'none',
    settings_branding: 'none',
    settings_calendar: 'full'
  };
  if (!viewerRole) {
    await dbInstance.run(
      "INSERT INTO roles (name, permissions) VALUES ('Viewer', ?)",
      [JSON.stringify(viewerPermsObj)]
    );
  } else {
    await dbInstance.run(
      "UPDATE roles SET permissions = ? WHERE id = ?",
      [JSON.stringify(viewerPermsObj), viewerRole.id]
    );
  }

  const adminUser = await dbInstance.get("SELECT id FROM users WHERE username = 'admin'");
  if (!adminUser) {
    const hashedPassword = hashPassword('admin123');
    await dbInstance.run(
      "INSERT INTO users (username, password, role_id) VALUES ('admin', ?, ?)",
      [hashedPassword, adminRoleId]
    );
  }

  return dbInstance;
}

// Database helper functions

export async function getSettings() {
  const db = await getDb();
  const rows = await db.all('SELECT * FROM settings');
  const settings = {};
  rows.forEach(r => {
    settings[r.key] = r.value;
  });
  return settings;
}

export async function saveSettings(settings) {
  const db = await getDb();
  await db.run('BEGIN TRANSACTION');
  try {
    for (const [key, val] of Object.entries(settings)) {
      await db.run(
        'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
        [key, String(val)]
      );
    }
    await db.run('COMMIT');
    return true;
  } catch (error) {
    await db.run('ROLLBACK');
    throw error;
  }
}


// Password utilities
export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password, storedPassword) {
  if (!storedPassword) return false;
  const [salt, originalHash] = storedPassword.split(':');
  if (!salt || !originalHash) return false;
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return hash === originalHash;
}

// User CRUD Helpers
export async function getUserByUsername(username) {
  const db = await getDb();
  return await db.get(`
    SELECT u.*, r.name as role_name, r.permissions as role_permissions 
    FROM users u
    LEFT JOIN roles r ON u.role_id = r.id
    WHERE u.username = ?
  `, [username]);
}

export async function getUserById(id) {
  const db = await getDb();
  return await db.get(`
    SELECT u.*, r.name as role_name, r.permissions as role_permissions 
    FROM users u
    LEFT JOIN roles r ON u.role_id = r.id
    WHERE u.id = ?
  `, [id]);
}

export async function getAllUsers() {
  const db = await getDb();
  return await db.all(`
    SELECT u.id, u.username, u.role_id, u.display_name, u.auth_provider, u.timezone, u.created_at, r.name as role_name 
    FROM users u
    LEFT JOIN roles r ON u.role_id = r.id
    ORDER BY u.username ASC
  `);
}

export async function createUser(username, password, roleId, displayName = null, authProvider = 'local') {
  const db = await getDb();
  const hashedPassword = hashPassword(password);
  const result = await db.run(
    "INSERT INTO users (username, password, role_id, display_name, auth_provider) VALUES (?, ?, ?, ?, ?)",
    [username, hashedPassword, roleId || null, displayName, authProvider]
  );
  return result.lastID;
}

export async function updateUser(id, username, password, roleId) {
  const db = await getDb();
  if (password && password.trim()) {
    const hashedPassword = hashPassword(password);
    await db.run(
      "UPDATE users SET username = ?, password = ?, role_id = ? WHERE id = ?",
      [username, hashedPassword, roleId || null, id]
    );
  } else {
    await db.run(
      "UPDATE users SET username = ?, role_id = ? WHERE id = ?",
      [username, roleId || null, id]
    );
  }
  return true;
}

export async function deleteUser(id) {
  const db = await getDb();
  const user = await getUserById(id);
  if (user && user.username === 'admin') {
    throw new Error("Cannot delete default admin user.");
  }
  const result = await db.run("DELETE FROM users WHERE id = ?", [id]);
  return result.changes > 0;
}

// Role CRUD Helpers
export async function getAllRoles() {
  const db = await getDb();
  return await db.all("SELECT * FROM roles ORDER BY name ASC");
}

export async function getRoleById(id) {
  const db = await getDb();
  return await db.get("SELECT * FROM roles WHERE id = ?", [id]);
}

export async function createRole(name, permissions) {
  const db = await getDb();
  const permsStr = typeof permissions === 'string' ? permissions : JSON.stringify(permissions);
  const result = await db.run(
    "INSERT INTO roles (name, permissions) VALUES (?, ?)",
    [name, permsStr]
  );
  return result.lastID;
}

export async function updateRole(id, name, permissions) {
  const db = await getDb();
  const permsStr = typeof permissions === 'string' ? permissions : JSON.stringify(permissions);
  await db.run(
    "UPDATE roles SET name = ?, permissions = ? WHERE id = ?",
    [name, permsStr, id]
  );
  return true;
}

export async function deleteRole(id) {
  const db = await getDb();
  const role = await getRoleById(id);
  if (role && role.name === 'Administrator') {
    throw new Error("Cannot delete Administrator role.");
  }
  const linkedUsers = await db.get("SELECT COUNT(*) as cnt FROM users WHERE role_id = ?", [id]);
  if (linkedUsers && linkedUsers.cnt > 0) {
    throw new Error("Cannot delete role; it is currently assigned to users.");
  }
  const result = await db.run("DELETE FROM roles WHERE id = ?", [id]);
  return result.changes > 0;
}
