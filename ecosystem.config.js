/**
 * JIG Craft Cannabis - PM2 Ecosystem Configuration
 *
 * Usage:
 *   pm2 start ecosystem.config.js
 *   pm2 restart jig-api
 *   pm2 logs jig-api
 */

module.exports = {
  apps: [
    {
      name: 'jig-api',
      script: 'dist/server/server/index.js',
      cwd: '/var/www/jig',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
        PORT: 3002,
      },
      error_file: '/var/log/pm2/jig-error.log',
      out_file: '/var/log/pm2/jig-out.log',
      merge_logs: true,
      time: true,
    },
  ],
};
