/**
 * PureGro Premium Cannabis Care - API Client
 *
 * Typed fetch wrapper for all /api/v1 endpoints.
 * Automatically attaches JWT token from localStorage.
 */

const API_BASE = '/api/v1';

// ── Token Management ──────────────────────────────────────

const TOKEN_KEY = 'pg_token';
const CLIENT_KEY = 'puregro_client_id';

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function getStoredClientId(): string | null {
  return localStorage.getItem(CLIENT_KEY);
}

export function storeAuth(token: string, clientId: string): void {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(CLIENT_KEY, clientId);
}

export function clearAuth(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(CLIENT_KEY);
}

// ── Fetch Wrapper ─────────────────────────────────────────

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers,
    });
  } catch {
    throw new ApiError(0, 'Cannot reach the server. Is the backend running?');
  }

  if (res.status === 401 && !path.startsWith('/auth/')) {
    clearAuth();
    throw new ApiError(401, 'Session expired');
  }

  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    throw new ApiError(
      res.status,
      `Server returned ${res.status} - backend may not be running`,
    );
  }

  const body = await res.json();

  if (!res.ok) {
    throw new ApiError(res.status, body.error || 'Request failed', body);
  }

  return body as T;
}

// ── Auth Endpoints ────────────────────────────────────────

export const auth = {
  requestOtp: (email: string) =>
    request<{ otpId: string; expiresAt: string }>('/auth/otp/request', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),

  verifyOtp: (email: string, code: string) =>
    request<{ token: string; clientId: string; expiresAt: number }>(
      '/auth/otp/verify',
      {
        method: 'POST',
        body: JSON.stringify({ email, code }),
      },
    ),

  register: (data: {
    companyName: string;
    contactPerson: string;
    email: string;
    phone: string;
    registrationNumber?: string;
  }) =>
    request<{ message: string; clientId: string }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  logout: () =>
    request<{ message: string }>('/auth/logout', { method: 'POST' }),
};

// ── Client Endpoints ──────────────────────────────────────

export interface ClientData {
  id: string;
  email: string;
  companyName: string;
  contactPerson: string;
  phone: string;
  tier: string;
  status: string;
  address: {
    street: string;
    city: string;
    province: string;
    postalCode: string;
    country: string;
  };
  clientType: string;
  creditLimit: number;
  paymentTerms: string;
  createdAt: number;
  lastActiveAt: number;
  // Normalized by normalizeClient() for UI
  businessName: string;
  contactName: string;
  province: string;
  city: string;
  lifetimeValue: number;
  totalOrders: number;
}

/** Normalize server client data for UI consumption */
function normalizeClient(c: ClientData): ClientData {
  return {
    ...c,
    businessName: c.companyName,
    contactName: c.contactPerson,
    province: c.address?.province ?? '',
    city: c.address?.city ?? '',
    lifetimeValue: c.lifetimeValue ?? 0,
    totalOrders: c.totalOrders ?? 0,
  };
}

export const clients = {
  me: () =>
    request<{ client: ClientData }>('/clients/me').then((r) => ({
      client: normalizeClient(r.client),
    })),

  getById: (id: string) =>
    request<{ client: ClientData }>(`/clients/${id}`).then((r) => ({
      client: normalizeClient(r.client),
    })),

  list: (params?: { status?: string; limit?: number; offset?: number }) => {
    const qs = new URLSearchParams();
    if (params?.status) qs.set('status', params.status);
    if (params?.limit) qs.set('limit', String(params.limit));
    if (params?.offset) qs.set('offset', String(params.offset));
    const q = qs.toString();
    return request<{ clients: ClientData[]; count: number }>(
      `/clients${q ? `?${q}` : ''}`,
    ).then((r) => ({
      clients: r.clients.map(normalizeClient),
      count: r.count,
    }));
  },

  orders: (clientId: string, limit?: number) => {
    const q = limit ? `?limit=${limit}` : '';
    return request<{ orders: OrderData[]; count: number }>(
      `/clients/${clientId}/orders${q}`,
    );
  },

  events: (clientId: string, limit?: number) => {
    const q = limit ? `?limit=${limit}` : '';
    return request<{ events: EventLogEntry[]; count: number }>(
      `/clients/${clientId}/events${q}`,
    );
  },
};

// ── Product Endpoints ─────────────────────────────────────

export interface ProductData {
  id: string;
  sku: string;
  name: string;
  strain: string;
  category: string;
  subcategory?: string;
  thcContent?: string;
  cbdContent?: string;
  description: string;
  unit: string;
  costPrice?: number;
  isActive: boolean;
  stockQuantity: number;
  priceTiers: { minQuantity: number; price: number; tierName: string }[];
}

export const products = {
  list: (category?: string) => {
    const q = category ? `?category=${category}` : '';
    return request<{ products: ProductData[]; count: number }>(
      `/products${q}`,
    );
  },

  getById: (id: string) =>
    request<{ product: ProductData }>(`/products/${id}`),
};

// ── FormData Fetch Wrapper ───────────────────────────────

async function requestFormData<T>(
  path: string,
  body: FormData,
): Promise<T> {
  const token = getStoredToken();
  const headers: Record<string, string> = {};

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method: 'POST',
      headers,
      body,
    });
  } catch {
    throw new ApiError(0, 'Cannot reach the server. Is the backend running?');
  }

  if (res.status === 401 && !path.startsWith('/auth/')) {
    clearAuth();
    throw new ApiError(401, 'Session expired');
  }

  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    throw new ApiError(
      res.status,
      `Server returned ${res.status} - backend may not be running`,
    );
  }

  const responseBody = await res.json();

  if (!res.ok) {
    throw new ApiError(res.status, responseBody.error || 'Request failed', responseBody);
  }

  return responseBody as T;
}

// ── Order Endpoints ───────────────────────────────────────

export interface OrderData {
  id: string;
  clientId: string;
  clientName?: string;
  status: string;
  paymentStatus: string;
  paymentMethod: string;
  totalAmount: number;
  total: number;
  vatAmount: number;
  subtotal: number;
  poNumber?: string;
  invoiceNumber?: string;
  trackingNumber?: string;
  courierName?: string;
  items: OrderItemData[];
  deliveryAddress: {
    street: string;
    city: string;
    province: string;
    postalCode: string;
    country: string;
  };
  deliveryNotes?: string;
  createdAt: string;
  confirmedAt?: string;
  shippedAt?: string;
  deliveredAt?: string;
  paidAt?: string;
}

export interface OrderItemData {
  productId: string;
  productName: string;
  name: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  totalPrice: number;
}

export interface PopData {
  id: string;
  orderId: string;
  clientId: string;
  fileName: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
  status: string;
  adminNotes?: string;
  reviewedAt?: string;
  uploadedAt: string;
  clientName?: string;
  orderTotal?: number;
}

export interface InvoiceData {
  order: OrderData;
  client: {
    companyName: string;
    tradingName?: string;
    registrationNumber?: string;
    vatNumber?: string;
    contactPerson: string;
    email: string;
    phone: string;
    address: {
      street: string;
      city: string;
      province: string;
      postalCode: string;
      country: string;
    };
  } | null;
  company: {
    name: string;
    registration: string;
    vat: string;
    address: string;
    email: string;
    phone: string;
  };
  banking: {
    bankName: string;
    accountName: string;
    accountNumber: string;
    branchCode: string;
    reference: string;
  };
}

export const orders = {
  create: (items: { productId: string; quantity: number }[]) =>
    request<{ order: OrderData }>('/orders', {
      method: 'POST',
      body: JSON.stringify({ items }),
    }),

  getById: (id: string) =>
    request<{ order: OrderData }>(`/orders/${id}`),

  list: (params?: { status?: string; paymentStatus?: string; search?: string; limit?: number; offset?: number }) => {
    const qs = new URLSearchParams();
    if (params?.status) qs.set('status', params.status);
    if (params?.paymentStatus) qs.set('paymentStatus', params.paymentStatus);
    if (params?.search) qs.set('search', params.search);
    if (params?.limit) qs.set('limit', String(params.limit));
    if (params?.offset) qs.set('offset', String(params.offset));
    const q = qs.toString();
    return request<{ orders: OrderData[]; total: number }>(
      `/orders${q ? `?${q}` : ''}`,
    );
  },

  confirm: (id: string) =>
    request<{ order: OrderData; invoiceNumber: string }>(`/orders/${id}/confirm`, {
      method: 'PATCH',
    }),

  ship: (id: string, courierName: string, trackingNumber: string) =>
    request<{ order: OrderData }>(`/orders/${id}/ship`, {
      method: 'PATCH',
      body: JSON.stringify({ courierName, trackingNumber }),
    }),

  deliver: (id: string) =>
    request<{ order: OrderData }>(`/orders/${id}/deliver`, {
      method: 'PATCH',
    }),

  invoiceData: (id: string) =>
    request<InvoiceData>(`/orders/${id}/invoice-data`),

  uploadPop: (id: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return requestFormData<{ pop: PopData }>(`/orders/${id}/pop`, formData);
  },

  getPops: (id: string) =>
    request<{ pops: PopData[]; count: number }>(`/orders/${id}/pop`),

  reviewPop: (orderId: string, popId: string, status: string, adminNotes?: string) =>
    request<{ pop: PopData }>(`/orders/${orderId}/pop/${popId}/review`, {
      method: 'PATCH',
      body: JSON.stringify({ status, adminNotes }),
    }),

  pendingPops: () =>
    request<{ pops: PopData[]; count: number }>('/orders/admin/pending-pops'),

  updateStatus: (id: string, status: string) =>
    request<{ order: OrderData }>(`/orders/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),

  updatePayment: (id: string, paymentStatus: string) =>
    request<{ order: OrderData }>(`/orders/${id}/payment`, {
      method: 'PATCH',
      body: JSON.stringify({ paymentStatus }),
    }),
};

// ── Intelligence Endpoints ────────────────────────────────

export interface IntelligenceSummary {
  clientId: string;
  healthScore: number;
  churnRisk: string;
  tier: string;
  lifetimeValue: number;
  avgOrderValue: number;
  orderFrequencyDays: number;
  totalOrders: number;
  lastOrderDaysAgo: number;
  restockPredictions: RestockPrediction[];
  recommendations: string[];
  activeInterventions: InterventionData[];
  patterns: PatternData[];
}

export interface RestockPrediction {
  productId: string;
  productName: string;
  predictedDate: string;
  confidence: number;
  avgInterval: number;
}

export interface InterventionData {
  id: string;
  type: string;
  trigger: string;
  action: string;
  priority: string;
  status: string;
  createdAt: string;
}

export interface PatternData {
  id: string;
  patternType: string;
  description: string;
  confidence: number;
  detectedAt: string;
}

export const intelligence = {
  summary: (clientId: string) =>
    request<IntelligenceSummary>(`/intelligence/summary/${clientId}`),

  churn: (clientId: string) =>
    request<{
      clientId: string;
      risk: string;
      score: number;
      factors: Record<string, number>;
    }>(`/intelligence/churn/${clientId}`),

  restock: (clientId: string) =>
    request<{ clientId: string; predictions: RestockPrediction[] }>(
      `/intelligence/restock/${clientId}`,
    ),

  recommendations: (clientId: string) =>
    request<{ clientId: string; recommendations: string[] }>(
      `/intelligence/recommendations/${clientId}`,
    ),

  interventions: (clientId: string) =>
    request<{ clientId: string; interventions: InterventionData[] }>(
      `/intelligence/interventions/${clientId}`,
    ),

  tier: (clientId: string) =>
    request<{
      clientId: string;
      currentTier: string;
      lifetimeValue: number;
      nextTier: string | null;
      amountToNextTier: number;
    }>(`/intelligence/tier/${clientId}`),

  paymentRisk: (clientId: string) =>
    request<{
      clientId: string;
      reliability: number;
      avgDaysToPayment: number;
      overdueCount: number;
    }>(`/intelligence/payment-risk/${clientId}`),

  revenue: (clientId: string) =>
    request<{
      clientId: string;
      lifetimeValue: number;
      avgOrderValue: number;
      projectedAnnual: number;
      trend: string;
    }>(`/intelligence/revenue/${clientId}`),
};

// ── Event Log ─────────────────────────────────────────────

export interface EventLogEntry {
  id: string;
  clientId: string;
  eventType: string;
  payload: Record<string, unknown>;
  createdAt: string;
}

// ── Leads (Admin) ─────────────────────────────────────────

export interface LeadData {
  id: string;
  businessName: string;
  contactName: string;
  email: string;
  phone: string;
  city: string;
  province: string;
  estimatedTier: string;
  status: string;
  notes: string;
  createdAt: string;
}

export const leads = {
  list: (params?: { tier?: string; status?: string }) => {
    const qs = new URLSearchParams();
    if (params?.tier) qs.set('tier', params.tier);
    if (params?.status) qs.set('status', params.status);
    const q = qs.toString();
    return request<{ leads: LeadData[]; count: number }>(
      `/leads${q ? `?${q}` : ''}`,
    );
  },
};

// ── Verification (Client Docs) ───────────────────────────────

export interface ClientDocumentData {
  id: string;
  clientId: string;
  docType: string;
  fileName: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
  status: string;
  adminNotes?: string;
  reviewedBy?: string;
  reviewedAt?: number;
  uploadedAt: number;
  clientName?: string;
  clientEmail?: string;
}

export const verification = {
  status: () =>
    request<{ documents: ClientDocumentData[]; allRequiredUploaded: boolean; allApproved: boolean }>(
      '/verification/status',
    ),

  documents: () =>
    request<{ documents: ClientDocumentData[] }>('/verification/documents'),

  upload: (file: File, docType: string) => {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('docType', docType);
    return requestFormData<{ document: ClientDocumentData }>('/verification/documents', fd);
  },

  pending: () =>
    request<{ documents: ClientDocumentData[]; count: number }>('/verification/admin/pending'),

  review: (docId: string, status: string, adminNotes?: string) =>
    request<{ document: ClientDocumentData }>(`/verification/admin/${docId}/review`, {
      method: 'PATCH',
      body: JSON.stringify({ status, adminNotes }),
    }),

  clientDocs: (clientId: string) =>
    request<{ documents: ClientDocumentData[]; allRequiredUploaded: boolean; allApproved: boolean }>(
      `/verification/admin/client/${clientId}`,
    ),
};

// ── Chat Bot (Admin) ─────────────────────────────────────────

export interface ChatSettings {
  configured: boolean;
  bot: { username?: string; name?: string };
  webhook: { url?: string; pendingUpdates?: number };
  stats: { totalLinks: number; linkedUsers: number; totalMessages: number };
}

export interface ChatLinkedUser {
  id: string;
  platform: string;
  platformUserId: string;
  platformUsername: string | null;
  platformDisplayName: string | null;
  linkState: string;
  clientId: string | null;
  clientName?: string;
  clientEmail?: string;
  messageCount: number;
  lastMessageAt: number | null;
  createdAt: number;
}

export const chat = {
  settings: () => request<ChatSettings>('/chat/settings'),

  linkedUsers: () =>
    request<{ users: ChatLinkedUser[]; count: number }>('/chat/linked-users'),

  unlinkUser: (id: string) =>
    request<{ message: string }>(`/chat/linked-users/${id}`, {
      method: 'DELETE',
    }),

  setupWebhook: (url?: string) =>
    request<{ ok: boolean; description?: string; webhookUrl: string }>(
      '/chat/setup-webhook',
      {
        method: 'POST',
        body: JSON.stringify(url ? { url } : {}),
      },
    ),
};

// ── n8n Integration (Admin) ─────────────────────────────────

export interface N8nConfigData {
  enabled: boolean;
  webhookUrl: string;
  apiKey: string;
  apiKeySet: boolean;
  workflows: {
    orderLifecycle: boolean;
    onboarding: boolean;
    paymentChase: boolean;
    restockReminders: boolean;
    newProducts: boolean;
    churnPrevention: boolean;
    adminDigest: boolean;
  };
}

export const n8n = {
  config: () => request<N8nConfigData>('/n8n/config'),

  updateConfig: (data: Partial<{
    enabled: boolean;
    webhookUrl: string;
    apiKey: string;
    workflows: Partial<N8nConfigData['workflows']>;
  }>) =>
    request<N8nConfigData>('/n8n/config', {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
};
