import { describe, it, expect } from "vitest";
import request from "supertest";
import { createApp } from "../app.js";
import {
  checkApiServer,
  checkRazorpay,
  checkResend,
} from "../services/health.js";

describe("Health API", () => {
  const app = createApp();

  it("GET /health returns ok", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
    expect(res.body.timestamp).toBeDefined();
  });

  it("GET /api/health/live returns ok", async () => {
    const res = await request(app).get("/api/health/live");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
  });

  it("GET /api/health/status requires auth", async () => {
    const res = await request(app).get("/api/health/status");
    expect(res.status).toBe(401);
  });

  it("POST /api/health/run-tests requires auth", async () => {
    const res = await request(app).post("/api/health/run-tests");
    expect(res.status).toBe(401);
  });

  it("POST /api/health/printrove-tests requires auth", async () => {
    const res = await request(app).post("/api/health/printrove-tests");
    expect(res.status).toBe(401);
  });
});

describe("Health service (unit)", () => {
  it("checkApiServer reports ok", () => {
    const result = checkApiServer();
    expect(result.status).toBe("ok");
    expect(result.name).toBe("API Server");
  });

  it("checkRazorpay returns configured or not_configured", () => {
    const result = checkRazorpay();
    expect(["ok", "not_configured"]).toContain(result.status);
  });

  it("checkResend returns configured or not_configured", () => {
    const result = checkResend();
    expect(["ok", "not_configured"]).toContain(result.status);
  });
});
