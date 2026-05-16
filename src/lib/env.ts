import { z } from "zod"

const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),

  // NextAuth
  NEXTAUTH_URL: z.string().url("NEXTAUTH_URL must be a valid URL"),
  NEXTAUTH_SECRET: z.string().min(32, "NEXTAUTH_SECRET must be at least 32 characters"),

  // Google OAuth (optional — app works without it if credentials auth is used)
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_ALLOWED_DOMAIN: z.string().optional().default(""),

  // Feature flags
  MAINTENANCE_MODE: z.enum(["true", "false"]).optional().default("false"),

  // Email / SMTP (optional — notifications silently skipped when absent)
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().min(1).max(65535).optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().optional(),
  NOTIFICATION_EMAIL_ADMINS: z.string().optional(),

  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
})

const parsed = envSchema.safeParse(process.env)

if (!parsed.success) {
  const errors = parsed.error.flatten().fieldErrors
  const lines = Object.entries(errors)
    .map(([key, msgs]) => `  ${key}: ${(msgs ?? []).join(", ")}`)
    .join("\n")
  throw new Error(`\n❌ Invalid environment variables:\n${lines}\n\nCheck your .env file against .env.example`)
}

export const env = parsed.data
