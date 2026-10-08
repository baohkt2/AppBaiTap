import { z } from "zod";

// Server-side environment variables validated with zod
const serverEnvSchema = z.object({
  SUPABASE_URL: z.string().url("SUPABASE_URL must be a valid URL"),
  SUPABASE_SERVICE_ROLE_KEY: z
    .string()
    .min(1, "SUPABASE_SERVICE_ROLE_KEY is required"),
  GEMINI_API_KEY: z.string().min(1, "GEMINI_API_KEY is required"),
  GEMINI_MODEL: z.string().default("gemini-2.0-flash"),
  ADMIN_PASSWORD: z.string().min(1, "ADMIN_PASSWORD is required"),
  SESSION_SECRET: z
    .string()
    .min(32, "SESSION_SECRET must be at least 32 characters"),
});

// Public environment variables (safe for client)
const publicEnvSchema = z.object({
  NEXT_PUBLIC_LESSON_DOC_URL: z.string().optional().default(""),
});

function getServerEnv() {
  const parsed = serverEnvSchema.safeParse(process.env);
  if (!parsed.success) {
    const errors = parsed.error.flatten().fieldErrors;
    const messages = Object.entries(errors)
      .map(([key, msgs]) => `  ${key}: ${(msgs ?? []).join(", ")}`)
      .join("\n");
    throw new Error(
      `❌ Missing or invalid environment variables:\n${messages}`
    );
  }
  return parsed.data;
}

function getPublicEnv() {
  const parsed = publicEnvSchema.safeParse({
    NEXT_PUBLIC_LESSON_DOC_URL:
      process.env.NEXT_PUBLIC_LESSON_DOC_URL ?? "",
  });
  if (!parsed.success) {
    throw new Error("❌ Invalid public environment variables");
  }
  return parsed.data;
}

// Lazy singletons to avoid parsing at import time during build
let _serverEnv: ReturnType<typeof getServerEnv> | null = null;
let _publicEnv: ReturnType<typeof getPublicEnv> | null = null;

export function serverEnv() {
  if (!_serverEnv) _serverEnv = getServerEnv();
  return _serverEnv;
}

export function publicEnv() {
  if (!_publicEnv) _publicEnv = getPublicEnv();
  return _publicEnv;
}
