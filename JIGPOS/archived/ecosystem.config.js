module.exports = {
  apps: [{
    name: 'cbd-wellness-24',
    script: 'backend/server.js',
    cwd: '/var/www/cbd-wellness-24',
    instances: 1,
    env: {
      NODE_ENV: 'production',
      PORT: 3001
    },
    error_file: 'logs/error.log',
    out_file: 'logs/out.log',
    autorestart: true,
    max_restarts: 10
  }]
};
