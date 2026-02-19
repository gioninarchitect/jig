/**
 * JIG Chat Bot - Scheduled Notifications
 *
 * Runs periodic checks and sends proactive Telegram notifications:
 * - Daily restock reminders (products due within 3 days)
 * - New product announcements to all linked clients
 */

import * as db from '../db';
import * as chatDb from './chatDb';
import * as telegram from './telegramService';
import { loadClientWorldState } from '../routes/intelligence.routes';
import { predictRestock } from '../../world-model/inference';

/** Send a Telegram message to a client (best-effort). */
async function notifyClient(clientId: string, text: string): Promise<void> {
  const links = await chatDb.getLinksByClientId(clientId);
  for (const link of links) {
    if (link.platform === 'telegram') {
      await telegram.sendMessage(link.platformUserId, text, 'HTML');
    }
  }
}

/** Send a message to ALL linked Telegram users. */
async function notifyAllClients(text: string): Promise<void> {
  const links = await chatDb.listLinkedUsers();
  for (const link of links) {
    if (link.platform === 'telegram' && link.clientId) {
      try {
        await telegram.sendMessage(link.platformUserId, text, 'HTML');
      } catch {
        // Skip failed sends
      }
    }
  }
}

// ── Restock Reminders ─────────────────────────────────────────

async function runRestockReminders(): Promise<void> {
  console.log('[Notifications] Running restock reminder check...');

  try {
    const links = await chatDb.listLinkedUsers();
    const clientIds = [...new Set(
      links.filter((l) => l.clientId).map((l) => l.clientId as string),
    )];

    let sent = 0;
    for (const clientId of clientIds) {
      try {
        const state = await loadClientWorldState(clientId);
        if (!state) continue;

        const predictions = predictRestock(state);
        const urgent = predictions.filter((p) => p.daysUntilNeeded <= 3);

        if (urgent.length === 0) continue;

        const lines = [
          `<b>Restock Reminder</b>`,
          ``,
          `You have ${urgent.length} product${urgent.length > 1 ? 's' : ''} due for reorder:`,
          ``,
        ];

        for (const p of urgent.slice(0, 5)) {
          const date = new Date(p.predictedDate).toLocaleDateString('en-ZA');
          lines.push(`<b>${p.productName}</b>`);
          lines.push(`  Reorder by ${date} (${p.daysUntilNeeded} days)`);
          lines.push(`  Suggested: ${p.suggestedQuantity} units`);
          lines.push('');
        }

        lines.push('Tap /order to restock now.');

        await notifyClient(clientId, lines.join('\n'));
        sent++;
      } catch {
        // Skip failed clients
      }
    }

    console.log(`[Notifications] Restock reminders sent to ${sent} clients`);
  } catch (err) {
    console.error('[Notifications] Restock reminder error:', (err as Error).message);
  }
}

// ── New Product Notification ──────────────────────────────────

let knownProductIds = new Set<string>();

async function initProductTracker(): Promise<void> {
  const products = await db.listProducts(false);
  knownProductIds = new Set(products.map((p) => p.id));
}

async function checkNewProducts(): Promise<void> {
  try {
    const products = await db.listProducts(false);
    const currentIds = new Set(products.map((p) => p.id));

    for (const p of products) {
      if (!knownProductIds.has(p.id)) {
        // New product detected
        const price = p.priceTiers.length > 0
          ? `R${p.priceTiers[0].price.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}/${p.unit}`
          : 'Price TBC';

        await notifyAllClients([
          `<b>New Product Available!</b>`,
          ``,
          `<b>${p.name}</b>`,
          `${p.category}${p.strain ? ` | ${p.strain}` : ''}`,
          `${price}`,
          p.thcContent ? `THC: ${p.thcContent}` : '',
          ``,
          `Tap /products to browse or /order to add to your next order.`,
        ].filter(Boolean).join('\n'));

        console.log(`[Notifications] New product announced: ${p.name}`);
      }
    }

    knownProductIds = currentIds;
  } catch (err) {
    console.error('[Notifications] New product check error:', (err as Error).message);
  }
}

// ── Scheduler ─────────────────────────────────────────────────

export function startNotificationScheduler(): void {
  console.log('[Notifications] Scheduler started');

  // Initialize product tracker
  initProductTracker().catch(() => {});

  // Restock reminders: run daily at 8am (check every hour, only send at 8)
  setInterval(() => {
    const hour = new Date().getHours();
    if (hour === 8) {
      runRestockReminders();
    }
  }, 60 * 60 * 1000); // every hour

  // New product check: every 5 minutes
  setInterval(() => {
    checkNewProducts();
  }, 5 * 60 * 1000);
}
