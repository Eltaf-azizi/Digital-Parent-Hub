// Preload script for secure IPC communication
const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods to the renderer process
contextBridge.exposeInMainWorld('electronAPI', {
    // Database operations
    getChildData: () => ipcRenderer.invoke('get-child-data'),
    getParentData: () => ipcRenderer.invoke('get-parent-data'),
    getDashboardData: () => ipcRenderer.invoke('get-dashboard-data'),
    
    // Authentication
    verifyParentPin: (pin) => ipcRenderer.invoke('verify-parent-pin', pin),
    setParentPin: (pin) => ipcRenderer.invoke('set-parent-pin', pin),
    getOnboardingCompleted: () => ipcRenderer.invoke('get-onboarding-completed'),
    setOnboardingCompleted: (completed) => ipcRenderer.invoke('set-onboarding-completed', completed),
    
    // Settings
    getSettings: () => ipcRenderer.invoke('get-settings'),
    saveSettings: (settings) => ipcRenderer.invoke('save-settings', settings),
    deleteCategory: (categoryId) => ipcRenderer.invoke('delete-category', categoryId),
    
    // Data management
    exportData: (format) => ipcRenderer.invoke('export-data', format),
    backupDatabase: () => ipcRenderer.invoke('backup-database'),
    restoreDatabase: (filePath) => ipcRenderer.invoke('restore-database', filePath),
    deleteAllData: () => ipcRenderer.invoke('delete-all-data'),
    
    // Reports
    generateReport: (type, startDate) => ipcRenderer.invoke('generate-report', type, startDate),
    getReports: () => ipcRenderer.invoke('get-reports'),
    storeReport: (type, data) => ipcRenderer.invoke('store-report', type, data),
    sendReportEmail: (toEmail, type, startDate) => ipcRenderer.invoke('send-report-email', toEmail, type, startDate),
    
    // Activity tracking
    startTracking: () => ipcRenderer.invoke('start-tracking'),
    stopTracking: () => ipcRenderer.invoke('stop-tracking'),
    getTrackingStatus: () => ipcRenderer.invoke('get-tracking-status'),
    
    // App mappings
    getAppMappings: () => ipcRenderer.invoke('get-app-mappings'),
    setAppMapping: (appName, categoryId) => ipcRenderer.invoke('set-app-mapping', appName, categoryId),
    deleteAppMapping: (appName) => ipcRenderer.invoke('delete-app-mapping', appName),
    
    // Alerts
    getAlerts: () => ipcRenderer.invoke('get-alerts'),
    clearAlerts: () => ipcRenderer.invoke('clear-alerts'),
    
    // Window controls
    minimizeWindow: () => ipcRenderer.invoke('minimize-window'),
    maximizeWindow: () => ipcRenderer.invoke('maximize-window'),
    closeWindow: () => ipcRenderer.invoke('close-window'),
    
    // Event listeners
    onDataUpdate: (callback) => {
        ipcRenderer.on('data-update', (event, data) => callback(data));
    },
    onAlert: (callback) => {
        ipcRenderer.on('alert', (event, alert) => callback(alert));
    },
    onTrackingUpdate: (callback) => {
        ipcRenderer.on('tracking-update', (event, data) => callback(data));
    },
    
    // Remove listeners
    removeAllListeners: (channel) => {
        ipcRenderer.removeAllListeners(channel);
    }
});

console.log('Preload script loaded successfully');
