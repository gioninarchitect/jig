import Anthropic from '@anthropic-ai/sdk';
import { prisma } from '../config/db';
import { readFileSync } from 'fs';

let anthropic: Anthropic;
try {
  anthropic = new Anthropic();
} catch {
  console.warn('[Vision] Anthropic SDK not configured — ANTHROPIC_API_KEY may be missing');
}

export async function identifyFromPhoto(photoPath: string, tenantId: string) {
  if (!anthropic) {
    throw Object.assign(new Error('Vision service not available — ANTHROPIC_API_KEY not configured'), { status: 503 });
  }

  const imageData = readFileSync(photoPath);
  const base64 = imageData.toString('base64');
  const ext = photoPath.split('.').pop()?.toLowerCase() || 'jpeg';
  const mediaType = ext === 'png' ? 'image/png' : 'image/jpeg';

  let response;
  try {
    response = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 500,
    messages: [{
      role: 'user',
      content: [
        {
          type: 'image',
          source: { type: 'base64', media_type: mediaType, data: base64 },
        },
        {
          type: 'text',
          text: `You are a cannabis track & trace system scanner. Look at this photo and identify any of the following:

1. Plant tag with ID format "ZA-XXXXXX" (e.g., ZA-000142)
2. Container label with format "BIN-XXX", "RACK-XXX", "BAG-XXX", or "JAR-XXX"
3. Batch label with format "B-YYYY-NNN" (e.g., B-2026-012)
4. A digital scale display showing a weight in grams or kilograms

Respond in JSON only, no other text:
{
  "type": "plant" | "container" | "batch" | "scale" | "unknown",
  "identifier": "the ID you read" | null,
  "weight": number | null,
  "weightUnit": "g" | "kg" | null,
  "confidence": 0.0 to 1.0,
  "notes": "anything relevant about what you see"
}`,
        },
      ],
    }],
  });
  } catch (err: any) {
    console.error('[Vision] API error:', err.message);
    throw Object.assign(new Error('Vision API failed: ' + (err.message || 'Unknown error')), { status: 502 });
  }

  const text = response.content[0].type === 'text' ? response.content[0].text : '';

  // Parse JSON from response
  let result;
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    result = jsonMatch ? JSON.parse(jsonMatch[0]) : { type: 'unknown', identifier: null, weight: null, confidence: 0 };
  } catch {
    result = { type: 'unknown', identifier: null, weight: null, confidence: 0, notes: text };
  }

  // Look up the entity in the database
  let entity = null;
  if (result.identifier && result.type !== 'unknown' && result.type !== 'scale') {
    if (result.type === 'plant') {
      entity = await prisma.plant.findFirst({
        where: { identifier: result.identifier, tenantId },
        include: { zone: true, handler: { select: { name: true } } },
      });
    } else if (result.type === 'container') {
      entity = await prisma.container.findFirst({
        where: { containerId: result.identifier, tenantId },
        include: {
          currentZone: true,
          batch: { select: { batchNumber: true } },
          events: { orderBy: { timestamp: 'desc' }, take: 1 },
        },
      });
    } else if (result.type === 'batch') {
      entity = await prisma.batch.findFirst({
        where: { batchNumber: result.identifier, tenantId },
        include: { facility: true, _count: { select: { batchPlants: true } } },
      });
    }
  }

  return {
    scan: result,
    entity,
    matched: entity !== null,
  };
}
