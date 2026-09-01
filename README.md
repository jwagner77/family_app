# 🏡 Family App

A modern, responsive, and all-in-one household management platform built on **React (Vite)**, **Node.js (Express)**, and **SQLite**. Designed with a glassmorphism aesthetic, customizable themes, and rich interactive widgets, Family App unifies household calendars, task delegation, meal planning, finances, reading logs, contacts, chores, and dashboard displays into a single, cohesive experience.

---

## 🌟 Key Features

### 📊 Customizable Dashboards & Rotation
- **Multiple Dashboards**: Create, rename, clone, and manage multiple independent dashboards.
- **Auto-Rotation**: Configure automated rotating carousel between selected dashboards with custom interval timing (pause/resume controls included).
- **Public & Kiosk Sharing**: Generate shareable read-only dashboard links with individual themes, auto-rotation support, and token-based security.
- **Drag-and-Drop Canvas**: Freely position and resize widgets on an interactive dotted grid canvas.

### 📅 Calendar & Agenda Widget Series
- **Daily Agenda**: Focused view of today's or any selected date's schedule, events, tasks, bills, and birthdays with day-to-day navigation.
- **Weekly Agenda**: Rolling 7-day view with visual today highlights and day breakdown.
- **Monthly Agenda**: Chronological agenda feed for the entire month with category badges.
- **Monthly Calendar (Full Grid)**: Full 7-column calendar grid matching the dedicated Calendar view, featuring month steppers, category color legends, and an interactive day inspector drawer.
- **Universal Availability**: All 4 calendar widgets can be placed on the **Custom Dashboard**, **Shared Kiosk Displays**, or enabled as cards on the **Overview Page**.

### 🏠 Overview Page
- **12-Column Responsive Grid**: Reorder cards and grab card edges or corners to stretch/shrink cards across the grid.
- **Custom Wallpapers**: Set persistent background styles (Unsplash daily wallpapers with attribution, custom image URLs, gradients, or solid colors) that persist across sessions.
- **Unified Summary**: View upcoming tasks, today's schedule, expiring leftovers, bills, and weather in one place.

### 🗓️ Household Calendar & Microsoft 365 Sync
- **Event Scheduling**: Create, edit, and organize household events with start/end times and location tags.
- **Microsoft 365 Sync**: Seamless two-way / pull sync with Microsoft Entra ID calendar.
- **Category Customization**: Custom color pickers for Events, FocusFlow Tasks, Recurring Bills, Subscriptions, and Contact Birthdays.
- **Auto-Populated Contact Dates**: Contact birthdays, anniversaries, and milestones automatically populate the calendar.

### 🎯 FocusFlow Task Management
- **Task Organization**: Categorize tasks into custom lists with priorities, due dates, and tags.
- **Subtasks & Checklists**: Break complex chores and projects into actionable steps.
- **Recurring Tasks**: Configure daily, weekly, or monthly repeating schedules.

### 🧹 Chores & Housekeeping
- **Family Profiles**: Set up avatars, roles, and profiles for every household member.
- **Chore Assignments & Points**: Assign chores, track completion status, and award points.
- **Housekeeping Schedules**: Manage periodic maintenance and cleaning rotations.

### 💳 Financial Tracker (Bills & Subscriptions)
- **Recurring Bills**: Track utility bills, due dates, amounts, payment URLs, and payment statuses.
- **Subscriptions Manager**: Monitor active subscriptions, billing cycles, monthly/yearly spend totals, and renewal alerts.

### 🍳 Cookbook & Meal Planning
- **Recipe Management**: Store ingredients, instructions, tags, and preparation times.
- **Meal Planning**: Plan 3-day, 5-day, or weekly menus.
- **Leftovers Tracker**: Log leftovers with expiration dates to minimize food waste.
- **Shopping Lists**: Automatically aggregate grocery items from planned meals.

### 📚 Library & Reading Progress
- **Book Tracker**: Log books read, current reads, and to-read wishlist.
- **Reading Progress**: Track pages read, ratings, and yearly reading goals.

### 👥 Contacts & Relationships
- **Contact Directory**: Manage family, friends, and service provider details.
- **Important Dates**: Track birthdays, anniversaries, and custom milestones.

### 🎮 Arcade & Word Games
- Built-in casual word puzzles and mini-games for family entertainment.

### 🔒 Security, Authentication & Notifications
- **Single Sign-On (SSO)**: OpenID Connect (OIDC) / Microsoft Entra ID integration.
- **Role-Based Access Control (RBAC)**: Fine-grained permissions for administrators, members, and guests.
- **Notifications Engine**: Multi-channel alerts via SMTP Email, Discord Webhooks, and generic HTTP webhooks.
- **Password Visibility Toggles**: Interactive show/hide controls across all credential inputs.

---

## 🛠️ Tech Stack

- **Frontend**: React 18, Vite, Lucide Icons, CSS Custom Properties (Theme Engine)
- **Backend**: Node.js, Express, SQLite (`better-sqlite3` / `sqlite3`)
- **Containerization**: Docker, Docker Compose, GitHub Container Registry (`ghcr.io`)
- **Authentication**: JWT, bcrypt / PBKDF2, OIDC (Microsoft Entra ID)

---

## 📁 Repository Structure

```text
├── .github/
│   └── workflows/
│       └── docker-publish.yml    # GitHub Actions Docker build & publish workflow
├── backend/
│   ├── db.js                     # SQLite database schema, migrations & seed data
│   ├── server.js                 # Express API server, routes & authentication
│   └── package.json              # Backend dependencies
├── data/                         # Persistent database & uploads (mounted volume)
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── HomeView.jsx            # 12-column customizable Overview page
│   │   │   ├── CustomDashboardView.jsx # Multi-dashboard editor & widget renderer
│   │   │   ├── SharedDashboardView.jsx # Kiosk / public read-only dashboard
│   │   │   ├── CalendarView.jsx        # Full household calendar & M365 syncer
│   │   │   ├── FocusView.jsx           # FocusFlow task management
│   │   │   ├── HousekeepingView.jsx    # Chores, family profiles & points
│   │   │   ├── ContactsView.jsx        # Contacts directory & milestones
│   │   │   ├── SettingsView.jsx        # Admin & system settings panel
│   │   │   ├── GamesView.jsx           # Mini-games & arcade
│   │   │   └── UserProfileView.jsx     # User settings & profile preferences
│   │   ├── App.jsx                     # Layout shell, sidebar navigation & auth
│   │   ├── index.css                   # Glassmorphism design system & styles
│   │   └── main.jsx                    # React entry point
│   ├── index.html                      # HTML template
│   ├── package.json                    # Frontend dependencies
│   └── vite.config.js                  # Vite configuration & API proxy
├── docker-compose.yml                  # Docker Compose configuration
├── Dockerfile                          # Multi-stage production container build
└── README.md                           # Documentation
```

---

## 🚀 Quick Start (Docker)

The fastest way to run Family App is using Docker Compose:

```bash
# 1. Clone the repository
git clone https://github.com/jwagner77/family_app.git
cd family_app

# 2. Build and start the containers
docker compose up -d --build
```

Access the application in your browser at:
👉 **`http://localhost:8282`**

### Default Administrator Credentials
- **Username**: `admin`
- **Password**: `admin123`

*(Please change your password immediately upon first login via Settings → User Management).*

---

## 💻 Local Development Setup

If you prefer running frontend and backend separately for development:

### 1. Backend
```bash
cd backend
npm install
npm run dev
# Server runs on http://localhost:5000 (or PORT specified in .env)
```

### 2. Frontend
```bash
cd frontend
npm install
npm run dev
# Dev server runs on http://localhost:3000 (proxies /api to backend)
```

---

## ⚙️ Environment Configuration

You can customize environment variables via `.env` in the root directory:

```env
PORT=5000
DATABASE_PATH=./data/base.db
JWT_SECRET=your_secure_random_jwt_secret_key
SSL_KEY_PATH=./data/ssl.key
SSL_CERT_PATH=./data/ssl.crt
```

---

## 📦 Container Registry

Official Docker container images are automatically built and published via GitHub Actions to:
```text
ghcr.io/jwagner77/family_app:latest
```

---

## 📄 License

This project is licensed under the MIT License.
