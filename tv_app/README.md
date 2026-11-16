# 📺 Family Hub TV Companion & Ambient Screensaver

An Android TV companion application built and optimized for **Android TV**, **Google TV**, and **Fire TV** devices. 

It transforms any television into an ambient family dashboard and interactive home command center, while solving TV text-input friction with an effortless **6-character Device Code pairing flow**.

---

## 🌟 Highlights

- **Zero-Friction Device Code Pairing**: No typing URLs, passwords, or tokens using a clumsy TV remote. The TV displays a 6-character code (e.g. `TV-8492`) and instructions. Open the Family App on your phone or PC, type the code, and choose the shared dashboard.
- **LAN Auto-Discovery**: When launched on the home network, the app sends a local UDP broadcast beacon (`port 41820`). The Family App server responds immediately, discovering the server address automatically.
- **Dual Functionality**:
  - **Manual App**: Launch anytime from the Android TV Leanback launcher / Apps row with full 10-foot UI styling and D-pad remote navigation.
  - **TV Screensaver (`DreamService`)**: Configurable as the official Android TV screensaver in *Settings → Device Preferences → Screen saver*. Automatically turns your TV into an ambient family dashboard when idle!
- **🔍 Manual Zoom Level Control**:
  - **On-Screen Top-Left HUD**: Dedicated `[ − ]` (Zoom Out), `[ 100% ]` (Current Zoom), `[ + ]` (Zoom In), and `[ Reset ]` buttons focusable via TV D-pad.
  - **TV Quick Menu**: Accessible from the Quick Actions HUD (`[BACK]` or `[MENU]`).
  - **Remote Key Shortcuts**: Use **Channel Up / Down** (`CH +/-`), **Page Up / Down**, or **Fast-Forward / Rewind** to adjust zoom directly from your remote.
  - **Persistence**: Remembers your preferred zoom setting across sessions and screensaver triggers (ranges from 50% up to 200%).
- **🎬 High-Performance Video Background Engine**:
  - **Hardware Compositing Layer**: Enforces dedicated GPU acceleration layer (`View.LAYER_TYPE_HARDWARE`) for buttery 60 FPS video playback without dropped frames.
  - **⚡ Smooth Video Mode (60FPS)**: Low-power TV chipsets (MediaTek, Amlogic, Realtek) often suffer severe frame drops when applying dynamic CSS `backdrop-filter: blur()` over live 1080p/4K video. Smooth Mode replaces expensive real-time per-frame blurs with high-contrast, semi-transparent dark tinted glass (`rgba(15, 23, 42, 0.88)`), sustaining a rock-solid 60 FPS.
  - **🛡️ Background Video Watchdog Loop**: Continuously checks video playback health every 4 seconds. If YouTube or HTML5 video stalls due to Wi-Fi jitter or buffer starvation, it automatically re-triggers playback without refreshing the page.
  - **Seamless Looping & 720p/1080p Stream Capping**: Prevents YouTube from auto-selecting 4K60 VP9 streams that choke TV hardware decoders, and loops seamlessly without black screen or title-bar flashes.
  - **Remote Audio Control**: Easily toggle video background sound (Mute / Unmute) from the Quick Menu.
- **OLED / Mini-LED Burn-In Protection**: Subtle 12-point orbital pixel shifting (translating 3–4 pixels every 60 seconds) prevents static UI elements from burning into sensitive TV panels.
- **TV Remote Control & Quick Actions HUD**:
  - `[BACK]` or `[MENU]`: Opens the TV Quick Actions HUD (Refresh, Pause/Resume Rotation, Ambient Mode, Zoom, Video Controls, Unpair).
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
│       │   ├── MainActivity.java             # Main 10-foot TV Activity, zoom controller & D-pad remote handler
│       │   ├── FamilyAppDreamService.java    # Android TV Screensaver (DreamService) with video & zoom support
│       │   ├── VideoBackgroundHelper.java     # Video performance optimizer, resolution capper & watchdog
│       │   ├── DiscoveryManager.java         # UDP broadcast LAN auto-discovery & subnet probing
│       │   ├── PairingManager.java           # Device code generation & status polling engine
│       │   ├── TvPreferences.java            # Local configuration, zoom levels & video preferences
│       │   ├── BurnInProtector.java          # OLED orbital pixel-shifting engine
│       │   └── OverlayMenuDialog.java        # TV Quick Actions HUD dialog (Zoom, Video, Rotation)
│       └── res/
│           ├── drawable/                     # Leanback banner (320x180), TV launcher icons
│           ├── layout/                       # activity_main.xml, service_dream.xml, dialog_quick_menu.xml
│           ├── values/                       # 10-foot colors, mini-buttons, strings, themes
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
tv_app/Family_Hub_TV.apk
(or tv_app/app/build/outputs/apk/debug/app-debug.apk)
```

### 2. Install on Android TV

#### Option A: Via ADB (Over Wi-Fi or USB)
1. On your Android TV, turn on the display and ensure Network Debugging is enabled.
2. Connect and install:
   ```bash
   adb connect 192.168.20.125:5555
   adb install -r "C:\Users\joshua\OneDrive - WagnerTech\Documents\Antigravity\Home_Apps\Family_App\tv_app\Family_Hub_TV.apk"
   ```

#### Option B: Via USB Flash Drive
1. Copy `Family_Hub_TV.apk` to a USB flash drive.
2. Insert the flash drive into your Android TV or Google TV box.
3. Open a file manager (such as *File Commander* or *CX File Explorer*) on the TV and install the APK.

---

## 🎮 TV Remote Control Reference

| Button | Action |
|---|---|
| **D-Pad Up / Down / Left / Right** | Navigate dashboard widgets, zoom HUD, & quick menu items |
| **D-Pad Center (OK / Select)** | Select item, activate button |
| **Back Button / Menu Button** | Open / Close TV Quick Actions HUD |
| **Channel Up (`CH+`) / Page Up / Fast-Forward** | **Zoom In (+10%)** |
| **Channel Down (`CH-`) / Page Down / Rewind** | **Zoom Out (-10%)** |
| **Play / Pause Button** | Instantly pause or resume dashboard carousel rotation |
| **Any Key (while Screensaver active)** | Wake up display and return to active TV screen |
