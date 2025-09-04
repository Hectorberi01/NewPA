// src/bootstrap/ensure-database.ts
import { createPool } from "mysql2/promise";
import { config } from "dotenv";
config();

export async function ensureDatabase() {
  const host = process.env.DB_HOST || "localhost";
  const port = Number(process.env.DB_PORT || 3306);
  const user = process.env.DB_USER || "root";
  const password = process.env.DB_PASSWORD || "";
  const db = process.env.DB_NAME || "projectacademy";

  // se connecter SANS database
  const pool = await createPool({ host, port, user, password });
  await pool.query(
    `CREATE DATABASE IF NOT EXISTS \`${db}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`
  );
  await pool.end();
}
