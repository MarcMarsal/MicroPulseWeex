// db/client.js
import { Client } from "pg";

export const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

export async function initDB() {
  await client.connect();
  console.log("PostgreSQL connectat (2.0)");
}
