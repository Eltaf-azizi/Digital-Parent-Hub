const Database = require('./src/data/database');

const passphrase = process.env.DATABASE_PASSPHRASE || 'digitalparent';

async function test() {
  try {
    console.log('=== Digital Parent Hub - Simple Test ===\n');

    // Initialize database
    const db = new Database();
    db.initDatabase(passphrase);
    db.openDatabase(passphrase);
    console.log('✓ Database initialized and opened');

    // Get categories
    const categories = db.getCategories();
    console.log('✓ Categories loaded:', categories.length, 'categories found');

    // Get activities from today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const activities = db.getActivities({
      start_time: today.toISOString(),
      end_time: tomorrow.toISOString()
    });
    console.log('✓ Activities loaded:', activities.length, 'activities found');

    // Calculate totals
    const totalTime = activities.reduce((sum, act) => sum + act.duration, 0);
    console.log('✓ Total screen time today:', Math.floor(totalTime / 3600), 'hours,', Math.floor((totalTime % 3600) / 60), 'minutes');

    // Category breakdown
    const categoryMap = {};
    categories.forEach(cat => categoryMap[cat.id] = cat.name);

    const categoryTimes = {};
    activities.forEach(act => {
      const catName = categoryMap[act.category_id] || 'Other';
      categoryTimes[catName] = (categoryTimes[catName] || 0) + act.duration;
    });

    console.log('✓ Category breakdown:');
    Object.entries(categoryTimes).forEach(([cat, time]) => {
      console.log(`  - ${cat}: ${Math.floor(time / 3600)}h ${Math.floor((time % 3600) / 60)}m`);
    });

    // Get settings
    const parentPin = db.getSetting('parent_pin');
    console.log('✓ Parent PIN is set:', parentPin ? 'Yes' : 'No');

    // Get reports
    const reports = db.getReports();
    console.log('✓ Reports stored:', reports.length, 'report(s)');

    console.log('\n✅ All tests passed!');
    db.closeDatabase();
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

test();