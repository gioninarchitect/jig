/**
 * Origin by ILCO Farming — PM2 Ecosystem Configuration
 *
 * Three processes:
 *   origin-b2b          — B2B Wholesale Portal (Express/TS + Vite React SPA, PostgreSQL)
 *   origin-pos          — POS Multi-App (Express + static HTML, MongoDB)
 *   origin-cultivation  — Cultivation Dashboard (Express + static HTML, MongoDB)
 *
 * Usage:
 *   pm2 start ecosystem.config.js
 *   pm2 restart all
 *   pm2 logs
 */

module.exports = {
  apps: [
    {
      name: 'origin-b2b',
      script: 'dist/server/server/index.js',
      cwd: '/var/www/origin/b2b',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
        PORT: 3009,
      },
      error_file: '/var/log/pm2/origin-b2b-error.log',
      out_file: '/var/log/pm2/origin-b2b-out.log',
      merge_logs: true,
      time: true,
    },
    {
      name: 'origin-pos',
      script: 'backend/server.js',
      cwd: '/var/www/origin/pos',
      exec_mode: 'fork',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
        PORT: 3008,
      },
      error_file: '/var/log/pm2/origin-pos-error.log',
      out_file: '/var/log/pm2/origin-pos-out.log',
      merge_logs: true,
      time: true,
    },
    {
      name: 'origin-cultivation',
      script: 'backend/cultivation-server.js',
      cwd: '/var/www/origin/cultivation',
      exec_mode: 'fork',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '256M',
      env: {
        NODE_ENV: 'production',
        PORT: 3005,
      },
      error_file: '/var/log/pm2/origin-cultivation-error.log',
      out_file: '/var/log/pm2/origin-cultivation-out.log',
      merge_logs: true,
      time: true,
    },
  ],
};
