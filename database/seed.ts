/**
 * PureGro Premium Cannabis Care - Database Seed Script
 *
 * Populates the database with:
 *   - Kush Mints product catalog (5 SKUs across FLOS category)
 *   - Price tiers per product (Standard, Silver, Gold, Platinum)
 *   - Test clients at various tiers
 *   - Sample leads from the lead generation list
 *
 * Usage: npm run seed
 * Requires: DATABASE_URL in .env
 */

import 'dotenv/config';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function seed() {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    console.log('[SEED] Inserting Kush Mints product catalog...');

    // ── KUSH MINTS - FLOS RANGE ──────────────────────────────
    // Strain: Kush Mints (Hybrid — Bubba Kush x Animal Cookies)
    // THC: 26-30%, CBD: <1%
    // Terpenes: Limonene, Caryophyllene, Linalool, Myrcene
    // Base wholesale: R50/gram

    const kushMintsDesc = 'Kush Mints (Hybrid — Bubba Kush x Animal Cookies). Aroma: Mint, cookies, earthy. Terpenes: Limonene, Caryophyllene, Linalool, Myrcene.';

    const products = [
      {
        sku: 'PureGro-FLO-KM-3G',
        name: 'Kush Mints Indoor 3g',
        category: 'flower',
        subcategory: 'Indoor Pre Pack',
        strain: 'hybrid',
        thc: '26-30%',
        cbd: '<1%',
        desc: `3g pre-packed indoor flower. ${kushMintsDesc}`,
        unit: 'packs',
        stock: 500,
        reorder: 50,
        cost: 150,
        prices: [
          { min: 1, price: 150, tier: 'Standard' },
          { min: 1, price: 142.50, tier: 'Silver' },
          { min: 1, price: 135, tier: 'Gold' },
          { min: 1, price: 127.50, tier: 'Platinum' },
        ],
      },
      {
        sku: 'PureGro-FLO-KM-5G',
        name: 'Kush Mints Indoor 5g',
        category: 'flower',
        subcategory: 'Indoor Pre Pack',
        strain: 'hybrid',
        thc: '26-30%',
        cbd: '<1%',
        desc: `5g pre-packed indoor flower. ${kushMintsDesc}`,
        unit: 'packs',
        stock: 400,
        reorder: 40,
        cost: 250,
        prices: [
          { min: 1, price: 250, tier: 'Standard' },
          { min: 1, price: 237.50, tier: 'Silver' },
          { min: 1, price: 225, tier: 'Gold' },
          { min: 1, price: 212.50, tier: 'Platinum' },
        ],
      },
      {
        sku: 'PureGro-FLO-KM-250G',
        name: 'Kush Mints Indoor 250g',
        category: 'flower',
        subcategory: 'Indoor Pre Pack',
        strain: 'hybrid',
        thc: '26-30%',
        cbd: '<1%',
        desc: `250g pre-packed indoor flower. ${kushMintsDesc}`,
        unit: 'packs',
        stock: 50,
        reorder: 5,
        cost: 12500,
        prices: [
          { min: 1, price: 12500, tier: 'Standard' },
          { min: 1, price: 11875, tier: 'Silver' },
          { min: 1, price: 11250, tier: 'Gold' },
          { min: 1, price: 10625, tier: 'Platinum' },
        ],
      },
      {
        sku: 'PureGro-FLO-KM-1KG',
        name: 'Kush Mints Indoor 1kg',
        category: 'flower',
        subcategory: 'Indoor Pre Pack',
        strain: 'hybrid',
        thc: '26-30%',
        cbd: '<1%',
        desc: `1kg pre-packed indoor flower. ${kushMintsDesc}`,
        unit: 'packs',
        stock: 10,
        reorder: 2,
        cost: 50000,
        prices: [
          { min: 1, price: 50000, tier: 'Standard' },
          { min: 1, price: 47500, tier: 'Silver' },
          { min: 1, price: 45000, tier: 'Gold' },
          { min: 1, price: 42500, tier: 'Platinum' },
        ],
      },
      {
        sku: 'PureGro-FLO-KM-BLK',
        name: 'Kush Mints Bulk 250g',
        category: 'flower',
        subcategory: 'Bulk Indoor Loose',
        strain: 'hybrid',
        thc: '26-30%',
        cbd: '<1%',
        desc: `Bulk loose indoor flower, 250g minimum order. ${kushMintsDesc}`,
        unit: 'grams',
        stock: 5000,
        reorder: 500,
        cost: 50,
        prices: [
          { min: 250, price: 50, tier: 'Standard' },
          { min: 250, price: 47.50, tier: 'Silver' },
          { min: 250, price: 45, tier: 'Gold' },
          { min: 250, price: 42.50, tier: 'Platinum' },
        ],
      },
    ];

    for (const p of products) {
      const { rows } = await client.query(
        `INSERT INTO products (sku, name, category, subcategory, strain, thc_content, cbd_content, description, unit, stock_quantity, reorder_point, cost_price)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
         ON CONFLICT (sku) DO UPDATE SET
           name = EXCLUDED.name,
           subcategory = EXCLUDED.subcategory,
           thc_content = EXCLUDED.thc_content,
           cbd_content = EXCLUDED.cbd_content,
           description = EXCLUDED.description,
           unit = EXCLUDED.unit,
           stock_quantity = EXCLUDED.stock_quantity,
           reorder_point = EXCLUDED.reorder_point,
           cost_price = EXCLUDED.cost_price
         RETURNING id`,
        [p.sku, p.name, p.category, p.subcategory, p.strain, p.thc, p.cbd, p.desc, p.unit, p.stock, p.reorder, p.cost],
      );
      const productId = rows[0].id;

      // Clear existing price tiers for this product and re-insert
      await client.query('DELETE FROM product_price_tiers WHERE product_id = $1', [productId]);

      for (const tier of p.prices) {
        await client.query(
          `INSERT INTO product_price_tiers (product_id, min_quantity, price, tier_name)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (product_id, tier_name) DO UPDATE SET price = EXCLUDED.price, min_quantity = EXCLUDED.min_quantity`,
          [productId, tier.min, tier.price, tier.tier],
        );
      }
    }

    console.log(`[SEED] Inserted ${products.length} Kush Mints products with price tiers`);

    // ── TEST CLIENTS ───────────────────────────────────────
    console.log('[SEED] Inserting test clients...');

    const clients = [
      {
        company: 'Green Leaf Dispensary',
        contact: 'Thabo Mokoena',
        email: 'thabo@greenleaf.co.za',
        phone: '082 555 1234',
        street: '123 Main Road',
        city: 'Sandton',
        province: 'Gauteng',
        postal: '2196',
        type: 'dispensary',
        tier: 'silver',
        credit: 75000,
        terms: 'net14',
        status: 'active',
      },
      {
        company: 'Cape Cannabis Collective',
        contact: 'Sarah van der Merwe',
        email: 'sarah@capecannabis.co.za',
        phone: '071 888 4567',
        street: '45 Long Street',
        city: 'Cape Town',
        province: 'Western Cape',
        postal: '8001',
        type: 'dispensary',
        tier: 'gold',
        credit: 150000,
        terms: 'net14',
        status: 'active',
      },
      {
        company: 'Durban Wellness Hub',
        contact: 'Sipho Ndlovu',
        email: 'sipho@durbanwellness.co.za',
        phone: '083 222 9876',
        street: '78 Florida Road',
        city: 'Durban',
        province: 'KwaZulu-Natal',
        postal: '4001',
        type: 'cafe',
        tier: 'standard',
        credit: 25000,
        terms: 'cod',
        status: 'active',
      },
      {
        company: 'Pretoria Premium Herbs',
        contact: 'Anele Khumalo',
        email: 'anele@premiumherbs.co.za',
        phone: '076 444 5678',
        street: '15 Church Street',
        city: 'Pretoria',
        province: 'Gauteng',
        postal: '0002',
        type: 'retailer',
        tier: 'platinum',
        credit: 300000,
        terms: 'net30',
        status: 'active',
      },
    ];

    for (const c of clients) {
      await client.query(
        `INSERT INTO clients (company_name, contact_person, email, phone,
          address_street, address_city, address_province, address_postal_code,
          client_type, tier, credit_limit, payment_terms, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
         ON CONFLICT (email) DO UPDATE SET company_name = EXCLUDED.company_name`,
        [c.company, c.contact, c.email, c.phone, c.street, c.city, c.province, c.postal,
         c.type, c.tier, c.credit, c.terms, c.status],
      );
    }

    // Add florisolivier7 as test customer
    await client.query(
      `INSERT INTO clients (company_name, contact_person, email, phone,
        address_street, address_city, address_province, address_postal_code,
        client_type, tier, credit_limit, payment_terms, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       ON CONFLICT (email) DO UPDATE SET company_name = EXCLUDED.company_name`,
      ['PureGro Premium Cannabis Care', 'Floris Olivier', 'florisolivier7@gmail.com', '000 000 0000',
       '1 Test Street', 'Cape Town', 'Western Cape', '8001',
       'dispensary', 'standard', 500000, 'net30', 'active'],
    );

    console.log(`[SEED] Inserted ${clients.length + 1} test clients`);

    // ── TEST ORDERS ──────────────────────────────────────────
    console.log('[SEED] Inserting test orders...');

    // Get florisolivier client ID and product IDs
    const { rows: [florisClient] } = await client.query(
      `SELECT id FROM clients WHERE email = 'florisolivier7@gmail.com'`,
    );
    const { rows: productRows } = await client.query(
      `SELECT id, sku, name, cost_price FROM products WHERE sku IN ('PureGro-FLO-KM-BLK', 'PureGro-FLO-KM-3G', 'PureGro-FLO-KM-1KG')`,
    );
    const productMap = Object.fromEntries(productRows.map((r: { sku: string; id: string; name: string; cost_price: number }) => [r.sku, r]));

    // Clear existing test orders — check if pop_uploads exists first
    const { rows: popTable } = await client.query(
      `SELECT 1 FROM information_schema.tables WHERE table_name = 'pop_uploads'`,
    );
    if (popTable.length > 0) {
      await client.query('DELETE FROM pop_uploads WHERE order_id IN (SELECT id FROM orders WHERE client_id = $1)', [florisClient.id]);
    }
    await client.query('DELETE FROM order_items WHERE order_id IN (SELECT id FROM orders WHERE client_id = $1)', [florisClient.id]);
    await client.query('DELETE FROM orders WHERE client_id = $1', [florisClient.id]);

    const testOrders = [
      {
        id: 'PureGro-000001', status: 'pending', paymentStatus: 'pending',
        items: [{ sku: 'PureGro-FLO-KM-BLK', qty: 1, unitPrice: 100, totalPrice: 100 }],
        subtotal: 100, vat: 15, total: 115,
      },
      {
        id: 'PureGro-000002', status: 'pending', paymentStatus: 'pending',
        items: [{ sku: 'PureGro-FLO-KM-3G', qty: 1, unitPrice: 150, totalPrice: 150 }],
        subtotal: 150, vat: 22.50, total: 172.50,
      },
      {
        id: 'PureGro-000003', status: 'confirmed', paymentStatus: 'pending',
        items: [{ sku: 'PureGro-FLO-KM-BLK', qty: 250, unitPrice: 50, totalPrice: 12500 }],
        subtotal: 12500, vat: 1875, total: 14375,
      },
      {
        id: 'PureGro-000004', status: 'pending', paymentStatus: 'pending',
        items: [{ sku: 'PureGro-FLO-KM-1KG', qty: 1, unitPrice: 50000, totalPrice: 50000 }],
        subtotal: 50000, vat: 7500, total: 57500,
      },
    ];

    for (const o of testOrders) {
      await client.query(
        `INSERT INTO orders (id, client_id, subtotal, vat_amount, total, status, payment_status,
          payment_method, delivery_street, delivery_city, delivery_province, delivery_postal_code)
         VALUES ($1, $2, $3, $4, $5, $6::order_status, $7::payment_status, 'eft', '1 Test Street', 'Cape Town', 'Western Cape', '8001')
         ON CONFLICT (id) DO NOTHING`,
        [o.id, florisClient.id, o.subtotal, o.vat, o.total, o.status, o.paymentStatus],
      );

      for (const item of o.items) {
        const prod = productMap[item.sku];
        await client.query(
          `INSERT INTO order_items (order_id, product_id, sku, name, quantity, unit_price, total_price)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [o.id, prod.id, item.sku, prod.name, item.qty, item.unitPrice, item.totalPrice],
        );
      }
    }

    console.log(`[SEED] Inserted ${testOrders.length} test orders`);

    // ── LEADS (Top 20 from lead gen list) ──────────────────
    console.log('[SEED] Inserting leads...');

    const leads = [
      { name: 'Cannibisters', type: 'Social Club', province: 'Western Cape', city: 'Sea Point', phone: '087 537 8000', email: 'high@cannibisters.com', tier: 'A', volume: '1000g+/month' },
      { name: 'The Alibi Members Club', type: 'Social Club', province: 'Western Cape', city: 'Cape Town CBD', phone: '', email: '', tier: 'A', volume: '1000g+/month' },
      { name: 'PureGro', type: 'Dispensary', province: 'Western Cape', city: 'Paarden Eiland', phone: '', email: '', tier: 'A', volume: '1000g+/month' },
      { name: 'Goodleaf', type: 'CBD Retail', province: 'Western Cape', city: 'V&A Waterfront', phone: '021 569 3738', email: '', tier: 'A', volume: '500g+/month' },
      { name: 'The 420 Doctor', type: 'Medical', province: 'Western Cape', city: 'Cape Town', phone: '', email: '', tier: 'A', volume: '500g+/month' },
      { name: 'The Greenery Cafe', type: 'Social Club', province: 'Gauteng', city: 'Sandton', phone: '', email: '', tier: 'A', volume: '1000g+/month' },
      { name: 'XCLSV Canna Club', type: 'Social Club', province: 'Gauteng', city: 'Johannesburg', phone: '', email: '', tier: 'A', volume: '1000g+/month' },
      { name: 'Green Supreme', type: 'Dispensary', province: 'KwaZulu-Natal', city: 'Durban', phone: '', email: '', tier: 'A', volume: '500g+/month' },
      { name: 'Zootly', type: 'Retail', province: 'Western Cape', city: 'Gardens', phone: '064 920 0569', email: 'info@zootly.co.za', tier: 'B', volume: '250-500g/month' },
      { name: 'Baked de Waterkant', type: 'Social Club', province: 'Western Cape', city: 'Blouberg', phone: '', email: '', tier: 'B', volume: '250-500g/month' },
      { name: 'Cape Cannabis Club', type: 'Social Club', province: 'Western Cape', city: 'Cape Town', phone: '', email: '', tier: 'B', volume: '250-500g/month' },
      { name: '420 Cafe', type: 'Social Club', province: 'Gauteng', city: 'Johannesburg', phone: '', email: '', tier: 'B', volume: '250-500g/month' },
      { name: 'Bud Greenside', type: 'Dispensary', province: 'Gauteng', city: 'Johannesburg', phone: '', email: '', tier: 'B', volume: '250-500g/month' },
      { name: 'Cradle Stoner', type: 'Social Club', province: 'Gauteng', city: 'Cradle of Humankind', phone: '', email: '', tier: 'B', volume: '250-500g/month' },
      { name: 'CannAfrica', type: 'Dispensary', province: 'Gauteng', city: 'Pretoria', phone: '', email: '', tier: 'B', volume: '250-500g/month' },
      { name: 'Die Joint', type: 'Social Club', province: 'Gauteng', city: 'Broederstroom', phone: '079 435 6059', email: '', tier: 'B', volume: '250-500g/month' },
      { name: 'Crossroads Irene', type: 'Social Club', province: 'Gauteng', city: 'Centurion', phone: '083 608 1554', email: '', tier: 'B', volume: '100-250g/month' },
      { name: 'Green House Dispensary', type: 'Dispensary', province: 'KwaZulu-Natal', city: 'Umhlanga', phone: '', email: '', tier: 'C', volume: '100-250g/month' },
      { name: 'Dagga Magazine', type: 'Online', province: 'National', city: 'Online', phone: '', email: '', tier: 'D', volume: 'Unknown' },
      { name: 'CannaSA', type: 'Online', province: 'National', city: 'Online', phone: '', email: '', tier: 'D', volume: 'Unknown' },
    ];

    // Clear existing leads and re-insert
    await client.query('DELETE FROM leads');

    for (const l of leads) {
      await client.query(
        `INSERT INTO leads (business_name, business_type, province, city, phone, email, tier, est_monthly_volume)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [l.name, l.type, l.province, l.city, l.phone || null, l.email || null, l.tier, l.volume],
      );
    }

    console.log(`[SEED] Inserted ${leads.length} leads`);

    await client.query('COMMIT');
    console.log('[SEED] Done. Database seeded successfully.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[SEED] Error:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
