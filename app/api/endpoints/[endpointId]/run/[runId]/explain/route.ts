import { prisma } from "@/lib/prisma";
import { explainDiffs } from "@/lib/ai/explain-diffs";

export async function POST(
  _request: Request,
  context: { params: Promise<{ endpointId: string; runId: string }> },
) {
  if (
    process.env.HOSTED_DEMO_MODE === "true" ||
    process.env.NODE_ENV !== "development"
  ) {
    return Response.json(
      { error: "AI explanation feature only available in local versions" },
      { status: 404 },
    );
  }

  const { endpointId, runId } = await context.params;

  const run = await prisma.testRun.findFirst({
    where: { id: runId, endpointId },
    select: { id: true, status: true, diff: true },
  });

  if (run === null) {
    return Response.json({ error: "Run not found" }, { status: 404 });
  }

  if (run.status !== "FAIL") {
    return Response.json(
      { error: "Only FAIL runs can be explained" },
      { status: 409 },
    );
  }

  let explanation: string;

  try {
    explanation = await explainDiffs(run.diff);
  } catch {
    return Response.json(
      { error: "Explanation failed. Please try again" },
      { status: 502 },
    );
  }

  if (typeof explanation !== "string" || explanation.trim().length === 0) {
    return Response.json(
      { error: "Explanation failed. Please try again" },
      { status: 502 },
    );
  }

  const savedRun = await prisma.testRun.update({
    where: { id: runId },
    data: { aiExplanation: explanation },
    select: { aiExplanation: true },
  });

  return Response.json(savedRun);
}
