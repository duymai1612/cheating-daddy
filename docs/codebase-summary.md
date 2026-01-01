# Codebase Summary

## 1. Directory Structure

```
/
├── src/
│   ├── index.js                # Main Electron process entry point
│   ├── components/             # UI Components (LitElement)
│   │   ├── app/                # App shell components
│   │   └── views/              # Main view containers (Assistant, Settings, etc.)
│   ├── utils/                  # Core utilities
│   │   ├── gemini.js           # Audio Mode logic (Gemini 2.0 Live API)
│   │   ├── gemini-text-mode.js # Text Mode logic (Gemini 3 Vision)
│   │   ├── stealthFeatures.js  # Anti-analysis & process hiding
│   │   ├── roi-region-selector.js # Screenshot region management
│   │   └── window.js           # Window management helper
│   └── assets/                 # Static assets & binaries (SystemAudioDump)
├── docs/                       # Project documentation
├── forge.config.js             # Electron Forge configuration
└── package.json                # Dependencies & scripts
```

## 2. Key Modules

### 2.1 Main Process (`src/index.js`)
*   Orchestrates the application lifecycle.
*   Initializes `BrowserWindow` with specific flags for transparency and overlay behavior.
*   Manages IPC handlers for communication between Renderer and Main processes.
*   Handles global shortcuts and system events.

### 2.2 AI Integration (`src/utils/`)
*   **`gemini.js`:** Manages the WebSocket connection to Google's Gemini 2.0 Flash Live API. Handles audio streaming, speaker diarization formatting, and session reconnection logic.
*   **`gemini-text-mode.js`:** Handles image encoding and REST API calls to Gemini 3 Flash Preview for visual analysis.

### 2.3 Stealth System
*   **`stealthFeatures.js`:** Implements anti-debugging and anti-monitoring techniques.
*   **`processRandomizer.js`:** Renames the Electron process to generic system names (e.g., "Service Host", "System Monitor") on startup to blend in with task managers.

### 2.4 User Interface (`src/components/`)
*   Built with **LitElement** for lightweight, web-component-based UI.
*   **`CheatingDaddyApp.js`:** The root component managing navigation and global state.
*   **`AssistantView.js`:** The primary HUD displaying real-time AI responses.

## 3. Data Flow

1.  **Audio Mode:**
    *   System Audio -> `SystemAudioDump` (macOS) / Loopback (Win) -> `stdin` stream -> `gemini.js` -> Gemini API -> WebSocket Message -> IPC -> Renderer -> `AssistantView`

2.  **Text Mode:**
    *   User Hotkey -> `roi-region-selector.js` -> Screenshot -> `gemini-text-mode.js` -> Gemini API -> JSON Response -> IPC -> Renderer -> `AssistantView`

## 4. Configuration
*   User settings (API Key, Profile, Shortcuts) are persisted in `localStorage` within the Renderer process.
*   Application config (window state) is managed via `electron-store` or simple file I/O in `config.js`.
