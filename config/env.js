const dotenv = require('dotenv');
const { z } = require('zod');

dotenv.config();

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3000),
  CORS_ORIGIN: z.string().url().or(z.string().regex(/^https?:\/\/localhost:\d+$/)).default('http://localhost:3000'),
  DB_URI: z.string().regex(/^mongodb(\+srv)?\:\/\//, 'Must be a valid MongoDB connection string'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(900000),
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().int().positive().default(100),
});

const parseResult = envSchema.safeParse(process.env);

if (!parseResult.success) {
  const errors = parseResult.error.flatten().fieldErrors;
  const errorMessages = Object.entries(errors).map(([field, messages]) => 
    `${field}: ${messages.join(', ')}`
  ).join('; ');
  
  throw new Error(`Environment validation failed: ${errorMessages}`);
}

module.exports = parseResult.data;