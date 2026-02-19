module.exports = {
  apps: [{
    name: 'jig-pos',
    script: 'backend/server.js',
    cwd: '/var/www/jig',
    instances: 1,
    env: {
      NODE_ENV: 'production',
      PORT: 3002
    },
    error_file: 'logs/error.log',
    out_file: 'logs/out.log',
    autorestart: true,
    max_restarts: 10
  }]
};
