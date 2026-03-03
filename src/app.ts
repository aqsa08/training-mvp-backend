import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import dotenv from "dotenv";
import authRoutes from "./routes/auth";
import twilioRoutes from "./routes/twilio";
import cohortsRoutes from "./routes/cohorts";
import analyticsRoutes from "./routes/analytics";
import billingRouter from "./routes/billing";
import stripeWebhookRouter from "./routes/stripeWebhook";
import reflectionsRouter from "./routes/reflections";
import publicRouter from "./routes/public";
import orgRouter from "./routes/org";

dotenv.config();

export const app = express();

const { stripe } = require("./src/stripe/stripeConfig");
app.use("/api/billing", stripeWebhookRouter);

app.use(helmet());
app.use(cors({ origin: true, credentials: true }));
app.use(morgan("dev"));
app.use(express.urlencoded({ extended: false })); // REQUIRED for Twilio
app.use(express.json());

app.get("/health", (_req, res) => res.json({ ok: true }));

// Public routes
app.use("/api/public", publicRouter);

// ✅ Auth routes – now available under /api/auth as well
app.use("/auth", authRoutes);      // legacy/basic
app.use("/api/auth", authRoutes);  // what your frontend is calling

// Twilio webhook (keep at /twilio so it matches your Twilio config)
app.use("/twilio", twilioRoutes);

// Protected-ish API routes
app.use("/api/cohorts", cohortsRoutes);
app.use("/api/reflections", reflectionsRouter);
app.use("/api", analyticsRoutes);
app.use("/api/billing", billingRouter);
app.use("/api/org", orgRouter);