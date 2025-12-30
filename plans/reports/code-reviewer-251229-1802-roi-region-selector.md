# Code Review: ROI Region Selector

**Date**: 2025-12-29
**Reviewer**: code-reviewer
**Files Reviewed**:
- `/Users/duymai/work/interviews/cheating-daddy/src/utils/roi-region-selector.js`
- `/Users/duymai/work/interviews/cheating-daddy/src/__tests__/roiRegionSelector.test.js`

---

## Summary

| Severity | Count |
|----------|-------|
| Critical | 2 |
| High | 2 |
| Medium | 3 |
| Low | 2 |

---

## Critical Issues (2)

### 1. XSS via JSON Injection in `saveRegion`

**File**: `roi-region-selector.js:43-44`

```javascript
await mainWindow.webContents.executeJavaScript(
    `localStorage.setItem('${STORAGE_KEY}', '${JSON.stringify(region)}')`
);
```

**Problem**: Nếu `region` chứa special characters (e.g., `'`, `\`), có thể break JS string và inject malicious code.

**Impact**: Code execution trong renderer process.

**Fix**: Escape JSON properly hoặc dùng template literal escape:
```javascript
const escaped = JSON.stringify(JSON.stringify(region));
await mainWindow.webContents.executeJavaScript(
    `localStorage.setItem('${STORAGE_KEY}', ${escaped})`
);
```

### 2. Security: `contextIsolation: false` + `nodeIntegration: true`

**File**: `roi-region-selector.js:216-218`

```javascript
webPreferences: {
    nodeIntegration: true,
    contextIsolation: false
}
```

**Problem**: Overlay window có full Node.js access. Nếu có vulnerability trong overlay HTML, attacker có thể access file system.

**Mitigation**: Overlay HTML được generate internally (không load external content), nhưng vẫn là bad practice.

**Recommendation**: Use preload script với contextBridge thay vì disable contextIsolation.

---

## High Priority (2)

### 1. Memory Leak: IPC Listener Cleanup Race Condition

**File**: `roi-region-selector.js:252-259`

```javascript
ipcMain.once('roi-region-selected', handleRegionSelected);
ipcMain.once('roi-selection-cancelled', handleCancel);

overlay.on('closed', () => {
    ipcMain.removeListener('roi-region-selected', handleRegionSelected);
    ipcMain.removeListener('roi-selection-cancelled', handleCancel);
});
```

**Problem**:
- Nếu overlay bị force close (e.g., app quit), `closed` event sẽ fire nhưng listener đã được consume bởi `once()`.
- `removeListener` after `once()` đã fire là no-op nhưng harmless.
- Real issue: Promise never resolves nếu overlay closed không qua selection/cancel path.

**Fix**: Add close handler để resolve promise:
```javascript
overlay.on('closed', () => {
    ipcMain.removeListener('roi-region-selected', handleRegionSelected);
    ipcMain.removeListener('roi-selection-cancelled', handleCancel);
    resolve({ success: false, error: 'Window closed' });
});
```

### 2. Module-level State: `savedRegion` Cache Issue

**File**: `roi-region-selector.js:11`

```javascript
let savedRegion = null;
```

**Problem**: Module-level cache có thể stale nếu localStorage bị modify từ elsewhere. Không có invalidation mechanism.

**Recommendation**: Consider removing cache hoặc add TTL/invalidation.

---

## Medium Priority (3)

### 1. Missing Input Validation for `region` Object

**File**: `roi-region-selector.js:40`

Không validate `region` có đủ required fields (`x, y, width, height`) trước khi save.

### 2. Hard-coded Thumbnail Size

**File**: `roi-region-selector.js:278`

```javascript
thumbnailSize: { width: 3840, height: 2160 }
```

Có thể không đủ cho displays > 4K. Nên dynamic based on display bounds.

### 3. Minimum Size Hard-coded in HTML

**File**: `roi-region-selector.js:169`

```javascript
if (rect.width < 50 || rect.height < 50)
```

Magic number 50 không có constant/configurable.

---

## Low Priority (2)

### 1. No TypeScript Types

File là plain JS. Consider migrating to TypeScript for better type safety.

### 2. console.error for Production

```javascript
console.error('Error loading saved region:', error);
```

Should use proper logging mechanism.

---

## Test Coverage Assessment

**Coverage**: Adequate cho unit tests.

**Good**:
- Tests cover happy path và error handling
- Mocking strategy đúng
- Fresh import pattern avoid module cache issues

**Missing**:
- No tests for `showRegionSelector` (noted as e2e)
- No XSS/injection tests
- No boundary tests (e.g., negative coordinates)

---

## Positive Observations

1. Clean function separation, single responsibility
2. Good error handling với try-catch
3. Proper async/await usage
4. Minimum size check prevents accidental clicks
5. Multi-display support với `displayId`

---

## Recommended Actions (Priority Order)

1. **[Critical]** Fix JSON escaping in `saveRegion`
2. **[Critical]** Consider contextIsolation với preload script
3. **[High]** Add resolve path cho overlay closed unexpectedly
4. **[Medium]** Add input validation cho region object
5. **[Low]** Add TypeScript types

---

## Unresolved Questions

1. Có plan migrate sang TypeScript không?
2. Overlay cần support multi-monitor selection cùng lúc không?
3. Có cần encrypt/secure region data trong localStorage?
