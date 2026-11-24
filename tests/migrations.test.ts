import { PGlite } from "@electric-sql/pglite";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("database migrations", () => {
  it("apply cleanly to an empty PostgreSQL and enforce unique SKUs", async () => {
    const db = new PGlite();
    const dir = join(process.cwd(), "drizzle");
    for (const f of readdirSync(dir).filter((f) => f.endsWith(".sql")).sort()) {
      const sql = readFileSync(join(dir, f), "utf8").split("--> statement-breakpoint");
      for (const s of sql) if (s.trim()) await db.exec(s);
    }
    const t = await db.query<{ n: number }>(
      "select count(*)::int n from information_schema.tables where table_schema='public'",
    );
    expect(t.rows[0].n).toBeGreaterThanOrEqual(26);
    await db.exec("insert into products (id,name,slug,sku,base_price) values ('1','A','a','SKU1','10.00')");
    await expect(
      db.exec("insert into products (id,name,slug,sku,base_price) values ('2','B','b','SKU1','10.00')"),
    ).rejects.toThrow();
  });
});
