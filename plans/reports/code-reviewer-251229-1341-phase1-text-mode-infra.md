# Code Review: Phase 1 Text Mode Core Infrastructure

**Date**: 2025-12-29
**Reviewer**: code-reviewer (aa958f7)
**Files Reviewed**: 4

## Scope

- `src/utils/gemini-text-mode.js` - Gemini Text API wrapper
- `src/utils/image-queue-manager.js` - Image queue manager
- `src/__tests__/geminiTextMode.test.js` - Unit tests
- `src/__tests__/imageQueueManager.test.js` - Unit tests
- Lines: ~245 total

## Overall Assessment

Code chất lượng tốt, tuân thủ KISS/YAGNI. Tests cover edge cases. Có 1 bug logic và vài issues nhỏ cần fix.

---

## Critical Issues

**None**

---

## High Priority Findings

### 1. [BUG] Fallback logic không hoạt động (gemini-text-mode.js:31-39)

```javascript
try {
    model = client.models.generateContent ? client : client;
} catch (e) {
    // This catch will NEVER execute
    modelName = FALLBACK_MODEL;
}
```

**Vấn đề**: Try block không throw exception, `client.models.generateContent` chỉ check thuộc tính tồn tại. Fallback model không bao giờ được sử dụng.

**Đề xuất**: Remove dead code hoặc implement proper fallback:
```javascript
// Option 1: Remove fallback entirely (simpler)
const modelName = TEXT_MODE_MODEL;

// Option 2: Wrap API call with retry on specific errors
// Implement in catch block of actual API call
```

### 2. [MEMORY] Không giới hạn kích thước base64 data (image-queue-manager.js)

20 ảnh * ~500KB base64 each = ~10MB in memory. Với screenshot lớn có thể gây memory pressure.

**Mitigating factor**: MAX_QUEUE_SIZE = 20 với auto-clear nên tác động giới hạn.

**Đề xuất**: Consider validation size limit per image (~1MB max) để prevent abuse.

---

## Medium Priority Improvements

### 1. [TEST] Test gọi real API (geminiTextMode.test.js:61-68)

```javascript
it('uses default profile when not specified', async () => {
    const result = await sendMultiImageQuery('fake-key', ['image1']);
    // Makes real API call, logs error to stderr
});
```

**Vấn đề**: Test gọi thật API với fake key, gây:
- Network dependency
- Error logs trong test output
- Slow test

**Đề xuất**: Mock `@google/genai` module hoặc remove test này.

### 2. [CODE] addImage reject empty string nhưng không document (image-queue-manager.js:20)

```javascript
if (!base64Image || typeof base64Image !== 'string')
```

Empty string falsy nên bị reject, nhưng JSDoc không mention.

### 3. [CONSISTENCY] Console logs trong production code

- `console.log('Image queue auto-cleared...')`
- `console.log('Image queue cleared...')`
- `console.error('Gemini text mode error:')`

**Đề xuất**: Consider logging abstraction hoặc electron logger integration.

---

## Low Priority Suggestions

1. **Type hints**: Có thể thêm JSDoc types chi tiết hơn cho return objects
2. **Constants**: `MAX_QUEUE_SIZE`, `WARNING_THRESHOLD` có thể configurable

---

## Positive Observations

- Clean separation of concerns (queue manager vs API wrapper)
- Good input validation với descriptive error messages
- Auto-clear mechanism prevents unbounded memory growth
- Test coverage cho các edge cases quan trọng
- KISS/DRY principles followed

---

## Test Results

```
✓ src/__tests__/imageQueueManager.test.js (12 tests)
✓ src/__tests__/geminiTextMode.test.js (9 tests)
```

All 21 tests pass.

---

## Recommended Actions (Priority Order)

1. **[HIGH]** Fix/remove dead fallback code trong gemini-text-mode.js
2. **[MEDIUM]** Mock API calls trong tests để avoid network dependency
3. **[LOW]** Consider adding base64 size validation

---

## Security Assessment

- No XSS vectors (Node.js backend)
- No injection vulnerabilities
- API key passed as parameter, not hardcoded
- No sensitive data logged

---

## Unresolved Questions

1. Có cần persist queue qua app restart không? (hiện tại memory-only)
2. MAX_QUEUE_SIZE = 20 có phù hợp với UX expected hay cần điều chỉnh?
