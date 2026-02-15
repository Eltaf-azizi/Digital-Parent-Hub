// Simple test to check if electron works
console.log('Testing electron...');
console.log('App:', typeof app);
console.log('BrowserWindow:', typeof BrowserWindow);
console.log('process.versions.electron:', process.versions.electron);

// If this works, app should be defined
if (typeof app !== 'undefined') {
    console.log('SUCCESS: Electron is working!');
    app.quit();
} else {
    console.log('FAILED: app is not defined');
}
