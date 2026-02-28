import { Router } from "express";
import bcrypt from "bcryptjs";
import { pool } from "../db/pool";
import { signAuthToken } from "../utils/jwt";

const router = Router();
router.post("/signup", async (req, res) => {
  const { name, email, password } = req.body as {
    name?: string;
    email?: string;
    password?: string;
  };

  if (!name || !email || !password) {
    return res
      .status(400)
      .json({ error: "Name, email, and password are required." });
  }

  const trimmedName = name.trim();
  const trimmedEmail = email.trim().toLowerCase();

  if (!trimmedName) {
    return res.status(400).json({ error: "Name is required." });
  }

  try {
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      // 1) Check if email already exists
      const existing = await client.query(
        `
        SELECT id FROM admin_users
        WHERE email = $1
        LIMIT 1
        `,
        [trimmedEmail]
      );

      if (existing.rowCount != null && existing.rowCount > 0) {
        await client.query("ROLLBACK");
        return res.status(409).json({ error: "Email already in use." });
      }

      // 2) Create organization
      const orgRes = await client.query(
        `
        INSERT INTO organizations (name, contact_email, is_paid)
        VALUES ($1, $2, FALSE)
        RETURNING id
        `,
        [trimmedName, trimmedEmail]
      );

      const orgId = orgRes.rows[0].id as number;

      // 3) Hash password and create admin user
      const passwordHash = await bcrypt.hash(password, 10);

      const adminRes = await client.query(
        `
        INSERT INTO admin_users (email, password_hash, organization_id)
        VALUES ($1, $2, $3)
        RETURNING id, email, organization_id
        `,
        [trimmedEmail, passwordHash, orgId]
      );

      const admin = adminRes.rows[0];

      // 4) Sign JWT
      const token = signAuthToken({
        adminId: admin.id,
        organizationId: admin.organization_id,
      });

      await client.query("COMMIT");

      // 5) Respond to frontend
      return res.json({
        token,
        admin: {
          id: admin.id,
          email: admin.email,
          organizationId: admin.organization_id,
        },
      });
    } catch (err) {
      await client.query("ROLLBACK");
      console.error("Error in /auth/signup:", err);
      return res.status(500).json({ error: "Internal server error." });
    } finally {
      client.release();
    }
  } catch (err) {
    console.error("DB connection error in /auth/signup:", err);
    return res.status(500).json({ error: "Internal server error." });
  }
});
/**
 * POST /auth/login
 * Existing admin login route (unchanged)
 *
 * Body: { email, password }
 * Response: { token, admin: { id, email, organizationId } }
 */
router.post("/login", async (req, res) => {
  const { email, password } = req.body as {
    email?: string;
    password?: string;
  };

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required." });
  }

  const client = await pool.connect();

  try {
    // 1) Find ADMIN user by email
    const userRes = await client.query(
      `
      SELECT id, email, password_hash, organization_id
      FROM admin_users
      WHERE email = $1
      LIMIT 1
      `,
      [email.trim().toLowerCase()]
    );

    if (userRes.rowCount === 0) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    const admin = userRes.rows[0] as {
      id: number;
      email: string;
      password_hash: string;
      organization_id: number | null;
    };

    // 2) Compare password
    const passwordOk = await bcrypt.compare(password, admin.password_hash);
    if (!passwordOk) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    // 3) Create JWT for this admin
    const token = signAuthToken({
      adminId: admin.id,
      organizationId: admin.organization_id,
    });

    // 4) Respond to the frontend
    return res.json({
      token,
      admin: {
        id: admin.id,
        email: admin.email,
        organizationId: admin.organization_id,
      },
    });
  } catch (err) {
    console.error("Error in /auth/login:", err);
    return res.status(500).json({ error: "Internal server error." });
  } finally {
    client.release();
  }
});

export default router;