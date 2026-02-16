// Activity Tracking Service
// Monitors active applications and tracks usage time

const activeWin = require('active-win');

class ActivityTracker {
    constructor(db) {
        this.db = db;
        this.isTracking = false;
        this.trackingInterval = null;
        this.currentActivity = null;
        this.activityStartTime = null;
        this.TRACKING_INTERVAL = 5000; // Check every 5 seconds
    }

    // Get category for an app name
    getCategoryForApp(appName) {
        // First check explicit mappings
        const mappedCategory = this.db.getCategoryForApp(appName);
        if (mappedCategory) return mappedCategory;

        // Auto-categorize based on app name patterns
        const appLower = appName.toLowerCase();
        
        // Study/Education patterns
        if (appLower.includes('code') || appLower.includes('studio') || 
            appLower.includes('visual') || appLower.includes('notion') ||
            appLower.includes('word') || appLower.includes('excel') ||
            appLower.includes('powerpoint') || appLower.includes('docs') ||
            appLower.includes('pdf') || appLower.includes('reader')) {
            return 1; // Study
        }
        
        // Entertainment patterns
        if (appLower.includes('youtube') || appLower.includes('netflix') ||
            appLower.includes('spotify') || appLower.includes('discord') ||
            appLower.includes('game') || appLower.includes('twitch')) {
            return 2; // Entertainment
        }
        
        // Social patterns
        if (appLower.includes('whatsapp') || appLower.includes('telegram') ||
            appLower.includes('slack') || appLower.includes('teams') ||
            appLower.includes('zoom') || appLower.includes('messenger')) {
            return 3; // Social
        }
        
        // Browsing
        if (appLower.includes('chrome') || appLower.includes('firefox') ||
            appLower.includes('edge') || appLower.includes('safari') ||
            appLower.includes('browser')) {
            return 4; // Browsing
        }

        // Default to Other
        return 5; // Other
    }

    // Start tracking activity
    startTracking() {
        if (this.isTracking) {
            console.log('[ActivityTracker] Already tracking');
            return;
        }

        this.isTracking = true;
        console.log('[ActivityTracker] Starting activity tracking...');

        // Initial capture
        this.captureActivity();

        // Set up interval
        this.trackingInterval = setInterval(() => {
            this.captureActivity();
        }, this.TRACKING_INTERVAL);
    }

    // Stop tracking activity
    stopTracking() {
        if (!this.isTracking) {
            console.log('[ActivityTracker] Not tracking');
            return;
        }

        this.isTracking = false;
        if (this.trackingInterval) {
            clearInterval(this.trackingInterval);
            this.trackingInterval = null;
        }

        // Save final activity
        if (this.currentActivity && this.activityStartTime) {
            this.saveCurrentActivity();
        }

        console.log('[ActivityTracker] Stopped tracking');
    }

    // Capture current active window
    async captureActivity() {
        try {
            const result = await activeWin();
            
            if (!result || !result.title) {
                return;
            }

            const now = new Date();
            const appName = result.owner.name || 'Unknown';
            const windowTitle = result.title || '';

            // If app changed, save previous and start new
            if (this.currentActivity && this.currentActivity !== appName) {
                this.saveCurrentActivity();
                this.activityStartTime = now;
            }

            this.currentActivity = appName;
            if (!this.activityStartTime) {
                this.activityStartTime = now;
            }

        } catch (error) {
            console.error('[ActivityTracker] Error capturing activity:', error.message);
        }
    }

    // Save the current activity to database
    saveCurrentActivity() {
        if (!this.currentActivity || !this.activityStartTime) {
            return;
        }

        const now = new Date();
        const duration = Math.floor((now - this.activityStartTime) / 1000);

        // Only save if duration > 0
        if (duration > 0) {
            const categoryId = this.getCategoryForApp(this.currentActivity);
            
            this.db.addActivity({
                app_name: this.currentActivity,
                start_time: this.activityStartTime.toISOString(),
                end_time: now.toISOString(),
                duration: duration,
                category_id: categoryId
            });

            console.log(`[ActivityTracker] Saved: ${this.currentActivity} - ${duration}s (Category: ${categoryId})`);
        }

        this.activityStartTime = now;
    }

    // Get current tracking status
    getStatus() {
        return {
            isTracking: this.isTracking,
            currentActivity: this.currentActivity,
            startTime: this.activityStartTime ? this.activityStartTime.toISOString() : null
        };
    }

    // Manually log an activity (for testing or manual entries)
    logActivity(appName, duration, categoryId = null) {
        const now = new Date();
        const startTime = new Date(now.getTime() - duration * 1000);
        const catId = categoryId || this.getCategoryForApp(appName);

        this.db.addActivity({
            app_name: appName,
            start_time: startTime.toISOString(),
            end_time: now.toISOString(),
            duration: duration,
            category_id: catId
        });

        console.log(`[ActivityTracker] Manual log: ${appName} - ${duration}s`);
    }
}

module.exports = ActivityTracker;
