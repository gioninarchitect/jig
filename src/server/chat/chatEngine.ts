/**
 * JIG Chat Bot - Core Orchestrator
 *
 * Entry point: processMessage(msg) handles the full flow:
 * - Unlinked users: email -> OTP -> linked
 * - Linked users: intent detection -> handler dispatch
 *
 * Handlers call existing db.ts functions directly (no HTTP round-trip).
 */

import * as fs from 'fs';
import * as path from 'path';
import * as db from '../db';
import * as chatDb from './chatDb';
import * as telegram from './telegramService';
import { detectIntent } from './intentDetector';
import { requestOtp } from '../auth';
import { loadClientWorldState } from '../routes/intelligence.routes';
import { predictRestock } from '../../world-model/inference';
import type { IncomingMessage, ChatMessage, PendingAction, ChatReply, InlineKeyboard } from './types';
import type { Product, DocumentType } from '../../world-model/types';
import { emitEvent } from '../n8n/emitter';

// ── Keyboard Presets ─────────────────────────────────────────

const KB_MAIN: InlineKeyboard = [
  [
    { text: 'Browse Products', callback_data: 'cmd:products' },
    { text: 'Price List', callback_data: 'cmd:prices' },
  ],
  [
    { text: 'New Order', callback_data: 'cmd:order' },
    { text: 'My Orders', callback_data: 'cmd:orders' },
  ],
  [
    { text: 'Upload POP', callback_data: 'cmd:pop' },
    { text: 'My Account', callback_data: 'cmd:account' },
  ],
];

const KB_HELP: InlineKeyboard = [
  [
    { text: 'Browse Products', callback_data: 'cmd:products' },
    { text: 'Price List', callback_data: 'cmd:prices' },
  ],
  [
    { text: 'New Order', callback_data: 'cmd:order' },
    { text: 'My Orders', callback_data: 'cmd:orders' },
  ],
  [
    { text: 'Upload POP', callback_data: 'cmd:pop' },
    { text: 'Payments', callback_data: 'cmd:payment' },
  ],
  [
    { text: 'Restock Predictions', callback_data: 'cmd:restock' },
    { text: 'My Account', callback_data: 'cmd:account' },
  ],
];

const KB_CATEGORY: InlineKeyboard = [
  [
    { text: 'Flower', callback_data: 'cat:flower' },
    { text: 'Edibles', callback_data: 'cat:edibles' },
  ],
  [
    { text: 'Pre-Rolls', callback_data: 'cat:pre-rolls' },
    { text: 'All Products', callback_data: 'cmd:products' },
  ],
  [
    { text: 'New Order', callback_data: 'cmd:order' },
  ],
];

const KB_AFTER_ORDER: InlineKeyboard = [
  [
    { text: 'My Orders', callback_data: 'cmd:orders' },
    { text: 'Upload POP', callback_data: 'cmd:pop' },
  ],
  [
    { text: 'Browse Products', callback_data: 'cmd:products' },
    { text: 'Main Menu', callback_data: 'cmd:help' },
  ],
];

const KB_ORDER_ADDING: InlineKeyboard = [
  [
    { text: 'Done - Review Order', callback_data: 'order_done' },
    { text: 'Cancel Order', callback_data: 'cancel_order' },
  ],
];

const KB_ORDER_CONFIRM: InlineKeyboard = [
  [
    { text: 'Confirm & Place Order', callback_data: 'confirm_order' },
    { text: 'Cancel Order', callback_data: 'cancel_order' },
  ],
];

const KB_BACK_MAIN: InlineKeyboard = [
  [{ text: 'Main Menu', callback_data: 'cmd:help' }],
];

// ── Allowed MIME types for POP uploads ───────────────────────

const POP_ALLOWED_MIMES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

// ── Main Entry Point ─────────────────────────────────────────

/** Process an incoming chat message. Returns the bot's reply (text + optional keyboard). */
export async function processMessage(msg: IncomingMessage): Promise<ChatReply> {
  // 1. Upsert the chat link
  const link = await chatDb.getOrCreateLink(
    msg.platform,
    msg.platformUserId,
    msg.platformUsername,
    msg.platformDisplayName,
  );

  // 2. Increment message count
  await chatDb.incrementMessageCount(link.id);

  // 3. Get/create session for context
  const session = await chatDb.getOrCreateSession(link.id);

  // 4. Check for registration or doc_upload pending action (these span link states)
  if (session.pendingAction?.type === 'registration') {
    const reply = await handleRegistrationStep(link.id, msg, session);
    const newMessages: ChatMessage[] = [
      ...session.messages,
      { role: 'user', text: msg.text, timestamp: Date.now() },
      { role: 'bot', text: reply.text, timestamp: Date.now() },
    ];
    await chatDb.updateSessionMessages(session.id, newMessages);
    return reply;
  }

  if (session.pendingAction?.type === 'doc_upload' && link.linkState === 'linked') {
    const reply = await handleDocUploadStep(link.clientId!, msg, session);
    const newMessages: ChatMessage[] = [
      ...session.messages,
      { role: 'user', text: msg.text, timestamp: Date.now() },
      { role: 'bot', text: reply.text, timestamp: Date.now() },
    ];
    await chatDb.updateSessionMessages(session.id, newMessages);
    return reply;
  }

  // 5. Route based on link state
  let reply: ChatReply;

  switch (link.linkState) {
    case 'pending_email':
      reply = await handlePendingEmail(link.id, msg.text, session.id);
      break;

    case 'pending_otp':
      reply = await handlePendingOtp(link.id, link.pendingEmail!, msg.text, session.id);
      break;

    case 'linked':
      reply = await handleLinkedMessage(link.clientId!, msg, session);
      break;

    default:
      reply = { text: "Something went wrong. Please type /start to begin again." };
  }

  // 5. Update session messages
  const newMessages: ChatMessage[] = [
    ...session.messages,
    { role: 'user', text: msg.text, timestamp: Date.now() },
    { role: 'bot', text: reply.text, timestamp: Date.now() },
  ];
  await chatDb.updateSessionMessages(session.id, newMessages);

  return reply;
}

// ── Linking Flow ─────────────────────────────────────────────

async function handlePendingEmail(
  linkId: string,
  text: string,
  sessionId: string,
): Promise<ChatReply> {
  const trimmed = text.trim();

  // Handle /start command - show two options
  if (trimmed.startsWith('/start')) {
    return {
      text: [
        "<b>Welcome to JIG Craft Cannabis!</b>",
        "",
        "South Africa's premium B2B cannabis wholesale platform.",
        "",
        "Are you an existing client or would you like to register?",
      ].join('\n'),
      keyboard: [
        [
          { text: 'Existing Client', callback_data: 'reg_existing' },
          { text: 'New Client', callback_data: 'reg_new' },
        ],
      ],
    };
  }

  // Handle button callbacks
  if (trimmed === '__reg_existing') {
    return {
      text: "Please enter the <b>email address</b> registered with your JIG account.",
    };
  }

  if (trimmed === '__reg_new') {
    // Start registration flow
    await chatDb.updatePendingAction(sessionId, {
      type: 'registration',
      step: 'company_name',
      data: {},
    });
    return {
      text: [
        "<b>New Client Registration</b>",
        "",
        "Let's get you set up. This takes about 2 minutes.",
        "",
        "What is your <b>company name</b>?",
      ].join('\n'),
    };
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(trimmed)) {
    return {
      text: "Please enter a valid email address, or tap a button above to get started.",
      keyboard: [
        [
          { text: 'Existing Client', callback_data: 'reg_existing' },
          { text: 'New Client', callback_data: 'reg_new' },
        ],
      ],
    };
  }

  const email = trimmed.toLowerCase();

  // Check if this email belongs to a client
  const client = await db.getClientByEmail(email);
  if (!client) {
    return { text: "No JIG account found for that email. Please check and try again, or contact your sales rep." };
  }

  if (client.status === 'suspended') {
    return { text: "This account is suspended. Please contact support." };
  }

  // Send OTP
  try {
    await requestOtp(email, 'login');
  } catch {
    return { text: "Failed to send verification code. Please try again in a moment." };
  }

  // Update state to pending_otp
  await chatDb.updateLinkState(linkId, 'pending_otp', email);

  return { text: `A 6-digit verification code has been sent to <b>${email}</b>.\n\nPlease enter the code to link your account.` };
}

async function handlePendingOtp(
  linkId: string,
  email: string,
  text: string,
  _sessionId: string,
): Promise<ChatReply> {
  const trimmed = text.trim();

  // Allow /cancel to restart
  if (trimmed === '/cancel' || trimmed.toLowerCase() === 'cancel') {
    await chatDb.updateLinkState(linkId, 'pending_email');
    return { text: "Verification cancelled. Send your email to try again." };
  }

  // Validate OTP format
  if (!/^\d{6}$/.test(trimmed)) {
    return { text: "Please enter the 6-digit code sent to your email, or type /cancel to start over." };
  }

  // Verify OTP
  const result = await db.verifyOtp(email, trimmed);
  if (!result.valid) {
    await db.incrementOtpAttempts(email);
    return { text: "Invalid or expired code. Please try again, or type /cancel to start over." };
  }

  // Resolve client
  const client = await db.getClientByEmail(email);
  if (!client) {
    await chatDb.updateLinkState(linkId, 'pending_email');
    return { text: "Account not found. Please enter your email again." };
  }

  // Link the account
  await chatDb.setLinkClient(linkId, client.id);

  const tierLabel = (client.tier || 'standard').charAt(0).toUpperCase() + (client.tier || 'standard').slice(1);

  const lines = [
    `Account linked! Welcome, <b>${client.contactPerson || client.companyName}</b>.`,
    '',
    `Company: ${client.companyName}`,
    `Tier: ${tierLabel}`,
    '',
    "What would you like to do?",
  ];

  // Add verification nudge for pending clients
  if (client.status === 'pending') {
    lines.splice(4, 0,
      '',
      'Complete your verification at jig.cleva-ai.co.za/verification to fast-track orders.',
    );
  }

  return {
    text: lines.join('\n'),
    keyboard: KB_MAIN,
  };
}

// ── Linked User Message Handling ─────────────────────────────

async function handleLinkedMessage(
  clientId: string,
  msg: IncomingMessage,
  session: { id: string; pendingAction: PendingAction | null },
): Promise<ChatReply> {
  const text = msg.text;

  // Handle direct POP order selection from inline button
  if (text.startsWith('__pop_select_')) {
    const orderId = text.replace('__pop_select_', '');
    return handlePopSelectOrder(clientId, orderId, session.id);
  }

  // Handle order flow button callbacks (even without pending action, these start/resume order)
  if (text.startsWith('__ocat_') || text.startsWith('__oadd_') || text.startsWith('__oqty_') || text === '__order_more') {
    return handleOrderButtonCallback(clientId, text, session);
  }

  // Check for pending multi-step action first
  if (session.pendingAction) {
    return handlePendingAction(clientId, msg, session);
  }

  // Detect intent
  const { intent, entities } = await detectIntent(text);

  switch (intent) {
    case 'greeting':
      return handleGreeting(clientId);
    case 'help':
      return handleHelp();
    case 'order_list':
      return handleOrderList(clientId);
    case 'order_status':
      return handleOrderStatus(clientId, entities.orderId);
    case 'product_search':
      return handleProductSearch(clientId, entities.query);
    case 'product_price':
      return handleProductPrice(clientId, entities.productName);
    case 'payment_status':
      return handlePaymentStatus(clientId);
    case 'account_info':
      return handleAccountInfo(clientId);
    case 'restock_reminder':
      return handleRestockReminder(clientId);
    case 'order_create':
      return handleOrderCreateStart(clientId, session.id);
    case 'invoice_view':
      return handleInvoiceView(clientId, entities.orderId);
    case 'pop_upload':
      return handlePopUploadStart(clientId, session.id);
    case 'verification_status':
      return handleVerificationStatus(clientId);
    case 'unlink':
      return handleUnlink();
    case 'cancel':
      return { text: "Nothing to cancel. How can I help?", keyboard: KB_MAIN };
    default:
      return {
        text: "I'm not sure what you mean. Here's what I can do:",
        keyboard: KB_HELP,
      };
  }
}

// ── Intent Handlers ──────────────────────────────────────────

async function handleGreeting(clientId: string): Promise<ChatReply> {
  const client = await db.getClientById(clientId);
  const name = client?.contactPerson?.split(' ')[0] || 'there';

  const lines = [
    `Hey ${name}! Welcome back.`,
    '',
    'How can I help you today?',
  ];

  // Soft verification nudge for pending clients
  if (client && client.status === 'pending') {
    lines.push('', 'Tip: Verify your account at jig.cleva-ai.co.za/verification to fast-track orders.');
  }

  return {
    text: lines.join('\n'),
    keyboard: KB_MAIN,
  };
}

function handleHelp(): ChatReply {
  return {
    text: [
      "<b>JIG Bot - What I Can Do</b>",
      "",
      "<b>Ordering</b>",
      "  /order - Start a new order",
      "  /orders - View your recent orders",
      "  /pop - Upload proof of payment",
      "",
      "<b>Products</b>",
      "  /products - Browse the catalog",
      "  /prices - Check product prices",
      "  /restock - Restock predictions",
      "",
      "<b>Account</b>",
      "  /account - Your account info & tier",
      "  /payment - Payment overview",
      "  /verification - Document verification status",
      "",
      "Or just type naturally:",
      '  "Show my orders"',
      '  "How much is Purple Haze?"',
      '  "Upload POP for my last order"',
    ].join('\n'),
    keyboard: KB_HELP,
  };
}

async function handleOrderList(clientId: string): Promise<ChatReply> {
  const orders = await db.getOrdersByClient(clientId, 5);

  if (orders.length === 0) {
    return {
      text: [
        "You don't have any orders yet.",
        "",
        "Tap <b>New Order</b> to place your first!",
      ].join('\n'),
      keyboard: [
        [{ text: 'New Order', callback_data: 'cmd:order' }, { text: 'Browse Products', callback_data: 'cmd:products' }],
      ],
    };
  }

  const lines = orders.map((o) => {
    const date = new Date(o.createdAt).toLocaleDateString('en-ZA');
    const status = o.status.charAt(0).toUpperCase() + o.status.slice(1);
    const payment = o.paymentStatus === 'paid' ? 'Paid' : 'Unpaid';
    return `<b>${o.poNumber || o.id.slice(0, 8)}</b>  R${o.total.toFixed(2)}  ${status} | ${payment}  (${date})`;
  });

  return {
    text: [
      "<b>Your Recent Orders</b>",
      "",
      ...lines,
      "",
      `Showing ${orders.length} most recent.`,
    ].join('\n'),
    keyboard: [
      [{ text: 'New Order', callback_data: 'cmd:order' }, { text: 'Upload POP', callback_data: 'cmd:pop' }],
      [{ text: 'Main Menu', callback_data: 'cmd:help' }],
    ],
  };
}

async function handleOrderStatus(clientId: string, orderId?: string): Promise<ChatReply> {
  if (!orderId) {
    return {
      text: 'Which order? Include the PO number, e.g. "Status of JIG-000012"',
      keyboard: [[{ text: 'My Orders', callback_data: 'cmd:orders' }]],
    };
  }

  // Try to find by PO number or ID
  const orders = await db.getOrdersByClient(clientId, 100);
  const order = orders.find(
    (o) =>
      o.poNumber?.toLowerCase() === orderId.toLowerCase() ||
      o.id === orderId ||
      o.id.startsWith(orderId),
  );

  if (!order) {
    return {
      text: `Order "${orderId}" not found.`,
      keyboard: [[{ text: 'My Orders', callback_data: 'cmd:orders' }]],
    };
  }

  const statusEmoji = {
    pending: 'Pending',
    confirmed: 'Confirmed',
    processing: 'Processing',
    shipped: 'Shipped',
    delivered: 'Delivered',
    cancelled: 'Cancelled',
  }[order.status] || order.status;

  const paymentLabel = {
    pending: 'Awaiting Payment',
    partial: 'Partially Paid',
    paid: 'Paid',
    overdue: 'OVERDUE',
    refunded: 'Refunded',
  }[order.paymentStatus] || order.paymentStatus;

  const itemLines = order.items.map(
    (i) => `  ${i.name} x${i.quantity} @ R${i.unitPrice.toFixed(2)} = R${i.totalPrice.toFixed(2)}`,
  );

  const lines = [
    `<b>Order ${order.poNumber || order.id.slice(0, 8)}</b>`,
    "",
    `Status: <b>${statusEmoji}</b>`,
    `Payment: <b>${paymentLabel}</b>`,
    `Total: R${order.total.toFixed(2)} (incl. VAT)`,
    `Date: ${new Date(order.createdAt).toLocaleDateString('en-ZA')}`,
    "",
    "<b>Items:</b>",
    ...itemLines,
  ];

  if (order.trackingNumber) {
    lines.push('', `Courier: ${order.courierName || 'Courier'}`);
    lines.push(`Tracking: ${order.trackingNumber}`);
  }

  if (order.invoiceNumber) {
    lines.push('', `Invoice: ${order.invoiceNumber}`);
  }

  const kb: InlineKeyboard = [];
  if (order.paymentStatus !== 'paid') {
    kb.push([{ text: 'Upload POP for This Order', callback_data: `pop:${order.id}` }]);
  }
  kb.push([{ text: 'My Orders', callback_data: 'cmd:orders' }, { text: 'Main Menu', callback_data: 'cmd:help' }]);

  return { text: lines.join('\n'), keyboard: kb };
}

async function handleProductSearch(clientId: string, searchQuery?: string): Promise<ChatReply> {
  const products = await db.listProducts(true);

  if (products.length === 0) {
    return { text: "No products available at the moment.", keyboard: KB_BACK_MAIN };
  }

  let filtered = products;
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    filtered = products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        (p.strain && p.strain.toLowerCase().includes(q)) ||
        (p.subcategory && p.subcategory.toLowerCase().includes(q)),
    );
  }

  if (filtered.length === 0) {
    return {
      text: `No products found matching "${searchQuery}".`,
      keyboard: KB_CATEGORY,
    };
  }

  // Get client tier for pricing
  const client = await db.getClientById(clientId);
  const clientTierLabel = client
    ? client.tier.charAt(0).toUpperCase() + client.tier.slice(1)
    : 'Standard';

  // Group by category
  const byCategory = new Map<string, typeof filtered>();
  for (const p of filtered) {
    const cat = p.category;
    if (!byCategory.has(cat)) byCategory.set(cat, []);
    byCategory.get(cat)!.push(p);
  }

  const lines: string[] = [];
  for (const [cat, prods] of byCategory) {
    lines.push(`<b>━━ ${cat.toUpperCase()} ━━</b>`);
    lines.push('');
    for (const p of prods.slice(0, 8)) {
      const price = getClientPrice(p, clientTierLabel);
      const priceStr = price ? `<b>R${formatPrice(price)}</b>/${p.unit}` : '<i>Price TBC</i>';
      const stock = p.stockQuantity > 0 ? `${p.stockQuantity} in stock` : '<i>Out of stock</i>';
      lines.push(`<b>${p.name}</b>`);
      lines.push(`${priceStr}  |  ${stock}`);
      lines.push('');
    }
  }

  lines.push(`<i>${clientTierLabel} tier pricing</i>`);

  return {
    text: lines.join('\n'),
    keyboard: KB_CATEGORY,
  };
}

async function handleProductPrice(clientId: string, productName?: string): Promise<ChatReply> {
  const products = await db.listProducts(true);
  const client = await db.getClientById(clientId);
  const clientTierLabel = client
    ? client.tier.charAt(0).toUpperCase() + client.tier.slice(1)
    : 'Standard';

  if (!productName) {
    // Show price list for client's tier
    const lines = [`<b>━━ PRICE LIST ━━</b>`, `<i>${clientTierLabel} tier</i>`, ''];
    for (const p of products.slice(0, 15)) {
      const price = getClientPrice(p, clientTierLabel);
      if (price) {
        lines.push(`<b>${p.name}</b>`);
        lines.push(`R${formatPrice(price)}/${p.unit}`);
        lines.push('');
      }
    }
    if (products.length > 15) {
      lines.push(`<i>Showing 15 of ${products.length}. Search for a specific product.</i>`);
    }
    return { text: lines.join('\n'), keyboard: KB_CATEGORY };
  }

  const q = productName.toLowerCase();
  const matches = products.filter(
    (p) =>
      p.name.toLowerCase().includes(q) ||
      (p.strain && p.strain.toLowerCase().includes(q)),
  );

  if (matches.length === 0) {
    return { text: `No product found matching "${productName}". Type /prices for the full list.`, keyboard: KB_CATEGORY };
  }

  const lines: string[] = [];
  for (const p of matches.slice(0, 5)) {
    lines.push(`<b>${p.name}</b>  <i>${p.sku}</i>`);
    if (p.thcContent) lines.push(`THC: ${p.thcContent}`);
    if (p.priceTiers.length > 0) {
      for (const t of p.priceTiers) {
        const marker = t.tierName === clientTierLabel ? '  ← <b>You</b>' : '';
        lines.push(`  ${t.tierName}: <b>R${formatPrice(t.price)}</b>/${p.unit}${marker}`);
      }
    }
    lines.push(`Stock: ${p.stockQuantity > 0 ? `${p.stockQuantity} available` : '<i>Out of stock</i>'}`);
    lines.push('');
  }

  return {
    text: lines.join('\n'),
    keyboard: [[{ text: 'New Order', callback_data: 'cmd:order' }, { text: 'Main Menu', callback_data: 'cmd:help' }]],
  };
}

async function handlePaymentStatus(clientId: string): Promise<ChatReply> {
  const orders = await db.getOrdersByClient(clientId, 20);
  const unpaid = orders.filter((o) => o.paymentStatus !== 'paid' && o.status !== 'cancelled');
  const totalOutstanding = unpaid.reduce((sum, o) => sum + o.total, 0);

  if (unpaid.length === 0) {
    return {
      text: "All your orders are paid up. You're in good standing!",
      keyboard: KB_BACK_MAIN,
    };
  }

  const lines = [
    '<b>Payment Overview</b>',
    '',
    `Outstanding orders: <b>${unpaid.length}</b>`,
    `Total outstanding: <b>R${totalOutstanding.toFixed(2)}</b>`,
    '',
  ];

  for (const o of unpaid.slice(0, 5)) {
    const status = o.paymentStatus.charAt(0).toUpperCase() + o.paymentStatus.slice(1);
    lines.push(`${o.poNumber || o.id.slice(0, 8)} - R${o.total.toFixed(2)} (${status})`);
  }

  lines.push('', 'Tap <b>Upload POP</b> to submit proof of payment.');

  return {
    text: lines.join('\n'),
    keyboard: [
      [{ text: 'Upload POP', callback_data: 'cmd:pop' }],
      [{ text: 'My Orders', callback_data: 'cmd:orders' }, { text: 'Main Menu', callback_data: 'cmd:help' }],
    ],
  };
}

async function handleAccountInfo(clientId: string): Promise<ChatReply> {
  const client = await db.getClientById(clientId);
  if (!client) return { text: "Account not found.", keyboard: KB_BACK_MAIN };

  const worldState = await db.getWorldState(clientId);
  const tierLabel = (client.tier || 'standard').charAt(0).toUpperCase() + (client.tier || 'standard').slice(1);

  const lines = [
    `<b>${client.companyName}</b>`,
    '',
    `Contact: ${client.contactPerson}`,
    `Email: ${client.email}`,
    `Phone: ${client.phone}`,
    '',
    `Tier: <b>${tierLabel}</b>`,
    `Payment Terms: ${client.paymentTerms}`,
    `Status: ${client.status.charAt(0).toUpperCase() + client.status.slice(1)}`,
  ];

  if (worldState) {
    const lv = Number(worldState.lifetime_value) || 0;
    const to = Number(worldState.total_orders) || 0;
    lines.push('');
    lines.push(`Lifetime Value: R${lv.toFixed(2)}`);
    lines.push(`Total Orders: ${to}`);
  }

  // Verification nudge
  if (client.status === 'pending') {
    lines.push('');
    lines.push('Tip: Upload your documents at jig.cleva-ai.co.za/verification to fast-track orders.');
  }

  return {
    text: lines.join('\n'),
    keyboard: [
      [{ text: 'Verification Status', callback_data: 'cmd:verification' }],
      [{ text: 'Main Menu', callback_data: 'cmd:help' }],
    ],
  };
}

async function handleRestockReminder(clientId: string): Promise<ChatReply> {
  const state = await loadClientWorldState(clientId);
  if (!state) {
    return {
      text: "Not enough order history yet for restock predictions. Keep ordering and I'll learn your patterns!",
      keyboard: [[{ text: 'New Order', callback_data: 'cmd:order' }, { text: 'Main Menu', callback_data: 'cmd:help' }]],
    };
  }

  const predictions = predictRestock(state);

  if (predictions.length === 0) {
    return {
      text: "Not enough data to predict restock dates yet. I need at least 2 orders per product to learn your patterns.",
      keyboard: [[{ text: 'New Order', callback_data: 'cmd:order' }, { text: 'Main Menu', callback_data: 'cmd:help' }]],
    };
  }

  const lines = ['<b>Restock Predictions</b>', ''];
  for (const p of predictions.slice(0, 8)) {
    const date = new Date(p.predictedDate).toLocaleDateString('en-ZA');
    const urgency = p.daysUntilNeeded <= 3 ? ' [URGENT]' : p.daysUntilNeeded <= 7 ? ' [SOON]' : '';
    lines.push(`<b>${p.productName}</b>${urgency}`);
    lines.push(`  Reorder by: ${date} (~${p.daysUntilNeeded} days)`);
    lines.push(`  Suggested qty: ${p.suggestedQuantity} units`);
    lines.push('');
  }

  lines.push('Tap <b>New Order</b> to restock now.');

  return {
    text: lines.join('\n'),
    keyboard: [[{ text: 'New Order', callback_data: 'cmd:order' }, { text: 'Main Menu', callback_data: 'cmd:help' }]],
  };
}

async function handleOrderCreateStart(clientId: string, sessionId: string): Promise<ChatReply> {
  const client = await db.getClientById(clientId);
  const tierLabel = client
    ? client.tier.charAt(0).toUpperCase() + client.tier.slice(1)
    : 'Standard';

  // Set pending action - start with category selection
  await chatDb.updatePendingAction(sessionId, {
    type: 'order_create',
    items: [],
    step: 'select_category',
  });

  return {
    text: [
      "<b>New Order</b>",
      `Your tier: <b>${tierLabel}</b>`,
      "",
      "Choose a category to browse products:",
    ].join('\n'),
    keyboard: [
      [
        { text: 'Flower', callback_data: 'ocat:flower' },
        { text: 'Edibles', callback_data: 'ocat:edibles' },
      ],
      [
        { text: 'Pre-Rolls', callback_data: 'ocat:pre-rolls' },
        { text: 'All Products', callback_data: 'ocat:all' },
      ],
      [{ text: 'Cancel Order', callback_data: 'cancel_order' }],
    ],
  };
}

// ── Order Button Callback Handler ────────────────────────────

async function handleOrderButtonCallback(
  clientId: string,
  text: string,
  session: { id: string; pendingAction: PendingAction | null },
): Promise<ChatReply> {
  const client = await db.getClientById(clientId);
  const clientTierLabel = client
    ? client.tier.charAt(0).toUpperCase() + client.tier.slice(1)
    : 'Standard';

  // Ensure we have an order pending action
  let action = session.pendingAction;
  if (!action || action.type !== 'order_create') {
    // Start a fresh order
    await chatDb.updatePendingAction(session.id, {
      type: 'order_create',
      items: [],
      step: 'select_category',
    });
    action = { type: 'order_create', items: [], step: 'select_category' };
  }
  const orderAction = action as Extract<PendingAction, { type: 'order_create' }>;

  // ── Category selected ──────────────────────────────────────
  if (text.startsWith('__ocat_')) {
    const category = text.replace('__ocat_', '');
    const products = await db.listProducts(true);

    let filtered = products;
    if (category !== 'all') {
      filtered = products.filter((p) => p.category.toLowerCase() === category.toLowerCase());
    }

    const inStock = filtered.filter((p) => p.stockQuantity > 0);
    if (inStock.length === 0) {
      return {
        text: `No products in stock for "${category}".`,
        keyboard: [
          [{ text: 'All Products', callback_data: 'ocat:all' }],
          [{ text: 'Cancel Order', callback_data: 'cancel_order' }],
        ],
      };
    }

    // Build product listing text + buttons
    const listLines: string[] = [];
    for (const p of inStock.slice(0, 8)) {
      const price = getClientPrice(p, clientTierLabel);
      const priceStr = price ? `R${formatPrice(price)}/${p.unit}` : 'TBC';
      listLines.push(`<b>${p.name}</b>  ${priceStr}`);
    }

    const keyboard: InlineKeyboard = inStock.slice(0, 8).map((p) => {
      const price = getClientPrice(p, clientTierLabel);
      const priceStr = price ? `R${formatPrice(price)}` : 'TBC';
      return [{ text: `${p.name} - ${priceStr}`.slice(0, 45), callback_data: `oadd:${p.id}` }];
    });

    // Add cart summary if items exist
    if (orderAction.items.length > 0) {
      const total = orderAction.items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
      keyboard.push([
        { text: `Review Order (${orderAction.items.length} items, R${formatPrice(total)})`, callback_data: 'order_done' },
      ]);
    }

    keyboard.push([
      { text: 'Categories', callback_data: 'ocat:back' },
      { text: 'Cancel', callback_data: 'cancel_order' },
    ]);

    // Handle "back to categories"
    if (category === 'back') {
      return {
        text: "Choose a category:",
        keyboard: [
          [
            { text: 'Flower', callback_data: 'ocat:flower' },
            { text: 'Edibles', callback_data: 'ocat:edibles' },
          ],
          [
            { text: 'Pre-Rolls', callback_data: 'ocat:pre-rolls' },
            { text: 'All Products', callback_data: 'ocat:all' },
          ],
          ...(orderAction.items.length > 0
            ? [[{
                text: `Done (${orderAction.items.length} items)`,
                callback_data: 'order_done',
              }]]
            : []),
          [{ text: 'Cancel Order', callback_data: 'cancel_order' }],
        ],
      };
    }

    await chatDb.updatePendingAction(session.id, { ...orderAction, step: 'select_product', selectedCategory: category });

    const catLabel = category === 'all' ? 'ALL PRODUCTS' : category.toUpperCase();
    return {
      text: [
        `<b>━━ ${catLabel} ━━</b>`,
        '',
        ...listLines,
        '',
        '<i>Tap a product below to add it</i>',
      ].join('\n'),
      keyboard,
    };
  }

  // ── Product selected - show quantity options ──────────────
  if (text.startsWith('__oadd_')) {
    const productId = text.replace('__oadd_', '');
    const product = (await db.listProducts(true)).find((p) => p.id === productId);

    if (!product) {
      return { text: "Product not found. Please try again.", keyboard: KB_MAIN };
    }

    const price = getClientPrice(product, clientTierLabel);
    if (!price) {
      return { text: `Price not available for ${product.name}. Contact your sales rep.`, keyboard: KB_MAIN };
    }

    await chatDb.updatePendingAction(session.id, { ...orderAction, step: 'select_quantity', selectedProductId: productId });

    // Quantity preset buttons
    return {
      text: [
        `<b>${product.name}</b>`,
        `<b>R${formatPrice(price)}</b> per ${product.unit}`,
        `${product.stockQuantity} available`,
        '',
        'Select quantity:',
      ].join('\n'),
      keyboard: [
        [
          { text: '1', callback_data: `oqty:${productId}:1` },
          { text: '5', callback_data: `oqty:${productId}:5` },
          { text: '10', callback_data: `oqty:${productId}:10` },
        ],
        [
          { text: '25', callback_data: `oqty:${productId}:25` },
          { text: '50', callback_data: `oqty:${productId}:50` },
          { text: '100', callback_data: `oqty:${productId}:100` },
        ],
        [
          { text: 'Back to Products', callback_data: `ocat:${orderAction.selectedCategory || 'all'}` },
          { text: 'Cancel', callback_data: 'cancel_order' },
        ],
      ],
    };
  }

  // ── Quantity selected - add to cart ─────────────────────────
  if (text.startsWith('__oqty_')) {
    const parts = text.replace('__oqty_', '').split(':');
    const productId = parts[0];
    const quantity = Number(parts[1]);

    if (!productId || !quantity || quantity <= 0) {
      return { text: "Invalid selection. Please try again.", keyboard: KB_MAIN };
    }

    const product = (await db.listProducts(true)).find((p) => p.id === productId);
    if (!product) {
      return { text: "Product not found.", keyboard: KB_MAIN };
    }

    const price = getClientPrice(product, clientTierLabel);
    if (!price) {
      return { text: "Price not available.", keyboard: KB_MAIN };
    }

    // Add to cart
    const updatedItems = [
      ...orderAction.items,
      { productId: product.id, sku: product.sku, name: product.name, quantity, unitPrice: price },
    ];

    await chatDb.updatePendingAction(session.id, {
      ...orderAction,
      items: updatedItems,
      step: 'select_category',
      selectedProductId: undefined,
    });

    const runningTotal = updatedItems.reduce((s, i) => s + i.quantity * i.unitPrice, 0);

    // Cart summary
    const cartLines = updatedItems.map(
      (i) => `  ${i.name} x${i.quantity}  R${formatPrice(i.quantity * i.unitPrice)}`,
    );

    return {
      text: [
        `Added <b>${product.name}</b> x${quantity}`,
        '',
        `<b>━━ CART ━━</b>`,
        ...cartLines,
        ``,
        `<b>Subtotal: R${formatPrice(runningTotal)}</b>`,
      ].join('\n'),
      keyboard: [
        [{ text: 'Add More', callback_data: 'order_more' }],
        [{ text: `Review Order  R${formatPrice(runningTotal)}`, callback_data: 'order_done' }],
        [{ text: 'Cancel', callback_data: 'cancel_order' }],
      ],
    };
  }

  // ── "Add More" - back to categories ────────────────────────
  if (text === '__order_more') {
    return {
      text: "Choose a category:",
      keyboard: [
        [
          { text: 'Flower', callback_data: 'ocat:flower' },
          { text: 'Edibles', callback_data: 'ocat:edibles' },
        ],
        [
          { text: 'Pre-Rolls', callback_data: 'ocat:pre-rolls' },
          { text: 'All Products', callback_data: 'ocat:all' },
        ],
        ...(orderAction.items.length > 0
          ? [[{
              text: `Done (${orderAction.items.length} items, R${orderAction.items.reduce((s, i) => s + i.quantity * i.unitPrice, 0).toFixed(2)})`,
              callback_data: 'order_done',
            }]]
          : []),
        [{ text: 'Cancel Order', callback_data: 'cancel_order' }],
      ],
    };
  }

  return { text: "Something went wrong. Type /cancel to start over.", keyboard: KB_MAIN };
}

async function handleInvoiceView(clientId: string, orderId?: string): Promise<ChatReply> {
  if (!orderId) {
    const orders = await db.getOrdersByClient(clientId, 5);
    const withInvoice = orders.filter((o) => o.invoiceNumber);

    if (withInvoice.length === 0) {
      return {
        text: "No invoices available yet. Invoices are generated when orders are confirmed by the JIG team.",
        keyboard: KB_BACK_MAIN,
      };
    }

    const lines = ['<b>Recent Invoices</b>', ''];
    for (const o of withInvoice) {
      const date = new Date(o.createdAt).toLocaleDateString('en-ZA');
      lines.push(`${o.invoiceNumber} (${o.poNumber || o.id.slice(0, 8)}) - R${o.total.toFixed(2)} - ${date}`);
    }
    lines.push('', 'For full PDF invoices, visit jig.cleva-ai.co.za');
    return { text: lines.join('\n'), keyboard: KB_BACK_MAIN };
  }

  // Find specific order
  const orders = await db.getOrdersByClient(clientId, 100);
  const order = orders.find(
    (o) =>
      o.invoiceNumber?.toLowerCase() === orderId.toLowerCase() ||
      o.poNumber?.toLowerCase() === orderId.toLowerCase() ||
      o.id === orderId,
  );

  if (!order || !order.invoiceNumber) {
    return {
      text: `Invoice not found for "${orderId}". Invoices are generated when orders are confirmed.`,
      keyboard: [[{ text: 'My Orders', callback_data: 'cmd:orders' }]],
    };
  }

  return {
    text: [
      `<b>Invoice ${order.invoiceNumber}</b>`,
      `PO: ${order.poNumber || 'N/A'}`,
      `Date: ${new Date(order.createdAt).toLocaleDateString('en-ZA')}`,
      '',
      ...order.items.map((i) => `${i.name} x${i.quantity} = R${i.totalPrice.toFixed(2)}`),
      '',
      `Subtotal: R${order.subtotal.toFixed(2)}`,
      `VAT (15%): R${order.vatAmount.toFixed(2)}`,
      `<b>Total: R${order.total.toFixed(2)}</b>`,
      '',
      `Payment: ${order.paymentStatus}`,
      '',
      'For a full PDF invoice, visit jig.cleva-ai.co.za',
    ].join('\n'),
    keyboard: order.paymentStatus !== 'paid'
      ? [[{ text: 'Upload POP', callback_data: `pop:${order.id}` }], ...KB_BACK_MAIN]
      : KB_BACK_MAIN,
  };
}

// ── POP Upload Flow ──────────────────────────────────────────

async function handlePopUploadStart(clientId: string, sessionId: string): Promise<ChatReply> {
  const orders = await db.getOrdersByClient(clientId, 20);
  const unpaid = orders.filter((o) => o.paymentStatus !== 'paid' && o.status !== 'cancelled');

  if (unpaid.length === 0) {
    return {
      text: "All your orders are paid up! No POP needed.",
      keyboard: KB_MAIN,
    };
  }

  // If only 1 unpaid order, go straight to file upload
  if (unpaid.length === 1) {
    const order = unpaid[0];
    await chatDb.updatePendingAction(sessionId, {
      type: 'pop_upload',
      orderId: order.id,
      step: 'awaiting_file',
    });

    return {
      text: [
        `<b>Upload POP for ${order.poNumber || order.id.slice(0, 8)}</b>`,
        `Amount: R${order.total.toFixed(2)}`,
        '',
        'Please send a <b>photo</b> or <b>PDF</b> of your proof of payment.',
        '',
        'Accepted formats: JPEG, PNG, WebP, PDF (max 10MB)',
        'Type /cancel to abort.',
      ].join('\n'),
    };
  }

  // Multiple unpaid - show selection buttons
  const keyboard: InlineKeyboard = unpaid.slice(0, 6).map((o) => [
    { text: `${o.poNumber || o.id.slice(0, 8)} - R${o.total.toFixed(2)}`, callback_data: `pop:${o.id}` },
  ]);
  keyboard.push([{ text: 'Cancel', callback_data: 'cancel_order' }]);

  return {
    text: [
      "<b>Upload Proof of Payment</b>",
      '',
      'Select the order you want to upload POP for:',
    ].join('\n'),
    keyboard,
  };
}

async function handlePopSelectOrder(clientId: string, orderId: string, sessionId: string): Promise<ChatReply> {
  const order = await db.getOrderById(orderId);
  if (!order || order.clientId !== clientId) {
    return { text: "Order not found.", keyboard: KB_MAIN };
  }

  await chatDb.updatePendingAction(sessionId, {
    type: 'pop_upload',
    orderId: order.id,
    step: 'awaiting_file',
  });

  return {
    text: [
      `<b>Upload POP for ${order.poNumber || order.id.slice(0, 8)}</b>`,
      `Amount: R${order.total.toFixed(2)}`,
      '',
      'Please send a <b>photo</b> or <b>PDF</b> of your proof of payment.',
      '',
      'Accepted formats: JPEG, PNG, WebP, PDF (max 10MB)',
      'Type /cancel to abort.',
    ].join('\n'),
  };
}

// ── Verification Status ──────────────────────────────────────

async function handleVerificationStatus(clientId: string): Promise<ChatReply> {
  const { documents, allRequiredUploaded, allApproved } = await db.getClientVerificationStatus(clientId);

  const requiredTypes: Array<{ key: DocumentType; label: string }> = [
    { key: 'cipc_registration', label: 'CIPC Registration' },
    { key: 'tax_clearance', label: 'Tax Clearance / VAT Certificate' },
    { key: 'id_document', label: 'Director ID Copy' },
    { key: 'proof_of_address', label: 'Proof of Address' },
    { key: 'bank_confirmation', label: 'Bank Confirmation Letter' },
  ];

  const optionalTypes: Array<{ key: DocumentType; label: string }> = [
    { key: 'cannabis_license', label: 'Cannabis License' },
    { key: 'bee_certificate', label: 'BEE Certificate' },
  ];

  const docMap = new Map(documents.map((d) => [d.docType, d]));
  const approvedCount = requiredTypes.filter((t) => docMap.get(t.key)?.status === 'approved').length;

  const lines = [
    '<b>Verification Status</b>',
    `Progress: ${approvedCount} / ${requiredTypes.length} required documents verified`,
    '',
  ];

  if (allApproved) {
    lines.push('Your account is fully verified!');
    lines.push('');
  }

  lines.push('<b>Required Documents:</b>');
  for (const t of requiredTypes) {
    const doc = docMap.get(t.key);
    let status = 'Not uploaded';
    if (doc) {
      if (doc.status === 'approved') status = 'Approved';
      else if (doc.status === 'rejected') status = `Rejected${doc.adminNotes ? ` - ${doc.adminNotes}` : ''}`;
      else status = 'Pending review';
    }
    lines.push(`  ${t.label}: ${status}`);
  }

  lines.push('');
  lines.push('<b>Optional Documents:</b>');
  for (const t of optionalTypes) {
    const doc = docMap.get(t.key);
    const status = doc ? (doc.status === 'approved' ? 'Approved' : doc.status === 'rejected' ? 'Rejected' : 'Pending') : 'Not uploaded';
    lines.push(`  ${t.label}: ${status}`);
  }

  if (!allRequiredUploaded || !allApproved) {
    lines.push('');
    lines.push('Upload your documents at jig.cleva-ai.co.za/verification');
  }

  return { text: lines.join('\n'), keyboard: KB_BACK_MAIN };
}

function handleUnlink(): ChatReply {
  return {
    text: [
      "To unlink your account, please contact your admin or use the JIG portal at jig.cleva-ai.co.za",
      "",
      "This will disconnect your chat account from JIG.",
      "You'll need to verify again to reconnect.",
    ].join('\n'),
    keyboard: KB_BACK_MAIN,
  };
}

// ── Registration Flow ────────────────────────────────────────

const DOC_UPLOAD_SEQUENCE: Array<{ key: string; label: string; required: boolean }> = [
  { key: 'cipc_registration', label: 'CIPC Registration Certificate', required: true },
  { key: 'tax_clearance', label: 'Tax Clearance / VAT Certificate', required: true },
  { key: 'id_document', label: 'Director / Owner ID Copy', required: true },
  { key: 'proof_of_address', label: 'Proof of Business Address', required: true },
  { key: 'bank_confirmation', label: 'Bank Confirmation Letter', required: true },
  { key: 'cannabis_license', label: 'Cannabis License / SAHPRA Permit', required: false },
  { key: 'bee_certificate', label: 'BEE Certificate', required: false },
];

async function handleRegistrationStep(
  linkId: string,
  msg: IncomingMessage,
  session: { id: string; pendingAction: PendingAction | null },
): Promise<ChatReply> {
  const action = session.pendingAction as Extract<PendingAction, { type: 'registration' }>;
  const text = msg.text.trim();

  // Allow cancel at any point
  if (text.toLowerCase() === '/cancel' || text.toLowerCase() === 'cancel') {
    await chatDb.updatePendingAction(session.id, null);
    return {
      text: "Registration cancelled. Type /start to begin again.",
    };
  }

  switch (action.step) {
    case 'company_name': {
      if (text.length < 2) return { text: "Please enter your company name." };
      await chatDb.updatePendingAction(session.id, {
        ...action,
        step: 'contact_name',
        data: { ...action.data, companyName: text },
      });
      return {
        text: `<b>${text}</b> - got it.\n\nWhat is your <b>full name</b>? (contact person)`,
      };
    }

    case 'contact_name': {
      if (text.length < 2) return { text: "Please enter your full name." };
      await chatDb.updatePendingAction(session.id, {
        ...action,
        step: 'email',
        data: { ...action.data, contactPerson: text },
      });
      return {
        text: `Thanks ${text.split(' ')[0]}.\n\nWhat is your <b>business email</b>?`,
      };
    }

    case 'email': {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(text)) {
        return { text: "That doesn't look like a valid email. Please try again." };
      }
      const email = text.toLowerCase();

      // Check if email already exists
      const existing = await db.getClientByEmail(email);
      if (existing) {
        await chatDb.updatePendingAction(session.id, null);
        // Switch to existing client flow
        await chatDb.updateLinkState(linkId, 'pending_email');
        return {
          text: [
            "That email is already registered with JIG!",
            "",
            "Let's link your account instead. I've sent a verification code to your email.",
          ].join('\n'),
        };
      }

      // Send OTP to verify email ownership
      try {
        await requestOtp(email, 'login');
      } catch {
        return { text: "Failed to send verification code. Please try again." };
      }

      await chatDb.updatePendingAction(session.id, {
        ...action,
        step: 'verify_otp',
        data: { ...action.data, email },
      });
      return {
        text: [
          `A 6-digit code has been sent to <b>${email}</b>.`,
          "",
          "Please enter the code to verify your email.",
        ].join('\n'),
      };
    }

    case 'verify_otp': {
      if (!/^\d{6}$/.test(text)) {
        return { text: "Please enter the 6-digit code, or type /cancel to start over." };
      }

      const email = action.data.email!;
      const result = await db.verifyOtp(email, text);
      if (!result.valid) {
        await db.incrementOtpAttempts(email);
        return { text: "Invalid or expired code. Please try again." };
      }

      await chatDb.updatePendingAction(session.id, {
        ...action,
        step: 'phone',
        data: action.data,
      });
      return {
        text: "Email verified!\n\nWhat is your <b>phone number</b>?",
      };
    }

    case 'phone': {
      const phone = text.replace(/\s/g, '');
      if (phone.length < 9) {
        return { text: "Please enter a valid phone number." };
      }

      await chatDb.updatePendingAction(session.id, {
        ...action,
        step: 'reg_number',
        data: { ...action.data, phone },
      });
      return {
        text: "What is your <b>company registration number</b>?\n\n<i>Type 'skip' if you don't have it handy.</i>",
      };
    }

    case 'reg_number': {
      const regNum = text.toLowerCase() === 'skip' ? undefined : text;

      // Create the client
      try {
        const client = await db.createClient({
          companyName: action.data.companyName!,
          contactPerson: action.data.contactPerson!,
          email: action.data.email!,
          phone: action.data.phone!,
          registrationNumber: regNum,
        });

        // Auto-link the account
        await chatDb.setLinkClient(linkId, client.id);

        // Clear registration action, start doc upload
        await chatDb.updatePendingAction(session.id, {
          type: 'doc_upload',
          docIndex: 0,
          step: 'awaiting_file',
        });

        // Notify admins
        notifyAdmins(
          `<b>New Client Registration</b>\n\n${client.companyName}\n${client.contactPerson}\n${client.email}\n\nReview at jig.cleva-ai.co.za/admin/verifications`,
        ).catch(() => {});

        // Emit n8n event
        emitEvent('client.created', {
          clientId: client.id,
          companyName: client.companyName,
          contactPerson: client.contactPerson,
          email: client.email,
          phone: client.phone,
          registrationNumber: regNum,
          source: 'telegram',
        });

        return {
          text: [
            `<b>Account Created!</b>`,
            ``,
            `Welcome to JIG, ${action.data.contactPerson!.split(' ')[0]}!`,
            ``,
            `<b>Next: Upload your compliance documents</b>`,
            `This unlocks ordering. Let's do it now - it's quick.`,
            ``,
            `<b>1/5</b> - Please send your <b>${DOC_UPLOAD_SEQUENCE[0].label}</b>`,
            `(Photo or PDF)`,
            ``,
            `<i>Type 'skip' to do this later on the web portal.</i>`,
          ].join('\n'),
        };
      } catch (err) {
        console.error('[Registration] createClient failed:', err);
        await chatDb.updatePendingAction(session.id, null);
        return {
          text: "Something went wrong creating your account. Please try again with /start or contact support.",
        };
      }
    }

    default:
      await chatDb.updatePendingAction(session.id, null);
      return { text: "Something went wrong. Type /start to try again." };
  }
}

// ── Doc Upload via Chat ─────────────────────────────────────

async function handleDocUploadStep(
  clientId: string,
  msg: IncomingMessage,
  session: { id: string; pendingAction: PendingAction | null },
): Promise<ChatReply> {
  const action = session.pendingAction as Extract<PendingAction, { type: 'doc_upload' }>;
  const text = msg.text.trim().toLowerCase();

  // Cancel
  if (text === '/cancel' || text === 'cancel') {
    await chatDb.updatePendingAction(session.id, null);
    return {
      text: "Document upload paused. You can upload remaining docs anytime at jig.cleva-ai.co.za/verification or type /verification.",
      keyboard: KB_MAIN,
    };
  }

  // Skip current doc
  if (text === 'skip' || text === '__reg_skip_doc') {
    const currentDoc = DOC_UPLOAD_SEQUENCE[action.docIndex];

    // If required doc, only allow skip if they want to do it on web
    if (currentDoc.required) {
      // Move to next doc or finish
      const nextIndex = action.docIndex + 1;
      if (nextIndex >= DOC_UPLOAD_SEQUENCE.length) {
        await chatDb.updatePendingAction(session.id, null);
        return {
          text: [
            "You can upload remaining documents at:",
            "jig.cleva-ai.co.za/verification",
            "",
            "Once all required docs are approved, your account will be activated.",
          ].join('\n'),
          keyboard: KB_MAIN,
        };
      }

      await chatDb.updatePendingAction(session.id, { ...action, docIndex: nextIndex });
      const nextDoc = DOC_UPLOAD_SEQUENCE[nextIndex];
      const label = nextDoc.required ? `<b>${nextIndex + 1}/5</b>` : '<i>Optional</i>';
      return {
        text: [
          `Skipped. You can upload it later on the web portal.`,
          ``,
          `${label} - Send your <b>${nextDoc.label}</b>`,
          nextDoc.required ? '' : "<i>Type 'skip' to skip optional docs.</i>",
        ].filter(Boolean).join('\n'),
      };
    }

    // Optional doc - skip freely
    const nextIndex = action.docIndex + 1;
    if (nextIndex >= DOC_UPLOAD_SEQUENCE.length) {
      await chatDb.updatePendingAction(session.id, null);
      return {
        text: [
          "<b>Documents Submitted!</b>",
          "",
          "Our team will review your documents shortly.",
          "You'll get a notification when your account is activated.",
          "",
          "In the meantime, feel free to browse our products!",
        ].join('\n'),
        keyboard: KB_MAIN,
      };
    }

    await chatDb.updatePendingAction(session.id, { ...action, docIndex: nextIndex });
    const nextDoc = DOC_UPLOAD_SEQUENCE[nextIndex];
    return {
      text: `<i>Optional</i> - Send your <b>${nextDoc.label}</b>, or type 'skip'.`,
    };
  }

  // Expect a file
  const fileId = msg.photoFileId || msg.documentFileId;
  if (!fileId) {
    const currentDoc = DOC_UPLOAD_SEQUENCE[action.docIndex];
    return {
      text: [
        `Please send a <b>photo</b> or <b>PDF</b> of your <b>${currentDoc.label}</b>.`,
        "",
        "Type 'skip' to upload later via the web portal.",
      ].join('\n'),
    };
  }

  // Download the file
  let fileBuffer: Buffer | null = null;
  let fileName = msg.documentFileName || `doc-${Date.now()}.jpg`;
  let mimeType = msg.documentMimeType || 'image/jpeg';

  if (msg.platform === 'telegram') {
    const fileInfo = await telegram.getFile(fileId);
    if (!fileInfo.ok || !fileInfo.result?.file_path) {
      return { text: "Failed to download file. Please try again." };
    }
    fileBuffer = await telegram.downloadFile(fileInfo.result.file_path);
    if (!msg.documentMimeType) {
      const ext = path.extname(fileInfo.result.file_path).toLowerCase();
      if (ext === '.pdf') mimeType = 'application/pdf';
      else if (ext === '.png') mimeType = 'image/png';
      else if (ext === '.webp') mimeType = 'image/webp';
      else mimeType = 'image/jpeg';
    }
    if (!msg.documentFileName) {
      fileName = `doc-${Date.now()}${path.extname(fileInfo.result.file_path) || '.jpg'}`;
    }
  } else {
    fileBuffer = await downloadWhatsAppMedia(fileId);
    if (!msg.documentFileName) {
      const ext = mimeType === 'application/pdf' ? '.pdf' : mimeType === 'image/png' ? '.png' : '.jpg';
      fileName = `doc-${Date.now()}${ext}`;
    }
  }

  if (!fileBuffer) {
    return { text: "Failed to download the file. Please try again." };
  }

  // Save file
  const uploadDir = path.join(process.cwd(), 'uploads', 'documents');
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
  const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e6)}${path.extname(fileName)}`;
  const filePath = path.join(uploadDir, uniqueName);
  fs.writeFileSync(filePath, fileBuffer);

  // Save to database
  const docType = DOC_UPLOAD_SEQUENCE[action.docIndex].key;
  try {
    await db.upsertClientDocument({
      clientId,
      docType: docType as import('../../world-model/types').DocumentType,
      fileName,
      filePath: `/uploads/documents/${uniqueName}`,
      fileSize: fileBuffer.length,
      mimeType,
    });
  } catch (err) {
    console.error('[DocUpload] upsertClientDocument failed:', err);
    return { text: "Failed to save document. Please try again." };
  }

  // Move to next doc
  const nextIndex = action.docIndex + 1;
  const currentDoc = DOC_UPLOAD_SEQUENCE[action.docIndex];

  if (nextIndex >= DOC_UPLOAD_SEQUENCE.length) {
    // All done
    await chatDb.updatePendingAction(session.id, null);
    return {
      text: [
        `<b>${currentDoc.label}</b> - received!`,
        "",
        "<b>All Documents Submitted!</b>",
        "",
        "Our team will review your documents shortly.",
        "You'll get a notification when your account is activated.",
        "",
        "In the meantime, feel free to browse our products!",
      ].join('\n'),
      keyboard: [
        [{ text: 'Browse Products', callback_data: 'cmd:products' }],
        [{ text: 'Main Menu', callback_data: 'cmd:help' }],
      ],
    };
  }

  await chatDb.updatePendingAction(session.id, { ...action, docIndex: nextIndex });
  const nextDoc = DOC_UPLOAD_SEQUENCE[nextIndex];
  const progress = nextDoc.required
    ? `<b>${Math.min(nextIndex + 1, 5)}/5</b>`
    : '<i>Optional</i>';

  return {
    text: [
      `<b>${currentDoc.label}</b> - received!`,
      "",
      `${progress} - Send your <b>${nextDoc.label}</b>`,
      !nextDoc.required ? "\n<i>Type 'skip' to skip optional docs.</i>" : '',
    ].filter(Boolean).join('\n'),
    keyboard: !nextDoc.required
      ? [[{ text: 'Skip', callback_data: 'reg_skip_doc' }, { text: 'Cancel', callback_data: 'cancel_order' }]]
      : undefined,
  };
}

/** Notify all admin-linked Telegram users. */
async function notifyAdmins(text: string): Promise<void> {
  const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map((e) => e.trim()).filter(Boolean);
  for (const email of adminEmails) {
    const client = await db.getClientByEmail(email);
    if (client) {
      const links = await chatDb.getLinksByClientId(client.id);
      for (const link of links) {
        if (link.platform === 'telegram') {
          await telegram.sendMessage(link.platformUserId, text, 'HTML').catch(() => {});
        }
      }
    }
  }
}

// ── Multi-Step Action Handler ────────────────────────────────

async function handlePendingAction(
  clientId: string,
  msg: IncomingMessage,
  session: { id: string; pendingAction: PendingAction | null },
): Promise<ChatReply> {
  const action = session.pendingAction!;
  const text = msg.text;

  // Allow cancel from any pending action
  if (text.trim().toLowerCase() === '/cancel' || text.trim().toLowerCase() === 'cancel') {
    await chatDb.updatePendingAction(session.id, null);
    const label = action.type === 'order_create' ? 'Order' : 'Upload';
    return { text: `${label} cancelled.`, keyboard: KB_MAIN };
  }

  if (action.type === 'order_create') {
    return handleOrderCreateStep(clientId, msg.text, action, session.id);
  }

  if (action.type === 'pop_upload') {
    return handlePopUploadStep(clientId, msg, action, session.id);
  }

  return { text: "Something went wrong. Type /cancel to start over.", keyboard: KB_MAIN };
}

// ── POP Upload Step Handler ──────────────────────────────────

async function handlePopUploadStep(
  clientId: string,
  msg: IncomingMessage,
  action: Extract<PendingAction, { type: 'pop_upload' }>,
  sessionId: string,
): Promise<ChatReply> {
  // Check if user sent a pop: selection from inline keyboard
  if (msg.text.startsWith('__pop_select_')) {
    const orderId = msg.text.replace('__pop_select_', '');
    return handlePopSelectOrder(clientId, orderId, sessionId);
  }

  if (action.step === 'awaiting_file') {
    // Check if a file was attached
    const fileId = msg.photoFileId || msg.documentFileId;
    if (!fileId) {
      return {
        text: [
          "Please send a <b>photo</b> or <b>PDF</b> of your proof of payment.",
          "",
          "You can:",
          "  - Take a photo of your bank transfer receipt",
          "  - Send a screenshot of the EFT confirmation",
          "  - Upload a PDF bank statement",
          "",
          "Type /cancel to abort.",
        ].join('\n'),
      };
    }

    // Validate MIME type for documents
    if (msg.documentMimeType && !POP_ALLOWED_MIMES.includes(msg.documentMimeType)) {
      return {
        text: `That file type (${msg.documentMimeType}) isn't supported. Please send a JPEG, PNG, WebP image or PDF.`,
      };
    }

    // Download file from platform
    let fileBuffer: Buffer | null = null;
    let fileName = msg.documentFileName || `pop-${Date.now()}.jpg`;
    let mimeType = msg.documentMimeType || 'image/jpeg';

    if (msg.platform === 'telegram') {
      // Download from Telegram
      const fileInfo = await telegram.getFile(fileId);
      if (!fileInfo.ok || !fileInfo.result?.file_path) {
        return { text: "Failed to download the file from Telegram. Please try again." };
      }
      fileBuffer = await telegram.downloadFile(fileInfo.result.file_path);

      // Infer MIME from file path extension
      if (!msg.documentMimeType) {
        const ext = path.extname(fileInfo.result.file_path).toLowerCase();
        if (ext === '.pdf') mimeType = 'application/pdf';
        else if (ext === '.png') mimeType = 'image/png';
        else if (ext === '.webp') mimeType = 'image/webp';
        else mimeType = 'image/jpeg';
      }

      if (!msg.documentFileName) {
        fileName = `pop-${Date.now()}${path.extname(fileInfo.result.file_path) || '.jpg'}`;
      }
    } else {
      // WhatsApp - media download via Graph API (file IDs are media IDs)
      fileBuffer = await downloadWhatsAppMedia(fileId);
      if (!msg.documentFileName) {
        const ext = mimeType === 'application/pdf' ? '.pdf' : mimeType === 'image/png' ? '.png' : '.jpg';
        fileName = `pop-${Date.now()}${ext}`;
      }
    }

    if (!fileBuffer) {
      return { text: "Failed to download the file. Please try sending it again." };
    }

    // Save file to disk
    const uploadDir = path.join(process.cwd(), 'uploads', 'pop');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e6)}${path.extname(fileName)}`;
    const filePath = path.join(uploadDir, uniqueName);
    fs.writeFileSync(filePath, fileBuffer);

    // Create POP record in database
    try {
      await db.createPopUpload({
        orderId: action.orderId,
        clientId,
        fileName,
        filePath: `/uploads/pop/${uniqueName}`,
        fileSize: fileBuffer.length,
        mimeType,
      });
    } catch (err) {
      console.error('[ChatEngine] createPopUpload failed:', err);
      return {
        text: "Failed to save your upload. Please try again or upload via the web portal at jig.cleva-ai.co.za",
        keyboard: KB_MAIN,
      };
    }

    // Clear pending action
    await chatDb.updatePendingAction(sessionId, null);

    // Get order info for the success message
    const order = await db.getOrderById(action.orderId);
    const poLabel = order?.poNumber || action.orderId.slice(0, 8);

    return {
      text: [
        "<b>POP Uploaded Successfully!</b>",
        '',
        `Order: ${poLabel}`,
        `File: ${fileName}`,
        '',
        'Your proof of payment has been submitted for review. The JIG team will verify it shortly.',
      ].join('\n'),
      keyboard: KB_AFTER_ORDER,
    };
  }

  return { text: "Something went wrong. Type /cancel to start over.", keyboard: KB_MAIN };
}

// ── Order Create Step Handler ────────────────────────────────

async function handleOrderCreateStep(
  clientId: string,
  text: string,
  action: Extract<PendingAction, { type: 'order_create' }>,
  sessionId: string,
): Promise<ChatReply> {
  const trimmed = text.trim().toLowerCase();

  // User says "done" - show summary, or "confirm" - place order
  if (trimmed === 'done' || trimmed === 'confirm') {
    if (action.items.length === 0) {
      return {
        text: "No items added yet. Add items like \"Purple Haze 10\" or tap Cancel.",
        keyboard: KB_ORDER_ADDING,
      };
    }

    if (action.step === 'confirm') {
      // Place the order
      try {
        const client = await db.getClientById(clientId);
        if (!client) return { text: "Account error. Please try again.", keyboard: KB_MAIN };

        const subtotal = action.items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
        const vatAmount = Math.round(subtotal * 0.15 * 100) / 100;
        const total = subtotal + vatAmount;

        const { total: orderCount } = await db.listAllOrders({ limit: 0 });
        const orderId = `JIG-${String(orderCount + 1).padStart(6, '0')}`;
        const order = await db.createOrder({
          id: orderId,
          clientId,
          items: action.items.map((i) => ({
            productId: i.productId,
            sku: i.sku,
            name: i.name,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
            totalPrice: i.quantity * i.unitPrice,
          })),
          subtotal,
          vatAmount,
          total,
          status: 'pending',
          paymentStatus: 'pending',
          paymentMethod: client.paymentTerms === 'cod' ? 'eft' : 'eft',
          deliveryAddress: client.deliveryAddress ?? client.address ?? {
            street: '', city: '', province: '', postalCode: '', country: 'South Africa',
          },
        });

        await chatDb.updatePendingAction(sessionId, null);

        return {
          text: [
            "<b>Order Placed!</b>",
            '',
            `PO: <b>${order.poNumber}</b>`,
            `Total: R${order.total.toFixed(2)} (incl. VAT)`,
            '',
            'Your order is pending confirmation from the JIG team.',
            '',
            `Upload your proof of payment to speed things up:`,
          ].join('\n'),
          keyboard: [
            [{ text: 'Upload POP Now', callback_data: `pop:${order.id}` }],
            [{ text: 'My Orders', callback_data: 'cmd:orders' }, { text: 'Main Menu', callback_data: 'cmd:help' }],
          ],
        };
      } catch (err) {
        console.error('[ChatEngine] createOrder failed:', err);
        await chatDb.updatePendingAction(sessionId, null);
        return {
          text: "Failed to place order. Please try again or order via jig.cleva-ai.co.za",
          keyboard: KB_MAIN,
        };
      }
    }

    // Any other step (select_category, select_product, select_quantity, adding_items)
    // Show order summary and ask for confirmation
    const subtotal = action.items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
    const vat = Math.round(subtotal * 0.15 * 100) / 100;
    const total = subtotal + vat;

    const lines = [
      '<b>Order Summary</b>',
      '',
      ...action.items.map(
        (i) => `  ${i.name} x${i.quantity} @ R${i.unitPrice.toFixed(2)} = R${(i.quantity * i.unitPrice).toFixed(2)}`,
      ),
      '',
      `Subtotal: R${subtotal.toFixed(2)}`,
      `VAT (15%): R${vat.toFixed(2)}`,
      `<b>Total: R${total.toFixed(2)}</b>`,
      '',
      'Tap <b>Confirm & Place Order</b> to submit.',
    ];

    await chatDb.updatePendingAction(sessionId, { ...action, step: 'confirm' });
    return { text: lines.join('\n'), keyboard: KB_ORDER_CONFIRM };
  }

  // Parse item: "Purple Haze 10", "10 Purple Haze", etc.
  const products = await db.listProducts(true);

  // Get client's tier for pricing
  const client = await db.getClientById(clientId);
  const clientTierLabel = client
    ? client.tier.charAt(0).toUpperCase() + client.tier.slice(1)
    : 'Standard';

  let productQuery: string | undefined;
  let quantity: number | undefined;

  // Pattern 1: "10 Purple Haze" — qty first
  const qtyFirstMatch = text.match(/^(\d+)\s+(.+)$/);
  // Pattern 2: "Purple Haze 10" — qty last
  const qtyLastMatch = text.match(/^(.+?)\s+(\d+)$/);
  // Pattern 3: "Purple Haze 1kg" or "OG Kush 250g" or "5gr"
  const qtyUnitLastMatch = text.match(/^(.+?)\s+(\d+)\s*(kg|gr(?:ams?)?|g|packs?|units?|boxes?|cases?)$/i);
  // Pattern 4: "1kg Purple Haze"
  const qtyUnitFirstMatch = text.match(/^(\d+)\s*(kg|gr(?:ams?)?|g|packs?|units?|boxes?|cases?)\s+(.+)$/i);

  if (qtyUnitFirstMatch) {
    quantity = Number(qtyUnitFirstMatch[1]);
    productQuery = qtyUnitFirstMatch[3].trim().toLowerCase();
  } else if (qtyUnitLastMatch) {
    productQuery = qtyUnitLastMatch[1].trim().toLowerCase();
    quantity = Number(qtyUnitLastMatch[2]);
  } else if (qtyFirstMatch) {
    quantity = Number(qtyFirstMatch[1]);
    productQuery = qtyFirstMatch[2].trim().toLowerCase();
  } else if (qtyLastMatch) {
    productQuery = qtyLastMatch[1].trim().toLowerCase();
    quantity = Number(qtyLastMatch[2]);
  }

  if (!productQuery || !quantity) {
    return {
      text: [
        'Please type a product name and quantity, e.g.:',
        '  "Purple Haze 10"',
        '  "5 OG Kush"',
        '',
        'Or type /products to see what\'s available.',
      ].join('\n'),
      keyboard: KB_ORDER_ADDING,
    };
  }

  if (quantity <= 0 || quantity > 10000) {
    return {
      text: "Please enter a valid quantity between 1 and 10,000.",
      keyboard: KB_ORDER_ADDING,
    };
  }

  // Find best matching product
  const match = findBestProduct(products, productQuery);

  if (!match) {
    return {
      text: `Product "${productQuery}" not found. Type /products to see available items.`,
      keyboard: KB_ORDER_ADDING,
    };
  }

  if (match.stockQuantity <= 0) {
    return {
      text: `${match.name} is currently out of stock. Try a different product.`,
      keyboard: KB_ORDER_ADDING,
    };
  }

  // Get tier-based price (matching the orders.routes.ts logic)
  const price = getClientPrice(match, clientTierLabel);
  if (!price) {
    return {
      text: `Price not set for ${match.name}. Please contact your sales rep.`,
      keyboard: KB_ORDER_ADDING,
    };
  }

  // Add to pending items
  const updatedItems = [
    ...action.items,
    { productId: match.id, sku: match.sku, name: match.name, quantity, unitPrice: price },
  ];

  await chatDb.updatePendingAction(sessionId, {
    ...action,
    items: updatedItems,
  });

  const runningTotal = updatedItems.reduce((s, i) => s + i.quantity * i.unitPrice, 0);

  return {
    text: [
      `Added: <b>${match.name}</b> x${quantity} @ R${price.toFixed(2)}`,
      '',
      `Cart: ${updatedItems.length} item${updatedItems.length > 1 ? 's' : ''} | Running total: R${runningTotal.toFixed(2)}`,
      '',
      'Add more items or tap <b>Done</b> to review your order.',
    ].join('\n'),
    keyboard: KB_ORDER_ADDING,
  };
}

// ── WhatsApp Media Download ──────────────────────────────────

async function downloadWhatsAppMedia(mediaId: string): Promise<Buffer | null> {
  const token = process.env.WHATSAPP_API_TOKEN;
  if (!token) return null;

  try {
    // Step 1: Get download URL from media ID
    const metaRes = await fetch(`https://graph.facebook.com/v21.0/${mediaId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!metaRes.ok) return null;
    const meta = await metaRes.json() as { url?: string };
    if (!meta.url) return null;

    // Step 2: Download the actual file
    const fileRes = await fetch(meta.url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!fileRes.ok) return null;
    const arrayBuffer = await fileRes.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (err) {
    console.error('[WhatsApp] downloadMedia error:', (err as Error).message);
    return null;
  }
}

// ── Tier-Aware Pricing ───────────────────────────────────────

/** Get the price for a product based on client's tier. Matches orders.routes.ts logic. */
function getClientPrice(product: Product, clientTierLabel: string): number | null {
  if (product.priceTiers.length === 0) return null;

  // First try matching by tier name (e.g. "Standard", "Silver", "Gold", "Platinum")
  const tierByName = product.priceTiers.find((t) => t.tierName === clientTierLabel);
  if (tierByName) return tierByName.price;

  // Fall back to first tier (lowest minQuantity)
  const sorted = [...product.priceTiers].sort((a, b) => a.minQuantity - b.minQuantity);
  return sorted[0]?.price ?? null;
}

/** Format a price with thousands separators (e.g. 12500 → "12,500.00") */
function formatPrice(n: number): string {
  return n.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ── Product Matching ─────────────────────────────────────────

/** Score-based product matching: exact > starts-with > contains, prefer shorter name on ties. */
function findBestProduct(
  products: Product[],
  query: string,
): Product | undefined {
  const q = query.toLowerCase();

  let bestScore = 0;
  let bestProduct: Product | undefined;

  for (const p of products) {
    const name = p.name.toLowerCase();
    const sku = p.sku.toLowerCase();
    let score = 0;

    if (sku === q) score = 100;
    else if (name === q) score = 90;
    else if (name.startsWith(q)) score = 70;
    else if (q.startsWith(name)) score = 60;
    else if (name.includes(q)) score = 40;
    else if (q.includes(name)) score = 30;

    if (score === 0) continue;

    if (score > bestScore || (score === bestScore && bestProduct && p.name.length < bestProduct.name.length)) {
      bestScore = score;
      bestProduct = p;
    }
  }

  return bestProduct;
}
