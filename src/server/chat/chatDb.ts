/**
 * PureGro Chat Bot - Database Queries
 *
 * Follows the same pattern as src/server/db.ts:
 * parameterized queries with row mappers.
 */

import { query } from '../db';
import type {
  ChatUserLink,
  ChatSession,
  ChatMessage,
  ChatPlatform,
  LinkState,
  PendingAction,
} from './types';

// ── Row Mappers ──────────────────────────────────────────────

function rowToLink(r: Record<string, unknown>): ChatUserLink {
  return {
    id: r.id as string,
    platform: r.platform as ChatPlatform,
    platformUserId: r.platform_user_id as string,
    platformUsername: (r.platform_username as string) ?? null,
    platformDisplayName: (r.platform_display_name as string) ?? null,
    linkState: r.link_state as LinkState,
    pendingEmail: (r.pending_email as string) ?? null,
    clientId: (r.client_id as string) ?? null,
    messageCount: Number(r.message_count),
    lastMessageAt: r.last_message_at
      ? new Date(r.last_message_at as string).getTime()
      : null,
    createdAt: new Date(r.created_at as string).getTime(),
    updatedAt: new Date(r.updated_at as string).getTime(),
  };
}

function rowToSession(r: Record<string, unknown>): ChatSession {
  return {
    id: r.id as string,
    linkId: r.link_id as string,
    messages: (r.messages as ChatMessage[]) ?? [],
    pendingAction: (r.pending_action as PendingAction) ?? null,
    createdAt: new Date(r.created_at as string).getTime(),
    updatedAt: new Date(r.updated_at as string).getTime(),
  };
}

// ── Link Queries ─────────────────────────────────────────────

/** UPSERT: find existing link or create a new one. */
export async function getOrCreateLink(
  platform: ChatPlatform,
  platformUserId: string,
  username?: string,
  displayName?: string,
): Promise<ChatUserLink> {
  const { rows } = await query(
    `INSERT INTO chat_user_links (platform, platform_user_id, platform_username, platform_display_name)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (platform, platform_user_id) DO UPDATE SET
       platform_username = COALESCE(EXCLUDED.platform_username, chat_user_links.platform_username),
       platform_display_name = COALESCE(EXCLUDED.platform_display_name, chat_user_links.platform_display_name),
       updated_at = NOW()
     RETURNING *`,
    [platform, platformUserId, username ?? null, displayName ?? null],
  );
  return rowToLink(rows[0] as Record<string, unknown>);
}

/** Update the link state and optionally set pending_email. */
export async function updateLinkState(
  linkId: string,
  state: LinkState,
  pendingEmail?: string,
): Promise<void> {
  await query(
    `UPDATE chat_user_links SET link_state = $1, pending_email = $2, updated_at = NOW()
     WHERE id = $3`,
    [state, pendingEmail ?? null, linkId],
  );
}

/** Set the client_id after OTP verification completes. */
export async function setLinkClient(
  linkId: string,
  clientId: string,
): Promise<void> {
  await query(
    `UPDATE chat_user_links SET client_id = $1, link_state = 'linked', pending_email = NULL, updated_at = NOW()
     WHERE id = $2`,
    [clientId, linkId],
  );
}

/** Get all linked chat accounts for a client (for sending notifications). */
export async function getLinksByClientId(clientId: string): Promise<ChatUserLink[]> {
  const { rows } = await query(
    `SELECT * FROM chat_user_links WHERE client_id = $1 AND link_state = 'linked'`,
    [clientId],
  );
  return rows.map(rowToLink);
}

/** Increment the message counter and touch last_message_at. */
export async function incrementMessageCount(linkId: string): Promise<void> {
  await query(
    `UPDATE chat_user_links SET message_count = message_count + 1, last_message_at = NOW(), updated_at = NOW()
     WHERE id = $1`,
    [linkId],
  );
}

/** List all linked users (for admin). */
export async function listLinkedUsers(): Promise<
  (ChatUserLink & { clientName?: string; clientEmail?: string })[]
> {
  const { rows } = await query(
    `SELECT l.*, c.company_name AS client_name, c.email AS client_email
     FROM chat_user_links l
     LEFT JOIN clients c ON c.id = l.client_id
     ORDER BY l.updated_at DESC`,
  );
  return rows.map((r) => {
    const row = r as Record<string, unknown>;
    return {
      ...rowToLink(row),
      clientName: (row.client_name as string) ?? undefined,
      clientEmail: (row.client_email as string) ?? undefined,
    };
  });
}

/** Delete a link (admin unlink). */
export async function deleteLink(linkId: string): Promise<void> {
  await query('DELETE FROM chat_user_links WHERE id = $1', [linkId]);
}

/** Get chat stats for admin dashboard. */
export async function getChatStats(): Promise<{
  totalLinks: number;
  linkedUsers: number;
  totalMessages: number;
}> {
  const { rows } = await query(
    `SELECT
       COUNT(*) AS total_links,
       COUNT(*) FILTER (WHERE link_state = 'linked') AS linked_users,
       COALESCE(SUM(message_count), 0) AS total_messages
     FROM chat_user_links`,
  );
  const r = rows[0] as Record<string, unknown>;
  return {
    totalLinks: Number(r.total_links),
    linkedUsers: Number(r.linked_users),
    totalMessages: Number(r.total_messages),
  };
}

// ── Session Queries ──────────────────────────────────────────

/** Get or create a chat session for a link. */
export async function getOrCreateSession(linkId: string): Promise<ChatSession> {
  const { rows } = await query(
    `INSERT INTO chat_sessions (link_id)
     VALUES ($1)
     ON CONFLICT (link_id) DO UPDATE SET updated_at = NOW()
     RETURNING *`,
    [linkId],
  );
  return rowToSession(rows[0] as Record<string, unknown>);
}

/** Update session messages (rolling 20-message window). */
export async function updateSessionMessages(
  sessionId: string,
  messages: ChatMessage[],
): Promise<void> {
  // Keep only last 20 messages
  const trimmed = messages.slice(-20);
  await query(
    `UPDATE chat_sessions SET messages = $1::jsonb, updated_at = NOW() WHERE id = $2`,
    [JSON.stringify(trimmed), sessionId],
  );
}

/** Update the pending action for multi-step flows. */
export async function updatePendingAction(
  sessionId: string,
  action: PendingAction | null,
): Promise<void> {
  await query(
    `UPDATE chat_sessions SET pending_action = $1::jsonb, updated_at = NOW() WHERE id = $2`,
    [action ? JSON.stringify(action) : null, sessionId],
  );
}
