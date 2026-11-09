// Builds a DDP quote entirely server-side: Shopify prices the cart, ShipStation prices
// shipping + duties/taxes, and our per-country service fees are added on top.

import { parseItems, priceCart, getFees } from './_shopify.js';
import { quoteLandedCost } from './_shipstation.js';

export const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

const cents = (n) => Math.round(n * 100) / 100;

export function parseAddress(a = {}) {
  const address = {
    address1: String(a.address1 || '').trim(),
    city: String(a.city || '').trim(),
    province: String(a.province || '').trim().toUpperCase() || undefined,
    postal_code: String(a.postal_code || '').trim(),
    country: String(a.country || '').trim().toUpperCase(),
  };
  if (!/^[A-Z]{2}$/.test(address.country)) throw new Error('Select a destination country');
  if (address.country === 'US') throw new Error('DDP is for international orders only');
  if (!address.address1 || !address.city) throw new Error('Enter the street address and city');
  return address;
}

export async function buildQuote(body) {
  const lineItems = parseItems(body.items);
  const address = parseAddress(body.address);

  const fees = (await getFees())[address.country];
  if (!fees) throw new Error(`DDP is not available for ${address.country}`);

  const cart = await priceCart(lineItems, address);
  const rate = await quoteLandedCost({ address, cart });

  const duties = cents(rate.duties);
  const taxes = cents(rate.taxes);
  const import_fees = cents(rate.import_fees);
  const duties_taxes = cents(duties + taxes + import_fees);
  const brokerage_fee = cents(fees.brokerage_fee);
  const processing_fee = cents(fees.processing_fee);

  return {
    country: address.country,
    country_name: fees.name,
    currency: cart.currency,
    address,
    lineItems,
    breakdown: {
      product_value: cents(cart.product_value),
      weight_kg: +(cart.total_weight_g / 1000).toFixed(2),
      shipping: cents(rate.shipping),
      carrier: rate.carrier,
      service: rate.service,
      delivery_days: rate.delivery_days,
      guaranteed: rate.guaranteed,
      duties,
      taxes,
      import_fees,
      duties_taxes,
      brokerage_fee,
      processing_fee,
      ddp_charge: cents(duties_taxes + brokerage_fee + processing_fee),
    },
  };
}
