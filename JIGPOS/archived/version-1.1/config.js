module.exports = {
  auth: {
    bcryptSaltRounds: 10,
    jwtSecret: process.env.JWT_SECRET || 'cbdwellness24_secret_key_change_in_production',
    jwtExpiresIn: '7d'
  },
  mongodb: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/cbdwellness24'
  },
  server: {
    port: process.env.PORT || 3001
  }
};
