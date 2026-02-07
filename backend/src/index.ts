import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import routes from './routes';
import { paymentWebhookHandler } from './controllers/paymentController';

// Load environment variables
dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 5001;

const configuredOrigins = (process.env.FRONTEND_URL || 'http://localhost:5173')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);

const normalizeOriginVariant = (origin: string) => {
  if (origin.includes('127.0.0.1')) {
    return origin.replace('127.0.0.1', 'localhost');
  }
  if (origin.includes('localhost')) {
    return origin.replace('localhost', '127.0.0.1');
  }
  return null;
};

const allowedOrigins = new Set<string>(configuredOrigins);
for (const origin of configuredOrigins) {
  const variant = normalizeOriginVariant(origin);
  if (variant) {
    allowedOrigins.add(variant);
  }
}

// Middleware
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) {
      return callback(null, true);
    }

    if (allowedOrigins.has(origin)) {
      return callback(null, true);
    }

    return callback(new Error(`Origin not allowed by CORS: ${origin}`));
  },
  credentials: true
}));
app.use(cookieParser());

// Stripe webhook must receive the raw body for signature verification
app.post('/api/payments/webhook', express.raw({ type: 'application/json' }), paymentWebhookHandler);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'OK',
    message: 'Project Apollo API is running',
    timestamp: new Date().toISOString()
  });
});

// API routes
app.use('/api', routes);

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({ error: 'Route not found' });
});

// Global error handler
app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📚 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
});

export default app;
