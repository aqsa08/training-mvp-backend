import { Router } from "express";
import Stripe from "stripe";
import { pool } from "../db/pool";

const router = Router();

function mustGetEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing ${name} in environment (.env)`);
  return v;
}

const stripe = new Stripe(mustGetEnv("STRIPE_SECRET_KEY"), {}
);

function resolvePriceId(plan: string) {
  const p = String(plan || "").toLowerCase();
  if (p === "bronze") return process.env.STRIPE_PRICE_BRONZE;
  if (p === "silver") return process.env.STRIPE_PRICE_SILVER;
  if (p === "gold") return process.env.STRIPE_PRICE_GOLD;
  return undefined;
}

/**
 * POST /api/public/demo-request
 * body: { name, email, company?, message? }
 */
router.post("/demo-request", async (req, res) => {
  const name = String(req.body?.name ?? "").trim();
  const email = String(req.body?.email ?? "").trim().toLowerCase();
  const company = String(req.body?.company ?? "").trim() || null;
  const message = String(req.body?.message ?? "").trim() || null;

  if (!name) return res.status(400).json({ error: "Name is required" });
  if (!email) return res.status(400).json({ error: "Email is required" });

  await pool.query(
    `INSERT INTO demo_requests (name, email, company, message)
     VALUES ($1, $2, $3, $4)`,
    [name, email, company, message]
  );

  return res.status(201).json({ ok: true });
});

/**
 * POST /api/public/subscribe
 * body: { plan: "bronze" | "silver" | "gold", email, company? }
 *
 * Prevent duplicate ACTIVE subscriptions by email.
 */
router.post("/subscribe", async (req, res) => {
  try {
    const plan = String(req.body?.plan ?? "").toLowerCase();
  const email = String(req.body?.email ?? "").trim().toLowerCase();
  const company = String(req.body?.company ?? "").trim();

  if (!email) return res.status(400).json({ error: "Email is required" });
  if (!["bronze", "silver", "gold"].includes(plan)) {
    return res.status(400).json({ error: "Invalid plan" });
  }

  // 1) block duplicate active subscription by email
  const dup = await pool.query(
    `SELECT id
       FROM organizations
      WHERE LOWER(contact_email) = $1
        AND is_paid = TRUE
        AND stripe_subscription_id IS NOT NULL
      LIMIT 1`,
    [email]
  );

  if (dup.rows.length) {
    return res.status(409).json({ error: "You already have an active subscription with this email." });
  }

  // 2) find or create org by email
  let orgId: number;
  let stripeCustomerId: string | null;

  const existing = await pool.query(
    `SELECT id, stripe_customer_id
       FROM organizations
      WHERE LOWER(contact_email) = $1
      LIMIT 1`,
    [email]
  );

  if (existing.rows.length) {
    orgId = existing.rows[0].id;
    stripeCustomerId = existing.rows[0].stripe_customer_id ?? null;

    // keep org name fresh if company provided
    if (company) {
      await pool.query(
        `UPDATE organizations
            SET name = $1, updated_at = NOW()
          WHERE id = $2`,
        [company, orgId]
      );
    }
  } else {
    const created = await pool.query(
      `INSERT INTO organizations (name, contact_email, plan)
       VALUES ($1, $2, $3)
       RETURNING id`,
      [company || "New Organization", email, plan]
    );

    orgId = created.rows[0].id;
    stripeCustomerId = null;
  }

  // 3) create stripe customer if missing
  if (!stripeCustomerId) {
    const customer = await stripe.customers.create({
      name: company || `Org ${orgId}`,
      email,
      metadata: { organization_id: String(orgId) },
    });

    stripeCustomerId = customer.id;

    await pool.query(
      `UPDATE organizations
          SET stripe_customer_id = $1, updated_at = NOW()
        WHERE id = $2`,
      [stripeCustomerId, orgId]
    );
  }

  // 4) create checkout session
  const priceId = resolvePriceId(plan);
  if (!priceId) {
    return res.status(500).json({
      error: "Stripe price is not configured. Set STRIPE_PRICE_BRONZE/SILVER/GOLD in .env",
    });
  }

  const appUrl = mustGetEnv("APP_URL");

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: stripeCustomerId,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${appUrl}/settings?billing=success`,
    cancel_url: `${appUrl}/payment-required?billing=cancel`,
    client_reference_id: String(orgId),
    metadata: { organization_id: String(orgId), plan },
  });

  return res.json({ url: session.url });
  } catch (err: any) {
    console.error("PUBLIC SUBSCRIBE ERROR:", err);
    return res.status(500).json({
      error: err?.message || "Subscription failed on server",
    });
  }
});

export default router;
