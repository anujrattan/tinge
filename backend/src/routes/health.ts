/**
 * Health & systems status routes
 */

import { Router } from "express";
import { authenticateToken, requireAdmin, AuthRequest } from "../middleware/auth.js";
import { getHealthReport, runCrudSmokeTests } from "../services/health.js";
import { runPrintroveProbeSuite } from "../services/printroveTests.js";

const router = Router();

/** Liveness — process is up */
router.get("/live", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

/** Full dependency status — admin only */
router.get(
  "/status",
  authenticateToken,
  requireAdmin,
  async (_req: AuthRequest, res, next) => {
    try {
      const report = await getHealthReport();
      const httpStatus = report.status === "error" ? 503 : 200;
      res.status(httpStatus).json(report);
    } catch (error) {
      next(error);
    }
  }
);

/** CRUD / integration smoke tests — admin only */
router.post(
  "/run-tests",
  authenticateToken,
  requireAdmin,
  async (_req: AuthRequest, res, next) => {
    try {
      const tests = await runCrudSmokeTests();
      const hasError = tests.some((t) => t.status === "error");
      res.status(hasError ? 503 : 200).json({
        status: hasError ? "error" : "ok",
        timestamp: new Date().toISOString(),
        tests,
      });
    } catch (error) {
      next(error);
    }
  }
);

/** Printrove API probe suite (mirrors /pt Command Center) — admin only */
router.post(
  "/printrove-tests",
  authenticateToken,
  requireAdmin,
  async (_req: AuthRequest, res, next) => {
    try {
      const report = await runPrintroveProbeSuite();
      const httpStatus = report.status === "error" ? 503 : 200;
      res.status(httpStatus).json(report);
    } catch (error) {
      next(error);
    }
  }
);

export default router;
