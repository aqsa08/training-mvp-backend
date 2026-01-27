import { Router } from "express";
import bcrypt from "bcryptjs";
import { pool } from "../db/pool";
import { signAuthToken } from "../utils/jwt";

const router = Router();

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
