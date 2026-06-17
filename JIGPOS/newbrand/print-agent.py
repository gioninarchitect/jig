#!/usr/bin/env python3
"""
Origin POS local print agent.
Listens on 127.0.0.1:9999, receives a sale JSON from the POS web app,
formats an 80mm ESC/POS slip, prints it to the 'OriginReceipt' CUPS printer,
and kicks the cash drawer on cash sales. No PDF, no print dialog.
"""
import json, subprocess
from http.server import BaseHTTPRequestHandler, HTTPServer

PRINTER = "OriginReceipt"
WIDTH = 42  # chars per line on 80mm Font A

ESC = b"\x1b"
GS = b"\x1d"
INIT = ESC + b"@"
CENTER = ESC + b"a\x01"
LEFT = ESC + b"a\x00"
BOLD_ON = ESC + b"E\x01"
BOLD_OFF = ESC + b"E\x00"
BIG = GS + b"!\x11"
NORMAL = GS + b"!\x00"
CUT = GS + b"V\x00"
DRAWER = ESC + b"p\x00\x19\xfa"


def rand(x):
    try:
        return "R%.2f" % float(x)
    except Exception:
        return "R0.00"


def row(left, right):
    """left text ... right text padded to WIDTH"""
    space = WIDTH - len(left) - len(right)
    if space < 1:
        left = left[: WIDTH - len(right) - 1]
        space = 1
    return (left + " " * space + right + "\n").encode("ascii", "replace")


def build_slip(sale):
    b = bytearray()
    b += INIT
    b += CENTER + BIG + BOLD_ON + b"ORIGIN\n" + NORMAL
    b += b"by ILCO\n" + BOLD_OFF
    b += (sale.get("branchName", "Potchefstroom") + "\n").encode("ascii", "replace")
    b += ("-" * WIDTH + "\n").encode()
    b += LEFT
    b += ("Slip: " + str(sale.get("saleNumber", "")) + "\n").encode("ascii", "replace")
    if sale.get("date"):
        b += ("Date: " + str(sale["date"]) + "\n").encode("ascii", "replace")
    if sale.get("cashier"):
        b += ("Served by: " + str(sale["cashier"]) + "\n").encode("ascii", "replace")
    b += ("-" * WIDTH + "\n").encode()

    for it in sale.get("items", []):
        name = str(it.get("name", ""))
        qty = it.get("quantity", 1)
        unit = it.get("unitPrice", 0)
        line = float(unit) * float(qty)
        b += (name[:WIDTH] + "\n").encode("ascii", "replace")
        b += row("  %s x %s" % (qty, rand(unit)), rand(line))

    b += ("-" * WIDTH + "\n").encode()
    if sale.get("subtotal") is not None:
        b += row("Subtotal", rand(sale["subtotal"]))
    if sale.get("vat") is not None:
        b += row("VAT (15%)", rand(sale["vat"]))
    b += BOLD_ON + BIG
    b += row("TOTAL", rand(sale.get("total", 0)))
    b += NORMAL + BOLD_OFF
    b += ("-" * WIDTH + "\n").encode()

    pm = str(sale.get("paymentMethod", "")).upper()
    if pm:
        b += row("Paid", pm)
    if sale.get("cashGiven") is not None:
        b += row("Cash", rand(sale["cashGiven"]))
    if sale.get("change") is not None:
        b += row("Change", rand(sale["change"]))

    b += CENTER + b"\nThank you!\nWellness, naturally.\n"
    b += b"\n\n\n\n"
    b += CUT
    return bytes(b)


def kick_drawer():
    subprocess.run(["lp", "-d", PRINTER, "-o", "raw"], input=DRAWER, check=False)


def do_print(data):
    # Kick the drawer FIRST (own job, like the working test) for cash sales
    if str(data.get("paymentMethod", "")).lower() == "cash":
        kick_drawer()
    slip = build_slip(data)
    subprocess.run(["lp", "-d", PRINTER, "-o", "raw"], input=slip, check=False)


class Handler(BaseHTTPRequestHandler):
    def _cors(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Access-Control-Allow-Private-Network", "true")

    def do_OPTIONS(self):
        self.send_response(204)
        self._cors()
        self.end_headers()

    def do_GET(self):
        self.send_response(200)
        self._cors()
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(b'{"ok":true,"agent":"origin-print"}')

    def do_POST(self):
        try:
            length = int(self.headers.get("Content-Length", 0))
            data = json.loads(self.rfile.read(length) or b"{}")
            if self.path == "/drawer":
                subprocess.run(["lp", "-d", PRINTER, "-o", "raw"], input=DRAWER, check=False)
            else:
                do_print(data)
            self.send_response(200)
            self._cors()
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(b'{"success":true}')
        except Exception as e:
            self.send_response(500)
            self._cors()
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"success": False, "error": str(e)}).encode())

    def log_message(self, *args):
        pass


if __name__ == "__main__":
    HTTPServer(("127.0.0.1", 9999), Handler).serve_forever()
