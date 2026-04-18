export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

const EARTH_RADIUS_KM = 6371;

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

export function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  if (lat1 < -90 || lat1 > 90) throw new ValidationError(`Invalid latitude: ${lat1}. Must be in [-90, 90].`);
  if (lat2 < -90 || lat2 > 90) throw new ValidationError(`Invalid latitude: ${lat2}. Must be in [-90, 90].`);
  if (lng1 < -180 || lng1 > 180) throw new ValidationError(`Invalid longitude: ${lng1}. Must be in [-180, 180].`);
  if (lng2 < -180 || lng2 > 180) throw new ValidationError(`Invalid longitude: ${lng2}. Must be in [-180, 180].`);

  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLng / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_KM * c;
}
