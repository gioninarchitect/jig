/**
 * PureGro - POS Bridge
 *
 * Centralized client for B2B server to call POS API endpoints.
 * Uses the X-Internal-Key header for server-to-server auth.
 */

const POS_API_URL = (process.env.POS_API_URL || 'http://127.0.0.1:3004').replace(/\/$/, '');
const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY || 'puregro_internal_2026';

const HEADERS = {
  'Accept': 'application/json',
  'Content-Type': 'application/json',
  'X-Internal-Key': INTERNAL_API_KEY,
};

/** Cached HQ branch ID (the "ORM" / head-office branch). */
let hqBranchId: string | null = null;

/** Find the HQ branch (branchCode starts with PG-SUN or PG-HQ or first active). */
export async function getHQBranchId(): Promise<string | null> {
  if (hqBranchId) return hqBranchId;
  try {
    const res = await fetch(`${POS_API_URL}/api/v1/branches`, {
      headers: HEADERS,
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return null;
    const data = await res.json() as { branches?: Array<{ _id: string; branchCode: string; isActive: boolean }> };
    const branches = data.branches || [];
    // Prefer PG-SUN (Sunningdale HQ), else first active PG- branch
    const hq = branches.find(b => b.branchCode === 'PG-SUN')
      || branches.find(b => b.branchCode?.startsWith('PG-') && b.isActive)
      || branches[0];
    if (hq) {
      hqBranchId = hq._id;
      console.log(`[POS-Bridge] HQ branch resolved: ${hq.branchCode} (${hq._id})`);
    }
    return hqBranchId;
  } catch (err) {
    console.error('[POS-Bridge] Failed to resolve HQ branch:', (err as Error).message);
    return null;
  }
}

/** Inventory item shape from POS. */
export interface PosInventoryItem {
  productId: { _id: string; name: string; sku: string; price: number };
  quantity: number;
  branchId: string;
}

/** Check branch inventory. Returns array of inventory items. */
export async function checkBranchInventory(branchId: string): Promise<PosInventoryItem[]> {
  try {
    const res = await fetch(`${POS_API_URL}/api/v1/branches/${branchId}/inventory`, {
      headers: HEADERS,
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) {
      console.error(`[POS-Bridge] Inventory check failed: ${res.status}`);
      return [];
    }
    const data = await res.json() as { inventory?: PosInventoryItem[] };
    return data.inventory || [];
  } catch (err) {
    console.error('[POS-Bridge] Inventory check error:', (err as Error).message);
    return [];
  }
}

/** Shortage info for an order item. */
export interface StockShortage {
  productName: string;
  sku: string;
  requested: number;
  available: number;
  shortfall: number;
}

/** Check if a branch has enough stock for a list of order items. */
export async function checkStockForOrder(
  branchId: string,
  items: Array<{ name: string; sku?: string; quantity: number }>,
): Promise<{ ok: boolean; shortages: StockShortage[] }> {
  const inventory = await checkBranchInventory(branchId);
  const shortages: StockShortage[] = [];

  // Build lookup by SKU
  const invBySku = new Map<string, number>();
  for (const inv of inventory) {
    if (inv.productId?.sku) {
      invBySku.set(inv.productId.sku.toLowerCase(), inv.quantity);
    }
  }

  for (const item of items) {
    const sku = (item.sku || '').toLowerCase();
    const available = sku ? (invBySku.get(sku) ?? 0) : 0;
    if (available < item.quantity) {
      shortages.push({
        productName: item.name,
        sku: item.sku || '',
        requested: item.quantity,
        available,
        shortfall: item.quantity - available,
      });
    }
  }

  return { ok: shortages.length === 0, shortages };
}

/** Transfer creation result from POS. */
export interface TransferResult {
  success: boolean;
  transferId?: string;
  transferNumber?: string;
  error?: string;
}

/** Create a stock transfer in POS (wholesale fulfillment). */
export async function createStockTransfer(
  fromBranchId: string,
  toBranchId: string,
  items: Array<{ name: string; sku: string; productId?: string; quantity: number }>,
  notes: string,
): Promise<TransferResult> {
  try {
    // We need product IDs. Look them up from inventory if not provided.
    let resolvedItems = items;
    if (items.some(i => !i.productId)) {
      const inventory = await checkBranchInventory(fromBranchId);
      const skuToProductId = new Map<string, string>();
      for (const inv of inventory) {
        if (inv.productId?.sku) {
          skuToProductId.set(inv.productId.sku.toLowerCase(), inv.productId._id);
        }
      }
      resolvedItems = items.map(i => ({
        ...i,
        productId: i.productId || skuToProductId.get((i.sku || '').toLowerCase()) || '',
      }));
    }

    const body = {
      fromBranchId,
      toBranchId,
      type: 'wholesale_fulfillment',
      priority: 'high',
      items: resolvedItems.map(i => ({
        productId: i.productId,
        name: i.name,
        sku: i.sku,
        quantity: i.quantity,
      })),
      requestNotes: notes,
    };

    const res = await fetch(`${POS_API_URL}/api/v1/stock-transfers`, {
      method: 'POST',
      headers: HEADERS,
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10_000),
    });

    const data = await res.json() as { success: boolean; transfer?: { _id: string; transferNumber: string }; message?: string };
    if (!data.success) {
      return { success: false, error: data.message || 'Transfer creation failed' };
    }

    return {
      success: true,
      transferId: data.transfer?._id,
      transferNumber: data.transfer?.transferNumber,
    };
  } catch (err) {
    console.error('[POS-Bridge] Transfer creation error:', (err as Error).message);
    return { success: false, error: (err as Error).message };
  }
}
