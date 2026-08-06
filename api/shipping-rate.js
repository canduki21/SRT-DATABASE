// Returns the Shopify shipping rate for a given country + weight (grams)
// GET ?country=AR&weight=1000
// Reads weight-based and flat rates from Shopify shipping zones config

const SHOPIFY_DOMAIN = process.env.SHOPIFY_STORE_DOMAIN;
const SHOPIFY_TOKEN  = process.env.SHOPIFY_ADMIN_TOKEN;

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export default async function handler(req, res) {
  Object.entries(CORS).forEach(([k, v]) => res.setHeader(k, v));
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { country, weight } = req.query;
  if (!country || !weight) {
    return res.status(400).json({ error: 'Missing country or weight (grams)' });
  }

  if (!SHOPIFY_DOMAIN || !SHOPIFY_TOKEN) {
    return res.status(500).json({ error: 'Shopify credentials not configured' });
  }

  const weight_kg = parseInt(weight) / 1000;

  try {
    const zonesRes = await fetch(
      `https://${SHOPIFY_DOMAIN}/admin/api/2024-01/shipping_zones.json`,
      { headers: { 'X-Shopify-Access-Token': SHOPIFY_TOKEN } }
    );

    if (!zonesRes.ok) {
      return res.status(502).json({ error: 'Failed to fetch Shopify shipping zones' });
    }

    const { shipping_zones } = await zonesRes.json();

    for (const zone of (shipping_zones || [])) {
      const inZone = zone.countries?.some(c => c.code === country);
      if (!inZone) continue;

      // Weight-based rates — find the bracket that matches
      const weightRates = zone.weight_based_shipping_rates || [];
      for (const rate of weightRates) {
        const minKg = rate.weight_low  ?? 0;
        const maxKg = rate.weight_high ?? Infinity;
        if (weight_kg >= minKg && weight_kg < maxKg) {
          return res.status(200).json({
            shipping_cost: parseFloat(rate.price),
            rate_name:     rate.name,
            zone_name:     zone.name,
            type:          'weight_based',
          });
        }
      }

      // Flat / price-based fallback
      const flatRates = zone.price_based_shipping_rates || [];
      if (flatRates.length) {
        return res.status(200).json({
          shipping_cost: parseFloat(flatRates[0].price),
          rate_name:     flatRates[0].name,
          zone_name:     zone.name,
          type:          'flat',
        });
      }
    }

    return res.status(404).json({ error: `No rate configured for country: ${country}` });

  } catch (err) {
    return res.status(500).json({ error: 'Internal error', details: err.message });
  }
}
