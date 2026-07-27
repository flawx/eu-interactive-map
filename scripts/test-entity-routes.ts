import assert from "node:assert/strict";
import { GET as getMountain } from "../app/api/tourism/mountains/[placeId]/route";
import { GET as getTouristPlace } from "../app/api/tourism/places/[placeId]/route";
import {
  auditExpectedEntities,
  primeWikipediaPages,
  type ExpectedEntity,
} from "../lib/enrichment/wikimediaEntityResolver";

const cases = [
  { route: getMountain, id: "mountain-chamonix", qid: "Q83236", forbidden: /Marche/i, expected: { wikidataId: "Q83236", canonicalName: "Chamonix-Mont-Blanc" } },
  { route: getMountain, id: "mountain-megeve", qid: "Q259283", forbidden: /Rubén de la Red/i, expected: { wikidataId: "Q259283", canonicalName: "Megève" } },
  { route: getMountain, id: "mountain-courmayeur", qid: "Q34993", forbidden: /Vietnam/i, expected: { wikidataId: "Q34993", canonicalName: "Courmayeur" } },
  { route: getMountain, id: "mountain-les-arcs", qid: "Q670977", forbidden: /Les Arcs-sur-Argens/i, expected: { wikidataId: "Q670977", canonicalName: "Les Arcs" } },
  { route: getMountain, id: "mountain-zermatt", qid: "Q27494", forbidden: /Rubén de la Red|Jeolla|Vietnam/i, expected: { wikidataId: "Q27494", canonicalName: "Zermatt" } },
  { route: getMountain, id: "mountain-cortina", qid: "Q41158", forbidden: /municipality seat|Rubén de la Red|Jeolla|Vietnam/i, expected: { wikidataId: "Q41158", canonicalName: "Cortina d'Ampezzo" } },
  { route: getMountain, id: "mountain-bansko", qid: "Q391159", forbidden: /village in North Macedonia|Rubén de la Red|Jeolla|Vietnam/i, expected: { wikidataId: "Q391159", canonicalName: "Bansko" } },
  { route: getMountain, id: "peak-mont-blanc", qid: "Q583", forbidden: /Rubén de la Red|Jeolla|Vietnam/i, expected: { wikidataId: "Q583", canonicalName: "Mont Blanc" } },
  { route: getMountain, id: "peak-matterhorn", qid: "Q1374", forbidden: /Rubén de la Red|Jeolla|Vietnam/i, expected: { wikidataId: "Q1374", canonicalName: "Matterhorn" } },
  { route: getMountain, id: "range-dolomites", qid: "Q1283", forbidden: /Rubén de la Red|Jeolla|Vietnam/i, expected: { wikidataId: "Q1283", canonicalName: "Dolomites" } },
  { route: getTouristPlace, id: "tourist-vaduz-castle", qid: "Q694782", forbidden: /Jeolla/i, expected: { wikidataId: "Q694782", canonicalName: "Vaduz Castle" } },
  { route: getTouristPlace, id: "tourist-ioannina", qid: "Q183199", forbidden: /Vietnam/i, expected: { wikidataId: "Q183199", canonicalName: "Ioannina" } },
  { route: getTouristPlace, id: "tourist-eiffel-tower", qid: "Q243", forbidden: /Rubén de la Red|Jeolla|Vietnam/i, expected: { wikidataId: "Q243", canonicalName: "Eiffel Tower" } },
  { route: getTouristPlace, id: "tourist-louvre", qid: "Q19675", forbidden: /Rubén de la Red|Jeolla|Vietnam/i, expected: { wikidataId: "Q19675", canonicalName: "Louvre Museum" } },
  { route: getTouristPlace, id: "tourist-colosseum", qid: "Q10285", forbidden: /Rubén de la Red|Jeolla|Vietnam/i, expected: { wikidataId: "Q10285", canonicalName: "Colosseum" } },
  { route: getTouristPlace, id: "tourist-sagrada-familia", qid: "Q48435", forbidden: /painting by|disambiguation page|Rubén de la Red|Jeolla|Vietnam/i, expected: { wikidataId: "Q48435", canonicalName: "Sagrada Família" } },
  { route: getTouristPlace, id: "tourist-alhambra", qid: "Q47476", forbidden: /beer brand|painting by|Rubén de la Red|Jeolla|Vietnam/i, expected: { wikidataId: "Q47476", canonicalName: "Alhambra" } },
  { route: getTouristPlace, id: "tourist-prague-castle", qid: "Q193369", forbidden: /Rubén de la Red|Jeolla|Vietnam/i, expected: { wikidataId: "Q193369", canonicalName: "Prague Castle" } },
  { route: getTouristPlace, id: "tourist-santorini", qid: "Q129296", forbidden: /disambiguation page|Rubén de la Red|Jeolla|Vietnam/i, expected: { wikidataId: "Q129296", canonicalName: "Santorini" } },
  { route: getTouristPlace, id: "tourist-lake-bled", qid: "Q648902", forbidden: /hotel in Bled|Rubén de la Red|Jeolla|Vietnam/i, expected: { wikidataId: "Q648902", canonicalName: "Lake Bled" } },
] as const;

const wikipediaTitles: Record<string, { en: string; fr: string }> = {
  "mountain-chamonix": { en: "Chamonix", fr: "Chamonix-Mont-Blanc" },
  "mountain-megeve": { en: "Megève", fr: "Megève" },
  "mountain-courmayeur": { en: "Courmayeur", fr: "Courmayeur" },
  "mountain-les-arcs": { en: "Les Arcs", fr: "Les Arcs (Savoie)" },
  "mountain-zermatt": { en: "Zermatt", fr: "Zermatt" },
  "mountain-cortina": { en: "Cortina d'Ampezzo", fr: "Cortina d'Ampezzo" },
  "mountain-bansko": { en: "Bansko", fr: "Bansko" },
  "peak-mont-blanc": { en: "Mont Blanc", fr: "Mont Blanc" },
  "peak-matterhorn": { en: "Matterhorn", fr: "Cervin" },
  "range-dolomites": { en: "Dolomites", fr: "Dolomites" },
  "tourist-vaduz-castle": { en: "Vaduz Castle", fr: "Château de Vaduz" },
  "tourist-ioannina": { en: "Ioannina", fr: "Ioannina" },
  "tourist-eiffel-tower": { en: "Eiffel Tower", fr: "Tour Eiffel" },
  "tourist-louvre": { en: "Louvre", fr: "Musée du Louvre" },
  "tourist-colosseum": { en: "Colosseum", fr: "Colisée" },
  "tourist-sagrada-familia": { en: "Sagrada Família", fr: "Sagrada Família" },
  "tourist-alhambra": { en: "Alhambra", fr: "Alhambra" },
  "tourist-prague-castle": { en: "Prague Castle", fr: "Château de Prague" },
  "tourist-santorini": { en: "Santorini", fr: "Santorin" },
  "tourist-lake-bled": { en: "Lake Bled", fr: "Lac de Bled" },
};

async function main(): Promise<void> {
  const requestedIds = new Set(process.argv.slice(2));
  const selectedCases = requestedIds.size
    ? cases.filter((testCase) => requestedIds.has(testCase.id))
    : cases;
  assert.ok(selectedCases.length > 0, "at least one route case must be selected");
  await auditExpectedEntities(
    selectedCases.map((testCase) => testCase.expected as ExpectedEntity),
  );
  for (const locale of ["en", "fr"] as const) {
    const titles = selectedCases.map(
      (testCase) => wikipediaTitles[testCase.id][locale],
    );
    let primedPages = 0;
    for (let attempt = 0; attempt < 4 && primedPages !== titles.length; attempt += 1) {
      primedPages = await primeWikipediaPages(locale, titles);
      if (primedPages !== titles.length) {
        await new Promise((resolve) => setTimeout(resolve, 1_500 * (attempt + 1)));
      }
    }
    assert.equal(primedPages, titles.length);
    for (const testCase of selectedCases) {
      let response: Response | null = null;
      let data: {
        verified?: boolean;
        resolvedWikidataId?: string | null;
        description?: string | null;
        images?: Array<{ url?: string; title?: string | null }>;
      } = {};
      for (let attempt = 0; attempt < 3; attempt += 1) {
        response = await testCase.route(
          new Request(`http://localhost/api/test?locale=${locale}`),
          { params: Promise.resolve({ placeId: testCase.id }) },
        );
        data = await response.json() as typeof data;
        if (data.verified) break;
        await new Promise((resolve) => setTimeout(resolve, 1_500 * (attempt + 1)));
      }
      assert.ok(response);
      assert.equal(response.status, 200, `${testCase.id} must return HTTP 200`);
      assert.equal(data.verified, true, `${testCase.id} must be verified`);
      assert.equal(data.resolvedWikidataId, testCase.qid);
      assert.ok(data.description?.trim(), `${testCase.id} must have a description`);
      assert.doesNotMatch(data.description ?? "", testCase.forbidden);
      for (const image of data.images ?? []) {
        const value = `${image.title ?? ""} ${image.url ?? ""}`;
        assert.doesNotMatch(value, /\.svg|blason|coat.of.arms|logo|locator.map/i);
      }
      await new Promise((resolve) => setTimeout(resolve, 750));
    }
  }
  console.log(`real entity route tests: passed (en, fr, ${selectedCases.length} places)`);
}

void main();
