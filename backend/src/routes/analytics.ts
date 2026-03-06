import { Router, Request, Response, NextFunction } from "express";
import { authenticateToken, requireAdmin, AuthRequest } from "../middleware/auth.js";
import { supabaseAdmin } from "../services/supabase.js";

const router = Router();

type Granularity = "day" | "week" | "month";

interface AnalyticsQuery {
  from?: string;
  to?: string;
  granularity?: Granularity;
}

// Helper to parse and validate date range
function getDateRange(query: AnalyticsQuery) {
  const now = new Date();

  let from: Date;
  let to: Date;

  if (query.from) {
    from = new Date(query.from);
  } else {
    // Default: last 30 days
    from = new Date(now);
    from.setDate(from.getDate() - 30);
  }

  if (query.to) {
    to = new Date(query.to);
  } else {
    to = now;
  }

  // Normalize to ISO strings for Supabase (inclusive range)
  const fromIso = from.toISOString();
  const toIso = to.toISOString();

  return { from, to, fromIso, toIso };
}

// Helpers to bucket dates
function formatDateKey(date: Date, granularity: Granularity): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  if (granularity === "day") {
    return `${year}-${month}-${day}`;
  }

  if (granularity === "month") {
    return `${year}-${month}`;
  }

  // Week granularity: ISO week number (YYYY-Www)
  const tmp = new Date(date.getTime());
  // Set to nearest Thursday: current date + 4 - current day number
  const dayNum = (date.getDay() + 6) % 7; // Monday=0, Sunday=6
  tmp.setDate(tmp.getDate() - dayNum + 3);
  const firstThursday = new Date(tmp.getFullYear(), 0, 4);
  const weekNumber =
    1 +
    Math.round(
      ((tmp.getTime() - firstThursday.getTime()) / 86400000 - 3) / 7
    );

  const weekStr = String(weekNumber).padStart(2, "0");
  return `${year}-W${weekStr}`;
}

/**
 * GET /api/analytics/overview
 * Admin-only analytics for orders and revenue
 */
router.get(
  "/overview",
  authenticateToken,
  requireAdmin,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { fromIso, toIso } = getDateRange(req.query as any);
      const granularity: Granularity =
        (req.query.granularity as Granularity) || "day";

      // 1) Fetch orders in date range
      const serverNow = new Date();
      console.log(`[ANALYTICS] Server time: ${serverNow.toISOString()} (${serverNow.toString()})`);
      console.log(`[ANALYTICS] Fetching orders from ${fromIso} to ${toIso}`);
      console.log(`[ANALYTICS] Date range in local time:`, {
        from: new Date(fromIso).toString(),
        to: new Date(toIso).toString()
      });
      const { data: orders, error: ordersError } = await supabaseAdmin
        .from("orders")
        .select(
          "id, created_at, status, total_amount, subtotal, tax_amount, shipping_cost, cod_fee, gateway, fulfillment_partner"
        )
        .gte("created_at", fromIso)
        .lte("created_at", toIso);

      if (ordersError) {
        console.error("[ANALYTICS] Error fetching orders:", ordersError);
        throw ordersError;
      }

      const allOrders = orders || [];
      console.log(`[ANALYTICS] Found ${allOrders.length} orders in date range`);
      console.log(`[ANALYTICS] Order statuses:`, allOrders.map(o => ({ 
        id: o.id, 
        status: o.status, 
        status_lower: (o.status || '').toLowerCase().trim(),
        created_at: o.created_at 
      })));
      
      // Count statuses for debugging
      const statusCounts: Record<string, number> = {};
      allOrders.forEach(o => {
        const s = (o.status || 'unknown').toLowerCase().trim();
        statusCounts[s] = (statusCounts[s] || 0) + 1;
      });
      console.log(`[ANALYTICS] Status counts:`, statusCounts);
      const orderIds = allOrders.map((o) => o.id);

      // 2) Fetch order items for product/category analytics
      let orderItems: any[] = [];
      if (orderIds.length > 0) {
        const { data: items, error: itemsError } = await supabaseAdmin
          .from("order_items")
          .select("order_id, product_id, product_name, quantity, total_price")
          .in("order_id", orderIds);

        if (itemsError) {
          throw itemsError;
        }
        orderItems = items || [];
      }

      const productIds = Array.from(
        new Set(orderItems.map((i) => i.product_id).filter(Boolean))
      );

      // 3) Fetch products and categories for mapping
      let productsMap = new Map<string, any>();
      let categoriesMap = new Map<string, any>();

      if (productIds.length > 0) {
        const { data: products, error: productsError } = await supabaseAdmin
          .from("products")
          .select("id, title, category_id")
          .in("id", productIds);

        if (productsError) {
          throw productsError;
        }

        productsMap = new Map(
          (products || []).map((p: any) => [p.id, p])
        );

        const categoryIds = Array.from(
          new Set(
            (products || [])
              .map((p: any) => p.category_id)
              .filter(Boolean)
          )
        );

        if (categoryIds.length > 0) {
          const { data: categories, error: categoriesError } =
            await supabaseAdmin
              .from("categories")
              .select("id, name, slug")
              .in("id", categoryIds);

          if (categoriesError) {
            throw categoriesError;
          }

          categoriesMap = new Map(
            (categories || []).map((c: any) => [c.id, c])
          );
        }
      }

      // --- Aggregations ---

      // Summary metrics
      let totalOrders = 0;
      let totalDeliveredOrders = 0;
      let totalRevenue = 0;
      let totalDeliveredRevenue = 0;
      let totalTax = 0;
      let totalCodFee = 0;

      const byStatus: Record<
        string,
        { count: number; revenue: number }
      > = {};

      const byGateway: Record<
        string,
        { count: number; revenue: number; cod_fee: number }
      > = {};

      const byFulfillmentPartner: Record<
        string,
        { count: number; revenue: number }
      > = {};

      const timeseriesBuckets: Record<
        string,
        { total_orders: number; delivered_orders: number; revenue: number }
      > = {};

      for (const order of allOrders) {
        totalOrders += 1;
        // Normalize status to lowercase and trim whitespace
        const status = (order.status || "unknown").toLowerCase().trim();
        const gateway = order.gateway || "unknown";
        const partner = order.fulfillment_partner || "Unassigned";
        const totalAmount = Number(order.total_amount) || 0;
        const taxAmount = Number(order.tax_amount) || 0;
        const codFee = Number((order as any).cod_fee) || 0;

        totalRevenue += totalAmount;
        totalTax += taxAmount;
        totalCodFee += codFee;

        if (status === "delivered") {
          totalDeliveredOrders += 1;
          totalDeliveredRevenue += totalAmount;
        }

        // By status
        if (!byStatus[status]) {
          byStatus[status] = { count: 0, revenue: 0 };
        }
        byStatus[status].count += 1;
        byStatus[status].revenue += totalAmount;

        // By payment method / gateway
        if (!byGateway[gateway]) {
          byGateway[gateway] = { count: 0, revenue: 0, cod_fee: 0 };
        }
        byGateway[gateway].count += 1;
        byGateway[gateway].revenue += totalAmount;
        byGateway[gateway].cod_fee += codFee;

        // By fulfillment partner
        if (!byFulfillmentPartner[partner]) {
          byFulfillmentPartner[partner] = { count: 0, revenue: 0 };
        }
        byFulfillmentPartner[partner].count += 1;
        byFulfillmentPartner[partner].revenue += totalAmount;

        // Timeseries bucket
        const createdAt = new Date(order.created_at);
        const key = formatDateKey(createdAt, granularity);
        if (!timeseriesBuckets[key]) {
          timeseriesBuckets[key] = {
            total_orders: 0,
            delivered_orders: 0,
            revenue: 0,
          };
        }
        timeseriesBuckets[key].total_orders += 1;
        timeseriesBuckets[key].revenue += totalAmount;
        if (status === "delivered") {
          timeseriesBuckets[key].delivered_orders += 1;
        }
      }

      const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
      
      // Debug summary
      console.log(`[ANALYTICS] Summary:`, {
        totalOrders,
        totalDeliveredOrders,
        totalRevenue,
        totalDeliveredRevenue,
        byStatus: Object.keys(byStatus).map(k => ({ status: k, count: byStatus[k].count }))
      });

      // Product-level aggregation
      const byProductMap: Map<
        string,
        {
          product_id: string;
          product_name: string;
          total_quantity: number;
          total_revenue: number;
          total_orders: number;
        }
      > = new Map();

      // Category-level aggregation
      const byCategoryMap: Map<
        string,
        {
          category_id: string;
          category_name: string;
          category_slug: string;
          total_quantity: number;
          total_revenue: number;
          total_orders: number;
        }
      > = new Map();

      // Precompute orders per product for "total_orders" per product/category
      const productOrderIdsByProduct: Map<string, Set<string>> = new Map();
      const productOrderIdsByCategory: Map<string, Set<string>> = new Map();

      for (const item of orderItems) {
        if (!item.product_id) continue;
        const productId = item.product_id as string;
        const product = productsMap.get(productId);

        const orderId = item.order_id as string;
        const quantity = Number(item.quantity) || 0;
        const lineRevenue = Number(item.total_price) || 0;

        // By product
        if (!byProductMap.has(productId)) {
          byProductMap.set(productId, {
            product_id: productId,
            product_name: product?.title || item.product_name || "Unknown",
            total_quantity: 0,
            total_revenue: 0,
            total_orders: 0,
          });
        }
        const prodAgg = byProductMap.get(productId)!;
        prodAgg.total_quantity += quantity;
        prodAgg.total_revenue += lineRevenue;

        if (!productOrderIdsByProduct.has(productId)) {
          productOrderIdsByProduct.set(productId, new Set());
        }
        productOrderIdsByProduct.get(productId)!.add(orderId);

        // By category
        const categoryId = product?.category_id;
        if (categoryId) {
          const category = categoriesMap.get(categoryId);
          if (!byCategoryMap.has(categoryId)) {
            byCategoryMap.set(categoryId, {
              category_id: categoryId,
              category_name: category?.name || "Unknown",
              category_slug: category?.slug || "",
              total_quantity: 0,
              total_revenue: 0,
              total_orders: 0,
            });
          }
          const catAgg = byCategoryMap.get(categoryId)!;
          catAgg.total_quantity += quantity;
          catAgg.total_revenue += lineRevenue;

          if (!productOrderIdsByCategory.has(categoryId)) {
            productOrderIdsByCategory.set(categoryId, new Set());
          }
          productOrderIdsByCategory.get(categoryId)!.add(orderId);
        }
      }

      // Fill in total_orders per product/category based on unique order counts
      for (const [productId, set] of productOrderIdsByProduct.entries()) {
        const agg = byProductMap.get(productId);
        if (agg) {
          agg.total_orders = set.size;
        }
      }

      for (const [categoryId, set] of productOrderIdsByCategory.entries()) {
        const agg = byCategoryMap.get(categoryId);
        if (agg) {
          agg.total_orders = set.size;
        }
      }

      // Convert maps to arrays and sort by revenue desc
      const byProduct = Array.from(byProductMap.values()).sort(
        (a, b) => b.total_revenue - a.total_revenue
      );
      const byCategory = Array.from(byCategoryMap.values()).sort(
        (a, b) => b.total_revenue - a.total_revenue
      );

      // Timeseries array
      const timeseries = Object.entries(timeseriesBuckets)
        .map(([key, value]) => ({
          period: key,
          ...value,
        }))
        .sort((a, b) => (a.period < b.period ? -1 : 1));

      res.json({
        success: true,
        range: {
          from: fromIso,
          to: toIso,
          granularity,
        },
        summary: {
          total_orders: totalOrders,
          delivered_orders: totalDeliveredOrders,
          total_revenue: totalRevenue,
          delivered_revenue: totalDeliveredRevenue,
          total_tax: totalTax,
          total_cod_fee: totalCodFee,
          average_order_value: avgOrderValue,
        },
        by_status: byStatus,
        by_payment_method: byGateway,
        by_fulfillment_partner: byFulfillmentPartner,
        by_product: byProduct,
        by_category: byCategory,
        timeseries,
      });
    } catch (error: any) {
      console.error("Error fetching analytics overview:", error);
      next(error);
    }
  }
);

export default router;


