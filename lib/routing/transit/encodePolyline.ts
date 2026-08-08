/**
 * Encode Google-style polyline for fixtures (inverse of decodeGooglePolyline).
 */
export function encodeGooglePolyline(coordinates: [number, number][]): string {
  let lastLat = 0;
  let lastLng = 0;
  let result = "";

  const encodeSigned = (value: number) => {
    let v = value < 0 ? ~(value << 1) : value << 1;
    while (v >= 0x20) {
      result += String.fromCharCode((0x20 | (v & 0x1f)) + 63);
      v >>= 5;
    }
    result += String.fromCharCode(v + 63);
  };

  for (const [lng, lat] of coordinates) {
    const ilat = Math.round(lat * 1e5);
    const ilng = Math.round(lng * 1e5);
    encodeSigned(ilat - lastLat);
    encodeSigned(ilng - lastLng);
    lastLat = ilat;
    lastLng = ilng;
  }
  return result;
}
