import { Router, Request, Response, NextFunction } from "express";
import {
  runPrintroveHeartbeat,
  getPrintroveAccessToken,
  listPrintroveCategories,
  getPrintroveCategoryParentProducts,
  getPrintroveProductVariants,
  listPrintroveProducts,
  getPrintroveProductById,
  getPrintrovePincodeDetails,
  checkPrintroveServiceability,
  listPrintroveOrders,
  getPrintroveOrderById,
  createPrintroveOrder,
} from "../services/printrove/index.js";

const router = Router();

router.get(
  "/heartbeat",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await runPrintroveHeartbeat();
      res.json({ ...data, timestamp: new Date().toISOString() });
    } catch (error: any) {
      next(error);
    }
  }
);

router.get(
  "/auth-test",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const auth = await getPrintroveAccessToken();
      const accessToken = auth.accessToken;
      res.status(auth.status === 200 ? 200 : 502).json({
        success: auth.status === 200,
        endpoint: auth.endpoint,
        status: auth.status,
        statusText: auth.statusText,
        latency_ms: auth.latencyMs,
        token_preview:
          typeof accessToken === "string" && accessToken.length > 24
            ? `${accessToken.slice(0, 24)}...`
            : accessToken,
        data: auth.response,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      next(error);
    }
  }
);

router.get(
  "/catalog/categories",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await listPrintroveCategories();
      res.status(data.success ? 200 : 502).json({
        ...data,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      next(error);
    }
  }
);

router.get(
  "/catalog/categories/:categoryId",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { categoryId } = req.params;
      const data = await getPrintroveCategoryParentProducts(categoryId);
      res.status(data.success ? 200 : 502).json({
        ...data,
        params: { categoryId },
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      next(error);
    }
  }
);

router.get(
  "/catalog/categories/:categoryId/products/:productId",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { categoryId, productId } = req.params;
      const data = await getPrintroveProductVariants(categoryId, productId);
      res.status(data.success ? 200 : 502).json({
        ...data,
        params: { categoryId, productId },
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      next(error);
    }
  }
);

router.get(
  "/products",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { page, per_page, name, sku } = req.query;
      const data = await listPrintroveProducts({
        page: page ? Number(page) : undefined,
        per_page: per_page ? Number(per_page) : undefined,
        name: name as string | undefined,
        sku: sku as string | undefined,
      });
      res.status(data.success ? 200 : 502).json({
        ...data,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      next(error);
    }
  }
);

router.get(
  "/products/:productId",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { productId } = req.params;
      const data = await getPrintroveProductById(productId);
      res.status(data.success ? 200 : 502).json({
        ...data,
        params: { productId },
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      next(error);
    }
  }
);

// ── Orders API ────────────────────────────────────────────────────────────────

router.get(
  "/orders/pincode/:pincode",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { pincode } = req.params;
      const data = await getPrintrovePincodeDetails(pincode);
      res.status(data.success ? 200 : 502).json({
        ...data,
        params: { pincode },
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      next(error);
    }
  }
);

router.get(
  "/orders/serviceability",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { country, pincode, weight, cod } = req.query;
      if (!country || !pincode || !weight) {
        res.status(400).json({
          success: false,
          error: "country, pincode and weight are required query parameters.",
        });
        return;
      }
      const data = await checkPrintroveServiceability({
        country: String(country),
        pincode: String(pincode),
        weight: String(weight),
        cod: cod != null && String(cod) !== "" ? String(cod) : "false",
      });
      res.status(data.success ? 200 : 502).json({
        ...data,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      next(error);
    }
  }
);

router.get(
  "/orders",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { page, per_page, tracking_number, reference_number } = req.query;
      const data = await listPrintroveOrders({
        page: page ? Number(page) : undefined,
        per_page: per_page ? Number(per_page) : undefined,
        tracking_number: tracking_number as string | undefined,
        reference_number: reference_number as string | undefined,
      });
      res.status(data.success ? 200 : 502).json({
        ...data,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      next(error);
    }
  }
);

router.get(
  "/orders/:orderId",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { orderId } = req.params;
      const data = await getPrintroveOrderById(orderId);
      res.status(data.success ? 200 : 502).json({
        ...data,
        params: { orderId },
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      next(error);
    }
  }
);

router.post(
  "/orders",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const payload = req.body;
      if (!payload || typeof payload !== "object") {
        res.status(400).json({ success: false, error: "Request body must be a valid JSON object." });
        return;
      }
      const data = await createPrintroveOrder(payload);
      res.status(data.success ? 200 : 502).json({
        ...data,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      next(error);
    }
  }
);

export default router;

