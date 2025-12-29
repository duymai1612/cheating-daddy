/**
 * Gemini Text Mode API wrapper
 * Uses standard generateContent API instead of Live API
 * Supports multi-image queries for screenshot-based assistance
 */
const { GoogleGenAI } = require('@google/genai');
const { getSystemPrompt } = require('./prompts');

// Model selection - use newest model with best intelligence
// Fallback chain: gemini-2.5-flash (stable) -> gemini-2.0-flash
const TEXT_MODE_MODEL = 'gemini-2.5-flash';
const FALLBACK_MODEL = 'gemini-2.0-flash';

/**
 * Send multiple images to Gemini for analysis
 * @param {string} apiKey - Gemini API key
 * @param {string[]} images - Array of base64 encoded JPEG images
 * @param {string} profile - Profile name (interview, sales, etc.)
 * @param {string} customPrompt - User's custom prompt/context
 * @returns {Promise<{success: boolean, text?: string, error?: string}>}
 */
async function sendMultiImageQuery(apiKey, images, profile = 'interview', customPrompt = '') {
    if (!apiKey || !images || images.length === 0) {
        return { success: false, error: 'Missing API key or images' };
    }

    try {
        const client = new GoogleGenAI({ apiKey });
        const modelName = TEXT_MODE_MODEL;

        // Build content array with images first, then text prompt
        const imageParts = images.map(base64 => ({
            inlineData: {
                mimeType: 'image/jpeg',
                data: base64
            }
        }));

        // Get system prompt (Google Search disabled for text mode)
        const systemPrompt = getSystemPrompt(profile, customPrompt, false);

        // User prompt for transcript analysis
        const userPrompt = `Analyze these ${images.length} screenshot(s) of a transcript/conversation.
The screenshots are in chronological order. Focus on the most recent question or topic being discussed.
Provide a helpful, concise response that the user can use immediately.`;

        // Call generateContent API
        const result = await client.models.generateContent({
            model: modelName,
            contents: [{
                role: 'user',
                parts: [
                    ...imageParts,
                    { text: userPrompt }
                ]
            }],
            config: {
                systemInstruction: systemPrompt
            }
        });

        // Extract text from response
        const text = result.text ||
            (result.candidates?.[0]?.content?.parts?.[0]?.text) ||
            '';

        if (!text) {
            return { success: false, error: 'No response text received from Gemini' };
        }

        return { success: true, text };
    } catch (error) {
        console.error('Gemini text mode error:', error);

        // Provide more specific error messages
        if (error.message?.includes('API key')) {
            return { success: false, error: 'Invalid API key' };
        }
        if (error.message?.includes('quota') || error.message?.includes('rate')) {
            return { success: false, error: 'API rate limit exceeded. Please wait and try again.' };
        }
        if (error.message?.includes('model')) {
            return { success: false, error: `Model unavailable: ${error.message}` };
        }

        return { success: false, error: error.message || 'Unknown error occurred' };
    }
}

module.exports = {
    sendMultiImageQuery,
    TEXT_MODE_MODEL,
    FALLBACK_MODEL
};
