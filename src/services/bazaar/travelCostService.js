/**
 * Travel Cost Intelligence Service for MahaUdyam BazaarPath
 * Calculates realistic road travel distance, fuel expenses, and travel time across Maharashtra rural routes.
 * 
 * Transport Modes Supported:
 * - Motorcycle (दुचाकी)
 * - Shared Auto / Minivan (शेअर रिक्षा / टमटम)
 * - Public Bus - MSRTC (एस. टी. बस)
 * - Mini-Truck / Tempo (पिकअप / टेम्पो)
 */

export const TRANSPORT_MODES = [
  {
    id: 'motorcycle',
    name_en: 'Motorcycle / Scooter',
    name_mr: 'दुचाकी / स्कूटर',
    icon: 'route',
    avgSpeedKmh: 35,
    defaultMileageKmpl: 40,
    fuelPricePerLitre: 105,
    fixedBaseFare: 0,
    variableCostPerKm: 2.625 // 105 / 40
  },
  {
    id: 'shared_auto',
    name_en: 'Shared Auto / Minivan',
    name_mr: 'शेअर रिक्षा / मिनीव्हॅन',
    icon: 'route',
    avgSpeedKmh: 28,
    defaultMileageKmpl: null,
    fuelPricePerLitre: null,
    fixedBaseFare: 20,
    variableCostPerKm: 5.5 // Typical rural shared transit fare
  },
  {
    id: 'public_bus',
    name_en: 'Public Bus (MSRTC)',
    name_mr: 'एस. टी. बस (MSRTC)',
    icon: 'route',
    avgSpeedKmh: 25,
    defaultMileageKmpl: null,
    fuelPricePerLitre: null,
    fixedBaseFare: 15,
    variableCostPerKm: 2.2 // MSRTC rural ordinary bus fare per km
  },
  {
    id: 'mini_truck',
    name_en: 'Mini-Truck / Pickup (Tempo)',
    name_mr: 'पिकअप / टेम्पो (मालवाहतूक)',
    icon: 'route',
    avgSpeedKmh: 30,
    defaultMileageKmpl: 12,
    fuelPricePerLitre: 92, // Diesel
    fixedBaseFare: 150, // Loading / terminal charge
    variableCostPerKm: 7.67 // 92 / 12
  }
];

export const travelCostService = {
  /**
   * Road circuity factor for rural Maharashtra topography (Western Ghats, Deccan plateau roads)
   * Road distance is typically 1.20 to 1.30 times straight-line Haversine distance
   */
  ROAD_CIRCUITY_FACTOR: 1.25,

  /**
   * Compute estimated road distance from straight-line distance
   */
  estimateRoadDistanceKm(straightLineKm) {
    if (straightLineKm == null || isNaN(straightLineKm)) return null;
    return Math.round(straightLineKm * this.ROAD_CIRCUITY_FACTOR * 10) / 10;
  },

  /**
   * Calculate travel cost and time for a specific distance and transport mode
   */
  calculateTravelCost({
    distanceKm, // One-way distance in km (either road or straight-line)
    isRoadDistance = true,
    transportModeId = 'motorcycle',
    customMileage = null,
    customFuelPrice = null,
    additionalFreightCost = 0
  }) {
    if (distanceKm == null || distanceKm <= 0) {
      return {
        oneWayKm: 0,
        roundTripKm: 0,
        estimatedTimeMinutes: 0,
        travelCost: 0,
        mode: null,
        isEstimate: true
      };
    }

    const mode = TRANSPORT_MODES.find((m) => m.id === transportModeId) || TRANSPORT_MODES[0];
    const oneWayRoadKm = isRoadDistance ? distanceKm : this.estimateRoadDistanceKm(distanceKm);
    const roundTripKm = Math.round(oneWayRoadKm * 2 * 10) / 10;

    // Calculate travel time in minutes
    const oneWayTimeHours = oneWayRoadKm / (mode.avgSpeedKmh || 30);
    const estimatedTimeMinutes = Math.round(oneWayTimeHours * 60);

    let roundTripCost = 0;

    if (mode.id === 'motorcycle') {
      const mileage = customMileage || mode.defaultMileageKmpl;
      const fuelPrice = customFuelPrice || mode.fuelPricePerLitre;
      const litresNeeded = roundTripKm / mileage;
      roundTripCost = Math.round(litresNeeded * fuelPrice);
    } else if (mode.id === 'mini_truck') {
      const mileage = customMileage || mode.defaultMileageKmpl;
      const fuelPrice = customFuelPrice || mode.fuelPricePerLitre;
      const litresNeeded = roundTripKm / mileage;
      const fuelCost = litresNeeded * fuelPrice;
      roundTripCost = Math.round(mode.fixedBaseFare + fuelCost + Number(additionalFreightCost || 0));
    } else {
      // Public bus or shared auto
      const baseFare = mode.fixedBaseFare * 2;
      const distanceFare = roundTripKm * mode.variableCostPerKm;
      roundTripCost = Math.round(baseFare + distanceFare + Number(additionalFreightCost || 0));
    }

    return {
      oneWayKm: oneWayRoadKm,
      roundTripKm,
      estimatedTimeMinutes,
      travelCost: roundTripCost,
      mode,
      isEstimate: true,
      breakdownText: `${mode.name_mr}: ${roundTripKm} km (२ बाजू प्रवास) • अंदाजे ₹${roundTripCost}`
    };
  },

  /**
   * Compare travel costs across all available transport modes for a given distance
   */
  compareAllModes(distanceKm, isRoadDistance = true) {
    if (!distanceKm) return [];
    return TRANSPORT_MODES.map((mode) => {
      const calc = this.calculateTravelCost({
        distanceKm,
        isRoadDistance,
        transportModeId: mode.id
      });
      return {
        modeId: mode.id,
        modeNameEn: mode.name_en,
        modeNameMr: mode.name_mr,
        oneWayKm: calc.oneWayKm,
        roundTripKm: calc.roundTripKm,
        travelCost: calc.travelCost,
        timeMinutes: calc.estimatedTimeMinutes
      };
    });
  }
};
