# Future Development: POS Integrations

## 1. Receipt Printer Integration (Universal Plug & Play)

### Recommended Approach: ESC/POS Protocol

ESC/POS is the industry standard command language for thermal receipt printers. Most receipt printers (Epson, Star Micronics, etc.) support this protocol.

### JavaScript Libraries

| Library | Use Case | NPM Downloads |
|---------|----------|---------------|
| `esc-pos-printer` | React.js / Node.js integration | 2,900+ |
| `xml-escpos-helper` | Template-based printing with placeholders | Active |
| `receiptline` | Markdown-like syntax to ESC/POS commands | Active |

### Connection Methods

1. **Network Printers (TCP)** - Ethernet-connected printers
   - Send byte streams via TCP socket
   - Requires backend proxy or local service

2. **USB/Serial Printers**
   - Use browser WebUSB API (Chrome/Edge only)
   - Or use local print service (JSPrintManager, plugin)

3. **Browser Print Dialog** (Current Implementation)
   - Uses `window.print()` with print-optimized stylesheet
   - Works with ANY printer including thermal printers
   - Chrome kiosk mode can auto-print without dialog

### Current Implementation Status

The POS already has Print Receipt functionality that:
- Opens receipt in new window
- Triggers browser print dialog
- Works with any locally connected printer

### Future Enhancement: Direct ESC/POS Printing

**Estimated Effort:** 8-12 hours
**Estimated Cost:** R4,000 - R6,000

Would add:
- Direct TCP printing to network printers (no dialog)
- ESC/POS command generation for 80mm/58mm thermal receipts
- Print logo/barcode support
- Cash drawer trigger on print

### Sources
- [ESC/POS JavaScript Library](https://medium.com/till-engineering/receipt-printing-with-esc-pos-a-javascript-cross-platform-library-7110d7f7a1db)
- [Neodynamic JSPrintManager](https://www.neodynamic.com/articles/How-to-print-raw-ESC-POS-commands-from-Javascript/)
- [Print from Browser to Thermal Printer](https://parzibyte.me/blog/en/2019/10/13/print-ticket-in-thermal-printer-directly-from-browser/)
- [GitHub ESC/POS Tools](https://github.com/escpos)

---

## 2. Lightspeed POS Integration (Import/Export)

### Overview

Lightspeed Retail API allows:
- Product sync (import/export)
- Inventory management
- Sales data sync
- Customer sync

### API Type
RESTful API with OAuth 2.0 authentication

### Supported Methods
- GET, POST, PUT, DELETE
- Rate limits apply

### Key Integration Points

| Feature | API Endpoint | Direction |
|---------|-------------|-----------|
| Products | `/API/Account/{accountID}/Item` | Bi-directional |
| Inventory | `/API/Account/{accountID}/ItemShop` | Bi-directional |
| Sales | `/API/Account/{accountID}/Sale` | Import from Lightspeed |
| Customers | `/API/Account/{accountID}/Customer` | Bi-directional |

### Import Methods

1. **API Integration** (Real-time)
   - Build custom sync service
   - Schedule automatic syncs every 30 mins

2. **CSV Import** (Manual)
   - Export from Lightspeed as CSV
   - Import to Basotho Medical Herbs via admin panel
   - Supports .CSV, .XLSX, .XLS formats

### Implementation Options

**Option A: One-Click Import/Export UI**
- Admin panel "Import from Lightspeed" button
- OAuth flow to connect Lightspeed account
- Selective product sync (map categories)

**Estimated Effort:** 20-30 hours
**Estimated Cost:** R10,000 - R15,000

**Option B: Background Sync Service**
- Automatic bi-directional sync
- Real-time inventory updates
- Sales push back to Lightspeed

**Estimated Effort:** 40-50 hours
**Estimated Cost:** R20,000 - R25,000

### Technical Requirements

1. Register as Lightspeed API Partner
2. Implement OAuth 2.0 flow
3. Handle rate limits (varies by plan)
4. Build mapping UI for categories/products
5. Error handling and retry logic

### Sources
- [Lightspeed Retail API Documentation](https://retail-support.lightspeedhq.com/hc/en-us/articles/229129268-Integrating-with-the-Lightspeed-Retail-POS-R-Series-API)
- [Lightspeed API Integration Guide](https://api2cart.com/api-technology/lightspeed-api/)
- [Lightspeed X-Series APIs](https://www.lightspeedhq.com/pos/retail/api/)
- [Inventory Import Guide](https://retail-support.lightspeedhq.com/hc/en-us/articles/229129988-Importing-inventory-data)

---

## Priority Recommendation

1. **Phase 1** (Current): Browser print dialog works universally
2. **Phase 2**: Add CSV import from Lightspeed (4 hours)
3. **Phase 3**: Direct ESC/POS printing (8-12 hours)
4. **Phase 4**: Full Lightspeed API integration (20-50 hours)

---

*Document Created: November 26, 2025*
*Rate: R500/hour*
