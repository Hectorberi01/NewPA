"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ensureDatabase = ensureDatabase;
// src/bootstrap/ensure-database.ts
const promise_1 = require("mysql2/promise");
const dotenv_1 = require("dotenv");
(0, dotenv_1.config)();
async function ensureDatabase() {
    const host = process.env.DB_HOST || "localhost";
    const port = Number(process.env.DB_PORT || 3306);
    const user = process.env.DB_USER || "root";
    const password = process.env.DB_PASSWORD || "";
    const db = process.env.DB_NAME || "projectacademy";
    // se connecter SANS database
    const pool = await (0, promise_1.createPool)({ host, port, user, password });
    await pool.query(`CREATE DATABASE IF NOT EXISTS \`${db}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
    await pool.end();
}
