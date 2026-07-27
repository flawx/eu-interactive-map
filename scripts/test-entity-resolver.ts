import assert from "node:assert/strict";
import {
  isRelevantTourismImage,
  resolveWikipediaEntity,
  type ExpectedEntity,
} from "../lib/enrichment/wikimediaEntityResolver";

type Fixture = {
  qid: string;
  name: string;
  countryQid: string;
  latitude: number;
  longitude: number;
  typeQid: string;
};

const fixtures: Fixture[] = [
  { qid: "Q83236", name: "Chamonix-Mont-Blanc", countryQid: "Q142", latitude: 45.9222, longitude: 6.8694, typeQid: "Q484170" },
  { qid: "Q259283", name: "Megève", countryQid: "Q142", latitude: 45.8569, longitude: 6.6175, typeQid: "Q484170" },
  { qid: "Q34993", name: "Courmayeur", countryQid: "Q38", latitude: 45.7917, longitude: 6.9714, typeQid: "Q747074" },
  { qid: "Q694782", name: "Vaduz Castle", countryQid: "Q347", latitude: 47.1394, longitude: 9.5244, typeQid: "Q23413" },
  { qid: "Q183199", name: "Ioannina", countryQid: "Q41", latitude: 39.6636, longitude: 20.8522, typeQid: "Q515" },
  { qid: "Q670977", name: "Les Arcs", countryQid: "Q142", latitude: 45.5717, longitude: 6.8078, typeQid: "Q130003" },
];

async function main(): Promise<void> {
const originalFetch = globalThis.fetch;
globalThis.fetch = (async (input: string | URL | Request) => {
  const url = new URL(String(input));
  if (url.hostname === "www.wikidata.org") {
    const qid = /\/(Q\d+)\.json/.exec(url.pathname)?.[1] ?? "";
    const fixture = fixtures.find((item) => item.qid === qid);
    return Response.json({
      entities: fixture
        ? {
            [qid]: {
              id: qid,
              labels: { en: { value: fixture.name } },
              aliases: {},
              sitelinks: { enwiki: { title: fixture.name } },
              claims: {
                P17: [{ mainsnak: { datavalue: { value: { id: fixture.countryQid } } } }],
                P31: [{ mainsnak: { datavalue: { value: { id: fixture.typeQid } } } }],
                P625: [{ mainsnak: { datavalue: { value: { latitude: fixture.latitude, longitude: fixture.longitude } } } }],
              },
            },
          }
        : {},
    });
  }
  if (url.hostname.endsWith(".wikipedia.org")) {
    const title = url.searchParams.get("titles") ?? "";
    const fixture = fixtures.find((item) => item.name === title);
    return Response.json({
      query: {
        pages: fixture
          ? [{
              pageid: 1,
              title: fixture.name,
              extract: `${fixture.name} is the verified destination represented by ${fixture.qid}.`,
              description: "verified fixture",
              fullurl: `https://en.wikipedia.org/wiki/${encodeURIComponent(fixture.name)}`,
              pageprops: { wikibase_item: fixture.qid },
            }]
          : [],
      },
    });
  }
  return new Response(null, { status: 404 });
}) as typeof fetch;

try {
  const cases: Array<{ expected: ExpectedEntity; forbidden: RegExp }> = [
    { expected: { wikidataId: "Q83236", canonicalName: "Chamonix-Mont-Blanc", aliases: ["Chamonix"], countryCode: "FR", latitude: 45.9237, longitude: 6.8694, expectedTypes: ["mountain_destination"] }, forbidden: /Marche/i },
    { expected: { wikidataId: "Q259283", canonicalName: "Megève", aliases: ["Megeve"], countryCode: "FR", latitude: 45.8567, longitude: 6.6178, expectedTypes: ["ski_resort"] }, forbidden: /Rubén de la Red/i },
    { expected: { wikidataId: "Q34993", canonicalName: "Courmayeur", countryCode: "IT", latitude: 45.7969, longitude: 6.9728, expectedTypes: ["ski_resort"] }, forbidden: /Vietnam/i },
    { expected: { wikidataId: "Q694782", canonicalName: "Vaduz Castle", countryCode: "LI", latitude: 47.1396, longitude: 9.5245, expectedTypes: ["landmark"] }, forbidden: /Jeolla/i },
    { expected: { wikidataId: "Q183199", canonicalName: "Ioannina", aliases: ["Ιωάννινα"], countryCode: "EL", latitude: 39.6636, longitude: 20.8522, expectedTypes: ["historic_area"] }, forbidden: /Vietnam/i },
    { expected: { wikidataId: "Q670977", canonicalName: "Les Arcs", aliases: ["Paradiski"], countryCode: "FR", latitude: 45.5686, longitude: 6.8256, expectedTypes: ["ski_resort"] }, forbidden: /Les Arcs-sur-Argens/i },
  ];

  for (const testCase of cases) {
    const result = await resolveWikipediaEntity(testCase.expected, "en");
    assert.equal(result?.verified, true);
    assert.equal(result?.wikidataId, testCase.expected.wikidataId);
    assert.doesNotMatch(result?.extract ?? "", testCase.forbidden);
  }

  assert.equal(
    await resolveWikipediaEntity(
      { wikidataId: null, canonicalName: "Mercury", searchContext: "ambiguous" },
      "en",
    ),
    null,
    "an unvalidated ambiguous search must be rejected",
  );
  assert.equal(
    await resolveWikipediaEntity(
      { wikidataId: null, canonicalName: "Unknown destination" },
      "en",
    ),
    null,
    "an entity without QID, title or context must remain unavailable",
  );
  assert.equal(
    isRelevantTourismImage(
      "File:Blason ville fr Megève.svg",
      "image/svg+xml",
      1200,
      1200,
    ),
    false,
  );
  assert.equal(
    isRelevantTourismImage(
      "File:Megève ski resort winter panorama.jpg",
      "image/jpeg",
      2400,
      1600,
    ),
    true,
  );
  console.log("entity resolver regression tests: passed");
} finally {
  globalThis.fetch = originalFetch;
}
}

void main();
