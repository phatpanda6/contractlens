import { demoProductV2 } from "@/lib/contractlens/demo-data";

export function GET() {
  return Response.json(demoProductV2);
}
