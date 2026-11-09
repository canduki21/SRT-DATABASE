// GET  → { countries: [{ code, name }] }  (destinations DDP is offered for)
// POST { items: [{ variant_id, quantity }], address: { address1, city, province?, postal_code, country } }
//      → live DDP breakdown (shipping + duties/taxes from ShipStation, plus service fees).

import { CORS, buildQuote } from './_ddp.js';
import { shopifyConfigured, getFees } from './_shopify.js';
import { shipstationConfigured } from './_shipstation.js';

export default async function handler(req, res) {
  Object.entries(CORS).forEach(([k, v]) => res.setHeader(k, v));
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method === 'GET') {
    const fees = await getFees();
    const countries = Object.entries(fees)
      .map(([code, f]) => ({ code, name: f.name }))
      .sort((a, b) => a.name.localeCompare(b.name));
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');
    return res.status(200).json({ countries });
  }

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  if (!shopifyConfigured() || !shipstationConfigured()) {
    console.error('ddp-quote: missing SHOPIFY_ADMIN_TOKEN / SHOPIFY_STORE_DOMAIN / SHIPSTATION_API_KEY');
    return res.status(503).json({ error: 'DDP quotes are temporarily unavailable' });
  }

  try {
    const quote = await buildQuote(req.body || {});
    return res.status(200).json({ ...quote.breakdown, country: quote.country, currency: quote.currency });
  } catch (err) {
    console.error('ddp-quote:', err.message);
    return res.status(422).json({ error: err.message });
  }
}
