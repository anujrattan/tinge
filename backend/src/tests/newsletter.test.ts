import { describe, it, expect } from "vitest";
import request from "supertest";
import { createApp } from "../app.js";

describe("Newsletter API", () => {
  const app = createApp();

  it("POST /api/newsletter/subscribe rejects empty email", async () => {
    const res = await request(app)
      .post("/api/newsletter/subscribe")
      .send({ email: "" });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("POST /api/newsletter/subscribe rejects invalid email", async () => {
    const res = await request(app)
      .post("/api/newsletter/subscribe")
      .send({ email: "not-an-email" });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});
