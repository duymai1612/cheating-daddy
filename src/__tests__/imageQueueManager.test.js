/**
 * Unit tests for image-queue-manager.js
 */
const {
    addImage,
    getAllImages,
    clearQueue,
    getCount,
    getQueueInfo,
    removeOldest,
    MAX_QUEUE_SIZE,
    WARNING_THRESHOLD,
    _resetForTesting
} = require('../utils/image-queue-manager');

describe('image-queue-manager', () => {
    beforeEach(() => {
        // Reset queue before each test
        _resetForTesting();
    });

    describe('addImage', () => {
        it('adds image to queue and returns count', () => {
            const result = addImage('base64-image-data');
            expect(result.count).toBe(1);
            expect(result.warning).toBeNull();
        });

        it('throws error for invalid image data', () => {
            expect(() => addImage(null)).toThrow('Invalid image data');
            expect(() => addImage(undefined)).toThrow('Invalid image data');
            expect(() => addImage(123)).toThrow('Invalid image data');
            expect(() => addImage('')).toThrow('Invalid image data');
        });

        it('returns warning at threshold', () => {
            // Add images up to warning threshold
            for (let i = 0; i < WARNING_THRESHOLD; i++) {
                const result = addImage(`image-${i}`);
                if (i < WARNING_THRESHOLD - 1) {
                    expect(result.warning).toBeNull();
                } else {
                    expect(result.warning).toContain(`Queue has ${WARNING_THRESHOLD} images`);
                }
            }
        });

        it('auto-clears at max capacity', () => {
            // Fill queue to max
            for (let i = 0; i < MAX_QUEUE_SIZE; i++) {
                addImage(`image-${i}`);
            }
            expect(getCount()).toBe(MAX_QUEUE_SIZE);

            // Adding one more should trigger auto-clear
            const result = addImage('overflow-image');
            expect(result.count).toBe(1);
            expect(getAllImages()).toEqual(['overflow-image']);
        });
    });

    describe('getAllImages', () => {
        it('returns empty array when queue is empty', () => {
            expect(getAllImages()).toEqual([]);
        });

        it('returns all image data in order', () => {
            addImage('image-1');
            addImage('image-2');
            addImage('image-3');
            expect(getAllImages()).toEqual(['image-1', 'image-2', 'image-3']);
        });
    });

    describe('clearQueue', () => {
        it('clears all images from queue', () => {
            addImage('image-1');
            addImage('image-2');
            expect(getCount()).toBe(2);

            clearQueue();
            expect(getCount()).toBe(0);
            expect(getAllImages()).toEqual([]);
        });
    });

    describe('getCount', () => {
        it('returns correct count', () => {
            expect(getCount()).toBe(0);
            addImage('image-1');
            expect(getCount()).toBe(1);
            addImage('image-2');
            expect(getCount()).toBe(2);
        });
    });

    describe('getQueueInfo', () => {
        it('returns correct info for empty queue', () => {
            const info = getQueueInfo();
            expect(info.count).toBe(0);
            expect(info.isEmpty).toBe(true);
            expect(info.oldestTimestamp).toBeNull();
        });

        it('returns correct info for populated queue', () => {
            const beforeAdd = Date.now();
            addImage('image-1');
            const info = getQueueInfo();

            expect(info.count).toBe(1);
            expect(info.isEmpty).toBe(false);
            expect(info.oldestTimestamp).toBeGreaterThanOrEqual(beforeAdd);
        });
    });

    describe('removeOldest', () => {
        it('returns null for empty queue', () => {
            expect(removeOldest()).toBeNull();
        });

        it('removes and returns oldest image', () => {
            addImage('first');
            addImage('second');
            addImage('third');

            expect(removeOldest()).toBe('first');
            expect(getCount()).toBe(2);
            expect(getAllImages()).toEqual(['second', 'third']);
        });
    });
});
