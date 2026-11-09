// Shopify Admin GraphQL helpers for the DDP flow.
// Needs SHOPIFY_STORE_DOMAIN + SHOPIFY_ADMIN_TOKEN (scopes: read_products, read_draft_orders, write_draft_orders).

import { DEFAULT_FEES } from './_ddp-fees.js';

const API_VERSION = '2025-01';
const DEFAULT_HS_CODE = process.env.DEFAULT_HS_CODE || '2530.90';
const DEFAULT_ORIGIN = process.env.DEFAULT_COUNTRY_OF_ORIGIN || 'US';

export function shopifyConfigured() {
  return Boolean(process.env.SHOPIFY_STORE_DOMAIN && process.env.SHOPIFY_ADMIN_TOKEN);
}

export async function shopifyGraphQL(query, variables = {}) {
  const res = await fetch(
    `https://${process.env.SHOPIFY_STORE_DOMAIN}/admin/api/${API_VERSION}/graphql.json`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': process.env.SHOPIFY_ADMIN_TOKEN,
      },
      body: JSON.stringify({ query, variables }),
    }
  );
  const body = await res.json().catch(() => ({}));
  if (!res.ok || body.errors) {
    throw new Error(`Shopify GraphQL error: ${JSON.stringify(body.errors || res.status)}`);
  }
  return body.data;
}

const toGid = (id) => (String(id).startsWith('gid://') ? String(id) : `gid://shopify/ProductVariant/${id}`);

// Normalise cart items coming from the browser. Only variant + quantity are trusted;
// prices, weights and HS codes are always re-read from Shopify.
export function parseItems(items) {
  if (!Array.isArray(items) || !items.length) throw new Error('Cart is empty');
  return items.map((i) => {
    const quantity = parseInt(i.quantity, 10);
    if (!i.variant_id || !Number.isInteger(quantity) || quantity < 1 || quantity > 10000) {
      throw new Error('Invalid cart item');
    }
    return { variantId: toGid(i.variant_id), quantity };
  });
}

// Asks Shopify what these items will really cost (automatic discounts included)
// and returns per-line value, weight and customs data.
export async function priceCart(lineItems, address) {
  const data = await shopifyGraphQL(
    `mutation Calc($input: DraftOrderInput!) {
      draftOrderCalculate(input: $input) {
        calculatedDraftOrder {
          currencyCode
          subtotalPriceSet { shopMoney { amount currencyCode } }
          lineItems {
            name
            sku
            quantity
            discountedTotalSet { shopMoney { amount } }
            weight { unit value }
            variant {
              id
              inventoryItem { harmonizedSystemCode countryCodeOfOrigin }
            }
          }
        }
        userErrors { field message }
      }
    }`,
    {
      input: {
        lineItems,
        acceptAutomaticDiscounts: true,
        shippingAddress: toMailingAddress(address),
      },
    }
  );

  const { calculatedDraftOrder, userErrors } = data.draftOrderCalculate;
  if (userErrors?.length) throw new Error(userErrors.map((e) => e.message).join('; '));

  const lines = calculatedDraftOrder.lineItems.map((li) => ({
    name: li.name,
    sku: li.sku,
    quantity: li.quantity,
    line_value: Number(li.discountedTotalSet.shopMoney.amount),
    unit_weight_g: toGrams(li.weight),
    hs_code: li.variant?.inventoryItem?.harmonizedSystemCode || DEFAULT_HS_CODE,
    country_of_origin: li.variant?.inventoryItem?.countryCodeOfOrigin || DEFAULT_ORIGIN,
  }));

  return {
    currency: calculatedDraftOrder.currencyCode,
    product_value: Number(calculatedDraftOrder.subtotalPriceSet.shopMoney.amount),
    total_weight_g: lines.reduce((s, l) => s + l.unit_weight_g * l.quantity, 0),
    lines,
  };
}

function toGrams(w) {
  if (!w) return 0;
  const f = { GRAMS: 1, KILOGRAMS: 1000, OUNCES: 28.3495, POUNDS: 453.592 }[w.unit] ?? 1;
  return Number(w.value) * f;
}

export function toMailingAddress(a) {
  return {
    address1: a.address1,
    city: a.city,
    provinceCode: a.province || undefined,
    zip: a.postal_code,
    countryCode: a.country,
  };
}

// Fees can be edited in Shopify (shop metafield srt.ddp_fees, JSON) without redeploying.
export async function getFees() {
  try {
    const data = await shopifyGraphQL(
      `{ shop { metafield(namespace: "srt", key: "ddp_fees") { value } } }`
    );
    const v = data.shop?.metafield?.value;
    if (v) return JSON.parse(v);
  } catch {}
  return DEFAULT_FEES;
}

export async function createDraftOrder(input) {
  const data = await shopifyGraphQL(
    `mutation Create($input: DraftOrderInput!) {
      draftOrderCreate(input: $input) {
        draftOrder { id invoiceUrl }
        userErrors { field message }
      }
    }`,
    { input }
  );
  const { draftOrder, userErrors } = data.draftOrderCreate;
  if (userErrors?.length) throw new Error(userErrors.map((e) => e.message).join('; '));
  return draftOrder;
}
