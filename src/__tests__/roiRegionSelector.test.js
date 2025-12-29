/**
 * Tests for ROI Region Selector
 * Unit tests for region storage functions
 * Note: Screenshot capture with desktopCapturer requires real Electron environment (e2e tests)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => {
    const mockExecuteJavaScript = vi.fn();
    const mockWebContents = {
        executeJavaScript: mockExecuteJavaScript,
        id: 1
    };

    const mockMainWindow = {
        webContents: mockWebContents,
        getPosition: vi.fn(() => [100, 100]),
        focus: vi.fn()
    };

    return {
        mockExecuteJavaScript,
        mockWebContents,
        mockMainWindow
    };
});

// Mock electron - only mock what we need for unit tests
vi.mock('electron', async () => {
    return {
        BrowserWindow: vi.fn(),
        screen: {
            getDisplayNearestPoint: vi.fn(),
            getDisplayMatching: vi.fn()
        },
        ipcMain: {
            once: vi.fn(),
            removeListener: vi.fn()
        },
        desktopCapturer: {
            getSources: vi.fn()
        }
    };
});

describe('ROI Region Selector', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.resetModules();
        mocks.mockExecuteJavaScript.mockReset();
    });

    describe('getSavedRegion', () => {
        it('should return null when no region saved', async () => {
            mocks.mockExecuteJavaScript.mockResolvedValue(null);

            const fresh = await import('../utils/roi-region-selector');
            const result = await fresh.getSavedRegion(mocks.mockMainWindow);
            expect(result).toBeNull();
        });

        it('should return parsed region from localStorage', async () => {
            const savedRegion = { x: 100, y: 200, width: 500, height: 300 };
            mocks.mockExecuteJavaScript.mockResolvedValue(JSON.stringify(savedRegion));

            const fresh = await import('../utils/roi-region-selector');
            const result = await fresh.getSavedRegion(mocks.mockMainWindow);
            expect(result).toEqual(savedRegion);
        });

        it('should handle localStorage errors gracefully', async () => {
            mocks.mockExecuteJavaScript.mockRejectedValue(new Error('localStorage error'));

            const fresh = await import('../utils/roi-region-selector');
            const result = await fresh.getSavedRegion(mocks.mockMainWindow);
            expect(result).toBeNull();
        });
    });

    describe('saveRegion', () => {
        it('should save region to localStorage with base64 encoding', async () => {
            const region = { x: 100, y: 200, width: 500, height: 300 };
            mocks.mockExecuteJavaScript.mockResolvedValue(undefined);

            const fresh = await import('../utils/roi-region-selector');
            await fresh.saveRegion(mocks.mockMainWindow, region);

            // Check that localStorage.setItem was called with storage key and atob
            expect(mocks.mockExecuteJavaScript).toHaveBeenCalledWith(
                expect.stringContaining(fresh.STORAGE_KEY)
            );
            expect(mocks.mockExecuteJavaScript).toHaveBeenCalledWith(
                expect.stringContaining('atob')
            );
        });

        it('should reject invalid region objects', async () => {
            mocks.mockExecuteJavaScript.mockResolvedValue(undefined);

            const fresh = await import('../utils/roi-region-selector');

            // Invalid region - missing required fields
            await fresh.saveRegion(mocks.mockMainWindow, { x: 100 });
            expect(mocks.mockExecuteJavaScript).not.toHaveBeenCalled();

            // Invalid region - non-numeric fields
            await fresh.saveRegion(mocks.mockMainWindow, { x: 'a', y: 100, width: 200, height: 300 });
            expect(mocks.mockExecuteJavaScript).not.toHaveBeenCalled();
        });

        it('should handle save errors gracefully', async () => {
            const region = { x: 100, y: 200, width: 500, height: 300 };
            mocks.mockExecuteJavaScript.mockRejectedValue(new Error('save error'));

            const fresh = await import('../utils/roi-region-selector');
            // Should not throw
            await expect(fresh.saveRegion(mocks.mockMainWindow, region)).resolves.not.toThrow();
        });
    });

    describe('clearRegion', () => {
        it('should remove region from localStorage', async () => {
            mocks.mockExecuteJavaScript.mockResolvedValue(undefined);

            const fresh = await import('../utils/roi-region-selector');
            await fresh.clearRegion(mocks.mockMainWindow);

            expect(mocks.mockExecuteJavaScript).toHaveBeenCalledWith(
                expect.stringContaining('removeItem')
            );
            expect(mocks.mockExecuteJavaScript).toHaveBeenCalledWith(
                expect.stringContaining(fresh.STORAGE_KEY)
            );
        });
    });

    describe('hasRegion', () => {
        it('should return false when no region exists', async () => {
            mocks.mockExecuteJavaScript.mockResolvedValue(null);

            const fresh = await import('../utils/roi-region-selector');
            const result = await fresh.hasRegion(mocks.mockMainWindow);
            expect(result).toBe(false);
        });

        it('should return true when region exists', async () => {
            const savedRegion = { x: 100, y: 200, width: 500, height: 300 };
            mocks.mockExecuteJavaScript.mockResolvedValue(JSON.stringify(savedRegion));

            const fresh = await import('../utils/roi-region-selector');
            const result = await fresh.hasRegion(mocks.mockMainWindow);
            expect(result).toBe(true);
        });
    });

    describe('captureROIScreenshot', () => {
        it('should return error when no region defined', async () => {
            mocks.mockExecuteJavaScript.mockResolvedValue(null);

            const fresh = await import('../utils/roi-region-selector');
            // Clear any cached region
            await fresh.clearRegion(mocks.mockMainWindow);
            mocks.mockExecuteJavaScript.mockResolvedValue(null);

            const result = await fresh.captureROIScreenshot(mocks.mockMainWindow);

            expect(result.success).toBe(false);
            expect(result.error).toContain('No ROI region defined');
        });

        // Note: Full screenshot capture tests require real Electron environment
        // These would be e2e tests run with `npm run test:e2e`
    });

    describe('STORAGE_KEY', () => {
        it('should be defined and non-empty', async () => {
            const fresh = await import('../utils/roi-region-selector');
            expect(fresh.STORAGE_KEY).toBeDefined();
            expect(fresh.STORAGE_KEY).toBe('roiRegion');
        });
    });

    describe('module exports', () => {
        it('should export all required functions', async () => {
            const fresh = await import('../utils/roi-region-selector');
            expect(typeof fresh.getSavedRegion).toBe('function');
            expect(typeof fresh.saveRegion).toBe('function');
            expect(typeof fresh.clearRegion).toBe('function');
            expect(typeof fresh.showRegionSelector).toBe('function');
            expect(typeof fresh.captureROIScreenshot).toBe('function');
            expect(typeof fresh.hasRegion).toBe('function');
        });
    });
});
