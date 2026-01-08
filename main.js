try {
  var { app, BrowserWindow, ipcMain, Notification, dialog } = require('electron');
} catch (e) {
  console.error('This script must be run with Electron. Use "npm start" instead.');
  process.exit(1);
}
console.log('App object:', app);
require('dotenv').config();
const activeWin = require('active-win');
const Database = require('./src/data/database');
const Reports = require('./src/reports/reports');
const EmailService = require('./src/email/emailService');

let mainWindow;
let db;
let reports;
let emailService;
let currentActivity = null;
let otherCategoryId;
const passphrase = process.env.DATABASE_PASSPHRASE || 'digitalparent';

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  // Load the React app
  mainWindow.loadFile('public/index.html');

  // Initialize database
  db = new Database();
  db.initDatabase(passphrase);
  db.openDatabase(passphrase);

  // Initialize reports and email service
  reports = new Reports(db);
  emailService = new EmailService(db, reports);

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
    const smtp = db.getSmtpSettings();
    const screenLimit = parseInt(db.getSetting('daily_screen_limit')) || 28800;
    const studyGoal = parseInt(db.getSetting('study_goal')) || 7200;
    return { categories, theme, reportFrequency, smtp, screenLimit, studyGoal };
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
    db.setSmtpSettings(settings.smtp);
    db.setSetting('daily_screen_limit', settings.screenLimit.toString());
    db.setSetting('study_goal', settings.studyGoal.toString());
  });

  ipcMain.handle('export-data', (event, format) => {
    const data = db.exportData(format);
    const result = dialog.showSaveDialogSync(mainWindow, {
      title: `Export data as ${format.toUpperCase()}`,
      filters: [{ name: format.toUpperCase(), extensions: [format] }]
    });
    if (result) {
      require('fs').writeFileSync(result, data);
      return result;
    }
    return null;
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
}

function startActivityTracking() {
  console.log('[DEBUG] Starting activity tracking...');
  setInterval(() => {
    try {
      activeWin().then(active => {
        if (!active) {
          console.log('[DEBUG] No active window detected');
          return;
        }

        const appName = active.owner.name || 'Unknown';
        console.log(`[DEBUG] Active app: ${appName}`);

        if (currentActivity && currentActivity.app_name !== appName) {
          // End previous activity
          const endTime = new Date().toISOString();
          const duration = Math.floor((new Date(endTime) - new Date(currentActivity.start_time)) / 1000);
          console.log(`[DEBUG] Ending activity: ${currentActivity.app_name}, duration: ${duration}s`);
          db.addActivity({
            app_name: currentActivity.app_name,
            start_time: currentActivity.start_time,
            end_time: endTime,
            duration,
            category_id: currentActivity.category_id
          });
          console.log(`[DEBUG] Activity logged: ${currentActivity.app_name}`);
        }

        if (!currentActivity || currentActivity.app_name !== appName) {
          // Start new activity
          console.log(`[DEBUG] Starting new activity: ${appName}`);
          currentActivity = {
            app_name: appName,
            start_time: new Date().toISOString(),
            category_id: otherCategoryId
          };
        }
      }).catch(error => {
        console.error('Error in activity tracking:', error);
      });
    } catch (error) {
      console.error('Error in activity tracking:', error);
    }
  }, 1000); // Poll every 1 second
}

function checkAlerts() {
 try {
   const today = new Date();
   const todayStr = today.toISOString().split('T')[0]; // YYYY-MM-DD
   const tomorrow = new Date(today);
   tomorrow.setDate(tomorrow.getDate() + 1);

   const activities = db.getActivities({
     start_time: today.toISOString(),
     end_time: tomorrow.toISOString()
   });

   const totalTime = activities.reduce((sum, act) => sum + act.duration, 0);

   const categories = db.getCategories();
   const studyCat = categories.find(c => c.name === 'Study');
   let studyTime = 0;
   if (studyCat) {
     studyTime = activities.filter(act => act.category_id === studyCat.id).reduce((sum, act) => sum + act.duration, 0);
   }

   const screenLimit = parseInt(db.getSetting('daily_screen_limit')) || 28800;
   const studyGoal = parseInt(db.getSetting('study_goal')) || 7200;

   const lastScreenAlert = db.getSetting('screen_alert_last_date');
   const lastStudyAlert = db.getSetting('study_alert_last_date');

   if (totalTime >= screenLimit && lastScreenAlert !== todayStr) {
     new Notification({
       title: 'Screen Time Limit Reached',
       body: 'Great job! You\'ve reached your daily screen time limit. Time for a well-deserved break!',
       silent: true
     }).show();
     db.setSetting('screen_alert_last_date', todayStr);
   }

   if (studyTime >= studyGoal && lastStudyAlert !== todayStr) {
     new Notification({
       title: 'Study Goal Achieved',
       body: 'Congratulations! You\'ve achieved your study goal today. Keep up the fantastic work!',
       silent: true
     }).show();
     db.setSetting('study_alert_last_date', todayStr);
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