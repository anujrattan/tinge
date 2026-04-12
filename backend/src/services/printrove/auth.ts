import { config } from "../../config/index.js";

const getBaseUrl = () => config.printrove.baseUrl.replace(/\/$/, "");

export async function getPrintroveAccessToken(): Promise<{
  accessToken: string | null;
  response: any;
  status: number;
  statusText: string;
  endpoint: string;
  latencyMs: number;
}> {
  const tokenUrl = `${getBaseUrl()}/api/external/token`;
  const startedAt = Date.now();

  if (!config.printrove.email || !config.printrove.password) {
    return {
      accessToken: null,
      response: {
        success: false,
        message:
          "Printrove credentials missing. Set PRINTROVE_EMAIL and PRINTROVE_PASSWORD in backend .env",
      },
      status: 400,
      statusText: "Bad Request",
      endpoint: tokenUrl,
      latencyMs: Date.now() - startedAt,
    };
  }

  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      email: config.printrove.email,
      password: config.printrove.password,
    }),
  });

  const raw = await response.text();
  let parsed: any = null;
  try {
    parsed = raw ? JSON.parse(raw) : null;
  } catch {
    parsed = { raw_response: raw };
  }

  const accessToken =
    parsed?.access_token || parsed?.accessToken || parsed?.token || null;

  return {
    accessToken,
    response: parsed,
    status: response.status,
    statusText: response.statusText,
    endpoint: tokenUrl,
    latencyMs: Date.now() - startedAt,
  };
}

