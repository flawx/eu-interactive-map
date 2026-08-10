import { auditEuBodiesAgencies } from "../lib/europe/euBodiesAgencies";

function main() {
  const audit = auditEuBodiesAgencies();
  console.log("[eu-agencies audit]");
  console.log(`entities=${audit.total}`);
  console.log(`inScope=${audit.inScope}`);
  console.log(`outsideScope=${audit.outsideScope.join(",") || "none"}`);
  console.log(
    `missingCoordinates=${audit.missingCoordinates.join(",") || "none"}`,
  );
  console.log(`duplicateIds=${audit.duplicateIds.join(",") || "none"}`);
}

main();
