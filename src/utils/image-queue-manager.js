/**
 * Image Queue Manager
 * Manages screenshot queue for text mode multi-image queries
 * Queue persists until explicit clear or app restart
 */

// In-memory queue storage
let imageQueue = [];

// Configuration
const MAX_QUEUE_SIZE = 20;
const WARNING_THRESHOLD = 10;

/**
 * Add an image to the queue
 * @param {string} base64Image - Base64 encoded JPEG image data
 * @returns {{count: number, warning?: string}} Current queue count and optional warning
 */
function addImage(base64Image) {
    if (!base64Image || typeof base64Image !== 'string') {
        throw new Error('Invalid image data');
    }

    // Auto-clear if at max capacity
    if (imageQueue.length >= MAX_QUEUE_SIZE) {
        imageQueue = [];
        console.log('Image queue auto-cleared (max capacity reached)');
    }

    imageQueue.push({
        data: base64Image,
        timestamp: Date.now()
    });

    const count = imageQueue.length;
    let warning = null;

    if (count >= WARNING_THRESHOLD && count < MAX_QUEUE_SIZE) {
        warning = `Queue has ${count} images. Will auto-clear at ${MAX_QUEUE_SIZE}.`;
    }

    return { count, warning };
}

/**
 * Get all images in queue
 * @returns {string[]} Array of base64 image data strings
 */
function getAllImages() {
    return imageQueue.map(item => item.data);
}

/**
 * Clear the queue
 */
function clearQueue() {
    const previousCount = imageQueue.length;
    imageQueue = [];
    console.log(`Image queue cleared (was ${previousCount} images)`);
}

/**
 * Get current queue count
 * @returns {number}
 */
function getCount() {
    return imageQueue.length;
}

/**
 * Get queue info for UI display
 * @returns {{count: number, isEmpty: boolean, oldestTimestamp: number|null}}
 */
function getQueueInfo() {
    return {
        count: imageQueue.length,
        isEmpty: imageQueue.length === 0,
        oldestTimestamp: imageQueue.length > 0 ? imageQueue[0].timestamp : null
    };
}

/**
 * Remove oldest image from queue
 * @returns {string|null} Removed image data or null if queue was empty
 */
function removeOldest() {
    if (imageQueue.length === 0) {
        return null;
    }
    const removed = imageQueue.shift();
    return removed.data;
}

/**
 * Reset queue for testing purposes
 * @private
 */
function _resetForTesting() {
    imageQueue = [];
}

module.exports = {
    addImage,
    getAllImages,
    clearQueue,
    getCount,
    getQueueInfo,
    removeOldest,
    MAX_QUEUE_SIZE,
    WARNING_THRESHOLD,
    _resetForTesting
};
