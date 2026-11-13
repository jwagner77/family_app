# 📺 Family Hub TV Companion & Ambient Screensaver

An Android TV companion application built and optimized for **Android TV**, **Google TV**, and **Fire TV** devices. 

It transforms any television into an ambient family dashboard and interactive home command center, while solving TV text-input friction with an effortless **6-character Device Code pairing flow**.

---

## 🌟 Highlights

- **Zero-Friction Device Code Pairing**: No typing URLs, passwords, or tokens using a clumsy TV remote. The TV displays a 6-character code (e.g. `TV-8492`) and a mobile QR code. Open the Family App on your phone or PC, type the code or scan the QR, and choose the shared dashboard.
- **LAN Auto-Discovery**: When launched on the home network, the app sends a local UDP broadcast beacon (`port 41820`). The Family App server responds immediately, discovering the server address automatically.
- **Dual Functionality**:
  - **Manual App**: Launch anytime from the Android TV Leanback launcher / Apps row with full 10-foot UI styling and D-pad remote navigation.
  - **TV Screensaver (`DreamService`)**: Configurable as the official Android TV screensaver in *Settings → Device Preferences → Screen saver*. Automatically turns your TV into an ambient family dashboard when idle!
- **OLED / Mini-LED Burn-In Protection**: Subtle 12-point orbital pixel shifting (translating 3–4 pixels every 60 seconds) prevents static UI elements from burning into sensitive TV panels.
- **TV Remote Control & Quick Actions HUD**:
  - `[BACK]` or `[MENU]`: Opens the TV Quick Actions HUD (Refresh, Pause/Resume Rotation, Ambient Mode, Unpair).
  - `[PLAY / PAUSE]`: Instant toggle for dashboard rotation.
  - `[DPAD_CENTER / ENTER]`: Interact with widgets or acknowledge alerts.
- **10-Foot UI Optimization**: Scaled typography, safe-area overscan padding, hidden scrollbars, high-contrast glassmorphic card design.

---

## 🏗️ Project Architecture

```
tv_app/
├── app/
│   ├── build.gradle                          # App build configuration (SDK 34, Java 17)
│   └── src/main/
│       ├── AndroidManifest.xml               # Leanback launcher & DreamService declarations
│       ├── java/com/jwagner/familytv/
│       │   ├── MainActivity.java             # Main 10-foot TV Activity & D-pad remote controller
│       │   ├── FamilyAppDreamService.java    # Android TV Screensaver (DreamService)
│       │   ├── DiscoveryManager.java         # UDP broadcast LAN auto-discovery & subnet probing
│       │   ├── PairingManager.java           # Device code generation & status polling engine
│       │   ├── TvPreferences.java            # Local configuration & credentials storage
│       │   ├── BurnInProtector.java          # OLED orbital pixel-shifting engine
│       │   └── OverlayMenuDialog.java        # TV Quick Actions HUD dialog
│       └── res/
│           ├── drawable/                     # Leanback banner (320x180), TV launcher icons
│           ├── layout/                       # activity_main.xml, service_dream.xml, quick menu
│           ├── values/                       # 10-foot colors, dimensions, strings, themes
│           └── xml/                          # dream_settings.xml, network_security_config.xml
├── build.gradle                              # Root Gradle script
├── settings.gradle
├── gradle.properties
└── gradlew / gradlew.bat
```

---

## 🚀 Building & Installing the APK

### Prerequisites
- JDK 17
- Android SDK (API 34)

### 1. Compile APK
Run the Gradle wrapper from the `tv_app` directory:

```bash
# On Windows (PowerShell / Command Prompt)
.\gradlew assembleDebug

# On macOS / Linux
./gradlew assembleDebug
```

The compiled APK will be generated at:
```
tv_app/app/build/outputs/apk/debug/app-debug.apk
```

### 2. Install on Android TV

#### Option A: Via ADB (Over Wi-Fi or USB)
1. On your Android TV, enable **Developer Options**:
   - Go to **Settings** → **Device Preferences** → **About**
   - Click **Build** 7 times until you see *"You are now a developer!"*
2. Enable **Network Debugging**:
   - Go to **Settings** → **Developer Options** → **Enable USB / Network Debugging**
   - Note the TV's IP address (e.g. `192.168.1.120`).
3. Connect and install from your computer:
   ```bash
   adb connect 192.168.1.120:5555
   adb install -r app/build/outputs/apk/debug/app-debug.apk
   ```

#### Option B: Via USB Flash Drive
1. Copy `app-debug.apk` to a USB flash drive.
2. Insert the flash drive into your Android TV or Google TV box.
3. Open a file manager (such as *File Commander* or *CX File Explorer*) on the TV and install the APK.

#### Option C: Via "Downloader" App
1. Install the free **Downloader by AFTVnews** app from the Google Play Store on your TV.
2. Host the APK on your local server or download link and enter the URL in the Downloader app.

---

## 🔗 How Pairing Works

1. Launch **Family Hub TV** on your Android TV.
2. The TV will automatically find your Family App server on your home network and display a **Device Code** (e.g. `TV-8492`).
3. On your phone or computer, open the Family App:
   - Navigate to **Settings** → **Android TV & Screensaver Displays**.
   - Click **Pair Android TV**.
   - Enter code `TV-8492` and select which dashboard or rotating carousel to display.
4. Click **Link Android TV**.
5. Within 2 seconds, the TV screen will acknowledge the connection and automatically load your shared family dashboard!

---

## 🌙 Setting as Android TV Screensaver

To display your Family Hub dashboard when the television is idle:

1. On your Android TV, open **Settings** (gear icon in the top right).
2. Navigate to **Device Preferences** → **Screen saver**.
3. Under **Screen saver**, select **Family Hub TV Screensaver**.
4. Configure **When to start** (e.g. after 5 or 10 minutes of inactivity).
5. Now, whenever the TV goes idle, your customized family calendar, chore board, weather, and announcements will softly illuminate the room!

---

## 🎮 TV Remote Control Reference

| Button | Action |
|---|---|
| **D-Pad Up / Down / Left / Right** | Navigate dashboard widgets & quick menu items |
| **D-Pad Center (OK / Select)** | Select item, dismiss alert |
| **Back Button** | Open / Close TV Quick Actions HUD |
| **Menu Button** | Open TV Quick Actions HUD |
| **Play / Pause Button** | Instantly pause or resume dashboard carousel rotation |
| **Any Key (while Screensaver active)** | Wake up display and return to active TV screen |
