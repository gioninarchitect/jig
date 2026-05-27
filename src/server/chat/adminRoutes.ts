/**
 * PureGro Chat Bot - Admin Routes
 *
 * Protected endpoints for managing the chat bot.
 * All routes require requireAuth + requireAdmin.
 */

import { Router, Response, NextFunction } from 'express';
import { requireAuth, requireAdmin, AuthenticatedRequest } from '../middleware';
import * as chatDb from './chatDb';
import * as telegram from './telegramService';

const router = Router();

// All admin routes require auth + admin
router.use(requireAuth as never, requireAdmin as never);

// ── GET /chat/settings ───────────────────────────────────────
// Returns bot configuration status.

router.get('/settings', async (_req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const configured = telegram.isConfigured();
    let botInfo: { username?: string; name?: string } = {};
    let webhookInfo: { url?: string; pendingUpdates?: number } = {};

    if (configured) {
      const me = await telegram.getMe();
      if (me.ok && me.result) {
        botInfo = { username: me.result.username, name: me.result.first_name };
      }

      const wh = await telegram.getWebhookInfo();
      if (wh.ok) {
        webhookInfo = {
          url: wh.result.url || undefined,
          pendingUpdates: wh.result.pending_update_count,
        };
      }
    }

    const stats = await chatDb.getChatStats();

    res.json({
      configured,
      bot: botInfo,
      webhook: webhookInfo,
      stats,
    });
  } catch (err) {
    next(err);
  }
});

// ── GET /chat/linked-users ───────────────────────────────────
// List all chat-linked users.

router.get('/linked-users', async (_req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const users = await chatDb.listLinkedUsers();
    res.json({ users, count: users.length });
  } catch (err) {
    next(err);
  }
});

// ── DELETE /chat/linked-users/:id ────────────────────────────
// Unlink a chat user.

router.delete('/linked-users/:id', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    await chatDb.deleteLink(req.params.id as string);
    res.json({ message: 'User unlinked' });
  } catch (err) {
    next(err);
  }
});

// ── POST /chat/setup-webhook ─────────────────────────────────
// Register the webhook URL with Telegram.

router.post('/setup-webhook', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    if (!telegram.isConfigured()) {
      res.status(400).json({ error: 'TELEGRAM_BOT_TOKEN not configured' });
      return;
    }

    // Use the provided URL or construct from request (force https behind proxy)
    const providedUrl = (req.body as { url?: string }).url;
    const proto = req.get('x-forwarded-proto') || req.protocol || 'https';
    const webhookUrl = providedUrl || `https://${req.get('host')}/api/v1/chat/webhook/telegram`;

    const result = await telegram.setWebhook(webhookUrl);
    res.json({ ...result, webhookUrl });
  } catch (err) {
    next(err);
  }
});

export default router;
