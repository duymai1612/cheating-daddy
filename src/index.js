if (require('electron-squirrel-startup')) {
    process.exit(0);
}

const { app, BrowserWindow, shell, ipcMain } = require('electron');
const { createWindow, updateGlobalShortcuts } = require('./utils/window');
const { setupGeminiIpcHandlers, stopMacOSAudioCapture, sendToRenderer } = require('./utils/gemini');
const { initializeRandomProcessNames } = require('./utils/processRandomizer');
const { applyAntiAnalysisMeasures } = require('./utils/stealthFeatures');
const { getLocalConfig, writeConfig } = require('./config');
// Text mode imports
const { sendMultiImageQuery } = require('./utils/gemini-text-mode');
const imageQueue = require('./utils/image-queue-manager');
const { showRegionSelector, captureROIScreenshot, getSavedRegion, clearRegion } = require('./utils/roi-region-selector');

const geminiSessionRef = { current: null };
let mainWindow = null;

// Initialize random process names for stealth
const randomNames = initializeRandomProcessNames();

function createMainWindow() {
    mainWindow = createWindow(sendToRenderer, geminiSessionRef, randomNames);
    return mainWindow;
}

app.whenReady().then(async () => {
    // Apply anti-analysis measures with random delay
    await applyAntiAnalysisMeasures();

    createMainWindow();
    setupGeminiIpcHandlers(geminiSessionRef);
    setupGeneralIpcHandlers();
});

app.on('window-all-closed', () => {
    stopMacOSAudioCapture();
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('before-quit', () => {
    stopMacOSAudioCapture();
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createMainWindow();
    }
});

function setupGeneralIpcHandlers() {
    // Config-related IPC handlers
    ipcMain.handle('set-onboarded', async (event) => {
        try {
            const config = getLocalConfig();
            config.onboarded = true;
            writeConfig(config);
            return { success: true, config };
        } catch (error) {
            console.error('Error setting onboarded:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('set-stealth-level', async (event, stealthLevel) => {
        try {
            const validLevels = ['visible', 'balanced', 'ultra'];
            if (!validLevels.includes(stealthLevel)) {
                throw new Error(`Invalid stealth level: ${stealthLevel}. Must be one of: ${validLevels.join(', ')}`);
            }
            
            const config = getLocalConfig();
            config.stealthLevel = stealthLevel;
            writeConfig(config);
            return { success: true, config };
        } catch (error) {
            console.error('Error setting stealth level:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('set-layout', async (event, layout) => {
        try {
            const validLayouts = ['normal', 'compact'];
            if (!validLayouts.includes(layout)) {
                throw new Error(`Invalid layout: ${layout}. Must be one of: ${validLayouts.join(', ')}`);
            }
            
            const config = getLocalConfig();
            config.layout = layout;
            writeConfig(config);
            return { success: true, config };
        } catch (error) {
            console.error('Error setting layout:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('get-config', async (event) => {
        try {
            const config = getLocalConfig();
            return { success: true, config };
        } catch (error) {
            console.error('Error getting config:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('quit-application', async event => {
        try {
            stopMacOSAudioCapture();
            app.quit();
            return { success: true };
        } catch (error) {
            console.error('Error quitting application:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('open-external', async (event, url) => {
        try {
            await shell.openExternal(url);
            return { success: true };
        } catch (error) {
            console.error('Error opening external URL:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.on('update-keybinds', (event, newKeybinds) => {
        if (mainWindow) {
            updateGlobalShortcuts(newKeybinds, mainWindow, sendToRenderer, geminiSessionRef);
        }
    });

    ipcMain.handle('update-content-protection', async (event, contentProtection) => {
        try {
            if (mainWindow) {

                // Get content protection setting from localStorage via cheddar
                const contentProtection = await mainWindow.webContents.executeJavaScript('cheddar.getContentProtection()');
                mainWindow.setContentProtection(contentProtection);
                console.log('Content protection updated:', contentProtection);
            }
            return { success: true };
        } catch (error) {
            console.error('Error updating content protection:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('get-random-display-name', async event => {
        try {
            return randomNames ? randomNames.displayName : 'System Monitor';
        } catch (error) {
            console.error('Error getting random display name:', error);
            return 'System Monitor';
        }
    });

    // === TEXT MODE IPC HANDLERS ===

    // Store custom query for next send
    let pendingCustomQuery = null;

    // Set custom query text for next send
    ipcMain.handle('text-mode-set-query', async (event, query) => {
        pendingCustomQuery = query;
        return { success: true };
    });

    // Capture ROI and add to queue
    ipcMain.handle('text-mode-capture', async () => {
        try {
            const result = await captureROIScreenshot(mainWindow);
            if (!result.success) {
                return { success: false, error: result.error };
            }

            const queueResult = imageQueue.addImage(result.data);
            sendToRenderer('queue-updated', { count: queueResult.count });

            if (queueResult.warning) {
                return { success: true, count: queueResult.count, warning: queueResult.warning };
            }

            return { success: true, count: queueResult.count };
        } catch (error) {
            console.error('Text mode capture error:', error);
            return { success: false, error: error.message };
        }
    });

    // Send queued images to Gemini
    ipcMain.handle('text-mode-send', async () => {
        try {
            const images = imageQueue.getAllImages();
            if (images.length === 0) {
                return { success: false, error: 'No images in queue' };
            }

            // Get API key and settings from renderer
            const apiKey = await mainWindow.webContents.executeJavaScript(
                `localStorage.getItem('apiKey')`
            );
            const profile = await mainWindow.webContents.executeJavaScript(
                `localStorage.getItem('selectedProfile') || 'interview'`
            );
            const customPrompt = await mainWindow.webContents.executeJavaScript(
                `localStorage.getItem('customPrompt') || ''`
            );

            if (!apiKey) {
                return { success: false, error: 'No API key configured' };
            }

            sendToRenderer('update-status', 'Sending to Gemini...');

            // Use custom query if set, otherwise use default
            const queryText = pendingCustomQuery || null;
            pendingCustomQuery = null; // Clear after use

            const result = await sendMultiImageQuery(apiKey, images, profile, customPrompt, queryText);

            if (result.success) {
                sendToRenderer('update-response', result.text);
                sendToRenderer('update-status', 'Ready');
                return { success: true };
            } else {
                sendToRenderer('update-status', 'Error: ' + result.error);
                return { success: false, error: result.error };
            }
        } catch (error) {
            console.error('Text mode send error:', error);
            sendToRenderer('update-status', 'Error: ' + error.message);
            return { success: false, error: error.message };
        }
    });

    // Clear queue
    ipcMain.handle('text-mode-clear-queue', async () => {
        try {
            imageQueue.clearQueue();
            sendToRenderer('queue-updated', { count: 0 });
            return { success: true };
        } catch (error) {
            console.error('Clear queue error:', error);
            return { success: false, error: error.message };
        }
    });

    // Get queue count
    ipcMain.handle('text-mode-get-queue-count', async () => {
        try {
            return { success: true, count: imageQueue.getCount() };
        } catch (error) {
            return { success: false, error: error.message };
        }
    });

    // Show ROI selector
    ipcMain.handle('text-mode-select-roi', async () => {
        try {
            const result = await showRegionSelector(mainWindow);
            return result;
        } catch (error) {
            console.error('ROI selector error:', error);
            return { success: false, error: error.message };
        }
    });

    // Check if ROI is defined
    ipcMain.handle('text-mode-has-roi', async () => {
        try {
            const region = await getSavedRegion(mainWindow);
            return { success: true, hasROI: !!region };
        } catch (error) {
            return { success: false, error: error.message };
        }
    });

    // Clear ROI
    ipcMain.handle('text-mode-clear-roi', async () => {
        try {
            await clearRegion(mainWindow);
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    });

    // Get current assistant mode
    ipcMain.handle('get-assistant-mode', async () => {
        try {
            const mode = await mainWindow.webContents.executeJavaScript(
                `localStorage.getItem('assistantMode') || 'text'`
            );
            return { success: true, mode };
        } catch (error) {
            return { success: false, mode: 'audio' };
        }
    });
}
