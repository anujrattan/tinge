/**
 * Live integration tests — hit real Supabase, Redis (Upstash), etc.
 *
 * Run: RUN_INTEGRATION_TESTS=true npm test
 * Requires backend/.env with valid credentials.
 */

import { describe, it, expect } from "vitest";
import {
  checkSupabase,
  checkRedis,
  checkPrintrove,
  runCrudSmokeTests,
  getHealthReport,
} from "../services/health.js";

const runLive = process.env.RUN_INTEGRATION_TESTS === "true";

describe.skipIf(!runLive)("Live integrations", () => {
  it("Supabase is reachable", async () => {
    const result = await checkSupabase();
    expect(result.status).toBe("ok");
    expect(result.latency_ms).toBeGreaterThan(0);
  });

  it("Redis (Upstash) ping and round-trip", async () => {
    const result = await checkRedis();
    if (process.env.REDIS_URL) {
      expect(result.status).toBe("ok");
    } else {
      // Without REDIS_URL, app degrades gracefully to no-cache mode
      expect(result.status).toBe("degraded");
    }
  });

  it("CRUD smoke tests pass", async () => {
    const tests = await runCrudSmokeTests();
    const failures = tests.filter((t) => t.status === "error");
    expect(failures).toEqual([]);
    expect(tests.length).toBeGreaterThanOrEqual(4);
  });

  it("full health report is ok or degraded (not error)", async () => {
    const report = await getHealthReport();
    expect(["ok", "degraded"]).toContain(report.status);
    expect(report.services.length).toBeGreaterThanOrEqual(5);
  });
});

describe.skipIf(!runLive)("Printrove (optional)", () => {
  it("Printrove heartbeat when configured", async () => {
    const result = await checkPrintrove();
    expect(["ok", "not_configured", "error"]).toContain(result.status);
  });
});
