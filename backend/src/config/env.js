import { z } from 'zod';






const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(5000),

  
  SUPABASE_URL: z.string().url('SUPABASE_URL is required'),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(30, 'SUPABASE_SERVICE_ROLE_KEY is required'),

  
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_EXPIRES_IN: z.string().default('2h'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 characters'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('30d'),
  // Separate secret ONLY for MFA temp tokens — must be distinct from JWT_SECRET
  JWT_MFA_SECRET: z.string().min(32, 'JWT_MFA_SECRET must be at least 32 characters'),
  // Shared secret for internal AI-service → backend callbacks
  BACKEND_CALLBACK_SECRET: z.string().min(16, 'BACKEND_CALLBACK_SECRET must be at least 16 characters'),

  
  REDIS_URL: z.string().url().default('redis://localhost:6379'),

  
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),

  
  AI_SERVICE_URL: z.string().url().default('http://localhost:5001'),

  
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(900000),
  RATE_LIMIT_MAX: z.coerce.number().default(100),

  
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'http', 'debug']).default('info'),
  LOG_DIR: z.string().default('logs'),
});

const _parsed = envSchema.safeParse(process.env);

if (!_parsed.success) {
  console.error('❌  Invalid environment variables:\n', _parsed.error.format());
  process.exit(1);
}

export default _parsed.data;
