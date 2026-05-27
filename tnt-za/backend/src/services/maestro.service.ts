import Anthropic from '@anthropic-ai/sdk';
import { logAICall } from './ai-audit.service';

// =====================================================================
// Maestro router (Haiku 4.5)
//
// Single job: classify the user's chat message into one of a small set
// of intents so the chat endpoint knows which specialist to call.
// Cheap (Haiku) and fast (~1-2s). Cached system prompt.
// =====================================================================

const client = new Anthropic();

export type Intent =
  | 'OWNER_BRIEF'      // → call Owner Concierge (Opus 4.7)
  | 'SMF_COMPOSE'      // → user wants AI redraft of an SMF section
  | 'SMF_QUERY'        // → ask about SMF state (which sections stale, etc.)
  | 'TICKETS_QUERY'    // → ask about tickets (mine, overdue, by area)
  | 'OPS_QUESTION'     // → general operational Q&A
  | 'HUMAN_HANDOFF';   // → route to a person, AI can't help

export interface RouteDecision {
  intent: Intent;
  reason: string;     // 1-line why
  sectionId?: string; // when intent=SMF_COMPOSE, the parsed section ref (e.g. "C.3.5")
}

const SYSTEM_PROMPT = `You are Maestro, the routing layer for the ORIGIN platform's chat surface.

Your only job: classify the user's message into one of these intents and return STRICTLY valid JSON.

Intents:
- OWNER_BRIEF       — user wants today's morning briefing / cross-unit summary / "what's burning"
- SMF_COMPOSE       — user wants AI to draft or redraft a Site Master File section
- SMF_QUERY         — user is asking ABOUT the SMF (which sections stale, signed, etc.)
- TICKETS_QUERY     — user is asking about tickets (their queue, overdue, by area, by person)
- OPS_QUESTION      — general operational Q&A (cultivation, dispatch, batches, staff, processes)
- HUMAN_HANDOFF     — user is requesting a human, asking about HR-sensitive matters, or anything outside system scope

Return JSON exactly matching this shape (no markdown fences):

{"intent":"<INTENT_NAME>","reason":"<one short sentence>","sectionId":"<if SMF_COMPOSE and a section ref is mentioned, e.g. C.3.5; else omit>"}

Be terse. Be exact. Always return valid JSON.`;

export async function routeIntent(userMessage: string, role: string, tenantId: string): Promise<RouteDecision> {
  const t0 = Date.now();
  const userPrompt = `Caller role: ${role}\n\nMessage:\n${userMessage}`;
  const response = await client.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 200,
    system: [
      { type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } },
    ],
    messages: [{ role: 'user', content: userPrompt }],
  });

  const textBlock = response.content.find((b: any) => b.type === 'text');
  const raw = textBlock && 'text' in textBlock ? textBlock.text.trim() : '';

  // Audit the routing call — fire-and-forget
  void logAICall({
    tenantId,
    agent: 'MAESTRO',
    model: 'claude-haiku-4-5',
    systemPrompt: SYSTEM_PROMPT,
    userPrompt,
    response: raw,
    inputTokens: response.usage?.input_tokens,
    outputTokens: response.usage?.output_tokens,
    cacheReadTokens: response.usage?.cache_read_input_tokens,
    cacheCreationTokens: response.usage?.cache_creation_input_tokens,
    durationMs: Date.now() - t0,
  });

  // Parse with safety — fall back to OPS_QUESTION on any parse failure
  try {
    const cleaned = raw.replace(/^```json?\s*/, '').replace(/\s*```$/, '');
    const parsed = JSON.parse(cleaned) as RouteDecision;
    if (!parsed.intent) throw new Error('no intent');
    return parsed;
  } catch {
    return {
      intent: 'OPS_QUESTION',
      reason: 'classifier output not parseable — falling back to ops Q&A',
    };
  }
}
