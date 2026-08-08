import { tomTomRoutingProvider } from "@/lib/routing/providers/tomTomRouting";
import type { RoutingProvider } from "@/lib/routing/providers/types";
import type { RoutingProviderStatus } from "@/lib/routing/types";

let overrideProvider: RoutingProvider | null = null;

export function getRoutingProvider(): RoutingProvider {
  return overrideProvider ?? tomTomRoutingProvider;
}

/** Test-only hook. */
export function setRoutingProviderForTests(
  provider: RoutingProvider | null,
): void {
  overrideProvider = provider;
}

export async function getRoutingProvidersStatus(): Promise<{
  providers: { tomtom: RoutingProviderStatus };
}> {
  const status = await getRoutingProvider().getStatus();
  return { providers: { tomtom: status } };
}
