const Database = require('better-sqlite3');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const os = require('os');

const SCHEMA = `
CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL,
  description TEXT
);

CREATE TABLE IF NOT EXISTS activities (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  app_name TEXT NOT NULL,
  start_time DATETIME NOT NULL,
  end_time DATETIME,
  duration INTEGER,
  category_id INTEGER,
  FOREIGN KEY (category_id) REFERENCES categories(id)
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT
);

CREATE TABLE IF NOT EXISTS reports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL,
  data TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
`;

const CATEGORY_RULES = {
  Browsing: ['chrome', 'firefox', 'edge', 'safari', 'opera'],
  Study: ['word', 'excel', 'powerpoint', 'notepad', 'vscode', 'sublime', 'adobe', 'pdf'],
  Entertainment: ['netflix', 'youtube', 'spotify', 'vlc', 'media player', 'twitch'],
  Social: ['skype', 'discord', 'facebook', 'twitter', 'instagram', 'whatsapp', 'telegram', 'zoom']
};

class MyDatabase {
  constructor() {
    this.db = null;
    this.key = null;
    this.tempPath = path.join(os.tmpdir(), 'digital_parent_temp.db');
    this.dbPath = path.join(__dirname, '../../database.db');
  }

  deriveKey(passphrase) {
    return crypto.pbkdf2Sync(passphrase, 'digital_parent_salt', 100000, 32, 'sha256');
  }

  encryptBuffer(buffer, key) {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    let encrypted = Buffer.concat([cipher.update(buffer), cipher.final()]);
    const authTag = cipher.getAuthTag();
    return Buffer.concat([iv, authTag, encrypted]);
  }

  decryptBuffer(encryptedBuffer, key) {
    const iv = encryptedBuffer.slice(0, 16);
    const authTag = encryptedBuffer.slice(16, 32);
    const encrypted = encryptedBuffer.slice(32);
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);
    return Buffer.concat([decipher.update(encrypted), decipher.final()]);
  }

  initDatabase(passphrase) {
    this.key = this.deriveKey(passphrase);
    if (!fs.existsSync(this.dbPath)) {
      // Create empty database
      const tempDb = new Database(this.tempPath);
      tempDb.exec(SCHEMA);
      tempDb.close();
      // Encrypt
      const data = fs.readFileSync(this.tempPath);
      const encrypted = this.encryptBuffer(data, this.key);
      fs.writeFileSync(this.dbPath, encrypted);
      fs.unlinkSync(this.tempPath);
    }
  }

  openDatabase(passphrase) {
    this.key = this.deriveKey(passphrase);
    if (fs.existsSync(this.dbPath)) {
      const encrypted = fs.readFileSync(this.dbPath);
      const decrypted = this.decryptBuffer(encrypted, this.key);
      fs.writeFileSync(this.tempPath, decrypted);
    }
    this.db = new Database(this.tempPath);
    this.db.exec(SCHEMA);
    this.initDefaultCategories();
  }

  closeDatabase() {
    if (this.db) {
      this.db.close();
      const data = fs.readFileSync(this.tempPath);
      const encrypted = this.encryptBuffer(data, this.key);
      fs.writeFileSync(this.dbPath, encrypted);
      fs.unlinkSync(this.tempPath);
      this.db = null;
    }
  }

  // Activity Management
  addActivity({ app_name, start_time, end_time, duration, category_id = null }) {
    if (category_id === null) {
      category_id = this.getCategoryForApp(app_name);
    }
    console.log(`[DEBUG] Adding activity: app=${app_name}, start=${start_time}, end=${end_time}, duration=${duration}, category_id=${category_id}`);
    const stmt = this.db.prepare(
      `INSERT INTO activities (app_name, start_time, end_time, duration, category_id) VALUES (?, ?, ?, ?, ?)`
    );
    const result = stmt.run(app_name, start_time, end_time, duration, category_id);
    return result.lastInsertRowid;
  }

  getActivities(filters = {}) {
    let query = 'SELECT * FROM activities';
    const params = [];
    if (filters.category_id) {
      query += ' WHERE category_id = ?';
      params.push(filters.category_id);
    }
    if (filters.start_time) {
      query += params.length ? ' AND' : ' WHERE';
      query += ' start_time >= ?';
      params.push(filters.start_time);
    }
    if (filters.end_time) {
      query += params.length ? ' AND' : ' WHERE';
      query += ' end_time <= ?';
      params.push(filters.end_time);
    }
    query += ' ORDER BY start_time DESC';
    const stmt = this.db.prepare(query);
    return stmt.all(params);
  }

  updateActivity(id, updates) {
    const fields = Object.keys(updates);
    const values = Object.values(updates);
    const setClause = fields.map((f) => `${f} = ?`).join(', ');
    values.push(id);
    const stmt = this.db.prepare(`UPDATE activities SET ${setClause} WHERE id = ?`);
    const result = stmt.run(values);
    return result.changes;
  }

  deleteActivity(id) {
    const stmt = this.db.prepare('DELETE FROM activities WHERE id = ?');
    const result = stmt.run(id);
    return result.changes;
  }

  // Category Management
  addCategory({ name, description }) {
    const stmt = this.db.prepare('INSERT INTO categories (name, description) VALUES (?, ?)');
    const result = stmt.run(name, description);
    return result.lastInsertRowid;
  }

  getCategories() {
    const stmt = this.db.prepare('SELECT * FROM categories');
    return stmt.all();
  }

  updateCategory(id, { name, description }) {
    const stmt = this.db.prepare('UPDATE categories SET name = ?, description = ? WHERE id = ?');
    const result = stmt.run(name, description, id);
    return result.changes;
  }

  deleteCategory(id) {
    const stmt = this.db.prepare('DELETE FROM categories WHERE id = ?');
    const result = stmt.run(id);
    return result.changes;
  }

  initDefaultCategories() {
    const defaults = [
      { name: 'Study', description: 'Educational and productivity applications' },
      { name: 'Entertainment', description: 'Media and leisure applications' },
      { name: 'Social', description: 'Communication and social media applications' },
      { name: 'Browsing', description: 'Web browsers and internet navigation' },
      { name: 'Other', description: 'Uncategorized applications' }
    ];
    for (const cat of defaults) {
      try {
        this.addCategory(cat);
      } catch (e) {
        // Ignore if already exists, due to UNIQUE constraint
      }
    }
  }

  getCategoryForApp(appName) {
    const lowerApp = appName.toLowerCase();
    for (const [category, keywords] of Object.entries(CATEGORY_RULES)) {
      if (keywords.some(keyword => lowerApp.includes(keyword))) {
        const categories = this.getCategories();
        const cat = categories.find(c => c.name === category);
        if (cat) return cat.id;
      }
    }
    // Default to Other
    const categories = this.getCategories();
    const other = categories.find(c => c.name === 'Other');
    return other ? other.id : null;
  }

  applyCategorizationToActivities() {
    const activities = this.getActivities();
    for (const activity of activities) {
      if (!activity.category_id) {
        const category_id = this.getCategoryForApp(activity.app_name);
        this.updateActivity(activity.id, { category_id });
      }
    }
  }

  // Settings Management
  getSetting(key) {
    const stmt = this.db.prepare('SELECT value FROM settings WHERE key = ?');
    const row = stmt.get(key);
    return row ? row.value : null;
  }

  setSetting(key, value) {
    const stmt = this.db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
    const result = stmt.run(key, value);
    return result.changes;
  }

  // SMTP Settings Management
  getSmtpSettings() {
    const host = this.getSetting('smtp_host');
    const port = this.getSetting('smtp_port');
    const user = this.getSetting('smtp_user');
    const pass = this.getSetting('smtp_pass');
    const from = this.getSetting('smtp_from');
    return { host, port: port ? parseInt(port) : null, user, pass, from };
  }

  setSmtpSettings({ host, port, user, pass, from }) {
    this.setSetting('smtp_host', host);
    this.setSetting('smtp_port', port.toString());
    this.setSetting('smtp_user', user);
    this.setSetting('smtp_pass', pass);
    this.setSetting('smtp_from', from);
  }

  // Report Caching
  saveReport({ type, data }) {
    const stmt = this.db.prepare('INSERT INTO reports (type, data) VALUES (?, ?)');
    const result = stmt.run(type, JSON.stringify(data));
    return result.lastInsertRowid;
  }

  getReports(type = null) {
    let query = 'SELECT * FROM reports';
    const params = [];
    if (type) {
      query += ' WHERE type = ?';
      params.push(type);
    }
    query += ' ORDER BY created_at DESC';
    const stmt = this.db.prepare(query);
    const rows = stmt.all(params);
    return rows.map((r) => ({ ...r, data: JSON.parse(r.data) }));
  }

  deleteReport(id) {
    const stmt = this.db.prepare('DELETE FROM reports WHERE id = ?');
    const result = stmt.run(id);
    return result.changes;
  }

  // Encryption/Decryption API
  encryptFile(filePath, passphrase) {
    const key = this.deriveKey(passphrase);
    const data = fs.readFileSync(filePath);
    const encrypted = this.encryptBuffer(data, key);
    fs.writeFileSync(filePath, encrypted);
  }

  decryptFile(filePath, passphrase) {
    const key = this.deriveKey(passphrase);
    const encrypted = fs.readFileSync(filePath);
    const decrypted = this.decryptBuffer(encrypted, key);
    fs.writeFileSync(filePath, decrypted);
  }

  // Export Data
  exportData(format) {
    if (format === 'json') {
      const activities = this.getActivities();
      const categories = this.getCategories();
      const settings = {};
      // Get all settings
      const stmt = this.db.prepare('SELECT key, value FROM settings');
      const settingRows = stmt.all();
      settingRows.forEach(row => settings[row.key] = row.value);
      const data = { activities, categories, settings };
      return JSON.stringify(data, null, 2);
    } else if (format === 'pdf') {
      // For simplicity, return JSON as PDF is not implemented
      throw new Error('PDF export not implemented');
    } else {
      throw new Error('Unsupported format');
    }
  }

  // Backup Database
  backupDatabase(backupPath) {
    if (fs.existsSync(this.dbPath)) {
      fs.copyFileSync(this.dbPath, backupPath);
      return backupPath;
    } else {
      throw new Error('Database file not found');
    }
  }

  // Restore Database
  restoreDatabase(backupPath, passphrase) {
    if (fs.existsSync(backupPath)) {
      // Close current db
      this.closeDatabase();
      // Copy backup
      fs.copyFileSync(backupPath, this.dbPath);
      // Reopen
      this.openDatabase(passphrase);
    } else {
      throw new Error('Backup file not found');
    }
  }

  // Delete All Data
  deleteAllData() {
    this.db.exec('DELETE FROM activities; DELETE FROM reports; DELETE FROM categories; DELETE FROM settings;');
  }
}

module.exports = MyDatabase;