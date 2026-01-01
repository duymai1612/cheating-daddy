# Project Roadmap

## Phase 1: Stability & Core (Current v0.4.0)
- [x] **Core:** Electron 30 upgrade.
- [x] **AI:** Migration to Gemini 2.0 Flash Live (Audio) & Gemini 3 Flash (Vision).
- [x] **Stealth:** Basic process renaming and taskbar hiding.
- [x] **OS:** macOS System Audio support.
- [ ] **Fix:** Resolve occasional EPIPE errors in audio pipe.
- [ ] **Fix:** Improve window click-through reliability on Windows.

## Phase 2: Enhanced Vision & UX (v0.5.0)
- [ ] **Feature:** "Auto-Capture" mode that takes screenshots when voice activity is detected.
- [ ] **UX:** Draggable/Resizable ROI overlay directly on screen (currently coordinate-based or fixed).
- [ ] **AI:** Context-aware prompt injection (inject user resume/CV into context).
- [ ] **Performance:** Implement offscreen rendering for smoother UI during high load.

## Phase 3: Cross-Platform Parity (v0.6.0)
- [ ] **Linux:** Full support for Wayland audio capture (PipeWire integration).
- [ ] **Windows:** Native C++ module for lower-latency audio loopback.
- [ ] **Stealth:** Advanced driver-level hiding (optional, research needed).

## Phase 4: Enterprise & Cloud (v1.0.0)
- [ ] **Sync:** Cloud sync for profiles and history (E2E encrypted).
- [ ] **Mobile:** Companion app for remote control.
- [ ] **Analytics:** Dashboard for interview performance metrics (speech rate, filler words).

## Backlog / Ideas
- [ ] Integration with specific coding platforms (LeetCode/HackerRank parsers).
- [ ] "Panic Button" that instantly kills the app and wipes local traces.
- [ ] Voice cloning for output (Text-to-Speech) - *Low Priority*.
