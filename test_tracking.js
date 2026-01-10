const Database = require('./src/data/database');
const Reports = require('./src/reports/reports');

async function testTracking() {
  const db = new Database();
  const passphrase = process.env.DATABASE_PASSPHRASE || 'testpass';
  await db.initDatabase(passphrase);
  await db.openDatabase(passphrase);

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

  const yesterday = new Date(now.getTime() - 86400000);
  const yesterdayReport = await reports.generateDailyReport(yesterday);
  console.log('Yesterday Report:', yesterdayReport);

  // Verify report accuracy
  console.log('Verifying report accuracy...');
  const todayActivities = db.getActivities({
    start_time: new Date(now.getTime() - 86400000).toISOString(),
    end_time: now.toISOString()
  });
  const expectedTotal = todayActivities.reduce((sum, act) => sum + (act.duration || 0), 0);
  console.log('Expected total screen time:', expectedTotal);
  console.log('Daily report total:', dailyReport.totalScreenTime);
  if (expectedTotal === dailyReport.totalScreenTime) {
    console.log('✅ Daily total matches');
  } else {
    console.log('❌ Daily total mismatch');
  }

  const categoryMap = {};
  db.getCategories().forEach(cat => categoryMap[cat.id] = cat.name);
  const expectedCategories = {};
  todayActivities.forEach(act => {
    const catName = categoryMap[act.category_id] || 'Other';
    expectedCategories[catName] = (expectedCategories[catName] || 0) + (act.duration || 0);
  });
  console.log('Expected categories:', expectedCategories);
  console.log('Daily report categories:', dailyReport.categoryBreakdown);
  const categoriesMatch = Object.keys(expectedCategories).every(cat =>
    expectedCategories[cat] === dailyReport.categoryBreakdown[cat]
  );
  if (categoriesMatch && Object.keys(dailyReport.categoryBreakdown).every(cat =>
    expectedCategories[cat] === dailyReport.categoryBreakdown[cat]
  )) {
    console.log('✅ Categories match');
  } else {
    console.log('❌ Categories mismatch');
  }

  const studyTime = expectedCategories.Study || 0;
  const expectedProductivity = expectedTotal > 0 ? Math.round((studyTime / expectedTotal) * 100) : 0;
  console.log('Expected productivity:', expectedProductivity);
  console.log('Daily report productivity:', dailyReport.productivityScore);
  if (expectedProductivity === dailyReport.productivityScore) {
    console.log('✅ Productivity score matches');
  } else {
    console.log('❌ Productivity score mismatch');
  }

  console.log('Testing backup and restore...');
  const backupPath = './backup_test.db';
  db.backupDatabase(backupPath);
  console.log('Backup created at', backupPath);

  db.closeDatabase();

  db.restoreDatabase(backupPath, passphrase);
  db.openDatabase(passphrase);
  console.log('Restore completed');

  // Verify data integrity
  const restoredActivities = db.getActivities();
  console.log('Activities after restore:', restoredActivities.length);
  const restoredCategories = db.getCategories();
  console.log('Categories after restore:', restoredCategories.length);

  await db.closeDatabase();

  // Clean up
  require('fs').unlinkSync(backupPath);
  console.log('Backup test passed');

  // Stress test: add many activities
  console.log('Starting stress test...');
  db.openDatabase(passphrase);
  const stressStart = Date.now();
  for (let i = 0; i < 100; i++) {
    await db.addActivity({
      app_name: `stress_app_${i}`,
      start_time: new Date(now.getTime() - i * 60000).toISOString(),
      end_time: new Date(now.getTime() - (i - 1) * 60000).toISOString(),
      duration: 60
    });
  }
  const stressEnd = Date.now();
  console.log(`Stress test completed in ${stressEnd - stressStart}ms`);

  const allActivities = db.getActivities();
  console.log('Total activities after stress test:', allActivities.length);
  if (allActivities.length >= 103) { // 3 original + 100 stress
    console.log('✅ Stress test passed');
  } else {
    console.log('❌ Stress test failed');
  }

  await db.closeDatabase();
}

testTracking().catch(console.error);