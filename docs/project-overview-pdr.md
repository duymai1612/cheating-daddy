# Project Overview & PDR - Cheating Daddy v0.4.0

## 1. Executive Summary
**Cheating Daddy** is a real-time AI interview assistant designed to provide discreet, contextual help during video calls, interviews, and presentations. It leverages Google's Gemini 2.0 Flash Live API for real-time audio analysis and Gemini 3 Flash Preview for visual context via screen capture.

The application operates as an "always-on-top" transparent overlay, designed for stealth and minimal interference. It supports multiple profiles (Interview, Sales, Negotiation) and adapts to both audio and visual cues to assist users in high-stakes conversations.

## 2. Product Development Requirements (PDR)

### 2.1 Functional Requirements

#### Core Assistant Modes
1.  **Audio Mode (Primary):**
    *   Capture system audio (interview/meeting audio) via platform-specific methods (macOS `SystemAudioDump`, Windows Loopback).
    *   Stream audio to Gemini 2.0 Flash Live API.
    *   Receive real-time text transcriptions and AI-generated answers.
    *   Display responses on the overlay UI.
2.  **Text Mode (Visual):**
    *   Capture screenshots of specific screen regions (ROI).
    *   Support multi-image queue for context accumulation.
    *   Send images + prompt to Gemini 3 Flash Preview.
    *   Receive and display text responses.

#### User Interface
*   **Overlay Window:** Transparent, click-through capable, always-on-top window.
*   **Stealth Features:**
    *   Taskbar hiding.
    *   Randomized process names to evade detection tools.
    *   Content protection (prevent screen sharing from capturing the overlay).
    *   "Boss mode" / quick hide shortcuts.
*   **Controls:**
    *   Profile selector (Interview, Sales, etc.).
    *   Global hotkeys for capturing, toggling interaction, and hiding.
    *   Custom prompt input.

### 2.2 Non-Functional Requirements
*   **Performance:** Low latency (<2s) for audio transcription and response generation.
*   **Privacy:** No data persistence on server; minimal local logging.
*   **Compatibility:**
    *   **macOS:** Full support (including system audio).
    *   **Windows:** Full support.
    *   **Linux:** Experimental/Limited support.
*   **Security:** API Key storage in local storage (user-managed).

### 2.3 Technical Constraints
*   **Electron:** v30+ for latest security and performance features.
*   **Gemini API:** Strictly tied to Google's GenAI SDK versions compatible with v2/v3 models.
*   **Audio Capture:** Requires native modules or binaries (`SystemAudioDump` for macOS).

## 3. Success Metrics
*   **Latency:** Average time to first token < 1.5 seconds.
*   **Stability:** Session uptime > 99% without disconnection.
*   **Stealth:** 0 detections by standard proctoring software screen sharing (when content protection is active).

## 4. Dependencies & Stack
| Component | Technology | Version |
| :--- | :--- | :--- |
| **Runtime** | Electron | ^30.0.5 |
| **Frontend** | LitElement | ^2.7.4 |
| **AI SDK** | @google/genai | ^1.2.0 |
| **Build** | Electron Forge | ^7.4.0 |
| **Testing** | Vitest | ^1.6.0 |
