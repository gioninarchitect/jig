/**
 * JIG Chat Bot - Intent Detection
 *
 * Uses Claude Haiku for NLP intent classification.
 * Falls back to keyword matching when the API is unavailable.
 */

import Anthropic from '@anthropic-ai/sdk';
import type { ChatIntent, IntentResult } from './types';

// ── Anthropic Client ─────────────────────────────────────────

let anthropic: Anthropic | null = null;

function getClient(): Anthropic | null {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  if (!anthropic) {
    anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return anthropic;
}

// ── System Prompt ────────────────────────────────────────────

const SYSTEM_PROMPT = `You are an intent classifier for JIG Craft Cannabis, a B2B wholesale cannabis platform in South Africa.

Given a user message, classify the intent and extract entities. Respond with ONLY valid JSON.

Intents:
- order_create: User wants to place a new order (e.g. "I want to order 10 units of Purple Haze")
- order_list: User wants to see their orders (e.g. "Show my orders", "Recent orders")
- order_status: User asks about a specific order (e.g. "Where's my order PO-000012?")
- product_search: User looking for products (e.g. "What strains do you have?", "Show me indicas")
- product_price: User asks about pricing (e.g. "How much is Purple Haze?", "Price list")
- invoice_view: User wants to see an invoice (e.g. "Send me my invoice for order X")
- payment_status: User asks about payment (e.g. "Is my payment received?", "Payment status")
- account_info: User asks about their account (e.g. "What tier am I?", "My account details")
- restock_reminder: User asks about restock timing (e.g. "When should I reorder?", "Stock predictions")
- pop_upload: User wants to upload proof of payment (e.g. "Upload POP", "Send my proof of payment", "I want to upload my payment slip")
- verification_status: User asks about verification/documents (e.g. "What's my verification status?", "My documents", "Am I verified?")
- help: User asks for help or command list (e.g. "/help", "What can you do?")
- greeting: Simple greeting (e.g. "Hi", "Hello", "Hey")
- unlink: User wants to disconnect account (e.g. "/unlink", "Disconnect my account")
- cancel: User wants to cancel current action (e.g. "/cancel", "Never mind", "Cancel")
- unknown: Cannot determine intent

Response format:
{"intent":"<intent>","entities":{"productName":"<if mentioned>","quantity":<if mentioned>,"orderId":"<if mentioned>","query":"<search term if relevant>"},"confidence":<0.0-1.0>}`;

// ── Claude Haiku Detection ───────────────────────────────────

async function detectWithClaude(text: string): Promise<IntentResult | null> {
  const client = getClient();
  if (!client) return null;

  try {
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 200,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: text }],
    });

    const content = response.content[0];
    if (content.type !== 'text') return null;

    const parsed = JSON.parse(content.text) as IntentResult;
    return parsed;
  } catch (err) {
    console.error('[IntentDetector] Claude API error:', (err as Error).message);
    return null;
  }
}

// ── Keyword Fallback ─────────────────────────────────────────

const KEYWORD_MAP: Array<{ patterns: RegExp[]; intent: ChatIntent }> = [
  { patterns: [/^\/start/, /^\/help/, /what can you do/i, /^help$/i], intent: 'help' },
  { patterns: [/^\/cancel/i, /^cancel$/i, /never ?mind/i], intent: 'cancel' },
  { patterns: [/^\/unlink/i, /disconnect/i, /unlink/i], intent: 'unlink' },
  { patterns: [/^(hi|hello|hey|howzit|good (morning|afternoon|evening))/i], intent: 'greeting' },
  { patterns: [/^\/pop$/i, /upload.*pop/i, /proof.*payment/i, /payment.*slip/i, /send.*pop/i, /submit.*pop/i], intent: 'pop_upload' },
  { patterns: [/^\/verification$/i, /verification.*status/i, /my.*documents/i, /am i verified/i, /doc.*status/i], intent: 'verification_status' },
  { patterns: [/order.*\d+.*unit/i, /want to order/i, /place.*order/i, /^\/order$/i, /new.*order/i], intent: 'order_create' },
  { patterns: [/my orders/i, /recent orders/i, /show.*orders/i, /list.*orders/i, /^\/orders$/i], intent: 'order_list' },
  { patterns: [/order.*status/i, /where.*order/i, /track.*order/i, /PO-\d+/i, /JIG-\d+/i], intent: 'order_status' },
  { patterns: [/price/i, /how much/i, /cost/i, /pricing/i, /^\/prices?$/i], intent: 'product_price' },
  { patterns: [/product/i, /strain/i, /indica/i, /sativa/i, /hybrid/i, /what.*have/i, /catalog/i, /menu/i, /^\/products$/i], intent: 'product_search' },
  { patterns: [/invoice/i, /^\/invoice/i], intent: 'invoice_view' },
  { patterns: [/payment/i, /paid/i, /outstanding/i, /balance/i, /^\/payment$/i], intent: 'payment_status' },
  { patterns: [/account/i, /tier/i, /my.*info/i, /^\/account$/i], intent: 'account_info' },
  { patterns: [/restock/i, /reorder/i, /running low/i, /stock.*predict/i, /^\/restock$/i], intent: 'restock_reminder' },
];

function detectWithKeywords(text: string): IntentResult {
  for (const { patterns, intent } of KEYWORD_MAP) {
    for (const re of patterns) {
      if (re.test(text)) {
        // Extract entities from text
        const entities: IntentResult['entities'] = {};
        const qtyMatch = text.match(/(\d+)\s*(unit|kg|g|gram)/i);
        if (qtyMatch) entities.quantity = Number(qtyMatch[1]);

        const poMatch = text.match(/(PO|JIG)-(\d+)/i);
        if (poMatch) entities.orderId = `${poMatch[1].toUpperCase()}-${poMatch[2]}`;

        return { intent, entities, confidence: 0.6 };
      }
    }
  }

  return { intent: 'unknown', entities: {}, confidence: 0.1 };
}

// ── Public API ───────────────────────────────────────────────

/** Detect intent from user message text. Tries Claude first, falls back to keywords. */
export async function detectIntent(text: string): Promise<IntentResult> {
  // Handle internal commands directly (from callback button mappings)
  if (text.startsWith('__pop_select_')) {
    return { intent: 'pop_upload', entities: {}, confidence: 1.0 };
  }

  // Try Claude Haiku first
  const claudeResult = await detectWithClaude(text);
  if (claudeResult && claudeResult.confidence > 0.3) {
    return claudeResult;
  }

  // Keyword fallback
  return detectWithKeywords(text);
}
