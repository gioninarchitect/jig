# 🌿 CBD Wellness 24

**Cannabis Wellness & Accessories E-commerce Platform**

![Status](https://img.shields.io/badge/status-active-success)
![Version](https://img.shields.io/badge/version-1.0.0-blue)
![Port](https://img.shields.io/badge/port-3001-orange)

---

## 🎯 Overview

**CBD Wellness 24** is a comprehensive e-commerce platform for cannabis accessories, CBD wellness products, and integrated coffee shop menus (La Brewha café & Bean & Bud).

### Key Features
- 🛒 **Cannabis Accessories Store** - Grinders, papers, vaporizers, storage
- 💊 **CBD Wellness Products** - Oils, edibles, topicals, beverages
- ☕ **La Brewha Café** - Coffee shop with POS integration
- 🌱 **Bean & Bud** - Cannabis + coffee pairing menu
- 🏥 **Section 21 Medical Cannabis** - Authenticated access for prescription products
- 🤝 **Affiliate System** - 15% commission for wellness advocates
- 🎮 **Gamification** - Wellness Points, levels, rewards
- 📊 **Viral Scoring** - Product recommendation engine
- 🔄 **POS Integration** - Real-time menu synchronization

---

## 🚀 Quick Start

### Prerequisites
- Node.js v20+
- MongoDB 6+
- Port 3001 available

### Installation

```bash
cd /Users/florisolivier/CBD_Wellness_24
npm install
```

### Configuration

Edit `.env` file with your settings:
```env
MONGODB_URI=mongodb://localhost:27017/cbdwellness24
PORT=3001
JWT_SECRET=your_secret_key
```

### Start Server

```bash
# Development (with auto-restart)
npm run dev

# Production
npm start
```

Server will be available at:
- **Main Site**: http://localhost:3001
- **Admin Panel**: http://localhost:3001/admin
- **Dashboard**: http://localhost:3001/dashboard

---

## 🎨 Brand Identity

### Colors
```css
--cbd-forest-green: #2D5016;      /* Primary */
--cbd-sage-green: #4A7C59;        /* Accent */
--cbd-mint: #6B9080;              /* Light accent */
--cbd-cream: #F4F1DE;             /* Backgrounds */
--cbd-gold: #C9A961;              /* Premium accents */
```

### Sub-Brands
- **CBD Wellness** - Main brand
- **La Brewha café** - Coffee shop
- **Bean & Bud** - Cannabis + coffee pairing

---

## 📡 API Endpoints

### Menu System (POS Integration)

#### Public Endpoints
```
GET  /api/v1/menu                    - Get all menu items
GET  /api/v1/menu/venue/:venue       - Get menu by venue (la-brewha, bean-and-bud)
GET  /api/v1/menu/featured           - Get featured items
GET  /api/v1/menu/:id                - Get single item
POST /api/v1/menu/:id/calculate-price - Calculate price with customizations
```

#### Admin Endpoints (Requires Auth)
```
POST   /api/v1/menu/admin/sync-pos      - Sync menu from POS system
GET    /api/v1/menu/admin/sync-status   - Get sync status
POST   /api/v1/menu/admin/update-inventory - Update stock levels
POST   /api/v1/menu/admin/create        - Create menu item manually
PUT    /api/v1/menu/admin/:id           - Update menu item
DELETE /api/v1/menu/admin/:id           - Delete menu item
```

### Products
```
GET  /api/v1/products       - Get all products
GET  /api/v1/products/:id   - Get single product
```

### Orders
```
POST /api/v1/orders         - Create order
GET  /api/v1/orders         - Get user's orders
```

### Affiliate System
```
POST /api/v1/affiliate/register  - Register as affiliate
POST /api/v1/affiliate/login     - Affiliate login
GET  /api/v1/affiliate/dashboard - Get performance data
```

### Viral Scoring
```
GET  /api/v1/viral/score/:id     - Get viral score for product
POST /api/v1/viral/track         - Track engagement
```

---

## 🗄️ Database Structure

### Collections

1. **users** - Customer accounts, wellness points
2. **products** - Cannabis accessories & CBD products
3. **menuitems** - Coffee shop menu (La Brewha, Bean & Bud)
4. **orders** - E-commerce transactions
5. **affiliates** - Wellness advocates program
6. **viralscores** - Product viral metrics
7. **viralcampaigns** - Marketing campaigns

### Key Models

#### MenuItem
```javascript
{
  name: String,
  description: String,
  venue: 'la-brewha' | 'bean-and-bud' | 'both',
  category: 'coffee' | 'espresso' | 'cbd-infused' | ...,
  price: Number,
  cbdInfused: Boolean,
  cbdDosage: String,
  posId: String,  // POS system ID
  available: Boolean,
  inStock: Boolean
}
```

---

## ☕ POS Integration

### How It Works

1. **Sync Menu from POS**
   ```bash
   POST /api/v1/menu/admin/sync-pos
   {
     "venue": "la-brewha",
     "posMenuItems": [
       {
         "id": "POS-001",
         "name": "Cappuccino",
         "category": "COFFEE",
         "price": 35.00,
         "available": true,
         "inStock": true
       }
     ]
   }
   ```

2. **Update Inventory**
   ```bash
   POST /api/v1/menu/admin/update-inventory
   {
     "inventoryUpdates": [
       { "id": "POS-001", "inStock": false }
     ]
   }
   ```

3. **Auto-Sync** (Optional)
   - Configure POS webhook to call `/api/v1/menu/admin/sync-pos`
   - Recommended: Every 5 minutes
   - Sync status available at `/api/v1/menu/admin/sync-status`

---

## 🏥 Section 21 (Medical Cannabis)

Protected area requiring authentication for prescription products.

### Access Control
- Users must be logged in
- Medical verification required
- Prescription upload
- Age verification (21+)

---

## 🤝 Affiliate Program

**Commission**: 15% on all sales

### Tiers
- **Soldier** - Default (15%)
- **Influencer** - Content creators (15%)
- **Sales Rep** - Active sellers (15%)
- **Ambassador** - Brand representatives (15%)

### Features
- Custom affiliate codes (SOL123, INF456, etc.)
- Link tracking
- Real-time commission dashboard
- Payout management (bank, PayPal, crypto)

---

## 🛠️ Development

### Project Structure
```
CBD_Wellness_24/
├── backend/
│   ├── server.js                   - Main server (Port 3001)
│   ├── modules/
│   │   ├── database/models/
│   │   │   ├── MenuItem.js         - Coffee shop menu
│   │   │   ├── Product.js          - CBD/accessories
│   │   │   ├── User.js
│   │   │   ├── Order.js
│   │   │   ├── Affiliate.js
│   │   │   └── ViralScore.js
│   │   ├── pos/
│   │   │   └── service.js          - POS integration
│   │   ├── auth/
│   │   ├── payment/
│   │   └── notification/
│   └── routes/
│       ├── menu.js                 - Coffee shop API
│       ├── affiliate.js
│       └── viral.js
├── css/                            - Stylesheets
├── images/                         - Product images
├── *.html                          - Frontend pages
├── .env                            - Environment config
└── package.json
```

### NPM Scripts
```bash
npm start              # Start server
npm run dev            # Dev mode (nodemon)
npm test               # Run tests
npm run lint           # ESLint
npm run setup          # Setup database
npm run seed           # Seed data
```

---

## 📱 Frontend Pages

- `index.html` - Homepage
- `login.html` - Authentication
- `dashboard.html` - User dashboard
- `admin.html` - Admin panel
- `products.html` - Product catalog
- `cart.html` - Shopping cart
- `affiliate.html` - Affiliate portal
- `menu.html` - Coffee shop menu (La Brewha, Bean & Bud)

---

## 🔒 Security

- **JWT Authentication** - Secure token-based auth
- **bcrypt** - Password hashing (12 rounds)
- **Helmet** - Security headers
- **CORS** - Cross-origin protection
- **Rate Limiting** - API protection
- **MongoDB Sanitization** - Injection prevention

---

## 🎮 Gamification

**Wellness Points System** (replaces LD Coins)

### Earning Points
- Purchase products: 10 points per R100 spent
- Product reviews: 50 points
- Referrals: 200 points
- Daily login: 10 points
- Streak bonuses: Up to 100 points

### Membership Tiers
- **Bronze** - 0-500 points
- **Silver** - 501-2000 points
- **Gold** - 2001-5000 points
- **Platinum** - 5000+ points

---

## 📞 Contact & Support

- **Email**: hello@cbdwellness24.co.za
- **Website**: cbdwellness24.co.za

---

## 📝 License

ISC License - CBD Wellness 24

---

## 🌟 Features Roadmap

- [ ] Mobile app (React Native)
- [ ] Loyalty rewards redemption
- [ ] Live chat support
- [ ] Subscription boxes
- [ ] AI product recommendations
- [ ] Multi-location support
- [ ] Delivery tracking
- [ ] Customer reviews system

---

**Built with ❤️ for the cannabis wellness community**

*"Natural Relief, Available Anytime"*
