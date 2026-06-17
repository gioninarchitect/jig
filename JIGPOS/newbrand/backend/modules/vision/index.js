/**
 * Scale OCR Service
 * Priority: Claude Vision API (best accuracy) → Tesseract (free fallback)
 */

const https = require('https');
const path = require('path');
const fs = require('fs');
const logger = require('../logger');

/**
 * Read scale weight using Claude Vision API
 * Sends the photo to Claude Haiku which understands the image and reads the display
 */
async function readWithClaudeVision(imagePath) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  const imageBuffer = fs.readFileSync(imagePath);
  const base64Image = imageBuffer.toString('base64');

  const ext = path.extname(imagePath).toLowerCase();
  const mediaType = ext === '.png' ? 'image/png'
    : ext === '.webp' ? 'image/webp'
    : ext === '.gif' ? 'image/gif'
    : 'image/jpeg';

  const requestBody = JSON.stringify({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 30,
    messages: [{
      role: 'user',
      content: [
        {
          type: 'image',
          source: {
            type: 'base64',
            media_type: mediaType,
            data: base64Image
          }
        },
        {
          type: 'text',
          text: 'This is a photo of a digital scale. What weight is shown on the scale display and what unit? Reply in EXACTLY this format: NUMBER UNIT. Examples: 4 g, 20.5 kg, 0.8 oz, 125 g, 2.3 lb. If no unit is visible on the display, assume g.'
        }
      ]
    }]
  });

  return new Promise((resolve) => {
    const options = {
      hostname: 'api.anthropic.com',
      path: '/v1/messages',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Length': Buffer.byteLength(requestBody)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          const response = JSON.parse(data);

          if (response.error) {
            logger.error('Claude Vision API error', { error: response.error });
            resolve(null);
            return;
          }

          if (response.content && response.content[0]) {
            const rawText = response.content[0].text.trim();
            // Parse "NUMBER UNIT" format (e.g. "4 g", "20.5 kg", "0.8 oz")
            const weightMatch = rawText.match(/(\d+\.?\d*)\s*(g|gr|gram|grams|kg|kilo|kilos|kilogram|kilograms|oz|ounce|ounces|lb|lbs|pound|pounds|mg|milligram|milligrams)?/i);
            if (weightMatch) {
              const value = parseFloat(weightMatch[1]);
              const rawUnit = (weightMatch[2] || 'g').toLowerCase();

              // Normalize unit
              const unitMap = {
                'g': 'g', 'gr': 'g', 'gram': 'g', 'grams': 'g',
                'kg': 'kg', 'kilo': 'kg', 'kilos': 'kg', 'kilogram': 'kg', 'kilograms': 'kg',
                'oz': 'oz', 'ounce': 'oz', 'ounces': 'oz',
                'lb': 'lb', 'lbs': 'lb', 'pound': 'lb', 'pounds': 'lb',
                'mg': 'mg', 'milligram': 'mg', 'milligrams': 'mg'
              };
              const unit = unitMap[rawUnit] || 'g';

              if (!isNaN(value) && value >= 0 && value <= 50000) {
                resolve({
                  success: true,
                  provider: 'claude-vision',
                  weight: Math.round(value * 100) / 100,
                  unit: unit,
                  confidence: 0.95,
                  rawText: rawText
                });
                return;
              }
            }
          }
          logger.warn('Claude Vision returned unexpected response', { data });
          resolve(null);
        } catch (e) {
          logger.error('Claude Vision parse error', { error: e.message });
          resolve(null);
        }
      });
    });

    req.on('error', (e) => {
      logger.error('Claude Vision request error', { error: e.message });
      resolve(null);
    });

    req.setTimeout(15000, () => {
      logger.error('Claude Vision request timed out');
      req.destroy();
      resolve(null);
    });

    req.write(requestBody);
    req.end();
  });
}

/**
 * Tesseract fallback (free, no API key needed)
 */
async function readWithTesseract(imagePath) {
  try {
    const { createWorker, PSM } = require('tesseract.js');
    const sharp = require('sharp');
    const os = require('os');

    const metadata = await sharp(imagePath).metadata();
    const imgWidth = metadata.width;
    const imgHeight = metadata.height;

    // Crop to bottom-center where scale display usually is
    const cropLeft = Math.round(imgWidth * 0.1);
    const cropTop = Math.round(imgHeight * 0.55);
    const cropWidth = Math.min(Math.round(imgWidth * 0.8), imgWidth - cropLeft);
    const cropHeight = Math.min(Math.round(imgHeight * 0.4), imgHeight - cropTop);

    const tempFile = path.join(os.tmpdir(), `scale-ocr-${Date.now()}.png`);

    await sharp(imagePath)
      .extract({ left: cropLeft, top: cropTop, width: cropWidth, height: cropHeight })
      .grayscale()
      .normalize()
      .sharpen({ sigma: 1.5 })
      .threshold(128)
      .resize({ width: cropWidth * 2, height: cropHeight * 2, kernel: sharp.kernel.lanczos3 })
      .toFile(tempFile);

    const worker = await createWorker('eng');
    await worker.setParameters({
      tessedit_char_whitelist: '0123456789.',
      tessedit_pageseg_mode: PSM.SINGLE_LINE
    });

    const { data } = await worker.recognize(tempFile);
    await worker.terminate();

    // Cleanup temp file
    try { fs.unlinkSync(tempFile); } catch (e) {}

    const rawText = data.text ? data.text.trim() : '';
    if (!rawText) return null;

    const numberMatch = rawText.match(/(\d+\.?\d*)/);
    if (numberMatch) {
      const weight = parseFloat(numberMatch[1]);
      if (!isNaN(weight) && weight >= 0.1 && weight <= 50000) {
        return {
          success: true,
          provider: 'tesseract',
          weight: Math.round(weight * 100) / 100,
          unit: 'g',
          confidence: (data.confidence / 100) * 0.6,
          rawText: rawText
        };
      }
    }

    return null;
  } catch (error) {
    logger.error('Tesseract fallback failed', { error: error.message });
    return null;
  }
}

/**
 * Extract weight reading from scale photo
 * @param {string} imagePath - Path to the image file
 * @returns {Object} - { success, weight, unit, confidence, rawText, provider }
 */
async function readScaleWeight(imagePath) {
  logger.info('Processing scale image', { imagePath });

  // 1. Try Claude Vision (best accuracy)
  const claudeResult = await readWithClaudeVision(imagePath);
  if (claudeResult) {
    logger.info('Claude Vision detected weight', claudeResult);
    return claudeResult;
  }

  logger.info('Claude Vision unavailable or failed, falling back to Tesseract');

  // 2. Fallback to Tesseract (free)
  const tesseractResult = await readWithTesseract(imagePath);
  if (tesseractResult) {
    logger.info('Tesseract detected weight', tesseractResult);
    return tesseractResult;
  }

  return {
    success: false,
    provider: 'none',
    error: 'No weight detected in image. Ensure the scale display is clearly visible.',
    weight: null,
    confidence: 0,
    rawText: ''
  };
}

/**
 * Parse weight value from OCR text (used by other modules)
 */
function parseWeightFromText(text) {
  if (!text) return { weight: null, unit: 'g', confidence: 0 };

  const normalized = text
    .replace(/\n/g, ' ')
    .replace(/,/g, '.')
    .replace(/[oO]/g, '0')
    .replace(/[lI|]/g, '1')
    .trim();

  const patterns = [
    { regex: /(\d+\.?\d*)\s*(?:kg|kilo)\b/i, unit: 'kg', conf: 0.95 },
    { regex: /(\d+\.?\d*)\s*(?:g|gr|gram)\b/i, unit: 'g', conf: 0.95 },
    { regex: /\b(\d{1,4}\.\d{1,2})\b/, unit: 'g', conf: 0.8 },
    { regex: /\b(\d{1,4})\b(?!\s*[:\/])/, unit: 'g', conf: 0.6 }
  ];

  for (const pattern of patterns) {
    const match = normalized.match(pattern.regex);
    if (match) {
      let value = parseFloat(match[1]);
      if (pattern.unit === 'kg') value = value * 1000;
      if (value >= 0.1 && value <= 50000) {
        return {
          weight: Math.round(value * 100) / 100,
          unit: 'g',
          confidence: pattern.conf
        };
      }
    }
  }

  return { weight: null, unit: 'g', confidence: 0 };
}

/**
 * Count loose items in a photo using Claude Vision
 * @param {string} imagePath - Path to the image file
 * @param {string} productName - Name of the product being counted (for context)
 * @returns {Object} - { success, count, confidence, rawText, provider }
 */
async function countItemsFromPhoto(imagePath, productName) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return { success: false, error: 'ANTHROPIC_API_KEY not configured', count: null, confidence: 0 };
  }

  logger.info('Counting items from photo with Claude Vision', { imagePath, productName });

  const imageBuffer = fs.readFileSync(imagePath);
  const base64Image = imageBuffer.toString('base64');

  const ext = path.extname(imagePath).toLowerCase();
  const mediaType = ext === '.png' ? 'image/png'
    : ext === '.webp' ? 'image/webp'
    : ext === '.gif' ? 'image/gif'
    : 'image/jpeg';

  const itemDesc = productName ? `The items are: ${productName}.` : '';

  const requestBody = JSON.stringify({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 30,
    messages: [{
      role: 'user',
      content: [
        {
          type: 'image',
          source: {
            type: 'base64',
            media_type: mediaType,
            data: base64Image
          }
        },
        {
          type: 'text',
          text: `Count the total number of individual items/units visible in this photo. ${itemDesc} Reply with ONLY the number, nothing else. Example: 7`
        }
      ]
    }]
  });

  return new Promise((resolve) => {
    const options = {
      hostname: 'api.anthropic.com',
      path: '/v1/messages',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Length': Buffer.byteLength(requestBody)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          const response = JSON.parse(data);

          if (response.error) {
            logger.error('Claude Vision count error', { error: response.error });
            resolve({ success: false, error: response.error.message, count: null, confidence: 0 });
            return;
          }

          if (response.content && response.content[0]) {
            const rawText = response.content[0].text.trim();
            const numberMatch = rawText.match(/(\d+)/);
            if (numberMatch) {
              const count = parseInt(numberMatch[1]);
              if (!isNaN(count) && count >= 0 && count <= 10000) {
                resolve({
                  success: true,
                  provider: 'claude-vision',
                  count: count,
                  confidence: 0.9,
                  rawText: rawText
                });
                return;
              }
            }
          }
          logger.warn('Claude Vision count returned unexpected response', { data });
          resolve({ success: false, error: 'Could not determine count', count: null, confidence: 0 });
        } catch (e) {
          logger.error('Claude Vision count parse error', { error: e.message });
          resolve({ success: false, error: e.message, count: null, confidence: 0 });
        }
      });
    });

    req.on('error', (e) => {
      logger.error('Claude Vision count request error', { error: e.message });
      resolve({ success: false, error: e.message, count: null, confidence: 0 });
    });

    req.setTimeout(15000, () => {
      logger.error('Claude Vision count request timed out');
      req.destroy();
      resolve({ success: false, error: 'Request timed out', count: null, confidence: 0 });
    });

    req.write(requestBody);
    req.end();
  });
}

/**
 * Compare OCR weight with manual entry
 */
function compareWeights(ocrWeight, manualWeight, tolerance = 0.05) {
  if (ocrWeight === null || manualWeight === null) {
    return { matches: null, difference: null, differencePercent: null };
  }

  const difference = Math.abs(ocrWeight - manualWeight);
  const differencePercent = manualWeight > 0 ? (difference / manualWeight) : 0;
  const matches = differencePercent <= tolerance;

  return {
    matches,
    difference: Math.round(difference * 100) / 100,
    differencePercent: Math.round(differencePercent * 100)
  };
}

module.exports = {
  readScaleWeight,
  countItemsFromPhoto,
  parseWeightFromText,
  compareWeights
};
