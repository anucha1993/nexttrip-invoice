#!/bin/bash
# ===========================================
# Deploy Script: Build local → Upload to Plesk Server (nexttrip.work)
# App: nexttrip-invoice  (Next.js 16, custom server.js, port 3002)
# ===========================================
# วิธีใช้:
#   1. แก้ค่า SERVER_USER, SERVER_HOST, SERVER_PATH ให้ตรงกับ Plesk ของ nexttrip.work
#   2. ให้แน่ใจว่าไฟล์ .env (production) ถูกวางไว้บน SERVER_PATH แล้ว (สคริปต์นี้ "ไม่" อัปโหลด .env)
#   3. chmod +x deploy.sh
#   4. ./deploy.sh
# ===========================================

# ===== ตั้งค่า Server (Plesk) =====
SERVER_USER="root"                                    # SSH user ของ Plesk
SERVER_HOST="147.50.254.113"                          # TODO: ยืนยัน IP/host ของ server nexttrip.work
SERVER_PATH="/var/www/vhosts/nexttrip.work/httpdocs"  # TODO: ยืนยัน document root บน Plesk
SSH_PORT="22"

# ===== สี =====
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}🚀 Starting deployment (nexttrip-invoice → nexttrip.work)...${NC}"

# ===== Step 1: Build locally =====
echo -e "${YELLOW}📦 Step 1: Building locally...${NC}"
npm run build
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Build failed! Aborting deployment.${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Build successful!${NC}"

# ===== Step 2: Upload to server =====
echo -e "${YELLOW}📤 Step 2: Uploading to server...${NC}"

# .next/ (build output)
rsync -avz --delete -e "ssh -p ${SSH_PORT}" \
    .next/ ${SERVER_USER}@${SERVER_HOST}:${SERVER_PATH}/.next/
if [ $? -ne 0 ]; then echo -e "${RED}❌ Failed to upload .next/${NC}"; exit 1; fi

# public/ (static assets)
rsync -avz --delete -e "ssh -p ${SSH_PORT}" \
    public/ ${SERVER_USER}@${SERVER_HOST}:${SERVER_PATH}/public/

# prisma/ (schema — required for `prisma generate` on the server)
rsync -avz --delete -e "ssh -p ${SSH_PORT}" \
    prisma/ ${SERVER_USER}@${SERVER_HOST}:${SERVER_PATH}/prisma/

# migrations/ (SQL migrations — apply manually on prod DB, e.g. 014_customer_external_link.sql)
rsync -avz -e "ssh -p ${SSH_PORT}" \
    migrations/ ${SERVER_USER}@${SERVER_HOST}:${SERVER_PATH}/migrations/

# essential files (NOTE: .env is intentionally NOT uploaded — manage prod .env on the server)
rsync -avz -e "ssh -p ${SSH_PORT}" \
    package.json package-lock.json server.js ecosystem.config.js \
    next.config.ts prisma.config.ts tsconfig.json \
    ${SERVER_USER}@${SERVER_HOST}:${SERVER_PATH}/

echo -e "${GREEN}✅ Upload complete!${NC}"

# ===== Step 3: Install deps, generate Prisma client, restart PM2 =====
echo -e "${YELLOW}🔄 Step 3: Installing deps & restarting...${NC}"

# NOTE: keep SERVER_PATH below in sync with the variable above (heredoc is quoted → no expansion)
ssh -p ${SSH_PORT} ${SERVER_USER}@${SERVER_HOST} bash -s << 'ENDSSH'
    set -e
    cd /var/www/vhosts/nexttrip.work/httpdocs

    # production dependencies only
    npm install --omit=dev

    # Prisma 7 client (@prisma/adapter-mariadb) — MUST run after install
    npx prisma generate

    # Restart with PM2 (start if not yet registered)
    if pm2 describe nexttrip-invoice > /dev/null 2>&1; then
        pm2 restart nexttrip-invoice --update-env
    else
        pm2 start ecosystem.config.js
    fi
    pm2 save

    echo "nexttrip-invoice restarted via PM2"
ENDSSH

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Failed to restart server${NC}"
    exit 1
fi

echo -e "${GREEN}🎉 Deployment complete! → https://nexttrip.work${NC}"
