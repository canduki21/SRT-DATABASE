// ShipStation API v2 helpers: live international rates with duties & taxes (landed cost).
// Needs SHIPSTATION_API_KEY. Optional: SHIPSTATION_WAREHOUSE_ID (else the default warehouse),
// SHIPSTATION_CARRIER_IDS (comma-separated; else every connected UPS / FedEx / DHL Express account).

const BASE = 'https://api.shipstation.com/v2';
const DDP_CARRIERS = ['ups', 'fedex', 'dhl_express'];

export function shipstationConfigured() {
  return Boolean(process.env.SHIPSTATION_API_KEY);
}

async function ss(path, init = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      'API-Key': process.env.SHIPSTATION_API_KEY,
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = body.errors?.map((e) => e.message).join('; ') || `HTTP ${res.status}`;
    throw new Error(`ShipStation: ${msg}`);
  }
  return body;
}

// Warehouse + carrier lookups rarely change; cache per warm function instance.
let cache = null;
async function getSetup() {
  if (cache) return cache;
  let warehouseId = process.env.SHIPSTATION_WAREHOUSE_ID;
  if (!warehouseId) {
    const { warehouses = [] } = await ss('/warehouses');
    const wh = warehouses.find((w) => w.is_default) || warehouses[0];
    if (!wh) throw new Error('ShipStation: no warehouse (ship-from address) configured');
    warehouseId = wh.warehouse_id;
  }
  let carrierIds = (process.env.SHIPSTATION_CARRIER_IDS || '').split(',').map((s) => s.trim()).filter(Boolean);
  if (!carrierIds.length) {
    const { carriers = [] } = await ss('/carriers');
    carrierIds = carriers.filter((c) => DDP_CARRIERS.includes(c.carrier_code)).map((c) => c.carrier_id);
    if (!carrierIds.length) throw new Error('ShipStation: no UPS, FedEx or DHL Express account connected');
  }
  cache = { warehouseId, carrierIds };
  return cache;
}

const hs = (code) => String(code).replace(/\D/g, '');
const amt = (m) => Number(m?.amount || 0);

// Returns the cheapest DDP-capable rate that came back with a duties/taxes figure.
export async function quoteLandedCost({ address, cart }) {
  const { warehouseId, carrierIds } = await getSetup();

  const body = {
    rate_options: { carrier_ids: carrierIds, calculate_tax_amount: true },
    shipment: {
      warehouse_id: warehouseId,
      ship_to: {
        name: 'DDP Quote',
        address_line1: address.address1,
        city_locality: address.city,
        state_province: address.province || undefined,
        postal_code: address.postal_code,
        country_code: address.country,
        address_residential_indicator: 'unknown',
      },
      packages: [
        { weight: { value: Math.max(1, Math.round(cart.total_weight_g)), unit: 'gram' } },
      ],
      customs: {
        contents: 'merchandise',
        non_delivery: 'return_to_sender',
        terms_of_trade_code: 'ddp',
        customs_items: cart.lines.map((l) => ({
          description: l.name.slice(0, 100),
          sku: l.sku || undefined,
          quantity: l.quantity,
          value: { currency: cart.currency.toLowerCase(), amount: +(l.line_value / l.quantity).toFixed(2) },
          harmonized_tariff_code: hs(l.hs_code),
          country_of_origin: l.country_of_origin,
        })),
      },
    },
  };

  const { rate_response: rr = {} } = await ss('/rates', { method: 'POST', body: JSON.stringify(body) });
  const rates = (rr.rates || [])
    .map((r) => {
      const taxFromDetails = (r.rate_details || [])
        .filter((d) => d.rate_detail_type === 'tax')
        .reduce((s, d) => s + amt(d.amount), 0);
      const duties_taxes = r.tax_amount ? amt(r.tax_amount) : taxFromDetails;
      const has_duties = Boolean(r.tax_amount) || taxFromDetails > 0;
      const shipping =
        amt(r.shipping_amount) + amt(r.other_amount) + amt(r.confirmation_amount) + amt(r.insurance_amount);
      return {
        rate_id: r.rate_id,
        carrier: r.carrier_friendly_name || r.carrier_code,
        service: r.service_type || r.service_code,
        delivery_days: r.delivery_days ?? null,
        shipping,
        duties_taxes,
        has_duties,
      };
    })
    .filter((r) => r.has_duties);

  if (!rates.length) {
    const why = (rr.errors || []).map((e) => e.message).join('; ');
    throw new Error(`No DDP rate with duties/taxes available for this destination${why ? `: ${why}` : ''}`);
  }
  rates.sort((a, b) => a.shipping + a.duties_taxes - (b.shipping + b.duties_taxes));
  return rates[0];
}
