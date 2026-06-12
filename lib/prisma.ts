import { PrismaClient } from "./generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is not set");
}

const schema = new URL(databaseUrl).searchParams.get("schema") ?? "public";
const adapter = new PrismaPg({ connectionString: databaseUrl }, { schema });

export const prisma = new PrismaClient({ adapter });
