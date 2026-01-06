const sqlite3 = require('sqlite3').verbose();

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

async function test() {
  const db = new sqlite3.Database(':memory:');
  const statements = SCHEMA.split(';').filter(s => s.trim());
  for (const stmt of statements) {
    await new Promise((resolve, reject) => {
      db.run(stmt, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  // Insert categories
  const categories = [
    { name: 'Study', description: 'Educational' },
    { name: 'Entertainment', description: 'Media' },
    { name: 'Social', description: 'Communication' },
    { name: 'Browsing', description: 'Web' },
    { name: 'Other', description: 'Default' }
  ];

  for (const cat of categories) {
    await new Promise((resolve, reject) => {
      db.run('INSERT INTO categories (name, description) VALUES (?, ?)', [cat.name, cat.description], function(err) {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  // Insert activities
  const activities = [
    { app_name: 'chrome', start_time: '2026-01-06T10:00:00Z', end_time: '2026-01-06T10:05:00Z', duration: 300, category_id: 4 },
    { app_name: 'vscode', start_time: '2026-01-06T10:05:00Z', end_time: '2026-01-06T10:10:00Z', duration: 300, category_id: 1 },
    { app_name: 'chrome', start_time: '2026-01-06T10:10:00Z', end_time: '2026-01-06T10:15:00Z', duration: 300, category_id: 4 },
  ];

  for (const act of activities) {
    await new Promise((resolve, reject) => {
      db.run('INSERT INTO activities (app_name, start_time, end_time, duration, category_id) VALUES (?, ?, ?, ?, ?)', [act.app_name, act.start_time, act.end_time, act.duration, act.category_id], function(err) {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  // Query
  const rows = await new Promise((resolve, reject) => {
    db.all('SELECT * FROM activities', [], (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });

  console.log('Activities:', rows);

  // Aggregate
  const totalTime = rows.reduce((sum, act) => sum + act.duration, 0);
  console.log('Total time:', totalTime);

  const categoryTimes = {};
  rows.forEach(act => {
    categoryTimes[act.category_id] = (categoryTimes[act.category_id] || 0) + act.duration;
  });
  console.log('Category times:', categoryTimes);

  db.close();
}

test().catch(console.error);