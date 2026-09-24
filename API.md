# 🔌 Family Hub REST API Documentation

Comprehensive REST API documentation for the **Family Hub** platform. This API enables read, write, and synchronization operations for all features across the web application, companion displays, automated home servers, and native mobile apps (iOS & Android).

---

## 📑 Table of Contents

- [Authentication & Security](#-authentication--security)
- [HTTP Headers & Protocol](#-http-headers--protocol)
- [Response & Error Structure](#-response--error-structure)
- [API Endpoints Catalog](#-api-endpoints-catalog)
  - [1. Authentication, Sessions & Profile](#1-authentication-sessions--profile)
  - [2. Cookbooks & Recipes](#2-cookbooks--recipes)
  - [3. Meal Planning & Menus](#3-meal-planning--menus)
  - [4. Shopping Lists & Items](#4-shopping-lists--items)
  - [5. FocusFlow Tasks, Habits & Timers](#5-focusflow-tasks-habits--timers)
  - [6. Todo Lists & Tasks](#6-todo-lists--tasks)
  - [7. Housekeeping, Chores & Points](#7-housekeeping-chores--points)
  - [8. Calendar, Events & Microsoft 365 Sync](#8-calendar-events--microsoft-365-sync)
  - [9. Money, Bills, Subscriptions & Monarch Money](#9-money-bills-subscriptions--monarch-money)
  - [10. Kitchen, Pantry & Leftovers](#10-kitchen-pantry--leftovers)
  - [11. Library, Books & Reading Logs](#11-library-books--reading-logs)
  - [12. Contacts & Family Relationships](#12-contacts--family-relationships)
  - [13. Health, Medications & Pets](#13-health-medications--pets)
  - [14. Board Games & Play History](#14-board-games--play-history)
  - [15. Dashboards & Multi-Link Sharing](#15-dashboards--multi-link-sharing)
  - [16. Native Mobile App & Push Tokens](#16-native-mobile-app--push-tokens)
  - [17. System, Settings & Administration](#17-system-settings--administration)

---

## 🔐 Authentication & Security

All API endpoints (except public branding and the version endpoint) require authentication. You can authenticate HTTP requests using any of the following methods:

### 1. HTTP Request Header (Recommended for external integrations & mobile apps)
```http
X-API-Key: YOUR_CONFIGURED_API_KEY
```

### 2. JWT Bearer Token (Used by interactive web sessions)
```http
Authorization: Bearer <jwt_session_token>
```

### 3. Query Parameter (For webhooks or media feeds)
```http
GET /api/recipes?api_key=YOUR_CONFIGURED_API_KEY
```

---

## 📡 HTTP Headers & Protocol

### Client Request Headers (Inbound)

| Header | Description | Required | Example |
| :--- | :--- | :--- | :--- |
| `Authorization` | JWT bearer token for logged-in user sessions | Conditional | `Bearer eyJhbGciOi...` |
| `X-API-Key` | Administrative API key configured in System Settings | Conditional | `X-API-Key: sk_live_89f...` |
| `Content-Type` | MIME type for JSON payloads and multipart uploads | Yes for POST/PUT | `application/json` |
| `X-Signature` | HMAC-SHA256 signature attached to outgoing webhooks | Optional | `sha256=a1b2c3d4...` |

### Server Response Headers (Outbound)

| Header | Description | Value |
| :--- | :--- | :--- |
| `Access-Control-Allow-Origin` | CORS access control | `*` |
| `Access-Control-Allow-Headers` | Permitted request headers | `Origin, X-Requested-With, Content-Type, Accept, Authorization, X-API-Key` |
| `Access-Control-Allow-Methods` | Supported HTTP verbs | `GET, POST, PUT, DELETE, OPTIONS` |
| `Cache-Control` | Caching directive for dynamic API data | `no-cache, no-store, must-revalidate` |
| `X-Content-Type-Options` | MIME-sniffing protection | `nosniff` |
| `X-Frame-Options` | Frame clickjacking mitigation | `SAMEORIGIN` |

---

## 📦 Response & Error Structure

All standard API endpoints return JSON responses. Successful operations return status codes `200 OK` or `201 Created`.

### Standard Success Response
```json
{
  "message": "Resource created successfully",
  "id": 14
}
```

### Standard Error Response
```json
{
  "error": "Detailed description of the validation or authentication error"
}
```

---

## 🚀 API Endpoints Catalog

---

### 1. Authentication, Sessions & Profile

#### `POST /api/login`
Authenticate a local user account.
- **Body**:
  ```json
  {
    "username": "admin",
    "password": "yourpassword"
  }
  ```
- **Response**: Returns JWT token and user profile object.

#### `POST /api/logout`
Invalidate current session.

#### `GET /api/users/profile`
Retrieve active user profile, theme preferences, and sync mappings.
- **Example cURL**:
  ```bash
  curl -H "X-API-Key: YOUR_API_KEY" "http://localhost:8282/api/users/profile"
  ```

#### `PUT /api/users/profile`
Update user display name, timezone, theme, colors, and calendar mappings.
- **Body**:
  ```json
  {
    "display_name": "Joshua Wagner",
    "timezone": "America/New_York",
    "theme": "dark",
    "primary_color": "#2c3e50"
  }
  ```

#### `POST /api/users/password`
Change password for the authenticated user.
- **Body**:
  ```json
  {
    "current_password": "old_password",
    "new_password": "new_secure_password"
  }
  ```

#### `POST /api/auth/passthrough`
SSO passthrough integration for unified portals.
- **Headers**: `X-API-Key: <key>`
- **Body**:
  ```json
  {
    "username": "user@example.com",
    "display_name": "User Name",
    "role_name": "Family Member"
  }
  ```

---

### 2. Cookbooks & Recipes

#### `GET /api/recipes`
Retrieve all recipes with filters for search, tags, and favorites.
- **Query Params**: `search`, `tag`, `favorite=true`
- **Example cURL**:
  ```bash
  curl -H "X-API-Key: YOUR_API_KEY" "http://localhost:8282/api/recipes?search=chicken"
  ```

#### `GET /api/recipes/:id`
Retrieve full structured recipe with ingredients, instructions, notes, and tags.

#### `POST /api/recipes`
Create a new recipe.
- **Body**:
  ```json
  {
    "title": "Homemade Lasagna",
    "prep_time": "30 mins",
    "cook_time": "45 mins",
    "servings": 6,
    "tags": ["Italian", "Dinner", "Pasta"],
    "ingredients": [
      { "item": "Lasagna noodles", "amount": "12", "unit": "sheets" },
      { "item": "Ricotta Cheese", "amount": "16", "unit": "oz" }
    ],
    "instructions": [
      { "step": "Boil noodles until al dente." },
      { "step": "Layer noodles, ricotta, sauce, and mozzarella in baking dish." },
      { "step": "Bake at 375°F for 45 minutes." }
    ],
    "notes": [
      { "note": "Can be assembled 24 hours in advance and stored covered in refrigerator." }
    ]
  }
  ```

#### `PUT /api/recipes/:id`
Update an existing recipe.

#### `DELETE /api/recipes/:id`
Delete a recipe permanently.

#### `POST /api/recipes/:id/favorite`
Toggle recipe favorite status.

#### `GET /api/recipes/:id/export`
Export recipe directly to a formatted Microsoft Word (`.docx`) file.
- **Example cURL**:
  ```bash
  curl -H "X-API-Key: YOUR_API_KEY" -O -J "http://localhost:8282/api/recipes/1/export"
  ```

#### `POST /api/recipes/ocr`
Extract recipe text and ingredients from an uploaded photo.
- **Body**: `multipart/form-data` with `image` file field.

---

### 3. Meal Planning & Menus

#### `GET /api/menu`
Retrieve scheduled weekly meal plan (breakfast, lunch, dinner) across all days.

#### `POST /api/menu`
Schedule or update a meal on the weekly plan.
- **Body**:
  ```json
  {
    "day_of_week": "Monday",
    "meal_type": "dinner",
    "recipe_id": 4,
    "custom_meal": null,
    "servings": 4,
    "assigned_user_ids": [1, 2]
  }
  ```

#### `DELETE /api/menu/:day/:mealType`
Remove a scheduled meal.

#### `POST /api/menu/clear`
Clear the entire weekly meal schedule.

---

### 4. Shopping Lists & Items

#### `GET /api/shopping-lists`
List all accessible shopping lists.

#### `POST /api/shopping-lists`
Create a new shopping list.
- **Body**:
  ```json
  {
    "name": "Costco Weekly Run"
  }
  ```

#### `GET /api/shopping-lists/:id`
Retrieve shopping list items grouped by department/aisle.

#### `POST /api/shopping-lists/:id/items`
Add an item to a shopping list.
- **Body**:
  ```json
  {
    "name": "Organic Whole Milk",
    "quantity": 2,
    "unit": "gallons",
    "department": "Dairy"
  }
  ```

#### `PUT /api/shopping-lists/:id/items/:itemId`
Update item quantity, unit, department, or checked status.
- **Body**:
  ```json
  {
    "checked": true,
    "quantity": 3
  }
  ```

#### `DELETE /api/shopping-lists/:id/items/:itemId`
Delete an item from a shopping list.

#### `POST /api/shopping-lists/:id/bulk-add`
Bulk add ingredients from a recipe to the shopping list.
- **Body**:
  ```json
  {
    "recipe_id": 12,
    "servings_multiplier": 1.5
  }
  ```

#### `POST /api/shopping-lists/:id/clear-checked`
Remove all checked items from a shopping list.

---

### 5. FocusFlow Tasks, Habits & Timers

#### `GET /api/focusflow/tasks`
Retrieve tasks with priority, project, and status filters.

#### `POST /api/focusflow/tasks`
Create a focus task with micro-steps.
- **Body**:
  ```json
  {
    "title": "Clean Garage Shelving",
    "priority": "high",
    "estimated_time": 60,
    "project_id": 1,
    "status": "in_progress"
  }
  ```

#### `PUT /api/focusflow/tasks/:id`
Update focus task status, priority, due date, or estimated time.

#### `DELETE /api/focusflow/tasks/:id`
Delete a focus task.

#### `GET /api/focusflow/habits`
List habits with streak history and 30-day completion rates.

#### `POST /api/focusflow/habits`
Create a new habit.
- **Body**:
  ```json
  {
    "title": "Read 20 Pages",
    "target_frequency": "daily",
    "color": "#3b82f6",
    "icon": "book-open"
  }
  ```

#### `POST /api/focusflow/habits/:id/complete`
Mark a habit as completed for today.

#### `DELETE /api/focusflow/habits/:id/complete`
Unmark a habit for today.

#### `POST /api/focusflow/timelogs/start`
Start active focus timer on a task.
- **Body**:
  ```json
  {
    "task_id": 14
  }
  ```

#### `POST /api/focusflow/timelogs/stop`
Stop active focus timer.

---

### 6. Todo Lists & Tasks

#### `GET /api/todos/lists`
List all todo lists.

#### `POST /api/todos/lists`
Create a todo list.

#### `GET /api/todos/tasks`
Retrieve tasks with filters (`list_id`, `completed=false`).

#### `POST /api/todos/tasks`
Create a todo task.
- **Body**:
  ```json
  {
    "title": "Replace furnace filter",
    "due_date": "2026-10-01",
    "priority": "high",
    "list_id": 1
  }
  ```

#### `PUT /api/todos/tasks/:id`
Update todo task details or toggle completion.
- **Body**:
  ```json
  {
    "completed": 1
  }
  ```

#### `DELETE /api/todos/tasks/:id`
Delete a todo task.

---

### 7. Housekeeping, Chores & Points

#### `GET /api/housekeeping/tasks`
List household chores, assignees, point values, and recurrence schedules.

#### `POST /api/housekeeping/tasks`
Create a household chore.
- **Body**:
  ```json
  {
    "title": "Clean Refrigerator",
    "description": "Wipe shelves and dispose of expired items",
    "due_date": "2026-09-28",
    "reoccurrence": "monthly",
    "points": 50,
    "assigned_to_user_id": 1
  }
  ```

#### `PUT /api/housekeeping/tasks/:id`
Update a chore's properties or schedule.

#### `DELETE /api/housekeeping/tasks/:id`
Delete a chore.

#### `POST /api/housekeeping/tasks/:id/complete`
Mark chore completed, award points, and auto-advance due date.

#### `GET /api/housekeeping/rewards`
List redeemable household rewards and required points.

#### `POST /api/housekeeping/rewards/:id/redeem`
Redeem a chore reward using user points.

---

### 8. Calendar, Events & Microsoft 365 Sync

#### `GET /api/calendar/events`
Retrieve calendar events across date ranges with task and bill overlays.
- **Query Params**: `start=2026-09-01&end=2026-09-30`

#### `POST /api/calendar/events`
Create a calendar event.
- **Body**:
  ```json
  {
    "title": "Family Dentist Appointment",
    "start_time": "2026-09-28T14:00:00Z",
    "end_time": "2026-09-28T15:00:00Z",
    "location": "Downtown Dental Clinic",
    "notes": "Bring insurance cards"
  }
  ```

#### `PUT /api/calendar/events/:id`
Update a calendar event.

#### `DELETE /api/calendar/events/:id`
Delete a calendar event.

#### `POST /api/calendar/sync`
Trigger manual pull sync with Microsoft Entra ID / Microsoft 365 calendar.

#### `GET /api/users/profile/important-dates`
List important family milestones, birthdays, and anniversaries.

#### `POST /api/users/profile/important-dates`
Add an important milestone date.
- **Body**:
  ```json
  {
    "title": "Wedding Anniversary",
    "date": "2020-06-15",
    "type": "anniversary"
  }
  ```

#### `DELETE /api/users/profile/important-dates/:id`
Delete an important date.

---

### 9. Money, Bills, Subscriptions & Monarch Money

#### `GET /api/money/bills`
List upcoming and recurring bills.

#### `POST /api/money/bills`
Create a bill entry.
- **Body**:
  ```json
  {
    "title": "Electric Utility",
    "amount": 145.50,
    "due_date": "2026-10-05",
    "category": "Utilities",
    "billing_cycle": "monthly"
  }
  ```

#### `PUT /api/money/bills/:id`
Update a bill.

#### `PUT /api/money/bills/:id/pay`
Toggle bill paid/unpaid status.
- **Body**:
  ```json
  {
    "paid": true
  }
  ```

#### `DELETE /api/money/bills/:id`
Delete a bill.

#### `GET /api/money/subscriptions`
List recurring subscription services and renewal cadences.

#### `POST /api/money/subscriptions`
Add a subscription.
- **Body**:
  ```json
  {
    "name": "Netflix Premium",
    "amount": 22.99,
    "billing_cycle": "monthly",
    "next_billing_date": "2026-10-12"
  }
  ```

#### `GET /api/monarch/accounts`
Retrieve synchronized bank accounts and net worth balances from Monarch Money.

---

### 10. Kitchen, Pantry & Leftovers

#### `GET /api/inventory`
List pantry, fridge, freezer, and spice inventory items.

#### `POST /api/inventory`
Add an item to inventory.
- **Body**:
  ```json
  {
    "item_name": "Olive Oil",
    "location": "Pantry",
    "quantity": 2,
    "unit": "bottles",
    "expires_at": "2027-01-01"
  }
  ```

#### `PUT /api/inventory/:id`
Update inventory item quantity, location, or expiration date.

#### `DELETE /api/inventory/:id`
Delete an inventory item.

#### `GET /api/leftovers`
List active refrigerated leftovers.

#### `POST /api/leftovers`
Log cooked leftovers.
- **Body**:
  ```json
  {
    "name": "Leftover Beef Stew",
    "quantity": 3,
    "unit": "servings",
    "expiration_date": "2026-09-28"
  }
  ```

#### `POST /api/leftovers/:id/consume`
Mark a leftover portion as eaten.

#### `POST /api/leftovers/:id/freeze`
Move a leftover item to the freezer.

---

### 11. Library, Books & Reading Logs

#### `GET /api/books`
Retrieve the book catalog with search, author, and reading status filters.

#### `POST /api/books`
Add a book to the catalog.
- **Body**:
  ```json
  {
    "title": "The Hobbit",
    "author": "J.R.R. Tolkien",
    "isbn": "9780547928227",
    "total_pages": 310,
    "status": "completed",
    "rating": 5
  }
  ```

#### `PUT /api/books/:id`
Update book rating, current page, or reading status (`to-read`, `reading`, `completed`).

#### `DELETE /api/books/:id`
Delete a book from the catalog.

#### `GET /api/reading-lists`
Retrieve custom family reading lists.

---

### 12. Contacts & Family Relationships

#### `GET /api/contacts`
List family, friends, and emergency contacts.

#### `POST /api/contacts`
Create a contact.
- **Body**:
  ```json
  {
    "name": "Jane Smith",
    "email": "jane@example.com",
    "phone": "555-123-4567",
    "birthday": "1990-05-12",
    "address": "123 Main St, Anytown, USA"
  }
  ```

#### `PUT /api/contacts/:id`
Update contact details.

#### `DELETE /api/contacts/:id`
Delete a contact.

#### `GET /api/relationships`
List mapped family relationships (spouse, child, parent).

---

### 13. Health, Medications & Pets

#### `GET /api/health-logs`
Retrieve daily wellness records (steps, water, sleep, mood, weight, notes).

#### `POST /api/health-logs`
Log daily wellness metrics for a date.
- **Body**:
  ```json
  {
    "log_date": "2026-09-24",
    "steps": 8500,
    "water_ml": 2500,
    "sleep_hours": 7.5,
    "mood": "Great",
    "weight": 172.5,
    "notes": "Morning jog completed"
  }
  ```

#### `GET /api/medications`
List active medications and prescriptions.

#### `POST /api/medications`
Register a medication prescription.
- **Body**:
  ```json
  {
    "name": "Amoxicillin",
    "dosage": "500mg",
    "frequency": "Twice daily",
    "time_of_day": "Morning, Evening",
    "notes": "Take with food"
  }
  ```

#### `GET /api/appointments`
List doctor and dental appointments.

#### `POST /api/appointments`
Schedule an appointment.
- **Body**:
  ```json
  {
    "provider": "Dr. Smith",
    "specialty": "Dentist",
    "appointment_date": "2026-10-15",
    "appointment_time": "10:30 AM",
    "notes": "Routine cleaning"
  }
  ```

#### `GET /api/pets`
List pets with breed, birthdate, weight, and photos.

#### `POST /api/pets`
Add a pet profile.
- **Body**:
  ```json
  {
    "name": "Max",
    "type": "Dog",
    "breed": "Golden Retriever",
    "birthdate": "2022-04-10",
    "weight": 65.5
  }
  ```

#### `POST /api/pets/:petId/vet-visits`
Log a veterinary clinic visit.
- **Body**:
  ```json
  {
    "visit_date": "2026-09-20",
    "provider": "Oak Animal Hospital",
    "reason": "Annual Rabies Vaccine",
    "weight_logged": 66.0,
    "notes": "Healthy checkup"
  }
  ```

#### `POST /api/pets/medications/:medId/log`
Timestamp a pet medication administration.
- **Body**:
  ```json
  {
    "given_at": "2026-09-24T08:00:00Z"
  }
  ```

---

### 14. Board Games & Play History

#### `GET /api/games`
List board game collection with player counts, ages, and ratings.

#### `POST /api/games`
Add a game to the collection.
- **Body**:
  ```json
  {
    "title": "Catan",
    "game_type": "Board",
    "min_players": 3,
    "max_players": 4,
    "recommended_ages": "10+",
    "rating": 5
  }
  ```

#### `POST /api/games/history`
Log a played game night session with winner and Markdown notes.
- **Body**:
  ```json
  {
    "game_id": 1,
    "players_count": 4,
    "winner": "Joshua",
    "played_at": "2026-09-23T20:00:00Z",
    "notes_content": "# Match Recap\nJoshua won with longest road and 10 victory points."
  }
  ```

---

### 15. Dashboards & Multi-Link Sharing

#### `GET /api/dashboards`
List custom dashboards.

#### `POST /api/dashboards`
Create a custom dashboard layout.

#### `GET /api/shares`
List all active public/kiosk share tokens.

#### `POST /api/shares`
Generate a new public/kiosk share token with auto-rotation options.
- **Body**:
  ```json
  {
    "name": "Kitchen Wall Display",
    "target_type": "rotation",
    "rotation_interval": 30,
    "rotation_dashboards": ["dash-1", "dash-2"]
  }
  ```

#### `GET /api/dashboards/shared/:token`
Retrieve read-only dashboard payload for public kiosk displays (no auth header needed).

---

### 16. Native Mobile App & Push Tokens

#### `POST /api/users/push-token`
Register an APNs (iOS) or FCM (Android) push notification device token.
- **Body**:
  ```json
  {
    "token": "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]",
    "platform": "ios",
    "device_name": "iPhone 15 Pro"
  }
  ```

#### `DELETE /api/users/push-token`
Unregister a push notification device token upon sign-out.
- **Body**:
  ```json
  {
    "token": "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]"
  }
  ```

---

### 17. System, Settings & Administration

#### `GET /api/version`
Retrieve application release version, git commit hash, build number, and tech stack details.
- **Example cURL**:
  ```bash
  curl "http://localhost:8282/api/version"
  ```
- **Response**:
  ```json
  {
    "name": "Family Hub",
    "version": "1.0.0",
    "commit": "f7ae50f",
    "build": "prod",
    "repository": "https://github.com/jwagner77/family_app",
    "node_version": "v20.12.0",
    "platform": "linux",
    "components": {
      "frontend": {
        "framework": "React 18",
        "react_version": "^18.3.1",
        "bundler": "Vite",
        "vite_version": "^5.2.11",
        "icons": "Lucide React ^0.378.0"
      },
      "backend": {
        "runtime": "Node.js v20.12.0",
        "framework": "Express ^4.19.2",
        "database_driver": "sqlite3 ^5.1.7 / sqlite ^5.1.1"
      },
      "database": {
        "engine": "SQLite 3 (WAL Mode)"
      }
    }
  }
  ```

#### `GET /api/settings/public`
Retrieve public branding (logo, title, theme) without authentication.

#### `GET /api/settings`
Retrieve all system settings (Admin only).

#### `POST /api/settings`
Save system settings (Admin only).

#### `GET /api/users`
List all user accounts and roles (Admin only).

#### `GET /api/roles`
List all permission roles and RBAC matrices (Admin only).

#### `GET /api/notifications/active`
Retrieve unacknowledged system and household notifications.

---

## 📜 License

This API and platform are licensed under the MIT License.
