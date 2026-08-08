import type { TransitRoutingProvider } from "@/lib/routing/transit/providers/types";
import type { TransitProviderStatus } from "@/lib/routing/transit/types";

let override: TransitRoutingProvider | null = null;
let defaultProvider: TransitRoutingProvider | null = null;

function getDefaultProvider(): TransitRoutingProvider {
  if (!defaultProvider) {
    // Lazy load keeps `server-only` out of unit-test import graphs until needed.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require("@/lib/routing/transit/providers/googleTransit") as {
      googleTransitRoutingProvider: TransitRoutingProvider;
    };
    defaultProvider = mod.googleTransitRoutingProvider;
  }
  return defaultProvider;
}

export function getTransitRoutingProvider(): TransitRoutingProvider {
  return override ?? getDefaultProvider();
}

export function setTransitRoutingProviderForTests(
  provider: TransitRoutingProvider | null,
) {
  override = provider;
}

export async function getTransitProvidersStatus(): Promise<{
  providers: { google_routes: TransitProviderStatus };
}> {
  const status = await getTransitRoutingProvider().getStatus();
  return {
    providers: {
      google_routes: status,
    },
  };
}
