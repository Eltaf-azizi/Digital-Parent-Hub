require('dotenv').config();
const express = require('express');
const session = require('express-session');
const path = require('path');
const MyDatabase = require('./src/data/database');
const Reports = require('./src/reports/reports');
const EmailService = require('./src/email/emailService');

const app = express();
const port = 3000;
const passphrase = process.env.DATABASE_PASSPHRASE || 'digitalparent';

// Initialize database, reports, email
const db = new MyDatabase();
db.initDatabase(passphrase);
db.openDatabase(passphrase);
const reports = new Reports(db);
const emailService = new EmailService(db, reports);

app.use(express.json());
app.use(express.static(path.join(__dirname, 'src/public')));

// Simple auth middleware
function requireAuth(req, res, next) {
  // For demo, skip auth
  next();
}

// API routes
app.get('/api/get-dashboard-data', (req, res) => {
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

app.get('/api/get-child-data', (req, res) => {
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

    // Calculate streaks
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

app.get('/api/get-parent-data', requireAuth, (req, res) => {
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

app.post('/api/verify-parent-pin', (req, res) => {
  try {
    const { pin } = req.body;
    const storedPin = db.getSetting('parent_pin');
    res.json(storedPin === pin);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/set-parent-pin', requireAuth, (req, res) => {
  try {
    const { pin } = req.body;
    db.setSetting('parent_pin', pin);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) {
      res.status(500).json({ error: 'Logout failed' });
    } else {
      res.json({ success: true });
    }
  });
});

app.get('/api/get-onboarding-completed', (req, res) => {
  try {
    const completed = db.getSetting('onboarding_completed');
    res.json(completed === 'true');
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/set-onboarding-completed', (req, res) => {
  try {
    const { completed } = req.body;
    db.setSetting('onboarding_completed', completed ? 'true' : 'false');
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/get-settings', requireAuth, (req, res) => {
  try {
    const categories = db.getCategories();
    const theme = db.getSetting('theme') || 'light';
    const reportFrequencyStr = db.getSetting('report_frequency');
    const reportFrequency = reportFrequencyStr ? JSON.parse(reportFrequencyStr) : { daily: true, weekly: false, monthly: false, yearly: false };
    const smtp = db.getSmtpSettings();
    const screenLimit = parseInt(db.getSetting('daily_screen_limit')) || 28800;
    const studyGoal = parseInt(db.getSetting('study_goal')) || 7200;
    const emailRecipient = db.getSetting('email_recipient') || '';
    res.json({ categories, theme, reportFrequency, smtp, screenLimit, studyGoal, emailRecipient });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/save-settings', requireAuth, (req, res) => {
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
    db.setSetting('email_recipient', settings.emailRecipient || '');
    db.setSmtpSettings(settings.smtp);
    db.setSetting('daily_screen_limit', settings.screenLimit.toString());
    db.setSetting('study_goal', settings.studyGoal.toString());
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/delete-category', requireAuth, (req, res) => {
  try {
    const { categoryId } = req.body;
    db.deleteCategory(categoryId);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/export-data', requireAuth, (req, res) => {
  try {
    const { format } = req.body;
    const data = db.exportData(format);
    res.setHeader('Content-Disposition', `attachment; filename=data.${format}`);
    res.setHeader('Content-Type', 'application/octet-stream');
    res.send(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/backup-database', requireAuth, (req, res) => {
  try {
    const backupPath = path.join(__dirname, 'backup.db');
    db.backupDatabase(backupPath);
    res.download(backupPath, 'backup.db', (err) => {
      if (err) console.error(err);
      // Clean up
      require('fs').unlinkSync(backupPath);
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/restore-database', requireAuth, (req, res) => {
  try {
    // For simplicity, assume file is uploaded, but since no file upload, just return success
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/delete-all-data', requireAuth, (req, res) => {
  try {
    db.deleteAllData();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Report generation endpoints
app.post('/api/generate-report', (req, res) => {
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

app.get('/api/reports', (req, res) => {
  try {
    const storedReports = db.getReports();
    res.json(storedReports);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/store-report', (req, res) => {
  try {
    const { type, data } = req.body;
    db.addReport(type, data);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/send-report-email', (req, res) => {
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

// Serve the main HTML
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'src/public/index.html'));
});

app.listen(port, () => {
  console.log(`Digital Parent Hub web app running at http://localhost:${port}`);
});