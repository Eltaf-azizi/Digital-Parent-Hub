const Database = require('./src/data/database');
const Reports = require('./src/reports/reports');

async function testTracking() {
  const db = new Database();
  await db.initDatabase('testpass');
  await db.openDatabase('testpass');

  // Simulate activities
  const now = new Date();
  const activities = [
    { app_name: 'chrome', start_time: new Date(now.getTime() - 3600000).toISOString(), end_time: new Date(now.getTime() - 3300000).toISOString(), duration: 300 },
    { app_name: 'vscode', start_time: new Date(now.getTime() - 3300000).toISOString(), end_time: new Date(now.getTime() - 3000000).toISOString(), duration: 300 },
    { app_name: 'chrome', start_time: new Date(now.getTime() - 3000000).toISOString(), end_time: new Date(now.getTime() - 2700000).toISOString(), duration: 300 },
  ];

  for (const act of activities) {
    await db.addActivity(act);
  }

  // Test reports
  const reports = new Reports(db);
  const dailyReport = await reports.generateDailyReport(now);
  console.log('Daily Report:', dailyReport);

  const weeklyReport = await reports.generateWeeklyReport(new Date(now.getTime() - 86400000 * 3));
  console.log('Weekly Report:', weeklyReport);

  await db.closeDatabase();
}

testTracking().catch(console.error);