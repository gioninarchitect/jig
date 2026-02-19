/**
 * JIG Chat Bot - Webhook Routes
 *
 * Public webhook endpoints for Telegram and WhatsApp.
 * POST /api/v1/chat/webhook/telegram - returns 200 immediately, processes async.
 * POST /api/v1/chat/webhook/whatsapp - WhatsApp Cloud API webhook.
 * No auth middleware (platforms send webhooks directly).
 */

import { Router, Request, Response } from 'express';
import { processMessage } from './chatEngine';
import * as telegram from './telegramService';
import type { IncomingMessage } from './types';

const router = Router();

// ── Telegram Webhook ─────────────────────────────────────────

router.post('/webhook/telegram', (req: Request, res: Response) => {
  // Validate webhook secret if configured
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (secret && req.headers['x-telegram-bot-api-secret-token'] !== secret) {
    res.status(403).json({ error: 'Invalid secret' });
    return;
  }

  // Return 200 immediately (Telegram retries on non-2xx)
  res.status(200).json({ ok: true });

  const update = req.body;

  // ── Handle callback_query (inline button press) ──────────
  if (update?.callback_query) {
    const cb = update.callback_query;
    const chatId = String(cb.message?.chat?.id || cb.from?.id);
    const callbackData = cb.data as string;

    // Acknowledge the button press immediately
    telegram.answerCallbackQuery(cb.id).catch(() => {});

    // Map callback_data to a text command the engine already understands
    const text = callbackDataToText(callbackData);

    const msg: IncomingMessage = {
      platform: 'telegram',
      platformUserId: chatId,
      platformUsername: cb.from?.username,
      platformDisplayName: [cb.from?.first_name, cb.from?.last_name]
        .filter(Boolean)
        .join(' ') || undefined,
      text,
      rawPayload: update,
    };

    processMessage(msg)
      .then((reply) => {
        const markup = reply.keyboard
          ? { inline_keyboard: reply.keyboard }
          : undefined;
        return telegram.sendMessage(chatId, reply.text, 'HTML', markup);
      })
      .catch((err) => {
        console.error('[Chat Webhook] Error processing callback:', err);
        telegram.sendMessage(chatId, 'Sorry, something went wrong. Please try again.').catch(() => {});
      });

    return;
  }

  // ── Handle photo message ──────────────────────────────────
  if (update?.message?.photo && Array.isArray(update.message.photo) && update.message.photo.length > 0) {
    // Telegram sends multiple sizes, take the largest
    const photos = update.message.photo as Array<{ file_id: string; file_size?: number; width: number; height: number }>;
    const largest = photos[photos.length - 1];

    const msg: IncomingMessage = {
      platform: 'telegram',
      platformUserId: String(update.message.chat.id),
      platformUsername: update.message.from?.username,
      platformDisplayName: [update.message.from?.first_name, update.message.from?.last_name]
        .filter(Boolean)
        .join(' ') || undefined,
      text: update.message.caption || '[photo]',
      photoFileId: largest.file_id,
      rawPayload: update,
    };

    processMessage(msg)
      .then((reply) => {
        const markup = reply.keyboard ? { inline_keyboard: reply.keyboard } : undefined;
        return telegram.sendMessage(msg.platformUserId, reply.text, 'HTML', markup);
      })
      .catch((err) => {
        console.error('[Chat Webhook] Error processing photo:', err);
        telegram.sendMessage(msg.platformUserId, 'Sorry, something went wrong processing your image.').catch(() => {});
      });

    return;
  }

  // ── Handle document message ───────────────────────────────
  if (update?.message?.document) {
    const doc = update.message.document as { file_id: string; file_name?: string; mime_type?: string; file_size?: number };

    const msg: IncomingMessage = {
      platform: 'telegram',
      platformUserId: String(update.message.chat.id),
      platformUsername: update.message.from?.username,
      platformDisplayName: [update.message.from?.first_name, update.message.from?.last_name]
        .filter(Boolean)
        .join(' ') || undefined,
      text: update.message.caption || '[document]',
      documentFileId: doc.file_id,
      documentFileName: doc.file_name,
      documentMimeType: doc.mime_type,
      rawPayload: update,
    };

    processMessage(msg)
      .then((reply) => {
        const markup = reply.keyboard ? { inline_keyboard: reply.keyboard } : undefined;
        return telegram.sendMessage(msg.platformUserId, reply.text, 'HTML', markup);
      })
      .catch((err) => {
        console.error('[Chat Webhook] Error processing document:', err);
        telegram.sendMessage(msg.platformUserId, 'Sorry, something went wrong processing your document.').catch(() => {});
      });

    return;
  }

  // ── Handle regular text message ──────────────────────────
  if (!update?.message?.text) return;

  const msg: IncomingMessage = {
    platform: 'telegram',
    platformUserId: String(update.message.chat.id),
    platformUsername: update.message.from?.username,
    platformDisplayName: [
      update.message.from?.first_name,
      update.message.from?.last_name,
    ]
      .filter(Boolean)
      .join(' ') || undefined,
    text: update.message.text,
    rawPayload: update,
  };

  processMessage(msg)
    .then((reply) => {
      const markup = reply.keyboard
        ? { inline_keyboard: reply.keyboard }
        : undefined;
      return telegram.sendMessage(msg.platformUserId, reply.text, 'HTML', markup);
    })
    .catch((err) => {
      console.error('[Chat Webhook] Error processing message:', err);
      telegram.sendMessage(
        msg.platformUserId,
        'Sorry, something went wrong. Please try again.',
      ).catch(() => {});
    });
});

// ── WhatsApp Cloud API Webhook ───────────────────────────────

// Verification endpoint (GET) - Meta sends this to verify the webhook
router.get('/webhook/whatsapp', (req: Request, res: Response) => {
  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN || '';
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === verifyToken) {
    res.status(200).send(challenge);
  } else {
    res.status(403).json({ error: 'Verification failed' });
  }
});

// Message webhook (POST) - WhatsApp sends messages here
router.post('/webhook/whatsapp', (req: Request, res: Response) => {
  // Return 200 immediately
  res.status(200).json({ ok: true });

  const body = req.body;

  // WhatsApp Cloud API sends entry[].changes[].value.messages[]
  const entry = body?.entry?.[0];
  const changes = entry?.changes?.[0];
  const value = changes?.value;

  if (!value?.messages || value.messages.length === 0) return;

  const waMsg = value.messages[0];
  const contact = value.contacts?.[0];
  const from = waMsg.from as string; // phone number

  // Build incoming message based on type
  let text = '';
  let photoFileId: string | undefined;
  let documentFileId: string | undefined;
  let documentFileName: string | undefined;
  let documentMimeType: string | undefined;

  if (waMsg.type === 'text') {
    text = waMsg.text?.body || '';
  } else if (waMsg.type === 'image') {
    text = waMsg.image?.caption || '[photo]';
    photoFileId = waMsg.image?.id;
  } else if (waMsg.type === 'document') {
    text = waMsg.document?.caption || '[document]';
    documentFileId = waMsg.document?.id;
    documentFileName = waMsg.document?.filename;
    documentMimeType = waMsg.document?.mime_type;
  } else if (waMsg.type === 'interactive') {
    // Button reply or list reply
    if (waMsg.interactive?.type === 'button_reply') {
      text = waMsg.interactive.button_reply?.id || waMsg.interactive.button_reply?.title || '';
    } else if (waMsg.interactive?.type === 'list_reply') {
      text = waMsg.interactive.list_reply?.id || waMsg.interactive.list_reply?.title || '';
    }
  } else {
    // Unsupported message type
    return;
  }

  if (!text && !photoFileId && !documentFileId) return;

  const msg: IncomingMessage = {
    platform: 'whatsapp',
    platformUserId: from,
    platformUsername: from,
    platformDisplayName: contact?.profile?.name,
    text: text || '[file]',
    photoFileId,
    documentFileId,
    documentFileName,
    documentMimeType,
    rawPayload: body,
  };

  processMessage(msg)
    .then(async (reply) => {
      // Send via WhatsApp Cloud API
      await sendWhatsAppMessage(from, reply.text, reply.keyboard);
    })
    .catch((err) => {
      console.error('[WhatsApp Webhook] Error processing message:', err);
      sendWhatsAppMessage(from, 'Sorry, something went wrong. Please try again.').catch(() => {});
    });
});

// ── WhatsApp Send Message ────────────────────────────────────

async function sendWhatsAppMessage(
  to: string,
  text: string,
  keyboard?: import('./types').InlineKeyboard,
): Promise<void> {
  const token = process.env.WHATSAPP_API_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!token || !phoneNumberId) {
    console.error('[WhatsApp] Not configured (missing WHATSAPP_API_TOKEN or WHATSAPP_PHONE_NUMBER_ID)');
    return;
  }

  // Strip HTML tags for WhatsApp (it uses its own formatting)
  const cleanText = text
    .replace(/<b>/g, '*').replace(/<\/b>/g, '*')
    .replace(/<i>/g, '_').replace(/<\/i>/g, '_')
    .replace(/<[^>]+>/g, '');

  try {
    // If we have keyboard buttons, send as interactive message
    if (keyboard && keyboard.length > 0) {
      const buttons = keyboard.flat().slice(0, 3).map((btn, idx) => ({
        type: 'reply' as const,
        reply: { id: btn.callback_data, title: btn.text.slice(0, 20) },
      }));

      if (buttons.length > 0) {
        await fetch(`https://graph.facebook.com/v21.0/${phoneNumberId}/messages`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            to,
            type: 'interactive',
            interactive: {
              type: 'button',
              body: { text: cleanText },
              action: { buttons },
            },
          }),
        });
        return;
      }
    }

    // Plain text message
    await fetch(`https://graph.facebook.com/v21.0/${phoneNumberId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to,
        type: 'text',
        text: { body: cleanText },
      }),
    });
  } catch (err) {
    console.error('[WhatsApp] sendMessage error:', (err as Error).message);
  }
}

// ── Map callback_data to engine text ─────────────────────────

function callbackDataToText(data: string): string {
  // cmd:X  -> /X
  if (data.startsWith('cmd:')) return `/${data.slice(4)}`;
  // cat:X  -> /products X
  if (data.startsWith('cat:')) return `/products ${data.slice(4)}`;
  // pop:orderId -> select order for POP upload
  if (data.startsWith('pop:')) return `__pop_select_${data.slice(4)}`;
  // Order flow: category selection
  if (data.startsWith('ocat:')) return `__ocat_${data.slice(5)}`;
  // Order flow: product selection
  if (data.startsWith('oadd:')) return `__oadd_${data.slice(5)}`;
  // Order flow: quantity selection
  if (data.startsWith('oqty:')) return `__oqty_${data.slice(5)}`;
  // order flow shortcuts
  if (data === 'confirm_order') return 'confirm';
  if (data === 'cancel_order') return '/cancel';
  if (data === 'order_done') return 'done';
  if (data === 'order_more') return '__order_more';
  // Registration flow
  if (data === 'reg_new') return '__reg_new';
  if (data === 'reg_existing') return '__reg_existing';
  if (data === 'reg_skip_doc') return '__reg_skip_doc';
  return data;
}

export default router;
