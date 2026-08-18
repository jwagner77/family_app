# Family App - Development Road Map & To-Do List

This document tracks the features, functions, and updates completed in the consolidated Family App, alongside upcoming roadmap items for future implementation.

---

## ✅ Completed Features & Updates

### 📂 Navigation & Sidebar Restructuring
- [x] **Top-level Overview**: Moved original dashboard from a sub-menu to a top-level page with a dashboard icon.
- [x] **Household Operations**: Renamed the sidebar category **Kitchen** to **Household**.
- [x] **People & Pets category**: Added a centralized, collapsible category containing contacts, birthdays, health, and pets.
- [x] **Entertainment Category**: Created sidebar section **Entertainment** and moved the **Games** page below it.

### 🏠 Household & Housekeeping Operations
- [x] **Housekeeping Chores Board**: Developed the Housekeeping sub-section under **Household**.
- [x] **Assignee Management**: Chores can be assigned to specific users or self-grabbed by the logged-in user.
- [x] **Automatic Reoccurrence Calculations**: Daily, Weekly, Monthly, and Yearly chore due-dates automatically advance upon completion and reset to pending.
- [x] **Completions History Audit**: Audit log records who completed each chore and when.

### 👥 People, Contacts, & Celebrations
- [x] **Centralized Contacts Directory**: Built a persistent address book for names, emails, phones, relationship notes, and birthdays.
- [x] **Birthdays Countdown list**: Lists turning ages and counts down days until birthdays.
- [x] **Unified Celebration Scanner**: Integrated into the Overview card to display today's birthdays and event anniversaries automatically.

### 🩺 Health & Wellness Tracker
- [x] **Daily Activity Log**: Track steps, water, sleep, weight, and mood with weekly average trend graphs.
- [x] **Medications Locker**: Log active prescriptions, doses, frequencies, times, and timestamps of when they were last taken.
- [x] **Doctor's Appointments Scheduler**:
  - [x] Categorize into Upcoming and Past lists.
  - [x] **Smart Scheduling Reminder Alert**: Banners notify users to schedule checkups if there are no upcoming bookings and the last visit was >12 months ago.

### 🐾 Pets Health & Vet Directory
- [x] **Multi-Pet Profiles**: Manage profiles (pet image upload, breed, weight, birthdate, description) for multiple pets.
- [x] **Pet Age calculator**: Dynamically calculates age, displaying months for puppies/kittens and years for mature pets.
- [x] **Vet Checkups History**: Track provider, visit dates, clinic notes, and weights (which auto-updates the pet's profile weight).
- [x] **Pet Medications & Administrations**:
  - [x] Log prescriptions, schedules, and dosage instructions.
  - [x] **"Log Given" Action**: Check off doses to save precise administration times (e.g. `Last Given: Oct 15, 2026 @ 10:15 PM`).

### 📚 Local Library Vault (Fully Integrated)
- [x] **Local SQLite Cataloging**: Disconnected the app from external port `8890` library container. All cataloging logic is now local.
- [x] **Shared Catalog**: The Library vault and Reading List are visible and manageable by all household users.
- [x] **Private Reading Logs**: Reading logs remain private, showing entries exclusive to the logged-in user.
- [x] **Recent Library Widgets**: Dashboard widgets pull library summaries directly from the local database.

### ⚡ FocusFlow Task App (Fully Integrated)
- [x] **Consolidated DB Engines**: Ported projects, schedules, routines, logs, habits, and focus sessions to `home.db`. Removed the external `8891` container.
- [x] **Time Tracking Logs**: Record Pomodoro timers and ADHD ticks directly to local SQLite storage.
- [x] **Focus Areas Sharing**: 
  - [x] Added `is_shared` projects column so Focus Areas can be shared with the household.
  - [x] Supports user assignments on tasks inside shared projects.
  - [x] Assignee names display on tasks cards in the task board.
- [x] **Locked Housekeeping Focus Area**: Created a locked system project named **Housekeeping** that maps assigned household chores as virtual tasks in the user's tasks list.
- [x] **Housekeeping Work Hours**: Allows starting timers on housekeeping tasks by spawning a shadow task in SQLite, maintaining foreign-key schema integrity.
- [x] **Auto-Set Today**: Scans user-timezone due dates on tasks and automatically sets pending tasks due today to `'today'` (Today's Focus) status on lookup.

### 🎨 UI & Design Consistency Updates
- [x] **Slide-out Right Modals**: Re-architected modals across the entire app to slide out consistently from the right side of the screen, taking up a maximum of 25% width on desktop.
- [x] **Context-Aware Floating Action Button (FAB)**: Replaced inline page header "Add" buttons with a global context-aware floating "+" button that triggers the correct drawer based on the active sub-tab.

### 🔒 Authentication, Security & SSO
- [x] **SSO / OIDC Login Integration**: Configure single sign-on (Microsoft Azure AD/Entra ID) for authentication.
- [x] **Google SSO (OAuth 2.0)**: Add direct support for Google SSO login using a Gmail account.
- [x] **User Profiles & Personal Settings**: Managed profile picture, birthday, phone number, email, personal time zones, and color theme preferences.
- [x] **Important Dates Tracker**: Added a tracking grid for anniversaries and shared dates, with links to household users and external contacts.
- [x] **Address Book Directed Relationships**: Link contacts to system users, show directed family tree ties on contact cards, and manage relationships inside edit modals.

---

## 📋 Future Backlog & Ideas

### 📊 Dashboard & Overview Improvements
- [ ] **Today's Widget Fields Visibility Settings**: Add a settings cog button directly on the "What's Happening Today" card, letting users toggle specific data fields (meals, weather, calendar, tasks, celebrations) on/off.
- [ ] **Refreshed Overview Page Layout**: Rebuild the Overview dashboard page with a collection of refreshed summary widgets and metrics cards displaying real-time data from throughout the application.
- [ ] **Local Dashboard Integration**: Repoint all widgets on the customizable Drag-and-Drop Dashboard board to query local SQLite API controllers instead of legacy external app URLs.
- [ ] **Multi-Dashboard Layout Rotation**: 
  - [ ] Support designing and saving multiple separate dashboard grid layouts.
  - [ ] Add configurations to select a playlist of layouts that automatically rotate on a timer when accessing the dashboard via the public slideshow link.

### 🏠 Housekeeping Upgrades
- [ ] **Chore Streak Counter**: Track consecutive completions of recurring housekeeping duties.
- [ ] **Chore Difficulty Points**: Assign points to chores and display a weekly household scoreboard.
- [ ] **Next due date override**: Allow manually editing the computed next due date of a recurring chore during completion.

### 👥 People & Celebrations Additions
- [ ] **Calendar Event Sync**: Automatically synchronize contact birthdays and anniversaries into the main Calendar view.
- [ ] **Contact Cards Export**: Export contact records as standard vCard files (`.vcf`) compatible with both iOS (Apple) and Android devices for direct import into smartphone contacts applications.
- [x] **User Profiles**: Create individual profiles containing User's birthday, phone number, email, profile picture, and shared important dates (like Anniversaries) with option to link the date to another User or Contact.
- [x] **User Auto-population**: Allow household Users to auto-populate as Contacts in the Address Book.
- [x] **Contextual Relationships**: Allow configuring relative relationships (e.g., Spouse of User A, Mother of User B, and Family to Contact C) rather than a single global relationship classification.

### ⚡ Tasks & Focus Flow Upgrades
- [ ] **Focus Sessions Dashboard**: Graph weekly focus minutes, Pomodoro completions, and habit logs.
- [ ] **Focus Music Integration**: Build an audio widget for white noise, lofi, or custom audio URLs directly into Focus Mode.
- [ ] **Shared To-Do Lists Notifications**: Push notifications (Discord/Email) when a shared task is assigned to a user or completed.

### 🐾 Pets Directory Enhancements
- [ ] **Weight Trend Graphs**: Generate charts visualizing a pet's weight over time based on vet checkup data.
- [ ] **Pet Photo Gallery**: Support multiple photos for pets with a lightbox viewer.

### 🕹️ Family Games & Entertainment
- [ ] **MTG App Integration**: Connect via API to the MTG App to automatically create a "Magic: The Gathering" entry into the Family Games list.

### 💰 Household Finances (New Category Proposal)
- [ ] **Centralized Ledger**: Track household income and expense accounts.
- [ ] **Shared Budgeting**: Set monthly budgets per category (groceries, utilities, entertainment).
- [ ] **Subscription Analytics**: Circle graph showing monthly subscription costs.

### 🛠️ System Administration & Backups
- [ ] **Local DB Backup Scheduler**: Automatically backup `home.db` to a compressed file daily.
- [x] **SSO / OIDC Login Integration**: Configure optional single sign-on (Google/Microsoft) for authentication.
- [x] **Google SSO (Gmail)**: Add direct support for Google SSO login using a Gmail account.

### 📱 Mobile Companion Applications
- [ ] **Android Companion App**: Develop a native or hybrid (e.g. React Native/Flutter) Android companion app featuring push notifications for reminders, calendar updates, task assignments, and contact synchronization.

### 🚀 Publishing & Open-Sourcing
- [ ] **Branding & Assets**: Design a generic Logo and select a unique, non-proprietary App Name suitable for public distribution.
- [ ] **Repository Segregation**: 
  - [ ] Set up a separate, clean, open-source Git repository separate from the private development repository.
  - [ ] Sanitize configuration files, remove personal data, and strip the custom MTG App API integration from the codebase prior to public deployment.
- [x] **GitHub Issues Feedback Sync**: Build a Feature Request and Bug Report modal/module that automatically posts submissions directly to the public GitHub Repository's Issues tab for centralized project tracking and visibility.
