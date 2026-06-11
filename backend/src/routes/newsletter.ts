import { Router, Request, Response, NextFunction } from "express";
import { supabaseAdmin } from "../services/supabase.js";

const router = Router();

const EMAIL_RE = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

const normalizeEmail = (raw: string) => raw.trim().toLowerCase();

/**
 * POST /api/newsletter/subscribe
 * Public: add or re-activate a newsletter subscriber.
 */
router.post("/subscribe", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const email = normalizeEmail(String(req.body?.email ?? ""));
    const source = String(req.body?.source ?? "homepage").trim() || "homepage";

    if (!email) {
      return res.status(400).json({ success: false, message: "Email is required" });
    }

    if (!EMAIL_RE.test(email)) {
      return res.status(400).json({ success: false, message: "Please enter a valid email address" });
    }

    const { data: existing, error: lookupError } = await supabaseAdmin
      .from("newsletter_subscribers")
      .select("id, is_active")
      .eq("email", email)
      .maybeSingle();

    if (lookupError) throw lookupError;

    if (existing) {
      if (existing.is_active) {
        return res.json({
          success: true,
          message: "You're already on the list — we'll be in touch before the next drop.",
          alreadySubscribed: true,
        });
      }

      const { error: updateError } = await supabaseAdmin
        .from("newsletter_subscribers")
        .update({
          is_active: true,
          unsubscribed_at: null,
          source,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id);

      if (updateError) throw updateError;

      return res.json({
        success: true,
        message: "Welcome back — you're on the list again.",
        reactivated: true,
      });
    }

    const { data: inserted, error: insertError } = await supabaseAdmin
      .from("newsletter_subscribers")
      .insert({
        email,
        source,
        is_active: true,
      })
      .select("id, email, subscribed_at")
      .single();

    if (insertError) throw insertError;

    return res.status(201).json({
      success: true,
      message: "You're in. Watch your inbox for the next drop.",
      subscriber: {
        id: inserted.id,
        email: inserted.email,
        subscribed_at: inserted.subscribed_at,
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
