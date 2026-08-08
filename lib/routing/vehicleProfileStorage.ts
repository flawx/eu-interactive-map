import type { VehicleProfile } from "@/lib/routing/types";

export const VEHICLE_PROFILE_STORAGE_KEY = "eu-map-routing-vehicle-v1";

export const DEFAULT_VEHICLE_PROFILE: VehicleProfile = {
  propulsion: "petrol",
  consumptionPer100Km: 6.5,
  fuelPricePerLiter: 1.82,
  electricityConsumptionKwhPer100Km: 18,
  electricityPricePerKwh: 0.25,
};

export function loadVehicleProfile(): VehicleProfile {
  if (typeof window === "undefined") return DEFAULT_VEHICLE_PROFILE;
  try {
    const raw = window.localStorage.getItem(VEHICLE_PROFILE_STORAGE_KEY);
    if (!raw) return DEFAULT_VEHICLE_PROFILE;
    const parsed = JSON.parse(raw) as Partial<VehicleProfile>;
    return {
      ...DEFAULT_VEHICLE_PROFILE,
      ...parsed,
      propulsion:
        parsed.propulsion === "diesel" ||
        parsed.propulsion === "hybrid" ||
        parsed.propulsion === "electric"
          ? parsed.propulsion
          : "petrol",
    };
  } catch {
    return DEFAULT_VEHICLE_PROFILE;
  }
}

export function saveVehicleProfile(profile: VehicleProfile): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    VEHICLE_PROFILE_STORAGE_KEY,
    JSON.stringify(profile),
  );
}
