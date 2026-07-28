import assert from "node:assert/strict";
import { GET } from "../app/api/tourism/civil-engineering/[workId]/route";
import { buildCivilEngineeringCollection } from "../components/map/civilEngineeringMapLayers";
import { getActiveMainLayerCount } from "../lib/map/legendConfiguration";
import {
  DEFAULT_MAP_LAYER_PREFERENCES,
} from "../lib/map/mapLayerPreferences";
import {
  MAJOR_CIVIL_ENGINEERING_WORKS,
  validateMajorCivilEngineeringWorks,
} from "../lib/tourism/majorCivilEngineeringWorks";
import {
  buildLocalSearchIndex,
  searchLocalIndex,
} from "../lib/search/mapSearch";

async function main(): Promise<void> {
  const validation = validateMajorCivilEngineeringWorks();
  assert.equal(validation.total, 44);
  assert.deepEqual(validation.errors, []);
  assert.ok(validation.countryCodes.length >= 15);
  for (const category of [
    "bridge",
    "viaduct",
    "tunnel",
    "dam",
    "canal_lock",
  ] as const) {
    assert.ok(validation.byCategory[category] > 0);
  }

  const allFilters = {
    bridge: true,
    viaduct: true,
    tunnel: true,
    dam: true,
    canal_lock: true,
  };
  const bridgeOnly = buildCivilEngineeringCollection("en", {
    ...allFilters,
    viaduct: false,
    tunnel: false,
    dam: false,
    canal_lock: false,
  });
  assert.equal(
    bridgeOnly.features.length,
    validation.byCategory.bridge,
    "GeoJSON must be filtered before clustering",
  );

  const baseCount = getActiveMainLayerCount(DEFAULT_MAP_LAYER_PREFERENCES);
  const enabled = {
    ...DEFAULT_MAP_LAYER_PREFERENCES,
    majorCivilEngineeringWorks: true,
  };
  assert.equal(getActiveMainLayerCount(enabled), baseCount + 1);
  assert.equal(
    getActiveMainLayerCount({
      ...enabled,
      civilEngineeringBridge: false,
      civilEngineeringTunnel: false,
    }),
    baseCount + 1,
    "sub-filters must not count as independent layers",
  );

  const searchIndex = buildLocalSearchIndex("en", []);
  for (const query of ["Øresund Bridge", "Millau Viaduct", "Channel Tunnel"]) {
    const results = searchLocalIndex(query, searchIndex, 20).flatMap(
      (group) => group.results,
    );
    assert.ok(
      results.some((result) => result.type === "civil_engineering_work"),
      `${query} must be searchable`,
    );
  }

  const targetIds = [
    "oresund-bridge",
    "millau-viaduct",
    "channel-tunnel",
    "grande-dixence-dam",
    "kieldrecht-lock",
  ];
  let verifiedResponses = 0;
  let responsesWithImages = 0;
  for (const locale of ["en", "fr"] as const) {
    for (const workId of targetIds) {
      const response = await GET(
        new Request(
          `http://localhost/api/tourism/civil-engineering/${workId}?locale=${locale}`,
        ),
        { params: Promise.resolve({ workId }) },
      );
      assert.equal(response.status, 200);
      const details = (await response.json()) as {
        summary?: string;
        description?: string | null;
        verified?: boolean;
        images?: Array<{ url?: string; title?: string | null }>;
      };
      assert.ok(details.summary?.trim());
      if (details.description) {
        assert.equal(details.verified, true);
        verifiedResponses += 1;
      }
      if ((details.images?.length ?? 0) > 0) responsesWithImages += 1;
      for (const image of details.images ?? []) {
        assert.doesNotMatch(
          `${image.title ?? ""} ${image.url ?? ""}`,
          /\.svg|blason|coat.of.arms|flag|logo|locator.map|diagram/i,
        );
      }
    }
  }
  assert.ok(
    verifiedResponses >= 1,
    `verified descriptions must be available (${verifiedResponses})`,
  );
  assert.ok(
    responsesWithImages >= 1,
    `credited photos must be available (${responsesWithImages})`,
  );

  console.log(
    JSON.stringify({
      total: MAJOR_CIVIL_ENGINEERING_WORKS.length,
      byCategory: validation.byCategory,
      countries: validation.countryCodes.length,
      verifiedResponses,
      responsesWithImages,
      tests: "passed",
    }),
  );
}

void main();
