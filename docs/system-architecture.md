# System Architecture

## 1. High-Level Diagram

```mermaid
graph TD
    User[User] -->|Hotkeys/Interaction| Overlay[Overlay UI (Renderer)]

    subgraph "Electron Main Process"
        Main[Main Controller]
        IPC[IPC Handler]
        Stealth[Stealth Module]

        subgraph "Audio Pipeline"
            AudioCap[Audio Capture (Native)]
            StreamMgr[Stream Manager]
        end

        subgraph "Visual Pipeline"
            ScreenCap[Screenshot Utility]
            ImgProcess[Image Processor]
        end
    end

    subgraph "External Services"
        GeminiLive[Gemini 2.0 Flash Live API]
        GeminiVis[Gemini 3 Flash Vision API]
    end

    Overlay <--> IPC <--> Main
    Main --> Stealth

    Main --> StreamMgr --> GeminiLive
    Main --> ScreenCap --> ImgProcess --> GeminiVis

    GeminiLive -->|Real-time Text| StreamMgr --> IPC --> Overlay
    GeminiVis -->|Text Response| ImgProcess --> IPC --> Overlay
```

## 2. Core Components

### 2.1 The Overlay (Renderer)
*   **Technology:** Chromium (via Electron) + LitElement.
*   **Responsibility:** Displays AI output, captures user intent via UI, manages local settings.
*   **Characteristics:** Transparent background, `pointer-events` toggling (click-through), CSS-based visual stealth (opacity control).

### 2.2 The Brain (Main Process)
*   **Technology:** Node.js (via Electron).
*   **Responsibility:**
    *   **Lifecycle:** App startup, cleanup, updates.
    *   **Bridge:** Connects UI commands to system-level operations.
    *   **Secrets:** Holds API keys (temporarily in memory during session).

### 2.3 Audio Capture Subsystem
*   **macOS:** Spawns a child process executing the `SystemAudioDump` binary. Reads raw PCM data from `stdout`.
*   **Windows:** Uses `win-audio-loopback` (or similar native binding) to capture WASAPI loopback.
*   **Processing:** Raw audio is buffered and resampled if necessary before being streamed via WebSocket to Gemini.

### 2.4 Vision Subsystem
*   **Trigger:** User defines a Region of Interest (ROI) or captures full screen.
*   **Process:** Electron's `desktopCapturer` or native screenshot utilities grab the pixel data.
*   **Optimization:** Images are resized/compressed to meet Gemini API token limits before transmission.

## 3. Security & Stealth Architecture

*   **Process Masquerading:** The main process renames itself on launch to appear as a system utility.
*   **Window Level:** `setContentProtection(true)` is set on the BrowserWindow to prevent other applications (like Zoom or Teams) from capturing the overlay in their screen shares.
*   **Memory Hygiene:** Chat history is stored in `IndexedDB` (client-side) and can be cleared. API keys are in `localStorage`.

## 4. Network Architecture
*   **Protocol:**
    *   Audio Mode: Secure WebSocket (WSS) for bidirectional streaming.
    *   Text Mode: HTTPS (REST) for request/response.
*   **Payloads:** JSON-structured data for text; Binary chunks for audio.
