#!/bin/bash
# ──────────────────────────────────────────────
# PureGro Server Audit - Run on 154.66.197.199
# Checks ports, services, and readiness
# ──────────────────────────────────────────────

echo "========================================"
echo "  PureGro SERVER AUDIT - $(date)"
echo "========================================"

echo ""
echo "── OS ─────────────────────────────────"
cat /etc/os-release 2>/dev/null | head -3
uname -r

echo ""
echo "── DISK & MEMORY ──────────────────────"
df -h / | tail -1
free -h | head -2

echo ""
echo "── LISTENING PORTS ────────────────────"
ss -tlnp 2>/dev/null || netstat -tlnp 2>/dev/null

echo ""
echo "── NODE.JS ────────────────────────────"
if command -v node &>/dev/null; then
  echo "Node: $(node -v)"
  echo "NPM:  $(npm -v)"
else
  echo "NOT INSTALLED"
fi

echo ""
echo "── PM2 ────────────────────────────────"
if command -v pm2 &>/dev/null; then
  echo "PM2:  $(pm2 -v)"
  pm2 list
else
  echo "NOT INSTALLED"
fi

echo ""
echo "── NGINX ──────────────────────────────"
if command -v nginx &>/dev/null; then
  echo "nginx: $(nginx -v 2>&1)"
  echo "Status: $(systemctl is-active nginx 2>/dev/null || echo 'unknown')"
  echo "Sites enabled:"
  ls -1 /etc/nginx/sites-enabled/ 2>/dev/null || echo "  (no sites-enabled dir)"
else
  echo "NOT INSTALLED"
fi

echo ""
echo "── POSTGRESQL ─────────────────────────"
if command -v psql &>/dev/null; then
  echo "psql: $(psql --version 2>&1)"
  echo "Status: $(systemctl is-active postgresql 2>/dev/null || echo 'unknown')"
  echo "Databases:"
  sudo -u postgres psql -l 2>/dev/null | grep -E "^\s\w" | awk '{print "  " $1}' || echo "  (cannot list)"
else
  echo "NOT INSTALLED"
fi

echo ""
echo "── CERTBOT / SSL ────────────────────"
if command -v certbot &>/dev/null; then
  echo "certbot: $(certbot --version 2>&1)"
  echo "Certificates:"
  certbot certificates 2>/dev/null | grep -E "Domains|Expiry" || echo "  (none)"
else
  echo "NOT INSTALLED"
fi

echo ""
echo "── FIREWALL (UFW) ───────────────────"
if command -v ufw &>/dev/null; then
  ufw status 2>/dev/null
else
  echo "UFW not installed"
fi

echo ""
echo "── /var/www CONTENTS ────────────────"
ls -la /var/www/ 2>/dev/null || echo "(dir does not exist)"

echo ""
echo "── PORT AVAILABILITY CHECK ──────────"
for port in 3001 5432 80 443; do
  if ss -tlnp | grep -q ":${port} " 2>/dev/null; then
    echo "  Port $port: IN USE"
  else
    echo "  Port $port: AVAILABLE"
  fi
done

echo ""
echo "========================================"
echo "  AUDIT COMPLETE"
echo "========================================"
