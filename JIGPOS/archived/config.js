module.exports = {
  auth: {
    bcryptSaltRounds: 10,
    jwtSecret: process.env.JWT_SECRET || 'bmh_secret_key_change_in_production',
    jwtExpiresIn: '7d'
  },
  mongodb: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/bmh'
  },
  server: {
    port: process.env.PORT || 3001
  }
};
