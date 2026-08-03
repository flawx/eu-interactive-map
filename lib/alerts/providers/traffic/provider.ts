import type { TrafficProvider } from "./types";
import { TomTomTrafficProvider } from "./tomTomTraffic";

let provider: TrafficProvider | null = null;

export function getTrafficProvider(): TrafficProvider {
  provider ??= new TomTomTrafficProvider();
  return provider;
}
