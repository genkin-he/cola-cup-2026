import fs from "node:fs";
import path from "node:path";
import { db } from "../db/client";

const MIGRATIONS_DIR = path.join(process.cwd(), "migrations");

function migrate(): void {
  const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((file) => file.endsWith(".sql"))
    .sort();

  const currentVersion = db.pragma("user_version", { simple: true }) as number;
  const apply = db.transaction((sql: string, version: number) => {
    db.exec(sql);
    db.pragma(`user_version = ${version}`);
  });

  let appliedCount = 0;
  for (const file of files) {
    const version = Number(file.split("_")[0]);
    if (!Number.isFinite(version) || version <= currentVersion) continue;
    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), "utf8");
    apply(sql, version);
    console.log(`Applied migration: ${file}`);
    appliedCount += 1;
  }

  console.log(
    appliedCount === 0
      ? "No new migrations to apply."
      : `Done. Applied ${appliedCount} migration(s).`,
  );
}

migrate();
