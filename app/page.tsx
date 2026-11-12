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
      <main className="workspace message-workspace">
        <div className="message-card">
          <h1>Demo data unavailable</h1>
          <p>
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
