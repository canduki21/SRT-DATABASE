// DDP (Delivered Duty Paid) checkout handler
// GET  ?action=rates  → returns available country rates
// POST               → creates a Shopify Draft Order with DDP fee and returns checkout URL

const DEFAULT_RATES = {
  AR: { name: 'Argentina',     zone: 'LAM', duty_rate: 0.20,   tax_rate: 0.21,  brokerage_fee: 60, processing_fee: 35 },
  AU: { name: 'Australia',     zone: 'OCE', duty_rate: 0.05,   tax_rate: 0.10,  brokerage_fee: 35, processing_fee: 25 },
  AT: { name: 'Austria',       zone: 'WEU', duty_rate: 0.035,  tax_rate: 0.20,  brokerage_fee: 25, processing_fee: 20 },
  BD: { name: 'Bangladesh',    zone: 'SAS', duty_rate: 0.25,   tax_rate: 0.15,  brokerage_fee: 50, processing_fee: 30 },
  BE: { name: 'Belgium',       zone: 'WEU', duty_rate: 0.035,  tax_rate: 0.21,  brokerage_fee: 25, processing_fee: 20 },
  BG: { name: 'Bulgaria',      zone: 'EEU', duty_rate: 0.035,  tax_rate: 0.20,  brokerage_fee: 25, processing_fee: 20 },
  BH: { name: 'Bahrain',       zone: 'MDE', duty_rate: 0.05,   tax_rate: 0.10,  brokerage_fee: 35, processing_fee: 25 },
  BR: { name: 'Brazil',        zone: 'LAM', duty_rate: 0.20,   tax_rate: 0.12,  brokerage_fee: 50, processing_fee: 30 },
  CA: { name: 'Canada',        zone: 'NA',  duty_rate: 0.00,   tax_rate: 0.05,  brokerage_fee: 25, processing_fee: 20 },
  CL: { name: 'Chile',         zone: 'LAM', duty_rate: 0.06,   tax_rate: 0.19,  brokerage_fee: 40, processing_fee: 25 },
  CN: { name: 'China',         zone: 'EAS', duty_rate: 0.10,   tax_rate: 0.13,  brokerage_fee: 40, processing_fee: 25 },
  CO: { name: 'Colombia',      zone: 'LAM', duty_rate: 0.15,   tax_rate: 0.19,  brokerage_fee: 45, processing_fee: 25 },
  HR: { name: 'Croatia',       zone: 'EEU', duty_rate: 0.035,  tax_rate: 0.25,  brokerage_fee: 25, processing_fee: 20 },
  CY: { name: 'Cyprus',        zone: 'WEU', duty_rate: 0.035,  tax_rate: 0.19,  brokerage_fee: 25, processing_fee: 20 },
  CZ: { name: 'Czech Republic',zone: 'EEU', duty_rate: 0.035,  tax_rate: 0.21,  brokerage_fee: 25, processing_fee: 20 },
  DK: { name: 'Denmark',       zone: 'WEU', duty_rate: 0.035,  tax_rate: 0.25,  brokerage_fee: 25, processing_fee: 20 },
  EC: { name: 'Ecuador',       zone: 'LAM', duty_rate: 0.12,   tax_rate: 0.15,  brokerage_fee: 45, processing_fee: 25 },
  EE: { name: 'Estonia',       zone: 'EEU', duty_rate: 0.035,  tax_rate: 0.22,  brokerage_fee: 25, processing_fee: 20 },
  EG: { name: 'Egypt',         zone: 'MDE', duty_rate: 0.20,   tax_rate: 0.14,  brokerage_fee: 50, processing_fee: 30 },
  FI: { name: 'Finland',       zone: 'WEU', duty_rate: 0.035,  tax_rate: 0.24,  brokerage_fee: 25, processing_fee: 20 },
  FR: { name: 'France',        zone: 'WEU', duty_rate: 0.035,  tax_rate: 0.20,  brokerage_fee: 25, processing_fee: 20 },
  DE: { name: 'Germany',       zone: 'WEU', duty_rate: 0.035,  tax_rate: 0.19,  brokerage_fee: 25, processing_fee: 20 },
  GR: { name: 'Greece',        zone: 'WEU', duty_rate: 0.035,  tax_rate: 0.24,  brokerage_fee: 25, processing_fee: 20 },
  HK: { name: 'Hong Kong',     zone: 'EAS', duty_rate: 0.00,   tax_rate: 0.00,  brokerage_fee: 25, processing_fee: 20 },
  HU: { name: 'Hungary',       zone: 'EEU', duty_rate: 0.035,  tax_rate: 0.27,  brokerage_fee: 25, processing_fee: 20 },
  IS: { name: 'Iceland',       zone: 'WEU', duty_rate: 0.00,   tax_rate: 0.24,  brokerage_fee: 30, processing_fee: 20 },
  IN: { name: 'India',         zone: 'SAS', duty_rate: 0.10,   tax_rate: 0.18,  brokerage_fee: 40, processing_fee: 25 },
  ID: { name: 'Indonesia',     zone: 'SEA', duty_rate: 0.15,   tax_rate: 0.11,  brokerage_fee: 45, processing_fee: 25 },
  IE: { name: 'Ireland',       zone: 'WEU', duty_rate: 0.035,  tax_rate: 0.23,  brokerage_fee: 25, processing_fee: 20 },
  IL: { name: 'Israel',        zone: 'MDE', duty_rate: 0.08,   tax_rate: 0.17,  brokerage_fee: 35, processing_fee: 25 },
  IT: { name: 'Italy',         zone: 'WEU', duty_rate: 0.035,  tax_rate: 0.22,  brokerage_fee: 25, processing_fee: 20 },
  JP: { name: 'Japan',         zone: 'EAS', duty_rate: 0.00,   tax_rate: 0.10,  brokerage_fee: 30, processing_fee: 20 },
  JO: { name: 'Jordan',        zone: 'MDE', duty_rate: 0.20,   tax_rate: 0.16,  brokerage_fee: 40, processing_fee: 25 },
  KE: { name: 'Kenya',         zone: 'AFR', duty_rate: 0.25,   tax_rate: 0.16,  brokerage_fee: 50, processing_fee: 30 },
  KR: { name: 'South Korea',   zone: 'EAS', duty_rate: 0.08,   tax_rate: 0.10,  brokerage_fee: 30, processing_fee: 20 },
  KW: { name: 'Kuwait',        zone: 'MDE', duty_rate: 0.05,   tax_rate: 0.00,  brokerage_fee: 35, processing_fee: 25 },
  LT: { name: 'Lithuania',     zone: 'EEU', duty_rate: 0.035,  tax_rate: 0.21,  brokerage_fee: 25, processing_fee: 20 },
  LU: { name: 'Luxembourg',    zone: 'WEU', duty_rate: 0.035,  tax_rate: 0.17,  brokerage_fee: 25, processing_fee: 20 },
  LV: { name: 'Latvia',        zone: 'EEU', duty_rate: 0.035,  tax_rate: 0.21,  brokerage_fee: 25, processing_fee: 20 },
  MA: { name: 'Morocco',       zone: 'MDE', duty_rate: 0.025,  tax_rate: 0.20,  brokerage_fee: 40, processing_fee: 25 },
  MT: { name: 'Malta',         zone: 'WEU', duty_rate: 0.035,  tax_rate: 0.18,  brokerage_fee: 25, processing_fee: 20 },
  MX: { name: 'Mexico',        zone: 'NA',  duty_rate: 0.10,   tax_rate: 0.16,  brokerage_fee: 35, processing_fee: 25 },
  MY: { name: 'Malaysia',      zone: 'SEA', duty_rate: 0.10,   tax_rate: 0.08,  brokerage_fee: 35, processing_fee: 25 },
  NG: { name: 'Nigeria',       zone: 'AFR', duty_rate: 0.20,   tax_rate: 0.075, brokerage_fee: 60, processing_fee: 35 },
  NL: { name: 'Netherlands',   zone: 'WEU', duty_rate: 0.035,  tax_rate: 0.21,  brokerage_fee: 25, processing_fee: 20 },
  NZ: { name: 'New Zealand',   zone: 'OCE', duty_rate: 0.05,   tax_rate: 0.15,  brokerage_fee: 35, processing_fee: 25 },
  NO: { name: 'Norway',        zone: 'WEU', duty_rate: 0.00,   tax_rate: 0.25,  brokerage_fee: 30, processing_fee: 20 },
  PE: { name: 'Peru',          zone: 'LAM', duty_rate: 0.11,   tax_rate: 0.16,  brokerage_fee: 45, processing_fee: 25 },
  PH: { name: 'Philippines',   zone: 'SEA', duty_rate: 0.10,   tax_rate: 0.12,  brokerage_fee: 40, processing_fee: 25 },
  PK: { name: 'Pakistan',      zone: 'SAS', duty_rate: 0.25,   tax_rate: 0.17,  brokerage_fee: 50, processing_fee: 30 },
  PL: { name: 'Poland',        zone: 'EEU', duty_rate: 0.035,  tax_rate: 0.23,  brokerage_fee: 25, processing_fee: 20 },
  PT: { name: 'Portugal',      zone: 'WEU', duty_rate: 0.035,  tax_rate: 0.23,  brokerage_fee: 25, processing_fee: 20 },
  QA: { name: 'Qatar',         zone: 'MDE', duty_rate: 0.05,   tax_rate: 0.00,  brokerage_fee: 35, processing_fee: 25 },
  RO: { name: 'Romania',       zone: 'EEU', duty_rate: 0.035,  tax_rate: 0.19,  brokerage_fee: 25, processing_fee: 20 },
  RS: { name: 'Serbia',        zone: 'EEU', duty_rate: 0.05,   tax_rate: 0.20,  brokerage_fee: 35, processing_fee: 20 },
  SA: { name: 'Saudi Arabia',  zone: 'MDE', duty_rate: 0.05,   tax_rate: 0.15,  brokerage_fee: 40, processing_fee: 25 },
  SG: { name: 'Singapore',     zone: 'SEA', duty_rate: 0.00,   tax_rate: 0.09,  brokerage_fee: 25, processing_fee: 20 },
  SI: { name: 'Slovenia',      zone: 'EEU', duty_rate: 0.035,  tax_rate: 0.22,  brokerage_fee: 25, processing_fee: 20 },
  SK: { name: 'Slovakia',      zone: 'EEU', duty_rate: 0.035,  tax_rate: 0.20,  brokerage_fee: 25, processing_fee: 20 },
  ES: { name: 'Spain',         zone: 'WEU', duty_rate: 0.035,  tax_rate: 0.21,  brokerage_fee: 25, processing_fee: 20 },
  SE: { name: 'Sweden',        zone: 'WEU', duty_rate: 0.035,  tax_rate: 0.25,  brokerage_fee: 25, processing_fee: 20 },
  CH: { name: 'Switzerland',   zone: 'WEU', duty_rate: 0.00,   tax_rate: 0.077, brokerage_fee: 30, processing_fee: 20 },
  TH: { name: 'Thailand',      zone: 'SEA', duty_rate: 0.20,   tax_rate: 0.07,  brokerage_fee: 40, processing_fee: 25 },
  TR: { name: 'Turkey',        zone: 'EEU', duty_rate: 0.035,  tax_rate: 0.20,  brokerage_fee: 35, processing_fee: 25 },
  TW: { name: 'Taiwan',        zone: 'EAS', duty_rate: 0.05,   tax_rate: 0.05,  brokerage_fee: 30, processing_fee: 20 },
  UA: { name: 'Ukraine',       zone: 'EEU', duty_rate: 0.10,   tax_rate: 0.20,  brokerage_fee: 40, processing_fee: 25 },
  AE: { name: 'UAE',           zone: 'MDE', duty_rate: 0.05,   tax_rate: 0.05,  brokerage_fee: 35, processing_fee: 25 },
  GB: { name: 'United Kingdom',zone: 'WEU', duty_rate: 0.035,  tax_rate: 0.20,  brokerage_fee: 30, processing_fee: 20 },
  UY: { name: 'Uruguay',       zone: 'LAM', duty_rate: 0.20,   tax_rate: 0.22,  brokerage_fee: 50, processing_fee: 30 },
  VN: { name: 'Vietnam',       zone: 'SEA', duty_rate: 0.12,   tax_rate: 0.10,  brokerage_fee: 40, processing_fee: 25 },
  ZA: { name: 'South Africa',  zone: 'AFR', duty_rate: 0.20,   tax_rate: 0.15,  brokerage_fee: 45, processing_fee: 30 },
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
