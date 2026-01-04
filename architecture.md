# Digital Parent Hub Architecture Design

## Overview
Digital Parent Hub is a privacy-first desktop application designed to help parents monitor their child's digital well-being without invasive content tracking. The application tracks app usage time, categorizes activities, generates reports, and provides parent/child views with alerts and settings.

## Technology Stack
- **Electron**: Cross-platform desktop framework using web technologies.
- **React**: UI library for building interactive user interfaces.
- **Node.js**: Runtime for backend logic and Electron main process.
- **SQLite**: Local relational database with encryption support.

**Rationale**: Electron enables building a desktop app with web technologies, ensuring cross-platform compatibility. React provides a component-based UI that's efficient and scalable. Node.js maintains JavaScript consistency across the stack. SQLite offers lightweight, local data storage with encryption capabilities, aligning with privacy-first requirements.

## High-Level Modules
The architecture follows a modular design with clear separation of concerns:

1. **UI Layer (Renderer Process)**: React-based interface for dashboard, reports, settings, and user interactions.
2. **Business Logic Layer**: Node.js modules handling tracking, categorization, report generation, email delivery, and alerts.
3. **Data Layer**: SQLite database with DAOs for data access and encryption.

Additional modules:
- **Main Process**: Electron main process managing windows, IPC, and system integration.
- **Tracking Service**: Background module for activity monitoring.

## Data Flow
1. Tracking Service monitors app usage via OS APIs, collecting metadata (app name, time spent).
2. Data is stored in encrypted SQLite database via Data Layer.
3. UI requests data through IPC to Business Logic Layer.
4. Business Logic queries Data Layer and processes data for reports/alerts.
5. Reports can be displayed in UI or sent via email.

## Security Measures
- **Database Encryption**: Use SQLCipher for SQLite encryption.
- **Privacy-First**: Only collect app usage metadata, no content capture.
- **Local Storage**: All data stored locally, no cloud dependencies.
- **Access Controls**: Separate parent/child views with authentication.
- **Secure IPC**: Use Electron's contextBridge for safe renderer-main communication.
- **Data Minimization**: Collect only necessary data for well-being tracking.

## Integration Points
- **Activity Tracking**: OS-specific APIs (e.g., Windows process monitoring).
- **Reports**: Data visualization libraries (e.g., Chart.js) integrated with React.
- **Email Delivery**: Nodemailer for sending reports.
- **Alerts**: Electron notifications API for in-app alerts.
- **Settings**: Configuration stored in database, editable via UI.
- **Onboarding**: Initial setup wizard in React.

## File Structure
```
Digital-Parent-Hub/
├── main/
│   ├── main.js          # Electron main process
│   └── preload.js       # Secure IPC preload script
├── renderer/
│   ├── public/
│   ├── src/
│   │   ├── components/  # Reusable React components
│   │   ├── pages/       # Dashboard, Reports, Settings pages
│   │   ├── services/    # IPC communication services
│   │   └── App.js
│   └── package.json
├── shared/
│   ├── models/          # Data models and types
│   └── utils/           # Common utilities
├── database/
│   ├── schema.sql       # Database schema
│   ├── migrations/      # Database migrations
│   └── dao.js           # Data access objects
├── business-logic/
│   ├── tracking.js      # Activity tracking logic
│   ├── categorization.js # App categorization
│   ├── reports.js       # Report generation
│   ├── email.js         # Email service
│   └── alerts.js        # Alert system
├── package.json
└── README.md
```

## API Interfaces
Communication between UI and backend uses Electron IPC:

- `ipcRenderer.invoke('get-activity-data', params)` → Returns activity data
- `ipcRenderer.invoke('generate-report', params)` → Generates and returns report
- `ipcRenderer.invoke('send-email', params)` → Sends email report
- `ipcRenderer.invoke('update-settings', params)` → Updates settings
- `ipcRenderer.invoke('get-settings')` → Returns current settings

## Rationale for Choices
- **Modular Design**: Enables independent development, testing, and future scalability to web/mobile.
- **Privacy Focus**: Local encrypted storage ensures data stays on device, no external dependencies.
- **Scalability**: React can be reused for web version, Node.js logic can be adapted for mobile backends.
- **Cross-Platform**: Electron handles OS differences, allowing single codebase for Windows/macOS/Linux.
- **Performance**: SQLite is efficient for local queries, React optimizes UI rendering.

This architecture supports all core features while maintaining privacy, modularity, and scalability.