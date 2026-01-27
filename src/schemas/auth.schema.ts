import { z } from "zod";

export const signupSchema = z.object({
  name: z.string().min(2),
  phone_number: z.string().min(7),
  role_level: z.enum(["agent", "lead", "supervisor", "manager", "executive"]),
  password: z.string().min(6),
});

export const loginSchema = z.object({
  phone_number: z.string().min(7),
  password: z.string().min(6),
});
