import { Router, Request, Response, NextFunction } from "express";
import { supabaseAdmin } from "../services/supabase.js";
import { authenticateToken, requireAdmin } from "../middleware/auth.js";

const router = Router();

/**
 * GET /api/blog
 * Public: list published blog posts (for SEO + marketing pages)
 */
router.get("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { limit = 20, offset = 0 } = req.query;

    const { data, error } = await supabaseAdmin
      .from("blog_posts")
      .select(
        "id, slug, title, excerpt, cover_image, published_at, seo_title, seo_description"
      )
      .eq("is_published", true)
      .order("published_at", { ascending: false })
      .range(
        parseInt(offset as string),
        parseInt(offset as string) + parseInt(limit as string) - 1
      );

    if (error) {
      throw error;
    }

    return res.json({
      success: true,
      posts: data || [],
      count: data?.length || 0,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/blog/:slug
 * Public: get a single published blog post by slug
 */
router.get("/:slug", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { slug } = req.params;

    const { data: post, error } = await supabaseAdmin
      .from("blog_posts")
      .select("*")
      .eq("slug", slug)
      .eq("is_published", true)
      .single();

    if (error || !post) {
      return res.status(404).json({
        success: false,
        message: "Blog post not found",
      });
    }

    return res.json({
      success: true,
      post,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Admin: list all blog posts (published + drafts)
 * GET /api/blog/admin/all
 */
router.get(
  "/admin/all",
  authenticateToken,
  requireAdmin,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { data, error } = await supabaseAdmin
        .from("blog_posts")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        throw error;
      }

      return res.json({
        success: true,
        posts: data || [],
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Admin: create a new blog post
 * POST /api/blog
 */
router.post(
  "/",
  authenticateToken,
  requireAdmin,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const {
        slug,
        title,
        excerpt,
        content_markdown,
        cover_image,
        seo_title,
        seo_description,
        is_published,
      } = req.body;

      if (!slug || !title || !content_markdown) {
        return res.status(400).json({
          success: false,
          message: "slug, title and content_markdown are required",
        });
      }

      const publishedAt =
        is_published === true ? new Date().toISOString() : null;

      const { data, error } = await supabaseAdmin
        .from("blog_posts")
        .insert({
          slug,
          title,
          excerpt,
          content_markdown,
          cover_image,
          seo_title,
          seo_description,
          is_published: !!is_published,
          published_at: publishedAt,
        })
        .select("*")
        .single();

      if (error) {
        throw error;
      }

      return res.status(201).json({
        success: true,
        post: data,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Admin: update an existing blog post
 * PUT /api/blog/:id
 */
router.put(
  "/:id",
  authenticateToken,
  requireAdmin,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const {
        slug,
        title,
        excerpt,
        content_markdown,
        cover_image,
        seo_title,
        seo_description,
        is_published,
      } = req.body;

      const updateData: any = {
        slug,
        title,
        excerpt,
        content_markdown,
        cover_image,
        seo_title,
        seo_description,
        is_published,
      };

      // If publishing now and there was no published_at, set it
      if (is_published === true) {
        updateData.published_at = new Date().toISOString();
      }

      const { data, error } = await supabaseAdmin
        .from("blog_posts")
        .update(updateData)
        .eq("id", id)
        .select("*")
        .single();

      if (error || !data) {
        return res.status(404).json({
          success: false,
          message: "Blog post not found",
        });
      }

      return res.json({
        success: true,
        post: data,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Admin: toggle publish status
 * PATCH /api/blog/:id/toggle-publish
 */
router.patch(
  "/:id/toggle-publish",
  authenticateToken,
  requireAdmin,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;

      const { data: existing, error: fetchError } = await supabaseAdmin
        .from("blog_posts")
        .select("id, is_published, published_at")
        .eq("id", id)
        .single();

      if (fetchError || !existing) {
        return res.status(404).json({
          success: false,
          message: "Blog post not found",
        });
      }

      const newStatus = !existing.is_published;

      const { data, error } = await supabaseAdmin
        .from("blog_posts")
        .update({
          is_published: newStatus,
          published_at:
            newStatus && !existing.published_at
              ? new Date().toISOString()
              : existing.published_at,
        })
        .eq("id", id)
        .select("*")
        .single();

      if (error) {
        throw error;
      }

      return res.json({
        success: true,
        post: data,
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;

