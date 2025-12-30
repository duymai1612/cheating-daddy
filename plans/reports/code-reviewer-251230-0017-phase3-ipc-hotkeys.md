# Code Review: Phase 3 IPC Handlers & Hotkeys

**Date:** 2025-12-30
**Reviewer:** code-reviewer
**Scope:** Text mode IPC handlers, global shortcuts, renderer functions

## Scope

- Files reviewed: 5 files
- Focus: IPC handlers, hotkeys, security, performance
- Changes: 8 IPC handlers, 4 hotkeys, 6 renderer functions

## Critical Issues

### 1. [CRITICAL] Security: contextIsolation=false

**Location:** `src/utils/window.js:44`, `src/utils/roi-region-selector.js:228-230`

```javascript
webPreferences: {
    nodeIntegration: true,
    contextIsolation: false, // TODO: change to true
}
```

**Impact:** Exposes Node.js APIs to renderer, enabling potential RCE if any XSS occurs. Comment acknowledges debt but unfixed.

### 2. [HIGH] Security: executeJavaScript with dynamic content

**Location:** `src/index.js:196-204`, `src/utils/window.js:359-361`

```javascript
const apiKey = await mainWindow.webContents.executeJavaScript(
    `localStorage.getItem('apiKey')`
);
```

**Impact:** While current usage is safe (static strings), pattern enables code injection if any user input reaches these calls.

### 3. [HIGH] Memory: Image queue unbounded memory growth

**Location:** `src/utils/image-queue-manager.js`

```javascript
const MAX_QUEUE_SIZE = 20;
// Each image ~100KB-2MB base64 = potential 20-40MB in memory
```

**Impact:** 20 high-res screenshots could consume 40MB+ RAM. No size-based limits, only count-based.

## High Priority Findings

### 4. [HIGH] DRY Violation: Repeated mode check pattern

**Location:** `src/utils/window.js:357-446`

```javascript
// Same pattern repeated 4 times:
const mode = await mainWindow.webContents.executeJavaScript(
    `localStorage.getItem('assistantMode') || 'text'`
);
if (mode !== 'text') return;
```

**Recommendation:** Extract to helper function:
```javascript
async function isTextMode(mainWindow) {
    const mode = await mainWindow.webContents.executeJavaScript(
        `localStorage.getItem('assistantMode') || 'text'`
    );
    return mode === 'text';
}
```

### 5. [HIGH] Error handling: Silent failures in shortcuts

**Location:** `src/utils/window.js:357-446`

```javascript
globalShortcut.register(keybinds.textModeCapture, async () => {
    try {
        // ... code
    } catch (error) {
        console.error('Text mode capture error:', error);
        // No user feedback
    }
});
```

**Impact:** Shortcuts fail silently - user has no idea why action didn't work.

### 6. [HIGH] Race condition: Concurrent ROI selections

**Location:** `src/utils/roi-region-selector.js:207-304`

```javascript
function showRegionSelector(mainWindow) {
    return new Promise((resolve) => {
        // No guard against multiple overlays
        const overlay = new BrowserWindow({...});
```

**Impact:** Rapid Cmd+Shift+R presses create multiple overlay windows.

## Medium Priority Findings

### 7. [MEDIUM] YAGNI: Unused functions exported

**Location:** `src/utils/image-queue-manager.js`

```javascript
function removeOldest() { ... }  // Never called
function getQueueInfo() { ... }  // Never called
```

### 8. [MEDIUM] Default mode inconsistency

**Location:** Multiple files

```javascript
// index.js:285
`localStorage.getItem('assistantMode') || 'text'`

// renderer.js:882
getAssistantMode: () => localStorage.getItem('assistantMode') || 'audio',
```

**Impact:** Default mode inconsistent between main and renderer processes.

### 9. [MEDIUM] Hardcoded thumbnail resolution

**Location:** `src/utils/roi-region-selector.js:322`

```javascript
thumbnailSize: { width: 3840, height: 2160 }
```

**Impact:** Always captures at 4K even for smaller regions - wastes memory.

## Low Priority Findings

### 10. [LOW] Console logging in production

Multiple files have extensive console.log statements that should be guarded or removed for production.

### 11. [LOW] Magic numbers

```javascript
const RESIZE_ANIMATION_DURATION = 500; // window.js:10
const MIN_REGION_SIZE = 50; // roi-region-selector.js:178
const JPEG_QUALITY = 80; // roi-region-selector.js:363
```

Should be centralized in config.

## Architecture Notes

- IPC handler structure clean and consistent
- Good separation: queue manager, region selector, text-mode API
- Renderer functions properly exposed via cheddar object
- Global shortcut pattern follows existing codebase conventions

## Recommended Actions

1. **[P0]** Add overlay singleton guard to prevent multiple ROI windows
2. **[P0]** Fix default mode inconsistency (text vs audio)
3. **[P1]** Extract mode check helper to reduce duplication
4. **[P1]** Add user feedback for silent shortcut failures
5. **[P2]** Track image size not just count in queue
6. **[P2]** Plan migration to contextIsolation=true

## Metrics

- Type Coverage: N/A (JavaScript)
- Test Coverage: No tests for new code
- Linting Issues: Not checked (no lint command run)

---

## Unresolved Questions

1. Should image queue auto-clear behavior be user-configurable?
2. What's the timeline for contextIsolation migration?
3. Should ROI region persist across app restarts? (Currently uses localStorage)
