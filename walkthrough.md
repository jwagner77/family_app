# Walkthrough - Cookbook, Library, Dashboard, FocusFlow, Settings, Public Sharing, Calendar, Sidebar Restructure, Health, Pets, Local Library, Overview Today widget, Housekeeping Roster, Consolidated Local Tasks, Focus Areas, Shared To-Do Lists, & Locked Housekeeping Focus Area

We have successfully integrated and restructured the consolidated **Family App**. The application is built and running inside the Docker container on port `8383`.

---

## 1. Consolidated Architecture

```mermaid
graph TD
  subgraph Family App (Port 8383)
    DB[(home.db SQLite)]
    Server[Express Server]
    Web[Vite / React Frontend]
  end

  Cookbook[Cookbook App] -->|Migrated Code & Data| Family App
  Library[Library App] -->|Migrated Code & Data| Family App
  Dashboard[Dashboard App] -->|Migrated Code & Data| Family App
  Task[Task App / FocusFlow] -->|Consolidated Database, APIs, Focus Areas, & Sharing| Family App
```

### Locked Housekeeping Focus Area & Auto-Mirroring Chores (New!)
- **Housekeeping Default Focus Area**: Bootstrapped a locked system project named **Housekeeping** with color `#8b5cf6` during database initialization inside [`db.js`](file:///c:/Users/joshua/OneDrive%20-%20WagnerTech/Documents/Antigravity/Home_Apps/Family_App/backend/db.js).
- **System Locks**:
  - Throw errors inside `deleteProject` helper in [`db.js`](file:///c:/Users/joshua/OneDrive%20-%20WagnerTech/Documents/Antigravity/Home_Apps/Family_App/backend/db.js) if trying to delete the `Inbox` or `Housekeeping` projects.
  - Locked name modifications and deletions in both the modal forms and card action buttons inside [`FocusAreasView.jsx`](file:///c:/Users/joshua/OneDrive%20-%20WagnerTech/Documents/Antigravity/Home_Apps/Family_App/frontend/src/components/FocusAreasView.jsx) for `Inbox` and `Housekeeping` Focus Areas.
- **Auto-Mirroring & Chores Integration**:
  - Dynamically fetches user-assigned chores from `housekeeping_tasks` inside `getAllTasks` in [`db.js`](file:///c:/Users/joshua/OneDrive%20-%20WagnerTech/Documents/Antigravity/Home_Apps/Family_App/backend/db.js), presenting them as virtual tasks inside the locked **Housekeeping** Focus Area on their FocusFlow Tasks page.
  - Implemented routes in [`server.js`](file:///c:/Users/joshua/OneDrive%20-%20WagnerTech/Documents/Antigravity/Home_Apps/Family_App/backend/server.js) to intercept chores completion, updates, and deletes (`/api/focusflow/tasks/:id/complete`, `/api/focusflow/tasks/:id` PUT/DELETE) that start with `'housekeeping-'`, translating virtual task actions directly back to the database `housekeeping_tasks` tables.
- **Procrastination & Effort Time Tracking**:
  - Intercepted `/api/focusflow/timelogs/start` requests in [`server.js`](file:///c:/Users/joshua/OneDrive%20-%20WagnerTech/Documents/Antigravity/Home_Apps/Family_App/backend/server.js) for virtual housekeeping tasks. If a user starts tracking time on an assigned housekeeping chore, a shadow task row is automatically created in the `tasks` table under the Housekeeping project ID. This allows time tracking to conform to the database foreign-key constraints while adding work hours correctly.

### Consolidated Local Tasks & Shared Focus Areas
- **Shared Focus Areas Schema & Migration**: Added an `is_shared INTEGER DEFAULT 0` column to the `projects` table (Focus Areas) in [`db.js`](file:///c:/Users/joshua/OneDrive%20-%20WagnerTech/Documents/Antigravity/Home_Apps/Family_App/backend/db.js).
- **Project Helpers**: Updated `createProject` and `updateProject` to accept, persist, and update the `is_shared` column state.
- **Shared To-Do List Visibility**:
  - Rewrote the tasks fetch query (`getAllTasks`) inside [`db.js`](file:///c:/Users/joshua/OneDrive%20-%20WagnerTech/Documents/Antigravity/Home_Apps/Family_App/backend/db.js) to retrieve any tasks belonging to the current user OR tasks in projects marked `is_shared = 1` (Shared Focus Areas).
  - Joined the `users` table to retrieve `assignee_username` and `assignee_display_name` fields.
- **Permissions Checking**: Introduced a `canAccessTask` helper inside [`server.js`](file:///c:/Users/joshua/OneDrive%20-%20WagnerTech/Documents/Antigravity/Home_Apps/Family_App/backend/server.js) that grants read/write permissions for a task if it belongs to the logged-in user OR if it is located inside a shared Focus Area. Modified task GET, PUT, and DELETE routes to leverage this helper.
- **Task Completing**: Updated `completeTask` to allow completion checks by any household user if the task is inside a shared project.
- **Frontend Sharing Controls**:
  - In [`FocusAreasView.jsx`](file:///c:/Users/joshua/OneDrive%20-%20WagnerTech/Documents/Antigravity/Home_Apps/Family_App/frontend/src/components/FocusAreasView.jsx): Added a **Share with Household** checkbox inside the creation and edit modals. Displays a **👥 Shared** badge on shared Focus Area cards.
  - In [`FocusFlowTasksView.jsx`](file:///c:/Users/joshua/OneDrive%20-%20WagnerTech/Documents/Antigravity/Home_Apps/Family_App/frontend/src/components/FocusFlowTasksView.jsx): Displays a **👥 Shared List** badge on project section headers. Shows a **👤 Assigned: [Name]** badge on task cards. When editing/creating tasks in a shared Focus Area, an **Assignee** selection dropdown dynamically appears, listing all household users.

### Restructured Navigation & Sidebar
- **Overview (Top-Level)**: Removed the "Home" section and turned the original Home dashboard into a top-level page titled **Overview** (using the `LayoutDashboard` icon).
- **Household Operations Category**:
  - Renamed the collapsible category header in the sidebar from **Kitchen** to **Household**.
  - Added a brand new sub-section under it titled **Housekeeping**.
- **People & Pets Section**:
  - Renamed the collapsible category in the sidebar to **People & Pets**.
  - Added subsections for **Contacts**, **Birthdays**, **Health**, and **Pets**.
  - Built a contact manager ([`ContactsView.jsx`](file:///c:/Users/joshua/OneDrive%20-%20WagnerTech/Documents/Antigravity/Home_Apps/Family_App/frontend/src/components/ContactsView.jsx)) with database persistence to create, edit, list, and delete household contacts (names, phone, emails, relationship status, birthdays, and notes).
  - Built a birthdays countdown manager ([`BirthdaysView.jsx`](file:///c:/Users/joshua/OneDrive%20-%20WagnerTech/Documents/Antigravity/Home_Apps/Family_App/frontend/src/components/BirthdaysView.jsx)) that lists and categorizes contacts' birthdays, showing their turning age, custom milestones, and days countdown.

### Housekeeping Task Board
- **Table Chore Rostering**: Built a dedicated table for active housekeeping chores (`housekeeping_tasks`) and completions history auditing (`housekeeping_logs`).
- **Core roster features**:
  - **Create & Edit Chores**: Log task title, description, original due date, reoccurrence cycle, and assignee.
  - **Grabbing Chores**: Users can click a "Grab Chores" button on unassigned maintenance tasks to assign responsibilities to themselves instantly.
  - **Assign Chores**: Allows selecting a specific household user from the dropdown to assign task workloads.
  - **Completion Auditing & Date Calculation**: Clicking "Complete" logs chore completion metrics (storing who checked it off and when).
    - If a chore has a **reoccurrence cycle** (Daily, Weekly, Monthly, Yearly), marking it complete automatically computes the **next due date** (e.g. shifts due date +7 days for weekly chores) and resets its status to **Pending** so it appears on the active roster again.
    - If set to **One-off**, it is marked completed permanently.

### Overview "What's Happening Today" Widget Card (Merged Welcome Card!)
- **Merged Header & Dashboard Widget**: Positioned at the very top of the Overview dashboard page, it combines the welcome greeting banner ("Good morning/afternoon/evening, [User]!") and household summary subtitle with today's metrics, removing the old tab-redirect widget badges:
  - **Today's Meals**: Displays breakfast, lunch, and dinner plans from your Cookbook Menu Planner for today.
  - **Weather Forecast**: Fetches daily forecast based on current settings via a new local `/api/weather` API endpoint (showing current temp, max/min temp, and weather condition emoji with text description).
  - **Schedule**: Displays any calendar events occurring today.
  - **Tasks**: Integrates with the local Tasks database to list any active tasks due today.
  - **Celebrations**: Scans contacts lists to display matching birthdays (including how old they are turning) and scans today's events for anniversaries.
  - **Bills & Subscriptions**: Displays any bills or subscriptions renewal cycles scheduled for today.
- **Cleared Lower Content**: Cleared the remainder of the Overview dashboard layout below the "What's Happening Today" header card to prepare it for a fresh layout.

### Health Additions
- **Daily Tracker**: Log daily steps, sleep, water, weight, and mood with weekly average analytics.
- **Medications Manager**: Track active prescriptions, supplements, dosage, frequency, and time of day.
- **Doctor's Appointments Tracker**:
  - Track scheduled wellness checkups, separating them into upcoming and past lists.
  - **Appointment Reminder Alert Banner**: If there are **no upcoming appointments** and the last checkup was **over 12 months ago** (or none exist), a high-visibility warning banner prompts the user to schedule a wellness exam.

### Pets Directory
- **Multi-Pet Management**: Register and edit multiple pets (name, type, breed, birthdate, weight, notes) with support for **uploading pet pictures** via `multer`.
- **Health & Weight Stats**: Computes and displays pet age dynamically (showing months for puppies/kittens and years for older pets) and tracks latest weights.
- **Vet Visits History**: Log veterinary clinical checkups (date, provider, reason, weight logged, notes). Logging a weight during a vet visit automatically updates the pet's current profile weight.
- **Pet Medication Schedule**:
  - Track active prescriptions, instructions, dosage, and frequency.
  - **Dose Admin Logging**: Click a "Log Given" button to save an administration timestamp. Displays precisely when medications were "Last Given" (e.g. `Oct 15, 2026 @ 10:15 PM`).

### Local Library Catalog
- **Fully Local Integration**: Unified card transparency, border layout, and blur properties throughout the entire application. Overview drag-and-drop cards, custom builder widgets, sliding modal panels, and the top Welcome banner card now cohesively scale with theme variable color mixes synced dynamically to the Navbar Transparency Control Slider (`--navbar-opacity`) and the user's active theme accent color (`var(--primary-light)`) in both light and dark modes. Moved the Edit Layout button to the top welcome header next to notifications, reducing parent spacing gap layout padding for a tighter, cleaner presentation. Configured premium right-justified toggle switches inside the profile page for theme card options, manual text overrides (White/Black), and dynamic text contrast auto-solvers. Added reactive dynamic text color update triggers listening directly to navbar theme mode toggle states. Redefined card-specific variables inside theme text overrides to fix nested container text inheritances.
- **Cleaned Settings**: Removed the external Library App Integration card from the Settings/Integrations tab.
- **Dashboard Widgets Integration**: Rewired the `library_recent`, `library_summary`, and `library_reading_list` widgets inside `getWidgetData` to query local helper functions instead of calling external integration APIs, supporting user stats correctly.

### Calendar Views
- **FocusFlow Task API integration**: Calendar fetches tasks from the task proxy route (`/api/focusflow/tasks`).
- **Bills & Subscriptions integration**: Renders monthly bills and subscriptions directly on their due dates.
- **Universal Settings & Custom Colors**:
  - Configures `calendar_event_color`, `calendar_task_color`, `calendar_bill_color`, and `calendar_sub_color` settings keys.
  - Microsoft Sync settings are universally rendered but gracefully disabled/grayed out for non-SSO accounts.

### Games Section & Play Session Logger
- **Current Game Session Info Card**: Added a dedicated card to manage active plays. Selecting a game from the library loads it directly, auto-selecting player capacities and the current logged-in session user.
- **Dynamic Player Rostering**: Choose active players from household accounts, stored contacts, or input custom guest player names. Checkbox controls beside each player designate game winners.
- **Notion-Style Markdown Editor**: Built a scorecard and play logger text area supporting quick templates:
  - `/score` inserts active player grids with table points.
  - `/table` inserts standard Markdown tables.
  - `/notes` and `/round` dump bulleted notes structure.
  - `/clear` clears notes immediately.
  - **Live Preview Mode Toggle**: Added a visual `Preview / Edit` toggle button directly above the scorecard. Enables viewing formatted tables, headers, and lists in real-time as notes are compiled.
- **Played History Dashboard Storage**: Clicking **Game Over** saves the game logs and packages markdown notes as a physical file on the server.
- **Markdown Notes Viewer**: Game entries in the Played History log that possess files display an interactive document viewer button, parsing saved Markdown logs into fully formatted preview elements (headers, bolding, lists, and tables) directly in a dialog overlay, completely hiding raw plaintext notes for a clean display.

---

## 2. Database Migration Results

Both historical cookbook data, library reading logs, and dashboard widgets have been successfully ported over to the active `home.db` container database file.

---

## 3. Verification Details

- **Docker Build & Launch**: The Docker container compiles Vite assets and builds the production server cleanly.
- **Service Verification**: Express server logs confirm successful database connection initialization:
  ```text
  Server started on http://localhost:8282
  Database initialized.
  Default Word templates initialized successfully.
  ```
- **Port Mapping**: The service remains accessible on host port **`8383`** (internally mapping to `8282`).

---

## 4. Standardized Modal Drawers & Floating Action Button (FAB)

- **Consistent Styling Rules**: Configured global `.modal-overlay` and `.modal-content` inside [`index.css`](file:///c:/Users/joshua/OneDrive%20-%20WagnerTech/Documents/Antigravity/Home_Apps/Family_App/frontend/src/index.css) to slide out modals from the right side of the screen, taking up exactly `25vw` width on desktop/large screens, with responsive media query fallback behavior for smaller devices.
- **Context-Aware Floating Action Button**: Designed and mounted [`FloatingActionButton.jsx`](file:///c:/Users/joshua/OneDrive%20-%20WagnerTech/Documents/Antigravity/Home_Apps/Family_App/frontend/src/components/FloatingActionButton.jsx) globally at the app root layout level. It tracks the current active tab and dynamically updates its icon tooltip and button click action:
  - **Dynamic Sub-tab Visibility & Labels**: Equipped the FAB to support window-level custom actions via the `update-fab-action` custom event.
  - **Sub-section Awareness**: In views like **Health** and **Pets**, changing sub-tabs dynamically switches the FAB's action label (e.g., "Add Medication" vs "Schedule Appointment" vs "Log Vet Visit") or hides the FAB entirely (e.g., in the Daily Health Tracker view).
- **Consolidated View Refactoring**: Replaced all inline header "Add" buttons with the global FAB event listener and standard right-drawer markup across all view modules in the application:
  - [`ContactsView.jsx`](file:///c:/Users/joshua/OneDrive%20-%20WagnerTech/Documents/Antigravity/Home_Apps/Family_App/frontend/src/components/ContactsView.jsx)
  - [`HousekeepingView.jsx`](file:///c:/Users/joshua/OneDrive%20-%20WagnerTech/Documents/Antigravity/Home_Apps/Family_App/frontend/src/components/HousekeepingView.jsx)
  - [`FocusFlowTasksView.jsx`](file:///c:/Users/joshua/OneDrive%20-%20WagnerTech/Documents/Antigravity/Home_Apps/Family_App/frontend/src/components/FocusFlowTasksView.jsx)
  - [`FocusAreasView.jsx`](file:///c:/Users/joshua/OneDrive%20-%20WagnerTech/Documents/Antigravity/Home_Apps/Family_App/frontend/src/components/FocusAreasView.jsx)
  - [`LibraryView.jsx`](file:///c:/Users/joshua/OneDrive%20-%20WagnerTech/Documents/Antigravity/Home_Apps/Family_App/frontend/src/components/LibraryView.jsx)
  - [`RecipesView.jsx`](file:///c:/Users/joshua/OneDrive%20-%20WagnerTech/Documents/Antigravity/Home_Apps/Family_App/frontend/src/components/RecipesView.jsx)
  - [`BillsView.jsx`](file:///c:/Users/joshua/OneDrive%20-%20WagnerTech/Documents/Antigravity/Home_Apps/Family_App/frontend/src/components/BillsView.jsx)
  - [`SubscriptionsView.jsx`](file:///c:/Users/joshua/OneDrive%20-%20WagnerTech/Documents/Antigravity/Home_Apps/Family_App/frontend/src/components/SubscriptionsView.jsx)
  - [`HealthView.jsx`](file:///c:/Users/joshua/OneDrive%20-%20WagnerTech/Documents/Antigravity/Home_Apps/Family_App/frontend/src/components/HealthView.jsx)
  - [`PetsView.jsx`](file:///c:/Users/joshua/OneDrive%20-%20WagnerTech/Documents/Antigravity/Home_Apps/Family_App/frontend/src/components/PetsView.jsx)
  - [`HabitsView.jsx`](file:///c:/Users/joshua/OneDrive%20-%20WagnerTech/Documents/Antigravity/Home_Apps/Family_App/frontend/src/components/HabitsView.jsx)
  - [`RoutinesView.jsx`](file:///c:/Users/joshua/OneDrive%20-%20WagnerTech/Documents/Antigravity/Home_Apps/Family_App/frontend/src/components/RoutinesView.jsx)
  - [`CalendarView.jsx`](file:///c:/Users/joshua/OneDrive%20-%20WagnerTech/Documents/Antigravity/Home_Apps/Family_App/frontend/src/components/CalendarView.jsx) (binds event creation to today's dateSwedish locale `YYYY-MM-DD` on FAB press)
  - [`FeatureRequestsView.jsx`](file:///c:/Users/joshua/OneDrive%20-%20WagnerTech/Documents/Antigravity/Home_Apps/Family_App/frontend/src/components%20/FeatureRequestsView.jsx) (restructured form as a right-drawer modal overlay and hooked to FAB)
  - [`BugReportsView.jsx`](file:///c:/Users/joshua/OneDrive%20-%20WagnerTech/Documents/Antigravity/Home_Apps/Family_App/frontend/src/components%20/BugReportsView.jsx) (restructured form as a right-drawer modal overlay and hooked to FAB)

---

## 5. Sidebar Restructure, User Profile, SSO & Address Book Relationships (New!)

We have successfully completed the migration of user profile fields, layout updates, and relationships mapping:
- **Sidebar Footer & User Popout**:
  - Replaced the Logout button at the footer of the sidebar with the current user's profile avatar (with initials fallback) and name trigger.
  - Clicking the trigger displays a beautiful, hovering popout menu containing **User Profile**, **Settings**, **Feature Requests**, **Bug Reports**, and **Logout**.
  - Removed **Settings**, **Feature Requests**, and **Bug Reports** from the sidebar links to streamline navigation.
- **User Profile Page**:
  - Created [`UserProfileView.jsx`](file:///c:/Users/joshua/OneDrive%20-%20WagnerTech/Documents/Antigravity/Home_Apps/Family_App/frontend/src/components/UserProfileView.jsx) rendering profile fields (preferred name, birthday, phone number, email, profile picture URL) and a shared important dates tracker (e.g. Wedding Anniversary).
  - Moved personal user preferences (theme mode, custom accent color, timezone settings, and password resetting) from the Settings menu to the User Profile page.
  - Linked profile updates to immediately apply changes (e.g., custom accent color dynamically updates `--primary` variable).
- **Google SSO**:
  - Added configuration controls inside Settings (Single Sign-On tab) for Google Client ID, Secret, Auto Provision, and Default Role.
  - Added OIDC Google auth status check to render a "Sign in with Google" button on the login screen alongside the existing Microsoft login button.
- **Address Book Directed Relationships**:
  - Added a **👥 Household User** badge on address book contact cards if they are linked to a registered household user.
  - Configured contact cards to query `/api/relationships` and display directed relationships (e.g. `Parent of [Name]` or `[Name]'s Sibling`).
  - Added a relationship manager section in the Edit Contact drawer/modal to create relationships (selecting role and target contact/user).

