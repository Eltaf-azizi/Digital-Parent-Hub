const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class MyDatabase {
  constructor() {
    this.dbPath = path.join(__dirname, '../../database.json');
    this.data = {
      categories: [],
      activities: [],
      settings: {},
      reports: [],
      smtpSettings: {}
    };
    this.passphrase = null;
  }

  initDatabase(passphrase) {
    this.passphrase = passphrase;
    if (fs.existsSync(this.dbPath)) {
      const encrypted = fs.readFileSync(this.dbPath);
      const decrypted = this.decryptBuffer(encrypted);
      this.data = JSON.parse(decrypted.toString());
    } else {
      this.createDefaultData();
      this.saveDatabase();
    }
  }

  openDatabase(passphrase) {
    if (this.passphrase !== passphrase) {
      throw new Error('Invalid passphrase');
    }
  }

  createDefaultData() {
    this.data.categories = [
      { id: 1, name: 'Study', description: 'Educational activities' },
      { id: 2, name: 'Entertainment', description: 'Media and games' },
      { id: 3, name: 'Social', description: 'Communication apps' },
      { id: 4, name: 'Browsing', description: 'Web browsing' },
      { id: 5, name: 'Other', description: 'Uncategorized activities' }
    ];
  }

  encryptBuffer(buffer) {
    const key = crypto.scryptSync(this.passphrase, 'salt', 32);
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    const encrypted = Buffer.concat([cipher.update(buffer), cipher.final()]);
    return Buffer.concat([iv, encrypted]);
  }

  decryptBuffer(buffer) {
    const key = crypto.scryptSync(this.passphrase, 'salt', 32);
    const iv = buffer.subarray(0, 16);
    const encrypted = buffer.subarray(16);
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    return Buffer.concat([decipher.update(encrypted), decipher.final()]);
  }

  saveDatabase() {
    const json = JSON.stringify(this.data, null, 2);
    const encrypted = this.encryptBuffer(Buffer.from(json));
    fs.writeFileSync(this.dbPath, encrypted);
  }

  closeDatabase() {
    this.saveDatabase();
  }

  // Categories
  getCategories() {
    return this.data.categories;
  }

  addCategory(category) {
    const id = Math.max(...this.data.categories.map(c => c.id), 0) + 1;
    const newCat = { id, ...category };
    this.data.categories.push(newCat);
    this.saveDatabase();
    return id;
  }

  updateCategory(id, updates) {
    const cat = this.data.categories.find(c => c.id === id);
    if (cat) {
      Object.assign(cat, updates);
      this.saveDatabase();
    }
  }

  // Activities
  addActivity(activity) {
    const id = Math.max(...this.data.activities.map(a => a.id), 0) + 1;
    const newAct = { id, ...activity };
    this.data.activities.push(newAct);
    this.saveDatabase();
  }

  getActivities(filters = {}) {
    let activities = [...this.data.activities];

    if (filters.start_time) {
      activities = activities.filter(a => a.start_time >= filters.start_time);
    }
    if (filters.end_time) {
      activities = activities.filter(a => a.start_time < filters.end_time);
    }
    if (filters.app_name) {
      activities = activities.filter(a => a.app_name === filters.app_name);
    }

    return activities.sort((a, b) => new Date(b.start_time) - new Date(a.start_time));
  }

  // Settings
  getSetting(key) {
    return this.data.settings[key] || null;
  }

  setSetting(key, value) {
    this.data.settings[key] = value;
    this.saveDatabase();
  }

  // Reports
  getReports() {
    return this.data.reports;
  }

  addReport(type, data) {
    const id = Math.max(...this.data.reports.map(r => r.id), 0) + 1;
    const report = {
      id,
      type,
      data: JSON.stringify(data),
      created_at: new Date().toISOString()
    };
    this.data.reports.push(report);
    this.saveDatabase();
  }

  // SMTP Settings
  getSmtpSettings() {
    return this.data.smtpSettings;
  }

  setSmtpSettings(settings) {
    this.data.smtpSettings = settings;
    this.saveDatabase();
  }

  // Backup and restore
  backupDatabase(backupPath) {
    fs.copyFileSync(this.dbPath, backupPath);
  }

  restoreDatabase(backupPath, passphrase) {
    fs.copyFileSync(backupPath, this.dbPath);
    this.passphrase = passphrase;
    const encrypted = fs.readFileSync(this.dbPath);
    const decrypted = this.decryptBuffer(encrypted);
    this.data = JSON.parse(decrypted.toString());
  }

  // Export data
  exportData(format) {
    const data = {
      categories: this.data.categories,
      activities: this.data.activities,
      settings: this.data.settings,
      reports: this.data.reports
    };

    if (format === 'json') {
      return JSON.stringify(data, null, 2);
    } else if (format === 'csv') {
      const csv = ['id,app_name,start_time,end_time,duration,category_id'];
      data.activities.forEach(act => {
        csv.push(`${act.id},${act.app_name},${act.start_time},${act.end_time},${act.duration},${act.category_id}`);
      });
      return csv.join('\n');
    }
    return JSON.stringify(data);
  }

  // Delete all data
  deleteAllData() {
    this.data = {
      categories: [],
      activities: [],
      settings: {},
      reports: [],
      smtpSettings: {}
    };
    this.createDefaultData();
    this.saveDatabase();
  }
}

module.exports = MyDatabase;