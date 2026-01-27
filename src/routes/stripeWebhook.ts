import express from "express";
import Stripe from "stripe";
import { pool } from "../db/pool";

const router = express.Router();

function mustGetEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing ${name} in environment (.env)`);
  return v;
}

const stripe = new Stripe(mustGetEnv("STRIPE_SECRET_KEY"), {
  apiVersion: "2025-12-18.clover" as any,
});

// IMPORTANT: raw body for signature verification
router.post("/webhook", express.raw({ type: "application/json" }), async (req, res) => {
  const sig = req.headers["stripe-signature"];
  if (!sig || typeof sig !== "string") {
    return res.status(400).send("Missing stripe-signature header");
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      mustGetEnv("STRIPE_WEBHOOK_SECRET")
    );
  } catch (err: any) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    // 1) Checkout complete => activate org
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;

      const orgIdStr =
        (session.client_reference_id as string | null) ||
        (session.metadata?.organization_id as string | undefined);

      if (orgIdStr) {
        const orgId = Number(orgIdStr);

        const stripeCustomerId =
          typeof session.customer === "string" ? session.customer : null;
        const stripeSubscriptionId =
          typeof session.subscription === "string" ? session.subscription : null;

        const plan = session.metadata?.plan ?? null;

        await pool.query(
          `UPDATE organizations
           SET is_paid = TRUE,
               plan = COALESCE($2, plan),
               stripe_customer_id = COALESCE($3, stripe_customer_id),
               stripe_subscription_id = COALESCE($4, stripe_subscription_id),
               updated_at = NOW()
           WHERE id = $1`,
          [orgId, plan, stripeCustomerId, stripeSubscriptionId]
        );
      }
    }

    // 2) Subscription updated => if canceled/unpaid, lock org
    if (event.type === "customer.subscription.updated" || event.type === "customer.subscription.deleted") {
      const sub = event.data.object as Stripe.Subscription;

      // find org by subscription id
      const { rows } = await pool.query(
        `SELECT id FROM organizations WHERE stripe_subscription_id = $1 LIMIT 1`,
        [sub.id]
      );

      if (rows.length) {
        const orgId = rows[0].id as number;

        const shouldBePaid =
          sub.status === "active" || sub.status === "trialing";

        await pool.query(
          `UPDATE organizations
           SET is_paid = $2,
               updated_at = NOW()
           WHERE id = $1`,
          [orgId, shouldBePaid]
        );
      }
    }

    return res.json({ received: true });
  } catch (e) {
    console.error("Stripe webhook handler failed:", e);
    return res.status(500).send("Webhook handler failed");
  }
});

export default router;
