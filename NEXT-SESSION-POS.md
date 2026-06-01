# Origin Retail POS — Next Session Plan

**Date prepared:** 2026-06-01 (end of day)
**Branch:** `v1.4` (all committed & pushed)
**POS live:** https://origin.cleva-ai.co.za/pos.html
**Branch:** Potchefstroom (`OR-POT`)

---

## START HERE — Session checklist

1. [ ] Read this file + memory `project_potchefstroom_pos_live.md`
2. [ ] **PRINTER** — finish S300H setup (priority 1, see below)
3. [ ] POSBANK Chrome kiosk autostart on boot
4. [ ] Test full sale → receipt print end-to-end
5. [ ] CannaMed supplier suggested retail (waiting on Sacred Roots)

---

## PRIORITY 1 — Thermal Printer (S300H)

**Hardware:** S300H, 80mm, ESC/POS, Interface USB + LAN, Cash Drawer 24V.
Plugged into POSBANK (confirm USB vs LAN tomorrow).

**Step A — install CUPS + add printer (run on POSBANK terminal):**
```bash
sudo apt update && sudo apt install -y cups system-config-printer
sudo usermod -aG lpadmin $USER
sudo systemctl enable --now cups
USB_URI=$(lpinfo -v | grep -i usb | grep -iv "file\|network" | head -1 | awk '{print $2}')
echo "Detected printer URI: $USB_URI"
sudo lpadmin -p OriginReceipt -E -v "$USB_URI" -m raw
sudo lpadmin -d OriginReceipt
sudo cupsenable OriginReceipt && sudo cupsaccept OriginReceipt
printf "\n   ORIGIN RETAIL\n   Potchefstroom\n   Printer OK!\n\n\n\n" | lp -d OriginReceipt
```
- If `USB_URI` is empty → printer on LAN, get its IP, use `socket://<IP>:9100` instead.

**Step B — silent printing in Chrome (no dialog per sale):**
Add `--kiosk-printing` to the Chromium launch flags. POS receipt flow already exists:
`frontend/pos-checkout.js` → `printReceipt()` → opens `/api/pos/sale/:id/receipt?print=true`.
The receipt is a PDF (`pos.controller.js getReceipt` → invoiceGenerator). May need to
set PDF page width to 80mm in the invoice generator for clean thermal output — check
`backend/services/invoiceGenerator.js` (or similar) and set receipt page size 80mm.

**Step C — cash drawer kick** (optional): S300H opens drawer via ESC/POS `ESC p 0 25 250`.
`pos-printing.js` already builds ESC/POS — can add drawer-kick on cash sales.

---

## PRIORITY 2 — POSBANK kiosk autostart

XFCE desktop + Chromium already installed. Add autostart so Chrome opens the POS
full-screen on boot:
```bash
mkdir -p ~/.config/autostart
cat > ~/.config/autostart/pos-kiosk.desktop << 'EOF'
[Desktop Entry]
Type=Application
Name=Origin POS
Exec=chromium-browser --kiosk --kiosk-printing --no-sandbox --disable-infobars --disable-restore-session-state https://origin.cleva-ai.co.za/pos.html
X-GNOME-Autostart-enabled=true
EOF
sudo reboot
```

---

## DEPLOY WORKFLOW (don't forget)

- Live server **is NOT a git repo**. Deploy = `scp` file → `pm2 restart origin-pos --update-env`.
- After ANY frontend change: bump SW cache `/var/www/origin/pos/sw.js`
  (`origin-pos-vN` → next). POSBANK must **close+reopen Chromium** (not refresh).
- DB seeds: run on live server (`scp` script + `node`), NOT locally.
- **Products API reads `inventory.quantity` on the Product doc** — always set it
  when seeding (BranchInventory alone shows "No products in stock").
- Server: `root@154.66.197.199`, app `/var/www/origin/pos/`.

---

## LOGIN (current launch config)

- Accounts: `florisolivier7@gmail.com` (super_admin), `florisolivier72@gmail.com` (owner)
- OTP master code **123456** (no email needed) · PIN **123456**
- ⚠️ Remove/gate master OTP before real customer scale.

---

## PRODUCTS — current state (all at supplier suggested retail)

| Brand | Count | Notes |
|---|---|---|
| Lamelle (incl Pelo Baum) | 18 | RSP incl VAT, exact |
| Bio Sculpture Gemini gels | 50 | R130 retail (cost R70 trade) |
| Bio Sculpture body-care/spa | 32 | Suggested Retail Pricelist |
| Harmonic Mycology | 30 | `mushrooms` category |
| Origin Teas (incl Red Hibiscus) | 15 | `teas` category |
| CannaMed (Sacred Roots) | 12 | ⚠️ marked up x1.5, NO supplier RSP yet |
| CBD Full Spectrum | 6 | retail + VAT |

**Outstanding product data:**
- CannaMed suggested retail list (have trade only)
- Bio Sculpture body-care exact trade costs (estimated 60% of retail)
- Product images for cards (currently icon-only)

---

## ALSO OPEN (Wave 1)

- [ ] Test full POS sale flow end-to-end at till (task #7)
- [ ] Real supplier WhatsApp numbers in supplier-order.html (task #12)
- [ ] OTP email SPF/DKIM/DMARC so real emails inbox (task #33) — deferred while
      master code 123456 in use

---

## BIGGER PICTURE (Waves 2–6, after POS stable)

W2 Compliance grounding · W3 TnT-ZA farm platform + API bridge · W4 Pharmacy intern
pipeline · W5 Customer experience (online ordering, loyalty, brand .md) · W6 Multi-node
scaling. Full task list in TaskList (#13–#42).
