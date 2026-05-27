import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { env } from './config/env';
import routes from './routes';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';

// Initialize audit event listeners (side-effect import)
import './services/audit.service';
// SMF Drift Daemon — deterministic rule-based drift detection
import './services/smf-drift.service';

const app = express();

app.set('trust proxy', 1);
app.use(helmet());
app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 200 });
app.use(limiter);

app.use('/api', routes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
