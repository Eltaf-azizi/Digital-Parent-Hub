var PieChart = Recharts.PieChart;
var Pie = Recharts.Pie;
var Cell = Recharts.Cell;
var ResponsiveContainer = Recharts.ResponsiveContainer;
var BarChart = Recharts.BarChart;
var Bar = Recharts.Bar;
var XAxis = Recharts.XAxis;
var YAxis = Recharts.YAxis;
var Tooltip = Recharts.Tooltip;

var COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

class Dashboard extends React.Component {
    formatTime(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        return `${hours}h ${minutes}m`;
    }

    render() {
        const { data } = this.props;
        if (!data) return React.createElement('div', null, 'No data available');

        const { totalTime, categories, productivityScore, insights } = data;

        return React.createElement('div', { style: { padding: '20px', fontFamily: 'Arial, sans-serif' } },
            React.createElement('h1', { style: { textAlign: 'center', color: '#333' } }, 'Digital Parent Hub Dashboard'),

            // Total Screen Time
            React.createElement('div', { style: { textAlign: 'center', margin: '20px 0' } },
                React.createElement('h2', null, 'Total Screen Time Today'),
                React.createElement('p', { style: { fontSize: '2em', color: '#007bff' } }, this.formatTime(totalTime))
            ),

            // Productivity Score
            React.createElement('div', { style: { textAlign: 'center', margin: '20px 0' } },
                React.createElement('h2', null, 'Productivity Score'),
                React.createElement('p', { style: { fontSize: '2em', color: productivityScore > 70 ? '#28a745' : productivityScore > 40 ? '#ffc107' : '#dc3545' } }, `${productivityScore}%`)
            ),

            // Category Breakdown
            React.createElement('div', { style: { margin: '20px 0' } },
                React.createElement('h2', { style: { textAlign: 'center' } }, 'Category-wise Time Breakdown'),
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
            ),

            // Insights
            React.createElement('div', { style: { textAlign: 'center', margin: '20px 0', padding: '20px', backgroundColor: '#f8f9fa', borderRadius: '8px' } },
                React.createElement('h2', null, 'Insights'),
                React.createElement('p', { style: { fontSize: '1.2em', color: '#6c757d' } }, insights)
            )
        );
    }
}

// Make component available globally
window.Dashboard = Dashboard;