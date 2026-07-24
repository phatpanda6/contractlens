import { demoProductV1 } from "@/lib/contractlens/demo-data";

export async function GET() {
  await new Promise((resolve) => setTimeout(resolve, 6_000));

  return Response.json(demoProductV1);
}
