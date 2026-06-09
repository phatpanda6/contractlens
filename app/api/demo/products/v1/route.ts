import { demoProductV1 } from "@/lib/contractlens/demo-data";

export function GET() {
  return Response.json(demoProductV1);
}
