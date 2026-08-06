// Diagnostic endpoint — dumps all Shopify shipping zones and their rate structures
// GET /api/shipping-zones
// Use this to inspect what countries and rates are configured in the store

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

  if (!SHOPIFY_DOMAIN || !SHOPIFY_TOKEN) {
    return res.status(500).json({ error: 'Shopify credentials not configured' });
  }

  try {
    const zonesRes = await fetch(
      `https://${SHOPIFY_DOMAIN}/admin/api/2024-01/shipping_zones.json`,
      { headers: { 'X-Shopify-Access-Token': SHOPIFY_TOKEN } }
    );

    if (!zonesRes.ok) {
      return res.status(502).json({ error: 'Failed to fetch Shopify shipping zones', status: zonesRes.status });
    }

    const { shipping_zones } = await zonesRes.json();

    const summary = (shipping_zones || []).map(zone => ({
      zone_name: zone.name,
      countries: zone.countries?.map(c => c.code) || [],
      weight_based_rates: (zone.weight_based_shipping_rates || []).map(r => ({
        name:       r.name,
        price:      r.price,
        weight_low: r.weight_low,
        weight_high: r.weight_high,
      })),
      flat_rates: (zone.price_based_shipping_rates || []).map(r => ({
        name:  r.name,
        price: r.price,
      })),
      carrier_calculated: (zone.carrier_shipping_rate_providers || []).map(p => ({
        carrier: p.carrier_service_id,
        flat_modifier: p.flat_modifier,
        percent_modifier: p.percent_modifier,
      })),
    }));

    return res.status(200).json({ zones: summary });

  } catch (err) {
    return res.status(500).json({ error: 'Internal error', details: err.message });
  }
}
