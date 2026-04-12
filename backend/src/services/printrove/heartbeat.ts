import { config } from "../../config/index.js";

export async function runPrintroveHeartbeat(): Promise<{
  success: boolean;
  endpoint: string;
  status: number;
  statusText: string;
  latency_ms: number;
}> {
  const startedAt = Date.now();
  const docsUrl = `${config.printrove.baseUrl.replace(/\/$/, "")}/docs/`;
  const response = await fetch(docsUrl, {
    method: "GET",
    headers: { Accept: "text/html" },
  });

  return {
    success: response.ok,
    endpoint: docsUrl,
    status: response.status,
    statusText: response.statusText,
    latency_ms: Date.now() - startedAt,
  };
}

