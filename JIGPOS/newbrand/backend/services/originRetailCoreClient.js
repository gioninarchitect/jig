const CORE_API_URL = (
  process.env.ORIGIN_RETAIL_CORE_API_URL ||
  process.env.B2B_API_URL ||
  'http://127.0.0.1:3009/api/v1/origin-retail/pharmacy-core'
).replace(/\/$/, '');

const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY || 'origin_internal_2026';

async function request(path, options = {}) {
  const response = await fetch(`${CORE_API_URL}${path}`, {
    method: options.method || 'GET',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'X-Internal-Key': INTERNAL_API_KEY,
      ...(options.headers || {})
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
    signal: AbortSignal.timeout(Number(process.env.ORIGIN_RETAIL_CORE_TIMEOUT_MS || 15000))
  });

  const text = await response.text();
  const payload = text ? JSON.parse(text) : {};

  if (!response.ok) {
    const error = new Error(payload.error || payload.message || `Origin Retail core request failed with ${response.status}`);
    error.status = response.status;
    error.payload = payload;
    throw error;
  }

  return payload;
}

module.exports = { request };
