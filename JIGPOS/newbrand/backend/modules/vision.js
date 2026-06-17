// Vision Module — Claude Vision API for stock take OCR and item counting
// Uses Anthropic Claude's vision capability to:
// 1. Read scale weights from photos (OCR)
// 2. Compare detected weights against manual entries
// 3. Count items from photos

const fs = require('fs');
const path = require('path');
const logger = require('./logger');

let Anthropic;
let client = null;

try {
    Anthropic = require('@anthropic-ai/sdk');
} catch (e) {
    logger.warn('[Vision] @anthropic-ai/sdk not installed — OCR features disabled');
}

function getClient() {
    if (client) return client;
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey || !Anthropic) {
        return null;
    }
    client = new Anthropic.default({ apiKey });
    return client;
}

/**
 * Convert an image file to base64 with media type detection
 */
function imageToBase64(imagePath) {
    const ext = path.extname(imagePath).toLowerCase();
    const mediaTypes = {
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.gif': 'image/gif',
        '.webp': 'image/webp'
    };
    const mediaType = mediaTypes[ext] || 'image/jpeg';
    const data = fs.readFileSync(imagePath);
    return { base64: data.toString('base64'), mediaType };
}

/**
 * Read scale weight from a photo using Claude Vision OCR.
 * @param {string} imagePath - path to the scale photo
 * @returns {Promise<{success: boolean, weight: number|null, unit: string, confidence: number, rawText: string}>}
 */
async function readScaleWeight(imagePath) {
    const anthropic = getClient();
    if (!anthropic) {
        return {
            success: false,
            weight: null,
            unit: 'g',
            confidence: 0,
            rawText: '',
            reason: 'Anthropic API key not configured'
        };
    }

    try {
        const { base64, mediaType } = imageToBase64(imagePath);

        const response = await anthropic.messages.create({
            model: 'claude-sonnet-4-5-20250929',
            max_tokens: 256,
            messages: [{
                role: 'user',
                content: [
                    {
                        type: 'image',
                        source: { type: 'base64', media_type: mediaType, data: base64 }
                    },
                    {
                        type: 'text',
                        text: 'This is a photo of a scale display showing a weight measurement. Read the weight value shown on the scale display. Respond with ONLY a JSON object in this exact format: {"weight": <number>, "unit": "g" or "kg", "rawText": "<exactly what you see on the display>"}. If you cannot read the weight, respond with: {"weight": null, "unit": "g", "rawText": "unreadable"}'
                    }
                ]
            }]
        });

        const text = response.content[0].text.trim();
        let parsed;
        try {
            // Extract JSON from response (handle markdown code blocks)
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            parsed = JSON.parse(jsonMatch ? jsonMatch[0] : text);
        } catch (e) {
            logger.warn('[Vision] Failed to parse OCR response', { text });
            return {
                success: false,
                weight: null,
                unit: 'g',
                confidence: 0,
                rawText: text
            };
        }

        // Convert kg to g if needed
        let weightInGrams = parsed.weight;
        if (parsed.unit === 'kg' && parsed.weight !== null) {
            weightInGrams = parsed.weight * 1000;
        }

        return {
            success: parsed.weight !== null,
            weight: weightInGrams,
            unit: 'g',
            confidence: parsed.weight !== null ? 0.85 : 0,
            rawText: parsed.rawText || ''
        };
    } catch (error) {
        logger.error('[Vision] readScaleWeight error', { error: error.message });
        return {
            success: false,
            weight: null,
            unit: 'g',
            confidence: 0,
            rawText: '',
            error: error.message
        };
    }
}

/**
 * Compare OCR-detected weight with manual entry.
 * @param {number} ocrWeight - weight detected by OCR (in grams)
 * @param {number} manualWeight - manually entered weight (in grams)
 * @returns {{matches: boolean, difference: number, percentDiff: number}}
 */
function compareWeights(ocrWeight, manualWeight) {
    if (ocrWeight === null || ocrWeight === undefined || manualWeight === null || manualWeight === undefined) {
        return { matches: false, difference: 0, percentDiff: 0 };
    }

    const difference = Math.abs(ocrWeight - manualWeight);
    const percentDiff = manualWeight > 0 ? (difference / manualWeight) * 100 : 0;
    // Allow 5% tolerance for scale reading differences
    const matches = percentDiff <= 5;

    return { matches, difference, percentDiff };
}

/**
 * Count items from a photo using Claude Vision.
 * @param {string} imagePath - path to the photo
 * @param {string} productName - name of the product to count
 * @returns {Promise<{success: boolean, count: number|null, confidence: number}>}
 */
async function countItemsFromPhoto(imagePath, productName) {
    const anthropic = getClient();
    if (!anthropic) {
        return {
            success: false,
            count: null,
            confidence: 0,
            reason: 'Anthropic API key not configured'
        };
    }

    try {
        const { base64, mediaType } = imageToBase64(imagePath);

        const response = await anthropic.messages.create({
            model: 'claude-sonnet-4-5-20250929',
            max_tokens: 256,
            messages: [{
                role: 'user',
                content: [
                    {
                        type: 'image',
                        source: { type: 'base64', media_type: mediaType, data: base64 }
                    },
                    {
                        type: 'text',
                        text: `This is a photo of items for a stock count. Count the number of "${productName}" items visible in the photo. Respond with ONLY a JSON object: {"count": <number>, "notes": "<any observations>"}. If you cannot count reliably, respond with: {"count": null, "notes": "unable to count"}`
                    }
                ]
            }]
        });

        const text = response.content[0].text.trim();
        let parsed;
        try {
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            parsed = JSON.parse(jsonMatch ? jsonMatch[0] : text);
        } catch (e) {
            logger.warn('[Vision] Failed to parse count response', { text });
            return { success: false, count: null, confidence: 0 };
        }

        return {
            success: parsed.count !== null,
            count: parsed.count,
            confidence: parsed.count !== null ? 0.8 : 0,
            notes: parsed.notes || ''
        };
    } catch (error) {
        logger.error('[Vision] countItemsFromPhoto error', { error: error.message });
        return {
            success: false,
            count: null,
            confidence: 0,
            error: error.message
        };
    }
}

module.exports = {
    readScaleWeight,
    compareWeights,
    countItemsFromPhoto
};
