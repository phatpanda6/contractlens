import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { buildSkillBundle, SKILL_BUNDLE_PATH } from "./skill-bundle";

// Entry point for `npm run build:skill`: writes the bundled checker into the
// skill folder. Run it after changing the checker or the CLI code.
buildSkillBundle()
  .then((text) => {
    mkdirSync(path.dirname(SKILL_BUNDLE_PATH), { recursive: true });
    writeFileSync(SKILL_BUNDLE_PATH, text);
    console.log(`Wrote ${SKILL_BUNDLE_PATH}`);
  })
  .catch((error) => {
    console.error(String(error));
    process.exitCode = 1;
  });
