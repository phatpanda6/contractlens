import "dotenv/config";

import { demoProductV1 } from "@/lib/contractlens/demo-data";
import { prisma } from "@/lib/prisma";
import { inferSchema } from "@/lib/contractlens";

async function main() {
  const baselineExample = demoProductV1;
  const baselineSchema = inferSchema(baselineExample);
  const projectName = "Demo Project";
  const endpointUrl = "/api/demo/products/v1";

  const existingProject = await prisma.project.findFirst({
    where: {
      name: projectName,
    },
  });

  const project =
    existingProject ??
    (await prisma.project.create({
      data: {
        name: projectName,
      },
    }));

  const existingEndpoint = await prisma.endpoint.findFirst({
    where: {
      projectId: project.id,
      url: endpointUrl,
    },
  });

  if (existingEndpoint) {
    await prisma.endpoint.update({
      where: {
        id: existingEndpoint.id,
      },
      data: {
        name: "Demo Products API",
        method: "GET",
        baselineSchema,
        baselineExample,
      },
    });
  } else {
    await prisma.endpoint.create({
      data: {
        projectId: project.id,
        name: "Demo Products API",
        method: "GET",
        url: endpointUrl,
        baselineSchema,
        baselineExample,
      },
    });
  }

  console.log("Seed data is ready");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
