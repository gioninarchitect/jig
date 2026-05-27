import { createHash } from 'node:crypto';
import { prisma } from '../config/db';
import { requestContext } from '../utils/requestContext';

// =====================================================================
// AI Call audit — every Claude API call lands here.
//
// Fire-and-forget logger called from each agent service immediately
// after the model returns. Hash-chained to the previous AICall in the
// tenant for tamper-evidence.
// =====================================================================

export interface AICallLog {
  tenantId: string;
  agent: 'MAESTRO' | 'CONCIERGE' | 'COMPOSER' | 'GENERAL_OPS';
  model: string;
  intent?: string;
  systemPrompt?: string;
  userPrompt?: string;
  response?: string;
  thinkingSummary?: string;
  sources?: Record<string, any>;
  inputTokens?: number | null;
  outputTokens?: number | null;
  cacheReadTokens?: number | null;
  cacheCreationTokens?: number | null;
  durationMs?: number;
  entityType?: string;
  entityId?: string;
}

async function getLastHash(tenantId: string): Promise<string> {
  const last = await prisma.aICall.findFirst({
    where: { tenantId },
    orderBy: { timestamp: 'desc' },
    select: { hashChain: true },
  });
  return last?.hashChain || 'AI-GENESIS';
}

function computeHash(prevHash: string, ts: string, userId: string, agent: string, responsePreview: string): string {
  return createHash('sha256').update(`${prevHash}|${ts}|${userId}|${agent}|${responsePreview.slice(0, 200)}`).digest('hex');
}

export async function logAICall(input: AICallLog) {
  // Pull request-scoped context so we capture the REAL actor (Ilse) even when ghosting (as Berne)
  const ctx = requestContext.getStore();
  const userId = ctx?.realUserId;
  if (!userId) return;  // can't log without an actor — fail silent

  const ts = new Date();
  const prevHash = await getLastHash(input.tenantId);
  // Truncate fields to keep DB size reasonable — full prompts can be >100KB
  const responseTrunc = (input.response ?? '').slice(0, 10000);
  const userPromptTrunc = (input.userPrompt ?? '').slice(0, 5000);
  const systemPromptTrunc = (input.systemPrompt ?? '').slice(0, 5000);
  const hashChain = computeHash(prevHash, ts.toISOString(), userId, input.agent, responseTrunc);

  try {
    await prisma.aICall.create({
      data: {
        tenantId: input.tenantId,
        userId,
        ghostAsUserId: ctx?.ghostAsUserId ?? null,
        agent: input.agent,
        model: input.model,
        intent: input.intent ?? null,
        systemPrompt: systemPromptTrunc,
        userPrompt: userPromptTrunc,
        response: responseTrunc,
        thinkingSummary: input.thinkingSummary ?? null,
        sources: input.sources ?? undefined,
        inputTokens: input.inputTokens ?? null,
        outputTokens: input.outputTokens ?? null,
        cacheReadTokens: input.cacheReadTokens ?? null,
        cacheCreationTokens: input.cacheCreationTokens ?? null,
        durationMs: input.durationMs ?? null,
        hashChain,
        entityType: input.entityType ?? null,
        entityId: input.entityId ?? null,
        timestamp: ts,
      },
    });
  } catch (err) {
    console.error('[AI Audit] log failed:', err);
  }
}
