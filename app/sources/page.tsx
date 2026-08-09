import ProjectPageShell from "@/components/layout/ProjectPageShell";
import {
  DATA_SOURCES_REGISTRY,
  getDataSourcesByCategory,
} from "@/lib/map/dataSourcesRegistry";

const CATEGORY_LABELS: Record<string, string> = {
  basemap: "Base map",
  map_data: "Map data",
  eu_data: "EU data",
  tourism: "Tourism",
  security: "Security",
  alerts: "Alerts",
  traffic: "Traffic",
  routing: "Routing",
  transit: "Transit",
  flights: "Flights",
  media: "Media",
  elevation: "Elevation",
  other: "Other",
};

export default function SourcesPage() {
  const byCategory = getDataSourcesByCategory();
  return (
    <ProjectPageShell title="Sources / credits">
      <p className="mb-6 text-sm text-[var(--text-muted)]">
        Credits for data sources and services used by EU Interactive Map (
        {DATA_SOURCES_REGISTRY.length} entries). Map attributions on the live
        map remain required and are shown in addition to this page.
      </p>
      <div className="space-y-8">
        {Object.entries(byCategory).map(([category, sources]) => (
          <section key={category} className="space-y-3">
            <h2 className="text-base font-semibold">
              {CATEGORY_LABELS[category] ?? category}
            </h2>
            <ul className="space-y-3">
              {sources.map((source) => (
                <li
                  key={source.id}
                  className="rounded-xl border p-3"
                  style={{
                    borderColor: "var(--border)",
                    background: "var(--surface)",
                  }}
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h3 className="font-medium">{source.name}</h3>
                    <a
                      href={source.officialUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-[var(--accent)] underline-offset-2 hover:underline"
                    >
                      Official site
                    </a>
                  </div>
                  <p className="mt-1 text-sm text-[var(--text-muted)]">
                    {source.purpose}
                  </p>
                  <p className="mt-2 text-xs text-[var(--text-muted)]">
                    Provider: {source.provider} · Attribution:{" "}
                    {source.attribution}
                  </p>
                  {source.licenseUrl ? (
                    <a
                      href={source.licenseUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1 inline-block text-xs text-[var(--accent)] underline-offset-2 hover:underline"
                    >
                      License
                    </a>
                  ) : null}
                  {source.notes ? (
                    <p className="mt-2 text-xs text-[var(--text-muted)]">
                      {source.notes}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </ProjectPageShell>
  );
}
