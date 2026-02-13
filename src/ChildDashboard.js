const { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } = Recharts;

class ChildDashboard extends React.Component {
    formatTime(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        return `${hours}h ${minutes}m`;
    }

    render() {
        const { data, onSwitchToParent } = this.props;
        if (!data) return React.createElement('div', null, 'No data available');

        const { totalTime, categoryBalance, streak, tips } = data;

        return React.createElement('div', { className: 'dashboard' },
            React.createElement('button', { onClick: onSwitchToParent, className: 'btn btn-secondary parent-access-btn' }, 'Parent Access'),

            React.createElement('h1', { className: 'text-center' }, 'Digital Parent Hub - Child View'),

            // Total Screen Time Today
            React.createElement('div', { className: 'metric' },
                React.createElement('h2', null, 'Today\'s Screen Time'),
                React.createElement('p', { className: 'metric-value' }, this.formatTime(totalTime))
            ),

            // Category Balance
            React.createElement('div', { className: 'card' },
                React.createElement('div', { className: 'card-header' },
                    React.createElement('h2', { className: 'card-title' }, 'Category Balance')
                ),
                React.createElement('div', { className: 'card-content' },
                    React.createElement(ResponsiveContainer, { width: '100%', height: 300 },
                        React.createElement(BarChart, { data: categoryBalance },
                            React.createElement(XAxis, { dataKey: 'name' }),
                            React.createElement(YAxis, { tickFormatter: this.formatTime }),
                            React.createElement(Tooltip, { formatter: (value) => this.formatTime(value) }),
                            React.createElement(Bar, { dataKey: 'time', fill: '#8884d8' })
                        )
                    )
                )
            ),

            // Streaks
            React.createElement('div', { className: 'streak-display' },
                React.createElement('h2', null, 'Streaks'),
                React.createElement('p', { className: 'metric-value' }, `${streak} days`)
            ),

            // Friendly Tips
            React.createElement('div', { className: 'card tips-card' },
                React.createElement('div', { className: 'card-header' },
                    React.createElement('h2', { className: 'card-title' }, 'Friendly Tips')
                ),
                React.createElement('div', { className: 'card-content' },
                    React.createElement('p', { className: 'text-center' }, tips)
                )
            )
        );
    }
}