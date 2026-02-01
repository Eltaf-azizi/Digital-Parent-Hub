const Database = require('../data/database');

class Reports {
  constructor(db) {
    this.db = db;
  }

  // Helper to get date range for different report types
  getDateRange(type, startDate) {
    const s = new Date(startDate);
    let start;
    let end;

    switch (type) {
      case 'daily':
        start = new Date(s.getFullYear(), s.getMonth(), s.getDate(), 0, 0, 0);
        end = new Date(start);
        end.setDate(end.getDate() + 1);
        break;
      case 'weekly':
        // assume week starts on the provided date
        start = new Date(s.getFullYear(), s.getMonth(), s.getDate(), 0, 0, 0);
        end = new Date(start);
        end.setDate(end.getDate() + 7);
        break;
      case 'monthly':
        start = new Date(s.getFullYear(), s.getMonth(), 1, 0, 0, 0);
        end = new Date(s.getFullYear(), s.getMonth() + 1, 1, 0, 0, 0);
        break;
      case 'yearly':
        start = new Date(s.getFullYear(), 0, 1, 0, 0, 0);
        end = new Date(s.getFullYear() + 1, 0, 1, 0, 0, 0);
        break;
      default:
        throw new Error('Invalid report type');
    }

    return {
      start: start.toISOString(),
      end: end.toISOString()
    };
  }

  // Get previous period date range for trends
  getPreviousDateRange(type, startDate) {
    const s = new Date(startDate);
    let prevStart;
    let prevEnd;

    switch (type) {
      case 'daily':
        prevStart = new Date(s.getFullYear(), s.getMonth(), s.getDate() - 1, 0, 0, 0);
        prevEnd = new Date(prevStart);
        prevEnd.setDate(prevEnd.getDate() + 1);
        break;
      case 'weekly':
        prevStart = new Date(s.getFullYear(), s.getMonth(), s.getDate() - 7, 0, 0, 0);
        prevEnd = new Date(prevStart);
        prevEnd.setDate(prevEnd.getDate() + 7);
        break;
      case 'monthly':
        prevStart = new Date(s.getFullYear(), s.getMonth() - 1, 1, 0, 0, 0);
        prevEnd = new Date(s.getFullYear(), s.getMonth(), 1, 0, 0, 0);
        break;
      case 'yearly':
        prevStart = new Date(s.getFullYear() - 1, 0, 1, 0, 0, 0);
        prevEnd = new Date(s.getFullYear(), 0, 1, 0, 0, 0);
        break;
    }

    return {
      start: prevStart.toISOString(),
      end: prevEnd.toISOString()
    };
  }

  // Aggregate activities data
  async aggregateActivities(startTime, endTime) {
    const activities = await this.db.getActivities({ start_time: startTime, end_time: endTime });
    const categories = await this.db.getCategories();
    const categoryMap = {};
    categories.forEach(cat => categoryMap[cat.id] = cat.name);

    let totalScreenTime = 0;
    const categoryBreakdown = {};
    const dailyBreakdown = {}; // for identifying best day

    activities.forEach(activity => {
      const duration = activity.duration || 0;
      totalScreenTime += duration;

      const categoryName = categoryMap[activity.category_id] || 'Other';
      categoryBreakdown[categoryName] = (categoryBreakdown[categoryName] || 0) + duration;

      const date = new Date(activity.start_time).toISOString().split('T')[0];
      dailyBreakdown[date] = (dailyBreakdown[date] || 0) + duration;
    });

    return { totalScreenTime, categoryBreakdown, dailyBreakdown };
  }

  // Compute metrics
  computeMetrics(current, previous, type) {
    const studyTime = current.categoryBreakdown.Study || 0;
    const entertainmentTime = current.categoryBreakdown.Entertainment || 0;
    const total = current.totalScreenTime;

    const productivityScore = total > 0 ? Math.round((studyTime / total) * 100) : 0;

    const prevTotal = previous ? previous.totalScreenTime : 0;
    const screenTimeChange = prevTotal > 0 ? Math.round(((total - prevTotal) / prevTotal) * 100) : 0;

    const prevProductivity = previous ? (previous.categoryBreakdown.Study || 0) / prevTotal * 100 : 0;
    const productivityChange = prevProductivity > 0 ? Math.round(productivityScore - prevProductivity) : 0;

    let balanceStatus = 'Balanced';
    if (productivityScore < 40) balanceStatus = 'Needs Improvement';
    else if (productivityScore > 70) balanceStatus = 'Excellent';

    const suggestions = [];
    if (entertainmentTime > studyTime * 2) {
      suggestions.push('Consider reducing entertainment time and focusing more on study activities.');
    }
    if (total > 8 * 3600) { // more than 8 hours
      suggestions.push('Screen time is quite high. Try taking breaks and balancing with offline activities.');
    }
    if (productivityScore < 50) {
      suggestions.push('Try to increase time spent on educational apps for better productivity.');
    }
    if (suggestions.length === 0) {
      suggestions.push('Great job maintaining a balanced digital routine!');
    }

    // Patterns
    const mostUsedCategory = Object.keys(current.categoryBreakdown).reduce((a, b) =>
      current.categoryBreakdown[a] > current.categoryBreakdown[b] ? a : b, 'None');

    let bestDay = null;
    if (type !== 'daily') {
      // For non-daily, find day with highest study time or lowest screen time
      const studyByDay = {};
      // Need to recalculate with categories per day, but for simplicity, assume best day is the one with least screen time
      bestDay = Object.keys(current.dailyBreakdown).reduce((a, b) =>
        current.dailyBreakdown[a] < current.dailyBreakdown[b] ? a : b, null);
    }

    return {
      productivityScore,
      trends: { screenTimeChange, productivityChange },
      balanceStatus,
      suggestions,
      patterns: { mostUsedCategory, bestDay }
    };
  }

  async generateReport(type, startDate) {
    const { start, end } = this.getDateRange(type, startDate);
    const current = await this.aggregateActivities(start, end);

    const prevRange = this.getPreviousDateRange(type, startDate);
    const previous = await this.aggregateActivities(prevRange.start, prevRange.end);

    const metrics = this.computeMetrics(current, previous, type);

    return {
      period: type,
      startDate: startDate.toISOString().split('T')[0],
      totalScreenTime: current.totalScreenTime,
      categoryBreakdown: current.categoryBreakdown,
      ...metrics
    };
  }

  async generateDailyReport(date) {
    return this.generateReport('daily', date);
  }

  async generateWeeklyReport(startDate) {
    return this.generateReport('weekly', startDate);
  }

  async generateMonthlyReport(startDate) {
    return this.generateReport('monthly', startDate);
  }

  async generateYearlyReport(startDate) {
    return this.generateReport('yearly', startDate);
  }
}

module.exports = Reports;