import { Router, Request, Response, NextFunction } from "express";
import { supabaseAdmin } from "../services/supabase.js";
import { authenticateToken, requireAdmin } from "../middleware/auth.js";

const router = Router();

/**
 * GET /api/faqs
 * Public: list published FAQ items, grouped by category + sort_order.
 */
router.get("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { data, error } = await supabaseAdmin
      .from("faq_items")
      .select("id, question, answer_markdown, category, sort_order")
      .eq("is_published", true)
      .order("category", { ascending: true })
      .order("sort_order", { ascending: true });

    if (error) {
      throw error;
    }

    return res.json({
      success: true,
      items: data || [],
      count: data?.length || 0,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Admin: list all FAQ items
 * GET /api/faqs/admin/all
 */
router.get(
  "/admin/all",
  authenticateToken,
  requireAdmin,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { data, error } = await supabaseAdmin
        .from("faq_items")
        .select("*")
        .order("category", { ascending: true })
        .order("sort_order", { ascending: true });

      if (error) {
        throw error;
      }

      return res.json({
        success: true,
        items: data || [],
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Admin: create FAQ item
 * POST /api/faqs
 */
router.post(
  "/",
  authenticateToken,
  requireAdmin,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { question, answer_markdown, category, sort_order, is_published } =
        req.body;

      if (!question || !answer_markdown) {
        return res.status(400).json({
          success: false,
          message: "question and answer_markdown are required",
        });
      }

      const { data, error } = await supabaseAdmin
        .from("faq_items")
        .insert({
          question,
          answer_markdown,
          category,
          sort_order: typeof sort_order === "number" ? sort_order : 0,
          is_published: is_published !== false,
        })
        .select("*")
        .single();

      if (error) {
        throw error;
      }

      return res.status(201).json({
        success: true,
        item: data,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Admin: update FAQ item
 * PUT /api/faqs/:id
 */
router.put(
  "/:id",
  authenticateToken,
  requireAdmin,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { question, answer_markdown, category, sort_order, is_published } =
        req.body;

      const { data, error } = await supabaseAdmin
        .from("faq_items")
        .update({
          question,
          answer_markdown,
          category,
          sort_order,
          is_published,
        })
        .eq("id", id)
        .select("*")
        .single();

      if (error || !data) {
        return res.status(404).json({
          success: false,
          message: "FAQ item not found",
        });
      }

      return res.json({
        success: true,
        item: data,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Admin: toggle publish
 * PATCH /api/faqs/:id/toggle-publish
 */
router.patch(
  "/:id/toggle-publish",
  authenticateToken,
  requireAdmin,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;

      const { data: existing, error: fetchError } = await supabaseAdmin
        .from("faq_items")
        .select("id, is_published")
        .eq("id", id)
        .single();

      if (fetchError || !existing) {
        return res.status(404).json({
          success: false,
          message: "FAQ item not found",
        });
      }

      const newStatus = !existing.is_published;

      const { data, error } = await supabaseAdmin
        .from("faq_items")
        .update({
          is_published: newStatus,
        })
        .eq("id", id)
        .select("*")
        .single();

      if (error) {
        throw error;
      }

      return res.json({
        success: true,
        item: data,
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;

