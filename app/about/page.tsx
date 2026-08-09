import ProjectPageShell from "@/components/layout/ProjectPageShell";

export default function AboutPage() {
  return (
    <ProjectPageShell title="About the project">
      <article className="space-y-6 text-sm leading-relaxed text-[var(--text)]">
        <section className="space-y-2">
          <h2 className="text-lg font-semibold">EU Interactive Map</h2>
          <p className="text-[var(--text-muted)]">
            EU Interactive Map (EUIM) is an interactive map of the European Union
            that combines membership geography, tourism and heritage layers,
            real-time alerts, road traffic, and multimodal directions (road,
            transit, and flights).
          </p>
        </section>
        <section className="space-y-2">
          <h2 className="text-base font-semibold">Geographic scope</h2>
          <p className="text-[var(--text-muted)]">
            Operational data covers EU member states and official EU candidate
            countries. The world basemap remains visible for geographic context,
            but UK, Switzerland, Norway, Iceland, Liechtenstein and other
            non-member / non-candidate states are outside the operational product
            scope.
          </p>
        </section>
        <section className="space-y-2">
          <h2 className="text-base font-semibold">Main capabilities</h2>
          <ul className="list-disc space-y-1 pl-5 text-[var(--text-muted)]">
            <li>EU membership, capitals and institutions</li>
            <li>Tourism, European Heritage Label and related places</li>
            <li>Alerts (wildfires, weather, floods, geological and industrial)</li>
            <li>Live road traffic</li>
            <li>Directions: car / bicycle / walk, public transport, flights</li>
            <li>Relief and 3D terrain viewing</li>
          </ul>
        </section>
        <section className="space-y-2">
          <h2 className="text-base font-semibold">Limits</h2>
          <p className="text-[var(--text-muted)]">
            EUIM aggregates third-party open and licensed data providers. Coverage,
            freshness and completeness depend on those providers. The project is
            independent from any single commercial map platform and does not claim
            official EU institutional status.
          </p>
        </section>
      </article>
    </ProjectPageShell>
  );
}
