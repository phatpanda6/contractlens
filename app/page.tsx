import { formatDiff, type SchemaDiff } from "@/lib/contractlens";
import { prisma } from "@/lib/prisma";
import { connection } from "next/server";
import { EndpointConfigForm } from "./endpoint-config-form";

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

export default async function Home() {
  await connection();

  const project = await prisma.project.findFirst({
    where: {
      name: "Demo Project",
    },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    select: {
      id: true,
      name: true,
      endpoints: {
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        select: {
          id: true,
          name: true,
          method: true,
          url: true,
          baselineSchema: true,
          baselineExample: true,
          testRuns: {
            orderBy: [{ createdAt: "desc" }, { id: "desc" }],
            take: 5,
            select: {
              id: true,
              status: true,
              responseBody: true,
              detectedSchema: true,
              createdAt: true,
              diff: true,
              errorMessage: true,
            },
          },
        },
      },
    },
  });

  const activeEndpoint = project?.endpoints[0] ?? null;
  const recentRuns = activeEndpoint?.testRuns ?? [];
  const latestRun = recentRuns[0] ?? null;

  const persistedPanels = {
    baselineResponse: activeEndpoint?.baselineExample ?? null,
    baselineSchema: activeEndpoint?.baselineSchema ?? null,
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

  const latestMessages = latestDiffs === null ? null : formatDiff(latestDiffs);

  return (
    <main className="min-h-screen bg-stone-50 px-6 py-10 text-stone-950">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <header className="flex flex-col gap-4 border-b border-stone-200 pb-8">
          <div>
            <p className="text-sm font-medium uppercase tracking-wide text-emerald-700">
              ContractLens demo
            </p>
            <h1 className="mt-2 text-4xl font-semibold tracking-tight">
              API response drift check
            </h1>
          </div>

          <p className="max-w-2xl text-base leading-7 text-stone-600">
            This demo compares a saved baseline response against a later API
            response, then shows the schema changes detected by the core engine.
          </p>
        </header>

        <section className="grid gap-4 md:grid-cols-4">
          <div className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm md:col-span-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-medium text-stone-500">
                Configured endpoints
              </p>

              {project !== null && (
                <p className="text-xs text-stone-500">
                  Project:
                  <span className="ml-1 font-medium text-stone-700">
                    {project.name}
                  </span>
                </p>
              )}
            </div>

            {project === null ? (
              <p className="mt-4 text-sm text-stone-500">
                Demo project not found.
              </p>
            ) : project.endpoints.length === 0 ? (
              <p className="mt-4 text-sm text-stone-500">
                No endpoints configured yet.
              </p>
            ) : (
              <div className="mt-4 space-y-4">
                {project.endpoints.map((savedEndpoint) => (
                  <div
                    className="space-y-2 border-t border-stone-100 pt-4 first:border-t-0 first:pt-0"
                    key={savedEndpoint.id}
                  >
                    <p className="font-semibold text-stone-900">
                      {savedEndpoint.name}
                    </p>

                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded bg-emerald-100 px-2 py-1 font-mono text-xs font-semibold uppercase text-emerald-700">
                        {savedEndpoint.method}
                      </span>
                      <code className="break-all text-sm text-stone-700">
                        {savedEndpoint.url}
                      </code>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeEndpoint !== null && (
              <EndpointConfigForm
                endpointId={activeEndpoint.id}
                initialName={activeEndpoint.name}
                initialUrl={activeEndpoint.url}
              />
            )}
          </div>

          <div className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-stone-500">Status</p>
            <p
              className={`mt-3 inline-flex rounded-full px-3 py-1 text-sm font-semibold ${
                latestStatusPresentation === null
                  ? "bg-stone-100 text-stone-700"
                  : latestStatusPresentation.colorClasses
              }`}
            >
              {latestStatusPresentation === null
                ? "Not run yet"
                : latestStatusPresentation.label}
            </p>
          </div>

          <div className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-stone-500">Changes Found</p>
            <p className="mt-3 text-2xl font-semibold">
              {latestDiffCount === null ? "—" : latestDiffCount}
            </p>
            {unavailableReason !== null && (
              <p className="mt-1 text-xs text-stone-500">{unavailableReason}</p>
            )}
          </div>
        </section>

        <section className="rounded-lg border border-stone-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold">Detected changes</h2>
          <p className="mt-1 text-sm text-stone-500">
            Breaking changes are marked by the deterministic schema engine.
          </p>
          {latestMessages === null ? (
            <p className="mt-6 text-sm text-stone-500">
              {unavailableReason ?? "Comparison unavailable."}
            </p>
          ) : latestMessages.length === 0 ? (
            <p className="mt-6 text-sm text-stone-500">
              No schema changes detected.
            </p>
          ) : (
            <ul className="mt-6 space-y-3">
              {latestMessages.map((message) => (
                <li
                  className="rounded-md border border-stone-200 bg-stone-50 px-4 py-3 font-mono text-sm"
                  key={message}
                >
                  {message}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-lg border border-stone-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold">Recent checks</h2>

          <p className="mt-1 text-sm text-stone-500">
            The five most recent persisted checks for this endpoint.
          </p>

          {recentRuns.length === 0 ? (
            <p className="mt-6 text-sm text-stone-500">
              No checks have been run yet.
            </p>
          ) : (
            <ol className="mt-6 divide-y divide-stone-100">
              {recentRuns.map((run) => {
                const runStatusPresentation = statusPresentation[run.status];

                return (
                  <li
                    className="flex flex-col gap-2 py-4 first:pt-0 last:pb-0"
                    key={run.id}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-sm font-semibold ${runStatusPresentation.colorClasses}`}
                      >
                        {runStatusPresentation.label}
                      </span>
                      <time
                        className="text-sm text-stone-500"
                        dateTime={run.createdAt.toISOString()}
                      >
                        {melbourneDateTimeFormatter.format(run.createdAt)}
                      </time>
                    </div>

                    {run.status === "ERROR" && (
                      <p className="text-sm text-red-700">
                        {run.errorMessage ??
                          "The check failed, but no error details were saved."}
                      </p>
                    )}
                  </li>
                );
              })}
            </ol>
          )}
        </section>

        <section className="flex flex-col gap-4">
          <div>
            <h2 className="text-xl font-semibold">API responses</h2>
            <p className="mt-1 text-sm text-stone-500">
              Raw response examples used for the demo comparison.
            </p>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-lg border border-stone-200 bg-white p-6 shadow-sm">
              <h3 className="text-xl font-semibold">Baseline response</h3>
              {persistedPanels.baselineResponse === null ? (
                <p className="mt-4 text-sm text-stone-500">
                  No baseline response captured yet.
                </p>
              ) : (
                <pre className="mt-4 overflow-x-auto rounded-md bg-stone-950 p-4 text-sm leading-6 text-stone-100">
                  {JSON.stringify(persistedPanels.baselineResponse, null, 2)}
                </pre>
              )}
            </div>

            <div className="rounded-lg border border-stone-200 bg-white p-6 shadow-sm">
              <h3 className="text-xl font-semibold">Latest response</h3>
              {persistedPanels.latestResponse === null ? (
                <p className="mt-4 text-sm text-stone-500">
                  {latestRun?.status === "ERROR"
                    ? (latestRun.errorMessage ??
                      "The latest check failed before a response could be saved.")
                    : "No latest response available yet."}
                </p>
              ) : (
                <pre className="mt-4 overflow-x-auto rounded-md bg-stone-950 p-4 text-sm leading-6 text-stone-100">
                  {JSON.stringify(persistedPanels.latestResponse, null, 2)}
                </pre>
              )}
            </div>
          </div>
        </section>

        <section className="flex flex-col gap-4">
          <div>
            <h2 className="text-xl font-semibold">Inferred schemas</h2>
            <p className="mt-1 text-sm text-stone-500">
              Simplified schema shapes generated from each response.
            </p>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-lg border border-stone-200 bg-white p-6 shadow-sm">
              <h3 className="text-xl font-semibold">Baseline schema</h3>
              {persistedPanels.baselineSchema === null ? (
                <p className="mt-4 text-sm text-stone-500">
                  No baseline schema captured yet.
                </p>
              ) : (
                <pre className="mt-4 overflow-x-auto rounded-md bg-stone-950 p-4 text-sm leading-6 text-stone-100">
                  {JSON.stringify(persistedPanels.baselineSchema, null, 2)}
                </pre>
              )}
            </div>

            <div className="rounded-lg border border-stone-200 bg-white p-6 shadow-sm">
              <h3 className="text-xl font-semibold">Latest schema</h3>
              {persistedPanels.latestSchema === null ? (
                <p className="mt-4 text-sm text-stone-500">
                  {latestRun?.status === "ERROR"
                    ? (latestRun.errorMessage ??
                      "The latest check failed before a schema could be detected.")
                    : "No latest schema available yet."}
                </p>
              ) : (
                <pre className="mt-4 overflow-x-auto rounded-md bg-stone-950 p-4 text-sm leading-6 text-stone-100">
                  {JSON.stringify(persistedPanels.latestSchema, null, 2)}
                </pre>
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
