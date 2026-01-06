const { PieChart, Pie, Cell, ResponsiveContainer } = Recharts;
const Settings = require('./Settings');

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

class ParentDashboard extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            showSettings: false
        };
    }

    formatTime(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        return `${hours}h ${minutes}m`;
    }

    toggleSettings = () => {
        this.setState(prev => ({ showSettings: !prev.showSettings }));
    };

    render() {
        const { data, onSwitchToChild } = this.props;
        const { showSettings } = this.state;

        if (showSettings) {
            return React.createElement(Settings, { onClose: this.toggleSettings });
        }
        if (!data) return React.createElement('div', null, 'No data available');

        const { totalTime, categories, productivityScore, insights, reports, alerts, categoriesList } = data;

        return React.createElement('div', { className: 'dashboard' },
            React.createElement('button', { onClick: onSwitchToChild, className: 'btn btn-secondary parent-access-btn' }, 'Switch to Child View'),
            React.createElement('button', { onClick: this.toggleSettings, className: 'btn btn-outline settings-btn' }, 'Settings'),

            React.createElement('h1', { className: 'text-center' }, 'Digital Parent Hub - Parent View'),

            // Total Screen Time
            React.createElement('div', { className: 'metric' },
                React.createElement('h2', null, 'Total Screen Time Today'),
                React.createElement('p', { className: 'metric-value' }, this.formatTime(totalTime))
            ),

            // Productivity Score
            React.createElement('div', { className: `metric productivity-score ${productivityScore > 70 ? 'high' : productivityScore > 40 ? '' : 'low'}` },
                React.createElement('h2', null, 'Productivity Score'),
                React.createElement('p', { className: 'metric-value' }, `${productivityScore}%`)
            ),

            // Category Breakdown
            React.createElement('div', { className: 'card' },
                React.createElement('div', { className: 'card-header' },
                    React.createElement('h2', { className: 'card-title' }, 'Category-wise Time Breakdown')
                ),
                React.createElement('div', { className: 'card-content' },
                    React.createElement(ResponsiveContainer, { width: '100%', height: 300 },
                        React.createElement(PieChart,
                            React.createElement(Pie, {
                                data: categories,
                                cx: '50%',
                                cy: '50%',
                                labelLine: false,
                                label: ({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`,
                                outerRadius: 80,
                                fill: '#8884d8',
                                dataKey: 'time'
                            }, categories.map((entry, index) => React.createElement(Cell, { key: `cell-${index}`, fill: COLORS[index % COLORS.length] })))
                        )
                    )
                )
            ),

            // Insights
            React.createElement('div', { className: 'card' },
                React.createElement('div', { className: 'card-header' },
                    React.createElement('h2', { className: 'card-title' }, 'Insights')
                ),
                React.createElement('div', { className: 'card-content' },
                    React.createElement('p', null, insights)
                )
            ),

            // Alerts
            React.createElement('div', { className: 'card' },
                React.createElement('div', { className: 'card-header' },
                    React.createElement('h2', { className: 'card-title' }, 'Alerts')
                ),
                React.createElement('div', { className: 'card-content' },
                    alerts.length > 0 ? alerts.map((alert, index) => React.createElement('div', { key: index, className: 'alert alert-danger' }, alert)) : React.createElement('p', null, 'No alerts')
                )
            ),

            // Reports
            React.createElement('div', { className: 'card' },
                React.createElement('div', { className: 'card-header' },
                    React.createElement('h2', { className: 'card-title' }, 'Reports')
                ),
                React.createElement('div', { className: 'card-content' },
                    reports.length > 0 ? reports.map((report, index) => React.createElement('div', { key: index, className: 'card' },
                        React.createElement('p', null, `Type: ${report.type}`),
                        React.createElement('p', null, `Created: ${new Date(report.created_at).toLocaleDateString()}`)
                    )) : React.createElement('p', null, 'No reports available')
                )
            ),

            // Categories
            React.createElement('div', { className: 'card' },
                React.createElement('div', { className: 'card-header' },
                    React.createElement('h2', { className: 'card-title' }, 'Categories')
                ),
                React.createElement('div', { className: 'card-content' },
                    categoriesList.map((cat, index) => React.createElement('div', { key: index, className: 'mb-2' },
                        React.createElement('strong', null, cat.name), ': ', cat.description
                    ))
                )
            )
        );
    }
}

module.exports = ParentDashboard;