/**
 * Gelato API Routes
 *
 * Routes for Gelato integration
 */

import { Router } from "express";
import {
  authenticateToken,
  requireAdmin,
  AuthRequest,
} from "../middleware/auth.js";
import gelatoService from "../services/gelato.js";

const router = Router();

/**
 * Get template details by ID (for preview/loading)
 * GET /api/gelato/templates/:templateId
 */
router.get(
  "/templates/:templateId",
  authenticateToken,
  requireAdmin,
  async (req: AuthRequest, res, next) => {
    try {
      const { templateId } = req.params;
      const templateData = await gelatoService.getTemplate(templateId);
      res.json(templateData);
    } catch (error: any) {
      next(error);
    }
  }
);

export default router;
