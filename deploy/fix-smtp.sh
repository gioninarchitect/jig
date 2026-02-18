#!/bin/bash
APP_DIR="/var/www/jig"

python3 -c "
import re
with open('$APP_DIR/.env', 'r') as f:
    content = f.read()
content = re.sub(r'SMTP_PASS=.*', 'SMTP_PASS=Br@nd0n1995', content)
with open('$APP_DIR/.env', 'w') as f:
    f.write(content)
print('Password updated')
"

# Test SMTP
python3 -c "
import smtplib, ssl
try:
    ctx = ssl.create_default_context()
    with smtplib.SMTP_SSL('mail.cleva-ai.co.za', 465, context=ctx) as s:
        s.login('otp@cleva-ai.co.za', 'Br@nd0n1995')
        print('SMTP LOGIN: SUCCESS')
except Exception as e:
    print(f'SMTP LOGIN: FAILED - {e}')
"

pm2 restart jig-api
sleep 2
curl -s http://127.0.0.1:3002/health
