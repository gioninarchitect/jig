import 'dotenv/config';
import app from './app';
import { env } from './config/env';
import { startDriver } from './services/driver.scheduler';

app.listen(env.PORT, '0.0.0.0', () => {
  console.log(`TnT-ZA backend running on http://0.0.0.0:${env.PORT}`);
  startDriver();
});
