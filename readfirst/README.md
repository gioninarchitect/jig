# JIG Craft Cannabis - HEADCASE EVOLVE Implementation
## Intelligent Wholesale Platform Upgrade

---

## 📋 Package Contents

| File | Purpose | Size |
|------|---------|------|
| `JIG_ONTOLOGY.md` | Complete domain specification | ~600 lines |
| `JIG_CLAUDE_CODE_PROMPTS.md` | Phase-by-phase Claude Code prompts | ~1200 lines |
| `JIG_SYSTEM_PROMPT.md` | AI Sales Assistant constraints | ~500 lines |

---

## 🎯 What This Adds to JIG Wholesale

### Current State (What We Built)
```
Client → Login → Browse → Add to Cart → Checkout → EFT → Done
Admin → View Orders → Update Status → Manage Products
```

### Future State (With HEADCASE EVOLVE)
```
Client → Login → [AI greets based on history] → Browse → [Smart suggestions] → Cart → Checkout
         ↓
    [Patterns detected: bulk_buyer, reliable_payer]
         ↓
    [Interventions: Restock reminder in 5 days, tier upgrade at R55K more]
         ↓
Admin → Dashboard → [Churn risks flagged] → [Restock predictions] → [Payment risks] → [Opportunities]
```

---

## 💰 Business Value Summary

| Feature | Without | With HEADCASE EVOLVE |
|---------|---------|---------------------|
| **Reorder Timing** | Manual follow-up | Predicted based on actual consumption |
| **Churn Prevention** | React when they leave | Predict & intervene before they leave |
| **Payment Risk** | React to late payments | Predict & adjust terms proactively |
| **Upsell/Cross-sell** | Generic promotions | Personalized based on purchase history |
| **Client Intelligence** | Spreadsheet analysis | Real-time automated insights |
| **AI Assistant** | Generic chatbot | Constrained to YOUR business rules |
| **Tier Management** | Manual tracking | Automatic upgrade suggestions |

---

## 🧠 Intelligence Capabilities

### 1. Restock Predictions
```
"Green Leaf Dispensary ordered 200g Purple Haze 18 days ago.
Average order frequency: 21 days.
Estimated stock days remaining: 3.
→ Trigger: Restock reminder (WhatsApp)"
```

### 2. Churn Risk Analysis
```
Factors analyzed:
- Days since last order vs. average frequency (40%)
- Declining order values (20%)
- Payment issues (15%)
- Support complaints (10%)
- Login inactivity (10%)
- Cart abandonment (5%)

Risk: Medium → "Personal outreach recommended"
```

### 3. Payment Risk Scoring
```
Client payment reliability: 92%
Late payments: 1 (6 months ago)
Average days to payment: 8.5 (terms: net14)
Credit utilization: 30%

Recommendation: "Low risk - consider credit limit increase"
```

### 4. Tier Eligibility
```
Current tier: Silver (R100K-R300K lifetime)
Lifetime value: R245,000
Distance to Gold: R55,000
Estimated time: 2-3 orders

→ "Show tier progress bar in client dashboard"
```

### 5. Product Recommendations
```
Based on purchase history:
- Always orders: Purple Haze, Pre-Rolls
- Never tried: Edibles, Concentrates
- Trending with similar clients: Gelato

→ "Suggest Gelato as cross-sell opportunity"
```

---

## 🔄 Event Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT ACTION                            │
│                     "Places an order"                           │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                         EVENT BUS                                │
│              emitOrderPlaced(orderId, items, total)             │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                    CLIENT WORLD REDUCER                          │
│  • Update purchasing.totalOrders                                 │
│  • Update purchasing.lifetimeValue                               │
│  • Recalculate orderFrequencyDays                               │
│  • Update preferredProducts                                      │
│  • Recalculate inventory.estimatedStockDays                     │
│  • Check tier upgrade eligibility                                │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                    PATTERN DETECTION                             │
│  • detectPurchasingPatterns() → "bulk_buyer" (confidence: 0.85) │
│  • detectPaymentPatterns() → "reliable_payer"                   │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                  INTERVENTION GENERATOR                          │
│  • Check: tier_upgrade_eligible? → Yes                          │
│  • Generate: "Congratulations! You've unlocked Gold pricing!"   │
│  • Schedule: Send email in 24 hours                             │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                      ADMIN DASHBOARD                             │
│  • Client health score updated                                   │
│  • Tier upgrade flagged                                         │
│  • Revenue forecast adjusted                                     │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🤖 AI Assistant Examples

### Client Conversation (Good)
```
Client: "What should I order?"

JIG AI: "Based on your last 3 orders, you typically go through:
- Purple Haze (~200g/month)
- Pre-Roll 6-Packs (~30 units/month)

Last order was 18 days ago, so you're probably getting low. How about:
- 250g Purple Haze @ R162,500
- 50x Pre-Roll 6-Packs @ R7,500

That's R170,000 total, and you'd be only R30K from Gold pricing!"
```

### Client Conversation (Boundary Respected)
```
Client: "Can you give me a better price?"

JIG AI: "Your Silver tier already gets you solid bulk pricing. For 
custom quotes beyond standard tiers, I'd need to connect you with 
our sales manager.

That said, you're R55K from Gold tier - that's automatic ~5% savings.
A couple more orders and you're there.

Want me to flag this for a sales callback?"
```

### Admin View
```
┌─────────────────────────────────────────────────────────────┐
│  CLIENT INTELLIGENCE DASHBOARD                               │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ⚠️  HIGH PRIORITY (3 clients)                              │
│  ├── CBD Wellness Co - CHURN RISK HIGH (45 days no order)  │
│  ├── Herbal Haven - PAYMENT OVERDUE (R32,000, 7 days)      │
│  └── Green Solutions - STOCK CRITICAL (Est. 2 days left)   │
│                                                              │
│  📈 OPPORTUNITIES (5 clients)                               │
│  ├── Green Leaf - R55K to Gold tier (suggest bulk order)   │
│  ├── Wellness Plus - Never tried edibles (cross-sell)      │
│  └── ... 3 more                                             │
│                                                              │
│  📊 RESTOCK PREDICTIONS (Next 7 days)                       │
│  ├── Mon: Green Leaf (~R170K), Cape Cannabis (~R85K)       │
│  ├── Wed: Herbal Wellness (~R120K)                         │
│  └── Fri: 4 clients due                                     │
│                                                              │
│  💰 REVENUE FORECAST                                        │
│  ├── Next 7 days: R450,000 (based on patterns)             │
│  ├── Next 30 days: R1.8M                                   │
│  └── Confidence: 78%                                        │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 🚀 Implementation Path

### Phase 1: Foundation (Week 1)
- [ ] Run Claude Code prompts Phase 1-2 (Types & Schema)
- [ ] Set up database tables
- [ ] Initialize client world states from existing data

### Phase 2: Events & State (Week 2)
- [ ] Run Claude Code prompts Phase 3 (Events & State)
- [ ] Integrate event emitters into existing order flow
- [ ] Test state updates on order lifecycle

### Phase 3: Intelligence (Week 3)
- [ ] Run Claude Code prompts Phase 4 (Patterns & Inference)
- [ ] Validate predictions against historical data
- [ ] Tune thresholds for your business

### Phase 4: UI Integration (Week 4)
- [ ] Add intelligence displays to admin dashboard
- [ ] Add AI assistant chat interface
- [ ] Add client-facing recommendations

### Phase 5: Automation (Week 5+)
- [ ] Set up intervention channels (email, WhatsApp)
- [ ] Configure automation rules
- [ ] Monitor and tune based on results

---

## 📊 Metrics to Track

### Business Outcomes
- Reorder reminder conversion rate
- Churn prevention success rate
- Average order value change
- Client tier progression speed
- Cart abandonment recovery rate

### System Performance
- Prediction accuracy (restock timing)
- Churn prediction accuracy
- False positive rate on interventions
- AI assistant resolution rate

---

## ⚡ THE GOLDEN RULE

> **All data must be database persistent, linked to working healthy API endpoints, bound to working action buttons and secondary tabs/components on UI. All dashboards and their subsections must be wired up. No assumptions can be made.**

### What This Means for JIG Implementation

| Component | Must Have | No Mocks/Stubs |
|-----------|-----------|----------------|
| Client World State | MongoDB/PostgreSQL table | Real persistence |
| Restock Predictions | `/api/intelligence/restock/:clientId` | Working endpoint |
| Churn Risk Badge | Click → shows details | Bound action |
| Admin Dashboard tabs | All 5 sections functional | Every tab wired |
| Intervention triggers | Actually sends email/WhatsApp | Real integration |

### Before Go-Live Checklist

- [ ] All ClientWorldState fields persist to database
- [ ] All inference endpoints return calculated data (not mocks)
- [ ] All dashboard buttons trigger real API calls
- [ ] All tabs/subsections display real data
- [ ] All interventions trigger actual notifications
- [ ] Refresh maintains state from database

---

## 🔒 Privacy & Compliance

### POPIA Compliance
- Data stored locally (South African jurisdiction)
- No raw conversation storage
- Explicit consent for automated communications
- Data export/delete on request

### Business Boundaries
- AI cannot negotiate prices
- AI cannot approve credit
- AI cannot make medical claims
- AI cannot access competitor data

---

## 🎯 Quick Start

1. **Open Claude Code** (or claude.ai with computer use)

2. **Copy Quick Start prompt** from `JIG_CLAUDE_CODE_PROMPTS.md`

3. **Replace placeholders** and run

4. **Review generated code** in `src/world-model/`

5. **Integrate with existing JIG webapp**

---

## 📞 Support

Questions about implementation?
- Review the ontology: `JIG_ONTOLOGY.md`
- Check the system prompt: `JIG_SYSTEM_PROMPT.md`
- Step-by-step prompts: `JIG_CLAUDE_CODE_PROMPTS.md`

---

**The Ontology is the cage. The AI obeys.**

*Built with HEADCASE EVOLVE + World Model Architecture*
