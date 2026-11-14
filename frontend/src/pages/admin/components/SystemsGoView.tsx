import React, { useCallback, useEffect, useState } from "react";
import { Button, Card } from "../../../components/ui";
import { RefreshCwIcon, CheckCircleIcon, ZapIcon, RocketIcon } from "../../../components/icons";
import api from "../../../services/api";

type ServiceStatus = "ok" | "degraded" | "error" | "not_configured";

interface ServiceCheck {
  name: string;
  status: ServiceStatus;
  message?: string;
  latency_ms?: number;
}

interface HealthReport {
  status: ServiceStatus;
  timestamp: string;
  environment: string;
  services: ServiceCheck[];
  summary: { ok: number; degraded: number; error: number; not_configured: number };
}

interface CrudTestResult {
  name: string;
  status: ServiceStatus;
  message?: string;
  latency_ms?: number;
}

const statusColor: Record<ServiceStatus, string> = {
  ok: "text-emerald-400",
  degraded: "text-amber-400",
  error: "text-red-400",
  not_configured: "text-brand-muted",
};

export const SystemsGoView: React.FC = () => {
  const [report, setReport] = useState<HealthReport | null>(null);
  const [tests, setTests] = useState<CrudTestResult[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [runningTests, setRunningTests] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getHealthStatus();
      setReport(data as HealthReport);
    } catch (err: any) {
      setError(err?.message || "Failed to load health status");
    } finally {
      setLoading(false);
    }
  }, []);

  const runTests = useCallback(async () => {
    setRunningTests(true);
    setError(null);
    try {
      const data = await api.runHealthTests();
      setTests((data as any)?.tests || []);
    } catch (err: any) {
      setError(err?.message || "Smoke tests failed");
    } finally {
      setRunningTests(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-brand-primary flex items-center gap-2">
            <RocketIcon className="w-5 h-5" /> Systems
          </h2>
          <p className="text-sm text-brand-muted mt-1">
            Infrastructure health for the art-only, in-house store.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={fetchStatus} disabled={loading}>
            <RefreshCwIcon className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button onClick={runTests} disabled={runningTests}>
            <ZapIcon className="w-4 h-4 mr-2" />
            {runningTests ? "Running…" : "Run smoke tests"}
          </Button>
        </div>
      </div>

      {error && (
        <Card className="p-4 border border-red-500/40 text-red-300 text-sm">{error}</Card>
      )}

      <Card className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-brand-primary">Dependencies</h3>
          {report && (
            <span className={`text-sm font-medium ${statusColor[report.status]}`}>
              {report.status.toUpperCase()}
            </span>
          )}
        </div>
        {!report && loading ? (
          <p className="text-sm text-brand-muted">Loading…</p>
        ) : (
          <ul className="space-y-2">
            {(report?.services || []).map((s) => (
              <li key={s.name} className="flex items-center justify-between text-sm border-b border-white/5 pb-2">
                <span className="text-brand-primary flex items-center gap-2">
                  <CheckCircleIcon className={`w-4 h-4 ${statusColor[s.status]}`} />
                  {s.name}
                </span>
                <span className="text-brand-muted">
                  {s.message || s.status}
                  {typeof s.latency_ms === "number" ? ` · ${s.latency_ms}ms` : ""}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {tests && (
        <Card className="p-4 space-y-3">
          <h3 className="font-semibold text-brand-primary">Smoke tests</h3>
          <ul className="space-y-2">
            {tests.map((t) => (
              <li key={t.name} className="flex items-center justify-between text-sm">
                <span className="text-brand-primary">{t.name}</span>
                <span className={statusColor[t.status]}>{t.status}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
};
