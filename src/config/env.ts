import { z } from "zod";

/**
 * Centralized env validation so the app fails fast with a clear error.
 */
const EnvSchema = z.object({
  PORT: z.coerce.number().default(4000),
  CORS_ORIGIN: z.string().default("http://localhost:5173"),

  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),

  SMS_PROVIDER: z.enum(["mock", "twilio"]).default("mock"),

  // Twilio only required if SMS_PROVIDER=twilio
  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_NUMBER: z.string().optional(),
});

export const env = EnvSchema.parse(process.env);
