// DDP (Delivered Duty Paid) checkout handler
// GET  ?action=rates  → returns available country rates
// POST               → creates a Shopify Draft Order with DDP fee and returns checkout URL

const DEFAULT_RATES = {
  AU: { name: 'Australia',      duty_rate: 0.05,   tax_rate: 0.10,  brokerage_fee: 35, processing_fee: 25 },
  AT: { name: 'Austria',        duty_rate: 0.035,  tax_rate: 0.20,  brokerage_fee: 25, processing_fee: 20 },
  BE: { name: 'Belgium',        duty_rate: 0.035,  tax_rate: 0.21,  brokerage_fee: 25, processing_fee: 20 },
  BR: { name: 'Brazil',         duty_rate: 0.20,   tax_rate: 0.12,  brokerage_fee: 50, processing_fee: 30 },
  CA: { name: 'Canada',         duty_rate: 0.00,   tax_rate: 0.05,  brokerage_fee: 25, processing_fee: 20 },
  CN: { name: 'China',          duty_rate: 0.10,   tax_rate: 0.13,  brokerage_fee: 40, processing_fee: 25 },
  HR: { name: 'Croatia',        duty_rate: 0.035,  tax_rate: 0.25,  brokerage_fee: 25, processing_fee: 20 },
  CZ: { name: 'Czech Republic', duty_rate: 0.035,  tax_rate: 0.21,  brokerage_fee: 25, processing_fee: 20 },
  DK: { name: 'Denmark',        duty_rate: 0.035,  tax_rate: 0.25,  brokerage_fee: 25, processing_fee: 20 },
  FI: { name: 'Finland',        duty_rate: 0.035,  tax_rate: 0.24,  brokerage_fee: 25, processing_fee: 20 },
  FR: { name: 'France',         duty_rate: 0.035,  tax_rate: 0.20,  brokerage_fee: 25, processing_fee: 20 },
  DE: { name: 'Germany',        duty_rate: 0.035,  tax_rate: 0.19,  brokerage_fee: 25, processing_fee: 20 },
  GR: { name: 'Greece',         duty_rate: 0.035,  tax_rate: 0.24,  brokerage_fee: 25, processing_fee: 20 },
  HU: { name: 'Hungary',        duty_rate: 0.035,  tax_rate: 0.27,  brokerage_fee: 25, processing_fee: 20 },
  IN: { name: 'India',          duty_rate: 0.10,   tax_rate: 0.18,  brokerage_fee: 40, processing_fee: 25 },
  IE: { name: 'Ireland',        duty_rate: 0.035,  tax_rate: 0.23,  brokerage_fee: 25, processing_fee: 20 },
  IL: { name: 'Israel',         duty_rate: 0.08,   tax_rate: 0.17,  brokerage_fee: 35, processing_fee: 25 },
  IT: { name: 'Italy',          duty_rate: 0.035,  tax_rate: 0.22,  brokerage_fee: 25, processing_fee: 20 },
  JP: { name: 'Japan',          duty_rate: 0.00,   tax_rate: 0.10,  brokerage_fee: 30, processing_fee: 20 },
  KR: { name: 'South Korea',    duty_rate: 0.08,   tax_rate: 0.10,  brokerage_fee: 30, processing_fee: 20 },
  MX: { name: 'Mexico',         duty_rate: 0.10,   tax_rate: 0.16,  brokerage_fee: 35, processing_fee: 25 },
  NL: { name: 'Netherlands',    duty_rate: 0.035,  tax_rate: 0.21,  brokerage_fee: 25, processing_fee: 20 },
  NZ: { name: 'New Zealand',    duty_rate: 0.05,   tax_rate: 0.15,  brokerage_fee: 35, processing_fee: 25 },
  NO: { name: 'Norway',         duty_rate: 0.00,   tax_rate: 0.25,  brokerage_fee: 30, processing_fee: 20 },
  PL: { name: 'Poland',         duty_rate: 0.035,  tax_rate: 0.23,  brokerage_fee: 25, processing_fee: 20 },
  PT: { name: 'Portugal',       duty_rate: 0.035,  tax_rate: 0.23,  brokerage_fee: 25, processing_fee: 20 },
  RO: { name: 'Romania',        duty_rate: 0.035,  tax_rate: 0.19,  brokerage_fee: 25, processing_fee: 20 },
  SA: { name: 'Saudi Arabia',   duty_rate: 0.05,   tax_rate: 0.15,  brokerage_fee: 40, processing_fee: 25 },
  SG: { name: 'Singapore',      duty_rate: 0.00,   tax_rate: 0.09,  brokerage_fee: 25, processing_fee: 20 },
  ES: { name: 'Spain',          duty_rate: 0.035,  tax_rate: 0.21,  brokerage_fee: 25, processing_fee: 20 },
  SE: { name: 'Sweden',         duty_rate: 0.035,  tax_rate: 0.25,  brokerage_fee: 25, processing_fee: 20 },
  CH: { name: 'Switzerland',    duty_rate: 0.00,   tax_rate: 0.077, brokerage_fee: 30, processing_fee: 20 },
  TW: { name: 'Taiwan',         duty_rate: 0.05,   tax_rate: 0.05,  brokerage_fee: 30, processing_fee: 20 },
  AE: { name: 'UAE',            duty_rate: 0.05,   tax_rate: 0.05,  brokerage_fee: 35, processing_fee: 25 },
  GB: { name: 'United Kingdom', duty_rate: 0.035,  tax_rate: 0.20,  brokerage_fee: 30, processing_fee: 20 },
};

const SHOPIFY_DOMAIN = process.env.SHOPIFY_STORE_DOMAIN; // e.g. spaceresourcetech.myshopify.com
const SHOPIFY_TOKEN  = process.env.SHOPIFY_ADMIN_TOKEN;

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

async function fetchRates() {
  if (!SHOPIFY_DOMAIN || !SHOPIFY_TOKEN) return DEFAULT_RATES;
  try {
    const res = await fetch(
      `https://${SHOPIFY_DOMAIN}/admin/api/2024-01/metafields.json?namespace=srt&key=ddp_rates`,
      { headers: { 'X-Shopify-Access-Token': SHOPIFY_TOKEN } }
    );
    const { metafields } = await res.json();
    if (metafields?.length) return JSON.parse(metafields[0].value);
  } catch {}
  return DEFAULT_RATES;
}

function calculateDDP({ product_value, shipping, insurance, rates }) {
  const customs_value  = product_value + shipping + insurance;
  const import_duty    = customs_value * rates.duty_rate;
  const taxable_value  = customs_value + import_duty;
  const import_tax     = taxable_value * rates.tax_rate;
  const ddp_charge     = import_duty + import_tax + rates.brokerage_fee + rates.processing_fee;
  return { customs_value, import_duty, import_tax,
           brokerage_fee: rates.brokerage_fee,
           processing_fee: rates.processing_fee, ddp_charge };
}

export default async function handler(req, res) {
  Object.entries(CORS).forEach(([k, v]) => res.setHeader(k, v));
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method === 'GET' && req.query.action === 'rates') {
    return res.status(200).json(await fetchRates());
  }

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { items, country, shipping_cost = 0, insurance = 0 } = req.body;
  if (!items?.length || !country) return res.status(400).json({ error: 'Missing items or country' });
  if (!SHOPIFY_DOMAIN || !SHOPIFY_TOKEN) return res.status(500).json({ error: 'Shopify credentials not configured' });

  const allRates    = await fetchRates();
  const countryRate = allRates[country];
  if (!countryRate) return res.status(400).json({ error: `DDP not available for: ${country}` });

  const product_value = items.reduce((sum, i) => sum + (i.price / 100) * i.quantity, 0);
  const ddp = calculateDDP({ product_value, shipping: shipping_cost, insurance, rates: countryRate });

  const draftPayload = {
    draft_order: {
      line_items: [
        ...items.map(i => ({ variant_id: i.variant_id, quantity: i.quantity })),
        {
          title: `DDP Service — ${countryRate.name}`,
          price: ddp.ddp_charge.toFixed(2),
          quantity: 1,
          requires_shipping: false,
          taxable: false,
          properties: [
            { name: 'Customs Value',        value: `$${ddp.customs_value.toFixed(2)}`  },
            { name: 'Import Duty',          value: `$${ddp.import_duty.toFixed(2)}`    },
            { name: 'Import Tax (VAT/GST)', value: `$${ddp.import_tax.toFixed(2)}`     },
            { name: 'Brokerage Fee',        value: `$${ddp.brokerage_fee.toFixed(2)}`  },
            { name: 'Processing Fee',       value: `$${ddp.processing_fee.toFixed(2)}` },
          ],
        },
      ],
      note: `DDP order — destination: ${countryRate.name} (${country})`,
      tags: 'ddp',
    },
  };

  const shopifyRes = await fetch(
    `https://${SHOPIFY_DOMAIN}/admin/api/2024-01/draft_orders.json`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': SHOPIFY_TOKEN },
      body: JSON.stringify(draftPayload),
    }
  );

  if (!shopifyRes.ok) {
    const err = await shopifyRes.text();
    return res.status(500).json({ error: 'Failed to create draft order', details: err });
  }

  const { draft_order } = await shopifyRes.json();
  return res.status(200).json({
    checkout_url:  draft_order.invoice_url,
    ddp_breakdown: ddp,
    order_id:      draft_order.id,
  });
}
