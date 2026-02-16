class Settings extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            categories: [],
            theme: 'light',
            reportFrequency: { daily: true, weekly: false, monthly: false, yearly: false },
            emailRecipient: '',
            smtp: { host: '', port: '', user: '', pass: '', from: '' },
            screenLimit: 28800,
            studyGoal: 7200,
            loading: true,
            appMappings: {},
            newAppName: '',
            newAppCategory: ''
        };
    }

    componentDidMount() {
        this.loadSettings();
    }

    loadSettings = async () => {
        try {
            const response = await fetch((window.API_BASE || '') + '/api/get-settings');
            const settings = await response.json();
            
            // Load app mappings
            let appMappings = {};
            try {
                const mappingsResponse = await fetch((window.API_BASE || '') + '/api/app-mappings');
                appMappings = await mappingsResponse.json();
            } catch (e) {
                console.log('App mappings not available');
            }
            
            // Load saved theme from localStorage
            const savedTheme = localStorage.getItem('theme') || settings.theme || 'light';
            
            this.setState({
                categories: settings.categories || [],
                theme: savedTheme,
                reportFrequency: settings.reportFrequency || { daily: true, weekly: false, monthly: false, yearly: false },
                emailRecipient: settings.emailRecipient || '',
                smtp: settings.smtp || { host: '', port: '', user: '', pass: '', from: '' },
                screenLimit: settings.screenLimit || 28800,
                studyGoal: settings.studyGoal || 7200,
                loading: false,
                appMappings: appMappings
            });
            
            // Apply theme on load
            document.body.className = savedTheme;
            document.body.setAttribute('data-theme', savedTheme);
        } catch (error) {
            console.error('Error loading settings:', error);
            this.setState({ loading: false });
        }
    };

    saveSettings = async () => {
        try {
            const response = await fetch((window.API_BASE || '') + '/api/save-settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(this.state)
            });
            const result = await response.json();
            alert('Settings saved successfully!');
        } catch (error) {
            console.error('Error saving settings:', error);
            alert('Error saving settings');
        }
    };

    handleCategoryAdd = () => {
        const name = prompt('Enter category name:');
        const description = prompt('Enter description:');
        if (name && description) {
            this.setState(prev => ({
                categories: [...prev.categories, { id: Date.now(), name, description }]
            }));
        }
    };

    handleCategoryEdit = (id) => {
        const cat = this.state.categories.find(c => c.id === id);
        const name = prompt('Edit name:', cat.name);
        const description = prompt('Edit description:', cat.description);
        if (name && description) {
            this.setState(prev => ({
                categories: prev.categories.map(c => c.id === id ? { ...c, name, description } : c)
            }));
        }
    };

    handleCategoryDelete = (id) => {
        if (confirm('Delete this category?')) {
            this.setState(prev => ({
                categories: prev.categories.filter(c => c.id !== id)
            }));
            // Also delete from backend
            fetch((window.API_BASE || '') + '/api/delete-category', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ categoryId: id })
            }).catch(err => console.error('Error deleting category:', err));
        }
    };

    handleThemeChange = (theme) => {
        this.setState({ theme });
        document.body.className = theme;
        document.body.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
    };

    handleReportFrequencyChange = (freq) => {
        this.setState(prev => ({
            reportFrequency: { ...prev.reportFrequency, [freq]: !prev.reportFrequency[freq] }
        }));
    };

    handleSmtpChange = (field, value) => {
        this.setState(prev => ({
            smtp: { ...prev.smtp, [field]: value }
        }));
    };

    handleExport = async (format) => {
        try {
            if (format === 'pdf') {
                alert('PDF export is not yet implemented. Please use JSON or CSV.');
                return;
            }
            const response = await fetch((window.API_BASE || '') + '/api/export-data', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ format })
            });
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `digital-parent-hub-export.${format}`;
            a.click();
            window.URL.revokeObjectURL(url);
            alert('Data exported successfully!');
        } catch (error) {
            console.error('Export error:', error);
            alert('Export failed');
        }
    };

    handleBackup = async () => {
        try {
            const response = await fetch((window.API_BASE || '') + '/api/backup-database', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });
            if (response.ok) {
                alert('Backup created successfully!');
            }
        } catch (error) {
            console.error('Backup error:', error);
            alert('Backup failed');
        }
    };

    handleRestore = async () => {
        try {
            const result = prompt('Enter the path to the backup file (or use the backup feature to restore):');
            if (result) {
                await fetch((window.API_BASE || '') + '/api/restore-database', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ backupPath: result })
                });
                alert('Database restored successfully!');
                this.loadSettings();
            }
        } catch (error) {
            console.error('Restore error:', error);
            alert('Restore failed');
        }
    };

    handleDeleteData = async () => {
        if (confirm('Are you sure you want to delete all data? This cannot be undone!')) {
            try {
                await fetch((window.API_BASE || '') + '/api/delete-all-data', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' }
                });
                alert('All data deleted!');
                this.loadSettings();
            } catch (error) {
                console.error('Delete error:', error);
                alert('Delete failed');
            }
        }
    };

    handleAddAppMapping = async () => {
        const { newAppName, newAppCategory, appMappings } = this.state;
        if (!newAppName || !newAppCategory) {
            alert('Please enter app name and select a category');
            return;
        }
        try {
            await fetch((window.API_BASE || '') + '/api/app-mappings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ appName: newAppName, categoryId: parseInt(newAppCategory) })
            });
            this.setState({
                appMappings: { ...appMappings, [newAppName.toLowerCase()]: parseInt(newAppCategory) },
                newAppName: '',
                newAppCategory: ''
            });
            alert('App mapping added!');
        } catch (error) {
            console.error('Error adding app mapping:', error);
            alert('Failed to add app mapping');
        }
    };

    handleDeleteAppMapping = async (appName) => {
        if (confirm(`Delete mapping for ${appName}?`)) {
            try {
                await fetch((window.API_BASE || '') + '/api/app-mappings', {
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ appName })
                });
                const { appMappings } = this.state;
                const newMappings = { ...appMappings };
                delete newMappings[appName.toLowerCase()];
                this.setState({ appMappings: newMappings });
                alert('App mapping deleted!');
            } catch (error) {
                console.error('Error deleting app mapping:', error);
                alert('Failed to delete app mapping');
            }
        }
    };

    render() {
        if (this.state.loading) {
            return React.createElement('div', null, 'Loading settings...');
        }

        const { onClose } = this.props;

        return React.createElement('div', { className: 'dashboard' },
            React.createElement('button', { onClick: onClose, className: 'btn btn-secondary parent-access-btn' }, 'Back to Dashboard'),
            React.createElement('h1', null, 'Settings'),

            // Categories
            React.createElement('div', { className: 'settings-section' },
                React.createElement('h2', null, 'Categories'),
                React.createElement('button', { onClick: this.handleCategoryAdd, className: 'btn btn-primary mb-3' }, 'Add Category'),
                React.createElement('div', { className: 'category-list' },
                    this.state.categories.map(cat =>
                        React.createElement('div', { key: cat.id, className: 'category-item' },
                            React.createElement('div', { className: 'category-info' },
                                React.createElement('strong', null, cat.name), ': ', cat.description
                            ),
                            React.createElement('div', { className: 'category-actions' },
                                React.createElement('button', { onClick: () => this.handleCategoryEdit(cat.id), className: 'btn btn-sm btn-secondary' }, 'Edit'),
                                React.createElement('button', { onClick: () => this.handleCategoryDelete(cat.id), className: 'btn btn-sm btn-danger' }, 'Delete')
                            )
                        )
                    )
                )
            ),

            // App Mappings
            React.createElement('div', { className: 'settings-section' },
                React.createElement('h2', null, 'App to Category Mappings'),
                React.createElement('p', { className: 'text-muted' }, 'Map applications to categories for automatic categorization'),
                React.createElement('div', { className: 'form-group' },
                    React.createElement('input', {
                        type: 'text',
                        placeholder: 'App Name (e.g., Chrome)',
                        value: this.state.newAppName,
                        onChange: (e) => this.setState({ newAppName: e.target.value }),
                        className: 'form-input'
                    })
                ),
                React.createElement('div', { className: 'form-group' },
                    React.createElement('select', {
                        value: this.state.newAppCategory,
                        onChange: (e) => this.setState({ newAppCategory: e.target.value }),
                        className: 'form-input'
                    },
                        React.createElement('option', { value: '' }, 'Select Category'),
                        this.state.categories.map(cat =>
                            React.createElement('option', { key: cat.id, value: cat.id }, cat.name)
                        )
                    )
                ),
                React.createElement('button', { onClick: this.handleAddAppMapping, className: 'btn btn-primary mb-3' }, 'Add Mapping'),
                
                // Display existing mappings
                Object.keys(this.state.appMappings).length > 0 && React.createElement('div', { className: 'app-mappings-list' },
                    React.createElement('h3', null, 'Current Mappings'),
                    Object.entries(this.state.appMappings).map(([appName, categoryId]) => {
                        const category = this.state.categories.find(c => c.id === categoryId);
                        return React.createElement('div', { key: appName, className: 'mapping-item' },
                            React.createElement('span', null, appName, ' -> ', category ? category.name : 'Unknown'),
                            React.createElement('button', { 
                                onClick: () => this.handleDeleteAppMapping(appName), 
                                className: 'btn btn-sm btn-danger' 
                            }, 'Delete')
                        );
                    })
                )
            ),

            // Theme
            React.createElement('div', { className: 'settings-section' },
                React.createElement('h2', null, 'Theme'),
                React.createElement('div', { className: 'theme-selector' },
                    React.createElement('button', { onClick: () => this.handleThemeChange('light'), className: 'btn btn-secondary' }, 'Light'),
                    React.createElement('button', { onClick: () => this.handleThemeChange('dark'), className: 'btn btn-secondary' }, 'Dark')
                ),
                React.createElement('p', null, `Current: ${this.state.theme}`)
            ),

            // Report Frequency
            React.createElement('div', { className: 'settings-section' },
                React.createElement('h2', null, 'Report Frequency'),
                React.createElement('div', { className: 'report-frequency' },
                    ['daily', 'weekly', 'monthly', 'yearly'].map(freq =>
                        React.createElement('div', { key: freq, className: 'checkbox-group' },
                            React.createElement('input', {
                                type: 'checkbox',
                                checked: this.state.reportFrequency[freq],
                                onChange: () => this.handleReportFrequencyChange(freq),
                                className: 'form-input'
                            }),
                            React.createElement('label', null, freq)
                        )
                    )
                )
            ),

            // Email Recipient for Automated Reports
            React.createElement('div', { className: 'settings-section' },
                React.createElement('h2', null, 'Automated Email Reports'),
                React.createElement('div', { className: 'form-group' },
                    React.createElement('label', null, 'Recipient Email Address:'),
                    React.createElement('input', {
                        type: 'email',
                        value: this.state.emailRecipient,
                        onChange: (e) => this.setState({ emailRecipient: e.target.value }),
                        placeholder: 'user@example.com',
                        className: 'form-input'
                    }),
                    React.createElement('p', { className: 'text-muted' }, 'Reports will be automatically sent to this email based on your selected frequencies.')
                )
            ),

            // Email Configuration
            React.createElement('div', { className: 'settings-section' },
                React.createElement('h2', null, 'Email Configuration (SMTP)'),
                React.createElement('div', { className: 'smtp-settings' },
                    React.createElement('div', { className: 'form-group' },
                        React.createElement('label', { className: 'form-label' }, 'Host'),
                        React.createElement('input', { type: 'text', value: this.state.smtp.host, onChange: e => this.handleSmtpChange('host', e.target.value), className: 'form-input' })
                    ),
                    React.createElement('div', { className: 'form-group' },
                        React.createElement('label', { className: 'form-label' }, 'Port'),
                        React.createElement('input', { type: 'number', value: this.state.smtp.port, onChange: e => this.handleSmtpChange('port', e.target.value), className: 'form-input' })
                    ),
                    React.createElement('div', { className: 'form-group' },
                        React.createElement('label', { className: 'form-label' }, 'User'),
                        React.createElement('input', { type: 'text', value: this.state.smtp.user, onChange: e => this.handleSmtpChange('user', e.target.value), className: 'form-input' })
                    ),
                    React.createElement('div', { className: 'form-group' },
                        React.createElement('label', { className: 'form-label' }, 'Password'),
                        React.createElement('input', { type: 'password', value: this.state.smtp.pass, onChange: e => this.handleSmtpChange('pass', e.target.value), className: 'form-input' })
                    ),
                    React.createElement('div', { className: 'form-group' },
                        React.createElement('label', { className: 'form-label' }, 'From'),
                        React.createElement('input', { type: 'email', value: this.state.smtp.from, onChange: e => this.handleSmtpChange('from', e.target.value), className: 'form-input' })
                    )
                )
            ),

            // Data Export
            React.createElement('div', { className: 'settings-section' },
                React.createElement('h2', null, 'Data Export'),
                React.createElement('div', { className: 'd-flex gap-md' },
                    React.createElement('button', { onClick: () => this.handleExport('json'), className: 'btn btn-secondary' }, 'Export as JSON'),
                    React.createElement('button', { onClick: () => this.handleExport('pdf'), className: 'btn btn-secondary' }, 'Export as PDF')
                )
            ),

            // Backup and Restore
            React.createElement('div', { className: 'settings-section' },
                React.createElement('h2', null, 'Backup and Restore'),
                React.createElement('div', { className: 'd-flex gap-md' },
                    React.createElement('button', { onClick: this.handleBackup, className: 'btn btn-secondary' }, 'Create Backup'),
                    React.createElement('button', { onClick: this.handleRestore, className: 'btn btn-secondary' }, 'Restore from Backup')
                )
            ),

            // Alert Settings
            React.createElement('div', { className: 'settings-section' },
                React.createElement('h2', null, 'Alert Settings'),
                React.createElement('div', { className: 'form-group' },
                    React.createElement('label', { className: 'form-label' }, 'Screen Time Limit (seconds)'),
                    React.createElement('input', { type: 'number', value: this.state.screenLimit, onChange: e => this.setState({ screenLimit: parseInt(e.target.value) }), className: 'form-input' })
                ),
                React.createElement('div', { className: 'form-group' },
                    React.createElement('label', { className: 'form-label' }, 'Study Goal (seconds)'),
                    React.createElement('input', { type: 'number', value: this.state.studyGoal, onChange: e => this.setState({ studyGoal: parseInt(e.target.value) }), className: 'form-input' })
                )
            ),

            // Data Deletion
            React.createElement('div', { className: 'settings-section' },
                React.createElement('h2', null, 'Data Management'),
                React.createElement('button', { onClick: this.handleDeleteData, className: 'btn btn-danger' }, 'Delete All Data')
            ),

            React.createElement('button', { onClick: this.saveSettings, className: 'btn btn-primary mt-4' }, 'Save Settings')
        );
    }
}

// Make component available globally
window.Settings = Settings;