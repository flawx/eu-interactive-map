import assert from "node:assert/strict";
import { GET } from "../app/api/tourism/european-heritage-label/[siteId]/route";
import { getEuropeanHeritageLabelSiteById } from "../lib/tourism/europeanHeritageLabel";

const cases = [
  ["ehl-robert-schumans-house-scy-chazelles-france", "single-entity"],
  ["ehl-european-district-of-strasbourg-strasbourg-france", "official-only"],
  ["ehl-village-of-schengen-luxembourg", "single-entity"],
  ["ehl-maastricht-treaty-the-netherlands", "official-only"],
  ["ehl-hambach-castle-germany", "single-entity"],
  ["ehl-the-historic-gdansk-shipyard-poland", "single-entity"],
  ["ehl-ventotene-italy", "single-entity"],
  ["ehl-cisterscapes", "transnational-network"],
  ["ehl-werkbund-estates-in-europe-austria-czech-republic-germany-poland", "transnational-network"],
  ["ehl-colonies-of-benevolence-belgium-the-netherlands", "transnational-network"],
  ["ehl-places-of-peace", "transnational-network"],
  ["ehl-leipzigs-musical-heritage-sites-germany", "serial-site"],
] as const;

async function main(): Promise<void> {
  const selectedIds = new Set(process.argv.slice(2));
  const selected = selectedIds.size
    ? cases.filter(([siteId]) => selectedIds.has(siteId))
    : cases;
  assert.ok(selected.length > 0);

  for (const locale of ["en", "fr"] as const) {
    for (const [siteId, expectedType] of selected) {
      const site = getEuropeanHeritageLabelSiteById(siteId);
      assert.ok(site, `${siteId} must exist`);
      assert.equal(site.entityIdentityType, expectedType);
      if (expectedType === "single-entity") {
        assert.match(site.wikidataId ?? "", /^Q[1-9]\d*$/);
      } else {
        assert.equal(site.wikidataId, null, `${siteId} must not force a logical QID`);
      }
      const response = await GET(
        new Request(`http://localhost/api/ehl?locale=${locale}`),
        { params: Promise.resolve({ siteId }) },
      );
      assert.equal(response.status, 200);
      const details = await response.json() as {
        entityIdentityType?: string;
        europeanSignificance?: string | null;
        description?: string | null;
        locations?: Array<{ locationId?: string; wikipediaUrl?: string | null }>;
        images?: Array<{
          url?: string;
          title?: string | null;
          representedLocationName?: string | null;
        }>;
      };
      assert.equal(details.entityIdentityType, expectedType);
      assert.ok(
        details.europeanSignificance?.trim(),
        `${siteId} must retain the official Commission summary`,
      );
      assert.equal(details.locations?.length, site.locations.length);
      if (site.serial || site.transnational) {
        assert.equal(
          details.description,
          null,
          `${siteId} must not use one member as the network description`,
        );
      }
      for (const image of details.images ?? []) {
        const value = `${image.title ?? ""} ${image.url ?? ""}`;
        assert.doesNotMatch(
          value,
          /\.svg|blason|coat.of.arms|flag|logo|locator.map|diagram/i,
        );
        assert.ok(
          image.representedLocationName,
          "every EHL image must identify the represented location",
        );
      }
    }
  }
  console.log(`EHL route tests: passed (en, fr, ${selected.length} sites)`);
}

void main();
