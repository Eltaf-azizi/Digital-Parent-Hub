const { app, BrowserWindow } = require('electron');
const activeWin = require('active-win');
const Database = require('./src/data/database');

let mainWindow;
let db;
let currentActivity = null;
let otherCategoryId;
const passphrase = 'digitalparent'; // Default passphrase for demo

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    show: false, // Run in background
    webPreferences: {
      nodeIntegration: true
    }
  });

  // Load a minimal HTML or keep hidden
  mainWindow.loadURL(`data:text/html,<html><body>Digital Parent Hub</body></html>`);

  // Initialize database
  db = new Database();
  await db.initDatabase(passphrase);
  await db.openDatabase(passphrase);

  // Ensure 'Other' category exists
  const categories = await db.getCategories();
  let otherCat = categories.find(c => c.name === 'Other');
  if (!otherCat) {
    const id = await db.addCategory({ name: 'Other', description: 'Default category' });
    otherCat = { id };
  }
  otherCategoryId = otherCat.id;

  // Start activity tracking
  startActivityTracking();
}

async function startActivityTracking() {
  setInterval(async () => {
    try {
      const active = await activeWin();
      if (!active) return;

      const appName = active.owner.name || 'Unknown';

      if (currentActivity && currentActivity.app_name !== appName) {
        // End previous activity
        const endTime = new Date().toISOString();
        const duration = Math.floor((new Date(endTime) - new Date(currentActivity.start_time)) / 1000);
        await db.addActivity({
          app_name: currentActivity.app_name,
          start_time: currentActivity.start_time,
          end_time: endTime,
          duration,
          category_id: currentActivity.category_id
        });
      }

      if (!currentActivity || currentActivity.app_name !== appName) {
        // Start new activity
        currentActivity = {
          app_name: appName,
          start_time: new Date().toISOString(),
          category_id: otherCategoryId
        };
      }
    } catch (error) {
      console.error('Error in activity tracking:', error);
    }
  }, 1000); // Poll every 1 second
}

app.whenReady().then(createWindow);

app.on('window-all-closed', async () => {
  // Save current activity on close
  if (currentActivity) {
    const endTime = new Date().toISOString();
    const duration = Math.floor((new Date(endTime) - new Date(currentActivity.start_time)) / 1000);
    await db.addActivity({
      app_name: currentActivity.app_name,
      start_time: currentActivity.start_time,
      end_time: endTime,
      duration,
      category_id: currentActivity.category_id
    });
  }
  await db.closeDatabase();
  app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});