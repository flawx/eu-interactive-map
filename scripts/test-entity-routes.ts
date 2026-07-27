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
  { route: getTouristPlace, id: "tourist-vaduz-castle", qid: "Q694782", forbidden: /Jeolla/i, expected: { wikidataId: "Q694782", canonicalName: "Vaduz Castle" } },
  { route: getTouristPlace, id: "tourist-ioannina", qid: "Q183199", forbidden: /Vietnam/i, expected: { wikidataId: "Q183199", canonicalName: "Ioannina" } },
] as const;

async function main(): Promise<void> {
  await auditExpectedEntities(
    cases.map((testCase) => testCase.expected as ExpectedEntity),
  );
  for (const locale of ["en", "fr"] as const) {
    const titles =
      locale === "en"
        ? ["Chamonix", "Megève", "Courmayeur", "Les Arcs", "Vaduz Castle", "Ioannina"]
        : ["Chamonix-Mont-Blanc", "Megève", "Courmayeur", "Les Arcs (Savoie)", "Château de Vaduz", "Ioannina"];
    let primedPages = 0;
    for (let attempt = 0; attempt < 4 && primedPages !== titles.length; attempt += 1) {
      primedPages = await primeWikipediaPages(locale, titles);
      if (primedPages !== titles.length) {
        await new Promise((resolve) => setTimeout(resolve, 1_500 * (attempt + 1)));
      }
    }
    assert.equal(primedPages, titles.length);
    for (const testCase of cases) {
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
      assert.doesNotMatch(data.description ?? "", testCase.forbidden);
      for (const image of data.images ?? []) {
        const value = `${image.title ?? ""} ${image.url ?? ""}`;
        assert.doesNotMatch(value, /\.svg|blason|coat.of.arms|logo|locator.map/i);
      }
      await new Promise((resolve) => setTimeout(resolve, 750));
    }
  }
  console.log("real entity route tests: passed (en, fr)");
}

void main();
