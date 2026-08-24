"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ComponentType } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import {
  Activity,
  Cpu,
  Database,
  FlaskConical,
  Gauge,
  History,
  Loader2,
  Play,
  RefreshCw,
  Square,
  TriangleAlert,
  Users,
  Zap,
} from "lucide-react";

import { SaSection, saSelectClass } from "@/components/super-admin/sa-section";
import { SuperAdminPageHeader } from "@/components/super-admin/super-admin-page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { APP_ROUTES } from "@/lib/config";
import {
  cancelLoadTest,
  fetchLoadTestStatus,
  runLoadTest,
  type LoadTestCapacity,
  type LoadTestRunSummary,
  type LoadTestStatus,
  type LoadTestStepResult,
} from "@/lib/super-admin-api";
import { cn } from "@/lib/utils";

const ENDPOINT_PRESETS = [
  {
    value: "/actuator/health",
    label: "Server baseline",
    hint: "Tomcat + filter chain, no auth, no DB",
  },
  {
    value: "/api/v1/super-admin/me",
    label: "Authenticated call",
    hint: "Runs with your super-admin JWT — exercises the auth filter",
  },
  {
    value: "/api/v1/realtime/status",
    label: "Realtime probe",
    hint: "Ops probe incl. ticket-store self-test",
  },
  { value: "__custom__", label: "Custom path…", hint: "Any path on this instance" },
];

const CUSTOM_PRESET = "__custom__";

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: ComponentType<{ className?: string }>;
}) {
  return (
    <div className="rounded-xl border border-border/70 bg-card p-4 shadow-sm">
      <div className="flex items-center gap-1.5 text-muted-foreground">
        <Icon className="size-3.5" aria-hidden />
        <p className="text-xs font-medium uppercase tracking-wide">{label}</p>
      </div>
      <p className="mt-2 font-heading text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
        {value}
      </p>
      {sub ? <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{sub}</p> : null}
    </div>
  );
}

function formatPct(value: number) {
  return `${Math.round(value * 10) / 10}%`;
}

function formatRps(value: number) {
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 }).format(value);
}

function formatRunTime(iso: string) {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? iso : date.toLocaleString();
}

function StepTable({
  steps,
  targetP95Ms,
}: {
  steps: LoadTestStepResult[];
  targetP95Ms: number;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-160 border-collapse text-sm">
        <thead>
          <tr className="border-b border-border/70 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <th className="py-2 pr-3 font-medium">Step</th>
            <th className="py-2 pr-3 font-medium">Concurrent users</th>
            <th className="py-2 pr-3 font-medium">Requests</th>
            <th className="py-2 pr-3 font-medium">RPS</th>
            <th className="py-2 pr-3 font-medium">p50</th>
            <th className="py-2 pr-3 font-medium">p95</th>
            <th className="py-2 pr-3 font-medium">p99</th>
            <th className="py-2 pr-3 font-medium">Errors</th>
            <th className="py-2 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {steps.map((step) => {
            const met = step.errorRatePct < 2 && step.p95Ms <= targetP95Ms;
            return (
              <tr
                key={step.step}
                className={cn("border-b border-border/50", met && "bg-emerald-500/4")}
              >
                <td className="py-2 pr-3 font-medium text-foreground">{step.step}</td>
                <td className="py-2 pr-3">{step.concurrency}</td>
                <td className="py-2 pr-3 tabular-nums">{step.requests}</td>
                <td className="py-2 pr-3 tabular-nums">{formatRps(step.rps)}</td>
                <td className="py-2 pr-3 tabular-nums">{step.p50Ms} ms</td>
                <td className="py-2 pr-3 tabular-nums">{step.p95Ms} ms</td>
                <td className="py-2 pr-3 tabular-nums">{step.p99Ms} ms</td>
                <td className="py-2 pr-3 tabular-nums text-destructive">{formatPct(step.errorRatePct)}</td>
                <td className="py-2">
                  <span className="text-xs text-muted-foreground">
                    {Object.entries(step.statusCodes)
                      .map(([code, count]) => `${code}:${count}`)
                      .join(" · ")}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function ProgressBar({ fraction }: { fraction: number }) {
  const clamped = Math.max(0, Math.min(1, fraction));
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={Math.round(clamped * 100)} aria-valuemin={0} aria-valuemax={100}>
      <div
        className="h-full rounded-full bg-primary transition-[width] duration-500"
        style={{ width: `${clamped * 100}%` }}
      />
    </div>
  );
}

export function LoadTestPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<LoadTestStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [starting, setStarting] = useState(false);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [requestedRunMissing, setRequestedRunMissing] = useState(false);

  const [preset, setPreset] = useState(ENDPOINT_PRESETS[0]!.value);
  const [customPath, setCustomPath] = useState("/api/v1/businesses/me");
  const [maxConcurrency, setMaxConcurrency] = useState(200);
  const [steps, setSteps] = useState(4);
  const [secondsPerStep, setSecondsPerStep] = useState(10);
  const [targetP95Ms, setTargetP95Ms] = useState(800);

  const prevRunningRef = useRef(false);
  const busyRef = useRef(false);
  const requestedRunSeenRef = useRef(false);

  // Deep link from the request-log tab: /super-admin/platform/load-test?run=lt-…
  const requestedRunId = searchParams.get("run")?.trim() ?? null;

  // A changed ?run= param gets a fresh resolution pass.
  useEffect(() => {
    requestedRunSeenRef.current = false;
    setRequestedRunMissing(false);
  }, [requestedRunId]);

  // Select the requested run once it shows up in history; otherwise tell the
  // user it is gone (history is in-memory and cleared on restart).
  useEffect(() => {
    if (!requestedRunId || requestedRunSeenRef.current || !status) return;
    const found = status.history.some((run) => run.runId === requestedRunId);
    if (found) {
      requestedRunSeenRef.current = true;
      setSelectedRunId(requestedRunId);
      setRequestedRunMissing(false);
    } else {
      setRequestedRunMissing(true);
    }
  }, [status, requestedRunId]);

  const refresh = useCallback(async (silent: boolean) => {
    if (busyRef.current) return;
    busyRef.current = true;
    if (!silent) setLoading(true);
    try {
      const next = await fetchLoadTestStatus();
      setStatus(next);
      if (prevRunningRef.current && !next.running && next.history[0] && !requestedRunId) {
        setSelectedRunId(next.history[0].runId);
      }
      prevRunningRef.current = next.running;
      setError("");
    } catch (e) {
      if (!silent) setError(e instanceof Error ? e.message : "Failed to reach the load-test endpoint.");
    } finally {
      busyRef.current = false;
      setLoading(false);
    }
  }, [requestedRunId]);

  // Fast poll while a test runs, slow poll (capacity refresh) otherwise.
  useEffect(() => {
    void refresh(false);
    const intervalMs = status?.running ? 2000 : 30_000;
    const timer = setInterval(() => void refresh(true), intervalMs);
    return () => clearInterval(timer);
  }, [refresh, status?.running]);

  const running = status?.running ?? false;
  const live = status?.run ?? null;
  const capacity = status?.capacity ?? null;

  const selectedRun: LoadTestRunSummary | null =
    status?.history.find((run) => run.runId === selectedRunId) ?? null;
  const latestRun = status?.history[0] ?? null;
  const showRun = running ? null : (selectedRun ?? latestRun);

  const progressFraction =
    running && live ? live.elapsedSec / Math.max(1, live.elapsedSec + live.remainingSec) : 0;

  async function onStart() {
    setError("");
    const path =
      preset === CUSTOM_PRESET ? customPath.trim() : preset;
    if (!path.startsWith("/")) {
      setError("Path must start with / — e.g. /actuator/health");
      return;
    }
    setStarting(true);
    try {
      await runLoadTest({
        path,
        maxConcurrency,
        steps,
        secondsPerStep,
        targetP95Ms,
      });
      // Drop any ?run= deep-link so the new run auto-selects on completion.
      requestedRunSeenRef.current = true;
      setRequestedRunMissing(false);
      setSelectedRunId(null);
      router.replace(APP_ROUTES.superAdminPlatformLoadTest);
      await refresh(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not start the load test.");
    } finally {
      setStarting(false);
    }
  }

  async function onCancel() {
    setError("");
    try {
      await cancelLoadTest();
      await refresh(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not cancel the load test.");
    }
  }

  return (
    <div className="space-y-6">
      <SuperAdminPageHeader
        title="Load test"
        description="Find out how many concurrent users this instance can actually support. Runs a staircase load test against the API from inside the server, watches live gauges, and estimates the ceiling from your latency target."
        actions={
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void refresh(false)}
            disabled={running}
          >
            <RefreshCw className={cn(loading && "animate-spin")} aria-hidden />
            Refresh
          </Button>
        }
      />

      {error ? (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>{error}</span>
        </div>
      ) : null}

      {requestedRunMissing && requestedRunId ? (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm text-amber-600 dark:text-amber-400">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span className="min-w-0">
            Run <code className="rounded bg-muted px-1 py-0.5 font-mono text-[11px]">{requestedRunId}</code>{" "}
            isn&apos;t on this instance anymore — load-test history is in-memory and cleared on restart.
            Showing the latest run instead.
          </span>
          <button
            type="button"
            className="ml-auto text-xs font-medium underline-offset-4 hover:underline"
            onClick={() => router.replace(APP_ROUTES.superAdminPlatformLoadTest)}
          >
            Dismiss
          </button>
        </div>
      ) : null}

      {/* ── Live capacity ─────────────────────────────────────────────────── */}
      <SaSection
        title="Instance capacity"
        description="Live gauges for the API replica serving this console. These numbers reset per instance — scale replicas horizontally (with Redis as the WS ticket store) to multiply them."
      >
        {capacity ? (
          <CapacityGrid capacity={capacity} />
        ) : (
          <p className="text-sm text-muted-foreground">Loading gauges…</p>
        )}
      </SaSection>

      {/* ── Run a test ───────────────────────────────────────────────────── */}
      <SaSection
        title="Run a load test"
        description={
          <>
            The server ramps from <span className="font-medium text-foreground">maxConcurrency ÷ steps</span> up to{" "}
            <span className="font-medium text-foreground">{maxConcurrency}</span> concurrent users,{" "}
            {secondsPerStep}s per stair, against{" "}
            <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
              {capacity?.selfTestBaseUrl ?? "http://127.0.0.1:5050"}
              {preset === CUSTOM_PRESET ? (customPath || "/…") : preset}
            </code>
            . One run at a time.
          </>
        }
      >
        <div className="grid gap-5 lg:grid-cols-2">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="lt-endpoint">Endpoint</Label>
              <select
                id="lt-endpoint"
                className={saSelectClass}
                value={preset}
                onChange={(e) => setPreset(e.target.value)}
              >
                {ENDPOINT_PRESETS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground">
                {ENDPOINT_PRESETS.find((option) => option.value === preset)?.hint}
              </p>
            </div>
            {preset === CUSTOM_PRESET ? (
              <div className="space-y-2">
                <Label htmlFor="lt-custom-path">Custom path</Label>
                <Input
                  id="lt-custom-path"
                  value={customPath}
                  onChange={(e) => setCustomPath(e.target.value)}
                  placeholder="/api/v1/…"
                />
              </div>
            ) : null}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="lt-concurrency">Max concurrent users</Label>
              <Input
                id="lt-concurrency"
                type="number"
                min={1}
                max={400}
                value={maxConcurrency}
                onChange={(e) => setMaxConcurrency(Number(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lt-steps">Stairs (steps)</Label>
              <Input
                id="lt-steps"
                type="number"
                min={1}
                max={8}
                value={steps}
                onChange={(e) => setSteps(Number(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lt-seconds">Seconds per stair</Label>
              <Input
                id="lt-seconds"
                type="number"
                min={1}
                max={60}
                value={secondsPerStep}
                onChange={(e) => setSecondsPerStep(Number(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lt-target">p95 target (ms)</Label>
              <Input
                id="lt-target"
                type="number"
                min={100}
                max={5000}
                value={targetP95Ms}
                onChange={(e) => setTargetP95Ms(Number(e.target.value))}
              />
            </div>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-border/60 pt-4">
          <Button
            type="button"
            onClick={() => void onStart()}
            disabled={starting || running}
          >
            {starting ? <Loader2 className="animate-spin" aria-hidden /> : <Play aria-hidden />}
            Start load test
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={() => void onCancel()}
            disabled={!running}
          >
            <Square aria-hidden />
            Cancel
          </Button>
          <p className="ml-auto text-xs leading-relaxed text-muted-foreground">
            Self-test shares this JVM with the server — treat results as a lower bound. For a
            production number, repeat from an external runner (k6, Vegeta).
          </p>
        </div>
      </SaSection>

      {/* ── Live progress ─────────────────────────────────────────────────── */}
      {running && live ? (
        <SaSection title="Running" description={`${live.runId} — ${live.path}`}>
          <div className="space-y-4">
            <ProgressBar fraction={progressFraction} />
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-6">
              <StatCard icon={Activity} label="Stair" value={`${live.step} / ${live.steps}`} sub={`${live.concurrency} concurrent users`} />
              <StatCard icon={Zap} label="Live RPS" value={formatRps(live.liveRps)} />
              <StatCard icon={Gauge} label="Live p95" value={`${live.liveP95Ms} ms`} />
              <StatCard icon={TriangleAlert} label="Errors" value={String(live.errors)} />
              <StatCard icon={RefreshCw} label="Elapsed" value={`${live.elapsedSec}s`} sub={`${live.remainingSec}s left`} />
              <StatCard icon={Users} label="Target" value={String(live.maxConcurrency)} sub="users at the top stair" />
            </div>
          </div>
        </SaSection>
      ) : null}

      {/* ── Results ──────────────────────────────────────────────────────── */}
      {showRun ? (
        <SaSection
          title="Latest result"
          description={
            <>
              <span className="font-medium text-foreground">{showRun.runId}</span> · started{" "}
              {formatRunTime(showRun.startedAt)} · {showRun.durationSec}s · {showRun.path}
            </>
          }
        >
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Users className="size-3.5" aria-hidden />
                <p className="text-xs font-medium uppercase tracking-wide">Recommended capacity</p>
              </div>
              <p className="mt-2 font-heading text-3xl font-semibold tracking-tight text-foreground">
                {showRun.recommendedConcurrentUsers > 0 ? (
                  <>{showRun.recommendedConcurrentUsers} <span className="text-base font-medium text-muted-foreground">concurrent users</span></>
                ) : (
                  "Below smallest stair"
                )}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Highest stair within target (p95 ≤ {showRun.targetP95Ms} ms, &lt;2% errors)
              </p>
            </div>
            <StatCard icon={Zap} label="Peak throughput" value={`${formatRps(showRun.peakRps)} RPS`} sub="across all stairs" />
            <StatCard icon={Gauge} label="p95 at recommendation" value={`${showRun.recommendedP95Ms} ms`} sub="p50/p95/p99 per stair below" />
          </div>

          {showRun.notes.length > 0 ? (
            <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3">
              <ul className="space-y-1 text-sm text-muted-foreground">
                {showRun.notes.map((note, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="text-amber-500" aria-hidden>•</span>
                    <span>{note}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="mt-4">
            <StepTable steps={showRun.steps} targetP95Ms={showRun.targetP95Ms} />
          </div>
        </SaSection>
      ) : null}

      {/* ── History ──────────────────────────────────────────────────────── */}
      {status && status.history.length > 0 ? (
        <SaSection
          title="History"
          description="Recent runs on this instance — in-memory only, cleared on restart."
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-190 border-collapse text-sm">
              <thead>
                <tr className="border-b border-border/70 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="py-2 pr-3 font-medium">Run</th>
                  <th className="py-2 pr-3 font-medium">Started</th>
                  <th className="py-2 pr-3 font-medium">Path</th>
                  <th className="py-2 pr-3 font-medium">Max users</th>
                  <th className="py-2 pr-3 font-medium">Recommended</th>
                  <th className="py-2 pr-3 font-medium">Peak RPS</th>
                  <th className="py-2 pr-3 font-medium">p95</th>
                  <th className="py-2 font-medium">Duration</th>
                </tr>
              </thead>
              <tbody>
                {status.history.map((run) => (
                  <tr
                    key={run.runId}
                    className={cn(
                      "cursor-pointer border-b border-border/50 transition-colors hover:bg-muted/40",
                      selectedRunId === run.runId && "bg-muted/50",
                    )}
                    onClick={() => setSelectedRunId(run.runId)}
                  >
                    <td className="py-2 pr-3 font-medium text-foreground">{run.runId}</td>
                    <td className="py-2 pr-3">{formatRunTime(run.startedAt)}</td>
                    <td className="py-2 pr-3 text-muted-foreground">{run.path}</td>
                    <td className="py-2 pr-3 tabular-nums">{run.maxConcurrency}</td>
                    <td className="py-2 pr-3 tabular-nums">
                      {run.recommendedConcurrentUsers > 0 ? run.recommendedConcurrentUsers : "—"}
                    </td>
                    <td className="py-2 pr-3 tabular-nums">{formatRps(run.peakRps)}</td>
                    <td className="py-2 pr-3 tabular-nums">{run.recommendedP95Ms > 0 ? `${run.recommendedP95Ms} ms` : "—"}</td>
                    <td className="py-2 tabular-nums">{run.durationSec}s</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
            <History className="size-3.5" aria-hidden />
            Click a row to inspect its stair-by-stair breakdown.
          </p>
        </SaSection>
      ) : null}
    </div>
  );
}

function CapacityGrid({ capacity }: { capacity: LoadTestCapacity }) {
  return (
    <div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        <StatCard
          icon={Cpu}
          label="Tomcat workers"
          value={`${capacity.tomcatActiveThreads} / ${capacity.tomcatMaxThreads || "?"}`}
          sub={`${capacity.tomcatQueued} queued · ${capacity.tomcatOpenConnections} open connections`}
        />
        <StatCard
          icon={Database}
          label="DB pool"
          value={`${capacity.dbPoolActive} / ${capacity.dbPoolMax || "?"}`}
          sub={`${capacity.dbPoolIdle} idle · ${capacity.dbPoolAwaiting} awaiting`}
        />
        <StatCard
          icon={Activity}
          label="DB round-trip"
          value={capacity.dbRoundTripMs < 0 ? "—" : `${capacity.dbRoundTripMs} ms`}
          sub="SELECT 1 through the pool"
        />
        <StatCard
          icon={Zap}
          label="JVM heap"
          value={`${capacity.jvmHeapUsedMb} / ${capacity.jvmHeapMaxMb || "?"} MB`}
          sub={`process CPU ${formatPct(capacity.processCpuLoad)}`}
        />
        <StatCard
          icon={Users}
          label="WebSocket sessions"
          value={String(capacity.activeWsConnections)}
          sub={`max ${capacity.wsMaxPerUser} per user · ${capacity.wsMaxPerBusiness} per business`}
        />
        <StatCard
          icon={FlaskConical}
          label="Ticket store"
          value={capacity.ticketStore}
          sub={capacity.redisConfigured ? "Redis configured" : "No Redis — single instance only"}
        />
      </div>
      <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-border/70 bg-muted/25 px-4 py-3">
        <Gauge className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
        <p className="text-sm leading-relaxed text-muted-foreground">{capacity.hint}</p>
      </div>
      <p className="mt-3 flex items-start gap-2 text-xs leading-relaxed text-muted-foreground">
        <Activity className="mt-0.5 size-3.5 shrink-0" aria-hidden />
        <span>
          Scrape these gauges over time from Grafana at{" "}
          <code className="rounded bg-muted px-1 py-0.5 font-mono text-[11px]">/actuator/prometheus</code>{" "}
          (JVM, Tomcat, DB pool, WebSocket, load-test results) — super-admin JWT or the{" "}
          <code className="rounded bg-muted px-1 py-0.5 font-mono text-[11px]">APP_ACTUATOR_PROMETHEUS_TOKEN</code>{" "}
          bearer secret. See <code className="rounded bg-muted px-1 py-0.5 font-mono text-[11px]">DEPLOYMENT.md</code>.
        </span>
      </p>
    </div>
  );
}
