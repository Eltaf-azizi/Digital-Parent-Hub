const sqlite3 = require('sqlite3').verbose();
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

class Database {
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
    const cipher = crypto.createCipher('aes-256-gcm', key);
    let encrypted = Buffer.concat([cipher.update(buffer), cipher.final()]);
    const authTag = cipher.getAuthTag();
    return Buffer.concat([iv, authTag, encrypted]);
  }

  decryptBuffer(encryptedBuffer, key) {
    const iv = encryptedBuffer.slice(0, 16);
    const authTag = encryptedBuffer.slice(16, 32);
    const encrypted = encryptedBuffer.slice(32);
    const decipher = crypto.createDecipher('aes-256-gcm', key);
    decipher.setAuthTag(authTag);
    return Buffer.concat([decipher.update(encrypted), decipher.final()]);
  }

  async initDatabase(passphrase) {
    this.key = this.deriveKey(passphrase);
    if (!fs.existsSync(this.dbPath)) {
      // Create empty database
      const tempDb = new sqlite3.Database(this.tempPath);
      await new Promise((resolve, reject) => {
        tempDb.serialize(() => {
          tempDb.run(SCHEMA, (err) => {
            if (err) reject(err);
            else resolve();
          });
        });
      });
      tempDb.close();
      // Encrypt
      const data = fs.readFileSync(this.tempPath);
      const encrypted = this.encryptBuffer(data, this.key);
      fs.writeFileSync(this.dbPath, encrypted);
      fs.unlinkSync(this.tempPath);
    }
  }

  async openDatabase(passphrase) {
    this.key = this.deriveKey(passphrase);
    if (fs.existsSync(this.dbPath)) {
      const encrypted = fs.readFileSync(this.dbPath);
      const decrypted = this.decryptBuffer(encrypted, this.key);
      fs.writeFileSync(this.tempPath, decrypted);
    }
    this.db = new sqlite3.Database(this.tempPath);
    await new Promise((resolve, reject) => {
      this.db.serialize(() => {
        this.db.run(SCHEMA, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    });
    await this.initDefaultCategories();
  }

  async closeDatabase() {
    if (this.db) {
      await new Promise((resolve, reject) => {
        this.db.close((err) => {
          if (err) reject(err);
          else resolve();
        });
      });
      const data = fs.readFileSync(this.tempPath);
      const encrypted = this.encryptBuffer(data, this.key);
      fs.writeFileSync(this.dbPath, encrypted);
      fs.unlinkSync(this.tempPath);
      this.db = null;
    }
  }

  // Activity Management
  async addActivity({ app_name, start_time, end_time, duration, category_id = null }) {
    if (category_id === null) {
      category_id = await this.getCategoryForApp(app_name);
    }
    return new Promise((resolve, reject) => {
      this.db.run(
        `INSERT INTO activities (app_name, start_time, end_time, duration, category_id) VALUES (?, ?, ?, ?, ?)`,
        [app_name, start_time, end_time, duration, category_id],
        function (err) {
          if (err) reject(err);
          else resolve(this.lastID);
        }
      );
    });
  }

  async getActivities(filters = {}) {
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
    return new Promise((resolve, reject) => {
      this.db.all(query, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  async updateActivity(id, updates) {
    const fields = Object.keys(updates);
    const values = Object.values(updates);
    const setClause = fields.map((f) => `${f} = ?`).join(', ');
    values.push(id);
    return new Promise((resolve, reject) => {
      this.db.run(`UPDATE activities SET ${setClause} WHERE id = ?`, values, function (err) {
        if (err) reject(err);
        else resolve(this.changes);
      });
    });
  }

  async deleteActivity(id) {
    return new Promise((resolve, reject) => {
      this.db.run('DELETE FROM activities WHERE id = ?', [id], function (err) {
        if (err) reject(err);
        else resolve(this.changes);
      });
    });
  }

  // Category Management
  async addCategory({ name, description }) {
    return new Promise((resolve, reject) => {
      this.db.run('INSERT INTO categories (name, description) VALUES (?, ?)', [name, description], function (err) {
        if (err) reject(err);
        else resolve(this.lastID);
      });
    });
  }

  async getCategories() {
    return new Promise((resolve, reject) => {
      this.db.all('SELECT * FROM categories', [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  async updateCategory(id, { name, description }) {
    return new Promise((resolve, reject) => {
      this.db.run('UPDATE categories SET name = ?, description = ? WHERE id = ?', [name, description, id], function (err) {
        if (err) reject(err);
        else resolve(this.changes);
      });
    });
  }

  async deleteCategory(id) {
    return new Promise((resolve, reject) => {
      this.db.run('DELETE FROM categories WHERE id = ?', [id], function (err) {
        if (err) reject(err);
        else resolve(this.changes);
      });
    });
  }

  async initDefaultCategories() {
    const defaults = [
      { name: 'Study', description: 'Educational and productivity applications' },
      { name: 'Entertainment', description: 'Media and leisure applications' },
      { name: 'Social', description: 'Communication and social media applications' },
      { name: 'Browsing', description: 'Web browsers and internet navigation' },
      { name: 'Other', description: 'Uncategorized applications' }
    ];
    for (const cat of defaults) {
      try {
        await this.addCategory(cat);
      } catch (e) {
        // Ignore if already exists, due to UNIQUE constraint
      }
    }
  }

  async getCategoryForApp(appName) {
    const lowerApp = appName.toLowerCase();
    for (const [category, keywords] of Object.entries(CATEGORY_RULES)) {
      if (keywords.some(keyword => lowerApp.includes(keyword))) {
        const categories = await this.getCategories();
        const cat = categories.find(c => c.name === category);
        if (cat) return cat.id;
      }
    }
    // Default to Other
    const categories = await this.getCategories();
    const other = categories.find(c => c.name === 'Other');
    return other ? other.id : null;
  }

  async applyCategorizationToActivities() {
    const activities = await this.getActivities();
    for (const activity of activities) {
      if (!activity.category_id) {
        const category_id = await this.getCategoryForApp(activity.app_name);
        await this.updateActivity(activity.id, { category_id });
      }
    }
  }

  // Settings Management
  async getSetting(key) {
    return new Promise((resolve, reject) => {
      this.db.get('SELECT value FROM settings WHERE key = ?', [key], (err, row) => {
        if (err) reject(err);
        else resolve(row ? row.value : null);
      });
    });
  }

  async setSetting(key, value) {
    return new Promise((resolve, reject) => {
      this.db.run('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [key, value], function (err) {
        if (err) reject(err);
        else resolve(this.changes);
      });
    });
  }

  // Report Caching
  async saveReport({ type, data }) {
    return new Promise((resolve, reject) => {
      this.db.run('INSERT INTO reports (type, data) VALUES (?, ?)', [type, JSON.stringify(data)], function (err) {
        if (err) reject(err);
        else resolve(this.lastID);
      });
    });
  }

  async getReports(type = null) {
    let query = 'SELECT * FROM reports';
    const params = [];
    if (type) {
      query += ' WHERE type = ?';
      params.push(type);
    }
    query += ' ORDER BY created_at DESC';
    return new Promise((resolve, reject) => {
      this.db.all(query, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows.map((r) => ({ ...r, data: JSON.parse(r.data) })));
      });
    });
  }

  async deleteReport(id) {
    return new Promise((resolve, reject) => {
      this.db.run('DELETE FROM reports WHERE id = ?', [id], function (err) {
        if (err) reject(err);
        else resolve(this.changes);
      });
    });
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
}

module.exports = Database;