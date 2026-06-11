import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Button, Card } from "../../../components/ui";
import {
  RefreshCwIcon,
  CheckCircleIcon,
  ZapIcon,
  RocketIcon,
  ChevronDownIcon,
} from "../../../components/icons";
import api from "../../../services/api";

type ServiceStatus = "ok" | "degraded" | "error" | "not_configured";

interface ServiceCheck {
  name: string;
  status: ServiceStatus;
  message?: string;
  latency_ms?: number;
  details?: Record<string, unknown>;
}

interface HealthReport {
  status: ServiceStatus;
  timestamp: string;
  environment: string;
  services: ServiceCheck[];
  summary: {
    ok: number;
    degraded: number;
    error: number;
    not_configured: number;
  };
}

interface CrudTestResult {
  name: string;
  status: ServiceStatus;
  message?: string;
  latency_ms?: number;
}

interface PrintroveProbe {
  serial: number;
  group: string;
  name: string;
  method: string;
  endpoint: string;
  status: ServiceStatus;
  message?: string;
  latency_ms?: number;
  details?: Record<string, unknown>;
}

interface PrintroveReport {
  status: ServiceStatus;
  timestamp: string;
  probes: PrintroveProbe[];
  summary: { ok: number; degraded: number; error: number };
}

const statusStyles: Record<
  ServiceStatus,
  { dot: string; badge: string; label: string }
> = {
  ok: {
    dot: "bg-emerald-500",
    badge:
      "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30",
    label: "OK",
  },
  degraded: {
    dot: "bg-amber-500",
    badge:
      "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/30",
    label: "Degraded",
  },
  error: {
    dot: "bg-red-500",
    badge:
      "bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-300 dark:border-red-500/30",
    label: "Error",
  },
  not_configured: {
    dot: "bg-gray-400",
    badge:
      "bg-gray-50 text-gray-600 border-gray-200 dark:bg-white/5 dark:text-brand-secondary dark:border-white/10",
    label: "Not configured",
  },
};

const StatusBadge: React.FC<{ status: ServiceStatus }> = ({ status }) => {
  const s = statusStyles[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${s.badge}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  );
};

const ProbeRow: React.FC<{ probe: PrintroveProbe }> = ({ probe }) => {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-brand-surface/30 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50/80 dark:hover:bg-white/5 transition-colors"
      >
        <span className="w-6 h-6 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-[11px] font-bold flex-shrink-0">
          {probe.serial}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-brand-secondary/60">
              {probe.group}
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-gray-100 dark:bg-white/10 text-brand-secondary">
              {probe.method}
            </span>
          </div>
          <p className="text-sm font-medium text-brand-primary mt-0.5">
            {probe.name}
          </p>
          <p className="text-[11px] font-mono text-brand-secondary/70 truncate">
            {probe.endpoint}
          </p>
          {probe.message && (
            <p className="text-xs text-brand-secondary mt-1">{probe.message}</p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {probe.latency_ms != null && (
            <span className="text-xs text-brand-secondary/60 hidden sm:inline">
              {probe.latency_ms >= 1000
                ? `${(probe.latency_ms / 1000).toFixed(1)}s`
                : `${probe.latency_ms}ms`}
            </span>
          )}
          <StatusBadge status={probe.status} />
          <ChevronDownIcon
            className={`w-4 h-4 text-brand-secondary/40 transition-transform ${open ? "rotate-180" : ""}`}
          />
        </div>
      </button>
      {open && probe.details && (
        <pre className="text-[10px] font-mono text-brand-secondary/80 bg-gray-50 dark:bg-white/5 border-t border-gray-200 dark:border-white/10 px-4 py-3 overflow-x-auto">
          {JSON.stringify(probe.details, null, 2)}
        </pre>
      )}
    </div>
  );
};

export const SystemsGoView: React.FC = () => {
  const [report, setReport] = useState<HealthReport | null>(null);
  const [crudTests, setCrudTests] = useState<CrudTestResult[] | null>(null);
  const [printroveReport, setPrintroveReport] = useState<PrintroveReport | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [runningTests, setRunningTests] = useState(false);
  const [runningPrintrove, setRunningPrintrove] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [frontendOk, setFrontendOk] = useState<boolean | null>(null);

  const fetchStatus = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getHealthStatus();
      setReport(data as HealthReport);
    } catch (err: any) {
      setError(err?.message || "Failed to load system status");
      setReport(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const runCrudTests = async () => {
    setRunningTests(true);
    setError(null);
    try {
      const data = await api.runHealthTests();
      setCrudTests(data.tests as CrudTestResult[]);
    } catch (err: any) {
      setError(err?.message || "CRUD smoke tests failed");
    } finally {
      setRunningTests(false);
    }
  };

  const runPrintroveTests = useCallback(async () => {
    setRunningPrintrove(true);
    setError(null);
    try {
      const data = await api.runPrintroveTests();
      setPrintroveReport(data as PrintroveReport);
    } catch (err: any) {
      setError(err?.message || "Printrove probe suite failed");
    } finally {
      setRunningPrintrove(false);
    }
  }, []);

  const refreshAll = useCallback(async () => {
    await Promise.all([fetchStatus(), runPrintroveTests()]);
  }, [fetchStatus, runPrintroveTests]);

  useEffect(() => {
    setFrontendOk(typeof window !== "undefined" && !!window.document);
    refreshAll();
  }, [refreshAll]);

  const printroveGroups = useMemo(() => {
    if (!printroveReport) return [];
    const groups = new Map<string, PrintroveProbe[]>();
    for (const probe of printroveReport.probes) {
      const list = groups.get(probe.group) ?? [];
      list.push(probe);
      groups.set(probe.group, list);
    }
    return Array.from(groups.entries());
  }, [printroveReport]);

  const overallOk =
    report?.status !== "error" &&
    printroveReport?.status !== "error" &&
    (crudTests === null || !crudTests.some((t) => t.status === "error"));

  return (
    <div className="space-y-6">
      {/* Hero status */}
      <Card className="p-6 border border-gray-200 dark:border-white/10 bg-white dark:bg-brand-surface/50">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-start gap-4">
            <div
              className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                overallOk
                  ? "bg-emerald-100 dark:bg-emerald-500/20"
                  : "bg-amber-100 dark:bg-amber-500/20"
              }`}
            >
              {overallOk ? (
                <CheckCircleIcon className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <ZapIcon className="w-6 h-6 text-amber-600 dark:text-amber-400" />
              )}
            </div>
            <div>
              <h2 className="text-xl font-display font-bold text-brand-primary">
                Systems Go
              </h2>
              <p className="text-sm text-brand-secondary mt-0.5">
                Infrastructure health, CRUD smoke tests, and Printrove API probes
                (same checks as <span className="font-mono text-xs">/pt</span>).
              </p>
              {report && (
                <p className="text-xs text-brand-secondary/70 mt-2">
                  Environment:{" "}
                  <span className="font-mono">{report.environment}</span>
                  {printroveReport && (
                    <>
                      {" · "}
                      Printrove:{" "}
                      <span className="font-semibold">
                        {printroveReport.summary.ok}/{printroveReport.probes.length} OK
                      </span>
                    </>
                  )}
                </p>
              )}
            </div>
          </div>
          <div className="flex flex-nowrap items-center gap-2 flex-shrink-0">
            <Button
              variant="outline"
              onClick={refreshAll}
              disabled={loading || runningPrintrove}
              className="gap-1.5 px-3 text-sm whitespace-nowrap"
            >
              <RefreshCwIcon
                className={`w-4 h-4 flex-shrink-0 ${loading || runningPrintrove ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>
            <Button
              variant="outline"
              onClick={runCrudTests}
              disabled={runningTests}
              className="gap-1.5 px-3 text-sm whitespace-nowrap"
            >
              <RocketIcon className="w-4 h-4 flex-shrink-0" />
              {runningTests ? "…" : "CRUD"}
            </Button>
            <Button
              onClick={runPrintroveTests}
              disabled={runningPrintrove}
              className="gap-1.5 px-3 text-sm whitespace-nowrap"
            >
              <ZapIcon className="w-4 h-4 flex-shrink-0" />
              {runningPrintrove ? "…" : "Printrove"}
            </Button>
          </div>
        </div>
      </Card>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 dark:bg-red-500/10 dark:border-red-500/30 px-4 py-3 text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      {/* Printrove probes — /pt parity */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-brand-secondary">
            Printrove API probes
          </h3>
          {printroveReport && (
            <div className="flex items-center gap-2 text-xs text-brand-secondary">
              <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                {printroveReport.summary.ok} ok
              </span>
              {printroveReport.summary.degraded > 0 && (
                <span className="text-amber-600 dark:text-amber-400 font-semibold">
                  {printroveReport.summary.degraded} slow/skipped
                </span>
              )}
              {printroveReport.summary.error > 0 && (
                <span className="text-red-600 dark:text-red-400 font-semibold">
                  {printroveReport.summary.error} error
                </span>
              )}
            </div>
          )}
        </div>

        {runningPrintrove && !printroveReport ? (
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="h-16 rounded-xl bg-gray-100 dark:bg-white/5 animate-pulse"
              />
            ))}
          </div>
        ) : printroveReport ? (
          <div className="space-y-5">
            {printroveGroups.map(([group, probes]) => (
              <div key={group}>
                <p className="text-[11px] font-bold tracking-widest uppercase text-gray-400 mb-2 px-1">
                  {group}
                </p>
                <div className="space-y-2">
                  {probes.map((probe) => (
                    <ProbeRow key={probe.serial} probe={probe} />
                  ))}
                </div>
              </div>
            ))}
            <p className="text-xs text-brand-secondary/60">
              Last run: {new Date(printroveReport.timestamp).toLocaleString()}.
              For manual order creation and mapping tools, use the{" "}
              <a href="/pt" className="text-brand-accent hover:underline">
                Printrove Command Center
              </a>
              .
            </p>
          </div>
        ) : null}
      </div>

      {/* Summary chips */}
      {report && (
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-brand-secondary mb-3">
            Infrastructure
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            <Card className="p-4 text-center border border-gray-200 dark:border-white/10">
              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                {report.summary.ok}
              </p>
              <p className="text-xs text-brand-secondary mt-1">ok</p>
            </Card>
            <Card className="p-4 text-center border border-gray-200 dark:border-white/10">
              <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                {report.summary.degraded}
              </p>
              <p className="text-xs text-brand-secondary mt-1">degraded</p>
            </Card>
            <Card className="p-4 text-center border border-gray-200 dark:border-white/10">
              <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                {report.summary.error}
              </p>
              <p className="text-xs text-brand-secondary mt-1">error</p>
            </Card>
            <Card className="p-4 text-center border border-gray-200 dark:border-white/10">
              <p className="text-2xl font-bold text-gray-600 dark:text-gray-400">
                {report.summary.not_configured}
              </p>
              <p className="text-xs text-brand-secondary mt-1">not configured</p>
            </Card>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Card className="p-4 border border-gray-200 dark:border-white/10">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-brand-primary">Frontend</p>
                  <p className="text-sm text-brand-secondary mt-1">
                    React app loaded in browser
                  </p>
                </div>
                <StatusBadge status={frontendOk ? "ok" : "error"} />
              </div>
            </Card>

            {report.services.map((service) => (
              <Card
                key={service.name}
                className="p-4 border border-gray-200 dark:border-white/10"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-brand-primary">
                      {service.name}
                    </p>
                    {service.message && (
                      <p className="text-sm text-brand-secondary mt-1">
                        {service.message}
                      </p>
                    )}
                    {service.latency_ms != null && (
                      <p className="text-xs text-brand-secondary/60 mt-1">
                        {service.latency_ms}ms
                      </p>
                    )}
                  </div>
                  <StatusBadge status={service.status} />
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* CRUD test results */}
      {crudTests && (
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-brand-secondary mb-3">
            CRUD smoke tests
          </h3>
          <div className="space-y-2">
            {crudTests.map((test) => (
              <div
                key={test.name}
                className="flex items-center justify-between gap-4 px-4 py-3 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-brand-surface/30"
              >
                <div>
                  <p className="text-sm font-medium text-brand-primary">
                    {test.name}
                  </p>
                  {test.message && (
                    <p className="text-xs text-brand-secondary mt-0.5">
                      {test.message}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  {test.latency_ms != null && (
                    <span className="text-xs text-brand-secondary/60">
                      {test.latency_ms}ms
                    </span>
                  )}
                  <StatusBadge status={test.status} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="text-xs text-brand-secondary/60">
        CLI: <code className="font-mono bg-gray-100 dark:bg-white/10 px-1 rounded">npm test</code>{" "}
        and{" "}
        <code className="font-mono bg-gray-100 dark:bg-white/10 px-1 rounded">npm run test:integration</code>{" "}
        in <code className="font-mono bg-gray-100 dark:bg-white/10 px-1 rounded">backend/</code>
      </p>
    </div>
  );
};
