# Home App Dashboard

A clean, responsive, and premium full-stack dashboard application built on React (Vite) and Node (Express) with a SQLite database. It features a polished glassmorphism design system inspired by Material Design 3 (MD3), featuring theme customizations, Single Sign-On, notification routing, and productivity modules.

---

## Features

- **Dashboard / Home**: A centralized start screen containing quick shortcuts and recently used connections.
- **Task Management**: A responsive checklist to log, filter, and track daily tasks and TODO items.
- **Calendar Scheduling**: Integrated calendar schedule view to log meals, reminders, and activities, with native support for syncing with Microsoft 365 calendar.
- **Subscriptions Tracker**: Track recurring payments, subscription costs, renewal dates, and billing periods in a structured data table.
- **Theme & Brand customizer**: Choose custom primary accent colors, toggle dark/light theme options, and upload logos or browser favicons that persist globally.
- **Single Sign-On (SSO)**: OIDC configuration layer supporting Microsoft Entra ID (Azure AD) user authentication.
- **SMTP & Webhook Notifications**: Configurable SMTP email dispatcher, Discord webhook embeds, and signature-validated generic HTTP webhooks.
- **Security Enhancements**: 
  - Dynamic **"Show Password" checkboxes** integrated into all password and client secret entry fields (Login page, User Password resets, Add/Edit User forms, SSO secret inputs, SMTP server configuration, and Webhook secret signature token inputs).
  - Secure PBKDF2 password hashing with custom random salting.
  - Role-Based Access Control (RBAC) user authorization matrix.

---

## File Structure

```text
├── backend/
│   ├── db.js          # SQLite migrations, schema configuration, and CRUD helper methods
│   ├── server.js      # Express API server, token authentication, SSO, and configuration endpoints
│   └── package.json   # Node server dependencies
├── data/              # SQLite database and uploads directory (git ignored)
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── HomeView.jsx            # Sleek developer dashboard landing page
│   │   │   ├── SettingsView.jsx        # Complete settings panel (General, Users, Roles, SSO, Notifications, etc.)
│   │   │   ├── TasksView.jsx           # Task/todo checklist management component
│   │   │   ├── CalendarView.jsx        # Calendar event viewer and M365 syncer component
│   │   │   └── SubscriptionsView.jsx   # Subscriptions cost tracking component
│   │   ├── App.jsx                     # Sidebar layout, global authentication, and tab routing
│   │   ├── index.css                   # Global CSS stylesheet (themes, typography, MD3 classes)
│   │   └── main.jsx                    # React app entry point
│   ├── index.html                      # HTML layout wrapper
│   ├── package.json                    # React application dependencies
│   └── vite.config.js                  # Vite server configurations and API proxy settings
├── .env.example                        # Example configurations template for environment vars
└── .gitignore                          # Default git exclusions list
```

---

## Configuration & Environment Variables

Create a `.env` file in the root directory and populate it with the configurations:

```env
PORT=5000
DATABASE_PATH=./data/base.db
JWT_SECRET=your_super_secret_jwt_key
SSL_KEY_PATH=./data/ssl.key
SSL_CERT_PATH=./data/ssl.crt
```

---

## Deployment & Running

### Using Docker (Recommended)

To run the application inside docker with hot reloading or production compilation:

1. **Rebuild & Run**:
   ```bash
   docker compose build
   docker compose up -d
   ```
2. **Access URL**:
   Open `http://localhost:8282` in your web browser.

### Local Development Setup

1. **Backend Installation**:
   ```bash
   cd backend
   npm install
   npm run dev
   ```

2. **Frontend Installation**:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
   *Note: Open `http://localhost:3000` in your browser. The Vite server is configured to proxy `/api` calls to the Express backend running on port `5000`.*

3. **Bootstrap Credentials**:
   Log in with the default Administrator account:
   - **Username**: `admin`
   - **Password**: `admin123`
