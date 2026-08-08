import type {
  TransitProviderId,
  TransitProviderStatus,
  TransitRoutingRequest,
  TransitRoutingResult,
} from "@/lib/routing/transit/types";

export interface TransitRoutingProvider {
  readonly id: TransitProviderId;
  getStatus(): Promise<TransitProviderStatus>;
  calculateJourney(
    request: TransitRoutingRequest,
    signal?: AbortSignal,
  ): Promise<TransitRoutingResult>;
}
