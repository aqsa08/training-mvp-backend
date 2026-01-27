import { Router } from "express";
import { pool } from "../db/pool";
import { requireAuth } from "../middleware/requireAuth";

const router = Router();

// All routes here require auth
router.use(requireAuth);

// GET /api/cohorts
router.get("/", async (req, res) => {
  const client = await pool.connect();

  try {
    // If you later add organization_id to cohorts, you can filter by req.auth?.organizationId
    const result = await client.query(
      `
      SELECT
        id,
        name,
        role_level,
        start_date,
        duration_days
      FROM cohorts
      ORDER BY id ASC
      `
    );

    return res.json({
      cohorts: result.rows,
    });
  } catch (err) {
    console.error("Error in GET /api/cohorts:", err);
    return res.status(500).json({ error: "Failed to load cohorts" });
  } finally {
    client.release();
  }
});

export default router;
