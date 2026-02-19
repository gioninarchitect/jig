/**
 * JIG Chat Bot - Type Definitions
 *
 * Types for the Telegram/WhatsApp/Slack chat integration.
 */

// ── Intents ──────────────────────────────────────────────────

export type ChatIntent =
  | 'order_create'
  | 'order_list'
  | 'order_status'
  | 'product_search'
  | 'product_price'
  | 'invoice_view'
  | 'payment_status'
  | 'account_info'
  | 'restock_reminder'
  | 'pop_upload'
  | 'verification_status'
  | 'help'
  | 'greeting'
  | 'unlink'
  | 'cancel'
  | 'unknown';

// ── Platform Types ───────────────────────────────────────────

export type ChatPlatform = 'telegram' | 'whatsapp' | 'slack';
export type LinkState = 'pending_email' | 'pending_otp' | 'linked';

// ── Database Models ──────────────────────────────────────────

export interface ChatUserLink {
  id: string;
  platform: ChatPlatform;
  platformUserId: string;
  platformUsername: string | null;
  platformDisplayName: string | null;
  linkState: LinkState;
  pendingEmail: string | null;
  clientId: string | null;
  messageCount: number;
  lastMessageAt: number | null;
  createdAt: number;
  updatedAt: number;
}

export interface ChatSession {
  id: string;
  linkId: string;
  messages: ChatMessage[];
  pendingAction: PendingAction | null;
  createdAt: number;
  updatedAt: number;
}

// ── Chat Messages ────────────────────────────────────────────

export interface ChatMessage {
  role: 'user' | 'bot';
  text: string;
  timestamp: number;
}

// ── Pending Action (multi-step flows) ────────────────────────

export type PendingAction =
  | {
      type: 'order_create';
      items: Array<{ productId: string; sku: string; name: string; quantity: number; unitPrice: number }>;
      step: 'select_category' | 'select_product' | 'select_quantity' | 'adding_items' | 'confirm';
      /** Product ID selected, awaiting quantity */
      selectedProductId?: string;
      /** Category filter for product listing */
      selectedCategory?: string;
    }
  | {
      type: 'pop_upload';
      orderId: string;
      step: 'awaiting_file';
    }
  | {
      type: 'registration';
      step: 'company_name' | 'reg_number' | 'contact_name' | 'email' | 'verify_otp' | 'phone' | 'complete';
      data: {
        companyName?: string;
        registrationNumber?: string;
        contactPerson?: string;
        email?: string;
        phone?: string;
      };
    }
  | {
      type: 'doc_upload';
      /** Index into the REQUIRED + optional doc list (0–6) */
      docIndex: number;
      step: 'awaiting_file' | 'done';
    };

// ── Incoming Message ─────────────────────────────────────────

export interface IncomingMessage {
  platform: ChatPlatform;
  platformUserId: string;
  platformUsername?: string;
  platformDisplayName?: string;
  text: string;
  /** Telegram photo file_id (largest size) */
  photoFileId?: string;
  /** Telegram document file_id */
  documentFileId?: string;
  /** Original filename for documents */
  documentFileName?: string;
  /** MIME type of the document */
  documentMimeType?: string;
  rawPayload?: unknown;
}

// ── Intent Detection Result ──────────────────────────────────

export interface IntentResult {
  intent: ChatIntent;
  entities: {
    productName?: string;
    quantity?: number;
    orderId?: string;
    query?: string;
  };
  confidence: number;
}

// ── Inline Keyboard (Telegram reply_markup) ──────────────────

export interface InlineButton {
  text: string;
  callback_data: string;
}

export type InlineKeyboard = InlineButton[][];

/** Bot reply: text + optional inline keyboard. */
export interface ChatReply {
  text: string;
  keyboard?: InlineKeyboard;
}
