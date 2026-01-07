const express = require('express');
const path = require('path');
const MyDatabase = require('./src/data/database');
const Reports = require('./src/reports/reports');
const EmailService = require('./src/email/emailService');

const app = express();
const port = 3000;
const passphrase = 'digitalparent'; // Default passphrase

// Initialize database, reports, email
const db = new MyDatabase();
db.initDatabase(passphrase);
db.openDatabase(passphrase);
const reports = new Reports(db);
const emailService = new EmailService(db, reports);

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

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

