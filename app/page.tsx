import { prisma } from "@/lib/prisma";
import { connection } from "next/server";
import { Dashboard } from "./dashboard";

export default async function Home() {
  await connection();

  const isHostedDemoMode = process.env.HOSTED_DEMO_MODE === "true";

  const canRequestAiExplanation =
    process.env.NODE_ENV === "development" && !isHostedDemoMode;

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
        take: 1,
        select: {
          id: true,
          name: true,
          method: true,
          url: true,
          baselineSchema: true,
          baselineExample: true,
          baselineSourceUrl: true,
          testRuns: {
            orderBy: [{ createdAt: "desc" }, { id: "desc" }],
            take: 5,
            select: {
              id: true,
              targetUrl: true,
              status: true,
              responseBody: true,
              detectedSchema: true,
              createdAt: true,
              diff: true,
              errorMessage: true,
              aiExplanation: true,
            },
          },
        },
      },
    },
  });

  if (project === null) {
    return (
      <main className="min-h-screen bg-stone-50 px-6 py-16 text-stone-950">
        <div className="mx-auto flex w-full max-w-xl flex-col gap-6 rounded-lg border border-stone-200 bg-white p-8 shadow-sm">
          <h1 className="text-2xl font-semibold tracking-tight">
            Demo data unavailable
          </h1>
          <p className="text-sm leading-6 text-stone-500">
            ContractLens loaded, but the seeded demo project could not be found.
            Please try again later.
          </p>
        </div>
      </main>
    );
  }

  // Only the latest run needs full JSON in the browser. History uses summaries,
  // so avoid transferring large response bodies for the other four runs.
  const dashboardProject = {
    ...project,
    endpoints: project.endpoints.map((endpoint) => ({
      ...endpoint,
      testRuns: endpoint.testRuns.map((run, index) => ({
        ...run,
        responseBody: index === 0 ? run.responseBody : null,
        detectedSchema: index === 0 ? run.detectedSchema : null,
      })),
    })),
  };

  return (
    <Dashboard
      project={dashboardProject}
      isHostedDemoMode={isHostedDemoMode}
      canRequestAiExplanation={canRequestAiExplanation}
    />
  );
}
