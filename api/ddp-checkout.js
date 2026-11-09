// POST { items: [{ variant_id, quantity }], address: {...}, email? }
// Re-quotes server-side (never trusts prices or shipping sent by the browser), then creates a
// Shopify draft order with the products, the ShipStation shipping charge and a DDP line item.
// Returns the draft order's checkout (invoice) URL.

import { CORS, buildQuote } from './_ddp.js';
import { shopifyConfigured, createDraftOrder, toMailingAddress } from './_shopify.js';
import { shipstationConfigured } from './_shipstation.js';

const money = (amount, currencyCode) => ({ amount: amount.toFixed(2), currencyCode });

export default async function handler(req, res) {
  Object.entries(CORS).forEach(([k, v]) => res.setHeader(k, v));
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  if (!shopifyConfigured() || !shipstationConfigured()) {
    console.error('ddp-checkout: missing SHOPIFY_ADMIN_TOKEN / SHOPIFY_STORE_DOMAIN / SHIPSTATION_API_KEY');
    return res.status(503).json({ error: 'DDP checkout is temporarily unavailable' });
  }

  let quote;
  try {
    quote = await buildQuote(req.body || {});
  } catch (err) {
    console.error('ddp-checkout quote:', err.message);
    return res.status(422).json({ error: err.message });
  }

  const b = quote.breakdown;
  const cur = quote.currency;

  try {
    const draft = await createDraftOrder({
      lineItems: [
        ...quote.lineItems,
        {
          title: `DDP Service — ${quote.country_name}`,
          quantity: 1,
          originalUnitPriceWithCurrency: money(b.ddp_charge, cur),
          requiresShipping: false,
          taxable: false,
          customAttributes: [
            { key: 'Import duties & taxes (ShipStation)', value: `$${b.duties_taxes.toFixed(2)}` },
            { key: 'Brokerage fee', value: `$${b.brokerage_fee.toFixed(2)}` },
            { key: 'Processing fee', value: `$${b.processing_fee.toFixed(2)}` },
            { key: 'Carrier / service', value: b.service },
          ],
        },
      ],
      acceptAutomaticDiscounts: true,
      shippingAddress: toMailingAddress(quote.address),
      shippingLine: { title: `${b.service} (DDP)`, priceWithCurrency: money(b.shipping, cur) },
      email: req.body?.email || undefined,
      note: `DDP order — ${quote.country_name} (${quote.country}). Ship ${b.service} with duties & taxes billed to shipper.`,
      tags: ['ddp'],
    });

    return res.status(200).json({ checkout_url: draft.invoiceUrl, order_id: draft.id, ddp_breakdown: b });
  } catch (err) {
    console.error('ddp-checkout draft order:', err.message);
    return res.status(502).json({ error: 'Could not create the DDP checkout. Please contact info@spaceresourcetech.com.' });
  }
}
