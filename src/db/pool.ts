import { Pool } from "pg";
import dotenv from "dotenv/config";



const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) throw new Error("Missing DATABASE_URL in .env");

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});
