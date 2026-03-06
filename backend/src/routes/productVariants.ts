/**
 * Product Variants Routes
 * 
 * Handles bulk import and mapping of Qikink SKUs to product variants
 */

import { Router, Request, Response, NextFunction } from "express";
import { authenticateToken, requireAdmin, AuthRequest } from "../middleware/auth.js";
import { supabaseAdmin } from "../services/supabase.js";
import { fetchQikinkProductVariants, QikinkProductVariant } from "../services/qikink.js";

const router = Router();

/**
 * Helper function to normalize color values for matching
 * Handles hex codes, color names, and variations
 */
function normalizeColor(color: string): string {
  if (!color) return "";
  // Remove # from hex codes for comparison
  let normalized = color.trim().replace(/^#/, "").toLowerCase();
  // Normalize common color name variations
  const colorMap: Record<string, string> = {
    black: "black",
    white: "white",
    red: "red",
    blue: "blue",
    green: "green",
    yellow: "yellow",
    grey: "gray",
    grey: "gray",
  };
  return colorMap[normalized] || normalized;
}

/**
 * Helper function to normalize size values for matching
 */
function normalizeSize(size: string): string {
  if (!size) return "";
  return size.trim().toUpperCase();
}

/**
 * POST /api/product-variants/:productId/import-from-qikink
 * Import SKUs from Qikink API for a product
 */
router.post(
  "/:productId/import-from-qikink",
  authenticateToken,
  requireAdmin,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { productId } = req.params;
      const { qikinkProductId } = req.body;

      if (!qikinkProductId) {
        return res.status(400).json({
          success: false,
          message: "qikinkProductId is required",
        });
      }

      // Get product to verify it exists
      const { data: product, error: productError } = await supabaseAdmin
        .from("products")
        .select("id, title, qikink_product_id")
        .eq("id", productId)
        .single();

      if (productError || !product) {
        return res.status(404).json({
          success: false,
          message: `Product not found: ${productId}`,
        });
      }

      // Update product with Qikink product ID if not already set
      if (!product.qikink_product_id) {
        await supabaseAdmin
          .from("products")
          .update({ qikink_product_id: qikinkProductId })
          .eq("id", productId);
      }

      // Fetch variants from Qikink
      // NOTE: This will likely fail as Qikink doesn't expose product variant endpoints
      // CSV import is the recommended method
      let qikinkVariants: QikinkProductVariant[];
      try {
        qikinkVariants = await fetchQikinkProductVariants(qikinkProductId);
      } catch (qikinkError: any) {
        console.error("Error fetching from Qikink API:", qikinkError);
        return res.status(501).json({
          success: false,
          message: `Qikink API does not provide an endpoint to fetch product variants.`,
          error: qikinkError.message,
          recommendedSolution: {
            method: "CSV Import",
            endpoint: `/api/product-variants/${productId}/import-from-csv`,
            steps: [
              "1. Export your product variants from Qikink dashboard as CSV",
              "2. CSV format: size,color,sku",
              "3. Use POST /api/product-variants/:productId/import-from-csv endpoint",
            ],
            example: {
              csvFormat: "size,color,sku\nM,Black,SKU123\nL,Black,SKU124",
            },
          },
        });
      }

      if (!qikinkVariants || qikinkVariants.length === 0) {
        return res.status(404).json({
          success: false,
          message: "No variants found for this Qikink product",
        });
      }

      // Get existing variants for this product
      const { data: existingVariants, error: variantsError } = await supabaseAdmin
        .from("product_variants")
        .select("id, size, color, qikink_sku")
        .eq("product_id", productId);

      if (variantsError) {
        throw new Error(`Failed to fetch existing variants: ${variantsError.message}`);
      }

      if (!existingVariants || existingVariants.length === 0) {
        return res.status(400).json({
          success: false,
          message: "No product variants found. Please create product variants first (add sizes and colors to the product).",
        });
      }

      // Match Qikink variants to our variants by size and color
      const matches: Array<{
        variantId: string;
        qikinkSku: string;
        size: string;
        color: string;
        matched: boolean;
      }> = [];
      const unmatchedQikink: QikinkProductVariant[] = [];

      for (const qikinkVariant of qikinkVariants) {
        const qikinkSize = normalizeSize(qikinkVariant.size || "");
        const qikinkColor = normalizeColor(qikinkVariant.color || "");
        const qikinkSku = qikinkVariant.sku || qikinkVariant.variant_id || "";

        if (!qikinkSku) {
          continue; // Skip variants without SKU
        }

        // Find matching variant
        const match = existingVariants.find((v) => {
          const vSize = normalizeSize(v.size || "");
          const vColor = normalizeColor(v.color || "");
          return vSize === qikinkSize && vColor === qikinkColor;
        });

        if (match) {
          matches.push({
            variantId: match.id,
            qikinkSku: qikinkSku,
            size: match.size || "",
            color: match.color || "",
            matched: true,
          });
        } else {
          unmatchedQikink.push(qikinkVariant);
        }
      }

      // Update matched variants with Qikink SKUs
      let updatedCount = 0;
      for (const match of matches) {
        const { error: updateError } = await supabaseAdmin
          .from("product_variants")
          .update({ qikink_sku: match.qikinkSku })
          .eq("id", match.variantId);

        if (!updateError) {
          updatedCount++;
        }
      }

      return res.json({
        success: true,
        message: `Successfully imported ${updatedCount} SKUs`,
        stats: {
          totalQikinkVariants: qikinkVariants.length,
          matched: matches.length,
          updated: updatedCount,
          unmatched: unmatchedQikink.length,
        },
        unmatched: unmatchedQikink.map((v) => ({
          size: v.size,
          color: v.color,
          sku: v.sku || v.variant_id,
        })),
      });
    } catch (error: any) {
      next(error);
    }
  }
);

/**
 * POST /api/product-variants/:productId/import-from-csv
 * Import SKUs from CSV upload
 * CSV format: size,color,sku (or size,color,qikink_sku)
 */
router.post(
  "/:productId/import-from-csv",
  authenticateToken,
  requireAdmin,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { productId } = req.params;
      const { csvData } = req.body; // Expecting CSV as string

      if (!csvData) {
        return res.status(400).json({
          success: false,
          message: "CSV data is required",
        });
      }

      // Parse CSV
      const lines = csvData.trim().split("\n");
      if (lines.length < 2) {
        return res.status(400).json({
          success: false,
          message: "CSV must have at least a header row and one data row",
        });
      }

      // Parse header to detect column order
      const header = lines[0].toLowerCase().split(",").map((h) => h.trim());
      const sizeIdx = header.findIndex((h) => h === "size" || h === "sizes");
      const colorIdx = header.findIndex((h) => h === "color" || h === "colour" || h === "colors");
      const skuIdx = header.findIndex(
        (h) => h === "sku" || h === "qikink_sku" || h === "qikink sku" || h === "qikinksku"
      );

      if (sizeIdx === -1 || colorIdx === -1 || skuIdx === -1) {
        return res.status(400).json({
          success: false,
          message: "CSV must have columns: size, color, and sku (or qikink_sku)",
        });
      }

      // Parse data rows
      const csvRows = lines.slice(1).map((line) => {
        const values = line.split(",").map((v) => v.trim());
        return {
          size: values[sizeIdx] || "",
          color: values[colorIdx] || "",
          sku: values[skuIdx] || "",
        };
      });

      // Get existing variants
      const { data: existingVariants, error: variantsError } = await supabaseAdmin
        .from("product_variants")
        .select("id, size, color")
        .eq("product_id", productId);

      if (variantsError || !existingVariants || existingVariants.length === 0) {
        return res.status(400).json({
          success: false,
          message: "No product variants found. Please create product variants first.",
        });
      }

      // Match and update
      let updatedCount = 0;
      const unmatched: string[] = [];

      for (const row of csvRows) {
        if (!row.sku) continue; // Skip rows without SKU

        const rowSize = normalizeSize(row.size);
        const rowColor = normalizeColor(row.color);

        const match = existingVariants.find((v) => {
          const vSize = normalizeSize(v.size || "");
          const vColor = normalizeColor(v.color || "");
          return vSize === rowSize && vColor === rowColor;
        });

        if (match) {
          const { error: updateError } = await supabaseAdmin
            .from("product_variants")
            .update({ qikink_sku: row.sku })
            .eq("id", match.id);

          if (!updateError) {
            updatedCount++;
          }
        } else {
          unmatched.push(`${row.size}/${row.color}`);
        }
      }

      return res.json({
        success: true,
        message: `Successfully imported ${updatedCount} SKUs from CSV`,
        stats: {
          totalRows: csvRows.length,
          updated: updatedCount,
          unmatched: unmatched.length,
        },
        unmatched: unmatched,
      });
    } catch (error: any) {
      next(error);
    }
  }
);

/**
 * GET /api/product-variants/:productId/skus
 * Get all variants with their SKUs for a product
 */
router.get(
  "/:productId/skus",
  authenticateToken,
  requireAdmin,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { productId } = req.params;

      const { data: variants, error } = await supabaseAdmin
        .from("product_variants")
        .select("id, size, color, qikink_sku")
        .eq("product_id", productId)
        .order("size", { ascending: true })
        .order("color", { ascending: true });

      if (error) {
        throw error;
      }

      const withSku = variants?.filter((v) => v.qikink_sku) || [];
      const withoutSku = variants?.filter((v) => !v.qikink_sku) || [];

      return res.json({
        success: true,
        variants: variants || [],
        stats: {
          total: variants?.length || 0,
          withSku: withSku.length,
          withoutSku: withoutSku.length,
        },
      });
    } catch (error: any) {
      next(error);
    }
  }
);

export default router;

