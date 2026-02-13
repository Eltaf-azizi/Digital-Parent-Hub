const { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } = Recharts;

class ReportsView extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            reports: [],
            selectedReport: null,
            generatingReport: false,
            emailSending: false,
            emailAddress: '',
            reportType: 'daily',
            reportDate: new Date().toISOString().split('T')[0],
            message: '',
            messageType: '' // 'success' or 'error'
        };
    }

    componentDidMount() {
        this.fetchReports();
    }

    fetchReports = async () => {
        try {
            const response = await fetch('/api/reports');
            const reports = await response.json();
            this.setState({ reports });
        } catch (error) {
            console.error('Error fetching reports:', error);
            this.setState({ message: 'Error fetching reports', messageType: 'error' });
        }
    };

    handleGenerateReport = async () => {
        const { reportType, reportDate } = this.state;
        this.setState({ generatingReport: true, message: '' });
        try {
            const response = await fetch('/api/generate-report', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type: reportType, startDate: reportDate })
            });
            const report = await response.json();
            this.setState({
                selectedReport: report,
                message: `${reportType} report generated successfully!`,
                messageType: 'success'
            });
            this.fetchReports();
        } catch (error) {
            console.error('Error generating report:', error);
            this.setState({ message: 'Error generating report', messageType: 'error' });
        } finally {
            this.setState({ generatingReport: false });
        }
    };

    handleSendEmail = async () => {
        const { emailAddress, reportType, reportDate } = this.state;
        if (!emailAddress) {
            this.setState({ message: 'Please enter an email address', messageType: 'error' });
            return;
        }
        this.setState({ emailSending: true, message: '' });
        try {
            const response = await fetch('/api/send-report-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ toEmail: emailAddress, type: reportType, startDate: reportDate })
            });
            const result = await response.json();
            this.setState({
                message: `Report sent to ${emailAddress}!`,
                messageType: 'success',
                emailAddress: ''
            });
        } catch (error) {
            console.error('Error sending email:', error);
            this.setState({ message: 'Error sending email (check SMTP settings)', messageType: 'error' });
        } finally {
            this.setState({ emailSending: false });
        }
    };

    formatTime(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        return `${hours}h ${minutes}m`;
    }

    render() {
        const { reports, selectedReport, generatingReport, emailSending, emailAddress, reportType, reportDate, message, messageType } = this.state;

        return React.createElement('div', { className: 'card' },
            React.createElement('div', { className: 'card-header' },
                React.createElement('h2', { className: 'card-title' }, 'Reports & Analytics')
            ),
            React.createElement('div', { className: 'card-content' },
                // Report Generator
                React.createElement('div', { className: 'report-controls' },
                    React.createElement('h3', null, 'Generate Report'),
                    React.createElement('div', { className: 'form-group' },
                        React.createElement('label', null, 'Report Type:'),
                        React.createElement('select', {
                            value: reportType,
                            onChange: (e) => this.setState({ reportType: e.target.value }),
                            className: 'form-input'
                        },
                            React.createElement('option', { value: 'daily' }, 'Daily'),
                            React.createElement('option', { value: 'weekly' }, 'Weekly'),
                            React.createElement('option', { value: 'monthly' }, 'Monthly'),
                            React.createElement('option', { value: 'yearly' }, 'Yearly')
                        )
                    ),
                    React.createElement('div', { className: 'form-group' },
                        React.createElement('label', null, 'Start Date:'),
                        React.createElement('input', {
                            type: 'date',
                            value: reportDate,
                            onChange: (e) => this.setState({ reportDate: e.target.value }),
                            className: 'form-input'
                        })
                    ),
                    React.createElement('button', {
                        onClick: this.handleGenerateReport,
                        disabled: generatingReport,
                        className: 'btn btn-primary'
                    }, generatingReport ? 'Generating...' : 'Generate Report')
                ),

                // Message
                message && React.createElement('div', {
                    className: `alert alert-${messageType === 'success' ? 'success' : 'danger'}`,
                    style: { marginTop: '10px', marginBottom: '10px' }
                }, message),

                // Selected Report Display
                selectedReport && React.createElement('div', { className: 'report-display', style: { marginTop: '20px', padding: '15px', backgroundColor: '#f9f9f9', borderRadius: '5px' } },
                    React.createElement('h3', null, `${selectedReport.period.charAt(0).toUpperCase() + selectedReport.period.slice(1)} Report - ${selectedReport.startDate}`),
                    React.createElement('div', { className: 'metric' },
                        React.createElement('p', null, React.createElement('strong', null, 'Total Screen Time: '), this.formatTime(selectedReport.totalScreenTime))
                    ),
                    React.createElement('div', { className: 'metric' },
                        React.createElement('p', null, React.createElement('strong', null, 'Productivity Score: '), `${selectedReport.productivityScore}%`)
                    ),
                    React.createElement('div', { className: 'metric' },
                        React.createElement('p', null, React.createElement('strong', null, 'Balance Status: '), selectedReport.balanceStatus)
                    ),
                    React.createElement('div', { className: 'metric' },
                        React.createElement('h4', null, 'Category Breakdown:'),
                        Object.entries(selectedReport.categoryBreakdown).map(([cat, time]) =>
                            React.createElement('p', { key: cat }, `${cat}: ${this.formatTime(time)}`)
                        )
                    ),
                    React.createElement('div', { className: 'metric' },
                        React.createElement('h4', null, 'Suggestions:'),
                        selectedReport.suggestions.map((sug, i) =>
                            React.createElement('p', { key: i }, `• ${sug}`)
                        )
                    ),

                    // Email Section
                    React.createElement('div', { style: { marginTop: '15px', paddingTop: '15px', borderTop: '1px solid #ddd' } },
                        React.createElement('h4', null, 'Send Report via Email'),
                        React.createElement('div', { className: 'form-group' },
                            React.createElement('input', {
                                type: 'email',
                                value: emailAddress,
                                onChange: (e) => this.setState({ emailAddress: e.target.value }),
                                placeholder: 'Enter email address',
                                className: 'form-input'
                            })
                        ),
                        React.createElement('button', {
                            onClick: this.handleSendEmail,
                            disabled: emailSending || !emailAddress,
                            className: 'btn btn-primary'
                        }, emailSending ? 'Sending...' : 'Send Email')
                    )
                ),

                // Reports History
                React.createElement('div', { style: { marginTop: '30px' } },
                    React.createElement('h3', null, 'Stored Reports'),
                    reports.length > 0 ? reports.map((report, idx) =>
                        React.createElement('div', {
                            key: idx,
                            className: 'card',
                            onClick: () => this.setState({ selectedReport: JSON.parse(report.data) }),
                            style: { cursor: 'pointer', marginBottom: '10px', padding: '10px', backgroundColor: '#f0f0f0', borderRadius: '5px' }
                        },
                            React.createElement('p', null,
                                React.createElement('strong', null, report.type.toUpperCase()),
                                ` - Created: ${new Date(report.created_at).toLocaleDateString()} ${new Date(report.created_at).toLocaleTimeString()}`
                            )
                        )
                    ) : React.createElement('p', null, 'No reports stored yet.')
                )
            )
        );
    }
}
