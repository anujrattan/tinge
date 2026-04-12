import React, { useState, useCallback, useMemo } from "react";
import api from "../services/api";

// ─── Types ──────────────────────────────────────────────────────────────────

type StatusTone = "green" | "yellow" | "red" | "idle" | "loading";

interface ApiState {
  response: any;
  loading: boolean;
  error: string | null;
}

const initialApiState = (): ApiState => ({ response: null, loading: false, error: null });

interface ProductVariantLite {
  id: string;
  sku: string;
  size: string;
  color: string;
  price: number | null;
}

interface ProductCardLite {
  id: string;
  name: string;
  image: string | null;
  brand: string;
  category: string;
  status: string;
  variants: ProductVariantLite[];
}

interface MappingRow {
  parentProductId: string;
  parentName: string;
  variantId: string;
  sku: string;
  color: string;
  size: string;
  frontUrl: string;
  backUrl: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getStatusTone(state: ApiState): StatusTone {
  if (state.loading) return "loading";
  if (!state.response) return "idle";
  if (!state.response.success) return "red";
  const latency = Number(state.response.latency_ms ?? 0);
  if (latency > 2000) return "yellow";
  return "green";
}

function latencyLabel(state: ApiState): string | null {
  if (!state.response?.latency_ms) return null;
  const ms = Number(state.response.latency_ms);
  return ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${ms}ms`;
}

function asArray(input: any): any[] {
  if (Array.isArray(input)) return input;
  return [];
}

function pickFirstArray(obj: any): any[] {
  if (!obj || typeof obj !== "object") return [];
  const directKeys = [
    "products",
    "items",
    "data",
    "results",
    "parent_products",
    "parentProducts",
    "product_list",
  ];
  for (const key of directKeys) {
    if (Array.isArray(obj[key])) return obj[key];
  }
  for (const key of directKeys) {
    if (obj[key] && typeof obj[key] === "object") {
      const nested = pickFirstArray(obj[key]);
      if (nested.length) return nested;
    }
  }
  return [];
}

function collectCandidateProductsDeep(input: any, depth = 0): any[] {
  if (depth > 5 || input == null) return [];
  if (Array.isArray(input)) {
    const looksLikeProducts = input.filter((item) => {
      if (!item || typeof item !== "object") return false;
      return Boolean(
        item.id ||
          item.product_id ||
          item.parent_product_id ||
          item.name ||
          item.title ||
          item.product_name
      );
    });
    if (looksLikeProducts.length) return looksLikeProducts;
    for (const item of input) {
      const nested = collectCandidateProductsDeep(item, depth + 1);
      if (nested.length) return nested;
    }
    return [];
  }
  if (typeof input === "object") {
    for (const key of Object.keys(input)) {
      const nested = collectCandidateProductsDeep(input[key], depth + 1);
      if (nested.length) return nested;
    }
  }
  return [];
}

function toNumberOrNull(value: any): number | null {
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function normalizeVariant(raw: any, idx: number): ProductVariantLite {
  return {
    id: String(raw?.id ?? raw?.variant_id ?? raw?.product_variant_id ?? `variant-${idx}`),
    sku: String(raw?.sku ?? raw?.variant_sku ?? raw?.code ?? ""),
    size: String(raw?.size ?? raw?.size_name ?? raw?.variant_size ?? ""),
    color: String(raw?.color ?? raw?.colour ?? raw?.color_name ?? raw?.variant_color ?? ""),
    price: toNumberOrNull(raw?.price ?? raw?.mrp ?? raw?.selling_price ?? raw?.amount),
  };
}

function normalizeProduct(raw: any, idx: number): ProductCardLite {
  const variantCandidates = asArray(raw?.variants).length
    ? asArray(raw?.variants)
    : asArray(raw?.product_variants).length
    ? asArray(raw?.product_variants)
    : asArray(raw?.children).length
    ? asArray(raw?.children)
    : [];

  const image =
    raw?.image ||
    raw?.thumbnail ||
    raw?.image_url ||
    raw?.primary_image ||
    raw?.featured_image ||
    raw?.mockup_url ||
    null;

  return {
    id: String(raw?.id ?? raw?.product_id ?? raw?.parent_product_id ?? `product-${idx}`),
    name: String(raw?.name ?? raw?.title ?? raw?.product_name ?? "Untitled Product"),
    image: image ? String(image) : null,
    brand: String(raw?.brand ?? raw?.brand_name ?? "Printrove"),
    category: String(raw?.category ?? raw?.category_name ?? raw?.product_type ?? "Uncategorized"),
    status: String(raw?.status ?? raw?.state ?? "unknown"),
    variants: variantCandidates.map(normalizeVariant),
  };
}

function extractLibraryProducts(listResp: any, singleResp: any): ProductCardLite[] {
  const map = new Map<string, ProductCardLite>();

  const fromListRaw = (() => {
    const direct = pickFirstArray(listResp?.data ?? listResp);
    if (direct.length) return direct;
    return collectCandidateProductsDeep(listResp?.data ?? listResp);
  })();
  fromListRaw.map(normalizeProduct).forEach((p) => map.set(p.id, p));

  const singleCandidate = singleResp?.data?.product ?? singleResp?.data ?? singleResp;
  if (singleCandidate && typeof singleCandidate === "object" && !Array.isArray(singleCandidate)) {
    const singleNorm = normalizeProduct(singleCandidate, 0);
    if (singleNorm.id || singleNorm.name !== "Untitled Product") {
      map.set(singleNorm.id, singleNorm);
    }
  }

  return Array.from(map.values()).filter((p) => p.id && p.id !== "product-0");
}

function extractProductIdsFromListResponse(listResp: any): string[] {
  const rawProducts = (() => {
    const direct = pickFirstArray(listResp?.data ?? listResp);
    if (direct.length) return direct;
    return collectCandidateProductsDeep(listResp?.data ?? listResp);
  })();
  const ids = rawProducts
    .map((p: any) => String(p?.id ?? p?.product_id ?? p?.parent_product_id ?? "").trim())
    .filter(Boolean);
  return Array.from(new Set(ids));
}

function getDeepValue(input: any, path: string[]): any {
  let cursor = input;
  for (const key of path) {
    if (cursor == null) return undefined;
    cursor = cursor[key];
  }
  return cursor;
}

function normalizeProductDetailResponse(detailResp: any): { product: any; variants: any[] } {
  const payload = detailResp?.data ?? detailResp;

  const productCandidates = [
    getDeepValue(payload, ["data", "product"]),
    getDeepValue(payload, ["product"]),
    getDeepValue(payload, ["data", "parent_product"]),
    getDeepValue(payload, ["parent_product"]),
    getDeepValue(payload, ["result", "product"]),
    getDeepValue(payload, ["result"]),
  ].filter((v) => v && typeof v === "object" && !Array.isArray(v));

  const product = productCandidates.find((candidate: any) =>
    candidate?.id || candidate?.product_id || candidate?.name || candidate?.title
  ) ?? productCandidates[0] ?? {};

  const variantPathCandidates = [
    asArray(getDeepValue(payload, ["data", "variants"])),
    asArray(getDeepValue(payload, ["variants"])),
    asArray(getDeepValue(payload, ["data", "product", "variants"])),
    asArray(getDeepValue(payload, ["product", "variants"])),
    asArray(getDeepValue(payload, ["data", "product_variants"])),
    asArray(getDeepValue(payload, ["product_variants"])),
    asArray(getDeepValue(payload, ["data", "items"])),
    asArray(getDeepValue(payload, ["items"])),
  ].filter((arr) => arr.length > 0);

  const deepVariantArrays = collectArraysDeep(payload)
    .filter((arr) =>
      arr.some((item) =>
        item &&
        typeof item === "object" &&
        (
          item?.sku ||
          item?.variant_id ||
          item?.id ||
          item?.design ||
          item?.product ||
          item?.size ||
          item?.color
        )
      )
    );

  const variants =
    variantPathCandidates[0] ??
    deepVariantArrays.sort((a, b) => b.length - a.length)[0] ??
    [];

  return { product, variants };
}

function collectArraysDeep(input: any, depth = 0): any[][] {
  if (depth > 6 || input == null) return [];
  const collected: any[][] = [];
  if (Array.isArray(input)) {
    collected.push(input);
    input.forEach((item) => {
      collected.push(...collectArraysDeep(item, depth + 1));
    });
    return collected;
  }
  if (typeof input === "object") {
    Object.keys(input).forEach((key) => {
      collected.push(...collectArraysDeep(input[key], depth + 1));
    });
  }
  return collected;
}

function buildMappingRowsFromDetails(detailResponses: any[]): MappingRow[] {
  const rows: MappingRow[] = [];
  detailResponses.forEach((resp) => {
    const { product, variants } = normalizeProductDetailResponse(resp);
    const productId = String(product?.id ?? product?.product_id ?? "");
    const productName = String(product?.name ?? product?.title ?? product?.product_name ?? "");
    variants.forEach((variant: any) => {
      const variantProduct = variant?.product ?? {};
      const frontUrl =
        variant?.design?.front?.url ??
        variant?.design_front?.url ??
        variant?.front?.url ??
        variant?.front_url ??
        "";
      const backUrl =
        variant?.design?.back?.url ??
        variant?.design_back?.url ??
        variant?.back?.url ??
        variant?.back_url ??
        "";
      rows.push({
        parentProductId: productId,
        parentName: productName,
        variantId: String(variant?.id ?? variant?.variant_id ?? ""),
        sku: String(variant?.sku ?? ""),
        color: String(
          variantProduct?.color ??
          variantProduct?.colour ??
          variant?.color ??
          variant?.colour ??
          variant?.attributes?.color ??
          ""
        ),
        size: String(
          variantProduct?.size ??
          variant?.size ??
          variant?.attributes?.size ??
          ""
        ),
        frontUrl: String(frontUrl),
        backUrl: String(backUrl),
      });
    });
  });
  return rows.filter((row) =>
    row.parentProductId ||
    row.parentName ||
    row.variantId ||
    row.sku ||
    row.color ||
    row.size ||
    row.frontUrl ||
    row.backUrl
  );
}

// ─── Status Badge ─────────────────────────────────────────────────────────────

const TONE_STYLES: Record<StatusTone, { wrap: string; dot: string; label: string }> = {
  green:   { wrap: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30", dot: "bg-emerald-500", label: "OK" },
  yellow:  { wrap: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",         dot: "bg-amber-500 animate-pulse", label: "Slow" },
  red:     { wrap: "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30",                 dot: "bg-red-500", label: "Error" },
  idle:    { wrap: "bg-gray-400/10 text-gray-500 dark:text-gray-400 border-gray-400/20",             dot: "bg-gray-400", label: "Idle" },
  loading: { wrap: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30",             dot: "bg-blue-500 animate-pulse", label: "Running" },
};

const StatusBadge: React.FC<{ tone: StatusTone; latency?: string | null }> = ({ tone, latency }) => {
  const s = TONE_STYLES[tone];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[11px] font-semibold tracking-wide ${s.wrap}`}>
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${s.dot}`} />
      {s.label}
      {latency && tone !== "idle" && tone !== "loading" && (
        <span className="opacity-70">· {latency}</span>
      )}
    </span>
  );
};

// ─── Response Drawer ──────────────────────────────────────────────────────────

const ResponseDrawer: React.FC<{ state: ApiState; serial: number; title: string }> = ({ state, serial, title }) => {
  if (!state.response && !state.error && !state.loading) return null;

  return (
    <div className="border-t border-white/10 bg-gray-50/60 dark:bg-[#0d0d14]">
      <div className="flex items-center justify-between px-4 py-2 border-b border-white/10">
        <span className="text-[11px] font-semibold text-brand-secondary tracking-wider uppercase">
          {serial}. {title} — Response
        </span>
        {state.response?.timestamp && (
          <span className="text-[10px] text-gray-400 font-mono">
            {new Date(state.response.timestamp).toLocaleTimeString()}
          </span>
        )}
      </div>
      <pre className="text-[11px] font-mono leading-relaxed h-64 overflow-auto p-4 text-brand-secondary whitespace-pre-wrap break-words">
        {state.loading
          ? "Waiting for response..."
          : state.error
          ? `Error: ${state.error}`
          : JSON.stringify(state.response, null, 2)}
      </pre>
    </div>
  );
};

// ─── Command Card ─────────────────────────────────────────────────────────────

interface CommandCardProps {
  serial: number;
  group: string;
  title: string;
  method: string;
  endpoint: string;
  description: string;
  state: ApiState;
  onRun: () => void;
  inputs?: React.ReactNode;
}

const CommandCard: React.FC<CommandCardProps> = ({
  serial,
  group,
  title,
  method,
  endpoint,
  description,
  state,
  onRun,
  inputs,
}) => {
  const tone = getStatusTone(state);
  const hasContent = state.response || state.error || state.loading;

  return (
    <div className="border border-white/10 rounded-xl overflow-hidden bg-white dark:bg-brand-surface shadow-sm">
      {/* Header row */}
      <div className="flex items-start gap-4 px-4 py-3">
        {/* Serial */}
        <div className="w-7 h-7 rounded-full bg-indigo-600/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
          {serial}
        </div>

        {/* Identity */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-bold tracking-widest uppercase text-indigo-500 dark:text-indigo-400">
              {group}
            </span>
            <span className="text-sm font-semibold text-brand-primary">{title}</span>
          </div>
          <p className="text-xs text-brand-secondary mt-0.5">{description}</p>
          <div className="flex items-center gap-1.5 mt-1.5">
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded font-mono ${
              method === "GET" ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" : "bg-blue-500/15 text-blue-600"
            }`}>
              {method}
            </span>
            <span className="text-[10px] text-gray-400 font-mono truncate">{endpoint}</span>
          </div>
        </div>

        {/* Inputs + Run button */}
        <div className="flex flex-col gap-1.5 flex-shrink-0 w-48">
          {inputs}
          <button
            type="button"
            onClick={onRun}
            disabled={state.loading}
            className="w-full px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {state.loading ? (
              <span className="flex items-center justify-center gap-1.5">
                <span className="w-3 h-3 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                Running…
              </span>
            ) : (
              "▶ Run"
            )}
          </button>
        </div>

        {/* Status */}
        <div className="flex-shrink-0 pt-1">
          <StatusBadge tone={tone} latency={latencyLabel(state)} />
        </div>
      </div>

      {/* Response drawer — inline, directly below the row */}
      {hasContent && (
        <ResponseDrawer state={state} serial={serial} title={title} />
      )}
    </div>
  );
};

// ─── Small input helper ───────────────────────────────────────────────────────

const ParamInput: React.FC<{
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}> = ({ value, onChange, placeholder }) => (
  <input
    type="text"
    value={value}
    onChange={(e) => onChange(e.target.value)}
    placeholder={placeholder}
    className="w-full rounded-md border border-gray-300 dark:border-white/20 bg-gray-50 dark:bg-brand-bg px-2 py-1.5 text-xs text-brand-primary placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
  />
);

const ProductPreviewCard: React.FC<{ product: ProductCardLite }> = ({ product }) => {
  const variantCount = product.variants.length;
  const previewVariants = product.variants.slice(0, 4);
  const firstPriced = product.variants.find((v) => typeof v.price === "number");

  return (
    <article className="rounded-xl border border-white/15 bg-white dark:bg-brand-surface shadow-sm overflow-hidden">
      <div className="aspect-square bg-gray-100 dark:bg-white/5 overflow-hidden">
        {product.image ? (
          <img
            src={product.image}
            alt={product.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-xs text-brand-secondary">
            No image
          </div>
        )}
      </div>
      <div className="p-3 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-sm font-semibold text-brand-primary line-clamp-2">{product.name}</h3>
          <span className="text-[10px] px-2 py-0.5 rounded-full border border-indigo-500/30 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 uppercase">
            {product.status}
          </span>
        </div>
        <div className="text-[11px] text-brand-secondary">
          {product.brand} · {product.category}
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-brand-secondary">Variants</span>
          <span className="text-sm font-bold text-pink-500">{variantCount}</span>
        </div>
        <div className="flex flex-wrap gap-1">
          {previewVariants.length > 0 ? (
            previewVariants.map((variant) => (
              <span
                key={variant.id}
                className="text-[10px] px-2 py-0.5 rounded-md bg-gray-100 dark:bg-white/10 text-brand-secondary"
              >
                {variant.size || "NA"} {variant.color ? `· ${variant.color}` : ""} {variant.sku ? `· ${variant.sku}` : ""}
              </span>
            ))
          ) : (
            <span className="text-[10px] text-brand-secondary">No variant details in this response</span>
          )}
        </div>
        <div className="pt-1 border-t border-white/10 flex items-center justify-between">
          <span className="text-[11px] text-brand-secondary">Parent Product ID</span>
          <span className="text-[10px] font-mono text-brand-secondary truncate max-w-[60%]">{product.id}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-brand-secondary">Sample Price</span>
          <span className="text-sm font-bold text-brand-primary">
            {typeof firstPriced?.price === "number" ? `₹${Math.round(firstPriced.price)}` : "N/A"}
          </span>
        </div>
      </div>
    </article>
  );
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export const PrintroveTestPage: React.FC = () => {
  const [heartbeat,        setHeartbeat]        = useState<ApiState>(initialApiState());
  const [auth,             setAuth]             = useState<ApiState>(initialApiState());
  const [categories,       setCategories]       = useState<ApiState>(initialApiState());
  const [catProducts,      setCatProducts]      = useState<ApiState>(initialApiState());
  const [variants,         setVariants]         = useState<ApiState>(initialApiState());
  const [products,         setProducts]         = useState<ApiState>(initialApiState());
  const [productById,      setProductById]      = useState<ApiState>(initialApiState());

  // Orders API states
  const [pincode,          setPincode]          = useState<ApiState>(initialApiState());
  const [serviceability,   setServiceability]   = useState<ApiState>(initialApiState());
  const [orders,           setOrders]           = useState<ApiState>(initialApiState());
  const [orderById,        setOrderById]        = useState<ApiState>(initialApiState());
  const [createOrder,      setCreateOrder]      = useState<ApiState>(initialApiState());

  const [categoryId,       setCategoryId]       = useState("");
  const [varCategoryId,    setVarCategoryId]    = useState("");
  const [varProductId,     setVarProductId]     = useState("");
  const [filterName,       setFilterName]       = useState("");
  const [filterSku,        setFilterSku]        = useState("");
  const [lookupProductId,  setLookupProductId]  = useState("");
  const [mappingRows, setMappingRows] = useState<MappingRow[]>([]);
  const [mappingLoading, setMappingLoading] = useState(false);
  const [mappingError, setMappingError] = useState("");
  const [fetchedProductDetailsCount, setFetchedProductDetailsCount] = useState(0);

  // Orders API inputs
  const [pincodeInput,     setPincodeInput]     = useState("");
  const [svcCountry,       setSvcCountry]       = useState("India");
  const [svcPincode,       setSvcPincode]       = useState("");
  const [svcWeight,        setSvcWeight]        = useState("500");
  const [svcCod,           setSvcCod]           = useState("false");
  const [orderTrackingNo,  setOrderTrackingNo]  = useState("");
  const [orderRefNo,       setOrderRefNo]       = useState("");
  const [lookupOrderId,    setLookupOrderId]    = useState("");
  const [createOrderBody,  setCreateOrderBody]  = useState(
    JSON.stringify({
      reference_number: "TEST-001",
      retail_price: 500,
      customer: {
        name: "Test User",
        email: "test@example.com",
        number: 9999999999,
        address1: "123 Test Lane",
        address2: "Test Area",
        pincode: 600001,
        country: "India",
      },
      order_products: [
        {
          variant_id: 0,
          quantity: 1,
          is_plain: false,
        },
      ],
      cod: false,
    }, null, 2)
  );

  const run = useCallback(
    async (
      setter: React.Dispatch<React.SetStateAction<ApiState>>,
      call: () => Promise<any>
    ) => {
      setter((s) => ({ ...s, loading: true, error: null }));
      try {
        const data = await call();
        setter({ response: data, loading: false, error: null });
      } catch (err: any) {
        setter({ response: null, loading: false, error: err.message || "Request failed" });
      }
    },
    []
  );

  const activeCount = [
    heartbeat, auth, categories, catProducts, variants, products, productById,
    pincode, serviceability, orders, orderById, createOrder,
  ].filter((s) => s.response?.success).length;

  const libraryProducts = useMemo(
    () => extractLibraryProducts(products.response, productById.response),
    [products.response, productById.response]
  );

  const totalVariants = useMemo(
    () => libraryProducts.reduce((acc, p) => acc + p.variants.length, 0),
    [libraryProducts]
  );

  const buildProductMappingTable = async () => {
    if (!products.response?.success) {
      setMappingError("Run 'List My Products' first to fetch product IDs.");
      return;
    }
    setMappingLoading(true);
    setMappingError("");
    try {
      const productIds = extractProductIdsFromListResponse(products.response);
      if (!productIds.length) {
        setMappingRows([]);
        setFetchedProductDetailsCount(0);
        setMappingError("No product IDs found in List My Products response.");
        return;
      }

      const details = await Promise.all(
        productIds.map((id) => api.getPrintroveProductById(id))
      );
      const rows = buildMappingRowsFromDetails(details);
      setMappingRows(rows);
      setFetchedProductDetailsCount(details.length);
      if (!rows.length) {
        setMappingError("Fetched product details, but no variant rows were found.");
      }
    } catch (err: any) {
      setMappingError(err?.message || "Failed to build mapping table.");
    } finally {
      setMappingLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-4">

      {/* Page header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-brand-primary tracking-tight">
            Printrove · Command Center
          </h1>
          <p className="text-xs text-brand-secondary mt-1">
            Run individual API tests against the Printrove integration layer.
            Each card shows its own response inline.
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-xs font-medium text-indigo-600 dark:text-indigo-400 flex-shrink-0">
          <span className="w-2 h-2 rounded-full bg-indigo-500" />
          {activeCount} / 12 OK
        </div>
      </div>

      {/* ── System ── */}
      <div className="space-y-2">
        <p className="text-[11px] font-bold tracking-widest uppercase text-gray-400 px-1">System</p>

        <CommandCard
          serial={1}
          group="System"
          title="Heartbeat"
          method="GET"
          endpoint="/api/printrove/heartbeat"
          description="Connectivity probe — checks if Printrove servers are reachable."
          state={heartbeat}
          onRun={() => run(setHeartbeat, () => api.getPrintroveHeartbeat())}
        />

        <CommandCard
          serial={2}
          group="System"
          title="Authentication"
          method="POST"
          endpoint="/api/printrove/auth-test"
          description="Generates a bearer token using configured credentials. Token preview is shown."
          state={auth}
          onRun={() => run(setAuth, () => api.getPrintroveAuthTest())}
        />

      </div>

      {/* ── Catalog ── */}
      <div className="space-y-2">
        <p className="text-[11px] font-bold tracking-widest uppercase text-gray-400 px-1">Catalog</p>

        <CommandCard
          serial={3}
          group="Catalog"
          title="List Categories"
          method="GET"
          endpoint="/api/printrove/catalog/categories"
          description="Returns all top-level product categories available in Printrove's catalog."
          state={categories}
          onRun={() => run(setCategories, () => api.getPrintroveCatalogCategories())}
        />

        <CommandCard
          serial={4}
          group="Catalog"
          title="Parent Products by Category"
          method="GET"
          endpoint="/api/printrove/catalog/categories/:categoryId"
          description="Lists all parent products under a specific category."
          state={catProducts}
          onRun={() => {
            if (!categoryId.trim()) {
              setCatProducts({ response: null, loading: false, error: "category_id is required." });
              return;
            }
            run(setCatProducts, () => api.getPrintroveCatalogCategoryProducts(categoryId.trim()));
          }}
          inputs={
            <ParamInput value={categoryId} onChange={setCategoryId} placeholder="category_id *" />
          }
        />

        <CommandCard
          serial={5}
          group="Catalog"
          title="Product Variants"
          method="GET"
          endpoint="/api/printrove/catalog/categories/:categoryId/products/:productId"
          description="Returns all SKU variants (size, colour, price) for a specific product."
          state={variants}
          onRun={() => {
            if (!varCategoryId.trim() || !varProductId.trim()) {
              setVariants({ response: null, loading: false, error: "Both category_id and product_id are required." });
              return;
            }
            run(setVariants, () => api.getPrintroveCatalogProductVariants(varCategoryId.trim(), varProductId.trim()));
          }}
          inputs={
            <>
              <ParamInput value={varCategoryId} onChange={setVarCategoryId} placeholder="category_id *" />
              <ParamInput value={varProductId}  onChange={setVarProductId}  placeholder="product_id *" />
            </>
          }
        />
      </div>

      {/* ── Product Library ── */}
      <div className="space-y-2">
        <p className="text-[11px] font-bold tracking-widest uppercase text-gray-400 px-1">Product Library</p>

        <CommandCard
          serial={6}
          group="Product Library"
          title="List My Products"
          method="GET"
          endpoint="/api/printrove/products"
          description="Products you have already created/listed in your Printrove account. Supports optional name / SKU filters."
          state={products}
          onRun={() =>
            run(setProducts, () =>
              api.getPrintroveProducts({
                name: filterName.trim() || undefined,
                sku:  filterSku.trim()  || undefined,
              })
            )
          }
          inputs={
            <>
              <ParamInput value={filterName} onChange={setFilterName} placeholder="filter: name (optional)" />
              <ParamInput value={filterSku}  onChange={setFilterSku}  placeholder="filter: sku (optional)" />
            </>
          }
        />

        <CommandCard
          serial={7}
          group="Product Library"
          title="Get Product by ID"
          method="GET"
          endpoint="/api/printrove/products/:productId"
          description="Fetches full details of a single product from your Printrove library."
          state={productById}
          onRun={() => {
            if (!lookupProductId.trim()) {
              setProductById({ response: null, loading: false, error: "product_id is required." });
              return;
            }
            run(setProductById, () => api.getPrintroveProductById(lookupProductId.trim()));
          }}
          inputs={
            <ParamInput value={lookupProductId} onChange={setLookupProductId} placeholder="product_id *" />
          }
        />

        <section className="mt-3 rounded-xl border border-white/10 bg-white dark:bg-brand-surface p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-brand-primary">Product Library Preview</h3>
              <p className="text-xs text-brand-secondary mt-0.5">
                PLP-style cards generated from Product Library responses.
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="px-2 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400">
                Parent Products: {libraryProducts.length}
              </span>
              <span className="px-2 py-1 rounded-full bg-pink-500/10 border border-pink-500/20 text-pink-600 dark:text-pink-400">
                Total Variants: {totalVariants}
              </span>
            </div>
          </div>
          {libraryProducts.length > 0 ? (
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {libraryProducts.map((product) => (
                <ProductPreviewCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <div className="mt-4 rounded-lg border border-dashed border-white/20 p-4 text-xs text-brand-secondary">
              Run <strong>List My Products</strong> or <strong>Get Product by ID</strong> to populate cards.
            </div>
          )}
        </section>

        <section className="mt-3 rounded-xl border border-white/10 bg-white dark:bg-brand-surface p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-brand-primary">Printrove to Add Product Mapping</h3>
              <p className="text-xs text-brand-secondary mt-0.5">
                Iterates all product IDs from List My Products and maps full detail fields to Add Product form fields.
              </p>
            </div>
            <button
              type="button"
              onClick={buildProductMappingTable}
              disabled={mappingLoading}
              className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold disabled:opacity-60"
            >
              {mappingLoading ? "Building..." : "Build Mapping Table"}
            </button>
          </div>

          {mappingError && (
            <div className="mt-3 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-600 dark:text-red-300">
              {mappingError}
            </div>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
            <span className="px-2 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400">
              Parent Products Fetched: {fetchedProductDetailsCount}
            </span>
            <span className="px-2 py-1 rounded-full bg-pink-500/10 border border-pink-500/20 text-pink-600 dark:text-pink-400">
              Variant Rows: {mappingRows.length}
            </span>
          </div>

          <div className="mt-4 overflow-auto border border-white/10 rounded-lg">
            <table className="min-w-[1300px] w-full text-xs">
              <thead className="bg-gray-50 dark:bg-white/5 text-brand-primary">
                <tr>
                  <th className="text-left p-2 border-b border-white/10">Printrove Parent</th>
                  <th className="text-left p-2 border-b border-white/10">Printrove Variant</th>
                  <th className="text-left p-2 border-b border-white/10">data.product.id</th>
                  <th className="text-left p-2 border-b border-white/10">data.product.name</th>
                  <th className="text-left p-2 border-b border-white/10">data.variants[i].sku</th>
                  <th className="text-left p-2 border-b border-white/10">data.variants[i].id</th>
                  <th className="text-left p-2 border-b border-white/10">data.variants[i].product.color</th>
                  <th className="text-left p-2 border-b border-white/10">data.variants[i].product.size</th>
                  <th className="text-left p-2 border-b border-white/10">data.variants[i].design.front.url</th>
                  <th className="text-left p-2 border-b border-white/10">data.variants[i].design.back.url</th>
                  <th className="text-left p-2 border-b border-white/10">Add Product Field Mapping</th>
                </tr>
              </thead>
              <tbody>
                {mappingRows.length > 0 ? (
                  mappingRows.map((row, index) => (
                    <tr key={`${row.parentProductId}-${row.variantId}-${index}`} className="align-top">
                      <td className="p-2 border-b border-white/10 text-brand-secondary">{row.parentName || "—"}</td>
                      <td className="p-2 border-b border-white/10 text-brand-secondary">{row.variantId || "—"}</td>
                      <td className="p-2 border-b border-white/10 font-mono">{row.parentProductId || "—"} <span className="text-[10px] text-gray-400">(partner_product_id)</span></td>
                      <td className="p-2 border-b border-white/10">{row.parentName || "—"} <span className="text-[10px] text-gray-400">(title)</span></td>
                      <td className="p-2 border-b border-white/10 font-mono">{row.sku || "—"} <span className="text-[10px] text-gray-400">(future variant sku field)</span></td>
                      <td className="p-2 border-b border-white/10 font-mono">{row.variantId || "—"} <span className="text-[10px] text-gray-400">(future variant id field)</span></td>
                      <td className="p-2 border-b border-white/10">{row.color || "—"} <span className="text-[10px] text-gray-400">(color)</span></td>
                      <td className="p-2 border-b border-white/10">{row.size || "—"} <span className="text-[10px] text-gray-400">(sizes[])</span></td>
                      <td className="p-2 border-b border-white/10 max-w-[220px] truncate">{row.frontUrl || "—"} <span className="text-[10px] text-gray-400">(main_image_url/mockup_images[])</span></td>
                      <td className="p-2 border-b border-white/10 max-w-[220px] truncate">{row.backUrl || "—"} <span className="text-[10px] text-gray-400">(mockup_images[])</span></td>
                      <td className="p-2 border-b border-white/10 text-brand-secondary">
                        partner_product_id, title, color, sizes, main_image_url/mockup_images
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={11} className="p-4 text-center text-brand-secondary">
                      Click <strong>Build Mapping Table</strong> after running List My Products.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {/* ── Orders API ── */}
      <div className="space-y-2">
        <p className="text-[11px] font-bold tracking-widest uppercase text-gray-400 px-1">Orders API</p>

        <CommandCard
          serial={8}
          group="Orders"
          title="Pincode Details"
          method="GET"
          endpoint="/api/printrove/orders/pincode/:pincode"
          description="Returns city, state and district info for an Indian pincode. Useful for auto-filling address fields."
          state={pincode}
          onRun={() => {
            if (!pincodeInput.trim()) {
              setPincode({ response: null, loading: false, error: "pincode is required." });
              return;
            }
            run(setPincode, () => api.getPrintrovePincodeDetails(pincodeInput.trim()));
          }}
          inputs={
            <ParamInput value={pincodeInput} onChange={setPincodeInput} placeholder="pincode *  e.g. 600001" />
          }
        />

        <CommandCard
          serial={9}
          group="Orders"
          title="Serviceability Check"
          method="GET"
          endpoint="/api/printrove/orders/serviceability"
          description="Checks if Printrove can deliver to a given pincode for the specified weight. Returns available couriers."
          state={serviceability}
          onRun={() => {
            if (!svcPincode.trim()) {
              setServiceability({ response: null, loading: false, error: "pincode is required." });
              return;
            }
            run(setServiceability, () =>
              api.checkPrintroveServiceability({
                country: svcCountry.trim() || "India",
                pincode: svcPincode.trim(),
                weight: svcWeight.trim() || "500",
                cod: svcCod === "true" ? "true" : "false",
              })
            );
          }}
          inputs={
            <>
              <ParamInput value={svcCountry}  onChange={setSvcCountry}  placeholder="country (default: India)" />
              <ParamInput value={svcPincode}  onChange={setSvcPincode}  placeholder="pincode *  e.g. 600001" />
              <ParamInput value={svcWeight}   onChange={setSvcWeight}   placeholder="weight in gms (default: 500)" />
              <select
                value={svcCod}
                onChange={(e) => setSvcCod(e.target.value)}
                className="w-full rounded-md border border-gray-300 dark:border-white/20 bg-gray-50 dark:bg-brand-bg px-2 py-1.5 text-xs text-brand-primary focus:outline-none focus:ring-1 focus:ring-indigo-400"
              >
                <option value="false">COD: No</option>
                <option value="true">COD: Yes</option>
              </select>
            </>
          }
        />

        <CommandCard
          serial={10}
          group="Orders"
          title="List All Orders"
          method="GET"
          endpoint="/api/printrove/orders"
          description="Returns all orders placed via Printrove. Supports optional filters by tracking number or reference number."
          state={orders}
          onRun={() =>
            run(setOrders, () =>
              api.listPrintroveOrders({
                tracking_number: orderTrackingNo.trim() || undefined,
                reference_number: orderRefNo.trim() || undefined,
              })
            )
          }
          inputs={
            <>
              <ParamInput value={orderTrackingNo} onChange={setOrderTrackingNo} placeholder="tracking_number (optional)" />
              <ParamInput value={orderRefNo}       onChange={setOrderRefNo}       placeholder="reference_number (optional)" />
            </>
          }
        />

        <CommandCard
          serial={11}
          group="Orders"
          title="Get Order by ID"
          method="GET"
          endpoint="/api/printrove/orders/:orderId"
          description="Fetches full details of a single Printrove order including its current status and tracking info."
          state={orderById}
          onRun={() => {
            if (!lookupOrderId.trim()) {
              setOrderById({ response: null, loading: false, error: "order_id is required." });
              return;
            }
            run(setOrderById, () => api.getPrintroveOrderById(lookupOrderId.trim()));
          }}
          inputs={
            <ParamInput value={lookupOrderId} onChange={setLookupOrderId} placeholder="order_id *" />
          }
        />

        {/* Create Order — POST with JSON body textarea */}
        <div className="border border-white/10 rounded-xl overflow-hidden bg-white dark:bg-brand-surface shadow-sm">
          <div className="flex items-start gap-4 px-4 py-3">
            <div className="w-7 h-7 rounded-full bg-indigo-600/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
              12
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-bold tracking-widest uppercase text-indigo-500 dark:text-indigo-400">Orders</span>
                <span className="text-sm font-semibold text-brand-primary">Create Order</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded font-mono font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400">
                  ⚠ LIVE
                </span>
              </div>
              <p className="text-xs text-brand-secondary mt-0.5">
                Submits a new print order to Printrove using a <code className="text-[10px] bg-gray-100 dark:bg-white/10 px-1 rounded">variant_id</code> from your Product Library.
                {" "}<span className="text-amber-600 dark:text-amber-400 font-medium">This creates a real order — ensure variant_id and address details are valid before running.</span>
              </p>
              <div className="flex items-center gap-1.5 mt-1.5">
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded font-mono bg-blue-500/15 text-blue-600">POST</span>
                <span className="text-[10px] text-gray-400 font-mono">/api/printrove/orders</span>
              </div>
            </div>

            <div className="flex-shrink-0 pt-1">
              <StatusBadge tone={getStatusTone(createOrder)} latency={latencyLabel(createOrder)} />
            </div>
          </div>

          <div className="px-4 pb-4 space-y-2 border-t border-white/10 pt-3">
            <label className="text-[11px] font-semibold text-brand-secondary uppercase tracking-wide">Request Body (JSON)</label>
            <textarea
              value={createOrderBody}
              onChange={(e) => setCreateOrderBody(e.target.value)}
              rows={14}
              spellCheck={false}
              className="w-full rounded-lg border border-gray-300 dark:border-white/20 bg-gray-50 dark:bg-brand-bg px-3 py-2 text-xs font-mono text-brand-primary placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-indigo-400 resize-y"
            />
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  let parsed: any;
                  try {
                    parsed = JSON.parse(createOrderBody);
                  } catch {
                    setCreateOrder({ response: null, loading: false, error: "Invalid JSON in request body. Fix the syntax and try again." });
                    return;
                  }
                  run(setCreateOrder, () => api.createPrintroveOrder(parsed));
                }}
                disabled={createOrder.loading}
                className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {createOrder.loading ? (
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                    Submitting…
                  </span>
                ) : (
                  "▶ Run"
                )}
              </button>
              <button
                type="button"
                onClick={() => setCreateOrder(initialApiState())}
                className="px-3 py-1.5 rounded-lg border border-white/20 text-xs text-brand-secondary hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
              >
                Clear
              </button>
            </div>
          </div>

          {(createOrder.response || createOrder.error || createOrder.loading) && (
            <ResponseDrawer state={createOrder} serial={12} title="Create Order" />
          )}
        </div>
      </div>

    </div>
  );
};
