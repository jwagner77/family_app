# 🏡 Family Hub (Family App)

[![Docker Publish](https://github.com/jwagner77/family_app/actions/workflows/docker-publish.yml/badge.svg)](https://github.com/jwagner77/family_app/actions/workflows/docker-publish.yml)
[![Container Registry](https://img.shields.io/badge/GHCR-ghcr.io%2Fjwagner77%2Ffamily__app-blue?logo=docker)](https://github.com/jwagner77/family_app/pkgs/container/family_app)
[![Node.js](https://img.shields.io/badge/Node.js-v20%2B-green?logo=node.js)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18.3.1-61dafb?logo=react)](https://react.dev/)
[![SQLite](https://img.shields.io/badge/SQLite-WAL%20Mode-003B57?logo=sqlite)](https://www.sqlite.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A modern, high-performance, and all-in-one self-hosted household management platform built with **React (Vite)**, **Node.js (Express)**, and **SQLite**. Featuring an elegant glassmorphism aesthetic, customizable themes, and rich interactive widgets, Family Hub unifies household calendars, task delegation, meal planning, finances, reading logs, contacts, chores, health logs, pet care, and wall-mounted kiosk dashboard displays into a single, cohesive experience.

---

## 📑 Quick Links

- 🌟 [Feature Highlights](#-feature-highlights)
- 🛠️ [Technology Stack & Versions](#-technology-stack--component-versions)
- 🔌 [REST API Documentation (API.md)](./API.md)
- 🚀 [Quick Start with Docker](#-quick-start-with-docker)
- 💻 [Local Development](#-local-development-setup)
- ⚙️ [Configuration & Environment Variables](#-environment-configuration)
- 📱 [Mobile App & Companion Display Support](#-mobile-app--kiosk-displays)
- 🔒 [Security & Access Control](#-security-authentication--access-control)
- 👥 [Authors & Acknowledgments](#-authors--acknowledgments)

---

## 🌟 Feature Highlights

### 📊 Customizable Dashboards & Multi-Link Kiosk Rotation
- **Multi-Dashboard Canvas**: Create, name, clone, and manage multiple independent dashboards.
- **Drag-and-Drop Grid**: Freely position and resize cards on an interactive dotted grid canvas.
- **Automated Rotating Displays**: Group dashboards into timed rotating carousels with configurable interval timers and pause/resume controls.
- **Kiosk & Multi-Link Sharing**: Generate standalone, token-authenticated public sharing links tailored for wall tablets and kitchen smart displays.

### 📅 Calendar & Agenda Suite (with Microsoft 365 Sync)
- **Universal Agenda Widgets**: Daily, Weekly, and Monthly Chronological Agenda feeds.
- **Full Month Calendar Grid**: 7-column calendar view with category color coding, month steppers, and interactive day drawer.
- **Microsoft Entra ID / M365 Sync**: Seamlessly sync personal and family calendars with Microsoft 365.
- **Category Customization**: Custom colors for Events, FocusFlow Tasks, Recurring Bills, Subscriptions, and Contact Milestones.
- **Automated Milestone Overlay**: Birthdays and anniversaries from the Contacts directory automatically populate your schedule.

### 🏠 Overview Page
- **12-Column Responsive Grid**: Reorder cards and grab card edges or corners to stretch/shrink cards across the grid.
- **Custom Wallpapers**: Set persistent background styles (Unsplash daily wallpapers with attribution, custom image URLs, gradients, or solid colors) that persist across sessions.
- **Unified Daily Summary**: View upcoming tasks, today's schedule, expiring leftovers, bills, and weather at a glance.

### 🍳 Cookbook, Meal Planning & Word (.docx) Export
- **Structured Recipe Management**: Store ingredients, step-by-step instructions, prep/cook times, servings, tags, and bulleted notes.
- **OCR Recipe Extraction**: Automatically parse ingredients and directions from uploaded recipe photos using on-device Tesseract OCR.
- **Microsoft Word (.docx) Export**: Download beautifully formatted Word documents for any recipe using customizable docx templates.
- **Weekly Meal Planner**: Schedule breakfast, lunch, and dinner menus with serving sizes and user attendance tracking.
- **Auto-Aggregated Shopping Lists**: Push meal ingredients directly into categorized shopping lists with custom aisle sorting.

### 🧊 Kitchen Inventory & Leftovers Tracker
- **Pantry & Fridge Inventory**: Track spices, canned goods, refrigerated items, and freezer inventory with quantities and expiration dates.
- **Leftovers Management**: Log cooked meals with safe consumption dates, freeze options, and consumption logs.
- **Automated Expiry Alerts**: Background cron engine checks expiring items and alerts you before food spoils.

### 🎯 FocusFlow Task & Habit Engine
- **ADHD-Friendly Task Decomposition**: Break complex tasks into subtasks and bite-sized micro-steps.
- **Habit Tracking & Streaks**: Daily habit monitoring with streak tracking and 30-day completion metrics.
- **Active Focus Timer**: Built-in stopwatch and time logger to track active work sessions per task.
- **Categorized Todo Lists**: General task management with custom priority flags, due dates, and status filters.

### 🧹 Chores, Housekeeping & Family Points
- **Household Member Profiles**: Assign custom avatars, roles, and profiles for every family member.
- **Chore Delegation & Recurrence**: Create recurring housekeeping routines with point rewards.
- **Chore Rewards System**: Redeem accumulated chore points for custom household rewards and privileges.

### 💳 Financial Tracker, Bills & Monarch Money Sync
- **Recurring Bills**: Monitor utility bills, due dates, payment URLs, and toggle paid/unpaid status.
- **Subscriptions Manager**: Track subscription cycles, renewal cadences, and monthly/annual spend projections.
- **Monarch Money Integration**: Pull synchronized accounts, bank balances, and net worth summaries directly via GraphQL.

### 📚 Library & Reading Progress
- **Book Catalog**: Search and organize family books by genre, author, and reading status (`to-read`, `reading`, `completed`).
- **ISBN & Barcode Scanner**: Scan physical book barcodes via webcam/mobile camera using HTML5-QRCode.
- **Reading Progress Logs**: Track current pages read, personal ratings, notes, and yearly reading goals.

### 👥 Contacts & Family Relationships
- **Contact Directory**: Store family, friends, neighbors, and service provider details.
- **Relationship Mapping**: Map family relationships (spouse, child, parent) between system users and directory contacts.
- **Important Dates & Reminders**: Track birthdays, anniversaries, and custom milestones.

### 🩺 Health Tracking, Medications & Pet Profiles
- **Daily Wellness Logs**: Record daily steps, water intake, sleep duration, mood ratings, and body weight.
- **Medication Management**: Track prescription dosages, administration frequencies, and dosing logs.
- **Doctor Appointments**: Maintain upcoming medical and specialist appointments.
- **Pet Care & Vet Visits**: Log pet profiles, breed info, weight histories, vet checkups, and pet medications.

### 🎮 Arcade & Family Games
- **Game Library**: Catalog board games, card games, player count recommendations, and ages.
- **Game Night Session Logs**: Record play history, winners, match dates, and Markdown recap notes.
- **Casual Mini-Games**: Built-in casual word puzzles for family entertainment.

### 🔔 Notifications & Multi-Channel Webhooks
- **SMTP Email Notifications**: Automated emails for bills due, expiring food, and system events.
- **Discord & Webhook Integrations**: Instant webhook dispatches with HMAC-SHA256 signature verification (`X-Signature`).
- **Push Notification Backend**: APNs and FCM token registration endpoints ready for native mobile app integration.

---

## 🛠️ Technology Stack & Component Versions

| Tier | Component | Version | Description |
| :--- | :--- | :--- | :--- |
| **Frontend** | React | `^18.3.1` | Modern SPA component architecture with stateful hooks |
| | Vite | `^5.2.11` | High-speed frontend build tool and development server |
| | Lucide React | `^0.378.0` | Comprehensive vector iconography library |
| | HTML5-QRCode | `^2.3.8` | Cross-platform barcode and QR code scanner |
| | Design System | Modern CSS3 | Responsive glassmorphism styling and custom CSS properties |
| **Backend** | Node.js | `v20+ LTS` | Asynchronous event-driven server runtime |
| | Express | `^4.19.2` | RESTful API routing, CORS handling, and middleware |
| | Docxtemplater | `^3.45.0` | Microsoft Word document compilation engine |
| | PizZip | `^3.1.4` | In-memory zip archive manipulation for `.docx` templates |
| | Tesseract.js | `^5.0.5` | Neural-network OCR for recipe photo scanning |
| | Nodemailer | `^6.9.13` | Multi-transport SMTP email dispatch system |
| | Multer | `^1.4.5-lts.1` | Multipart/form-data upload processor |
| | CSV Parser | `^3.0.0` | Streaming CSV parser for bulk data imports |
| **Database** | SQLite 3 | WAL Mode | Single-file transactional database with Foreign Keys enabled |
| | `sqlite3` | `^5.1.7` | Native asynchronous SQLite driver |
| | `sqlite` | `^5.1.1` | Promise-based SQLite wrapper |
| **Infrastructure** | Docker | Multi-stage | Optimized Alpine production container (`ghcr.io/jwagner77/family_app`) |
| | Orchestration | Compose / Portainer | Simple local or NAS deployment via Docker Compose or Portainer CE |
| | CI/CD | GitHub Actions | Automated multi-arch build and registry publishing |

---

## 🔌 REST API Documentation

Family Hub features a complete write-back REST API supporting CRUD operations for all modules. For exhaustive endpoint specifications, request schemas, cURL examples, and authentication guides, see the dedicated [API.md](./API.md) document.

### Quick API Example
```bash
# Fetch upcoming recipes
curl -H "X-API-Key: YOUR_API_KEY" "http://localhost:8282/api/recipes"

# Mark chore completed
curl -X POST -H "X-API-Key: YOUR_API_KEY" "http://localhost:8282/api/housekeeping/tasks/1/complete"
```

---

## 🚀 Quick Start with Docker

The easiest and recommended way to deploy Family Hub is using Docker Compose:

### 1. Create a `docker-compose.yml` file
```yaml
version: '3.8'

services:
  family_app:
    image: ghcr.io/jwagner77/family_app:latest
    container_name: family_hub
    restart: unless-stopped
    ports:
      - "8282:5000"
    environment:
      - PORT=5000
      - DATA_DIR=/data
      - JWT_SECRET=change_me_to_a_random_secure_key
    volumes:
      - family_data:/data

volumes:
  family_data:
```

### 2. Launch the Container
```bash
docker compose up -d
```

Access the application in your browser at:
👉 **`http://localhost:8282`**

### Default Administrator Login
- **Username**: `admin`
- **Password**: `admin123`

*(Note: Change your administrator password immediately after first login via Settings → User Management).*

---

## 💻 Local Development Setup

To run Family Hub in a development environment:

### Prerequisites
- Node.js `v20+`
- npm `v10+`

### 1. Clone the Repository
```bash
git clone https://github.com/jwagner77/family_app.git
cd family_app
```

### 2. Run Backend Server
```bash
cd backend
npm install
npm run dev
# Backend starts on http://localhost:5000
```

### 3. Run Frontend Dev Server
```bash
cd ../frontend
npm install
npm run dev
# Frontend starts on http://localhost:3000 (proxies /api to localhost:5000)
```

---

## ⚙️ Environment Configuration

| Variable | Default | Description |
| :--- | :--- | :--- |
| `PORT` | `5000` | HTTP port the Express server listens on inside the container |
| `DATA_DIR` | `./data` | File path for persistent SQLite database, uploads, and Word templates |
| `JWT_SECRET` | *(Random 32-byte string)* | Secret key used to sign and verify user session tokens |
| `GIT_COMMIT` | `main` | Optional build commit hash displayed in the About modal |
| `BUILD_NUMBER` | `prod` | Optional CI/CD build number displayed in the About modal |

---

## 📱 Mobile App & Kiosk Displays

- **Kiosk Displays**: Share custom dashboards using unique token links with auto-refresh and rotating views for kitchen tablets or wall displays.
- **Mobile Integration**: Register iOS (APNs) and Android (FCM) device tokens via `/api/users/push-token` to receive real-time push alerts from your home server.

---

## 🔒 Security, Authentication & Access Control

- **Role-Based Access Control (RBAC)**: Fine-grained permission matrix controlling access to Recipes, Meal Planner, Tasks, Settings, and System Administration.
- **OpenID Connect (OIDC) / SSO**: Seamless single sign-on integration with Microsoft Entra ID and Google SSO.
- **Tamper-Proof Webhooks**: Outgoing notifications include HMAC-SHA256 signatures in the `X-Signature` header.
- **Credential Masking**: Built-in show/hide password visibility toggles and API key masking.

---

## 👥 Authors & Acknowledgments

- **Lead Developer**: **Joshua Wagner**
- **AI Coding Assistant**: **Google Gemini**
- **Engineered With**: **Google Antigravity** agentic pair-programming workflows and tools

---

## 📄 License

This project is licensed under the [MIT License](./LICENSE).
