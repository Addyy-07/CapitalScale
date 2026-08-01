import { z } from 'zod';






const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(5000),

  // ── Supabase (PostgreSQL) ─────────────────────────────────────────────────
  SUPABASE_URL: z.string().url('SUPABASE_URL is required'),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(30, 'SUPABASE_SERVICE_ROLE_KEY is required'),

  // ── JWT ───────────────────────────────────────────────────────────────────
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_EXPIRES_IN: z.string().default('2h'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 characters'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('30d'),
  // Separate secret ONLY for MFA temp tokens — must be distinct from JWT_SECRET
  JWT_MFA_SECRET: z.string().min(32, 'JWT_MFA_SECRET must be at least 32 characters'),
  // Shared secret for internal AI-service → backend callbacks
  BACKEND_CALLBACK_SECRET: z.string().min(16, 'BACKEND_CALLBACK_SECRET must be at least 16 characters'),

  // ── Redis ─────────────────────────────────────────────────────────────────
  REDIS_URL: z.string().url().default('redis://localhost:6379'),

  // ── Cloudinary ────────────────────────────────────────────────────────────
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),

  // ── AI Service ────────────────────────────────────────────────────────────
  AI_SERVICE_URL: z.string().url().default('http://localhost:5001'),

  // ── Global Rate Limiter ───────────────────────────────────────────────────
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(900000),
  RATE_LIMIT_MAX: z.coerce.number().default(100),

  // ── Logging ───────────────────────────────────────────────────────────────
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'http', 'debug']).default('info'),
  LOG_DIR: z.string().default('logs'),

  // ── SMTP (Nodemailer) — optional; falls back to simulated mode ────────────
  SMTP_HOST: z.string().default('smtp.gmail.com'),
  SMTP_PORT: z.coerce.number().default(587),
  SMTP_SECURE: z.string().transform(v => v === 'true').default('false'),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  EMAIL_FROM: z.string().default('CapitalScale <noreply@capitalscale.com>'),

  // ── RabbitMQ ──────────────────────────────────────────────────────────────
  RABBITMQ_URL: z.string().default('amqp://localhost:5672'),

  // ── Email Rate Limiting (per-minute sliding window) ───────────────────────
  EMAIL_RATE_LIMIT_PER_MINUTE: z.coerce.number().default(60),
  OTP_RATE_RESERVE: z.coerce.number().default(10),
});

const _parsed = envSchema.safeParse(process.env);

if (!_parsed.success) {
  console.error('❌  Invalid environment variables:\n', _parsed.error.format());
  process.exit(1);
}

export default _parsed.data;
