import { demoProductV1 } from "@/lib/contractlens/demo-data";

export function GET() {
  return new Response(JSON.stringify(demoProductV1), {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.contractlens.product+json",
    },
  });
}
