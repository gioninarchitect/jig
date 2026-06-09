import 'dotenv/config';
import app from './app';
import { env } from './config/env';
import { startDriver } from './services/driver.scheduler';
import { startTrainingLoop } from './services/training-loop.service';
import { runIntegrityCheck } from './services/integrity.service';

app.listen(env.PORT, '0.0.0.0', () => {
  console.log(`TnT-ZA backend running on http://0.0.0.0:${env.PORT}`);
  runIntegrityCheck('boot');
  startDriver();
  startTrainingLoop();
});
