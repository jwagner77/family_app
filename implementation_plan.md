# Implementation Plan - UI & Design Consistency (Modals & FAB)

This plan outlines the re-architecting of app modals to be consistent slide-out drawers and the introduction of a context-aware Floating Action Button (FAB).

## User Review Required

> [!IMPORTANT]
> The slide-out modals are designed to take up **25% of the screen width** on desktop screens (using `25vw` or similar). On mobile devices or smaller screens, they will automatically scale up to **90vw - 100vw** to remain readable.

## Proposed Changes

### 🎨 Global Styling Sheets

#### [MODIFY] [`frontend/src/index.css`](file:///c:/Users/joshua/OneDrive%20-%20WagnerTech/Documents/Antigravity/Home_Apps/Family_App/frontend/src/index.css)
- Redefine `.modal-overlay` and `.modal-content` to enforce the right-hand slide-out drawer layout:
  - Width set to `25vw` (with a minimum desktop layout width of `320px` to maintain form layout usability, scaling to `95vw` on mobile).
  - Consistent padding inside `.modal-body` and `.modal-header`.
  - Add smooth CSS transition keyframes for sliding in from the right.

---

### 📱 Unified Floating Action Button

#### [NEW] [`frontend/src/components/FloatingActionButton.jsx`](file:///c:/Users/joshua/OneDrive%20-%20WagnerTech/Documents/Antigravity/Home_Apps/Family_App/frontend/src/components/FloatingActionButton.jsx)
- Build a global Floating Action Button component:
  - Sticky-positioned at the bottom right corner.
  - Inspects the active `currentView` (and active sub-tabs/sub-views) to show the correct tooltip/icon (e.g. `Plus` icon with tooltip "Add Recipe", "Add Book", "Add Contact", "Add Task").
  - Dispatches a custom window Event (`trigger-add-action`) carrying the current view identifier when clicked.

#### [MODIFY] [`frontend/src/App.jsx`](file:///c:/Users/joshua/OneDrive%20-%20WagnerTech/Documents/Antigravity/Home_Apps/Family_App/frontend/src/App.jsx)
- Import and render the `FloatingActionButton` at the root layout level, passing the current view/sub-view states.

---

### 📦 Component Modals Refactoring
We will update modal HTML containers across all views to use standard classes and listen for the global `trigger-add-action` event to toggle modal states. Any inline add/create buttons inside the pages will be removed (or hidden if read-only permissions apply).

#### [MODIFY] [`frontend/src/components/ContactsView.jsx`](file:///c:/Users/joshua/OneDrive%20-%20WagnerTech/Documents/Antigravity/Home_Apps/Family_App/frontend/src/components/ContactsView.jsx)
- Listen for `trigger-add-action` to open the Create Contact modal.
- Apply standardized modal classes.

#### [MODIFY] [`frontend/src/components/HousekeepingView.jsx`](file:///c:/Users/joshua/OneDrive%20-%20WagnerTech/Documents/Antigravity/Home_Apps/Family_App/frontend/src/components/HousekeepingView.jsx)
- Listen for `trigger-add-action` to open the Create Chore modal.
- Apply standardized modal classes.

#### [MODIFY] [`frontend/src/components/FocusFlowTasksView.jsx`](file:///c:/Users/joshua/OneDrive%20-%20WagnerTech/Documents/Antigravity/Home_Apps/Family_App/frontend/src/components/FocusFlowTasksView.jsx)
- Listen for `trigger-add-action` to open the Create Task modal.
- Apply standardized modal classes.

#### [MODIFY] [`frontend/src/components/FocusAreasView.jsx`](file:///c:/Users/joshua/OneDrive%20-%20WagnerTech/Documents/Antigravity/Home_Apps/Family_App/frontend/src/components/FocusAreasView.jsx)
- Listen for `trigger-add-action` to open the Create Focus Area modal.
- Apply standardized modal classes.

#### [MODIFY] [`frontend/src/components/LibraryView.jsx`](file:///c:/Users/joshua/OneDrive%20-%20WagnerTech/Documents/Antigravity/Home_Apps/Family_App/frontend/src/components/LibraryView.jsx)
- Listen for `trigger-add-action` to open the Add Book modal.
- Apply standardized modal classes.

#### [MODIFY] [`frontend/src/components/RecipesView.jsx`](file:///c:/Users/joshua/OneDrive%20-%20WagnerTech/Documents/Antigravity/Home_Apps/Family_App/frontend/src/components/RecipesView.jsx)
- Listen for `trigger-add-action` to open the Add Recipe dialog.
- Apply standardized modal classes.

*(Other view files such as Health, Pets, Bills, Subscriptions, Calendar, etc., will be updated iteratively in the same style.)*

---

## Verification Plan

### Automated Tests
- Run production bundle compile checks to verify that layout styling doesn't break Vite builds.

### Manual Verification
- Navigate through different sub-sections (Contacts, Housekeeping, Tasks, Recipes, Library) and verify that:
  - The Floating Action Button (FAB) updates its icon/label dynamically.
  - Clicking the FAB slides out the correct creation modal from the right-hand side.
  - Modals conform to the 25% width desktop standard (and scale responsively on mobile size viewports).
