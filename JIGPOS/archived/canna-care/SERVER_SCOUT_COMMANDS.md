# Server Reconnaissance Commands

Run these commands on your server (154.66.197.104) to gather information about the current setup.
Copy and paste the output back to me so I can plan the deployment safely.

---

## 1. PM2 Status (Critical - Don't Touch Existing Apps)

```bash
pm2 list
```

**Purpose**: See all running PM2 applications. We will NOT touch any existing apps.

---

## 2. Nginx Configuration

```bash
# Check if Nginx is installed and running
which nginx
nginx -v
sudo systemctl status nginx

# List all Nginx sites
ls -la /etc/nginx/sites-available/
ls -la /etc/nginx/sites-enabled/

# Show main Nginx config (first 50 lines)
head -50 /etc/nginx/nginx.conf

# Show any existing site configs
ls -l /etc/nginx/sites-available/
```

**Purpose**: Understand current Nginx setup without modifying anything.

---

## 3. MongoDB Status

```bash
# Check if MongoDB is installed
which mongod
which mongosh

# MongoDB version
mongod --version
mongosh --version

# MongoDB service status
sudo systemctl status mongod

# List all databases (don't modify)
mongosh --eval "show dbs" --quiet

# Check if cbdwellness24 database exists
mongosh --eval "db.getMongo().getDBNames()" --quiet | grep cbdwellness24
```

**Purpose**: Check MongoDB setup and ensure cbdwellness24 database doesn't already exist.

---

## 4. Port Usage

```bash
# Check what's using port 3001 (our planned port)
sudo lsof -i :3001
sudo netstat -tulpn | grep 3001

# Check common ports
sudo netstat -tulpn | grep -E ':(80|443|3000|3001|27017)'
```

**Purpose**: Ensure port 3001 is available for our app.

---

## 5. Directory Structure

```bash
# Check what's in /var/www/
ls -la /var/www/

# Check if our directory already exists
ls -la /var/www/cbd-wellness-24 2>/dev/null || echo "Directory does not exist"

# Check web root
ls -la /var/www/html/ 2>/dev/null || echo "No /var/www/html directory"
```

**Purpose**: See where files are currently stored and ensure we don't overwrite anything.

---

## 6. Node.js Setup

```bash
# Node.js version
node --version

# npm version
npm --version

# Check where Node is installed
which node
which npm

# Check global npm packages
npm list -g --depth=0
```

**Purpose**: Verify Node.js version compatibility.

---

## 7. System Resources

```bash
# Disk space
df -h

# Memory usage
free -h

# CPU info
nproc
```

**Purpose**: Ensure sufficient resources for our app.

---

## 8. Firewall Status

```bash
# Check firewall status
sudo ufw status

# List all firewall rules
sudo ufw status numbered
```

**Purpose**: Know which ports are open.

---

## 9. Current Nginx Virtual Hosts

```bash
# Show content of each enabled site (first 30 lines)
for file in /etc/nginx/sites-enabled/*; do
  echo "=== $file ==="
  head -30 "$file"
  echo ""
done
```

**Purpose**: See existing Nginx configurations to avoid conflicts.

---

## 10. User and Permissions

```bash
# Current user
whoami

# Check www-data user (Nginx default)
id www-data

# Check permissions on /var/www/
ls -ld /var/www/
```

**Purpose**: Understand user permissions for file deployment.

---

## COPY THIS COMPLETE COMMAND BLOCK

For your convenience, here's everything in one copy-paste block:

```bash
echo "=== PM2 STATUS ==="
pm2 list
echo ""

echo "=== NGINX INFO ==="
which nginx
nginx -v
sudo systemctl status nginx | head -10
echo ""

echo "=== NGINX SITES ==="
ls -la /etc/nginx/sites-available/
ls -la /etc/nginx/sites-enabled/
echo ""

echo "=== MONGODB STATUS ==="
which mongod
mongod --version
sudo systemctl status mongod | head -10
mongosh --eval "show dbs" --quiet
echo ""

echo "=== PORT USAGE ==="
sudo lsof -i :3001 || echo "Port 3001 is free"
sudo netstat -tulpn | grep -E ':(80|443|3000|3001|27017)'
echo ""

echo "=== DIRECTORY STRUCTURE ==="
ls -la /var/www/
ls -la /var/www/cbd-wellness-24 2>/dev/null || echo "CBD Wellness directory does not exist (GOOD)"
echo ""

echo "=== NODE.JS VERSION ==="
node --version
npm --version
which node
echo ""

echo "=== DISK SPACE ==="
df -h /
echo ""

echo "=== MEMORY ==="
free -h
echo ""

echo "=== FIREWALL ==="
sudo ufw status
echo ""

echo "=== CURRENT USER ==="
whoami
id www-data
echo ""

echo "=== NGINX VIRTUAL HOSTS ==="
for file in /etc/nginx/sites-enabled/*; do
  echo "--- $file ---"
  head -20 "$file"
  echo ""
done
```

---

## What to Send Back to Me

After running the commands, send me the output. I need to know:

1. ✅ Which PM2 apps are running (so we don't touch them)
2. ✅ Nginx configuration structure
3. ✅ MongoDB version and existing databases
4. ✅ If port 3001 is available
5. ✅ Current directory structure
6. ✅ Node.js version
7. ✅ Available disk space

---

## What I'll Do With This Info

Once I have your server details, I will:

1. Create a **safe deployment plan** that doesn't touch existing apps
2. Write **Nginx configuration** that won't conflict with existing sites
3. Ensure **MongoDB database name** is unique (cbdwellness24)
4. Configure **PM2 app name** to avoid conflicts
5. Choose **port** that's not in use (planning port 3001)
6. Set up **directory structure** in `/var/www/cbd-wellness-24`

---

## Safety Promises

I will:
- ❌ **NOT** touch any existing PM2 apps
- ❌ **NOT** modify existing Nginx configs
- ❌ **NOT** overwrite any databases
- ❌ **NOT** stop or restart other services
- ✅ **ONLY** create new files in `/var/www/cbd-wellness-24`
- ✅ **ONLY** add new Nginx config (not modify existing)
- ✅ **ONLY** create new MongoDB database `cbdwellness24`
- ✅ **ONLY** add new PM2 app `cbd-wellness-24`

---

## Ready?

Run the complete command block above and send me the output!
