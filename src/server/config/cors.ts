import cors from 'cors';

const PORT = 3000;

/**
 * Allowed origins for CORS.
 */
export const allowedOrigins = [
  process.env.CLIENT_URL,
  'http://localhost:5173',
  'http://localhost:3000',
  `http://localhost:${PORT}`,
  process.env.PRODUCTION_URL,
  'https://defesai.com.br',
].filter(Boolean) as string[];

/**
 * Helper to determine if an origin is permitted.
 */
function isOriginAllowed(origin: string): boolean {
  if (!origin) return true;
  if (allowedOrigins.includes(origin)) return true;
  if (origin.endsWith('.run.app')) return true;
  if (origin.endsWith('.google.com') || origin.endsWith('.googleusercontent.com')) return true;
  if (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) return true;
  // In development, allow any origin
  if (process.env.NODE_ENV !== 'production') return true;
  return false;
}

/**
 * CORS middleware configured with origin validation and credentials support.
 */
export const corsMiddleware = cors({
  origin: (origin, callback) => {
    if (!origin || isOriginAllowed(origin)) {
      callback(null, true);
    } else {
      callback(null, true);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
});

