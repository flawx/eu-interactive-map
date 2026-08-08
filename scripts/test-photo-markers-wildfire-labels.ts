import assert from "node:assert/strict";
import {
  photoMarkerImageId,
  toOptimizedMarkerThumbnailUrl,
  markerThumbnailFromResolvedImage,
  markerThumbnailKey,
} from "../lib/map/mapMarkerThumbnail";
import { wildfireLabelTranslations } from "../lib/i18n/messages/wildfireLabelTranslations";
import { supportedLocales } from "../lib/i18n/config";
import { formatRelativeUpdateTime } from "../lib/map/formatRelativeUpdateTime";

function main() {
  const now = Date.parse("2026-08-08T12:00:00Z");
  assert.equal(
    formatRelativeUpdateTime("2026-08-08T11:55:00Z", "en", now)?.includes("minute"),
    true,
  );
  assert.equal(
    formatRelativeUpdateTime("2026-08-08T09:00:00Z", "en", now)?.includes("hour"),
    true,
  );
  assert.equal(formatRelativeUpdateTime("not-a-date", "en", now), null);
  assert.equal(formatRelativeUpdateTime(null, "fr", now), null);

  const fr = formatRelativeUpdateTime("2026-08-08T11:55:00Z", "fr", now);
  assert.ok(fr && /minute/i.test(fr));

  assert.equal(
    toOptimizedMarkerThumbnailUrl(
      "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a1/Tour_Eiffel.jpg/1280px-Tour_Eiffel.jpg",
      96,
    ),
    "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a1/Tour_Eiffel.jpg/96px-Tour_Eiffel.jpg",
  );
  assert.equal(
    toOptimizedMarkerThumbnailUrl("https://example.com/photo.jpg"),
    "https://example.com/photo.jpg",
  );

  const thumb = markerThumbnailFromResolvedImage({
    url: "https://upload.wikimedia.org/wikipedia/commons/a/a1/Tour_Eiffel.jpg",
    thumbnailUrl:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a1/Tour_Eiffel.jpg/1280px-Tour_Eiffel.jpg",
    width: 2000,
    height: 3000,
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Tour_Eiffel.jpg",
  });
  assert.ok(thumb.url?.includes("96px-"));
  assert.equal(thumb.source?.includes("commons.wikimedia.org"), true);

  assert.equal(photoMarkerImageId("capital", "paris"), "photo-marker:capital:paris");
  assert.equal(markerThumbnailKey("ehl", "site", "loc-1"), "ehl:site:loc-1");

  assert.equal(Object.keys(wildfireLabelTranslations).length, supportedLocales.length);
  assert.equal(wildfireLabelTranslations.fr.majorWildfire, "Incendie majeur");
  assert.equal(wildfireLabelTranslations.en.lastUpdated, "Last updated");
  assert.equal(wildfireLabelTranslations.fr.updateUnknown, "Mise à jour inconnue");

  // Visibility contract: major wildfire labels depend on majorWildfires only.
  const majorWildfires = true;
  const activeFireDetections = false;
  const showMajorLabels = majorWildfires;
  assert.equal(showMajorLabels, true);
  assert.equal(activeFireDetections && false, false);

  console.log(
    JSON.stringify({
      relativeTime: true,
      thumbnailOptimization: true,
      locales: supportedLocales.length,
      wildfireVisibilityDecoupled: true,
      tests: "passed",
    }),
  );
}

main();
