try {
  const electron = require('electron');
  var app = electron.app;
  var BrowserWindow = electron.BrowserWindow;
  var ipcMain = electron.ipcMain;
  var Notification = electron.Notification;
  var dialog = electron.dialog;
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
const express = require('express');
const path = require('path');

let mainWindow;
let db;
let server;
let reports;
let emailService;
let currentActivity = null;
let otherCategoryId;
const passphrase = process.env.DATABASE_PASSPHRASE || 'digitalparent';

function startExpressServer() {
  const webApp = express();
  const port = 3000;

  webApp.use(express.json());
  webApp.use(express.static(path.join(__dirname, 'src')));
  webApp.use(express.static(path.join(__dirname, 'src/public')));

  // API routes - copy from server.js later
  webApp.get('/api/get-dashboard-data', (req, res) => {
    try {
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

      res.json({ totalTime, categories: categoryData, productivityScore, insights });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  webApp.get('/api/get-child-data', (req, res) => {
    try {
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

      let streak = 0;
      for (let i = 0; i < 30; i++) {
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

      res.json({ totalTime, categoryBalance: categoryData, streak, tips });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  webApp.get('/api/get-parent-data', (req, res) => {
    try {
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

      const cachedReports = db.getReports();
      const alerts = [];
      if (totalTime > 28800) {
        alerts.push('High screen time today! Consider taking a break.');
      }

      res.json({ totalTime, categories: categoryData, productivityScore, insights, reports: cachedReports, alerts, categoriesList: categories });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  webApp.post('/api/verify-parent-pin', (req, res) => {
    try {
      const { pin } = req.body;
      const storedPin = db.getSetting('parent_pin');
      res.json(storedPin === pin);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  webApp.post('/api/set-parent-pin', (req, res) => {
    try {
      const { pin } = req.body;
      db.setSetting('parent_pin', pin);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  webApp.get('/api/get-onboarding-completed', (req, res) => {
    try {
      const completed = db.getSetting('onboarding_completed');
      res.json(completed === 'true');
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  webApp.post('/api/set-onboarding-completed', (req, res) => {
    try {
      const { completed } = req.body;
      db.setSetting('onboarding_completed', completed ? 'true' : 'false');
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  webApp.get('/api/get-settings', (req, res) => {
    try {
      const categories = db.getCategories();
      const theme = db.getSetting('theme') || 'light';
      const reportFrequencyStr = db.getSetting('report_frequency');
      const reportFrequency = reportFrequencyStr ? JSON.parse(reportFrequencyStr) : { daily: true, weekly: false, monthly: false, yearly: false };
      const emailRecipient = db.getSetting('email_recipient') || '';
      const smtp = db.getSmtpSettings();
      const screenLimit = parseInt(db.getSetting('daily_screen_limit')) || 28800;
      const studyGoal = parseInt(db.getSetting('study_goal')) || 7200;
      res.json({ categories, theme, reportFrequency, emailRecipient, smtp, screenLimit, studyGoal });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  webApp.post('/api/save-settings', (req, res) => {
    try {
      const settings = req.body;
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
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  webApp.post('/api/generate-report', (req, res) => {
    try {
      const { type, startDate } = req.body;
      const date = new Date(startDate);
      let report;
      switch (type) {
        case 'daily':
          report = reports.generateDailyReport(date);
          break;
        case 'weekly':
          report = reports.generateWeeklyReport(date);
          break;
        case 'monthly':
          report = reports.generateMonthlyReport(date);
          break;
        case 'yearly':
          report = reports.generateYearlyReport(date);
          break;
        default:
          return res.status(400).json({ error: 'Invalid report type' });
      }
      res.json(report);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  webApp.get('/api/reports', (req, res) => {
    try {
      const storedReports = db.getReports();
      res.json(storedReports);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  webApp.post('/api/store-report', (req, res) => {
    try {
      const { type, data } = req.body;
      db.addReport(type, data);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  webApp.post('/api/send-report-email', (req, res) => {
    try {
      const { toEmail, type, startDate } = req.body;
      const date = new Date(startDate);
      let promise;
      switch (type) {
        case 'daily':
          promise = emailService.sendDailyReportEmail(toEmail, date);
          break;
        case 'weekly':
          promise = emailService.sendWeeklyReportEmail(toEmail, date);
          break;
        case 'monthly':
          promise = emailService.sendMonthlyReportEmail(toEmail, date);
          break;
        case 'yearly':
          promise = emailService.sendYearlyReportEmail(toEmail, date);
          break;
        default:
          return res.status(400).json({ error: 'Invalid report type' });
      }
      promise.then(() => {
        res.json({ success: true });
      }).catch(err => {
        res.status(500).json({ error: err.message });
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  webApp.post('/api/delete-all-data', (req, res) => {
    try {
      db.deleteAllData();
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  webApp.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'src/public/index.html'));
  });

  server = webApp.listen(port, () => {
    console.log(`Digital Parent Hub server running at http://localhost:${port}`);
  });
}

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  // Load the React app from local server
  mainWindow.loadURL('http://localhost:3000');

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
  if (server) {
    server.close();
  }
  db.closeDatabase();
  app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Start the app with server
app.whenReady().then(() => {
  startExpressServer();
  createWindow();
});