import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dir = path.join(__dirname, "..", "lib", "i18n", "messages");

const expectedEn = {
  opsTabSituation: "Situation",
  opsTabSafety: "Safety",
  opsTabTimeline: "Timeline",
  opsTabSourcesCommunity: "Sources and community",
  opsCauseUnconfirmed: "Cause not confirmed",
  opsLastKnownArea: "Last known area",
  opsDeployedResources: "Deployed resources",
  opsResourcesUnknown: "Deployed resources not communicated",
  opsEvacuationOrder: "Evacuation order",
  opsSafetyInstruction: "Official instruction",
  opsGatheringPoint: "Gathering point",
  opsShelter: "Shelter",
  opsReceptionCenter: "Reception center",
  opsRoadClosure: "Road closure",
  opsOfficialSource: "Official source",
  opsVerifiedInfo: "Verified information",
  opsUnverifiedInfo: "Unverified information",
  opsDisputedInfo: "Disputed information",
  opsNoOfficialInstructions: "No official instructions recorded at this time.",
  opsSatelliteEstimate: "Satellite estimate",
  opsGdacsDeclared: "Declared by GDACS",
  opsOfficialBadge: "Official",
  opsLastVerification: "Last verification",
  opsCommunityUnverified: "Unverified community information",
  opsOfficialSources: "Official sources",
  opsMedia: "Media",
  opsCommunity: "Community",
  opsAreaFirms24h: "Satellite-detected area — last 24 hours",
  opsAreaFirms7d: "Cumulative satellite-detected area — 7 days",
  opsAreaEffis: "Burned area perimeter estimated by EFFIS",
  opsAreaGdacs: "Area reported by GDACS",
  opsLoading: "Loading operational details…",
  opsUnavailable: "Detailed operational information is temporarily unavailable.",
  opsCause: "Cause",
  opsCurrentSituation: "Current situation",
  opsLastUpdate: "Last update",
  opsActiveEvacuation: "Active evacuation",
  opsExpires: "Expires",
  opsFocusOnMap: "Show on map",
  opsOpenSource: "Open official publication",
  opsEmptyTimeline: "No chronological events recorded yet.",
  opsStatus: "Status",
};

const expectedFr = {
  opsTabSituation: "Situation",
  opsTabSafety: "Sécurité",
  opsTabTimeline: "Chronologie",
  opsTabSourcesCommunity: "Sources et communauté",
  opsCauseUnconfirmed: "Cause non confirmée",
  opsLastKnownArea: "Dernière superficie connue",
  opsDeployedResources: "Moyens déployés",
  opsResourcesUnknown: "Moyens déployés non communiqués",
  opsEvacuationOrder: "Ordre d’évacuation",
  opsSafetyInstruction: "Consigne officielle",
  opsGatheringPoint: "Zone de rassemblement",
  opsShelter: "Refuge",
  opsReceptionCenter: "Centre d’accueil",
  opsRoadClosure: "Route fermée",
  opsOfficialSource: "Source officielle",
  opsVerifiedInfo: "Information vérifiée",
  opsUnverifiedInfo: "Information non vérifiée",
  opsDisputedInfo: "Information contestée",
  opsNoOfficialInstructions: "Aucune consigne officielle enregistrée actuellement.",
  opsSatelliteEstimate: "Estimation satellite",
  opsGdacsDeclared: "Déclaré par GDACS",
  opsOfficialBadge: "Officiel",
  opsLastVerification: "Dernière vérification",
  opsCommunityUnverified: "Information communautaire non vérifiée",
  opsOfficialSources: "Sources officielles",
  opsMedia: "Médias",
  opsCommunity: "Communauté",
  opsAreaFirms24h: "Surface satellite détectée — dernières 24 h",
  opsAreaFirms7d: "Surface satellite détectée cumulée — 7 jours",
  opsAreaEffis: "Périmètre brûlé estimé par EFFIS",
  opsAreaGdacs: "Surface déclarée par GDACS",
  opsLoading: "Chargement des détails opérationnels…",
  opsUnavailable: "Les informations opérationnelles détaillées sont temporairement indisponibles.",
  opsCause: "Cause",
  opsCurrentSituation: "Situation actuelle",
  opsLastUpdate: "Dernière actualisation",
  opsActiveEvacuation: "Évacuation active",
  opsExpires: "Expire",
  opsFocusOnMap: "Voir sur la carte",
  opsOpenSource: "Ouvrir la publication officielle",
  opsEmptyTimeline: "Aucun événement chronologique enregistré pour le moment.",
  opsStatus: "Statut",
};

function extractOps(file) {
  const content = fs.readFileSync(path.join(dir, file), "utf8");
  const map = {};
  for (const m of content.matchAll(/ops([A-Za-z0-9]+): "([^"]*)"/g)) {
    map[`ops${m[1]}`] = m[2];
  }
  return map;
}

function check(label, actual, expected) {
  let ok = true;
  for (const k of Object.keys(expected)) {
    if (actual[k] !== expected[k]) {
      console.log(`${label} MISMATCH ${k}`);
      console.log("  expected:", JSON.stringify(expected[k]));
      console.log("  actual  :", JSON.stringify(actual[k]));
      ok = false;
    }
  }
  if (ok) console.log(`${label}: OK (${Object.keys(expected).length} keys)`);
  return ok;
}

const enOk = check("en", extractOps("en.ts"), expectedEn);
const frOk = check("fr", extractOps("fr.ts"), expectedFr);

const types = fs.readFileSync(path.join(dir, "types.ts"), "utf8");
const typeKeys = [...types.matchAll(/ops([A-Za-z0-9]+): string;/g)].map((m) => `ops${m[1]}`);
const missingTypes = Object.keys(expectedEn).filter((k) => !typeKeys.includes(k));
console.log("types keys:", typeKeys.length, "missing:", missingTypes.length);

const locales = fs
  .readdirSync(dir)
  .filter((f) => f.endsWith(".ts") && f !== "index.ts" && f !== "types.ts");
let allHave = 0;
for (const f of locales) {
  const ops = extractOps(f);
  const missingKeys = Object.keys(expectedEn).filter((k) => !(k in ops));
  if (missingKeys.length === 0) allHave++;
  else console.log(f, "missing", missingKeys);
}
console.log(`locales with all keys: ${allHave}/${locales.length}`);
if (!enOk || !frOk || missingTypes.length || allHave !== locales.length) {
  process.exit(1);
}
