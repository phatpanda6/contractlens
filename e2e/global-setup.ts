import { execFileSync } from "node:child_process";

export default function globalSetup() {
  execFileSync("npx", ["prisma", "migrate", "reset", "--force"], {
    stdio: "inherit",
  });

  execFileSync("npm", ["run", "db:seed"], {
    stdio: "inherit",
  });
}
