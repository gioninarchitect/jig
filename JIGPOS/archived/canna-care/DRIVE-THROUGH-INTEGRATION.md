# Drive-Through Integration Architecture

## Overview
The 24/7 Drive-Through system is fully integrated with the existing CBD Wellness 24 infrastructure. It's essentially **another sales channel** using the same product database, ordering system, and inventory management.

## Integration Points

### 1. **Shared Product Catalog**
```
POS System ←→ Product Database ←→ Drive-Through
                     ↓
              Menu Items (La Brewha & Bean & Bud)
```

**How it works:**
- Drive-Through loads products from `/api/v1/products` (same API as POS)
- Loads menu items from `/api/v1/menu` (La Brewha café & Bean & Bud)
- Combines both into single product list (exactly like POS does)
- Categories are **dynamically generated** from available products
- Same images, prices, and descriptions across all channels

**Code location:** `drive-through.html:1092-1131`

### 2. **Unified Inventory Management**
```
Customer places Drive-Through order
         ↓
Stock reserved immediately
         ↓
Product.inventory.quantity decremented
         ↓
Same stock shown in POS, Dashboard, Products page
```

**How it works:**
- When customer places Drive-Through order, stock is reserved immediately
- Inventory decrements happen in `/api/v1/drive-through/order` endpoint
- If customer cancels, stock is returned to inventory
- Same inventory tracking as regular e-commerce orders

**Code location:** `backend/routes/drive-through.js:78-84`

### 3. **Dual Order System**

Each Drive-Through order creates **TWO database records**:

#### A) **DriveThrough Document** (Queue Management)
```javascript
{
  orderId: "uuid",
  customerId: ObjectId,
  products: [...],
  queue: {
    position: 3,
    estimatedPickupTime: "2024-11-07T15:30:00Z"
  },
  gps: {
    latitude: -26.0287,
    longitude: 28.0022,
    lastUpdate: Date
  },
  status: "in-queue", // in-queue → preparing → ready → arrived → completed
  compliance: {
    requiresSection21: true,
    verifiedAt: Date,
    verifiedBy: ObjectId,
    auditTrail: [...]
  }
}
```
**Purpose:** Drive-Through specific features (queue, GPS, pickup window management)

#### B) **Order Document** (Standard Order System)
```javascript
{
  orderNumber: "ORD-2024-1234",
  user: ObjectId,
  items: [{
    product: ObjectId,
    quantity: 2,
    price: 150.00
  }],
  subtotal: 300.00,
  tax: 45.00,
  total: 345.00,
  status: "processing",
  paymentStatus: "paid",
  source: "drive-through" // Identifies channel
}
```
**Purpose:** Standard order tracking, reporting, analytics

**Why two documents?**
- DriveThrough model handles queue-specific features (GPS, ETA, pickup flow)
- Order model integrates with existing reporting, analytics, and order management
- Separation of concerns - queue management vs order management

**Code location:** `backend/routes/drive-through.js:51-75`

### 4. **Category System (Matches POS Exactly)**

Categories are **dynamically loaded** based on available products:

```javascript
const categoryNames = {
  'all': 'All Products',
  'accessories': 'Accessories',
  'glassware': 'Glassware',
  'vaporizers': 'Vaporizers',
  'lifestyle-cbd': 'CBD Wellness',
  'coffee': 'Coffee',
  'merchandise': 'Merchandise',
  'bundles': 'Bundles',
  'la-brewha': 'La Brewha Café',
  'bean-bud': 'Bean & Bud'
};
```

**How it works:**
- System scans all products and menu items
- Extracts unique categories
- Generates category buttons dynamically
- Same logic as POS system (`pos.html:1031-1054`)

**Code location:** `drive-through.html:1134-1174`

### 5. **Authentication & User Management**

```
Customer → JWT Authentication → Drive-Through Order → User.id linked
```

**How it works:**
- Drive-Through uses same JWT authentication as main site
- Social login options (Google, Apple, Instagram, TikTok) + email/password
- Orders linked to User account for history tracking
- Same user can place orders via: Website, Dashboard, Drive-Through, POS

**Code location:** `drive-through.html:1000-1089`

### 6. **Payment Integration**

Drive-Through supports same payment methods as POS:
- **InstaPay** - Pre-payment via mobile
- **Card at Window** - Pay on arrival with card
- **Cash** - Pay on arrival with cash

Payment status tracked in both DriveThrough and Order documents.

**Code location:** `drive-through.html:943-959`, `backend/routes/drive-through.js:56-60`

## API Endpoints

### Customer-Facing Endpoints

| Endpoint | Method | Purpose | Authentication |
|----------|--------|---------|----------------|
| `/api/v1/drive-through/order` | POST | Place new drive-through order | Required |
| `/api/v1/drive-through/queue` | GET | View current queue status | Public |
| `/api/v1/drive-through/orders/:orderId` | GET | Get specific order status | Required (owner/staff) |
| `/api/v1/drive-through/location` | PUT | Update customer GPS location | Required |
| `/api/v1/drive-through/arrival` | POST | Notify arrival at pickup window | Required |
| `/api/v1/drive-through/cancel` | POST | Cancel order | Required (owner/staff) |
| `/api/v1/drive-through/history` | GET | Get customer's order history | Required |

### Staff-Facing Endpoints

| Endpoint | Method | Purpose | Role Required |
|----------|--------|---------|---------------|
| `/api/v1/drive-through/complete` | POST | Mark order as completed/picked up | Staff/Admin |
| All above endpoints | - | Staff can manage all orders | Staff/Admin |

## Data Flow Example

### Complete Order Flow:

```
1. Customer Login
   ↓
2. Browse Products (pulls from /api/v1/products + /api/v1/menu)
   ↓
3. Add to Cart (client-side)
   ↓
4. Enter Details + Select Payment
   ↓
5. Place Order → POST /api/v1/drive-through/order
   ↓
6. Backend Creates:
   - DriveThrough document (queue position, ETA)
   - Order document (standard order)
   - Decrements Product.inventory.quantity
   ↓
7. Customer Sees:
   - Queue position
   - Estimated pickup time
   - Order ID
   ↓
8. Customer Drives to Location
   ↓
9. Customer Shares GPS → PUT /api/v1/drive-through/location
   ↓
10. Customer Arrives → POST /api/v1/drive-through/arrival
   ↓
11. Staff Verifies Section 21 (if required)
    ↓
12. Staff Completes Order → POST /api/v1/drive-through/complete
    ↓
13. Order Status Updated:
    - DriveThrough.status = "completed"
    - Order.status = "completed"
    - Order.fulfilledAt = Date
```

## Module Activation System

Drive-Through is a **purchasable module**:

```javascript
// All routes protected by middleware
router.use(requireModule('drive-through'));

// Checks ModuleInstallation collection
ModuleInstallation.findOne({
  businessId,
  moduleId: 'drive-through',
  status: { $in: ['trial', 'active'] }
})
```

**How it works:**
- Business must install Drive-Through module from marketplace
- Pricing: R3,999/month (HQ), R1,999/month (branches)
- Module check runs on EVERY Drive-Through API call
- If not installed/expired → Returns 403 with marketplace link

**Code location:** `backend/middleware/moduleCheck.js`, `backend/routes/drive-through.js:11`

## Reporting & Analytics

Drive-Through orders appear in:
- **Admin Panel** - All orders tab (filter by `source: "drive-through"`)
- **Reports** - Revenue reports include drive-through sales
- **Analytics** - Track drive-through vs in-store vs online
- **Order History** - Customer can view in dashboard

Filter by source: `Order.find({ source: 'drive-through' })`

## Staff Dashboard (To Be Built)

Staff dashboard will show:
- Live queue (all orders with status: in-queue, preparing, ready)
- Order details when customer arrives
- Section 21 verification workflow
- Order completion interface
- Estimated wait times

**Location:** Will be embedded in admin panel or separate `/drive-through-staff.html`

## Key Differences from Regular Orders

| Feature | Regular Order | Drive-Through Order |
|---------|---------------|---------------------|
| Delivery | Shipping address | GPS + pickup window |
| Fulfillment | Shipped | Customer pickup |
| Queue Management | No | Yes (position, ETA) |
| GPS Tracking | No | Yes (customer location) |
| Section 21 Verification | Email/upload | In-person at window |
| Payment Timing | Online only | Online OR at window |
| Order Status | Pending → Shipped → Delivered | In-queue → Preparing → Ready → Arrived → Completed |

## Benefits of This Integration

✅ **Single Source of Truth** - One product catalog, one inventory system
✅ **Unified Reporting** - All sales channels in one analytics dashboard
✅ **No Data Duplication** - Products managed once, available everywhere
✅ **Consistent Pricing** - Same prices across POS, website, drive-through
✅ **Real-time Inventory** - Stock updates immediately across all channels
✅ **Customer History** - All orders (online, POS, drive-through) in one place

## Technical Stack

- **Frontend:** Vanilla JavaScript, Fetch API
- **Backend:** Node.js, Express.js
- **Database:** MongoDB (Products, Orders, DriveThrough, Users collections)
- **Authentication:** JWT (same as main site)
- **Real-time:** Polling every 10 seconds (could upgrade to WebSockets)
- **Payment:** InstaPay, Card, Cash

## Future Enhancements

1. **WebSocket Integration** - Real-time queue updates without polling
2. **Push Notifications** - Alert customer when order ready
3. **Staff Mobile App** - Tablet interface for pickup window staff
4. **Analytics Dashboard** - Drive-through specific metrics (avg wait time, peak hours)
5. **Loyalty Integration** - Wellness points for drive-through orders
6. **Voice Ordering** - Intercom system for order modifications

## Files Modified/Created

### Created:
- `drive-through.html` - Customer interface
- `backend/modules/database/models/DriveThrough.js` - Queue management model
- `backend/routes/drive-through.js` - API endpoints
- `backend/middleware/moduleCheck.js` - Module activation middleware

### Modified:
- `backend/server.js` - Mounted drive-through routes

### To Be Created:
- `drive-through-staff.html` - Staff dashboard for queue management
- Integration tests for drive-through flow

---

**Summary:** Drive-Through is a **sales channel extension** that reuses 95% of existing infrastructure (products, inventory, orders, users, auth) while adding queue management, GPS tracking, and pickup-specific features. It's essentially POS with a drive-through layer on top.
