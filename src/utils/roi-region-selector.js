/**
 * ROI Region Selector
 * Creates overlay for user to select transcript capture region
 * Saves region bounds to localStorage
 */
const { BrowserWindow, screen, ipcMain, desktopCapturer } = require('electron');

const STORAGE_KEY = 'roiRegion';

// Region bounds: {x, y, width, height, displayId}
let savedRegion = null;

/**
 * Get saved region from localStorage via renderer
 * @param {BrowserWindow} mainWindow - Main app window
 * @returns {Promise<Object|null>}
 */
async function getSavedRegion(mainWindow) {
    if (savedRegion) return savedRegion;

    try {
        const regionJson = await mainWindow.webContents.executeJavaScript(
            `localStorage.getItem('${STORAGE_KEY}')`
        );
        if (regionJson) {
            savedRegion = JSON.parse(regionJson);
            return savedRegion;
        }
    } catch (error) {
        console.error('Error loading saved region:', error);
    }
    return null;
}

/**
 * Save region to localStorage via renderer
 * @param {BrowserWindow} mainWindow - Main app window
 * @param {Object} region - Region bounds {x, y, width, height}
 */
async function saveRegion(mainWindow, region) {
    // Validate region object has required numeric fields
    if (!region || typeof region.x !== 'number' || typeof region.y !== 'number' ||
        typeof region.width !== 'number' || typeof region.height !== 'number') {
        console.error('Invalid region object:', region);
        return;
    }

    savedRegion = region;
    try {
        // Use btoa/atob for safe JSON encoding to prevent XSS injection
        const safeJson = Buffer.from(JSON.stringify(region)).toString('base64');
        await mainWindow.webContents.executeJavaScript(
            `localStorage.setItem('${STORAGE_KEY}', atob('${safeJson}'))`
        );
    } catch (error) {
        console.error('Error saving region:', error);
    }
}

/**
 * Clear saved region
 * @param {BrowserWindow} mainWindow
 */
async function clearRegion(mainWindow) {
    savedRegion = null;
    try {
        await mainWindow.webContents.executeJavaScript(
            `localStorage.removeItem('${STORAGE_KEY}')`
        );
    } catch (error) {
        console.error('Error clearing region:', error);
    }
}

/**
 * Get overlay HTML for region selection UI
 * @returns {string}
 */
function getOverlayHTML() {
    return `
<!DOCTYPE html>
<html>
<head>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            width: 100vw;
            height: 100vh;
            background: rgba(0, 0, 0, 0.3);
            cursor: crosshair;
            overflow: hidden;
            font-family: -apple-system, BlinkMacSystemFont, sans-serif;
        }
        .instruction {
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 12px 24px;
            border-radius: 8px;
            font-size: 14px;
            z-index: 1000;
        }
        .selection {
            position: fixed;
            border: 2px solid #007AFF;
            background: rgba(0, 122, 255, 0.1);
            display: none;
        }
        .selection.active {
            display: block;
        }
        .selection-info {
            position: absolute;
            bottom: -25px;
            left: 0;
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 12px;
            white-space: nowrap;
        }
    </style>
</head>
<body>
    <div class="instruction">Drag to select transcript region | ESC to cancel</div>
    <div class="selection" id="selection">
        <div class="selection-info" id="selectionInfo"></div>
    </div>
    <script>
        const { ipcRenderer } = require('electron');

        const selection = document.getElementById('selection');
        const selectionInfo = document.getElementById('selectionInfo');
        let isDrawing = false;
        let startX = 0, startY = 0;

        document.addEventListener('mousedown', (e) => {
            isDrawing = true;
            startX = e.clientX;
            startY = e.clientY;
            selection.style.left = startX + 'px';
            selection.style.top = startY + 'px';
            selection.style.width = '0';
            selection.style.height = '0';
            selection.classList.add('active');
        });

        document.addEventListener('mousemove', (e) => {
            if (!isDrawing) return;

            const currentX = e.clientX;
            const currentY = e.clientY;

            const left = Math.min(startX, currentX);
            const top = Math.min(startY, currentY);
            const width = Math.abs(currentX - startX);
            const height = Math.abs(currentY - startY);

            selection.style.left = left + 'px';
            selection.style.top = top + 'px';
            selection.style.width = width + 'px';
            selection.style.height = height + 'px';

            selectionInfo.textContent = width + ' x ' + height;
        });

        document.addEventListener('mouseup', (e) => {
            if (!isDrawing) return;
            isDrawing = false;

            const rect = selection.getBoundingClientRect();

            // Minimum size check (50x50 pixels)
            if (rect.width < 50 || rect.height < 50) {
                selection.classList.remove('active');
                return;
            }

            ipcRenderer.send('roi-region-selected', {
                x: Math.round(rect.left),
                y: Math.round(rect.top),
                width: Math.round(rect.width),
                height: Math.round(rect.height)
            });
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                ipcRenderer.send('roi-selection-cancelled');
            }
        });
    </script>
</body>
</html>
    `;
}

/**
 * Show overlay for region selection
 * @param {BrowserWindow} mainWindow - Main app window to return focus to
 * @returns {Promise<{success: boolean, region?: Object, error?: string}>}
 */
function showRegionSelector(mainWindow) {
    return new Promise((resolve) => {
        // Get the display where main window is located
        const [mainX, mainY] = mainWindow.getPosition();
        const currentDisplay = screen.getDisplayNearestPoint({ x: mainX, y: mainY });
        const { bounds } = currentDisplay;

        // Create fullscreen transparent overlay
        // Note: contextIsolation is false because overlay uses ipcRenderer directly.
        // This is acceptable since we only load a local data URL (no external content)
        // and the overlay window is temporary and controlled by the app.
        const overlay = new BrowserWindow({
            x: bounds.x,
            y: bounds.y,
            width: bounds.width,
            height: bounds.height,
            frame: false,
            transparent: true,
            alwaysOnTop: true,
            skipTaskbar: true,
            focusable: true,
            webPreferences: {
                nodeIntegration: true,
                contextIsolation: false
            }
        });

        // Load overlay HTML
        overlay.loadURL(`data:text/html,${encodeURIComponent(getOverlayHTML())}`);

        // Handle region selection complete
        const handleRegionSelected = (event, region) => {
            // Check if overlay still exists before accessing webContents
            if (overlay.isDestroyed() || event.sender.id !== overlay.webContents.id) return;

            // Convert to absolute screen coordinates
            const absoluteRegion = {
                x: bounds.x + region.x,
                y: bounds.y + region.y,
                width: region.width,
                height: region.height,
                displayId: currentDisplay.id
            };

            saveRegion(mainWindow, absoluteRegion);
            overlay.close();
            mainWindow.focus();
            resolve({ success: true, region: absoluteRegion });
        };

        // Handle cancel
        const handleCancel = (event) => {
            // Check if overlay still exists before accessing webContents
            if (overlay.isDestroyed() || event.sender.id !== overlay.webContents.id) return;
            overlay.close();
            mainWindow.focus();
            resolve({ success: false, error: 'Cancelled' });
        };

        ipcMain.once('roi-region-selected', handleRegionSelected);
        ipcMain.once('roi-selection-cancelled', handleCancel);

        // Track if promise already resolved to prevent double-resolve
        let resolved = false;

        // Cleanup on close - also resolve promise if not already resolved
        overlay.on('closed', () => {
            ipcMain.removeListener('roi-region-selected', handleRegionSelected);
            ipcMain.removeListener('roi-selection-cancelled', handleCancel);

            // Resolve with cancelled if overlay closed unexpectedly
            if (!resolved) {
                resolved = true;
                mainWindow.focus();
                resolve({ success: false, error: 'Selection window closed' });
            }
        });

        // Mark as resolved when handlers fire
        const originalHandleRegionSelected = handleRegionSelected;
        const originalHandleCancel = handleCancel;

        // Wrap handlers to track resolution
        ipcMain.removeListener('roi-region-selected', handleRegionSelected);
        ipcMain.removeListener('roi-selection-cancelled', handleCancel);

        const wrappedHandleRegionSelected = (event, region) => {
            resolved = true;
            originalHandleRegionSelected(event, region);
        };

        const wrappedHandleCancel = (event) => {
            resolved = true;
            originalHandleCancel(event);
        };

        ipcMain.once('roi-region-selected', wrappedHandleRegionSelected);
        ipcMain.once('roi-selection-cancelled', wrappedHandleCancel);
    });
}

/**
 * Capture screenshot of saved ROI region
 * @param {BrowserWindow} mainWindow
 * @returns {Promise<{success: boolean, data?: string, error?: string}>}
 */
async function captureROIScreenshot(mainWindow) {
    const region = await getSavedRegion(mainWindow);

    if (!region) {
        return { success: false, error: 'No ROI region defined. Press Cmd+Shift+R to select.' };
    }

    try {
        // Get screen sources
        const sources = await desktopCapturer.getSources({
            types: ['screen'],
            thumbnailSize: { width: 3840, height: 2160 } // Max resolution
        });

        // Find the correct display
        const display = screen.getDisplayMatching({
            x: region.x,
            y: region.y,
            width: region.width,
            height: region.height
        });

        // Find source for this display
        const source = sources.find(s =>
            s.display_id === String(display.id) ||
            s.name.includes('Screen') ||
            s.name.includes('Display')
        );

        if (!source) {
            return { success: false, error: 'Could not find display source' };
        }

        // Get full screenshot as NativeImage
        const thumbnail = source.thumbnail;

        // Calculate crop coordinates relative to display bounds
        const cropX = region.x - display.bounds.x;
        const cropY = region.y - display.bounds.y;

        // Scale factor for HiDPI displays
        const scaleFactor = display.scaleFactor || 1;

        // Crop the region
        const cropped = thumbnail.crop({
            x: Math.floor(cropX * scaleFactor),
            y: Math.floor(cropY * scaleFactor),
            width: Math.floor(region.width * scaleFactor),
            height: Math.floor(region.height * scaleFactor)
        });

        // Convert to base64 JPEG with 80% quality
        const base64 = cropped.toJPEG(80).toString('base64');

        return { success: true, data: base64 };
    } catch (error) {
        console.error('ROI capture error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Check if region is defined
 * @param {BrowserWindow} mainWindow
 * @returns {Promise<boolean>}
 */
async function hasRegion(mainWindow) {
    const region = await getSavedRegion(mainWindow);
    return region !== null;
}

module.exports = {
    getSavedRegion,
    saveRegion,
    clearRegion,
    showRegionSelector,
    captureROIScreenshot,
    hasRegion,
    STORAGE_KEY
};
