// Express 5 params can be string | string[]. This safely extracts a single string.
export function p(val: string | string[] | undefined): string {
  if (Array.isArray(val)) return val[0];
  return val || '';
}
