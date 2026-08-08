import type { VehicleProfile } from "@/lib/routing/types";

export type FuelOrEnergyEstimate = {
  amount: number;
  unit: "L" | "kWh";
  costEur: number;
};

/**
 * Local estimate only — never presented as a real billed cost.
 */
export function estimateFuelOrEnergyCost(
  distanceMeters: number,
  profile: VehicleProfile | null | undefined,
): FuelOrEnergyEstimate | null {
  if (!profile || !Number.isFinite(distanceMeters) || distanceMeters <= 0) {
    return null;
  }

  const distanceKm = distanceMeters / 1000;

  if (profile.propulsion === "electric") {
    const kwhPer100 = profile.electricityConsumptionKwhPer100Km;
    const price = profile.electricityPricePerKwh;
    if (
      kwhPer100 == null ||
      price == null ||
      !Number.isFinite(kwhPer100) ||
      !Number.isFinite(price) ||
      kwhPer100 <= 0 ||
      price < 0
    ) {
      return null;
    }
    const amount = (distanceKm * kwhPer100) / 100;
    return {
      amount: round2(amount),
      unit: "kWh",
      costEur: round2(amount * price),
    };
  }

  const litersPer100 = profile.consumptionPer100Km;
  const price = profile.fuelPricePerLiter;
  if (
    litersPer100 == null ||
    price == null ||
    !Number.isFinite(litersPer100) ||
    !Number.isFinite(price) ||
    litersPer100 <= 0 ||
    price < 0
  ) {
    return null;
  }

  const amount = (distanceKm * litersPer100) / 100;
  return {
    amount: round2(amount),
    unit: "L",
    costEur: round2(amount * price),
  };
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
