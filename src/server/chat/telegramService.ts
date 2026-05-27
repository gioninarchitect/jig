/**
 * PureGro Chat Bot - Telegram Bot API Service
 *
 * Raw fetch() calls to api.telegram.org (Node 20 native fetch).
 * No npm bot library needed.
 */

const BOT_TOKEN = () => process.env.TELEGRAM_BOT_TOKEN || '';
const API_BASE = () => `https://api.telegram.org/bot${BOT_TOKEN()}`;

import type { InlineKeyboard } from './types';

/** Send a text message to a Telegram chat, with optional inline keyboard. */
export async function sendMessage(
  chatId: string,
  text: string,
  parseMode: 'HTML' | 'Markdown' = 'HTML',
  replyMarkup?: { inline_keyboard: InlineKeyboard },
): Promise<void> {
  try {
    const payload: Record<string, unknown> = {
      chat_id: chatId,
      text,
      parse_mode: parseMode,
    };
    if (replyMarkup) {
      payload.reply_markup = replyMarkup;
    }

    const res = await fetch(`${API_BASE()}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      console.error('[Telegram] sendMessage failed:', res.status, body);
    }
  } catch (err) {
    console.error('[Telegram] sendMessage error:', (err as Error).message);
  }
}

/** Acknowledge a callback query (dismiss the "loading" spinner on button). */
export async function answerCallbackQuery(
  callbackQueryId: string,
  text?: string,
): Promise<void> {
  try {
    await fetch(`${API_BASE()}/answerCallbackQuery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        callback_query_id: callbackQueryId,
        ...(text ? { text } : {}),
      }),
    });
  } catch (err) {
    console.error('[Telegram] answerCallbackQuery error:', (err as Error).message);
  }
}

/** Get file info from Telegram (returns file_path for downloading). */
export async function getFile(fileId: string): Promise<{
  ok: boolean;
  result?: { file_id: string; file_size?: number; file_path?: string };
}> {
  try {
    const res = await fetch(`${API_BASE()}/getFile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ file_id: fileId }),
    });
    return res.json() as Promise<{
      ok: boolean;
      result?: { file_id: string; file_size?: number; file_path?: string };
    }>;
  } catch (err) {
    console.error('[Telegram] getFile error:', (err as Error).message);
    return { ok: false };
  }
}

/** Download a file from Telegram servers. Returns the file buffer. */
export async function downloadFile(filePath: string): Promise<Buffer | null> {
  try {
    const url = `https://api.telegram.org/file/bot${BOT_TOKEN()}/${filePath}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const arrayBuffer = await res.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (err) {
    console.error('[Telegram] downloadFile error:', (err as Error).message);
    return null;
  }
}

/** Register a webhook URL with Telegram. */
export async function setWebhook(url: string): Promise<{ ok: boolean; description?: string }> {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET || '';

  const body: Record<string, unknown> = { url };
  if (secret) {
    body.secret_token = secret;
  }

  const res = await fetch(`${API_BASE()}/setWebhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  return res.json() as Promise<{ ok: boolean; description?: string }>;
}

/** Get current webhook info from Telegram. */
export async function getWebhookInfo(): Promise<{
  ok: boolean;
  result: {
    url: string;
    has_custom_certificate: boolean;
    pending_update_count: number;
    last_error_date?: number;
    last_error_message?: string;
  };
}> {
  const res = await fetch(`${API_BASE()}/getWebhookInfo`);
  return res.json() as Promise<{
    ok: boolean;
    result: {
      url: string;
      has_custom_certificate: boolean;
      pending_update_count: number;
      last_error_date?: number;
      last_error_message?: string;
    };
  }>;
}

/** Get basic bot info to verify the token is valid. */
export async function getMe(): Promise<{
  ok: boolean;
  result?: { id: number; first_name: string; username?: string };
}> {
  try {
    const res = await fetch(`${API_BASE()}/getMe`);
    return res.json() as Promise<{
      ok: boolean;
      result?: { id: number; first_name: string; username?: string };
    }>;
  } catch {
    return { ok: false };
  }
}

/** Check if the bot token is configured. */
export function isConfigured(): boolean {
  return BOT_TOKEN().length > 0;
}
