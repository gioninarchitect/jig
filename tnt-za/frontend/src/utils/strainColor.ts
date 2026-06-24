// Shared strain → colour map so the greenhouse BayGrid, Mother Room and Nursery
// all tint the same strain identically. Keep in sync with BayGridPage's local copy.
export const STRAIN_HEX: Record<string, string> = {
  'SL': '#7CC47C', 'KB': '#D4B86A', 'BC': '#7FB0E5', 'CM': '#E0C9A8', 'Heady Eddy': '#5FC9C0', 'Heady Daddy': '#B68BD4',
  'Elvis': '#E58BA0', 'GP': '#7FA8E5', 'Sunday Driver': '#F0A65A', 'Keke': '#6FD0E0',
  'Avro Banana': '#E8D86A', 'Old Cheese': '#B7B05A', 'Cereal Milk': '#E0C9A8', 'DP': '#C08A6A',
  'Higher Primate': '#D46AB0', 'Strawberry Lemonade': '#E5D17F', 'Cheese': '#C9C36A',
};

function hslToHex(h: number, s: number, l: number) {
  s /= 100; l /= 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => { const c = l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1))); return Math.round(255 * c).toString(16).padStart(2, '0'); };
  return `#${f(0)}${f(8)}${f(4)}`;
}

// Always returns a 6-digit hex so callers can safely append an alpha suffix (e.g. `${strainColor(s)}cc`).
export function strainColor(s?: string | null) {
  if (!s) return '#2a2a2a';
  if (STRAIN_HEX[s]) return STRAIN_HEX[s];
  let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 360;
  return hslToHex(h, 45, 60);
}
