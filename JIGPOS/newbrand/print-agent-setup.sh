#!/bin/bash
# Install the Origin local print agent as a service. Run: curl -s URL | sudo bash
set -e

echo ">> Downloading print agent..."
curl -s https://origin.cleva-ai.co.za/print-agent.py -o /opt/origin-print-agent.py
chmod +x /opt/origin-print-agent.py

echo ">> Creating service..."
cat > /etc/systemd/system/origin-print.service << 'EOF'
[Unit]
Description=Origin POS Print Agent
After=cups.service network.target

[Service]
ExecStart=/usr/bin/python3 /opt/origin-print-agent.py
Restart=always
User=root

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable --now origin-print
sleep 2

echo ""
if curl -s http://127.0.0.1:9999/ | grep -q origin-print; then
  echo "==================================================="
  echo " PRINT AGENT RUNNING on 127.0.0.1:9999"
  echo " The POS will now print slips + kick the drawer"
  echo " automatically on every sale."
  echo "==================================================="
else
  echo "!! Agent not responding. Check: systemctl status origin-print"
fi
