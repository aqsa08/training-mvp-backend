import { Router } from "express";
import { pool } from "../db/pool";
import { requireAuth } from "../middleware/requireAuth";

const router = Router();

router.use(requireAuth);

/**
 * PATCH /api/reflections/:id
 * body: { behaviorObserved: boolean }
 *
 * Marks a reflection as "behavior observed" (manager input).
 * Enforces org ownership.
 */
router.patch("/:id", async (req, res) => {
  const reflectionId = Number(req.params.id);
  const orgId = req.auth?.organizationId;

  if (!reflectionId || Number.isNaN(reflectionId)) {
    return res.status(400).json({ error: "Invalid reflection id" });
  }
  if (!orgId) return res.status(401).json({ error: "Missing org in token" });

  const behaviorObserved = req.body?.behaviorObserved;
  if (typeof behaviorObserved !== "boolean") {
    return res.status(400).json({ error: "behaviorObserved must be boolean" });
  }

  const client = await pool.connect();
  try {
    // Ensure reflection belongs to this org
    const ownedRes = await client.query(
      `
      SELECT r.id
      FROM reflections r
      JOIN cohort_users cu ON cu.id = r.cohort_user_id
      JOIN cohorts c ON c.id = cu.cohort_id
      WHERE r.id = $1 AND c.organization_id = $2
      LIMIT 1
      `,
      [reflectionId, orgId]
    );

    if (!ownedRes.rowCount) {
      return res.status(404).json({ error: "Reflection not found" });
    }

    const upd = await client.query(
      `
      UPDATE reflections
      SET behavior_observed = $2
      WHERE id = $1
      RETURNING id, cohort_user_id, lesson_id, behavior_observed
      `,
      [reflectionId, behaviorObserved]
    );

    return res.json({ reflection: upd.rows[0] });
  } catch (e) {
    console.error("Error PATCH /api/reflections/:id", e);
    return res.status(500).json({ error: "Failed to update reflection" });
  } finally {
    client.release();
  }
});

export default router;
