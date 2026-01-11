# Digital Parent Hub

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

A privacy-first desktop application that helps families monitor and encourage healthy digital habits. Track screen time, categorize activities, and generate insights without invading privacy.

## 🚀 Features

### For Children
- **Child-Friendly Dashboard**: View daily screen time, category balance, and streaks
- **Encouraging Tips**: Receive positive feedback and tips for better digital habits
- **Privacy-Focused**: Only tracks app usage, never content or keystrokes

### For Parents
- **Comprehensive Analytics**: Detailed reports on screen time patterns and productivity
- **Category Management**: Customize activity categories (Study, Entertainment, Social, etc.)
- **Alert System**: Configurable notifications for screen time limits and goals
- **Data Export**: Backup, restore, and export data in various formats
- **Email Reports**: Automated weekly reports via SMTP

### Privacy & Security
- **Local Storage**: All data stored locally on device
- **Encryption**: Database encrypted with user-defined passphrase
- **No Content Monitoring**: Never tracks what you're viewing, typing, or communicating
- **Transparent Tracking**: Clear explanation of what is and isn't tracked

## 📋 Requirements

- **Operating System**: Windows 10+, macOS 10.14+, Linux (Ubuntu 18.04+)
- **Node.js**: v16.0.0 or higher
- **Build Tools**: Visual Studio Build Tools (Windows) or Xcode (macOS) for native dependencies

## 🛠️ Installation

### From Source

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/digital-parent-hub.git
   cd digital-parent-hub
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Build native dependencies** (if needed)
   ```bash
   # For Windows
   npm rebuild better-sqlite3

   # For macOS/Linux
   npm run postinstall
   ```

4. **Run the application**
   ```bash
   npm start
   ```

### From Pre-built Binaries

Download the latest release from the [Releases](https://github.com/yourusername/digital-parent-hub/releases) page.

- **Windows**: Download `Digital-Parent-Hub-Setup-X.X.X.exe`
- **macOS**: Download `Digital-Parent-Hub-X.X.X.dmg`
- **Linux**: Download `Digital-Parent-Hub-X.X.X.AppImage`

## 🚀 Usage

### First Time Setup

1. Launch the application
2. Complete the onboarding wizard
3. Set a parent PIN for secure access
4. Review and accept the privacy policy

### Daily Usage

- **Child View**: Automatically displayed, shows current stats and tips
- **Parent Access**: Click "Parent Access" and enter PIN to view detailed analytics
- **Settings**: Configure categories, alerts, email reports, and themes

### Key Features

- **Activity Tracking**: Automatically monitors active applications
- **Category Assignment**: Apps are grouped into customizable categories
- **Report Generation**: Daily and weekly summaries with productivity scores
- **Data Management**: Export, backup, and delete data as needed

## 🔒 Privacy Policy

Digital Parent Hub is committed to protecting your privacy. We collect only the minimum data necessary to provide digital well-being insights.

### What We Track
- Application names and categories
- Duration of usage for each application
- Basic system information for functionality

### What We Never Track
- Screen content or what you're viewing
- Keystrokes or typing activity
- Messages, emails, or any communication content
- Websites visited (beyond browser application)
- Files accessed or their contents
- Any private or personal information

### Data Security
- All data is stored locally on your device
- Database is encrypted using industry-standard encryption
- Access to parent features requires a PIN
- You have full control over your data

### Your Rights
- Export or backup all your data at any time
- Delete all data permanently
- Access privacy policy within the app during onboarding


## 🏗️ Development

### Project Structure
```
Digital-Parent-Hub/
├── main.js                 # Electron main process
├── server.js               # Express server for API
├── src/
│   ├── App.js             # React main component
│   ├── ChildDashboard.js  # Child view
│   ├── ParentDashboard.js # Parent analytics
│   ├── OnboardingWizard.js # Setup wizard
│   ├── Settings.js        # Configuration
│   ├── data/database.js   # Database operations
│   ├── reports/reports.js # Report generation
│   └── styles.css         # Styling
├── test_*.js              # Test files
└── package.json
```

### Running Tests
```bash
# Note: Some tests require native dependencies to be built
npm test  # Run all tests
node test_simple.js      # Basic database tests
node test_tracking.js    # Tracking and reports
node test_encryption.js  # Encryption tests
```

### Building for Distribution
```bash
# Build for current platform
npm run dist

# Build for all platforms (requires appropriate build environment)
npm run build
```

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Setup
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

---

**Digital Parent Hub** - Promoting healthy digital habits, one family at a time.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with [Electron](https://electronjs.org/)
- Database powered by [better-sqlite3](https://github.com/WiseLibs/better-sqlite3)
- UI components with [React](https://reactjs.org/)
- Charts with [Recharts](https://recharts.org/)

## 📞 Support

If you have questions or need help:
- Check the [Issues](https://github.com/yourusername/digital-parent-hub/issues) page
- Review the documentation
- Contact the maintainers
