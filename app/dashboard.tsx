"use client";

import { formatDiff, type SchemaDiff } from "@/lib/contractlens";
import Link from "next/link";
import { useState } from "react";
import { EndpointConfigForm } from "./endpoint-config-form";
import { AcceptBaselineButton } from "./accept-baseline-button";
import {
  EndpointActionsProvider,
  type EndpointAction,
} from "./endpoint-actions";
import { addExplanationToRun, applySavedResult } from "./saved-result";
import { ResponseView } from "./response-view";
import { JsonPanel } from "./json-panel";
import { UiIcon } from "./ui-icon";
import type { DashboardProject } from "./dashboard-types";

function isSchemaDiff(value: unknown): value is SchemaDiff {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  if (!("type" in value) || !("path" in value) || !("severity" in value)) {
    return false;
  }

  const hasValidType =
    value.type === "MISSING_FIELD" ||
    value.type === "NEW_FIELD" ||
    value.type === "TYPE_CHANGED";

  if (!hasValidType) {
    return false;
  }

  if (typeof value.path !== "string") {
    return false;
  }

  const hasValidSeverity =
    value.severity === "breaking" || value.severity === "info";

  if (!hasValidSeverity) {
    return false;
  }

  if ("from" in value && typeof value.from !== "string") {
    return false;
  }

  if ("to" in value && typeof value.to !== "string") {
    return false;
  }

  if (
    value.type === "TYPE_CHANGED" &&
    (!("from" in value) || !("to" in value))
  ) {
    return false;
  }

  return true;
}

const melbourneDateTimeFormatter = new Intl.DateTimeFormat("en-AU", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
  timeZone: "Australia/Melbourne",
  timeZoneName: "short",
});

export function Dashboard({
  project,
  isHostedDemoMode,
  canRequestAiExplanation,
}: {
  project: DashboardProject;
  isHostedDemoMode: boolean;
  canRequestAiExplanation: boolean;
}) {
  const [activeEndpoint, setActiveEndpoint] = useState(
    project.endpoints[0] ?? null,
  );

  const [previousProject, setPreviousProject] = useState(project);
  if (previousProject !== project) {
    setPreviousProject(project);
    setActiveEndpoint(project.endpoints[0] ?? null);
  }

  const [explainError, setExplainError] = useState<string | null>(null);

  const [isExplaining, setIsExplaining] = useState(false);

  function handleSavedResult(action: EndpointAction, result: unknown) {
    if (activeEndpoint === null) return;
    setActiveEndpoint(applySavedResult(activeEndpoint, action, result));

    if (action === "run") {
      setExplainError(null);
    }
  }

  if (activeEndpoint === null) {
    return (
      <main className="min-h-screen bg-stone-50 px-6 py-16 text-stone-950">
        <div className="mx-auto flex w-full max-w-xl flex-col gap-6 rounded-lg border border-stone-200 bg-white p-8 shadow-sm">
          <h1 className="text-2xl font-semibold tracking-tight">
            Demo endpoint unavailable
          </h1>
          <p className="text-sm leading-6 text-stone-500">
            ContractLens loaded the Demo Project, but no endpoint was found.
            Please try again later.
          </p>
        </div>
      </main>
    );
  }

  const recentRuns = activeEndpoint.testRuns;
  const latestRun = recentRuns[0] ?? null;

  async function handleExplain() {
    setExplainError(null);
    if (latestRun === null) return;
    setIsExplaining(true);
    try {
      const response = await fetch(
        `/api/endpoints/${activeEndpoint.id}/run/${latestRun.id}/explain`,
        { method: "POST" },
      );

      if (!response.ok) {
        throw new Error("Explanation failed. Please try again.");
      }

      const result: unknown = await response.json();
      if (
        result === null ||
        typeof result !== "object" ||
        !("aiExplanation" in result) ||
        typeof result.aiExplanation !== "string" ||
        result.aiExplanation.trim().length === 0
      ) {
        throw new Error("Explanation failed. Please try again");
      }

      const explanation = result.aiExplanation;

      setActiveEndpoint((current) =>
        current === null
          ? current
          : addExplanationToRun(current, latestRun.id, explanation),
      );
    } catch {
      setExplainError("Explanation failed. Please try again.");
    } finally {
      setIsExplaining(false);
    }
  }

  const latestRunTargetUrl = latestRun?.targetUrl ?? null;

  const hasDifferentTarget =
    latestRunTargetUrl !== null && latestRunTargetUrl !== activeEndpoint.url;

  const persistedPanels = {
    baselineResponse: activeEndpoint.baselineExample ?? null,
    baselineSchema: activeEndpoint.baselineSchema ?? null,
    latestResponse: latestRun?.responseBody ?? null,
    latestSchema: latestRun?.detectedSchema ?? null,
  };

  const statusPresentation = {
    BASELINE_CREATED: {
      label: "Baseline created",
      colorClasses: "bg-blue-100 text-blue-700",
    },
    PASS: {
      label: "Pass",
      colorClasses: "bg-emerald-100 text-emerald-700",
    },
    FAIL: {
      label: "Fail",
      colorClasses: "bg-red-100 text-red-700",
    },
    ERROR: {
      label: "Error",
      colorClasses: "bg-amber-100 text-amber-700",
    },
  } as const;

  const latestStatusPresentation =
    latestRun === null ? null : statusPresentation[latestRun.status];

  const hasCompletedComparison =
    latestRun?.status === "PASS" || latestRun?.status === "FAIL";

  const latestDiffs =
    latestRun !== null &&
    hasCompletedComparison &&
    Array.isArray(latestRun.diff) &&
    latestRun.diff.every(isSchemaDiff)
      ? latestRun.diff
      : null;

  const latestDiffCount = latestDiffs === null ? null : latestDiffs.length;

  const breakingChangeCount =
    latestDiffs === null
      ? null
      : latestDiffs.filter((diff) => diff.severity === "breaking").length;

  const informationalChangeCount =
    latestDiffs === null
      ? null
      : latestDiffs.filter((diff) => diff.severity === "info").length;

  let unavailableReason: string | null = null;

  if (latestRun === null) {
    unavailableReason = "Not run yet";
  } else if (latestRun.status === "BASELINE_CREATED") {
    unavailableReason = "No comparison yet";
  } else if (latestRun.status === "ERROR") {
    unavailableReason = "Check failed";
  } else if (latestDiffCount === null) {
    unavailableReason = "Result unavailable";
  }

  const latestChanges =
    latestDiffs === null
      ? null
      : latestDiffs.map((diff) => ({
          diff,
          message: formatDiff([diff])[0],
        }));

  const resultTitle =
    latestRun === null
      ? "Ready for your first check"
      : latestRun.status === "FAIL"
        ? "Breaking changes detected"
        : latestRun.status === "PASS"
          ? "No breaking changes detected"
          : latestRun.status === "BASELINE_CREATED"
            ? "Your baseline is ready"
            : "The check could not complete";
  const resultTone =
    latestRun?.status === "FAIL"
      ? "fail"
      : latestRun?.status === "PASS"
        ? "pass"
        : latestRun?.status === "ERROR"
          ? "error"
          : "neutral";

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        Skip to comparison
      </a>
      <header className="app-header">
        <div className="header-inner">
          <Link
            href="/"
            prefetch={false}
            className="brand"
            aria-label="ContractLens home"
          >
            <span className="brand-icon">
              <UiIcon name="lens" width="25" height="25" />
            </span>
            ContractLens
          </Link>
          <span className="environment-badge">
            <span />
            {isHostedDemoMode ? "Live demo" : "Workspace"}
          </span>
          <nav aria-label="Main navigation">
            <a href="#how-it-works">How it works</a>
            <a
              href="https://github.com/phatpanda6/contractlens"
              target="_blank"
              rel="noreferrer"
              aria-label="Source code (opens in a new tab)"
            >
              <UiIcon name="github" />
              <span>Source code</span>
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
          </nav>
        </div>
      </header>

      <main id="main-content" className="workspace" tabIndex={-1}>
        <div className="intro">
          <div>
            <h1>
              Catch breaking API changes<span className="accent-dot">.</span>
            </h1>
            <p className="intro-description">
              A clear view of what changed. Before it breaks your frontend.
            </p>
          </div>
          <div className="workspace-meta">
            <span className="project-label">{project.name}</span>
            <span>GET endpoints · JSON responses</span>
          </div>
        </div>
        {isHostedDemoMode && (
          <p className="shared-notice">
            <UiIcon name="info" />
            Shared demo: endpoint, baseline, and history changes are visible to
            other visitors.
          </p>
        )}

        <EndpointActionsProvider onSavedResult={handleSavedResult}>
          <EndpointConfigForm
            endpointId={activeEndpoint.id}
            initialName={activeEndpoint.name}
            initialUrl={activeEndpoint.url}
            method={activeEndpoint.method}
            isHostedDemoMode={isHostedDemoMode}
          />

          <div className="workflow-guide" aria-label="Check workflow">
            <span>
              <b>01</b> Capture a baseline
            </span>
            <UiIcon name="arrow" />
            <span>
              <b>02</b> Run a check
            </span>
            <UiIcon name="arrow" />
            <span>
              <b>03</b> Review changes
            </span>
          </div>

          <section
            className={`comparison-card result-${resultTone}`}
            aria-labelledby="comparison-heading"
          >
            <p className="sr-only" role="status" aria-atomic="true">
              {latestRun === null
                ? "No recorded check yet."
                : `Latest recorded check: ${resultTitle}. ${breakingChangeCount === null ? "" : `${breakingChangeCount} breaking changes and ${informationalChangeCount} informational changes.`} Target: ${latestRunTargetUrl ?? "not recorded"}.`}
            </p>
            <div className="result-header">
              <div className="result-main">
                <span className="result-icon">
                  <UiIcon
                    name={
                      resultTone === "fail"
                        ? "close"
                        : resultTone === "pass"
                          ? "check"
                          : "info"
                    }
                    width="22"
                    height="22"
                  />
                </span>
                <div>
                  <p className="eyebrow">Latest recorded check</p>
                  <h2 id="comparison-heading">{resultTitle}</h2>
                  {breakingChangeCount !== null &&
                  informationalChangeCount !== null ? (
                    <p className="result-counts">
                      <span>
                        <strong>{breakingChangeCount}</strong> breaking{" "}
                        {breakingChangeCount === 1 ? "change" : "changes"}
                      </span>
                      <span className="count-divider">/</span>
                      <span>
                        <strong>{informationalChangeCount}</strong>{" "}
                        informational{" "}
                        {informationalChangeCount === 1 ? "change" : "changes"}
                      </span>
                    </p>
                  ) : (
                    <p className="result-description">
                      {latestRun?.status === "BASELINE_CREATED"
                        ? "Future checks will compare against this saved response."
                        : latestRun?.status === "ERROR"
                          ? "Resolve the error below, then run another check."
                          : "Run a check to compare a live response with your saved baseline."}
                    </p>
                  )}
                </div>
              </div>
              <span
                className={`status-badge ${latestStatusPresentation?.colorClasses ?? "bg-stone-100 text-stone-700"}`}
              >
                {latestStatusPresentation?.label ?? "Not run yet"}
              </span>
            </div>
            {latestRun !== null && (
              <div className="result-metadata">
                <span>
                  Recorded target{" "}
                  <code>
                    {latestRunTargetUrl ?? "Not recorded for this older check"}
                  </code>
                </span>
                <time dateTime={latestRun.createdAt.toISOString()}>
                  <UiIcon name="clock" />
                  {melbourneDateTimeFormatter.format(latestRun.createdAt)}
                </time>
              </div>
            )}

            {hasDifferentTarget && (
              <p role="status" className="target-warning">
                <UiIcon name="info" />
                <span>
                  This result was recorded for <code>{latestRunTargetUrl}</code>
                  . The current target is <code>{activeEndpoint.url}</code>. Run
                  a new check to update the result.
                </span>
              </p>
            )}

            <section
              className="changes-section"
              aria-labelledby="changes-heading"
            >
              <a className="mobile-evidence-link" href="#response-heading">
                View responses <UiIcon name="arrow" />
              </a>
              <div className="changes-heading">
                <h3 id="changes-heading">Detected changes</h3>
                <span>
                  {latestDiffCount === null
                    ? "Awaiting comparison"
                    : `${latestDiffCount} ${latestDiffCount === 1 ? "change" : "changes"} found`}
                </span>
                {canRequestAiExplanation &&
                  latestRun?.status === "FAIL" &&
                  !Boolean(latestRun.aiExplanation?.trim()) && (
                    <button
                      type="button"
                      onClick={handleExplain}
                      disabled={isExplaining}
                      aria-busy={isExplaining}
                      className="button button-secondary"
                    >
                      {isExplaining ? "Explaining..." : "Explain this result"}
                    </button>
                  )}
                {explainError !== null && <p role="alert">{explainError}</p>}
              </div>
              {latestChanges === null ? (
                <div className="comparison-empty">
                  <UiIcon name="info" />
                  <p>
                    {latestRun?.status === "ERROR"
                      ? (latestRun.errorMessage ??
                        "The latest check failed before a response could be saved.")
                      : unavailableReason === "Result unavailable"
                        ? "The saved comparison could not be read. Run a new check."
                        : latestRun?.status === "BASELINE_CREATED"
                          ? "Baseline captured. Choose the changed response and run a check to see the difference."
                          : "Your first check starts here. Use the original response to establish a passing result, then try the changed response."}
                  </p>
                </div>
              ) : latestChanges.length === 0 ? (
                <div className="comparison-empty">
                  <UiIcon name="check" />
                  <p>No schema changes detected.</p>
                </div>
              ) : (
                <table className="diff-table">
                  <caption className="sr-only">
                    Field changes in the latest recorded check
                  </caption>
                  <thead>
                    <tr>
                      <th scope="col">Field</th>
                      <th scope="col">Baseline at check</th>
                      <th scope="col">Latest at check</th>
                      <th scope="col">Impact</th>
                    </tr>
                  </thead>
                  <tbody>
                    {latestChanges.map(({ diff, message }) => (
                      <tr key={`${diff.type}-${diff.path}`}>
                        <th scope="row">
                          <code>{diff.path || "$"}</code>
                          <span className="sr-only">{message}</span>
                        </th>
                        <td data-label="Baseline">
                          <code
                            className={
                              diff.type === "NEW_FIELD" ? "value-absent" : ""
                            }
                          >
                            {diff.type === "NEW_FIELD"
                              ? "Absent"
                              : (diff.from ?? "Present")}
                          </code>
                        </td>
                        <td data-label="Latest">
                          <code
                            className={`value-chip ${diff.severity === "breaking" ? "value-breaking" : "value-info"}`}
                          >
                            {diff.type === "MISSING_FIELD"
                              ? "Missing"
                              : (diff.to ?? "Added")}
                          </code>
                        </td>
                        <td data-label="Impact">
                          <span
                            className={`severity-badge ${diff.severity === "breaking" ? "severity-breaking" : "severity-info"}`}
                          >
                            <span />
                            {diff.severity === "breaking"
                              ? "Breaking"
                              : "Informational"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </section>

            {latestRun?.status === "FAIL" &&
              Boolean(latestRun.aiExplanation?.trim()) && (
                <section
                  className="ai-explanation-section"
                  aria-labelledby="ai-explanation-heading"
                >
                  <h3 id="ai-explanation-heading">AI explanation</h3>
                  <p>{latestRun.aiExplanation}</p>
                </section>
              )}

            <ResponseView
              responses={
                <>
                  <JsonPanel
                    title="Baseline response"
                    label="SAVED CONTRACT"
                    value={persistedPanels.baselineResponse}
                    emptyMessage="No baseline response captured yet. Run a check to capture one."
                  />
                  <JsonPanel
                    title="Latest response"
                    label="RECORDED RESPONSE"
                    value={persistedPanels.latestResponse}
                    emptyMessage={
                      latestRun?.status === "ERROR"
                        ? (latestRun.errorMessage ??
                          "The latest check failed before a response could be saved.")
                        : "No latest response available yet."
                    }
                  />
                </>
              }
              schemas={
                <>
                  <JsonPanel
                    title="Baseline schema"
                    label="SAVED CONTRACT"
                    value={persistedPanels.baselineSchema}
                    emptyMessage="No baseline schema captured yet."
                  />
                  <JsonPanel
                    title="Latest schema"
                    label="RECORDED SCHEMA"
                    value={persistedPanels.latestSchema}
                    emptyMessage={
                      latestRun?.status === "ERROR"
                        ? (latestRun.errorMessage ??
                          "The latest check failed before a schema could be detected.")
                        : "No latest schema available yet."
                    }
                  />
                </>
              }
            />

            {latestRun !== null &&
              latestChanges !== null &&
              latestChanges.length > 0 && (
                <AcceptBaselineButton
                  key={latestRun.id}
                  endpointId={activeEndpoint.id}
                  testRunId={latestRun.id}
                  hasDifferentTarget={hasDifferentTarget}
                />
              )}
          </section>
        </EndpointActionsProvider>

        <section className="history-card" aria-labelledby="history-heading">
          <div className="section-toolbar">
            <h2 id="history-heading">
              <UiIcon name="clock" />
              Recent checks
            </h2>
            <span className="section-caption">
              Last {recentRuns.length} of your saved checks
            </span>
          </div>
          {recentRuns.length === 0 ? (
            <p className="history-empty">
              No checks have been run yet. Your results will appear here.
            </p>
          ) : (
            <ol className="history-list">
              {recentRuns.map((run) => {
                const presentation = statusPresentation[run.status];
                const diffs =
                  Array.isArray(run.diff) && run.diff.every(isSchemaDiff)
                    ? run.diff
                    : null;
                const breaking = diffs?.filter(
                  (diff) => diff.severity === "breaking",
                ).length;
                const info = diffs?.filter(
                  (diff) => diff.severity === "info",
                ).length;
                return (
                  <li key={run.id}>
                    <span
                      className={`status-badge ${presentation.colorClasses}`}
                    >
                      {presentation.label}
                    </span>
                    <code className="history-target">
                      {run.targetUrl ?? "Target not recorded"}
                    </code>
                    <span className="history-description">
                      {run.status === "ERROR"
                        ? (run.errorMessage ?? "Check could not complete")
                        : run.status === "BASELINE_CREATED"
                          ? "First response saved as the contract"
                          : diffs === null
                            ? "Comparison unavailable"
                            : diffs.length === 0
                              ? "No schema changes"
                              : `${breaking} breaking · ${info} informational`}
                    </span>
                    <time dateTime={run.createdAt.toISOString()}>
                      {melbourneDateTimeFormatter.format(run.createdAt)}
                    </time>
                  </li>
                );
              })}
            </ol>
          )}
        </section>

        <details id="how-it-works" className="how-it-works">
          <summary>
            New to ContractLens? <span>Here’s the two-minute workflow</span>
            <UiIcon name="arrow" />
          </summary>
          <div className="how-it-works-body">
            <div>
              <b>01 / Establish your baseline</b>
              {isHostedDemoMode ? (
                <p>
                  Choose Original response v1 and run a check. If this shared
                  demo has a different baseline, review and accept v1, then
                  check again.
                </p>
              ) : (
                <p>
                  Enter a public HTTPS JSON endpoint, or use Original response
                  v1 as a practice example, then run the first check to capture
                  its baseline.
                </p>
              )}
            </div>
            <div>
              <b>02 / See what breaks</b>
              {isHostedDemoMode ? (
                <p>
                  Choose Changed response v2 and run a check. Inspect removed
                  fields, added fields, and type changes alongside the response.
                </p>
              ) : (
                <p>
                  Run the saved endpoint again after its response changes, or
                  choose Changed response v2 when practicing with the included
                  example. Inspect the detected field and type changes alongside
                  the response.
                </p>
              )}
            </div>
            <div>
              <b>03 / Accept intentionally</b>
              <p>
                If the change is expected, accept the recorded response as your
                new baseline. Run again to verify. Previous results stay in
                history.
              </p>
            </div>
          </div>
        </details>
        <footer className="workspace-footer">
          <span>
            <span className="footer-dot" />
            Deterministic checks. Explainable results.
          </span>
          <p>
            PASS means no breaking changes detected within the supported schema
            model. Arrays use the first item.
          </p>
        </footer>
      </main>
    </div>
  );
}
