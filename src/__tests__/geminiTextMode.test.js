/**
 * Unit tests for gemini-text-mode.js
 * Tests input validation and error handling
 * Note: API calls are not mocked as we only test error paths
 */

const {
    sendMultiImageQuery,
    TEXT_MODE_MODEL,
    FALLBACK_MODEL
} = require('../utils/gemini-text-mode');

describe('gemini-text-mode', () => {
    describe('sendMultiImageQuery - input validation', () => {
        it('returns error when API key is missing', async () => {
            const result = await sendMultiImageQuery(null, ['image1']);
            expect(result.success).toBe(false);
            expect(result.error).toBe('Missing API key or images');
        });

        it('returns error when API key is empty string', async () => {
            const result = await sendMultiImageQuery('', ['image1']);
            expect(result.success).toBe(false);
            expect(result.error).toBe('Missing API key or images');
        });

        it('returns error when images array is missing', async () => {
            const result = await sendMultiImageQuery('valid-api-key', null);
            expect(result.success).toBe(false);
            expect(result.error).toBe('Missing API key or images');
        });

        it('returns error when images array is empty', async () => {
            const result = await sendMultiImageQuery('valid-api-key', []);
            expect(result.success).toBe(false);
            expect(result.error).toBe('Missing API key or images');
        });

        it('returns error when images is undefined', async () => {
            const result = await sendMultiImageQuery('valid-api-key', undefined);
            expect(result.success).toBe(false);
            expect(result.error).toBe('Missing API key or images');
        });
    });

    describe('module exports', () => {
        it('exports sendMultiImageQuery function', () => {
            expect(typeof sendMultiImageQuery).toBe('function');
        });

        it('exports correct primary model name', () => {
            expect(TEXT_MODE_MODEL).toBe('gemini-2.5-flash');
        });

        it('exports correct fallback model name', () => {
            expect(FALLBACK_MODEL).toBe('gemini-2.0-flash');
        });
    });

    describe('sendMultiImageQuery - profile defaults', () => {
        it('uses default profile when not specified', async () => {
            // This will fail at API call stage, but tests that defaults are applied
            const result = await sendMultiImageQuery('fake-key', ['image1']);
            // Should fail with API error, not parameter error
            expect(result.success).toBe(false);
            expect(result.error).not.toBe('Missing API key or images');
        });
    });
});
