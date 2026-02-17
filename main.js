// Electron main process
const path = require('path');

// For Electron, we need to use the electron module directly
// In newer Electron versions, require('electron') returns the electron object properly
// when running via electron command
let app, BrowserWindow, ipcMain, Notification, dialog;

// Try to get electron modules - these are available as globals in Electron main process
try {
  // Try using global electron object first
  if (typeof global !== 'undefined' && global.electron) {
    ({ app, BrowserWindow, ipcMain, Notification, dialog } = global.electron);
  }
  
  // If not available, try requiring electron
  if (!app) {
    const electron = require('electron');
    if (typeof electron === 'object' && electron.app) {
      ({ app, BrowserWindow, ipcMain, Notification, dialog } = electron);
    }
  }
} catch (e) {
  console.error('Error loading electron:', e);
}

// If still not loaded, try one more time with the path
if (!app) {
  try {
    const electronPath = path.join(__dirname, 'node_modules', 'electron');
    const electron = require(electronPath);
    ({ app, BrowserWindow, ipcMain, Notification, dialog } = electron);
  } catch (e) {
    console.error('Final electron load attempt failed:', e);
  }
}

console.log('App available:', typeof app);
console.log('BrowserWindow available:', typeof BrowserWindow);

require('dotenv').config();

// Start the bundled Express server so renderer can fetch APIs at runtime
try {
  require('./server');
} catch (e) {
  console.error('Could not start embedded server:', e);
}

const activeWin = require('active-win');
const Database = require('./src/data/database');
const Reports = require('./src/reports/reports');
const EmailService = require('./src/email/emailService');
const ActivityTracker = require('./src/tracking/activityTracker');

let mainWindow;
let db;
let reports;
let emailService;
let activityTracker;
let currentActivity = null;
let otherCategoryId;
const passphrase = process.env.DATABASE_PASSPHRASE || 'digitalparent';

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  // Load the React app
  mainWindow.loadFile('src/public/index.html');
  // Open DevTools for renderer debugging
  try { mainWindow.webContents.openDevTools(); } catch (e) { console.error('Could not open DevTools', e); }
  // Forward renderer console messages to main process stdout for easier debugging
  try {
    mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
      console.log(`[Renderer console:${level}] ${message} (line ${line} - ${sourceId})`);
    });
    mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
      console.error('[Renderer] Failed to load:', errorCode, errorDescription, validatedURL);
    });
  } catch (e) {
    console.error('Could not attach webContents listeners', e);
  }

  // Initialize database
  db = new Database();
  db.initDatabase(passphrase);
  db.openDatabase(passphrase);

  // Initialize reports and email service
  reports = new Reports(db);
  emailService = new EmailService(db, reports);
  
  // Initialize activity tracker
  activityTracker = new ActivityTracker(db);
  activityTracker.startTracking();

  // Set default alert settings
  const defaultScreenLimit = 28800; // 8 hours in seconds
  const defaultStudyGoal = 7200; // 2 hours in seconds
  if (!db.getSetting('daily_screen_limit')) {
    db.setSetting('daily_screen_limit', defaultScreenLimit.toString());
  }
  if (!db.getSetting('study_goal')) {
    db.setSetting('study_goal', defaultStudyGoal.toString());
  }

  // IPC handlers
  ipcMain.handle('get-dashboard-data', () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const activities = db.getActivities({
      start_time: today.toISOString(),
      end_time: tomorrow.toISOString()
    });

    const totalTime = activities.reduce((sum, act) => sum + act.duration, 0);

    const categories = db.getCategories();
    const categoryMap = {};
    categories.forEach(cat => categoryMap[cat.id] = cat.name);

    const categoryTimes = {};
    activities.forEach(act => {
      const catName = categoryMap[act.category_id] || 'Other';
      categoryTimes[catName] = (categoryTimes[catName] || 0) + act.duration;
    });

    const categoryData = Object.entries(categoryTimes).map(([name, time]) => ({ name, time }));

    const studyTime = categoryTimes['Study'] || 0;
    const productivityScore = totalTime > 0 ? Math.round((studyTime / totalTime) * 100) : 0;

    let insights = 'Keep up the good work!';
    if (productivityScore > 70) {
      insights = 'Excellent! You\'re spending a great deal of time on productive activities.';
    } else if (productivityScore > 40) {
      insights = 'Good balance! Consider increasing study time for even better productivity.';
    } else {
      insights = 'Let\'s focus more on study activities to boost your productivity.';
    }

    return { totalTime, categories: categoryData, productivityScore, insights };
  });

  ipcMain.handle('get-child-data', () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const activities = db.getActivities({
      start_time: today.toISOString(),
      end_time: tomorrow.toISOString()
    });

    const totalTime = activities.reduce((sum, act) => sum + act.duration, 0);

    const categories = db.getCategories();
    const categoryMap = {};
    categories.forEach(cat => categoryMap[cat.id] = cat.name);

    const categoryTimes = {};
    activities.forEach(act => {
      const catName = categoryMap[act.category_id] || 'Other';
      categoryTimes[catName] = (categoryTimes[catName] || 0) + act.duration;
    });

    const categoryData = Object.entries(categoryTimes).map(([name, time]) => ({ name, time }));

    const studyTime = categoryTimes['Study'] || 0;
    const productivityScore = totalTime > 0 ? Math.round((studyTime / totalTime) * 100) : 0;

    // Calculate streaks: consecutive days with productivityScore > 50
    let streak = 0;
    for (let i = 0; i < 30; i++) { // Check last 30 days
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const start = new Date(date);
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setDate(end.getDate() + 1);

      const dayActivities = db.getActivities({
        start_time: start.toISOString(),
        end_time: end.toISOString()
      });
      const dayTotal = dayActivities.reduce((sum, act) => sum + act.duration, 0);
      const dayStudy = dayActivities.reduce((sum, act) => {
        const catName = categoryMap[act.category_id] || 'Other';
        return catName === 'Study' ? sum + act.duration : sum;
      }, 0);
      const dayScore = dayTotal > 0 ? Math.round((dayStudy / dayTotal) * 100) : 0;
      if (dayScore > 50) {
        streak++;
      } else {
        break;
      }
    }

    let tips = 'Great job today!';
    if (productivityScore > 70) {
      tips = 'Awesome! You\'re a productivity star. Keep it up!';
    } else if (productivityScore > 40) {
      tips = 'Good work! Try to spend a bit more time on study activities.';
    } else {
      tips = 'Remember to balance your time with more productive activities!';
    }

    return { totalTime, categoryBalance: categoryData, streak, tips };
  });

  ipcMain.handle('get-parent-data', () => {
    // Full analytics: today's data plus historical, reports, etc.
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const activities = db.getActivities({
      start_time: today.toISOString(),
      end_time: tomorrow.toISOString()
    });

    const totalTime = activities.reduce((sum, act) => sum + act.duration, 0);

    const categories = db.getCategories();
    const categoryMap = {};
    categories.forEach(cat => categoryMap[cat.id] = cat.name);

    const categoryTimes = {};
    activities.forEach(act => {
      const catName = categoryMap[act.category_id] || 'Other';
      categoryTimes[catName] = (categoryTimes[catName] || 0) + act.duration;
    });

    const categoryData = Object.entries(categoryTimes).map(([name, time]) => ({ name, time }));

    const studyTime = categoryTimes['Study'] || 0;
    const productivityScore = totalTime > 0 ? Math.round((studyTime / totalTime) * 100) : 0;

    let insights = 'Keep up the good work!';
    if (productivityScore > 70) {
      insights = 'Excellent! You\'re spending a great deal of time on productive activities.';
    } else if (productivityScore > 40) {
      insights = 'Good balance! Consider increasing study time for even better productivity.';
    } else {
      insights = 'Let\'s focus more on study activities to boost your productivity.';
    }

    // Get reports
    const cachedReports = db.getReports();

    // Alerts: simple logic, e.g., if total time > 8 hours, alert
    const alerts = [];
    if (totalTime > 28800) { // 8 hours in seconds
      alerts.push('High screen time today! Consider taking a break.');
    }

    return { totalTime, categories: categoryData, productivityScore, insights, reports: cachedReports, alerts, categoriesList: categories };
  });

  ipcMain.handle('verify-parent-pin', (event, pin) => {
    const storedPin = db.getSetting('parent_pin');
    return storedPin === pin;
  });

  ipcMain.handle('set-parent-pin', (event, pin) => {
    db.setSetting('parent_pin', pin);
  });

  ipcMain.handle('get-onboarding-completed', () => {
    const completed = db.getSetting('onboarding_completed');
    return completed === 'true';
  });

  ipcMain.handle('set-onboarding-completed', (event, completed) => {
    db.setSetting('onboarding_completed', completed ? 'true' : 'false');
  });

  // Settings handlers
  ipcMain.handle('get-settings', () => {
    const categories = db.getCategories();
    const theme = db.getSetting('theme') || 'light';
    const reportFrequencyStr = db.getSetting('report_frequency');
    const reportFrequency = reportFrequencyStr ? JSON.parse(reportFrequencyStr) : { daily: true, weekly: false, monthly: false, yearly: false };
    const emailRecipient = db.getSetting('email_recipient') || '';
    const smtp = db.getSmtpSettings();
    const screenLimit = parseInt(db.getSetting('daily_screen_limit')) || 28800;
    const studyGoal = parseInt(db.getSetting('study_goal')) || 7200;
    return { categories, theme, reportFrequency, emailRecipient, smtp, screenLimit, studyGoal };
  });

  ipcMain.handle('save-settings', (event, settings) => {
    // Save categories
    for (const cat of settings.categories) {
      if (cat.id) {
        db.updateCategory(cat.id, { name: cat.name, description: cat.description });
      } else {
        db.addCategory({ name: cat.name, description: cat.description });
      }
    }
    db.setSetting('theme', settings.theme);
    db.setSetting('report_frequency', JSON.stringify(settings.reportFrequency));
    db.setSetting('email_recipient', settings.emailRecipient);
    db.setSmtpSettings(settings.smtp);
    db.setSetting('daily_screen_limit', settings.screenLimit.toString());
    db.setSetting('study_goal', settings.studyGoal.toString());
  });

  ipcMain.handle('delete-category', (event, categoryId) => {
    try {
      db.deleteCategory(categoryId);
      return { success: true };
    } catch (error) {
      console.error('Error deleting category:', error);
      throw error;
    }
  });

  ipcMain.handle('export-data', async (event, format) => {
    try {
      let data;
      
      if (format === 'pdf') {
        data = await db.exportData(format);
      } else {
        data = db.exportData(format);
      }
      
      const result = dialog.showSaveDialogSync(mainWindow, {
        title: `Export data as ${format.toUpperCase()}`,
        filters: [{ name: format.toUpperCase(), extensions: [format] }]
      });
      if (result) {
        require('fs').writeFileSync(result, data);
        return result;
      }
      return null;
    } catch (error) {
      console.error('Export error:', error);
      throw error;
    }
  });

  ipcMain.handle('backup-database', () => {
    const result = dialog.showSaveDialogSync(mainWindow, {
      title: 'Backup Database',
      filters: [{ name: 'Encrypted Database', extensions: ['db'] }]
    });
    if (result) {
      db.backupDatabase(result);
      return result;
    }
    return null;
  });

  ipcMain.handle('restore-database', (event, filePath) => {
    db.restoreDatabase(filePath, passphrase);
  });

  ipcMain.handle('delete-all-data', () => {
    db.deleteAllData();
  });

  // Report generation handlers
  ipcMain.handle('generate-report', async (event, type, startDate) => {
    try {
      const date = new Date(startDate);
      let report;
      switch (type) {
        case 'daily':
          report = await reports.generateDailyReport(date);
          break;
        case 'weekly':
          report = await reports.generateWeeklyReport(date);
          break;
        case 'monthly':
          report = await reports.generateMonthlyReport(date);
          break;
        case 'yearly':
          report = await reports.generateYearlyReport(date);
          break;
        default:
          throw new Error('Invalid report type');
      }
      return report;
    } catch (error) {
      console.error('Error generating report:', error);
      throw error;
    }
  });

  ipcMain.handle('get-reports', () => {
    try {
      return db.getReports();
    } catch (error) {
      console.error('Error fetching reports:', error);
      throw error;
    }
  });

  ipcMain.handle('store-report', (event, type, data) => {
    try {
      db.addReport(type, data);
      return { success: true };
    } catch (error) {
      console.error('Error storing report:', error);
      throw error;
    }
  });

  ipcMain.handle('send-report-email', async (event, toEmail, type, startDate) => {
    try {
      const date = new Date(startDate);
      switch (type) {
        case 'daily':
          await emailService.sendDailyReportEmail(toEmail, date);
          break;
        case 'weekly':
          await emailService.sendWeeklyReportEmail(toEmail, date);
          break;
        case 'monthly':
          await emailService.sendMonthlyReportEmail(toEmail, date);
          break;
        case 'yearly':
          await emailService.sendYearlyReportEmail(toEmail, date);
          break;
        default:
          throw new Error('Invalid report type');
      }
      return { success: true };
    } catch (error) {
      console.error('Error sending email:', error);
      throw error;
    }
  });

  // Activity Tracking IPC handlers
  ipcMain.handle('start-tracking', () => {
    if (activityTracker) {
      activityTracker.startTracking();
      return { success: true };
    }
    return { success: false, error: 'Activity tracker not initialized' };
  });

  ipcMain.handle('stop-tracking', () => {
    if (activityTracker) {
      activityTracker.stopTracking();
      return { success: true };
    }
    return { success: false, error: 'Activity tracker not initialized' };
  });

  ipcMain.handle('get-tracking-status', () => {
    if (activityTracker) {
      return activityTracker.getStatus();
    }
    return { isTracking: false };
  });

  // App Mapping IPC handlers
  ipcMain.handle('get-app-mappings', () => {
    return db.getAppMappings();
  });

  ipcMain.handle('set-app-mapping', (event, appName, categoryId) => {
    db.setAppMapping(appName, categoryId);
    return { success: true };
  });

  ipcMain.handle('delete-app-mapping', (event, appName) => {
    db.deleteAppMapping(appName);
    return { success: true };
  });

  // Alert IPC handlers
  ipcMain.handle('get-alerts', () => {
    return db.getAlerts();
  });

  ipcMain.handle('clear-alerts', () => {
    // Clear alerts older than 7 days
    db.clearOldAlerts(7);
    return { success: true };
  });

  // Window control handlers
  ipcMain.handle('minimize-window', () => {
    if (mainWindow) mainWindow.minimize();
  });

  ipcMain.handle('maximize-window', () => {
    if (mainWindow) {
      if (mainWindow.isMaximized()) {
        mainWindow.unmaximize();
      } else {
        mainWindow.maximize();
      }
    }
  });

  ipcMain.handle('close-window', () => {
    if (mainWindow) mainWindow.close();
  });

  // Ensure 'Other' category exists
  const categories = db.getCategories();
  let otherCat = categories.find(c => c.name === 'Other');
  if (!otherCat) {
    const id = db.addCategory({ name: 'Other', description: 'Default category' });
    otherCat = { id };
  }
  otherCategoryId = otherCat.id;

  // Start activity tracking
  startActivityTracking();

  // Start alert checker
  checkAlerts();
  setInterval(checkAlerts, 5 * 60 * 1000); // Check every 5 minutes

  // Schedule report generation based on settings (generate now, then run periodically)
  scheduleReports();

  // Schedule automated email reports if SMTP is configured
  emailService.scheduleAutomatedEmails();
}

function scheduleReports() {
  try {
    const freqStr = db.getSetting('report_frequency');
    const freq = freqStr ? JSON.parse(freqStr) : { daily: true, weekly: false, monthly: false, yearly: false };

    // Helper to generate and store a report
    const genAndStore = async (type, date) => {
      try {
        let report;
        switch (type) {
          case 'daily':
            report = await reports.generateDailyReport(date);
            break;
          case 'weekly':
            report = await reports.generateWeeklyReport(date);
            break;
          case 'monthly':
            report = await reports.generateMonthlyReport(date);
            break;
          case 'yearly':
            report = await reports.generateYearlyReport(date);
            break;
        }
        if (report) {
          db.addReport(type, report);
        }
      } catch (err) {
        console.error('Error generating report:', err);
      }
    };

    const now = new Date();
    // Generate immediately for enabled frequencies
    if (freq.daily) genAndStore('daily', now);
    if (freq.weekly) genAndStore('weekly', now);
    if (freq.monthly) genAndStore('monthly', now);
    if (freq.yearly) genAndStore('yearly', now);

    // Schedule periodic generation: daily at 00:00 (approx)
    if (freq.daily) setInterval(() => genAndStore('daily', new Date()), 24 * 60 * 60 * 1000);
    if (freq.weekly) setInterval(() => genAndStore('weekly', new Date()), 7 * 24 * 60 * 60 * 1000);
    if (freq.monthly) setInterval(() => genAndStore('monthly', new Date()), 30 * 24 * 60 * 60 * 1000);
    if (freq.yearly) setInterval(() => genAndStore('yearly', new Date()), 365 * 24 * 60 * 60 * 1000);
  } catch (err) {
    console.error('Error scheduling reports:', err);
  }
}

function startActivityTracking() {
  console.log('[DEBUG] Starting activity tracking with ActivityTracker...');
  // Use the ActivityTracker class
  if (activityTracker) {
    activityTracker.startTracking();
  }
}

function checkAlerts() {
  try {
    // Use the new checkAndCreateAlerts method from database
    const newAlerts = db.checkAndCreateAlerts();
    
    // Show desktop notifications for new alerts
    if (newAlerts && newAlerts.length > 0) {
      newAlerts.forEach(alert => {
        try {
          new Notification({
            title: 'Digital Parent Hub - Alert',
            body: alert.message
          }).show();
        } catch (e) {
          console.log('Notification not available:', e.message);
        }
      });
    }
  } catch (error) {
    console.error('Error in checkAlerts:', error);
  }
}

app.on('ready', createWindow);

app.on('window-all-closed', () => {
  // Save current activity on close
  if (currentActivity) {
    const endTime = new Date().toISOString();
    const duration = Math.floor((new Date(endTime) - new Date(currentActivity.start_time)) / 1000);
    // Validate duration: positive and reasonable (less than 8 hours to avoid sleep inflation)
    if (duration > 0 && duration < 28800) {
      db.addActivity({
        app_name: currentActivity.app_name,
        start_time: currentActivity.start_time,
        end_time: endTime,
        duration,
        category_id: currentActivity.category_id
      });
    }
  }
  db.closeDatabase();
  app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
