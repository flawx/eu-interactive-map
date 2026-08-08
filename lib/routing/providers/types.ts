import type {
  RoutingProviderStatus,
  RoutingRequest,
  RoutingResult,
} from "@/lib/routing/types";

export interface RoutingProvider {
  readonly id: "tomtom";
  getStatus(): Promise<RoutingProviderStatus>;
  calculateRoute(
    request: RoutingRequest,
    signal?: AbortSignal,
  ): Promise<RoutingResult>;
}
