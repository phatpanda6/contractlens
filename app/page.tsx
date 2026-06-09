import { compareSchemas, formatDiff, inferSchema } from "@/lib/contractlens";
import { demoProductV1, demoProductV2 } from "@/lib/contractlens/demo-data";

export default function Home() {
  const endpoint = {
    baseline: "GET /api/demo/products/v1",
    latest: "GET /api/demo/products/v2",
  };

  const baselineResponse = demoProductV1;
  const latestResponse = demoProductV2;

  const baselineSchema = inferSchema(baselineResponse);
  const latestSchema = inferSchema(latestResponse);

  const diffs = compareSchemas(baselineSchema, latestSchema);
  const messages = formatDiff(diffs);

  const hasBreakingChanges = diffs.some((diff) => diff.severity === "breaking");
  const status = hasBreakingChanges ? "Fail" : "Pass";

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

        <section className="grid gap-4 md:grid-cols-3">
          <div className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-stone-500">Demo endpoints</p>
            <div className="mt-3 space-y-2 font-mono text-sm text-stone-900">
              <p>{endpoint.baseline}</p>
              <p>{endpoint.latest}</p>
            </div>
          </div>

          <div className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-stone-500">Status</p>
            <p
              className={`mt-3 inline-flex rounded-full px-3 py-1 text-sm font-semibold ${
                hasBreakingChanges
                  ? "bg-red-100 text-red-700"
                  : "bg-emerald-100 text-emerald-700"
              }`}
            >
              {status}
            </p>
          </div>

          <div className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-stone-500">Changes Found</p>
            <p className="mt-3 text-2xl font-semibold">{diffs.length}</p>
          </div>
        </section>

        <section className="rounded-lg border border-stone-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold">Detected changes</h2>
          <p className="mt-1 text-sm text-stone-500">
            Breaking changes are marked by the deterministic schema engine.
          </p>

          <ul className="mt-6 space-y-3">
            {messages.map((message) => (
              <li
                className="rounded-md border border-stone-200 bg-stone-50 px-4 py-3 font-mono text-sm"
                key={message}
              >
                {message}
              </li>
            ))}
          </ul>
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
              <pre className="mt-4 overflow-x-auto rounded-md bg-stone-950 p-4 text-sm leading-6 text-stone-100">
                {JSON.stringify(baselineResponse, null, 2)}
              </pre>
            </div>

            <div className="rounded-lg border border-stone-200 bg-white p-6 shadow-sm">
              <h3 className="text-xl font-semibold">Latest response</h3>
              <pre className="mt-4 overflow-x-auto rounded-md bg-stone-950 p-4 text-sm leading-6 text-stone-100">
                {JSON.stringify(latestResponse, null, 2)}
              </pre>
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
              <pre className="mt-4 overflow-x-auto rounded-md bg-stone-950 p-4 text-sm leading-6 text-stone-100">
                {JSON.stringify(baselineSchema, null, 2)}
              </pre>
            </div>

            <div className="rounded-lg border border-stone-200 bg-white p-6 shadow-sm">
              <h3 className="text-xl font-semibold">Latest schema</h3>
              <pre className="mt-4 overflow-x-auto rounded-md bg-stone-950 p-4 text-sm leading-6 text-stone-100">
                {JSON.stringify(latestSchema, null, 2)}
              </pre>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
